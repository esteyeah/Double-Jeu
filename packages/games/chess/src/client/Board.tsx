'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react';
import type { BoardProps } from '@arcade/game-sdk';
import { premoveTargets } from '../core';
import {
  FILES,
  GLYPH,
  NAMES,
  PNAME,
  SWAPS,
  VANISH_AT,
  has,
  other,
  sq,
  type ChessMove,
  type ChessView,
  type Color,
  type LegalMove,
  type PieceType,
  type SecretView,
  type Sq,
} from '../shared';
import { CHESS_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<ChessView, ChessMove>;
const glyph = (t: PieceType) => GLYPH[t] + '︎';
const same = (a: Sq, b: Sq) => a[0] === b[0] && a[1] === b[1];

export default function ChessBoard(props: Props) {
  return (
    <div className="ch">
      <style href="arcade-chess-v1" precedence="default">
        {CHESS_CSS}
      </style>
      <Game {...props} />
    </div>
  );
}

function Game({ view, actingAs, mode, sendMove }: Props) {
  const cfg = view.config;
  // Couleur qui agit depuis cet écran (écran partagé sans secrets : le joueur au trait).
  const actColor: Color | null = actingAs === view.players.w.id ? 'w' : actingAs === view.players.b.id ? 'b' : null;
  const myTurn = !!actColor && view.turn === actColor && view.phase !== 'over' && view.phase !== 'pick';
  const legal = myTurn ? view.legal : null;
  const blind = has(cfg, 'blind') && view.phase !== 'over' && view.phase !== 'pick';
  const premoveOn = mode === 'online' && !!view.me && view.phase === 'play' && view.turn !== view.me;

  const [flipped, setFlipped] = useState(view.me === 'b');
  const [sel, setSel] = useState<Sq | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [promo, setPromo] = useState<LegalMove | null>(null);
  const [premove, setPremove] = useState<{ fr: number; fc: number; tr: number; tc: number } | null>(null);
  const [reveal, setReveal] = useState(mode === 'online');
  const [pick, setPick] = useState<{ pawn: number | null; piece: number | null }>({ pawn: null, piece: null });
  const [arrows, setArrows] = useState<{ f: Sq; t: Sq }[]>([]);
  const [circles, setCircles] = useState<Sq[]>([]);
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'resign' | null>(null);
  const [replay, setReplay] = useState<number | null>(null);
  const rightStart = useRef<Sq | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => setFlipped(view.me === 'b'), [view.me]);
  const frames = view.frames;
  useEffect(() => setReplay(null), [frames?.length]);
  useEffect(() => {
    if (!frames) return;
    const key = (e: KeyboardEvent) => {
      const last = frames.length - 1;
      if (e.key === 'ArrowLeft') setReplay((i) => Math.max(0, (i ?? last) - 1));
      if (e.key === 'ArrowRight') setReplay((i) => Math.min(last, (i ?? last) + 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [frames]);
  const shown = frames && replay !== null ? frames[replay]! : view;

  // À chaque nouveau coup : on remet l'interface à zéro et on joue le prémove s'il est toujours légal.
  const plies = view.history.length;
  useEffect(() => {
    setSel(null);
    setSwapMode(false);
    setPromo(null);
    setArrows([]);
    setCircles([]);
    setMsg('');
    if (mode !== 'online') setReveal(false);
  }, [plies, view.phase, mode]);
  useEffect(() => {
    if (!premove || !legal) return;
    const m = legal.moves.find((x) => x.fr === premove.fr && x.fc === premove.fc && x.tr === premove.tr && x.tc === premove.tc);
    setPremove(null);
    if (m) {
      const t = setTimeout(() => sendMove({ t: 'move', fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc, ...(m.needPromo ? { promo: 'q' as const } : {}) }), 120);
      return () => clearTimeout(t);
    }
  }, [legal, premove, sendMove]);

  const playMove = (m: LegalMove) => {
    if (m.needPromo) return setPromo(m);
    sendMove({ t: 'move', fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc });
  };

  function click(r: number, c: number) {
    const p = view.board[r]?.[c] ?? null;
    if (view.phase === 'pick') {
      if (!view.me || view.picked[view.me] || !actingAs) return;
      if (!p || p.color === view.me || p.type === 'k') return;
      if (p.type === 'p') setPick((x) => ({ ...x, pawn: x.pawn === p.id ? null : p.id }));
      else setPick((x) => ({ ...x, piece: x.piece === p.id ? null : p.id }));
      return;
    }
    if (premoveOn) {
      if (sel && premoveTargets(view, sel[0], sel[1]).some((t) => same(t, [r, c]))) {
        setPremove({ fr: sel[0], fc: sel[1], tr: r, tc: c });
        setSel(null);
      } else if (p && p.color === view.me && !(sel && same(sel, [r, c]))) {
        setSel([r, c]);
        setPremove(null);
      } else {
        setSel(null);
        setPremove(null);
      }
      return;
    }
    if (!legal) return;
    if (view.phase === 'place') {
      if (legal.place.some((t) => same(t, [r, c]))) sendMove({ t: 'place', r, c });
      return;
    }
    if (swapMode) {
      if (sel) {
        const a = legal.swaps.find((x) => x.fr === sel[0] && x.fc === sel[1] && x.tr === r && x.tc === c);
        if (a) return sendMove({ t: 'swap', fr: a.fr, fc: a.fc, tr: a.tr, tc: a.tc });
      }
      setSel(p && p.color === actColor && legal.swaps.some((x) => x.fr === r && x.fc === c) && !(sel && same(sel, [r, c])) ? [r, c] : null);
      return;
    }
    if (sel) {
      const m = legal.moves.find((x) => x.fr === sel[0] && x.fc === sel[1] && x.tr === r && x.tc === c);
      if (m) return playMove(m);
    }
    if (p && p.color === actColor && !(sel && same(sel, [r, c]))) {
      setSel([r, c]);
      setMsg(blind || legal.moves.some((m) => m.fr === r && m.fc === c) ? '' : 'Cette pièce n’a aucun coup autorisé.');
    } else setSel(null);
  }

  // ───── Flèches et cercles au clic droit ─────
  const sqAt = (e: { clientX: number; clientY: number }): Sq | null => {
    const b = boardRef.current?.getBoundingClientRect();
    if (!b) return null;
    const x = (e.clientX - b.left) / b.width,
      y = (e.clientY - b.top) / b.height;
    if (x < 0 || x >= 1 || y < 0 || y >= 1) return null;
    const vc = Math.floor(x * 8),
      vr = Math.floor(y * 8);
    return flipped ? [7 - vr, 7 - vc] : [vr, vc];
  };
  const onDown = (e: RPointerEvent) => {
    if (e.button === 2) {
      rightStart.current = sqAt(e);
      if (premove || (premoveOn && sel)) {
        setPremove(null);
        setSel(null);
      }
    } else if (e.button === 0 && (arrows.length || circles.length)) {
      setArrows([]);
      setCircles([]);
    }
  };
  useEffect(() => {
    const up = (e: PointerEvent) => {
      if (e.button !== 2 || !rightStart.current) return;
      const a = rightStart.current,
        b = sqAt(e);
      rightStart.current = null;
      if (!b) return;
      if (same(a, b)) setCircles((cs) => (cs.some((x) => same(x, a)) ? cs.filter((x) => !same(x, a)) : [...cs, a]));
      else setArrows((as) => (as.some((x) => same(x.f, a) && same(x.t, b)) ? as.filter((x) => !(same(x.f, a) && same(x.t, b))) : [...as, { f: a, t: b }]));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  });

  // ───── Coups tapés (à l'aveugle) ─────
  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (!legal) return;
    const t = typed.trim().toLowerCase().replace(/0/g, 'o');
    let m: LegalMove | undefined;
    let promoPiece: 'q' | 'r' | 'b' | 'n' = 'q';
    if (/^o-?o(-?o)?$/.test(t)) {
      const side = t.replace(/-/g, '').length === 3 ? 'Q' : 'K';
      m = legal.moves.find((x) => x.castle === side);
    } else {
      const g = t.match(/^([a-h][1-8])\s*[-x ]?\s*([a-h][1-8])\s*=?([qrbndtfc])?$/);
      if (g) {
        const from = g[1]!,
          to = g[2]!;
        const fr = 8 - Number(from[1]),
          fc = FILES.indexOf(from[0]!),
          tr = 8 - Number(to[1]),
          tc = FILES.indexOf(to[0]!);
        m = legal.moves.find((x) => x.fr === fr && x.fc === fc && x.tr === tr && x.tc === tc);
        promoPiece = ({ q: 'q', d: 'q', r: 'r', t: 'r', b: 'b', f: 'b', n: 'n', c: 'n' } as const)[(g[3] ?? 'q') as 'q'];
      }
    }
    if (!m) return setMsg(`« ${t || '…'} » n’est pas un coup possible (ou il est interdit). Exemples : e2e4, g1f3, O-O, e7e8=D.`);
    setTyped('');
    sendMove({ t: 'move', fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc, ...(m.needPromo ? { promo: promoPiece } : {}) });
  }

  // ───── Plateau ─────
  const targets: [number, number, string][] = [];
  if (view.phase === 'place' && legal) legal.place.forEach(([r, c]) => targets.push([r, c, 'plc']));
  else if (view.phase === 'pick' && view.me && !view.picked[view.me] && actingAs) {
    view.board.forEach((row, r) =>
      row.forEach((p, c) => {
        if (p && p.color !== view.me && p.type !== 'k' && p.id !== pick.pawn && p.id !== pick.piece) targets.push([r, c, 'pick']);
      }),
    );
  } else if (sel && premoveOn) premoveTargets(view, sel[0], sel[1]).forEach(([r, c]) => targets.push([r, c, 'pre']));
  else if (sel && legal && !blind) {
    if (swapMode) legal.swaps.filter((a) => a.fr === sel[0] && a.fc === sel[1]).forEach((a) => targets.push([a.tr, a.tc, 'swp']));
    else legal.moves.filter((m) => m.fr === sel[0] && m.fc === sel[1]).forEach((m) => targets.push([m.tr, m.tc, m.capture ? 'cap' : '']));
  }
  const swapSrc = swapMode && legal && !sel ? legal.swaps.map((a) => [a.fr, a.fc] as Sq) : [];
  const kingChk = view.check && view.phase !== 'over' && replay === null ? findKing(view, view.turn) : null;
  const moles = new Set<number>();
  if (view.phase === 'pick') [pick.pawn, pick.piece].forEach((id) => id && moles.add(id));
  else if (reveal && view.mine) view.mine.traitors.filter((t) => !t.used).forEach((t) => moles.add(t.id));

  const cells = [];
  for (let vr = 0; vr < 8; vr++)
    for (let vc = 0; vc < 8; vc++) {
      const r = flipped ? 7 - vr : vr,
        c = flipped ? 7 - vc : vc;
      const p = shown.board[r]?.[c] ?? null;
      const hole = !!shown.holes[r]?.[c];
      const visits = shown.visits[r]?.[c] ?? 0;
      const cl = ['ch-cell', (r + c) % 2 ? 'dk' : 'lt'];
      if (hole) cl.push('hole');
      const lm = shown.lastMove;
      if (lm && ((lm.from && same(lm.from, [r, c])) || (lm.to && same(lm.to, [r, c])))) cl.push('last');
      if (sel && same(sel, [r, c])) cl.push('sel');
      if (premove && ((premove.fr === r && premove.fc === c) || (premove.tr === r && premove.tc === c))) cl.push('premove');
      const t = targets.find((x) => x[0] === r && x[1] === c);
      if (t) cl.push('tgt', ...(t[2] ? [t[2]] : []));
      if (swapSrc.some((x) => same(x, [r, c]))) cl.push('swpsrc');
      if (kingChk && same(kingChk, [r, c])) cl.push('check');
      if (p && moles.has(p.id)) cl.push('mole');
      const showPiece = p && !hole && !blind;
      cells.push(
        <button
          key={`${r}-${c}`}
          type="button"
          className={cl.join(' ')}
          onClick={() => click(r, c)}
          aria-label={`${sq(r, c)}${hole ? ', effondrée' : showPiece ? `, ${PNAME[p.type]} ${p.color === 'w' ? 'blanc' : 'noir'}` : ''}`}
          tabIndex={hole ? -1 : 0}
        >
          {has(cfg, 'vanish') && !hole && visits > 0 && <span className={`ch-crack c${Math.min(visits, VANISH_AT - 1)} v${(r * 5 + c * 3) % 4}`} />}
          {showPiece && <span className={`ch-pc ${p.color}`}>{glyph(p.type)}</span>}
          {vr === 7 && <span className="ch-coord f">{FILES[c]}</span>}
          {vc === 0 && <span className="ch-coord r">{8 - r}</span>}
        </button>,
      );
    }

  const chips = [
    has(cfg, 'freestyle') && <span key="f" className="ch-chip" style={{ ['--cc' as string]: 'var(--ch-accent)' }}>Freestyle</span>,
    has(cfg, 'missions') && <span key="m" className="ch-chip" style={{ ['--cc' as string]: 'var(--mission)' }}>Missions · {cfg.constraints} contr. · {cfg.reward === 'win' ? 'victoire' : 'dame'}</span>,
    has(cfg, 'vanish') && <span key="v" className="ch-chip" style={{ ['--cc' as string]: 'var(--vanish)' }}>Effondrement{cfg.walled ? ' · roi enfermé = défaite' : ''}</span>,
    has(cfg, 'imposter') && <span key="i" className="ch-chip" style={{ ['--cc' as string]: 'var(--imposter)' }}>Imposteur</span>,
    has(cfg, 'swap') && <span key="s" className="ch-chip" style={{ ['--cc' as string]: 'var(--swap)' }}>Échange</span>,
    has(cfg, 'blind') && <span key="b" className="ch-chip">À l’aveugle</span>,
  ].filter(Boolean);

  const viewerColor = actColor ?? view.me;
  return (
    <div className="ch-wrap">
      <div className="ch-head">
        <div className="ch-title">
          Échecs <b>Sournois</b>
        </div>
        <div className="ch-chips">{chips.length ? chips : <span className="ch-chip">Classique</span>}</div>
      </div>
      <div className="ch-play">
        <div className="ch-boardwrap" onContextMenu={(e) => e.preventDefault()} onPointerDown={onDown}>
          <div className="ch-board" ref={boardRef} role="grid" aria-label="Échiquier">
            {cells}
          </div>
          <Arrows arrows={arrows} circles={circles} flipped={flipped} />
        </div>
        <aside className="ch-side">
          <div className="ch-panel">
            <TurnLine view={view} actColor={actColor} mode={mode} myTurn={myTurn} />
            {view.phase === 'pick' && view.me && actingAs && !view.picked[view.me] && (
              <>
                <p className="ch-sub">Touche un pion et une pièce des {NAMES[other(view.me)]} (pas le roi). Ce seront tes traîtres secrets.</p>
                <ul className="ch-list" style={{ marginTop: 10 }}>
                  <li><span className="ch-k mole">Pion</span><span>{labelOf(view, pick.pawn)}</span></li>
                  <li><span className="ch-k mole">Pièce</span><span>{labelOf(view, pick.piece)}</span></li>
                </ul>
                <div className="ch-row" style={{ marginTop: 12 }}>
                  <button className="ch-btn primary" disabled={!pick.pawn || !pick.piece} onClick={() => pick.pawn && pick.piece && sendMove({ t: 'pick', pawn: pick.pawn, piece: pick.piece })}>
                    Valider mes traîtres
                  </button>
                </div>
              </>
            )}
            {view.phase === 'pick' && !(view.me && actingAs && !view.picked[view.me]) && <p className="ch-sub">Les joueurs choisissent leurs traîtres en secret…</p>}
            {view.phase === 'place' && (
              <p className="ch-note warn">
                Mission accomplie : « {view.placing} ». {myTurn ? 'Touche une case marquée pour poser ta nouvelle dame (elle ne peut pas donner échec).' : 'La dame va être posée…'}
              </p>
            )}
            {premoveOn && (
              <p className="ch-sub">
                {premove
                  ? `Prémove prêt : ${sq(premove.fr, premove.fc)} → ${sq(premove.tr, premove.tc)}. Clic droit sur le plateau pour l’annuler.`
                  : 'Tu peux préparer un prémove : touche une de tes pièces, puis sa case d’arrivée.'}
              </p>
            )}
            {legal?.lifted && <p className="ch-note warn">Aucun coup ne respecte tes contraintes : elles sont levées pour ce coup.</p>}
            {blind && myTurn && view.phase === 'play' && !swapMode && (
              <form className="ch-blind" onSubmit={submitTyped}>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e2e4" autoComplete="off" aria-label="Ton coup" autoFocus />
                <button className="ch-btn primary">Jouer</button>
              </form>
            )}
            {msg && <p className="ch-note">{msg}</p>}
            {view.over && (
              <p className="ch-note warn">
                {view.over.winner ? `Victoire des ${NAMES[view.over.winner]}` : 'Partie nulle'} : {view.over.reason}
              </p>
            )}
          </div>

          {frames && (
            <div className="ch-panel">
              <h3>Revoir la partie</h3>
              <div className="ch-row" style={{ alignItems: 'center' }}>
                <button className="ch-btn" aria-label="Début" onClick={() => setReplay(0)}>⏮</button>
                <button className="ch-btn" aria-label="Coup précédent" onClick={() => setReplay((i) => Math.max(0, (i ?? frames.length - 1) - 1))}>◀</button>
                <button className="ch-btn" aria-label="Coup suivant" onClick={() => setReplay((i) => Math.min(frames.length - 1, (i ?? frames.length - 1) + 1))}>▶</button>
                <button className="ch-btn" aria-label="Fin" onClick={() => setReplay(null)}>⏭</button>
                <span className="ch-prog">
                  {(replay ?? frames.length - 1) === 0 ? 'Position de départ' : `Coup ${replay ?? frames.length - 1} / ${frames.length - 1}`}
                </span>
              </div>
              <p className="ch-sub">
                {(() => {
                  const i = replay ?? frames.length - 1;
                  const h = view.history[i - 1];
                  return h ? `${NAMES[h.c]} : ${h.t}` : 'Utilise aussi les flèches ← → du clavier.';
                })()}
              </p>
            </div>
          )}

          {view.undoRequest && view.phase !== 'over' && (
            <div className="ch-panel mission">
              {actColor === other(view.undoRequest) ? (
                <>
                  <h3>Les {NAMES[view.undoRequest]} demandent à revenir au coup précédent</h3>
                  <div className="ch-row">
                    <button className="ch-btn primary" onClick={() => sendMove({ t: 'undo-accept' })}>Accepter</button>
                    <button className="ch-btn" onClick={() => sendMove({ t: 'undo-decline' })}>Refuser</button>
                  </div>
                </>
              ) : (
                <p className="ch-sub" style={{ margin: 0 }}>Demande de retour en arrière envoyée. En attente de la réponse des {NAMES[other(view.undoRequest)]}…</p>
              )}
            </div>
          )}
          {view.drawOffer && view.phase !== 'over' && (
            <div className="ch-panel">
              {actColor === other(view.drawOffer) ? (
                <>
                  <h3>Les {NAMES[view.drawOffer]} proposent la nulle</h3>
                  <div className="ch-row">
                    <button className="ch-btn primary" onClick={() => sendMove({ t: 'draw-accept' })}>Accepter la nulle</button>
                    <button className="ch-btn" onClick={() => sendMove({ t: 'draw-decline' })}>Refuser</button>
                  </div>
                </>
              ) : (
                <p className="ch-sub" style={{ margin: 0 }}>Nulle proposée. En attente de la réponse des {NAMES[other(view.drawOffer)]}…</p>
              )}
            </div>
          )}

          {has(cfg, 'swap') && view.phase === 'play' && (
            <div className="ch-panel swap">
              <h3>Échanges</h3>
              <div className="ch-row" style={{ gap: 16, alignItems: 'center', marginBottom: 10 }}>
                {(['w', 'b'] as const).map((c) => (
                  <span key={c} className="ch-pills">
                    <b style={{ fontWeight: 600 }}>{NAMES[c]}</b>
                    {Array.from({ length: SWAPS }, (_, i) => (
                      <i key={i} className={`ch-pill${i < view.swapsLeft[c] ? ' on' : ''}`} />
                    ))}
                  </span>
                ))}
              </div>
              {legal &&
                (swapMode ? (
                  <button className="ch-btn" onClick={() => (setSwapMode(false), setSel(null))}>Annuler l’échange</button>
                ) : (
                  <button className="ch-btn swp" disabled={!legal.swaps.length} onClick={() => (setSwapMode(true), setSel(null))}>
                    Échanger au lieu de jouer
                  </button>
                ))}
              <p className="ch-sub">
                {!legal
                  ? 'Disponible à ton tour.'
                  : swapMode
                    ? sel
                      ? 'Touche la pièce adverse à échanger (entourée).'
                      : 'Touche une de tes pièces entourée en pointillés.'
                    : !legal.swaps.length
                      ? 'Aucun échange possible maintenant.'
                      : 'Une de tes pièces prend la place d’une pièce adverse du même type. Pas de roi.'}
              </p>
            </div>
          )}

          {view.mine && view.phase !== 'over' && (
            <div className="ch-panel mission">
              <h3>Tes secrets</h3>
              {reveal ? (
                <>
                  <Secrets s={view.mine} cfgMissions={has(cfg, 'missions')} cfgImposter={has(cfg, 'imposter')} />
                  {legal && legal.flips.length > 0 && (
                    <div className="ch-row" style={{ marginTop: 12, flexDirection: 'column' }}>
                      {legal.flips.map((a) => (
                        <button key={a.id} className="ch-btn imp" onClick={() => sendMove({ t: 'flip', id: a.id })}>
                          Retourner le {PNAME[a.type]} {sq(a.r, a.c)}
                        </button>
                      ))}
                      <p className="ch-sub" style={{ margin: 0 }}>Retourner un traître remplace ton coup. Chaque traître ne sert qu’une fois.</p>
                    </div>
                  )}
                  <div className="ch-row" style={{ marginTop: 12 }}>
                    <button className="ch-btn" onClick={() => setReveal(false)}>Cacher</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="ch-sub" style={{ margin: '0 0 12px' }}>{mode === 'online' ? 'Ton adversaire ne les voit pas.' : 'Vérifie que ton adversaire ne regarde pas l’écran.'}</p>
                  <button className="ch-btn" onClick={() => setReveal(true)}>Afficher mes secrets</button>
                </>
              )}
            </div>
          )}

          {view.reveal && (
            <div className="ch-reveal">
              {(['w', 'b'] as const).map((c) => (
                <div key={c} className="ch-panel">
                  <h3>Secrets des {NAMES[c]}</h3>
                  <Secrets s={view.reveal![c]} cfgMissions={has(cfg, 'missions')} cfgImposter={has(cfg, 'imposter')} />
                </div>
              ))}
            </div>
          )}

          {has(cfg, 'vanish') && (
            <div className="ch-panel">
              <h3>Effondrement</h3>
              <p className="ch-sub" style={{ margin: 0 }}>
                Chaque arrivée d’une pièce fissure la case. Au {VANISH_AT}e passage, elle s’effondre avec la pièce qui s’y pose.
                {cfg.walled ? ' Roi enfermé = défaite : un roi entouré de trous, ou sans aucun coup, perd.' : ''}
              </p>
            </div>
          )}

          <div className="ch-panel">
            <h3>Prises</h3>
            <div className="ch-caps">
              <Taken label="Blancs" list={view.taken.w} />
              <Taken label="Noirs" list={view.taken.b} />
              {has(cfg, 'vanish') && <Taken label="Le vide" list={view.taken.void} gone />}
            </div>
          </div>
          <div className="ch-panel">
            <h3>{blind ? 'Dernier coup' : 'Coups'}</h3>
            {blind ? <LastMove view={view} /> : <History view={view} />}
          </div>

          <div className="ch-row">
            <button className="ch-btn" onClick={() => setFlipped((f) => !f)}>Retourner le plateau</button>
            {view.phase !== 'over' && view.phase !== 'pick' && viewerColor && actingAs && (
              <>
                {confirm === 'resign' ? (
                  <button className="ch-btn danger" onClick={() => (sendMove({ t: 'resign' }), setConfirm(null))}>
                    Confirmer l’abandon des {NAMES[viewerColor]}
                  </button>
                ) : (
                  <button className="ch-btn danger" onClick={() => setConfirm('resign')}>Abandonner</button>
                )}
                {!view.drawOffer && !view.undoRequest && view.phase === 'play' && (
                  <>
                    <button className="ch-btn" disabled={!view.canUndo[viewerColor]} onClick={() => sendMove({ t: 'undo-request' })}>
                      Revenir au coup précédent
                    </button>
                    <button className="ch-btn" onClick={() => sendMove({ t: 'draw-offer' })}>Proposer la nulle</button>
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
      {promo && (
        <div className="ch-promo" role="dialog" aria-label="Promotion">
          <div>
            <strong style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontSize: 22 }}>Promotion</strong>
            <div className="opts">
              {(['q', 'r', 'b', 'n'] as const).map((t) => (
                <button
                  key={t}
                  aria-label={PNAME[t]}
                  onClick={() => {
                    sendMove({ t: 'move', fr: promo.fr, fc: promo.fc, tr: promo.tr, tc: promo.tc, promo: t });
                    setPromo(null);
                  }}
                >
                  <span className={`ch-pc ${view.turn}`} style={{ fontSize: 44 }}>{glyph(t)}</span>
                </button>
              ))}
            </div>
            <button className="ch-btn" onClick={() => setPromo(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function findKing(view: ChessView, c: Color): Sq | null {
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = view.board[r]?.[f];
      if (p && p.type === 'k' && p.color === c) return [r, f];
    }
  return null;
}
function labelOf(view: ChessView, id: number | null) {
  if (!id) return 'à choisir';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = view.board[r]?.[c];
      if (p && p.id === id) return `${PNAME[p.type]} ${sq(r, c)}`;
    }
  return '?';
}

function TurnLine({ view, actColor, mode, myTurn }: { view: ChessView; actColor: Color | null; mode: string; myTurn: boolean }) {
  if (view.phase === 'over') return <div className="ch-turn">{view.over?.winner ? <><span className={`ch-sw ${view.over.winner}`} />Victoire des {NAMES[view.over.winner]}</> : 'Partie nulle'}</div>;
  if (view.phase === 'pick') return <div className="ch-turn">Choix des traîtres</div>;
  const name = view.players[view.turn].name;
  return (
    <>
      <div className="ch-turn">
        <span className={`ch-sw ${view.turn}`} />
        {mode === 'online' && view.me ? (myTurn ? 'À toi de jouer' : `Au tour de ${name}`) : `Au tour des ${NAMES[view.turn]} (${name})`}
        {view.check && <span className="ch-badge">Échec</span>}
      </div>
      {view.me && <p className="ch-sub">Tu as les {NAMES[view.me]}.</p>}
      {!view.me && actColor && <p className="ch-sub">Touche une pièce pour voir ses coups.</p>}
    </>
  );
}

function Secrets({ s, cfgMissions, cfgImposter }: { s: SecretView; cfgMissions: boolean; cfgImposter: boolean }) {
  return (
    <ul className="ch-list">
      {cfgMissions && (s.constraints.length ? s.constraints : ['Aucune contrainte']).map((t) => <li key={t}><span className="ch-k no">Interdit</span><span>{t}</span></li>)}
      {cfgMissions && s.mission && (
        <li>
          <span className="ch-k goal">Mission</span>
          <span>
            {s.mission} {s.progress && <span className="ch-prog">({s.progress})</span>}
          </span>
        </li>
      )}
      {cfgImposter &&
        s.traitors.map((t) => (
          <li key={t.id}>
            <span className="ch-k mole">Traître</span>
            <span>{t.label}{t.used && t.alive ? ' (déjà retourné)' : ''}</span>
          </li>
        ))}
    </ul>
  );
}

function Taken({ label, list, gone }: { label: string; list: { t: PieceType; c: Color }[]; gone?: boolean }) {
  return (
    <div>
      <span className="ch-lbl">{label}</span>
      <span className="ch-g">
        {list.length ? list.map((x, i) => <span key={i} className={`${x.c}${gone ? ' gone' : ''}`}>{glyph(x.t)}</span>) : <span style={{ fontSize: 14, color: 'var(--ch-muted)' }}>—</span>}
      </span>
    </div>
  );
}

/** À l'aveugle : seul le dernier coup reste affiché, le reste se joue de mémoire. */
function LastMove({ view }: { view: ChessView }) {
  const last = view.history[view.history.length - 1];
  if (!last) return <p className="ch-sub" style={{ margin: 0 }}>Aucun coup joué.</p>;
  return (
    <p className="ch-hist" style={{ display: 'block', margin: 0, fontSize: 18 }}>
      <span className="n">{NAMES[last.c]} : </span>
      <span className={`e ${last.cls}`}>{last.t}</span>
    </p>
  );
}

function History({ view }: { view: ChessView }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [view.history.length]);
  if (!view.history.length) return <p className="ch-sub" style={{ margin: 0 }}>Aucun coup joué.</p>;
  const rows = [];
  const H = view.history;
  for (let i = 0, n = 1; i < H.length; n++) {
    const w = H[i]?.c === 'w' ? H[i++] : null;
    const b = H[i]?.c === 'b' ? H[i++] : null;
    rows.push(
      <span key={`n${n}`} className="n">{n}.</span>,
      <span key={`w${n}`} className={`e ${w?.cls ?? ''}`}>{w ? w.t : '…'}</span>,
      <span key={`b${n}`} className={`e ${b?.cls ?? ''}`}>{b ? b.t : ''}</span>,
    );
  }
  return <div className="ch-hist" ref={ref}>{rows}</div>;
}

function Arrows({ arrows, circles, flipped }: { arrows: { f: Sq; t: Sq }[]; circles: Sq[]; flipped: boolean }) {
  const V = ([r, c]: Sq): [number, number] => (flipped ? [7 - c + 0.5, 7 - r + 0.5] : [c + 0.5, r + 0.5]);
  return (
    <svg className="ch-arrows" viewBox="0 0 8 8" aria-hidden="true">
      <defs>
        <marker id="ch-ah" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="2.7" markerHeight="2.7" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="var(--arrow)" />
        </marker>
      </defs>
      {circles.map((a, i) => {
        const [x, y] = V(a);
        return <circle key={`c${i}`} cx={x} cy={y} r={0.45} fill="none" stroke="var(--arrow)" strokeWidth={0.07} />;
      })}
      {arrows.map(({ f, t }, i) => {
        const [x1, y1] = V(f),
          [x2, y2] = V(t);
        const dr = Math.abs(f[0] - t[0]),
          dc = Math.abs(f[1] - t[1]);
        const pts: [number, number][] = [[x1, y1]];
        if ((dr === 1 && dc === 2) || (dr === 2 && dc === 1)) pts.push(Math.abs(x2 - x1) > Math.abs(y2 - y1) ? [x2, y1] : [x1, y2]);
        const [px, py] = pts[pts.length - 1]!;
        const L = Math.hypot(x2 - px, y2 - py),
          k = (L - 0.36) / L;
        pts.push([px + (x2 - px) * k, py + (y2 - py) * k]);
        return (
          <polyline
            key={`a${i}`}
            points={pts.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(' ')}
            fill="none"
            stroke="var(--arrow)"
            strokeWidth={0.17}
            strokeLinejoin="round"
            markerEnd="url(#ch-ah)"
          />
        );
      })}
    </svg>
  );
}

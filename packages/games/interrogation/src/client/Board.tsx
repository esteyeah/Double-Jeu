'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Avatar, Cinematic, RichIcon, sfx, useAmbient, useMediaQuery, type GameIconName } from '@arcade/tabletop';
import { ACCUSATION_SECONDS, ROLE_LABEL, type InterrogationMove, type InterrogationPlayerView, type InterrogationView, type RevealedWord, type Role } from '../shared';
import { INTERROGATION_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<InterrogationView, InterrogationMove>;
type NameOf = (id: PlayerId | null) => string;

const ROLE_STAMP: Record<Role, string> = { inspector: 'green', culprit: '', innocent: 'blue' };

export default function InterrogationBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const me = view.me && view.me.id === viewer ? view.me : null;
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const inspectorActs = actingAs !== null && actingAs === view.inspector;
  const suspects = view.players.filter((p) => p.id !== view.inspector);
  const wide = useMediaQuery('(min-width: 1024px)');
  useAmbient('office');
  const event = useStationEvents(view);

  let action: ReactNode = null;
  if ((view.phase === 'interrogation' || view.phase === 'accusation') && inspectorActs) action = <InspectorControls view={view} suspects={suspects} sendMove={sendMove} />;
  else if (view.phase === 'bets' && me && me.role !== 'inspector' && actingAs === me.id) action = <BetPanel myBet={me.myBet} inspector={nameOf(view.inspector)} sendMove={sendMove} />;

  return (
    <div className="gv">
      <style href="arcade-interrogation-v1" precedence="default">
        {INTERROGATION_CSS}
      </style>
      <div className="gv-wall" />
      <div className="gv-light" />
      <div className="gv-neon" />

      <header className="relative px-3 pt-[3.6rem] sm:pt-5">
        <div className="mx-auto flex w-[min(1240px,100%)] flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-3">
            <RichIcon name="police-badge" metal="gold" size={wide ? 48 : 38} />
            <span className="gv-title">Garde à vue</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="gv-type rounded bg-[#f7f4ea] px-2.5 py-1 text-[15px] text-[#22201a] shadow-[0_3px_6px_rgba(0,0,0,.4)]">
              Manche <strong className="gv-num">{`${view.round} / ${view.totalRounds}`}</strong>
            </span>
            <Timer view={view} />
          </span>
        </div>
      </header>

      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <section className="gv-folder" aria-label="L’affaire">
          <div className="gv-sheet">
            <div className="flex items-start justify-between gap-3">
              <h3 className="gv-type text-[1.25rem] leading-tight">{view.case.title}</h3>
              <span className="gv-stamp shrink-0 text-[12px]">Confidentiel</span>
            </div>
            <p className="mt-2">{view.case.text}</p>
          </div>
        </section>
        <Instruction {...instructionFor(view, actingAs, viewer, mode, nameOf)} />
      </div>

      <div className="mx-auto mt-5 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-5 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {action}
          {me && (
            <SecretPanel
              view={view}
              role={me.role}
              words={me.words}
              canAck={actingAs === me.id}
              acked={view.players.find((p) => p.id === me.id)?.acked ?? false}
              sendMove={sendMove}
            />
          )}
          {view.phase === 'scores' && inspectorActs && (
            <button type="button" className="gv-btn" onClick={() => sendMove({ type: 'next' })}>
              {view.round >= view.totalRounds ? 'Voir le classement final' : 'Manche suivante'}
            </button>
          )}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Board view={view} viewer={viewer} />
          {view.reveal && (
            <div className="mt-5">
              <Reveal view={view} actingAs={actingAs} nameOf={nameOf} sendMove={sendMove} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          {view.grills.length > 0 && <Grills view={view} nameOf={nameOf} />}
          {(view.phase === 'scores' || view.phase === 'over') && <RoundScores view={view} nameOf={nameOf} />}
          <Ranking view={view} viewer={viewer} />
        </div>
      </div>

      <Cinematic trigger={event.key} onMount={false} duration={2400}>
        <EventBanner view={view} kind={event.kind} nameOf={nameOf} />
      </Cinematic>
    </div>
  );
}

// ───────── Événements ─────────

type EventKind = 'none' | 'start' | 'grill' | 'verdict';

function useStationEvents(view: InterrogationView): { key: string; kind: EventKind } {
  const prev = useRef({ phase: view.phase, grills: view.grills.length, round: view.round });
  const event = useRef<{ key: string; kind: EventKind }>({ key: 'calm', kind: 'none' });
  const p = prev.current;
  if (view.grills.length > p.grills && p.round === view.round) event.current = { key: `grill-${view.round}-${view.grills.length}`, kind: 'grill' };
  else if (view.phase === 'review' && p.phase !== 'review') event.current = { key: `verdict-${view.round}`, kind: 'verdict' };
  else if (view.phase === 'interrogation' && p.phase !== 'interrogation') event.current = { key: `start-${view.round}`, kind: 'start' };
  prev.current = { phase: view.phase, grills: view.grills.length, round: view.round };

  const played = useRef(event.current.key);
  useEffect(() => {
    const e = event.current;
    if (played.current === e.key) return;
    played.current = e.key;
    if (e.kind === 'grill') {
      for (let i = 0; i < 6; i++) sfx.click(i * 0.07, 0.12);
      sfx.seal(0.5);
    } else if (e.kind === 'verdict') {
      sfx.drum(0, 2);
      sfx.seal(0.9);
    } else if (e.kind === 'start') sfx.bell(0, 880, 0.08);
  });
  return event.current;
}

function EventBanner({ view, kind, nameOf }: { view: InterrogationView; kind: EventKind; nameOf: NameOf }) {
  if (kind === 'grill') {
    const g = view.grills.at(-1);
    if (!g) return null;
    return (
      <div className="gv-banner">
        <div className="k">« {g.word} » chez {nameOf(g.target)}</div>
        <div className="mt-2">
          <span className={`gv-stamp ${g.hit ? '' : 'blue'}`}>{g.hit ? 'Grillé !' : 'Raté'}</span>
        </div>
        <div className="s">{g.hit ? 'Ce mot ne lui rapportera plus rien.' : 'Ce n’était pas l’un de ses mots.'}</div>
      </div>
    );
  }
  if (kind === 'verdict') {
    const caught = view.accused !== null && view.accused === view.culprit;
    return (
      <div className="gv-banner">
        <div className="k">{view.accused ? `${nameOf(view.inspector)} accuse ${nameOf(view.accused)}` : 'Personne n’a été accusé'}</div>
        <div className="mt-2">
          <span className={`gv-stamp ${caught ? 'green' : ''}`}>{caught ? 'Arrêté !' : 'Évadé !'}</span>
        </div>
        <div className="s">Le Coupable était {nameOf(view.culprit)}.</div>
      </div>
    );
  }
  if (kind === 'start') {
    return (
      <div className="gv-banner">
        <div className="k">
          Manche {view.round} · {nameOf(view.inspector)} mène l’enquête
        </div>
        <div className="gv-title mt-1">L’interrogatoire commence</div>
        <div className="s">{view.case.title}</div>
      </div>
    );
  }
  return null;
}

// ───────── Chronomètre ─────────

function Timer({ view }: { view: InterrogationView }) {
  const [now, setNow] = useState(() => Date.now());
  const timed = view.phase === 'interrogation' || view.phase === 'accusation';
  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [timed]);

  let label = `${view.minutes}:00`;
  let color = '#e9ecdf';
  let total = view.minutes * 60;
  let left = total;
  let caption = 'Chrono';
  if (timed && view.endsAt) {
    left = Math.max(0, Math.ceil((view.endsAt - now) / 1000));
    label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (view.phase === 'accusation') {
      total = ACCUSATION_SECONDS;
      caption = 'Temps pour accuser';
      color = '#ff8a7a';
    } else if (left <= 30) color = '#ffe08a';
  } else if (view.phase === 'bets') {
    label = 'Paris';
    caption = 'Interrogatoire';
  } else if (view.phase !== 'briefing') {
    label = 'Fini';
    left = 0;
  }
  const frac = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <span className="gv-watch" title={caption}>
      <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
        <circle cx="19" cy="19" r="17" fill="#f7f4ea" stroke="#9aa1a6" strokeWidth="2" />
        <circle cx="19" cy="19" r={r} fill="none" stroke={color === '#e9ecdf' ? '#3a5a7a' : color} strokeWidth="5" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 19 19)" />
        <rect x="17" y="0" width="4" height="4" rx="1" fill="#9aa1a6" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="gv-num text-[1.25rem]" style={{ color }}>
          {label}
        </span>
        {view.phase === 'interrogation' ? (
          <span className="gv-rec mt-0.5">
            <i /> rec
          </span>
        ) : (
          <span className="gv-type mt-0.5 text-[11px] text-[#c9d1c0]">{caption}</span>
        )}
      </span>
    </span>
  );
}

// ───────── Consigne ─────────

function instructionFor(view: InterrogationView, actingAs: PlayerId | null, viewer: PlayerId | null, mode: Props['mode'], nameOf: NameOf): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const inspector = nameOf(view.inspector);
  const isInspector = actingAs === view.inspector;
  const toInspector = (rest: string) => (mode === 'hotseat' ? `${inspector}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  switch (view.phase) {
    case 'briefing': {
      const ready = view.players.filter((p) => p.acked).length;
      const meAcked = view.players.find((p) => p.id === viewer)?.acked;
      return viewer && !meAcked
        ? { icon: 'open-folder', mine: true, text: 'Lis ton rôle et retiens tes mots, puis confirme.' }
        : { icon: 'open-folder', mine: false, text: `Chacun découvre son rôle en secret… ${ready}/${view.players.length} prêts.` };
    }
    case 'interrogation':
      return isInspector
        ? {
            icon: 'desk-lamp',
            mine: true,
            text: toInspector('lis l’affaire à voix haute, puis interroge les suspects. Les innocents partagent les mêmes mots : repère qui va ensemble… et qui détonne.'),
          }
        : { icon: 'desk-lamp', mine: true, text: `${inspector} interroge les suspects. Réponds à ses questions… et glisse tes mots sans te faire griller.` };
    case 'bets': {
      const done = view.players.filter((p) => p.betDone).length;
      return {
        icon: 'cigarette',
        mine: !isInspector,
        text: `Interrogatoire terminé ! Chaque suspect parie en secret : ${inspector} va-t-il trouver le Coupable ? ${done}/${view.players.length - 1} paris.`,
      };
    }
    case 'accusation':
      return isInspector
        ? { icon: 'handcuffs', mine: true, text: toInspector(`les paris sont faits. Accuse un suspect dans les ${ACCUSATION_SECONDS} secondes, sinon le Coupable s’échappe.`) }
        : { icon: 'handcuffs', mine: false, text: `Les paris sont faits, silence ! ${inspector} doit accuser un suspect.` };
    case 'review': {
      const waiting = view.players.filter((p) => p.id !== view.inspector && !p.declared);
      const verdict = view.accused ? `${inspector} a accusé ${nameOf(view.accused)}.` : 'Personne n’a été accusé.';
      return {
        icon: 'files',
        mine: !!waiting.find((p) => p.id === actingAs),
        text: `${verdict} Le Coupable était ${nameOf(view.culprit)} ! Mots placés à déclarer : ${waiting.map((p) => p.name).join(', ')}.`,
      };
    }
    case 'verify': {
      const waiting = view.players.filter((p) => !p.verified);
      return {
        icon: 'files',
        mine: !!waiting.find((p) => p.id === actingAs),
        text: `Vérification : chacun signale les mots qu’il n’a pas entendus. En attente : ${waiting.map((p) => p.name).join(', ')}.`,
      };
    }
    case 'scores':
      return isInspector
        ? { icon: 'notebook', mine: true, text: toInspector('lance la suite quand tout le monde a vu les points.') }
        : { icon: 'notebook', mine: false, text: `Points de la manche. ${inspector} lancera la suite.` };
    default:
      return { icon: 'police-badge', mine: false, text: 'Enquête terminée : voici le classement final.' };
  }
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`gv-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="silver" size={24} />
      </span>
      <p className="gv-type text-[15.5px]">{text}</p>
    </div>
  );
}

// ───────── Le tableau des suspects ─────────

function Board({ view, viewer }: { view: InterrogationView; viewer: PlayerId | null }) {
  return (
    <div className="gv-board" aria-label="Le tableau des suspects">
      <h3 className="text-[15px]">Le tableau des suspects</h3>
      <div className="gv-polas">
        {view.players.map((p) => (
          <Polaroid key={p.id} p={p} view={view} viewer={viewer} />
        ))}
      </div>
    </div>
  );
}

function Polaroid({ p, view, viewer }: { p: InterrogationPlayerView; view: InterrogationView; viewer: PlayerId | null }) {
  const inspector = p.id === view.inspector;
  let status: { text: string; ok: boolean } | null = null;
  if (view.phase === 'briefing') status = p.acked ? { text: 'prêt', ok: true } : { text: 'lit son rôle…', ok: false };
  else if (view.phase === 'bets' && !inspector) status = p.betDone ? { text: 'a parié', ok: true } : { text: 'réfléchit…', ok: false };
  else if (view.phase === 'review' && !inspector) status = p.declared ? { text: 'a déclaré', ok: true } : { text: 'déclare…', ok: false };
  else if (view.phase === 'verify') status = p.verified ? { text: 'a vérifié', ok: true } : { text: 'vérifie…', ok: false };
  const role = view.culprit ? (inspector ? 'inspector' : p.id === view.culprit ? 'culprit' : 'innocent') : p.role;
  return (
    <div className={`gv-pola ${p.id === viewer ? 'is-me' : ''}`}>
      <span className={`gv-photo ${inspector ? 'insp' : ''}`}>
        <Avatar id={p.id} name={p.name} look={inspector ? 'detective' : 'suspect'} size={140} className="!h-full !w-full" />
        {!inspector && <span className="gv-plaque">{p.name.slice(0, 10).toUpperCase()}</span>}
        {role && <span className={`gv-stamp st ${ROLE_STAMP[role]}`}>{ROLE_LABEL[role]}</span>}
        {p.id === view.accused && <span className="gv-stamp absolute bottom-7 right-1 z-[1] rotate-6 text-[11px]">accusé</span>}
      </span>
      <span className="nm">{p.name}</span>
      <span className="sc">
        {p.score} pt{p.score > 1 ? 's' : ''}
        {p.isBot ? ' · bot' : ''}
      </span>
      {status && <span className={`gv-chip ${status.ok ? 'ok' : 'wait'}`}>{status.text}</span>}
    </div>
  );
}

// ───────── Fiche secrète ─────────

function SecretPanel({
  view,
  role,
  words,
  canAck,
  acked,
  sendMove,
}: {
  view: InterrogationView;
  role: Role;
  words: { word: string; burned: boolean }[];
  canAck: boolean;
  acked: boolean;
  sendMove: (m: InterrogationMove) => void;
}) {
  const hint: Record<Role, string> = {
    inspector:
      'Tu ne connais ni le Coupable ni les mots secrets. Les innocents ont tous la même liste : écoute qui place les mêmes mots. Le Coupable, lui, a des mots différents, liés à l’affaire.',
    culprit:
      'Les innocents partagent tous une même liste de mots, que tu ne connais pas. Écoute-les pour te fondre dans la masse, et place tes propres mots (liés à l’affaire) sans te trahir.',
    innocent:
      'Tous les innocents ont exactement ces mots-là : quand tu les entends, tu as trouvé un allié. Place-les sans te faire griller ; celui qui ne les place jamais est peut-être le Coupable.',
  };
  return (
    <section className="gv-card">
      <div className="flex flex-wrap items-baseline gap-x-2 pt-1">
        <span className="gv-type muted text-[14px]">Ton rôle :</span>
        <span className={`gv-stamp ${ROLE_STAMP[role]} text-[1.05rem]`}>{ROLE_LABEL[role]}</span>
      </div>
      <p className="mt-3 text-[1.02rem] leading-snug">{hint[role]}</p>

      {words.length > 0 && (
        <>
          <div className="gv-type muted mt-4 text-[14px]">Tes mots à placer :</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {words.map((w) => (
              <li key={w.word} className={`gv-word ${w.burned ? 'line-through' : ''}`}>
                {w.word}
              </li>
            ))}
          </ul>
        </>
      )}

      {view.phase === 'briefing' && !acked && canAck && (
        <div className="mt-4">
          <button type="button" className="gv-btn" onClick={() => sendMove({ type: 'ack' })}>
            {role === 'inspector' ? 'Je suis prêt à enquêter' : 'J’ai retenu mes mots'}
          </button>
        </div>
      )}
      {view.phase === 'briefing' && acked && <p className="gv-type muted mt-4 text-[14px]">En attente des autres joueurs…</p>}
    </section>
  );
}

// ───────── Bureau de l'Enquêteur ─────────

function InspectorControls({ view, suspects, sendMove }: { view: InterrogationView; suspects: InterrogationPlayerView[]; sendMove: (m: InterrogationMove) => void }) {
  const [grillTarget, setGrillTarget] = useState<PlayerId | null>(null);
  const [word, setWord] = useState('');
  const [accused, setAccused] = useState<PlayerId | null>(null);

  function grill(e: FormEvent) {
    e.preventDefault();
    if (!grillTarget || !word.trim()) return;
    sendMove({ type: 'grill', target: grillTarget, word: word.trim() });
    setWord('');
  }

  const canGrill = view.phase === 'interrogation';
  return (
    <section className="gv-desk flex flex-col gap-4">
      {canGrill && (
        <form onSubmit={grill}>
          <div className="flex items-baseline justify-between">
            <h4>Griller un mot</h4>
            <span className="gv-type text-[13px] text-[#c9d1c0]">
              {view.grillsLeft} essai{view.grillsLeft > 1 ? 's' : ''} restant{view.grillsLeft > 1 ? 's' : ''}
            </span>
          </div>
          <SuspectPicker suspects={suspects} value={grillTarget} onChange={setGrillTarget} label="Chez qui ?" />
          <div className="mt-2 flex gap-2">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={40}
              placeholder="Le mot entendu"
              aria-label="Mot à griller"
              disabled={view.grillsLeft === 0}
              className="gv-input disabled:opacity-40"
            />
            <button type="submit" className="gv-btn red" disabled={!grillTarget || !word.trim() || view.grillsLeft === 0}>
              Griller
            </button>
          </div>
        </form>
      )}

      {canGrill ? (
        <div className="border-t border-white/20 pt-4">
          <h4>Clore l’interrogatoire</h4>
          <p className="muted text-[14px]">Les suspects parieront en secret sur ta réussite, puis tu accuseras.</p>
          <button type="button" className="gv-btn mt-3" onClick={() => sendMove({ type: 'close' })}>
            Clore l’interrogatoire
          </button>
        </div>
      ) : (
        <div>
          <h4>Accuser</h4>
          <p className="muted text-[14px]">Tout sera révélé, paris compris.</p>
          <SuspectPicker suspects={suspects} value={accused} onChange={setAccused} label="Qui est le Coupable ?" />
          <button type="button" className="gv-btn red mt-3" disabled={!accused} onClick={() => accused && sendMove({ type: 'accuse', target: accused })}>
            {accused ? `Accuser ${suspects.find((s) => s.id === accused)?.name}` : 'Choisis un suspect'}
          </button>
        </div>
      )}
    </section>
  );
}

function SuspectPicker({ suspects, value, onChange, label }: { suspects: InterrogationPlayerView[]; value: PlayerId | null; onChange: (id: PlayerId) => void; label: string }) {
  return (
    <div className="mt-2" role="radiogroup" aria-label={label}>
      <div className="gv-type text-[13px] text-[#c9d1c0]">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {suspects.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={value === s.id} onClick={() => onChange(s.id)} className="gv-mini">
            <Avatar id={s.id} name={s.name} look="suspect" size={46} className="overflow-hidden rounded bg-[linear-gradient(180deg,#5a6670,#2a3036)]" />
            <span className="nm">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BetPanel({ myBet, inspector, sendMove }: { myBet: boolean | null; inspector: string; sendMove: (m: InterrogationMove) => void }) {
  if (myBet !== null) {
    return (
      <section className="gv-card">
        <h4 className="pt-1">Pari déposé</h4>
        <p className="mt-2">{myBet ? `${inspector} va trouver le Coupable` : `${inspector} va se tromper`}. En attente des autres…</p>
      </section>
    );
  }
  return (
    <section className="gv-card">
      <h4 className="pt-1">Ton pari secret</h4>
      <p className="muted mt-2 text-[15px]">L’Enquêteur ({inspector}) va-t-il démasquer le Coupable ? Pari gagné : +2 points.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="gv-btn green" onClick={() => sendMove({ type: 'bet', found: true })}>
          Il va trouver
        </button>
        <button type="button" className="gv-btn red" onClick={() => sendMove({ type: 'bet', found: false })}>
          Il va se tromper
        </button>
      </div>
    </section>
  );
}

// ───────── Révélation, mots grillés, points ─────────

function Grills({ view, nameOf }: { view: InterrogationView; nameOf: NameOf }) {
  return (
    <section className="gv-card">
      <h4 className="pt-1">Mots grillés</h4>
      <ul className="mt-2 flex flex-col gap-1">
        {view.grills.map((g, i) => (
          <li key={i} className="gv-type text-[14.5px]">
            « {g.word} » chez {nameOf(g.target)} : <span className={g.hit ? 'font-bold text-[#b3261e]' : 'text-[#5a5446]'}>{g.hit ? 'touché !' : 'raté'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Révélation des mots, en trois temps :
 * - review : chaque suspect déclare ses mots placés ;
 * - verify : chaque joueur signale les mots déclarés qu'il n'a pas entendus ;
 * - scores : verdict final (placé, grillé, refusé par la table).
 */
function Reveal({ view, actingAs, nameOf, sendMove }: { view: InterrogationView; actingAs: PlayerId | null; nameOf: NameOf; sendMove: (m: InterrogationMove) => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [doubts, setDoubts] = useState<{ target: PlayerId; word: string }[]>([]);
  const reveal = view.reveal ?? {};
  const actor = view.players.find((p) => p.id === actingAs);
  const declaring = view.phase === 'review' && !!actor && actor.id !== view.inspector && !actor.declared;
  const verifying = view.phase === 'verify' && !!actor && !actor.verified;

  // Sur l'écran partagé, chaque joueur repart d'une sélection vide.
  useEffect(() => {
    setChecked([]);
    setDoubts([]);
  }, [actingAs, view.phase]);

  const toggleWord = (w: string) => setChecked((c) => (c.includes(w) ? c.filter((x) => x !== w) : [...c, w]));
  const isDoubted = (target: PlayerId, word: string) => doubts.some((d) => d.target === target && d.word === word);
  const toggleDoubt = (target: PlayerId, word: string) =>
    setDoubts((list) => (isDoubted(target, word) ? list.filter((d) => !(d.target === target && d.word === word)) : [...list, { target, word }]));

  return (
    <section className="gv-card flex flex-col gap-3">
      <h4 className="pt-1">Procès-verbal des mots</h4>
      {declaring && (
        <p className="gv-type rounded bg-[#fff6cf] px-3 py-2 text-[14.5px]">
          {actor.name}, coche les mots que tu as vraiment prononcés. Les autres joueurs pourront les contester.
        </p>
      )}
      {verifying && (
        <p className="gv-type rounded bg-[#fff6cf] px-3 py-2 text-[14.5px]">
          {actor.name}, touche les mots que tu n’as <strong>pas</strong> entendus. Un mot signalé par la majorité des autres joueurs ne compte pas.
        </p>
      )}

      {Object.entries(reveal).map(([id, words]) => {
        const mine = id === actingAs;
        return (
          <div key={id} className={`rounded border px-3 py-2 ${(declaring && mine) || (verifying && !mine) ? 'border-[#b3261e]/60 bg-[#fff6cf]/50' : 'border-[#22201a]/20'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="gv-type font-bold">{nameOf(id)}</span>
              <span className={`gv-stamp ${id === view.culprit ? '' : 'blue'} text-[11px]`}>{id === view.culprit ? 'Coupable' : 'Innocent'}</span>
              {id === view.accused && <span className="gv-type text-[12px] font-bold text-[#b3261e]">accusé</span>}
              {view.bets && Object.hasOwn(view.bets, id) && (
                <span className="gv-type ml-auto text-[12.5px] text-[#5a5446]">
                  pari : {view.bets[id] ? 'il va trouver' : 'il va se tromper'}{' '}
                  {id === view.culprit && view.accused === view.culprit
                    ? '(sans effet : arrêté)'
                    : view.bets[id] === (view.accused !== null && view.accused === view.culprit)
                      ? '✓'
                      : '✗'}
                </span>
              )}
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {words.map((w) => {
                if (declaring && mine && !w.burned) {
                  return (
                    <li key={w.word}>
                      <label className="gv-word flex cursor-pointer items-center gap-2 has-[:checked]:bg-[#dff5e3]">
                        <input type="checkbox" checked={checked.includes(w.word)} onChange={() => toggleWord(w.word)} className="h-4 w-4 accent-[#1f6b3a]" />
                        {w.word}
                      </label>
                    </li>
                  );
                }
                if (verifying && !mine && w.placed) {
                  const doubted = isDoubted(id, w.word);
                  return (
                    <li key={w.word}>
                      <button type="button" aria-pressed={doubted} onClick={() => toggleDoubt(id, w.word)} className={`gv-word ${doubted ? 'line-through !bg-[#ffd9d2] !text-[#9c1b14]' : '!bg-[#dff5e3]'}`}>
                        {w.word} {doubted ? '· pas entendu' : '✓'}
                      </button>
                    </li>
                  );
                }
                return <WordChip key={w.word} w={w} />;
              })}
            </ul>
          </div>
        );
      })}

      {declaring && (
        <button type="button" className="gv-btn" onClick={() => sendMove({ type: 'declare', placed: checked })}>
          Valider ({checked.length} placé{checked.length > 1 ? 's' : ''})
        </button>
      )}
      {verifying && (
        <button type="button" className="gv-btn" onClick={() => sendMove({ type: 'verify', doubts })}>
          {doubts.length === 0 ? 'Valider : j’ai tout entendu' : `Valider (${doubts.length} signalé${doubts.length > 1 ? 's' : ''})`}
        </button>
      )}
    </section>
  );
}

function WordChip({ w }: { w: RevealedWord }) {
  let extra = '';
  let suffix = '';
  if (w.burned) {
    extra = 'line-through';
    suffix = ' · grillé';
  } else if (w.rejected) {
    extra = 'line-through !text-[#9c1b14]';
    suffix = ` · refusé (${w.doubts} doute${(w.doubts ?? 0) > 1 ? 's' : ''})`;
  } else if (w.placed) {
    extra = '!bg-[#dff5e3] !text-[#1f6b3a]';
    suffix = ' ✓';
  } else if (w.placed === false) {
    suffix = ' · non placé';
  }
  return (
    <li className={`gv-word ${extra}`}>
      {w.word}
      {suffix}
    </li>
  );
}

function RoundScores({ view, nameOf }: { view: InterrogationView; nameOf: NameOf }) {
  if (!view.lastRound) return null;
  return (
    <section className="gv-card">
      <h4 className="pt-1">Points de la manche {view.round}</h4>
      <ul className="mt-2 flex flex-col gap-2">
        {view.lastRound.map((line) => (
          <li key={line.playerId} className="flex items-start gap-3">
            <span className="gv-num w-10 shrink-0 text-right text-[#1f6b3a]">+{line.points}</span>
            <span className="min-w-0">
              <span className="gv-type font-bold">{nameOf(line.playerId)}</span>
              <span className="text-[#5a5446]"> · {line.reasons.join(' · ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ranking({ view, viewer }: { view: InterrogationView; viewer: PlayerId | null }) {
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <section className="gv-card">
      <h4 className="pt-1">Classement</h4>
      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-6 marker:text-[#5a5446]">
        {ranked.map((p) => (
          <li key={p.id} className="gv-type text-[15px]">
            <span className="flex items-center gap-2">
            <span className="min-w-[5rem] flex-1 truncate">
              {p.name}
              {p.id === viewer && ' (toi)'}
            </span>
            <span className="gv-num w-10 text-right">{p.score}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  Cinematic,
  RichIcon,
  RoundTable,
  sfx,
  useAmbient,
  useMediaQuery,
  type GameIconName,
  type Metal,
  type TableLink,
} from '@arcade/tabletop';
import {
  ACTIONS,
  ACTION_RULES,
  CHARACTERS,
  CHARACTER_LABEL,
  CHARACTER_POWER,
  CHARACTER_THE,
  FORCED_CONSPIRACY,
  ecus,
  type ActionKind,
  type Character,
  type CourtMove,
  type CourtPlayerView,
  type CourtView,
} from '../shared';
import { COURT_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<CourtView, CourtMove>;
type NameOf = (id: PlayerId | null) => string;

/** Chaque personnage : son emblème, son métal, sa couleur. */
const CHAR: Record<Character, { icon: GameIconName; metal: Metal; color: string }> = {
  banker: { icon: 'crown-coin', metal: 'gold', color: '#9a6a14' },
  executioner: { icon: 'executioner-hood', metal: 'iron', color: '#4a0a08' },
  brigand: { icon: 'cloak-dagger', metal: 'steel', color: '#1f4a2f' },
  envoy: { icon: 'love-letter', metal: 'bone', color: '#1f3f86' },
  guard: { icon: 'shield', metal: 'silver', color: '#3c4854' },
  informer: { icon: 'spy', metal: 'bone', color: '#4b2a66' },
  mercenary: { icon: 'duel', metal: 'brass', color: '#6e3f12' },
};
const ACTION_ICON: Record<ActionKind, GameIconName> = {
  income: 'two-coins',
  favor: 'receive-money',
  conspiracy: 'stiletto',
  tax: 'crown-coin',
  execute: 'executioner-hood',
  racket: 'take-my-money',
  exchange: 'love-letter',
  snoop: 'spy',
  escort: 'duel',
};
/** Masques des invités du bal (dans l'ordre des places). */
const MASK: GameIconName[] = ['carnival-mask', 'domino-mask', 'bird-mask', 'curly-mask', 'iron-mask', 'duality-mask', 'drama-masks', 'jester-hat'];
const VELVET = ['#7a1d2a', '#1f3f6b', '#1d5a3a', '#5b2a73', '#8a5a12', '#155f66', '#3b3b3b', '#7a3b12'];

export default function CourtBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.players.findIndex((p) => p.id === id));
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);
  const wide = useMediaQuery('(min-width: 1024px)');
  const left = useCountdown(view.windowEndsAt);
  useAmbient('canal');

  // Choix de la cible : dans le panneau ou en touchant un masque sur le parquet.
  const [target, setTarget] = useState<PlayerId | null>(null);
  const [kind, setKind] = useState<ActionKind | null>(null);
  useEffect(() => {
    setKind(null);
    setTarget(null);
  }, [view.active, view.phase]);
  const myTurn = !!actor?.alive && view.phase === 'turn' && actingAs === view.active;
  const targetable =
    myTurn && kind && ACTION_RULES[kind].targeted
      ? view.players.filter((p) => p.alive && p.id !== actingAs && !(ACTION_RULES[kind].claim && p.escorted)).map((p) => p.id)
      : [];

  const event = useCourtEvents(view);
  // Seuls les moments forts (une carte retournée, un départ) passent en plein écran.
  const dramatic = useRef('calm');
  if (event.kind === 'reveal' || event.kind === 'out') dramatic.current = event.key;

  let action: ReactNode = null;
  if (myTurn) action = <ActionPicker view={view} me={actingAs!} hand={me?.hand ?? null} mode={mode} kind={kind} setKind={setKind} target={target} setTarget={setTarget} seatOf={seatOf} sendMove={sendMove} />;
  else if (actor?.alive && view.responders.includes(actingAs!)) action = <Reaction view={view} who={nameOf(actingAs)} mode={mode} nameOf={nameOf} left={left} sendMove={sendMove} />;
  else if (view.phase === 'loss' && view.losing === actingAs && privateView && me) action = <LoseInfluence hand={me.hand} sendMove={sendMove} />;
  else if (view.phase === 'show' && view.action?.target === actingAs && privateView && me) action = <ShowCard hand={me.hand} spy={nameOf(view.active)} sendMove={sendMove} />;
  else if (view.phase === 'peek' && view.active === actingAs && privateView && me) action = <Peek intel={me.intel.at(-1) ?? null} nameOf={nameOf} sendMove={sendMove} />;
  else if (view.phase === 'exchange' && view.active === actingAs && privateView && me?.exchange) action = <Exchange pool={me.exchange} keep={me.hand.length} sendMove={sendMove} />;

  return (
    <div className="ct">
      <style href="arcade-court-v1" precedence="default">
        {COURT_CSS}
      </style>
      <div className="ct-wall" />
      <div className="ct-light" />

      <header className="relative px-3 pt-[3.6rem] text-center sm:pt-4">
        <div className="flex items-center justify-center gap-3">
          <RichIcon name="carnival-mask" metal="gold" size={wide ? 56 : 42} />
          <div>
            <div className="ct-title ct-gold text-[1.7rem] leading-none sm:text-[2.2rem]">La Cité</div>
            <div className="mt-1 text-[13px] italic text-[#e8c98a]">Bal masqué au palais · pioche : {view.deckCount} cartes</div>
          </div>
        </div>
      </header>
      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <Instruction {...instructionFor(view, actingAs, privateView, mode, nameOf, left)} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {action}
          {me && <Hand hand={me.hand} intel={me.intel} nameOf={nameOf} />}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Ballroom
            view={view}
            viewer={viewer}
            wide={wide}
            nameOf={nameOf}
            left={left}
            preview={myTurn && kind ? { kind, target } : null}
            targetable={targetable}
            onTarget={(id) => setTarget(id)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <Reference court={view.config.characters} />
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      <Cinematic trigger={dramatic.current} onMount={false} duration={1700}>
        <EventBanner view={view} event={event} nameOf={nameOf} />
      </Cinematic>
    </div>
  );
}

function useCountdown(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

// ───────── Événements : annonces, contres, cartes retournées ─────────

type CourtEvent = { key: string; kind: 'claim' | 'block' | 'reveal' | 'out' | 'none'; who?: PlayerId; card?: Character };

function useCourtEvents(view: CourtView): CourtEvent {
  const revealed = view.players.map((p) => p.revealed.length).join(',');
  const alive = view.players.filter((p) => p.alive).length;
  const coins = view.players.reduce((s, p) => s + p.coins, 0);
  const prev = useRef({ phase: view.phase, block: view.block?.blocker ?? null, revealed, alive, coins });
  const event = useRef<CourtEvent>({ key: 'start', kind: 'none' });
  const p = prev.current;
  if (alive < p.alive) {
    const out = view.players.find((x, i) => !x.alive && Number(p.revealed.split(',')[i]) < x.revealed.length);
    event.current = { key: `out-${alive}`, kind: 'out', who: out?.id };
  } else if (revealed !== p.revealed) {
    const before = p.revealed.split(',').map(Number);
    const who = view.players.find((x, i) => x.revealed.length > (before[i] ?? 0));
    event.current = { key: `rev-${revealed}`, kind: 'reveal', who: who?.id, card: who?.revealed.at(-1) };
  } else if (view.block && view.block.blocker !== p.block) {
    event.current = { key: `block-${view.log.length}`, kind: 'block', who: view.block.blocker, card: view.block.claim };
  } else if (p.phase === 'turn' && view.phase !== 'turn' && view.action && ACTION_RULES[view.action.kind].claim) {
    event.current = { key: `claim-${view.log.length}`, kind: 'claim', who: view.action.actor, card: ACTION_RULES[view.action.kind].claim! };
  }
  prev.current = { phase: view.phase, block: view.block?.blocker ?? null, revealed, alive, coins };

  const played = useRef(event.current.key);
  const lastCoins = useRef(coins);
  useEffect(() => {
    if (coins !== lastCoins.current) {
      sfx.coins();
      lastCoins.current = coins;
    }
    const e = event.current;
    if (played.current === e.key) return;
    played.current = e.key;
    if (e.kind === 'reveal') sfx.drum(0, 1);
    else if (e.kind === 'out') sfx.drum(0, 3);
    else if (e.kind === 'block') sfx.knock(0, 0.5);
    else if (e.kind === 'claim') sfx.whoosh(0, 0.14);
  });
  return event.current;
}

function EventBanner({ view, event, nameOf }: { view: CourtView; event: CourtEvent; nameOf: NameOf }) {
  if (event.kind === 'none') return null;
  const who = nameOf(event.who ?? null);
  const card = event.card ? <CharacterCard c={event.card} w={100} /> : null;
  const title =
    event.kind === 'claim'
      ? `« Je suis ${CHARACTER_THE[event.card!]} »`
      : event.kind === 'block'
        ? `${who} contre !`
        : event.kind === 'reveal'
          ? `${who} perd une influence`
          : `${who} quitte la cour`;
  const sub =
    event.kind === 'claim'
      ? `${who} annonce ${ACTION_RULES[view.action?.kind ?? 'tax'].label}${view.action?.target ? ` sur ${nameOf(view.action.target)}` : ''}. Bluff ou vérité ?`
      : event.kind === 'block'
        ? `avec ${CHARACTER_THE[event.card!]} — vrai ou faux ?`
        : event.kind === 'reveal'
          ? `et retourne ${CHARACTER_THE[event.card!]}`
          : 'Ses deux masques sont tombés.';
  return (
    <div className="ct-banner">
      {card && event.kind !== 'out' && <div className="ct-flip mb-2 flex justify-center">{card}</div>}
      {event.kind === 'out' && (
        <div className="mb-2 flex justify-center">
          <RichIcon name="drama-masks" metal="bone" size={70} />
        </div>
      )}
      <div className="ct-title ct-gold text-[2.1rem] leading-tight sm:text-5xl">{title}</div>
      <div className="s">{sub}</div>
    </div>
  );
}


// ───────── Consigne ─────────

function instructionFor(
  view: CourtView,
  actingAs: PlayerId | null,
  privateView: boolean,
  mode: Props['mode'],
  nameOf: NameOf,
  left: number | null,
): { icon: GameIconName; mine: boolean; text: ReactNode; timer: number | null } {
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const alive = !!view.players.find((p) => p.id === actingAs)?.alive;
  const a = view.action;
  const responder = alive && actingAs !== null && view.responders.includes(actingAs);
  if (view.phase === 'over') return { icon: 'carnival-mask', mine: false, text: `${nameOf(view.winner)} règne désormais sur la Cité. Les derniers masques tombent.`, timer: null };
  if (view.phase === 'turn' || !a) {
    return alive && actingAs === view.active
      ? { icon: 'carnival-mask', mine: true, text: you('à toi : choisis une action. Tu peux annoncer un personnage que tu n’as pas… si tu oses.'), timer: null }
      : { icon: 'carnival-mask', mine: false, text: `${nameOf(view.active)} choisit son action.`, timer: null };
  }
  const rule = ACTION_RULES[a.kind];
  const announce = `${nameOf(a.actor)} annonce ${rule.label}${rule.claim ? ` (${CHARACTER_LABEL[rule.claim]})` : ''}${a.target ? ` sur ${nameOf(a.target)}` : ''}`;
  switch (view.phase) {
    case 'challenge':
      return responder
        ? { icon: 'drama-masks', mine: true, text: you(`${announce}. Crois-tu qu’il a vraiment ${CHARACTER_THE[rule.claim!]} ? Conteste, ou laisse passer.`), timer: left }
        : { icon: 'drama-masks', mine: false, text: `${announce}. Quelqu’un conteste ?`, timer: left };
    case 'block': {
      const by = rule.blockedBy.map((c) => CHARACTER_THE[c]).join(' ou ');
      return responder
        ? { icon: 'shield', mine: true, text: you(`${announce}. Tu peux contrer avec ${by} (même sans l’avoir), ou laisser passer.`), timer: left }
        : { icon: 'shield', mine: false, text: `${announce}. Quelqu’un contre ?`, timer: left };
    }
    case 'challengeBlock':
      return responder
        ? { icon: 'drama-masks', mine: true, text: you(`${nameOf(view.block?.blocker ?? null)} contre avec ${CHARACTER_THE[view.block!.claim]}. Contester ce contre ?`), timer: left }
        : { icon: 'drama-masks', mine: false, text: `${nameOf(view.block?.blocker ?? null)} contre avec ${CHARACTER_THE[view.block!.claim]}. Quelqu’un conteste ?`, timer: left };
    case 'loss':
      return view.losing === actingAs && privateView
        ? { icon: 'drama-masks', mine: true, text: you('tu perds une influence : choisis la carte à retourner face visible.'), timer: null }
        : { icon: 'drama-masks', mine: false, text: `${nameOf(view.losing)} doit perdre une influence.`, timer: null };
    case 'exchange':
      return { icon: 'love-letter', mine: view.active === actingAs && privateView, text: view.active === actingAs && privateView ? you('Échange : garde les personnages que tu veux.') : `${nameOf(a.actor)} choisit ses personnages.`, timer: null };
    case 'show':
      return { icon: 'spy', mine: a.target === actingAs && privateView, text: a.target === actingAs && privateView ? you(`${nameOf(a.actor)} t’espionne : montre-lui une de tes influences.`) : `${nameOf(a.target)} choisit l’influence à montrer.`, timer: null };
    case 'peek':
      return { icon: 'spy', mine: view.active === actingAs && privateView, text: `${nameOf(a.actor)} découvre la carte en secret.`, timer: null };
    default:
      return { icon: 'carnival-mask', mine: false, text: announce, timer: null };
  }
}

function Instruction({ icon, mine, text, timer }: { icon: GameIconName; mine: boolean; text: ReactNode; timer: number | null }) {
  return (
    <div className={`ct-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="gold" size={26} />
      </span>
      <p className="flex-1">{text}</p>
      {timer !== null && <span className={`ct-timer ${timer <= 5 ? 'low' : ''}`}>{timer} s</span>}
    </div>
  );
}

// ───────── La salle de bal ─────────

function Ballroom({
  view,
  viewer,
  wide,
  nameOf,
  left,
  preview,
  targetable,
  onTarget,
}: {
  view: CourtView;
  viewer: PlayerId | null;
  wide: boolean;
  nameOf: NameOf;
  left: number | null;
  preview: { kind: ActionKind; target: PlayerId | null } | null;
  targetable: PlayerId[];
  onTarget: (id: PlayerId) => void;
}) {
  const links: TableLink[] = [];
  const colorOf = (k: ActionKind) => (k === 'execute' || k === 'conspiracy' ? '#ff5a4a' : k === 'racket' ? '#f2d37a' : k === 'snoop' ? '#c9a6ff' : '#f6e7c4');
  if (view.action?.target && view.phase !== 'turn' && view.phase !== 'over') {
    links.push({ id: 'act', from: view.action.actor, to: view.action.target, color: colorOf(view.action.kind), width: 3.5, flow: true, glow: true });
  }
  if (view.block && view.action) links.push({ id: 'block', from: view.block.blocker, to: view.action.actor, color: '#9db8f2', width: 3.5, dash: '9 6', glow: true });
  if (preview?.target && viewer) links.push({ id: 'preview', from: viewer, to: preview.target, color: colorOf(preview.kind), width: 3.5, flow: true, glow: true });

  return (
    <section className="relative pb-7 lg:pb-3" aria-label="La cour">
      <h3 className="sr-only">La cour</h3>
      <RoundTable
        ids={view.players.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 132, h: 150 } : { w: 86, h: 120 }}
        className={wide ? 'aspect-[1.32] max-h-[calc(100dvh-150px)] min-h-[500px]' : 'aspect-[0.84]'}
        links={links}
        under={<div className="ct-floor" />}
        center={<BallroomHeart view={view} nameOf={nameOf} left={left} wide={wide} />}
        renderSeat={(id) => {
          const p = view.players.find((x) => x.id === id)!;
          return (
            <Seat
              p={p}
              seat={view.players.indexOf(p)}
              view={view}
              viewer={viewer}
              wide={wide}
              picked={preview?.target === id}
              onPick={targetable.includes(id) ? () => onTarget(id) : undefined}
            />
          );
        }}
      />
    </section>
  );
}

function Mask({ seat, size }: { seat: number; size: number }) {
  const c = VELVET[seat % VELVET.length]!;
  return (
    <span className="ct-mask" style={{ width: size, height: size, background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${c} 50%, white), ${c} 55%, color-mix(in srgb, ${c} 50%, black))` }}>
      <RichIcon name={MASK[seat % MASK.length]!} metal="gold" size={size * 0.66} />
    </span>
  );
}

function seatChip(view: CourtView, p: CourtPlayerView): { text: string; tone: string } | null {
  if (!p.alive) return { text: 'a quitté la cour', tone: 'dim' };
  if (view.responders.includes(p.id)) return { text: 'réfléchit…', tone: 'dim' };
  if (p.passed) return { text: 'laisse passer', tone: 'green' };
  if (view.block?.blocker === p.id) return { text: `contre (${CHARACTER_LABEL[view.block.claim]})`, tone: 'blue' };
  if (view.losing === p.id) return { text: 'perd une influence', tone: 'red' };
  if (p.id === view.active && view.phase === 'turn') return { text: 'à son tour', tone: 'gold' };
  if (p.escorted) return { text: 'escorté', tone: 'gold' };
  return null;
}

function Seat({
  p,
  seat,
  view,
  viewer,
  wide,
  picked,
  onPick,
}: {
  p: CourtPlayerView;
  seat: number;
  view: CourtView;
  viewer: PlayerId | null;
  wide: boolean;
  picked: boolean;
  onPick?: () => void;
}) {
  const chip = seatChip(view, p);
  const claims = [...new Set(p.claimed)];
  const size = wide ? 60 : 48;
  const cls = `ct-seat ${p.id === view.active && view.phase !== 'over' ? 'is-active' : ''} ${p.id === viewer ? 'is-me' : ''} ${p.alive ? '' : 'is-dead'}`;
  const body = (
    <>
      {chip && <span className={`ct-chip tone-${chip.tone}`}>{chip.text}</span>}
      <span className="relative">
        <Mask seat={seat} size={size} />
        {picked && <span className="pointer-events-none absolute -inset-1 rounded-full shadow-[0_0_0_3px_#ff5a4a,0_0_18px_rgba(255,90,74,.9)]" />}
      </span>
      <span className="ct-plate">
        <span className="ct-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="ct-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="ct-coins" title={ecus(p.coins)}>
          <span className="ct-coin" style={{ width: 13, height: 13 }} />
          {p.coins}
        </span>
        <span className="flex items-center gap-[3px]" aria-label={`${p.influence} influence(s) cachée(s)`}>
          {Array.from({ length: p.influence }, (_, i) => (
            <span key={i} className="ct-back" style={{ width: wide ? 15 : 12, height: wide ? 21 : 17 }} />
          ))}
          {p.revealed.map((c, i) => (
            <span key={`r${i}`} className="ct-mini" title={`${CHARACTER_LABEL[c]} (perdu)`} style={{ width: wide ? 18 : 15, height: wide ? 21 : 17, background: CHAR[c].color, filter: 'saturate(.5)' }}>
              <RichIcon name={CHAR[c].icon} metal={CHAR[c].metal} size={wide ? 14 : 12} />
            </span>
          ))}
        </span>
      </span>
      {p.alive && claims.length > 0 && view.phase !== 'over' && (
        <span className="ct-claims" title={`A revendiqué : ${claims.map((c) => CHARACTER_LABEL[c]).join(', ')}`}>
          <span className="text-[11px] italic text-[#e8c98a]">dit :</span>
          {claims.map((c) => (
            <span key={c} className="ct-mini opacity-90" style={{ width: 15, height: 15, borderRadius: '50%', background: CHAR[c].color }}>
              <RichIcon name={CHAR[c].icon} metal={CHAR[c].metal} size={11} />
            </span>
          ))}
          {claims.length > p.influence && <span className="ct-warn" title="Plus de personnages revendiqués que de cartes !">!</span>}
        </span>
      )}
    </>
  );
  if (onPick) {
    return (
      <button type="button" className={`${cls} cursor-crosshair transition hover:-translate-y-1`} style={{ width: wide ? 132 : 86 }} aria-label={`Viser ${p.name}`} onClick={onPick}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={{ width: wide ? 132 : 86 }}>
      {body}
    </div>
  );
}

function BallroomHeart({ view, nameOf, left, wide }: { view: CourtView; nameOf: NameOf; left: number | null; wide: boolean }) {
  const a = view.action;
  if (view.phase === 'over') {
    return (
      <div className="flex flex-col items-center text-center">
        <RichIcon name="laurel-crown" metal="gold" size={64} />
        <span className="ct-title mt-1 text-[16px] text-[#3a0b12]">{nameOf(view.winner)}</span>
        <span className="text-[14px] italic text-[#4a3418]">règne sur la Cité</span>
      </div>
    );
  }
  if (!a || view.phase === 'turn') {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex items-end gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ct-coin" style={{ width: 26, height: 26, marginLeft: i ? -12 : 0 }} />
          ))}
        </span>
        <span className="ct-title mt-2 text-[15px] text-[#3a0b12]">{nameOf(view.active)}</span>
        <span className="text-[14px] italic text-[#4a3418]">choisit son action</span>
      </div>
    );
  }
  const rule = ACTION_RULES[a.kind];
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-end gap-2">
        {rule.claim ? (
          <CharacterCard c={rule.claim} w={wide ? 92 : 70} />
        ) : (
          <span className="grid place-items-center rounded-full bg-[#3a0b12] p-2 shadow-[0_0_0_2px_#e2b452]">
            <RichIcon name={ACTION_ICON[a.kind]} metal="gold" size={46} />
          </span>
        )}
        {view.block && (
          <span className="relative">
            <span className="ct-title absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-[#1f3f86]">contre</span>
            <CharacterCard c={view.block.claim} w={wide ? 80 : 60} />
          </span>
        )}
      </div>
      <span className="ct-title mt-1.5 text-[14px] leading-tight text-[#3a0b12]">
        {nameOf(a.actor)} : {rule.label}
      </span>
      {left !== null && <span className={`ct-timer mt-1 text-[#ffe7a0] ${left <= 5 ? 'low' : ''}`}>{left} s</span>}
    </div>
  );
}

// ───────── Cartes et main secrète ─────────

function CharacterCard({ c, w = 118, power = false }: { c: Character; w?: number; power?: boolean }) {
  const d = CHAR[c];
  return (
    <span className="ct-card" style={{ '--w': `${w}px` } as CSSProperties}>
      <span className="medal" style={{ background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${d.color} 45%, white), ${d.color} 55%, color-mix(in srgb, ${d.color} 50%, black))` }}>
        <RichIcon name={d.icon} metal={d.metal} size={w * 0.42} />
      </span>
      <span className="nm" style={{ color: d.color }}>
        {CHARACTER_LABEL[c]}
      </span>
      {power && <span className="pw">{CHARACTER_POWER[c]}</span>}
    </span>
  );
}

function Hand({ hand, intel, nameOf }: { hand: Character[]; intel: { target: PlayerId; card: Character }[]; nameOf: NameOf }) {
  return (
    <section className="ct-frame p-4">
      <div className="ct-title text-center text-[13px] uppercase tracking-[0.25em] text-[#e8c98a]">Tes influences secrètes :</div>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {hand.map((c, i) => (
          <CharacterCard key={i} c={c} w={128} power />
        ))}
        {hand.length === 0 && <p className="text-[#d9bfa0]">Tu as quitté la cour.</p>}
      </div>
      {intel.length > 0 && (
        <p className="mt-3 text-center text-[14px] text-[#e8c98a]">
          Tes espionnages : {intel.slice(-3).map((i) => `${nameOf(i.target)} avait ${CHARACTER_THE[i.card]}`).join(' · ')} (une carte peut avoir changé depuis)
        </p>
      )}
    </section>
  );
}

// ───────── Choix de l'action ─────────

function ActionPicker({
  view,
  me,
  hand,
  mode,
  kind,
  setKind,
  target,
  setTarget,
  seatOf,
  sendMove,
}: {
  view: CourtView;
  me: PlayerId;
  hand: Character[] | null;
  mode: Props['mode'];
  kind: ActionKind | null;
  setKind: (k: ActionKind | null) => void;
  target: PlayerId | null;
  setTarget: (id: PlayerId | null) => void;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: CourtMove) => void;
}) {
  const coins = view.players.find((p) => p.id === me)!.coins;
  const forced = coins >= FORCED_CONSPIRACY;
  const targets = view.players.filter((p) => p.alive && p.id !== me && !(kind && ACTION_RULES[kind].claim && p.escorted));
  const rule = kind ? ACTION_RULES[kind] : null;
  const picked = target && targets.some((p) => p.id === target) ? target : null;

  return (
    <section className="ct-dock">
      <h4>{mode === 'hotseat' ? `${view.players.find((p) => p.id === me)!.name}, à toi : ` : 'À toi : '}choisis une action</h4>
      {forced && <p className="mt-1 text-center text-[14px] font-semibold text-[#9c1b14]">Avec {FORCED_CONSPIRACY} écus ou plus, la Conspiration est obligatoire.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ACTIONS.filter((k) => {
          const claim = ACTION_RULES[k].claim;
          return !claim || view.config.characters.includes(claim);
        }).map((k) => {
          const r = ACTION_RULES[k];
          const noTarget = r.targeted && !view.players.some((p) => p.alive && p.id !== me && !(r.claim && p.escorted));
          const disabled = coins < r.cost || (forced && k !== 'conspiracy') || noTarget;
          const bluff = hand && r.claim && !hand.includes(r.claim);
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              aria-pressed={kind === k}
              className="ct-action"
              onClick={() => {
                sfx.click();
                setKind(k);
                setTarget(null);
              }}
            >
              <span
                className="grid h-10 w-10 flex-none place-items-center rounded-full"
                style={{ background: r.claim ? CHAR[r.claim].color : '#3a0b12', boxShadow: '0 0 0 2px #e2b452' }}
              >
                <RichIcon name={ACTION_ICON[k]} metal={r.claim ? CHAR[r.claim].metal : 'gold'} size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="lb block">{r.label}</span>
                {r.claim && <span className="block text-[12.5px] italic leading-tight text-[#7a1d2a]">{CHARACTER_THE[r.claim]}</span>}
                <span className="sm block">{noTarget ? 'personne à viser : les autres sont sous escorte' : r.summary}</span>
              </span>
              {bluff && <span className="ct-bluff absolute -right-1.5 -top-2">bluff</span>}
            </button>
          );
        })}
      </div>
      {rule?.targeted && (
        <>
          <div className="muted mt-3 text-center text-[15px] italic">Sur qui ? (ou touche un masque dans la salle)</div>
          <div className="mt-1 flex flex-wrap justify-center gap-1" role="radiogroup" aria-label="Cible">
            {targets.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={picked === p.id} onClick={() => setTarget(p.id)} className="ct-pick">
                <Mask seat={seatOf(p.id)} size={40} />
                <span className="ct-title text-[13px]">{p.name}</span>
                <span className="text-[12px] text-[#6b4f2a]">{ecus(p.coins)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="ct-btn"
          disabled={!kind || (rule?.targeted && !picked)}
          onClick={() => kind && sendMove({ type: 'act', kind, target: rule?.targeted ? (picked ?? undefined) : undefined })}
        >
          {kind ? `Annoncer : ${ACTION_RULES[kind].label}` : 'Choisis une action'}
        </button>
      </div>
    </section>
  );
}

// ───────── Réactions ─────────

function Reaction({
  view,
  who,
  mode,
  nameOf,
  left,
  sendMove,
}: {
  view: CourtView;
  who: string;
  mode: Props['mode'];
  nameOf: NameOf;
  left: number | null;
  sendMove: (m: CourtMove) => void;
}) {
  const a = view.action!;
  const prefix = mode === 'hotseat' ? `${who} : ` : '';
  const pass = (
    <button type="button" className="ct-btn2" onClick={() => sendMove({ type: 'pass' })}>
      Laisser passer
    </button>
  );
  if (view.phase === 'block') {
    return (
      <section className="ct-dock">
        <h4>
          {prefix}contrer {ACTION_RULES[a.kind].label} ?
        </h4>
        <p className="muted text-center text-[15px]">Tu peux contrer même sans avoir la carte… au risque d’être contesté.{left !== null ? ` (${left} s)` : ''}</p>
        <div className="mt-3 flex flex-wrap items-end justify-center gap-3">
          {ACTION_RULES[a.kind].blockedBy.filter((c) => view.config.characters.includes(c)).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Contrer (${CHARACTER_LABEL[c]})`}
              className="flex flex-col items-center gap-1.5"
              onClick={() => {
                sfx.knock();
                sendMove({ type: 'block', claim: c });
              }}
            >
              <CharacterCard c={c} w={96} />
              <span className="ct-btn text-[.8rem]">Contrer</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center">{pass}</div>
      </section>
    );
  }
  const claimant = view.phase === 'challenge' ? a.actor : view.block!.blocker;
  const claim = view.phase === 'challenge' ? ACTION_RULES[a.kind].claim! : view.block!.claim;
  return (
    <section className="ct-dock">
      <h4>
        {prefix}contester ? {nameOf(claimant)} prétend avoir {CHARACTER_THE[claim]}.
      </h4>
      <div className="mt-2 flex justify-center">
        <CharacterCard c={claim} w={92} />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          className="ct-btn danger"
          onClick={() => {
            sfx.knock(0, 0.6);
            sendMove({ type: 'challenge' });
          }}
        >
          Contester
        </button>
        {pass}
      </div>
      <p className="muted mt-2 text-center text-[14px] italic">Si tu as tort, c’est toi qui perds une influence.{left !== null ? ` (${left} s)` : ''}</p>
    </section>
  );
}

function CardChoice({
  title,
  hint,
  hand,
  verb,
  onPick,
}: {
  title: string;
  hint: string;
  hand: Character[];
  verb: string;
  onPick: (c: Character) => void;
}) {
  return (
    <section className="ct-dock">
      <h4>{title}</h4>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {hand.map((c, i) => (
          <button key={i} type="button" onClick={() => onPick(c)} aria-label={`${verb} ${CHARACTER_LABEL[c]}`}>
            <CharacterCard c={c} w={112} power />
          </button>
        ))}
      </div>
      <p className="muted mt-2 text-center text-[14px] italic">{hint}</p>
    </section>
  );
}

function LoseInfluence({ hand, sendMove }: { hand: Character[]; sendMove: (m: CourtMove) => void }) {
  return (
    <CardChoice
      title="Quelle influence perds-tu ?"
      hint="La carte choisie sera retournée, face visible pour tous."
      hand={hand}
      verb="Perdre"
      onPick={(card) => {
        sfx.drum(0, 1);
        sendMove({ type: 'lose', card });
      }}
    />
  );
}

function ShowCard({ hand, spy, sendMove }: { hand: Character[]; spy: string; sendMove: (m: CourtMove) => void }) {
  return (
    <CardChoice
      title={`${spy} t’espionne : quelle influence lui montres-tu ?`}
      hint={`Seul ${spy} la verra ; elle reste dans ta main.`}
      hand={hand}
      verb="Montrer"
      onPick={(card) => sendMove({ type: 'show', card })}
    />
  );
}

function Peek({ intel, nameOf, sendMove }: { intel: { target: PlayerId; card: Character } | null; nameOf: NameOf; sendMove: (m: CourtMove) => void }) {
  if (!intel) return null;
  return (
    <section className="ct-dock">
      <h4>Espionnage : {nameOf(intel.target)} t’a montré…</h4>
      <div className="ct-flip mt-3 flex justify-center">
        <CharacterCard c={intel.card} w={120} power />
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ct-btn" onClick={() => sendMove({ type: 'seen' })}>
          Compris
        </button>
      </div>
    </section>
  );
}

function Exchange({ pool, keep, sendMove }: { pool: Character[]; keep: number; sendMove: (m: CourtMove) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < keep ? [...p, i] : p));
  return (
    <section className="ct-dock">
      <h4>
        Échange : garde {keep} personnage{keep > 1 ? 's' : ''}
      </h4>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5">
        {pool.map((c, i) => (
          <button key={i} type="button" aria-pressed={picked.includes(i)} onClick={() => toggle(i)} aria-label={CHARACTER_LABEL[c]}>
            <CharacterCard c={c} w={96} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ct-btn" disabled={picked.length !== keep} onClick={() => sendMove({ type: 'keep', cards: picked.map((i) => pool[i]!) })}>
          Garder ({picked.length}/{keep})
        </button>
      </div>
    </section>
  );
}

// ───────── Aide-mémoire et journal ─────────

function Reference({ court }: { court: Character[] }) {
  return (
    <details className="ct-frame px-4 py-3">
      <summary className="ct-title cursor-pointer select-none text-[14px] uppercase tracking-[0.16em] text-[#f2d37a]">Les personnages du bal</summary>
      <ul className="mt-3 flex flex-col gap-2">
        {CHARACTERS.filter((c) => court.includes(c)).map((c) => (
          <li key={c} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full" style={{ background: CHAR[c].color, boxShadow: '0 0 0 2px #e2b452' }}>
              <RichIcon name={CHAR[c].icon} metal={CHAR[c].metal} size={20} />
            </span>
            <span>
              <strong className="ct-title text-[13px] text-[#fbeed2]">{CHARACTER_LABEL[c]}</strong>
              <span className="block text-[15px] leading-tight text-[#d9bfa0]">{CHARACTER_POWER[c]}</span>
            </span>
          </li>
        ))}
        <li className="text-[15px] italic text-[#d9bfa0]">Pour tous : Revenu (+1), Faveur (+2, contrable), Conspiration (7 écus, imparable).</li>
      </ul>
    </details>
  );
}

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-10).reverse();
  return (
    <details open={open} className="ct-frame px-4 py-3">
      <summary className="ct-title cursor-pointer select-none text-[14px] uppercase tracking-[0.16em] text-[#f2d37a]">Murmures de la cour</summary>
      <ol className="mt-2 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#fbeed2]' : 'text-[#c9ab8c]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}

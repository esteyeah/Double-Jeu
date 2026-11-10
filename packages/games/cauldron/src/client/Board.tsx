'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Avatar, Cinematic, RichIcon, RoundTable, sfx, Table3D, useAmbient, useWebGL, useMediaQuery, useOnChange, type GameIconName, type Metal } from '@arcade/tabletop';
import {
  ACTION_HELP,
  ACTION_LABEL,
  EXPEL_AT,
  INGREDIENT_LABEL,
  ROLE_LABEL,
  signed,
  type ActionKind,
  type Card,
  type CauldronMove,
  type CauldronPlayerView,
  type CauldronView,
  type Ingredient,
  type Taste,
} from '../shared';
import { CAULDRON_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<CauldronView, CauldronMove>;
type NameOf = (id: PlayerId | null) => string;

const INGREDIENTS: Ingredient[] = [1, 0, -2];
const ING: Record<Ingredient, { icon: GameIconName; metal: Metal; color: string; text: string }> = {
  1: { icon: 'plant-roots', metal: 'gold', color: '#a87a14', text: '#fff6cf' },
  0: { icon: 'vial', metal: 'silver', color: '#2b6b8a', text: '#e6f6ff' },
  [-2]: { icon: 'poison-bottle', metal: 'bone', color: '#5b1a6b', text: '#ffe1f7' },
} as Record<Ingredient, { icon: GameIconName; metal: Metal; color: string; text: string }>;
const ACT: Record<ActionKind, { icon: GameIconName; metal: Metal }> = {
  taste: { icon: 'round-bottom-flask', metal: 'silver' },
  skim: { icon: 'bubbles', metal: 'silver' },
  suspect: { icon: 'evil-eyes', metal: 'ruby' },
  plead: { icon: 'scroll-unfurled', metal: 'bone' },
};
/** Emblèmes des membres de la guilde (par place). */
const EMBLEM: GameIconName[] = ['spell-book', 'round-potion', 'crystal-cluster', 'frog', 'bat', 'mushrooms', 'herbs-bundle', 'pestle-mortar'];
const TINT = ['#2a4a2e', '#3f2a55', '#5a3a14', '#1f4a55', '#4a1f2a', '#33401a', '#22304f', '#4a3a1a'];

export default function CauldronBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.players.findIndex((p) => p.id === id));
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);
  const canAct = !!actor && !actor.expelled && view.phase !== 'over';
  const hotseatName = mode === 'hotseat' && actor ? `${actor.name}, ` : '';
  const wide = useMediaQuery('(min-width: 1024px)');
  useAmbient('brew');

  const [splash, setSplash] = useState(0);
  useOnChange(view.pours.length, (prev) => {
    if (view.pours.length > prev) {
      sfx.splash(0);
      [0.2, 0.35, 0.5].forEach((d) => sfx.bubble(d, 0.12));
      setSplash((n) => n + 1);
    }
  });
  const event = useGuildEvents(view);

  let action: ReactNode = null;
  if (canAct && view.phase === 'reveal' && privateView && !actor.acked)
    action = (
      <section className="ch-dock">
        <h4>Ton rôle dans la guilde</h4>
        <p className="muted text-center">Garde-le pour toi : personne d’autre ne le verra.</p>
        <div className="mt-3 flex justify-center">
          <button type="button" className="ch-btn" onClick={() => sendMove({ type: 'ack' })}>
            J’ai retenu mon rôle
          </button>
        </div>
      </section>
    );
  else if (canAct && view.phase === 'turn' && actingAs === view.active && privateView && me)
    action = <TurnPanel view={view} hand={me.hand} me={me.id} seatOf={seatOf} title={`${hotseatName}à toi de jouer`} sendMove={sendMove} />;
  else if (canAct && view.phase === 'tasted' && actingAs === view.active && privateView && me?.tastes.at(-1))
    action = <TastedPanel taste={me.tastes.at(-1)!} nameOf={nameOf} onDone={() => sendMove({ type: 'seen' })} />;
  else if (canAct && view.phase === 'vote') action = <VotePanel view={view} actingAs={actingAs!} privateView={privateView} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />;

  return (
    <div className="ch">
      <style href="arcade-cauldron-v1" precedence="default">
        {CAULDRON_CSS}
      </style>
      <div className="ch-stone" />
      <div className="ch-glow" />
      <div className="ch-motes" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, animationDelay: `${(i * 1.3) % 10}s`, animationDuration: `${10 + (i % 5) * 2.5}s` }} />
        ))}
      </div>

      <header className="relative pt-[3.4rem] sm:pt-3">
        <div className="ch-shelf" aria-hidden="true">
          {(['round-potion', 'fizzing-flask', 'candle-skull', 'standing-potion', 'spell-book', 'bubbling-flask', 'mushrooms', 'magic-potion', 'crystal-cluster', 'health-potion'] as GameIconName[]).map((icon, i) => (
            <span key={icon} className={i > 5 ? 'hidden sm:inline' : ''} style={{ animationDelay: `${i * 0.4}s` }}>
              <RichIcon name={icon} metal={(['ruby', 'silver', 'bone', 'gold', 'copper', 'silver', 'ruby', 'gold', 'silver', 'ruby'] as Metal[])[i]!} size={i % 3 === 0 ? 44 : 36} />
            </span>
          ))}
        </div>
        <div className="mt-2 text-center">
          <div className="ch-title ch-green text-[1.9rem] leading-none sm:text-[2.4rem]">Le Chaudron</div>
        </div>
      </header>
      <div className="mx-auto mt-3 w-[min(1240px,calc(100%-20px))]">
        <Gauge view={view} />
        <Instruction {...instructionFor(view, actingAs, privateView, mode, nameOf)} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {action}
          {me && privateView && <Identity me={me} view={view} nameOf={nameOf} />}
          {me && privateView && view.phase !== 'turn' && view.phase !== 'reveal' && me.hand.length > 0 && (
            <section className="ch-page">
              <h4>Ta main</h4>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {me.hand.map((c, i) => (
                  <CardFace key={i} card={c} w={88} />
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Lair view={view} viewer={viewer} wide={wide} nameOf={nameOf} splash={splash} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <Brew view={view} nameOf={nameOf} />
          {me && privateView && me.tastes.length > 0 && <Tastes tastes={me.tastes} nameOf={nameOf} />}
          <Reference view={view} />
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      <Cinematic trigger={event.key} onMount={false} duration={2000}>
        <EventBanner view={view} kind={event.kind} nameOf={nameOf} />
      </Cinematic>
    </div>
  );
}

// ───────── Événements ─────────

type EventKind = 'none' | 'vote' | 'expel';

function useGuildEvents(view: CauldronView): { key: string; kind: EventKind } {
  const expelled = view.players.filter((p) => p.expelled).length;
  const voteKey = view.lastVote ? `${view.lastVote.proposer}|${JSON.stringify(view.lastVote.votes)}|${view.lastVote.passed}` : '';
  const prev = useRef({ expelled, voteKey });
  const event = useRef<{ key: string; kind: EventKind }>({ key: 'start', kind: 'none' });
  const p = prev.current;
  if (expelled > p.expelled) event.current = { key: `expel-${expelled}`, kind: 'expel' };
  else if (voteKey && voteKey !== p.voteKey) event.current = { key: `vote-${voteKey}-${view.log.length}`, kind: 'vote' };
  prev.current = { expelled, voteKey };

  const played = useRef(event.current.key);
  useEffect(() => {
    const e = event.current;
    if (played.current === e.key) return;
    played.current = e.key;
    if (e.kind === 'expel') sfx.drum(0, 3);
    else if (e.kind === 'vote') {
      [0, 0.18, 0.36].forEach((d) => sfx.knock(d, 0.35));
      if (view.lastVote?.passed) sfx.chime(0.5);
    }
  });
  return event.current;
}

function EventBanner({ view, kind, nameOf }: { view: CauldronView; kind: EventKind; nameOf: NameOf }) {
  if (kind === 'expel') {
    const p = [...view.players].reverse().find((x) => x.expelled);
    if (!p) return null;
    return (
      <div className="ch-banner">
        <div className="mb-2 flex justify-center">
          <RichIcon name={p.role === 'poisoner' ? 'poison-bottle' : 'spell-book'} metal={p.role === 'poisoner' ? 'ruby' : 'gold'} size={64} />
        </div>
        <div className="k">Chassé de la guilde</div>
        <div className="ch-title ch-green text-[2.1rem] sm:text-5xl">{p.name}</div>
        <div className="s">{p.role ? `C’était ${p.role === 'poisoner' ? 'un Empoisonneur !' : 'un Alchimiste…'}` : ''}</div>
      </div>
    );
  }
  if (kind === 'vote' && view.lastVote) {
    const votes = Object.values(view.lastVote.votes);
    const yes = votes.filter(Boolean).length;
    return (
      <div className="ch-banner">
        <div className="k">Proposé par {nameOf(view.lastVote.proposer)}</div>
        <div className="ch-title ch-green text-[2.1rem] sm:text-5xl">{view.lastVote.passed ? 'On sert la potion !' : 'Potion refusée'}</div>
        <div className="s">
          {yes} pour · {votes.length - yes} contre{view.lastVote.passed ? '' : ` — ${nameOf(view.lastVote.proposer)} reçoit un soupçon`}
        </div>
      </div>
    );
  }
  return null;
}

// ───────── L'alambic ─────────

function Gauge({ view }: { view: CauldronView }) {
  const total = view.realTotal ?? view.announcedTotal;
  const max = view.target + 3;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const reached = total >= view.target;
  return (
    <section className="ch-glass px-4 py-3" aria-label="Force du chaudron">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="ch-title text-[15px] text-[#c9ffb8]">{view.realTotal === null ? 'Force annoncée' : 'Force réelle'}</span>
        <span className="text-[15px]">
          <strong className={`ch-num text-2xl ${reached ? 'text-[#b6ff9e]' : total < 0 ? 'text-[#ff8a7a]' : 'text-[#e7efd9]'}`}>{signed(total)}</strong>
          <span className="text-[#a8c49a]"> / {view.target} visée</span>
          <span className="ml-3 text-[#a8c49a]">· pioche : {view.deckCount}</span>
        </span>
      </div>
      <div className="ch-gauge">
        {Array.from({ length: max - 1 }, (_, i) => (
          <span key={i} className="tick" style={{ left: pct(i + 1) }} />
        ))}
        <span className={`fill ${brewOf(view)}`} style={{ width: pct(total) }} />
        <span className="mark" style={{ left: pct(view.target) }} title={`Force visée : ${view.target}`} />
      </div>
      {view.realTotal === null && <p className="mt-1.5 text-[13px] italic text-[#a8c49a]">Ce sont les valeurs annoncées : certaines sont peut-être des mensonges.</p>}
    </section>
  );
}

// ───────── Consigne ─────────

function instructionFor(view: CauldronView, actingAs: PlayerId | null, privateView: boolean, mode: Props['mode'], nameOf: NameOf): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const active = nameOf(view.active);
  const self = view.players.find((p) => p.id === actingAs);
  const alive = !!self && !self.expelled;
  switch (view.phase) {
    case 'reveal': {
      const ready = `${view.players.filter((p) => p.acked).length}/${view.players.length} prêts`;
      return privateView && alive && !self!.acked
        ? { icon: 'spell-book', mine: true, text: you(`découvre ton rôle : Alchimiste ou Empoisonneur ? (${ready})`) }
        : { icon: 'spell-book', mine: false, text: `Chacun découvre son rôle en secret… ${ready}.` };
    }
    case 'turn':
      return alive && actingAs === view.active
        ? { icon: 'cauldron', mine: true, text: you('à toi : verse un ingrédient (en annonçant sa valeur, vraie ou fausse), joue une action, ou propose de servir.') }
        : { icon: 'cauldron', mine: false, text: `${active} verse un ingrédient, joue une action ou propose de servir la potion.` };
    case 'tasted':
      return { icon: 'round-bottom-flask', mine: actingAs === view.active && privateView, text: `${active} goûte le chaudron en secret…` };
    case 'vote': {
      const proposer = nameOf(view.vote?.proposer ?? null);
      if (view.config.votes === 'hands')
        return {
          icon: 'vote',
          mine: actingAs === view.vote?.proposer,
          text: `${proposer} propose de servir la potion : votez à main levée, ${proposer} reporte le résultat.`,
        };
      const voted = `${view.players.filter((p) => p.voted).length}/${view.players.filter((p) => !p.expelled).length} bulletins`;
      return privateView && alive && !self!.voted
        ? { icon: 'vote', mine: true, text: you(`${proposer} propose de servir la potion. La crois-tu assez forte (${view.target}) ? (${voted})`) }
        : { icon: 'vote', mine: false, text: `${proposer} propose de servir la potion : ${voted}.` };
    }
    default:
      return {
        icon: 'cauldron',
        mine: false,
        text: `Chaudron révélé : force réelle ${signed(view.realTotal ?? 0)} (annoncé ${signed(view.announcedTotal)}) pour ${view.target} visée. Les mensonges sont surlignés.`,
      };
  }
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`ch-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="gold" size={26} />
      </span>
      <p>{text}</p>
    </div>
  );
}

// ───────── L'antre : la guilde autour du chaudron ─────────

function Lair({ view, viewer, wide, nameOf, splash }: { view: CauldronView; viewer: PlayerId | null; wide: boolean; nameOf: NameOf; splash: number }) {
  return (
    <section className="relative pb-16 lg:pb-10" aria-label="La guilde">
      <h3 className="sr-only">La guilde</h3>
      <RoundTable
        ids={view.players.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 128, h: 176 } : { w: 84, h: 140 }}
        className={wide ? 'aspect-[1.32] max-h-[calc(100dvh-140px)] min-h-[480px]' : 'aspect-[0.86]'}
        under={<Table3D scene={{ kind: 'lair', brew: brewOf(view) }} inset={{ x: 0.04, y: 0.07 }} fallback={<RitualFloor brew={brewOf(view)} />} />}
        center={<Pot view={view} nameOf={nameOf} splash={splash} wide={wide} />}
        renderSeat={(id) => {
          const p = view.players.find((x) => x.id === id)!;
          return <Seat p={p} seat={view.players.indexOf(p)} view={view} viewer={viewer} wide={wide} />;
        }}
      />
    </section>
  );
}

/** Portrait de l'alchimiste (chapeau pointu qui dépasse du médaillon), son emblème en pendentif. */
function Medal({ id, name, seat, size }: { id: PlayerId; name: string; seat: number; size: number }) {
  const c = TINT[seat % TINT.length]!;
  return (
    <span className="ch-medal" style={{ width: size, height: size, background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${c} 55%, white), ${c} 55%, color-mix(in srgb, ${c} 50%, black))` }}>
      <Avatar id={id} name={name} look="alchemist" size={size} round zoom={1.3} />
      {size >= 50 && (
        <span className="ch-emblem" style={{ width: size * 0.36, height: size * 0.36 }}>
          <RichIcon name={EMBLEM[seat % EMBLEM.length]!} metal="brass" size={size * 0.24} />
        </span>
      )}
    </span>
  );
}

function seatChip(view: CauldronView, p: CauldronPlayerView): { text: string; tone: string } | null {
  if (p.expelled) return { text: 'chassé', tone: 'red' };
  if (view.phase === 'reveal') return p.acked ? { text: 'prêt', tone: 'green' } : { text: 'lit son rôle…', tone: 'dim' };
  if (view.phase === 'vote' && view.config.votes === 'secret') return p.voted ? { text: 'a voté', tone: 'green' } : { text: 'réfléchit…', tone: 'dim' };
  if (view.vote?.proposer === p.id) return { text: 'propose de servir', tone: 'gold' };
  if (p.id === view.active && view.phase !== 'over') return { text: view.phase === 'tasted' ? 'goûte…' : 'à son tour', tone: 'gold' };
  return null;
}

function Seat({ p, seat, view, viewer, wide }: { p: CauldronPlayerView; seat: number; view: CauldronView; viewer: PlayerId | null; wide: boolean }) {
  const chip = seatChip(view, p);
  const size = wide ? 70 : 54;
  const ballot = view.phase !== 'vote' && view.lastVote && Object.hasOwn(view.lastVote.votes, p.id) ? view.lastVote.votes[p.id] : null;
  return (
    <div className={`ch-seat ${p.id === view.active && view.phase !== 'over' && !p.expelled ? 'is-active' : ''} ${p.id === viewer ? 'is-me' : ''} ${p.expelled ? 'is-out' : ''}`} style={{ width: wide ? 128 : 84 }}>
      {chip && <span className={`ch-chip tone-${chip.tone}`}>{chip.text}</span>}
      <Medal id={p.id} name={p.name} seat={seat} size={size} />
      <span className="ch-plate">
        <span className="ch-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="ch-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      {!p.expelled && (
        <span className="flex items-center gap-[3px]" aria-label={`${p.suspicion} jeton(s) de soupçon sur ${EXPEL_AT}`} title="Soupçons : au 3e, le joueur est chassé">
          {Array.from({ length: EXPEL_AT }, (_, i) => (
            <span key={i} className={`ch-skull ${i < p.suspicion ? 'on' : ''}`}>
              <RichIcon name="evil-eyes" metal={i < p.suspicion ? 'bone' : 'iron'} size={12} />
            </span>
          ))}
        </span>
      )}
      <span className="flex min-h-[17px] flex-wrap items-center justify-center gap-1">
        {p.role && <span className={`ch-role ${p.role}`}>{ROLE_LABEL[p.role]}</span>}
        {ballot !== null && ballot !== undefined && <span className={`ch-vote ${ballot ? 'yes' : 'no'}`}>{ballot ? 'oui' : 'non'}</span>}
      </span>
    </div>
  );
}

type BrewTone = 'poison' | 'brew' | 'ready';

/** Teinte de la potion : violette si elle tourne au poison, verte en cours, dorée quand la force visée est atteinte. */
function brewOf(view: CauldronView): BrewTone {
  const total = view.realTotal ?? view.announcedTotal;
  return total < 0 ? 'poison' : total >= view.target ? 'ready' : 'brew';
}

const LIQUID: Record<BrewTone, [string, string, string, string]> = {
  poison: ['#f0d2ff', '#a85cf0', '#4a1d80', 'rgba(180,110,255,.6)'],
  brew: ['#e6ffc8', '#5fe076', '#145a28', 'rgba(110,255,140,.55)'],
  ready: ['#fffbd0', '#d7f25a', '#5a8a12', 'rgba(230,255,120,.6)'],
};

function Pot({ view, nameOf, splash, wide }: { view: CauldronView; nameOf: NameOf; splash: number; wide: boolean }) {
  const last = view.pours.at(-1);
  const brew = brewOf(view);
  const gl = useWebGL();
  return (
    <div className="flex flex-col items-center text-center" style={{ '--brew': LIQUID[brew][3] } as CSSProperties}>
      {gl === false ? (
        <span key={splash} className={`ch-pot ${splash ? 'ch-splash' : ''}`}>
          <CauldronArt brew={brew} size={wide ? 164 : 124} />
        </span>
      ) : (
        <span aria-hidden="true" style={{ display: 'block', height: wide ? 176 : 112 }} />
      )}
      <span className="ch-title mt-1 text-[14px] text-[#e6ffd8] [text-shadow:0_2px_6px_rgba(0,0,0,.95)]">
        {view.pours.length} ingrédient{view.pours.length > 1 ? 's' : ''}
      </span>
      {last && view.phase !== 'over' && (
        <span className="mt-0.5 text-[13.5px] italic text-[#e7efd9] [text-shadow:0_2px_6px_rgba(0,0,0,.95)]">
          {nameOf(last.by)} a versé « {signed(last.announced)} »
        </span>
      )}
    </div>
  );
}

/** Le chaudron de fonte sur son feu de bois : la potion bouillonne et fume. */
function CauldronArt({ brew, size }: { brew: BrewTone; size: number }) {
  const [hi, mid, deep] = LIQUID[brew];
  return (
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} aria-hidden="true" className="ch-art">
      <defs>
        <radialGradient id="ch-iron" cx="34%" cy="26%" r="85%">
          <stop offset="0" stopColor="#6b736d" />
          <stop offset=".35" stopColor="#2c322e" />
          <stop offset="1" stopColor="#080a09" />
        </radialGradient>
        <linearGradient id="ch-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#151816" />
          <stop offset=".3" stopColor="#9aa39c" />
          <stop offset=".55" stopColor="#2e3330" />
          <stop offset="1" stopColor="#5d655f" />
        </linearGradient>
        <radialGradient id="ch-liq" cx="45%" cy="38%" r="62%">
          <stop offset="0" stopColor={hi} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <radialGradient id="ch-fireglow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffb347" stopOpacity=".75" />
          <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
        </radialGradient>
        <filter id="ch-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* Vapeur */}
      <g filter="url(#ch-soft)" fill={hi} opacity=".55">
        <ellipse className="ch-steam" cx="78" cy="52" rx="14" ry="20" />
        <ellipse className="ch-steam" cx="112" cy="46" rx="12" ry="18" style={{ animationDelay: '1.4s' }} />
        <ellipse className="ch-steam" cx="96" cy="58" rx="10" ry="16" style={{ animationDelay: '2.6s' }} />
      </g>
      {/* Lueur du feu */}
      <ellipse cx="100" cy="238" rx="96" ry="20" fill="url(#ch-fireglow)" />
      {/* Pieds */}
      <path d="M58,168 L44,226 L56,226 L70,174 Z" fill="#161917" />
      <path d="M142,168 L156,226 L144,226 L130,174 Z" fill="#121513" />
      {/* Bûches */}
      <g>
        <rect x="44" y="228" width="112" height="13" rx="6.5" fill="#4a2a14" transform="rotate(-8 100 234)" />
        <rect x="44" y="228" width="112" height="13" rx="6.5" fill="#62391a" transform="rotate(8 100 234)" />
        <circle cx="154" cy="242" r="5" fill="#d29455" opacity=".85" />
        <circle cx="46" cy="242" r="5" fill="#d29455" opacity=".85" />
      </g>
      {/* Flammes qui lèchent le fond */}
      <g>
        <path className="ch-flame" d="M58,234 C50,214 62,204 60,184 C76,196 84,214 78,234 Z" fill="#ff6a14" />
        <path className="ch-flame" d="M80,234 C70,206 86,192 88,166 C106,188 114,210 104,234 Z" fill="#ff8a22" style={{ animationDelay: '.25s' }} />
        <path className="ch-flame" d="M104,234 C98,208 114,196 118,172 C132,192 136,214 126,234 Z" fill="#ff8a22" style={{ animationDelay: '.5s' }} />
        <path className="ch-flame" d="M126,234 C122,216 132,206 140,188 C150,202 150,220 142,234 Z" fill="#ff6a14" style={{ animationDelay: '.35s' }} />
        <path className="ch-flame" d="M86,234 C82,214 94,204 96,188 C106,202 108,220 102,234 Z" fill="#ffd36a" style={{ animationDelay: '.15s' }} />
        <path className="ch-flame" d="M108,234 C106,220 114,212 118,200 C124,212 124,224 120,234 Z" fill="#ffe9a8" style={{ animationDelay: '.45s' }} />
      </g>
      {/* Anses */}
      <path d="M30,92 C12,92 12,124 32,122" fill="none" stroke="#3b423d" strokeWidth="6" strokeLinecap="round" />
      <path d="M170,92 C188,92 188,124 168,122" fill="none" stroke="#2a2f2c" strokeWidth="6" strokeLinecap="round" />
      {/* Panse */}
      <path d="M26,82 C18,140 52,186 100,186 C148,186 182,140 174,82 Z" fill="url(#ch-iron)" />
      <path d="M40,100 C38,130 52,156 76,170" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5" strokeLinecap="round" />
      <path d="M26,82 C24,96 26,104 30,112" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" />
      {/* Reflet de la potion sur la fonte */}
      <path d="M34,90 C60,104 140,104 166,90" fill="none" stroke={mid} strokeOpacity=".35" strokeWidth="4" />
      {/* Bord */}
      <ellipse cx="100" cy="82" rx="78" ry="21" fill="url(#ch-rim)" />
      <ellipse cx="100" cy="82" rx="69" ry="15" fill="#0b0d0c" />
      {/* Potion */}
      <ellipse cx="100" cy="84" rx="66" ry="13" fill="url(#ch-liq)" />
      <ellipse cx="86" cy="80" rx="26" ry="4" fill="#fff" opacity=".22" />
      <g fill={hi} stroke={deep} strokeWidth=".8">
        <circle className="ch-pop" cx="72" cy="86" r="5" />
        <circle className="ch-pop" cx="104" cy="82" r="6.5" style={{ animationDelay: '.8s' }} />
        <circle className="ch-pop" cx="130" cy="87" r="4" style={{ animationDelay: '1.5s' }} />
        <circle className="ch-pop" cx="90" cy="90" r="3.5" style={{ animationDelay: '2.1s' }} />
      </g>
    </svg>
  );
}

/** Le sol de l'antre : un cercle de transmutation gravé qui luit doucement et tourne. */
function RitualFloor({ brew }: { brew: BrewTone }) {
  const glyphs = ['fire', 'water', 'air', 'earth', 'sun', 'salt', 'moon', 'sulfur'] as const;
  return (
    <div className="ch-floor" style={{ '--brew-floor': LIQUID[brew][3].replace(/[\d.]+\)$/, '.32)'), color: brew === 'poison' ? '#d9a8ff' : brew === 'ready' ? '#efff9e' : '#9dffb2' } as CSSProperties}>
      <svg viewBox="0 0 200 200" preserveAspectRatio="none" className="ch-circle" aria-hidden="true">
        <defs>
          <filter id="ch-glow-line" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#ch-glow-line)" fill="none" stroke="currentColor" strokeLinecap="round">
          <circle cx="100" cy="100" r="97" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity=".55" />
          <circle cx="100" cy="100" r="92" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <circle cx="100" cy="100" r="74" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <g className="ch-spin">
            {Array.from({ length: 16 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 22.5} 100 100) translate(100 17)`}>
                <Glyph kind={glyphs[i % glyphs.length]!} />
              </g>
            ))}
          </g>
          <g className="ch-spin rev">
            <path d="M100,30 L160.6,135 L39.4,135 Z" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            <path d="M100,170 L39.4,65 L160.6,65 Z" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <circle key={a} cx="100" cy="30" r="3" transform={`rotate(${a} 100 100)`} fill="currentColor" strokeWidth="0" />
            ))}
          </g>
          <circle cx="100" cy="100" r="44" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity=".7" />
        </g>
      </svg>
    </div>
  );
}

function Glyph({ kind }: { kind: 'fire' | 'water' | 'air' | 'earth' | 'sun' | 'salt' | 'moon' | 'sulfur' }) {
  const w = { strokeWidth: 1.3, vectorEffect: 'non-scaling-stroke' as const };
  switch (kind) {
    case 'fire':
      return <path d="M0,-5 L4.5,3.5 L-4.5,3.5 Z" {...w} />;
    case 'water':
      return <path d="M0,5 L4.5,-3.5 L-4.5,-3.5 Z" {...w} />;
    case 'air':
      return <path d="M0,-5 L4.5,3.5 L-4.5,3.5 Z M-5,0 L5,0" {...w} />;
    case 'earth':
      return <path d="M0,5 L4.5,-3.5 L-4.5,-3.5 Z M-5,0 L5,0" {...w} />;
    case 'sun':
      return (
        <>
          <circle r="4.2" {...w} />
          <circle r="1" fill="currentColor" strokeWidth="0" />
        </>
      );
    case 'salt':
      return <path d="M-4.2,0 A4.2,4.2 0 1 0 4.2,0 A4.2,4.2 0 1 0 -4.2,0 M-4.2,0 L4.2,0" {...w} />;
    case 'moon':
      return <path d="M2,-4.5 A5,5 0 1 0 2,4.5 A3.6,3.6 0 1 1 2,-4.5 Z" {...w} />;
    case 'sulfur':
      return <path d="M0,-5 L3.5,0 L-3.5,0 Z M0,0 L0,5 M-2.5,3 L2.5,3" {...w} />;
  }
}

// ───────── Rôle secret ─────────

function Identity({ me, view, nameOf }: { me: NonNullable<CauldronView['me']>; view: CauldronView; nameOf: NameOf }) {
  const poisoner = me.role === 'poisoner';
  return (
    <section className="ch-page">
      <div className="ch-title text-center text-[12px] uppercase tracking-[0.22em] text-[#7a3a14]">Ton rôle secret :</div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <RichIcon name={poisoner ? 'poison-bottle' : 'spell-book'} metal={poisoner ? 'ruby' : 'gold'} size={46} />
        <span className="ch-title text-[1.7rem]" style={{ color: poisoner ? '#5b1a6b' : '#1d6b33' }}>
          {ROLE_LABEL[me.role]}
        </span>
      </div>
      <p className="mt-1 text-center text-[1.02rem] leading-snug">
        {poisoner
          ? `Fais rater la potion (force visée : ${view.target}) : verse de la Ciguë en mentant, écume les bons ingrédients, sème le doute.`
          : `Fais atteindre ${view.target} au chaudron, démasque les menteurs en goûtant, et ne sers la potion que si tu y crois.`}
      </p>
      {poisoner && (
        <p className="mt-2 text-center">
          {me.allies.length ? (
            <>
              Tes complices : <strong>{me.allies.map(nameOf).join(', ')}</strong>.
            </>
          ) : (
            'Tu es le seul Empoisonneur.'
          )}
        </p>
      )}
    </section>
  );
}

// ───────── Cartes ─────────

function CardFace({ card, w = 104 }: { card: Card; w?: number }) {
  if (card.kind === 'ingredient') {
    const d = ING[card.value];
    return (
      <span className="ch-card" style={{ '--w': `${w}px`, '--tint': d.color } as CSSProperties}>
        <RichIcon name={d.icon} metal={d.metal} size={w * 0.48} />
        <span className="v" style={{ color: d.color }}>
          {signed(card.value)}
        </span>
        <span className="n">{INGREDIENT_LABEL[card.value]}</span>
      </span>
    );
  }
  const a = ACT[card.action];
  return (
    <span className="ch-card" style={{ '--w': `${w}px`, '--tint': '#3a6b8a' } as CSSProperties}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#7a3a14]">Action</span>
      <RichIcon name={a.icon} metal={a.metal} size={w * 0.44} />
      <span className="n">{ACTION_LABEL[card.action]}</span>
    </span>
  );
}

function Vial({ value }: { value: Ingredient }) {
  const d = ING[value];
  return (
    <span className="ch-vial" style={{ background: d.color, color: d.text }}>
      <RichIcon name={d.icon} metal={d.metal} size={16} />
      {signed(value)}
    </span>
  );
}

// ───────── Tour de jeu ─────────

function TurnPanel({
  view,
  hand,
  me,
  seatOf,
  title,
  sendMove,
}: {
  view: CauldronView;
  hand: Card[];
  me: PlayerId;
  seatOf: (id: PlayerId | null) => number;
  title: string;
  sendMove: (m: CauldronMove) => void;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [announce, setAnnounce] = useState<Ingredient | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  useEffect(() => {
    setIndex(null);
    setAnnounce(null);
    setTarget(null);
  }, [view.active, view.phase, view.pours.length]);

  const card = index === null ? null : (hand[index] ?? null);
  const members = view.players.filter((p) => !p.expelled);
  const targets =
    card?.kind === 'action' && card.action === 'suspect' ? members.filter((p) => p.id !== me) : card?.kind === 'action' && card.action === 'plead' ? members : [];
  const needsTarget = targets.length > 0;
  const empty = view.pours.length === 0;

  const pick = (i: number) => {
    sfx.click();
    setIndex(i);
    const c = hand[i];
    setAnnounce(c?.kind === 'ingredient' ? c.value : null);
    setTarget(null);
  };

  let label = 'Choisis une carte';
  if (card?.kind === 'ingredient' && announce !== null) label = `Verser en annonçant ${signed(announce)}`;
  if (card?.kind === 'action') label = needsTarget && !target ? 'Choisis un joueur' : `Jouer : ${ACTION_LABEL[card.action]}`;

  const play = () => {
    if (index === null || !card) return;
    if (card.kind === 'ingredient' && announce !== null) sendMove({ type: 'pour', index, announce });
    else if (card.kind === 'action') sendMove({ type: 'action', index, target: needsTarget ? (target ?? undefined) : undefined });
  };

  return (
    <section className="ch-dock">
      <h4 className="first-letter:uppercase">{title}</h4>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5" role="radiogroup" aria-label="Ta main">
        {hand.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={index === i}
            aria-label={c.kind === 'ingredient' ? `${INGREDIENT_LABEL[c.value]} (${signed(c.value)})` : ACTION_LABEL[c.action]}
            onClick={() => pick(i)}
          >
            <CardFace card={c} w={98} />
          </button>
        ))}
      </div>

      {card?.kind === 'ingredient' && (
        <div className="mt-3">
          <div className="muted text-center text-[15px] italic">Ce que tu annonces à la guilde :</div>
          <div className="mt-1 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Annonce">
            {INGREDIENTS.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={announce === v} onClick={() => setAnnounce(v)} className="ch-opt">
                <Vial value={v} />
                <span className="block truncate text-[12.5px]">{INGREDIENT_LABEL[v]}</span>
              </button>
            ))}
          </div>
          {announce !== null && announce !== card.value && <p className="mt-2 text-center text-[14px] font-semibold text-[#8e1b14]">Mensonge : un goûteur pourrait le découvrir.</p>}
        </div>
      )}

      {card?.kind === 'action' && (
        <div className="mt-3">
          <p className="muted text-center text-[15px]">
            {ACTION_HELP[card.action]}
            {(card.action === 'taste' || card.action === 'skim') && empty && ' (le chaudron est vide : sans effet)'}
          </p>
          {needsTarget && (
            <div className="mt-2 flex flex-wrap justify-center gap-1" role="radiogroup" aria-label="Joueur visé">
              {targets.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={target === p.id} onClick={() => setTarget(p.id)} className="ch-pick">
                  <Medal id={p.id} name={p.name} seat={seatOf(p.id)} size={44} />
                  <span className="ch-name !text-[#2a1d0e]">{p.id === me ? 'Moi' : p.name}</span>
                  <span className="text-[12px] text-[#5f4a2a]">
                    {p.suspicion}/{EXPEL_AT} soupçons
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <button type="button" className="ch-btn" disabled={!card || (card.kind === 'ingredient' ? announce === null : needsTarget && !target)} onClick={play}>
          {label}
        </button>
        <button type="button" className="ch-btn2" disabled={empty} onClick={() => sendMove({ type: 'propose' })}>
          Proposer de servir la potion
        </button>
      </div>
      <p className="muted mt-2 text-center text-[13.5px] italic">Servir déclenche un vote de la guilde. S’il échoue, tu reçois un jeton de soupçon.</p>
    </section>
  );
}

function TastedPanel({ taste, nameOf, onDone }: { taste: Taste; nameOf: NameOf; onDone: () => void }) {
  return (
    <section className="ch-dock">
      <h4>Tu goûtes le chaudron… (secret)</h4>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {taste.values.map((v, i) => (
          <CardFace key={i} card={{ kind: 'ingredient', value: v }} w={80} />
        ))}
      </div>
      <p className="mt-3 text-center">
        Annoncé : {taste.pours.map((p) => `${nameOf(p.by)} ${signed(p.announced)}`).join(' · ')} (total annoncé {signed(taste.pours.reduce((s, p) => s + p.announced, 0))}, réel{' '}
        <strong>{signed(taste.values.reduce<number>((s, v) => s + v, 0))}</strong>)
      </p>
      <p className="muted mt-1 text-center text-[14px] italic">Les valeurs sont mélangées : tu ne sais pas qui a versé quoi.</p>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ch-btn" onClick={onDone}>
          Compris
        </button>
      </div>
    </section>
  );
}

// ───────── Vote ─────────

function VotePanel({
  view,
  actingAs,
  privateView,
  nameOf,
  seatOf,
  sendMove,
}: {
  view: CauldronView;
  actingAs: PlayerId;
  privateView: boolean;
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: CauldronMove) => void;
}) {
  const proposer = view.vote?.proposer ?? null;
  if (view.config.votes === 'hands') {
    return actingAs === proposer ? <HandsVote view={view} seatOf={seatOf} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
  }
  if (!privateView) return null;
  const self = view.players.find((p) => p.id === actingAs)!;
  if (self.voted) {
    return (
      <section className="ch-dock">
        <h4>Bulletin déposé</h4>
        <p className="text-center">
          Tu as voté <strong>{view.me?.myVote ? 'oui' : 'non'}</strong>. On attend les autres…
        </p>
      </section>
    );
  }
  return (
    <section className="ch-dock">
      <h4>Servir la potion proposée par {nameOf(proposer)} ?</h4>
      <div className="mt-3 flex justify-center gap-3">
        <button type="button" className="ch-btn" onClick={() => sendMove({ type: 'vote', yes: true })}>
          Oui, on sert
        </button>
        <button type="button" className="ch-btn danger" onClick={() => sendMove({ type: 'vote', yes: false })}>
          Non
        </button>
      </div>
      <p className="muted mt-2 text-center text-[14px] italic">
        Majorité de oui : on révèle le chaudron et la partie s’arrête. Sinon {nameOf(proposer)} reçoit un jeton de soupçon.
      </p>
    </section>
  );
}

function HandsVote({ view, seatOf, onSubmit }: { view: CauldronView; seatOf: (id: PlayerId | null) => number; onSubmit: (yes: PlayerId[]) => void }) {
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.vote?.proposer]);
  const members = view.players.filter((p) => !p.expelled);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > members.length;
  return (
    <section className="ch-dock">
      <h4>Qui a levé la main pour servir la potion ?</h4>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {members.map((p) => (
          <button key={p.id} type="button" aria-pressed={yes.includes(p.id)} onClick={() => toggle(p.id)} className="ch-pick">
            <Medal id={p.id} name={p.name} seat={seatOf(p.id)} size={44} />
            <span className="ch-name !text-[#2a1d0e]">
              {p.name} {yes.includes(p.id) ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
      <p className="muted mt-2 text-center text-[15px]">
        {yes.length} oui sur {members.length} : la potion serait {passes ? 'servie' : 'refusée'}.
      </p>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ch-btn" onClick={() => onSubmit(yes)}>
          Valider le vote
        </button>
      </div>
    </section>
  );
}

// ───────── Le contenu du chaudron, dégustations, aide ─────────

function Brew({ view, nameOf }: { view: CauldronView; nameOf: NameOf }) {
  const over = view.phase === 'over';
  return (
    <section className="ch-page">
      <h4>Le chaudron</h4>
      {view.pours.length === 0 ? (
        <p className="muted mt-1 text-center italic">Le chaudron est vide.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1">
          {view.pours.map((p, i) => {
            const lie = p.value !== null && p.value !== p.announced;
            return (
              <li key={i} className={`flex items-center gap-2 rounded-md px-2 py-1 ${lie && over ? 'bg-[#8e1b14]/15 ring-1 ring-[#8e1b14]/50' : ''}`}>
                <span className="ch-num w-5 shrink-0 text-right text-[13px] text-[#7a6a4a]">{i + 1}</span>
                <span className="min-w-[4.5rem] flex-1 truncate">{nameOf(p.by)}</span>
                <span className="text-[13px] italic text-[#5f4a2a]">annonce</span>
                <Vial value={p.announced} />
                {p.value !== null && (
                  <span className={`shrink-0 text-[13px] font-semibold ${lie ? 'text-[#8e1b14]' : 'text-[#5f4a2a]'}`} title={over ? 'Valeur réelle' : 'Ce que tu as vraiment versé'}>
                    {lie ? `réel ${signed(p.value)}` : '✓'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!over && view.pours.length > 0 && <p className="muted mt-2 text-center text-[13.5px] italic">Tu ne vois la vraie valeur que de tes propres versements.</p>}
      {view.lastVote && (
        <p className="mt-2 text-center text-[14px]">
          Dernier vote ({nameOf(view.lastVote.proposer)}) : <strong>{view.lastVote.passed ? 'potion servie' : 'refusé'}</strong>
        </p>
      )}
    </section>
  );
}

function Tastes({ tastes, nameOf }: { tastes: Taste[]; nameOf: NameOf }) {
  return (
    <details className="rounded-xl border border-[rgba(170,255,170,.25)] bg-[rgba(6,10,6,.75)] px-4 py-3">
      <summary className="ch-title cursor-pointer select-none text-[14px] text-[#c9ffb8]">Tes dégustations secrètes ({tastes.length})</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {tastes.map((t, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1">
            {t.values.map((v, k) => (
              <Vial key={k} value={v} />
            ))}
            <span className="text-[14px] text-[#a8c49a]">— annoncé : {t.pours.map((p) => `${nameOf(p.by)} ${signed(p.announced)}`).join(', ')}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Reference({ view }: { view: CauldronView }) {
  return (
    <details className="rounded-xl border border-[rgba(170,255,170,.25)] bg-[rgba(6,10,6,.75)] px-4 py-3">
      <summary className="ch-title cursor-pointer select-none text-[14px] text-[#c9ffb8]">Le grimoire (aide-mémoire)</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {INGREDIENTS.map((v) => (
          <li key={v} className="flex items-center gap-2">
            <Vial value={v} /> <strong>{INGREDIENT_LABEL[v]}</strong>
          </li>
        ))}
        {(Object.keys(ACTION_LABEL) as ActionKind[]).map((a) => (
          <li key={a} className="flex items-start gap-2">
            <RichIcon name={ACT[a].icon} metal={ACT[a].metal} size={22} />
            <span>
              <strong>{ACTION_LABEL[a]}</strong> : <span className="text-[#a8c49a]">{ACTION_HELP[a]}</span>
            </span>
          </li>
        ))}
        <li className="text-[#a8c49a]">Force visée : {view.target}. La pioche épuisée fait gagner les Empoisonneurs.</li>
      </ul>
    </details>
  );
}

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-10).reverse();
  return (
    <details open={open} className="rounded-xl border border-[rgba(170,255,170,.25)] bg-[rgba(6,10,6,.75)] px-4 py-3">
      <summary className="ch-title cursor-pointer select-none text-[14px] text-[#c9ffb8]">Chuchotements de la guilde</summary>
      <ol className="mt-2 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#eef6dd]' : 'text-[#a8b89a]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}

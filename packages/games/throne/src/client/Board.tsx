'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  Avatar,
  Cinematic,
  Icon,
  RichIcon,
  RoundTable,
  Table3D,
  sfx,
  useAmbient,
  useMediaQuery,
  type GameIconName,
  type TableLink,
} from '@arcade/tabletop';
import {
  CROWN_TO_WIN,
  EDICT_LABEL,
  MAX_AGITATION,
  POWER_LABEL,
  ROLE_LABEL,
  SHADOW_TO_WIN,
  TEAM_LABEL,
  USURPER_DANGER,
  VETO_AT,
  type Edict,
  type Power,
  type ThroneMove,
  type ThronePlayerView,
  type ThroneView,
} from '../shared';
import { THRONE_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<ThroneView, ThroneMove>;
type NameOf = (id: PlayerId | null) => string;

/** Blason de chaque siège : émaux et meubles neutres (ni bleu royal, ni rouge de l'Ombre). */
const TINCTURE = ['#1d5a3a', '#5b2a73', '#2b2b2b', '#9a7418', '#5f6b74', '#7a3b12', '#155f66', '#4a5a1d', '#6b2a3a', '#3f3a66'];
const CHARGE: GameIconName[] = ['castle', 'rose', 'heraldic-sun', 'scales', 'torch', 'knight-banner', 'candle-holder', 'tied-scroll', 'chess-queen', 'tattered-banner'];

const POWER_ICON: Record<Power, GameIconName> = {
  investigate: 'magnifying-glass',
  peek: 'crystal-ball',
  special: 'chess-king',
  execute: 'executioner-hood',
};

export default function ThroneBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.players.findIndex((p) => p.id === id));
  const me = view.me && view.me.id === viewer ? view.me : null;
  const actor = view.players.find((p) => p.id === actingAs) ?? null;
  const privateView = viewer !== null && viewer === actingAs;
  const wide = useMediaQuery('(min-width: 1024px)');
  useAmbient('hearth');

  // Choix d'un joueur (proposition, pouvoir) : aussi possible en touchant son blason sur la table.
  const [pick, setPick] = useState<PlayerId | null>(null);
  useEffect(() => setPick(null), [view.phase, view.regent, view.history.length, actingAs]);
  const picking = pickingFor(view, actingAs, actor?.alive ?? false);

  const event = useCouncilEvents(view);
  const action = actor?.alive ? (
    <Actions view={view} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} actingAs={actingAs} privateView={privateView} pick={pick} setPick={setPick} />
  ) : null;

  return (
    <div className="tv">
      <style href="arcade-throne-v1" precedence="default">
        {THRONE_CSS}
      </style>
      <div className="tv-wall" />
      <div className="tv-light" />
      <div className="tv-motes" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 41 + 7) % 100}%`, animationDelay: `${(i * 1.7) % 12}s`, animationDuration: `${14 + (i % 4) * 3}s` }} />
        ))}
      </div>

      <Header view={view} wide={wide} />
      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <StepTrack view={view} />
        <Instruction {...instructionFor(view, actingAs, privateView, mode, nameOf)} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {action}
          {me && <Letter view={view} me={me} nameOf={nameOf} />}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <CouncilTable view={view} viewer={viewer} wide={wide} nameOf={nameOf} picking={picking} pick={pick} setPick={setPick} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <History view={view} nameOf={nameOf} />
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      <Cinematic trigger={event.key} onMount={mode !== 'hotseat'} duration={event.kind === 'edict' ? 2600 : 2000}>
        <EventBanner view={view} kind={event.kind} nameOf={nameOf} />
      </Cinematic>
    </div>
  );
}

// ───────── Événements du Conseil (annonces et sons) ─────────

type EventKind = 'phase' | 'vote' | 'edict' | 'execute';

function useCouncilEvents(view: ThroneView): { key: string; kind: EventKind } {
  const dead = view.players.filter((p) => !p.alive).length;
  const voteKey = view.lastVote ? `${view.history.length}-${view.agitation}-${view.lastVote.regent}-${view.lastVote.nominee}-${view.lastVote.passed}` : '';
  const prev = useRef({ hist: view.history.length, dead, voteKey, phase: view.phase });
  const event = useRef<{ key: string; kind: EventKind }>({ key: `phase-${view.phase}-${view.history.length}`, kind: 'phase' });
  const p = prev.current;
  if (view.history.length > p.hist) event.current = { key: `edict-${view.history.length}`, kind: 'edict' };
  else if (dead > p.dead) event.current = { key: `dead-${dead}`, kind: 'execute' };
  else if (voteKey && voteKey !== p.voteKey) event.current = { key: `vote-${voteKey}`, kind: 'vote' };
  else if (view.phase !== p.phase && ['nomination', 'vote', 'power'].includes(view.phase))
    event.current = { key: `phase-${view.phase}-${view.history.length}-${view.agitation}-${view.regent}`, kind: 'phase' };
  prev.current = { hist: view.history.length, dead, voteKey, phase: view.phase };

  // Sons, une seule fois par événement.
  const played = useRef(event.current.key);
  useEffect(() => {
    const e = event.current;
    if (played.current === e.key) return;
    played.current = e.key;
    if (e.kind === 'edict') {
      const last = view.history.at(-1);
      sfx.seal(0.1);
      if (last?.edict === 'crown') sfx.fanfare(0.5);
      else sfx.drum(0.4, 2);
    } else if (e.kind === 'execute') sfx.drum(0, 3);
    else if (e.kind === 'vote') {
      [0, 0.18, 0.36].forEach((d) => sfx.knock(d, 0.4));
      if (view.lastVote?.passed) sfx.chime(0.6);
    } else sfx.whoosh(0, 0.12);
  });
  return event.current;
}

function EventBanner({ view, kind, nameOf }: { view: ThroneView; kind: EventKind; nameOf: NameOf }) {
  if (kind === 'edict') {
    const last = view.history.at(-1);
    if (!last) return null;
    const crown = last.edict === 'crown';
    return (
      <div className="tv-scroll">
        <div className="tv-title text-[13px] uppercase tracking-[0.3em] text-[#7a2a14]">{last.regent ? 'Le Conseil promulgue' : 'Émeute ! Le peuple impose'}</div>
        <div className="tv-title mt-2 text-[1.9rem] leading-tight" style={{ color: crown ? '#1f3f86' : '#7a120c' }}>
          {EDICT_LABEL[last.edict]}
        </div>
        <div className="mt-4 flex justify-center">
          <Seal team={last.edict} size={78} />
        </div>
        <p className="mt-3 text-[1.05rem] italic text-[#4a3418]">
          {crown ? `${view.crown} sur ${CROWN_TO_WIN} pour la Couronne` : `${view.shadow} sur ${SHADOW_TO_WIN} pour l’Ombre`}
        </p>
      </div>
    );
  }
  if (kind === 'execute') {
    const victim = [...view.players].reverse().find((p) => !p.alive);
    return (
      <div className="tv-banner">
        <div className="mb-2 flex justify-center">
          <RichIcon name="executioner-hood" metal="iron" size={70} />
        </div>
        <div className="k">Sentence du Régent</div>
        <div className="tv-title tv-gold text-[2.4rem] sm:text-5xl">{victim?.name ?? '?'} est exécuté</div>
        <div className="s">Ses secrets partent avec lui… ou presque.</div>
      </div>
    );
  }
  if (kind === 'vote' && view.lastVote) {
    const votes = Object.values(view.lastVote.votes);
    const yes = votes.filter(Boolean).length;
    return (
      <div className="tv-banner">
        <div className="k">
          {nameOf(view.lastVote.regent)} et {nameOf(view.lastVote.nominee)}
        </div>
        <div className="tv-title tv-gold text-[2.4rem] sm:text-5xl">{view.lastVote.passed ? 'Gouvernement élu' : 'Gouvernement rejeté'}</div>
        <div className="s">
          {yes} pour · {votes.length - yes} contre
          {!view.lastVote.passed && view.agitation > 0 ? ` — le peuple gronde (${view.agitation}/${MAX_AGITATION})` : ''}
        </div>
      </div>
    );
  }
  const text: Partial<Record<ThroneView['phase'], [string, string]>> = {
    reveal: ['Le roi est mort', 'Chacun lit en secret sa lettre de cachet.'],
    nomination: ['Le Conseil se réunit', `${nameOf(view.regent)}, Régent, propose un Sénéchal.`],
    vote: ['Aux voix !', `Élire ${nameOf(view.regent)} et ${nameOf(view.nominee)} ?`],
    power: ['Pouvoir du Régent', view.pendingPower ? POWER_LABEL[view.pendingPower] : ''],
  };
  const t = text[view.phase];
  if (!t) return null;
  return (
    <div className="tv-banner">
      <div className="k">Le Trône Vide</div>
      <div className="tv-title tv-gold text-[2.4rem] sm:text-6xl">{t[0]}</div>
      <div className="s">{t[1]}</div>
    </div>
  );
}

// ───────── En-tête : le trône et les deux pistes ─────────

function Header({ view, wide }: { view: ThroneView; wide: boolean }) {
  const torches = (size: number) => (
    <span className="flex items-center gap-1" aria-label={`Colère du peuple : ${view.agitation} sur ${MAX_AGITATION}`} title="Colère du peuple : à 3 gouvernements rejetés d’affilée, l’émeute impose un édit.">
      {Array.from({ length: MAX_AGITATION }, (_, i) => (
        <span key={i} className={`tv-torch ${i < view.agitation ? 'lit' : ''}`} style={{ width: size + 4, height: size + 8 }}>
          <RichIcon name="torch" metal="copper" size={size} />
        </span>
      ))}
    </span>
  );
  return (
    <header className="relative px-3 pb-1 pt-[3.6rem] sm:pt-4">
      {wide ? (
        <div className="relative flex flex-col items-center">
          <HangingBanner team="crown" />
          <HangingBanner team="shadow" />
          <div className="tv-throne">
            <RichIcon name="stone-throne" metal="gold" size={74} />
          </div>
          <div className="tv-title tv-gold mt-1 text-[2rem] leading-none">Le Trône Vide</div>
          <div className="tv-anger mt-2 flex items-center gap-4 text-[14px] text-[#d9c08a]">
            <span className="italic">Colère du peuple</span>
            {torches(24)}
            <span className="text-[#bba77f]">
              Pile : {view.deckCount} · Défausse : {view.discardCount}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-1">
          <span className="tv-throne">
            <RichIcon name="stone-throne" metal="gold" size={44} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="tv-title tv-gold text-[1.4rem] leading-none">Le Trône Vide</div>
            <div className="mt-1 text-[13px] text-[#bba77f]">
              Pile : {view.deckCount} · Défausse : {view.discardCount}
            </div>
          </div>
          {torches(20)}
        </div>
      )}
      <div className="mx-auto mt-3 grid w-[min(1240px,100%)] gap-3 lg:grid-cols-2 lg:gap-5">
        <Track team="crown" view={view} />
        <Track team="shadow" view={view} />
      </div>
    </header>
  );
}

/** Bannière de velours suspendue à une tringle dorée, aux armes de son camp. */
function HangingBanner({ team }: { team: Edict }) {
  const crown = team === 'crown';
  const id = `tvb-${team}`;
  return (
    <div className={`tv-pennant ${crown ? 'is-left' : 'is-right'}`} aria-hidden="true">
      <svg viewBox="0 0 100 200" width="100%" height="100%">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={crown ? '#0f2462' : '#3e0604'} />
            <stop offset=".22" stopColor={crown ? '#2a56b8' : '#a3201a'} />
            <stop offset=".5" stopColor={crown ? '#173a8c' : '#6e0f0a'} />
            <stop offset=".78" stopColor={crown ? '#2f62c8' : '#b52a20'} />
            <stop offset="1" stopColor={crown ? '#0f2462' : '#3e0604'} />
          </linearGradient>
          <linearGradient id="tvb-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2bf" />
            <stop offset=".45" stopColor="#d8a948" />
            <stop offset="1" stopColor="#7a5414" />
          </linearGradient>
        </defs>
        <path d="M12,10 H88 V182 L50,160 L12,182 Z" fill={`url(#${id})`} />
        <path d="M18,16 H82 V172 L50,152 L18,172 Z" fill="none" stroke="url(#tvb-gold)" strokeWidth="2" />
        <path d="M22,20 H78" stroke="url(#tvb-gold)" strokeWidth="1" opacity=".7" />
        <path d="M12,182 L50,160 L88,182" fill="none" stroke="#d8a948" strokeWidth="1.5" opacity=".6" />
        <rect x="4" y="5" width="92" height="7" rx="3.5" fill="url(#tvb-gold)" />
        <circle cx="5" cy="8.5" r="5" fill="url(#tvb-gold)" />
        <circle cx="95" cy="8.5" r="5" fill="url(#tvb-gold)" />
      </svg>
      <span className="emb">
        <RichIcon name={crown ? 'fleur-de-lys' : 'all-seeing-eye'} metal="gold" size={46} />
      </span>
    </div>
  );
}

function Seal({ team, size = 34, usurper = false }: { team: Edict; size?: number; usurper?: boolean }) {
  return (
    <span className={`tv-seal ${usurper ? 'usurper' : team}`} style={{ width: size, height: size }}>
      <RichIcon name={usurper ? 'crowned-skull' : team === 'crown' ? 'fleur-de-lys' : 'all-seeing-eye'} metal={team === 'crown' ? 'gold' : 'bone'} size={size * 0.62} />
    </span>
  );
}

function Track({ team, view }: { team: Edict; view: ThroneView }) {
  const crown = team === 'crown';
  const total = crown ? CROWN_TO_WIN : SHADOW_TO_WIN;
  const count = crown ? view.crown : view.shadow;
  return (
    <section className={`tv-track ${team}`} aria-label={crown ? 'Édits royaux' : 'Édits de l’Ombre'}>
      <div className="tv-track-head">
        <span className="flex items-center gap-2">
          <RichIcon name={crown ? 'crown' : 'all-seeing-eye'} metal={crown ? 'gold' : 'bone'} size={22} />
          <span className="tv-title text-[13px] uppercase tracking-[0.18em]">{crown ? 'La Couronne' : 'L’Ombre'}</span>
        </span>
        <span className="tv-num text-sm">
          {count} / {total}
        </span>
      </div>
      <div className="tv-slots" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => {
          const filled = i < count;
          const power = crown ? null : view.track[i];
          const last = i === total - 1;
          return (
            <div
              key={i}
              className={`tv-slot ${filled ? 'filled' : ''} ${last ? 'goal' : ''}`}
              title={filled ? EDICT_LABEL[team] : last ? 'Victoire' : power ? POWER_LABEL[power] : undefined}
            >
              {filled ? (
                <Seal team={team} size={28} />
              ) : last ? (
                <>
                  <RichIcon name={crown ? 'laurel-crown' : 'crowned-skull'} metal={crown ? 'gold' : 'bone'} size={22} />
                  Victoire
                </>
              ) : power ? (
                <>
                  <RichIcon name={POWER_ICON[power]} metal="bone" size={20} />
                  {POWER_LABEL[power]}
                </>
              ) : null}
              {!crown && i + 1 === USURPER_DANGER && <span className="mark" title="Dès ce 3e édit, élire l’Usurpateur Sénéchal le couronne">danger</span>}
              {!crown && i + 1 === VETO_AT && <span className="mark" title="Le Sénéchal peut proposer un veto">veto</span>}
            </div>
          );
        })}
      </div>
      {!crown && view.shadow >= USURPER_DANGER && view.phase !== 'over' && (
        <p className="mt-2 text-center text-[13px] italic text-[#ffd0c4]">Élire l’Usurpateur Sénéchal lui donne le trône !</p>
      )}
    </section>
  );
}

// ───────── Étapes du tour et consigne ─────────

const STEPS: { label: string; icon: GameIconName }[] = [
  { label: 'Proposition', icon: 'banging-gavel' },
  { label: 'Vote', icon: 'vote' },
  { label: 'Régent', icon: 'tied-scroll' },
  { label: 'Sénéchal', icon: 'quill-ink' },
  { label: 'Pouvoir', icon: 'crystal-ball' },
];

function StepTrack({ view }: { view: ThroneView }) {
  if (view.phase === 'reveal') return null;
  const now = { reveal: -1, nomination: 0, vote: 1, regent: 2, seneschal: 3, veto: 3, power: 4, powerResult: 4, over: 5 }[view.phase];
  return (
    <ol className="tv-steps" aria-label="Étapes du tour">
      {STEPS.map((step, i) => (
        <li key={step.label} className={i < now ? 'done' : i === now ? 'now' : ''} aria-current={i === now ? 'step' : undefined}>
          <span className="n">
            <Icon name={step.icon} size={14} />
          </span>
          <span className="t">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function instructionFor(
  view: ThroneView,
  actingAs: PlayerId | null,
  privateView: boolean,
  mode: Props['mode'],
  nameOf: NameOf,
): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const regent = nameOf(view.regent);
  const nominee = nameOf(view.nominee);
  const mine = (id: PlayerId | null) => actingAs !== null && actingAs === id && !!view.players.find((p) => p.id === actingAs)?.alive;
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const alive = view.players.filter((p) => p.alive).length;
  switch (view.phase) {
    case 'reveal': {
      const ready = `${view.players.filter((p) => p.acked).length}/${view.players.length} prêts`;
      return privateView && !view.players.find((p) => p.id === actingAs)?.acked
        ? { icon: 'wax-seal', mine: true, text: you(`lis ta lettre de cachet : ton rôle et ton camp sont secrets. (${ready})`) }
        : { icon: 'wax-seal', mine: false, text: `Chacun lit sa lettre de cachet en secret… ${ready}.` };
    }
    case 'nomination':
      return mine(view.regent)
        ? { icon: 'banging-gavel', mine: true, text: you('tu es Régent : propose un Sénéchal (touche son blason sur la table).') }
        : { icon: 'banging-gavel', mine: false, text: `${regent}, Régent, choisit un Sénéchal. Discutez : qui mérite votre confiance ?` };
    case 'vote':
      if (view.config.votes === 'hands') {
        return mine(view.regent)
          ? { icon: 'vote', mine: true, text: you(`faites voter à main levée pour ${regent} et ${nominee}, puis coche les « oui ».`) }
          : { icon: 'vote', mine: false, text: `À main levée : élire ${regent} (Régent) et ${nominee} (Sénéchal) ?` };
      }
      return privateView && view.me?.myVote === null && mine(actingAs)
        ? { icon: 'vote', mine: true, text: you(`vote : élire ${regent} (Régent) et ${nominee} (Sénéchal) ? Il faut une majorité de oui.`) }
        : {
            icon: 'vote',
            mine: false,
            text: `Vote pour ${regent} et ${nominee} : ${view.players.filter((p) => p.voted).length}/${alive} bulletins.`,
          };
    case 'regent':
      return mine(view.regent) && privateView
        ? { icon: 'tied-scroll', mine: true, text: you('tu as 3 édits : défausses-en un en secret, les 2 autres vont au Sénéchal.') }
        : { icon: 'tied-scroll', mine: false, text: `${regent} examine 3 édits et en défausse un en secret.` };
    case 'seneschal':
      return mine(view.nominee) && privateView
        ? { icon: 'quill-ink', mine: true, text: you('le Régent t’a transmis 2 édits : promulgues-en un.') }
        : { icon: 'quill-ink', mine: false, text: `${nominee} choisit l’édit à promulguer.` };
    case 'veto':
      return mine(view.regent)
        ? { icon: 'cancel', mine: true, text: you(`${nominee} propose un veto : acceptes-tu de jeter les deux édits ?`) }
        : { icon: 'cancel', mine: false, text: `${nominee} propose un veto : ${regent} décide.` };
    case 'power':
      return mine(view.regent)
        ? { icon: POWER_ICON[view.pendingPower ?? 'peek'], mine: true, text: you(`l’édit de l’Ombre te donne un pouvoir : ${view.pendingPower ? POWER_LABEL[view.pendingPower] : ''}.`) }
        : { icon: POWER_ICON[view.pendingPower ?? 'peek'], mine: false, text: `${regent} utilise son pouvoir : ${view.pendingPower ? POWER_LABEL[view.pendingPower] : ''}.` };
    case 'powerResult':
      return { icon: 'magnifying-glass', mine: mine(view.regent), text: `${regent} prend connaissance du résultat de son enquête.` };
    default:
      return { icon: 'stone-throne', mine: false, text: 'Partie terminée : toutes les lettres de cachet sont ouvertes.' };
  }
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`tv-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="gold" size={26} />
      </span>
      <p>{text}</p>
    </div>
  );
}

// ───────── La table du Conseil ─────────

function pickingFor(view: ThroneView, actingAs: PlayerId | null, alive: boolean): { ids: PlayerId[] } | null {
  if (!alive || actingAs !== view.regent) return null;
  if (view.phase === 'nomination') return { ids: view.players.filter((p) => p.eligible).map((p) => p.id) };
  if (view.phase === 'power' && view.pendingPower && view.pendingPower !== 'peek') {
    const others = view.players.filter((p) => p.alive && p.id !== actingAs);
    return { ids: (view.pendingPower === 'investigate' ? others.filter((p) => !p.investigated) : others).map((p) => p.id) };
  }
  return null;
}

function CouncilTable({
  view,
  viewer,
  wide,
  nameOf,
  picking,
  pick,
  setPick,
}: {
  view: ThroneView;
  viewer: PlayerId | null;
  wide: boolean;
  nameOf: NameOf;
  picking: { ids: PlayerId[] } | null;
  pick: PlayerId | null;
  setPick: (id: PlayerId) => void;
}) {
  const links: TableLink[] = [];
  const target = ['vote', 'regent', 'seneschal', 'veto'].includes(view.phase) ? view.nominee : view.phase === 'nomination' ? pick : null;
  if (target && target !== view.regent) links.push({ id: 'gov', from: view.regent, to: target, color: '#f0cd6e', width: 3.5, flow: true, glow: true });
  if (view.phase === 'power' && pick) links.push({ id: 'power', from: view.regent, to: pick, color: view.pendingPower === 'execute' ? '#ff5a4a' : '#a9c4ff', width: 3.5, flow: true, glow: true });

  return (
    <section className="relative pb-12 lg:pb-8" aria-label="Le Conseil">
      <h3 className="sr-only">Le Conseil</h3>
      <RoundTable
        ids={view.players.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 128, h: 182 } : { w: 84, h: 138 }}
        className={wide ? 'aspect-[1.3] max-h-[calc(100dvh-120px)] min-h-[500px]' : 'aspect-[0.84]'}
        links={links}
        under={
          <Table3D
            scene={COUNCIL}
            fallback={
              <div className="tv-table-under">
                <TableCloth />
              </div>
            }
          />
        }
        center={<CouncilHeart view={view} nameOf={nameOf} />}
        renderSeat={(id) => {
          const p = view.players.find((x) => x.id === id)!;
          return (
            <Seat
              p={p}
              seat={view.players.indexOf(p)}
              view={view}
              viewer={viewer}
              wide={wide}
              picked={pick === id}
              onPick={picking?.ids.includes(id) ? () => setPick(id) : undefined}
            />
          );
        }}
      />
    </section>
  );
}

const COUNCIL = { kind: 'council' } as const;

/** Tapis brodé au centre de la table : fleurs de lys de la Couronne et yeux de l'Ombre, en alternance. */
function TableCloth() {
  return (
    <div className="tv-cloth" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const crown = i % 2 === 0;
        return (
          <span key={i} className="motif" style={{ left: `${50 + 41 * Math.cos(a)}%`, top: `${50 + 41 * Math.sin(a)}%` }}>
            <RichIcon name={crown ? 'fleur-de-lys' : 'all-seeing-eye'} metal="gold" size={18} />
          </span>
        );
      })}
    </div>
  );
}

/** Portrait peint du conseiller dans un cadre doré en arche, son blason accroché en bas. */
function Crest({ id, name, seat, size, dead = false }: { id: PlayerId; name: string; seat: number; size: number; dead?: boolean }) {
  const c = TINCTURE[seat % TINCTURE.length]!;
  const w = Math.round(size * 1.12);
  const h = Math.round(size * 1.36);
  return (
    <span className="tv-crest-wrap" style={{ paddingBottom: size * 0.2 }}>
      <span className="tv-frame" style={{ width: w, height: h }}>
        <span
          className="tv-canvas"
          style={{ background: `radial-gradient(90% 70% at 50% 28%, color-mix(in srgb, ${c} 50%, #f4dfb0), ${c} 58%, color-mix(in srgb, ${c} 40%, black))` }}
        >
          <Avatar id={id} name={name} look="council" size={Math.round(w * 1.04)} className="tv-sitter" />
        </span>
      </span>
      <span
        className="tv-blazon"
        style={{
          width: size * 0.44,
          height: size * 0.5,
          background: `radial-gradient(120% 90% at 35% 20%, color-mix(in srgb, ${c} 45%, white), ${c} 50%, color-mix(in srgb, ${c} 55%, black))`,
        }}
      >
        <span style={{ marginTop: -size * 0.06 }}>
          <RichIcon name={dead ? 'tombstone' : CHARGE[seat % CHARGE.length]!} metal={dead ? 'iron' : 'gold'} size={size * 0.28} />
        </span>
      </span>
    </span>
  );
}

function seatChip(view: ThroneView, p: ThronePlayerView): { text: string; tone: string } | null {
  if (!p.alive) return { text: 'exécuté', tone: 'dim' };
  if (view.phase === 'reveal') return p.acked ? { text: 'prêt', tone: 'green' } : { text: 'lit sa lettre…', tone: 'dim' };
  if (view.phase === 'vote' && view.config.votes === 'secret') return p.voted ? { text: 'a voté', tone: 'green' } : { text: 'réfléchit…', tone: 'dim' };
  if (view.phase === 'nomination' && p.termLimited) return { text: 'inéligible', tone: 'dim' };
  if (p.id === view.regent && view.phase !== 'over') return { text: 'Régent', tone: 'gold' };
  if (p.id === view.nominee && view.phase !== 'over' && view.phase !== 'nomination') return { text: 'Sénéchal', tone: 'gold' };
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
  p: ThronePlayerView;
  seat: number;
  view: ThroneView;
  viewer: PlayerId | null;
  wide: boolean;
  picked: boolean;
  onPick?: () => void;
}) {
  const over = view.phase === 'over';
  const regent = p.id === view.regent && !over;
  const nominee = p.id === view.nominee && !over && view.phase !== 'nomination';
  const size = wide ? 70 : 52;
  const chip = seatChip(view, p);
  const ballot = view.phase !== 'vote' && view.lastVote && Object.hasOwn(view.lastVote.votes, p.id) ? view.lastVote.votes[p.id] : null;
  const cls = `tv-seat ${regent ? 'is-regent' : ''} ${nominee ? 'is-nominee' : ''} ${picked ? 'is-picked' : ''} ${p.id === viewer ? 'is-me' : ''} ${p.alive ? '' : 'is-dead'}`;
  const body = (
    <>
      {chip && <span className={`tv-chip tone-${chip.tone}`}>{chip.text}</span>}
      <span className="relative">
        <Crest id={p.id} name={p.name} seat={seat} size={size} dead={!p.alive} />
        {regent && (
          <span className="tv-token -right-3 -top-1" style={{ width: size * 0.5, height: size * 0.5, background: '#1d1206' }} title="Régent">
            <RichIcon name="banging-gavel" metal="gold" size={size * 0.34} />
          </span>
        )}
        {nominee && (
          <span className="tv-token -left-3 -top-1" style={{ width: size * 0.5, height: size * 0.5, background: '#14213f' }} title="Sénéchal">
            <RichIcon name="quill-ink" metal="silver" size={size * 0.34} />
          </span>
        )}
        {p.investigated && (
          <span className="tv-token -bottom-1 -left-2" style={{ width: size * 0.4, height: size * 0.4, background: '#24170c' }} title="A fait l’objet d’une enquête">
            <RichIcon name="magnifying-glass" metal="brass" size={size * 0.26} />
          </span>
        )}
      </span>
      <span className="tv-seat-plate">
        <span className="tv-seat-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="tv-seat-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      <span className="flex min-h-[18px] flex-wrap items-center justify-center gap-1">
        {p.role && <span className={`tv-role ${p.role === 'loyal' ? 'crown' : 'shadow'}`}>{ROLE_LABEL[p.role]}</span>}
        {ballot !== null && ballot !== undefined && <span className={`tv-ballot-chip ${ballot ? 'yes' : 'no'}`}>{ballot ? 'Pour' : 'Contre'}</span>}
      </span>
    </>
  );
  if (onPick) {
    return (
      <button
        type="button"
        className={cls}
        style={{ width: wide ? 128 : 84 }}
        aria-label={`Choisir ${p.name}`}
        onClick={() => {
          sfx.click();
          onPick();
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={{ width: wide ? 128 : 84 }}>
      {body}
    </div>
  );
}

/** Centre de la table : ce qui se joue en ce moment. */
function CouncilHeart({ view, nameOf }: { view: ThroneView; nameOf: NameOf }) {
  const alive = view.players.filter((p) => p.alive).length;
  let icon: ReactNode = <RichIcon name="stone-throne" metal="gold" size={60} />;
  let title = '';
  let line = '';
  switch (view.phase) {
    case 'reveal':
      icon = <RichIcon name="wax-seal" metal="ruby" size={56} />;
      title = 'Lettres de cachet';
      line = `${view.players.filter((p) => p.acked).length}/${view.players.length} lues`;
      break;
    case 'nomination':
      icon = <RichIcon name="banging-gavel" metal="gold" size={56} />;
      title = `Régent : ${nameOf(view.regent)}`;
      line = 'propose un Sénéchal';
      break;
    case 'vote':
      icon = <RichIcon name="vote" metal="gold" size={56} />;
      title = `${nameOf(view.regent)} + ${nameOf(view.nominee)}`;
      line = view.config.votes === 'secret' ? `${view.players.filter((p) => p.voted).length}/${alive} bulletins` : 'vote à main levée';
      break;
    case 'regent':
    case 'seneschal':
    case 'veto': {
      const n = view.phase === 'regent' ? 3 : 2;
      icon = (
        <span className="flex gap-1.5">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="tv-facedown" style={{ transform: `rotate(${(i - (n - 1) / 2) * 7}deg)` }} />
          ))}
        </span>
      );
      title = view.phase === 'regent' ? `${nameOf(view.regent)} trie 3 édits` : view.phase === 'veto' ? 'Veto proposé' : `${nameOf(view.nominee)} choisit`;
      line = 'en secret';
      break;
    }
    case 'power':
    case 'powerResult':
      icon = <RichIcon name={POWER_ICON[view.pendingPower ?? 'investigate']} metal="silver" size={58} />;
      title = view.pendingPower ? POWER_LABEL[view.pendingPower] : 'Enquête';
      line = `pouvoir de ${nameOf(view.regent)}`;
      break;
    case 'over':
      icon = <RichIcon name={view.outcome?.winner === 'crown' ? 'crown' : 'crowned-skull'} metal={view.outcome?.winner === 'crown' ? 'gold' : 'bone'} size={64} />;
      title = view.outcome?.winner === 'crown' ? 'La Couronne l’emporte' : 'L’Ombre s’empare du trône';
      break;
  }
  return (
    <div className="flex flex-col items-center text-center">
      <span className="drop-shadow-[0_6px_10px_rgba(0,0,0,.7)]">{icon}</span>
      <span className="tv-title mt-2 text-[15px] leading-tight text-[#fbe7a8] [text-shadow:0_2px_4px_rgba(0,0,0,.9)]">{title}</span>
      {line && <span className="text-[14px] italic text-[#e8d6ad] [text-shadow:0_2px_4px_rgba(0,0,0,.9)]">{line}</span>}
    </div>
  );
}

// ───────── Lettre de cachet (informations secrètes) ─────────

function Letter({ view, me, nameOf }: { view: ThroneView; me: NonNullable<ThroneView['me']>; nameOf: NameOf }) {
  const goal =
    me.team === 'crown'
      ? `Fais promulguer ${CROWN_TO_WIN} édits royaux, ou fais exécuter l’Usurpateur.`
      : me.role === 'usurper'
        ? 'Reste discret : après le 3e édit de l’Ombre, fais-toi élire Sénéchal pour t’emparer du trône.'
        : `Fais passer ${SHADOW_TO_WIN} édits de l’Ombre, ou fais élire l’Usurpateur Sénéchal après le 3e.`;
  return (
    <section className="tv-letter">
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <Seal team={me.team} size={46} usurper={me.role === 'usurper'} />
      </div>
      <div className="tv-title mt-2 text-center text-[11px] uppercase tracking-[0.3em] text-[#7a2a14]">Lettre de cachet · confidentiel</div>
      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2">
        <span className="muted text-[15px]">Ton rôle :</span>
        <span className="tv-title text-[1.6rem]" style={{ color: me.team === 'crown' ? '#1f3f86' : '#7a120c' }}>
          {ROLE_LABEL[me.role]}
        </span>
        <span className="muted text-[15px]">({TEAM_LABEL[me.team]})</span>
      </div>
      <p className="mt-2 text-center text-[1.05rem] leading-snug">{goal}</p>
      {me.allies.length > 0 && (
        <p className="mt-3 text-center">
          Tes complices : <strong>{me.allies.map((a) => `${nameOf(a.id)} (${ROLE_LABEL[a.role]})`).join(', ')}</strong>
        </p>
      )}
      {me.role === 'usurper' && me.allies.length === 0 && <p className="muted mt-3 text-center">Tu ne connais pas tes Conjurés, mais eux te connaissent.</p>}
      {me.investigations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {me.investigations.map((i) => (
            <li key={i.target} className="flex items-center justify-center gap-1.5">
              <RichIcon name="magnifying-glass" metal="brass" size={18} /> {nameOf(i.target)} sert{' '}
              <strong style={{ color: i.team === 'crown' ? '#1f3f86' : '#7a120c' }}>{TEAM_LABEL[i.team]}</strong>
            </li>
          ))}
        </ul>
      )}
      {me.passed && (
        <p className="muted mt-3 flex items-center justify-center gap-1.5">
          Tu as transmis : {me.passed.map((e, i) => <Seal key={i} team={e} size={20} />)}
        </p>
      )}
      {view.phase === 'over' && <p className="muted mt-2 text-center text-sm italic">Toutes les lettres sont maintenant ouvertes.</p>}
    </section>
  );
}

// ───────── Actions de la phase ─────────

function Actions({
  view,
  nameOf,
  seatOf,
  sendMove,
  actingAs,
  privateView,
  pick,
  setPick,
}: {
  view: ThroneView;
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: ThroneMove) => void;
  actingAs: PlayerId | null;
  privateView: boolean;
  pick: PlayerId | null;
  setPick: (id: PlayerId | null) => void;
}) {
  const me = actingAs as PlayerId;
  const isRegent = me === view.regent;
  const self = view.players.find((p) => p.id === me)!;

  switch (view.phase) {
    case 'reveal':
      return !self.acked && privateView ? (
        <Dock title="Ta lettre de cachet">
          <p className="muted text-center">Retiens bien ton rôle et ton camp : personne d’autre ne le verra.</p>
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              className="tv-btn"
              onClick={() => {
                sfx.seal();
                sendMove({ type: 'ack' });
              }}
            >
              J’ai retenu mon rôle
            </button>
          </div>
        </Dock>
      ) : null;

    case 'nomination':
      return isRegent ? (
        <PickPlayer
          title="Proposer un Sénéchal"
          hint="Le Sénéchal promulguera l’édit. Choisis quelqu’un de confiance… ou qui sert tes plans."
          options={view.players.filter((p) => p.eligible)}
          seatOf={seatOf}
          value={pick}
          onChange={setPick}
          confirm={(name) => `Proposer ${name}`}
          onPick={(target) => {
            sfx.knock();
            sendMove({ type: 'nominate', target });
          }}
        />
      ) : null;

    case 'vote':
      if (view.config.votes === 'hands') {
        return isRegent ? <HandsVote view={view} seatOf={seatOf} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
      }
      if (self.voted || !privateView) {
        return self.voted && view.me?.myVote !== null && privateView ? (
          <Dock title="Bulletin déposé">
            <p className="text-center">
              Tu as voté <strong>{view.me?.myVote ? 'oui' : 'non'}</strong>. On attend les autres conseillers…
            </p>
          </Dock>
        ) : null;
      }
      return (
        <Dock title={`Élire ${nameOf(view.regent)} et ${nameOf(view.nominee)} ?`}>
          <p className="muted -mt-1 text-center text-[15px]">À la majorité, ils gouvernent ce tour-ci.</p>
          <div className="mt-3 flex justify-center gap-4">
            {[true, false].map((yes) => (
              <button
                key={String(yes)}
                type="button"
                aria-label={yes ? 'Oui' : 'Non'}
                className="tv-ballot"
                onClick={() => {
                  sfx.seal();
                  sendMove({ type: 'vote', yes });
                }}
              >
                <RichIcon name={yes ? 'thumb-up' : 'thumb-down'} metal={yes ? 'gold' : 'ruby'} size={64} />
                <span className="word" style={{ color: yes ? '#5a4210' : '#7a120c' }}>
                  {yes ? 'Oui' : 'Non'}
                </span>
                <span className="muted text-[13px] italic">{yes ? 'je les soutiens' : 'je m’y oppose'}</span>
              </button>
            ))}
          </div>
        </Dock>
      );

    case 'regent':
      return isRegent && privateView && view.me?.hand ? (
        <ChooseEdict
          title="Choisis l’édit à défausser"
          hint="Les deux autres iront au Sénéchal. Personne ne saura ce que tu as jeté."
          hand={view.me.hand}
          verb="Défausser"
          onPick={(index) => sendMove({ type: 'discard', index })}
        />
      ) : null;

    case 'seneschal':
      return me === view.nominee && privateView && view.me?.hand ? (
        <ChooseEdict
          title="Choisis l’édit à promulguer"
          hint="L’autre est défaussé."
          hand={view.me.hand}
          verb="Promulguer"
          onPick={(index) => sendMove({ type: 'enact', index })}
          extra={
            view.vetoUnlocked && !view.vetoRefused ? (
              <button type="button" onClick={() => sendMove({ type: 'veto' })} className="tv-btn2">
                Proposer un veto au Régent
              </button>
            ) : null
          }
        />
      ) : null;

    case 'veto':
      return isRegent ? (
        <Dock title="Veto proposé par le Sénéchal">
          <p className="muted text-center text-[15px]">Accepter : aucun édit ne passe et la colère du peuple monte d’un cran.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="tv-btn" onClick={() => sendMove({ type: 'vetoAnswer', accept: true })}>
              Accepter
            </button>
            <button type="button" className="tv-btn2" onClick={() => sendMove({ type: 'vetoAnswer', accept: false })}>
              Refuser
            </button>
          </div>
        </Dock>
      ) : null;

    case 'power': {
      if (!isRegent) return null;
      if (view.pendingPower === 'peek') {
        return privateView && view.me?.peek ? (
          <Dock title="Présage : les 3 prochains édits">
            <div className="flex justify-center gap-2">
              {view.me.peek.map((e, i) => (
                <EdictCard key={i} edict={e} />
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <button type="button" className="tv-btn" onClick={() => sendMove({ type: 'power' })}>
                J’ai vu
              </button>
            </div>
          </Dock>
        ) : null;
      }
      const others = view.players.filter((p) => p.alive && p.id !== me);
      const options = view.pendingPower === 'investigate' ? others.filter((p) => !p.investigated) : others;
      const titles = {
        investigate: ['Enquêter sur…', (n: string) => `Enquêter sur ${n}`, 'Tu découvriras son camp (pas son rôle exact).'],
        special: ['Désigner le prochain Régent', (n: string) => `Désigner ${n}`, 'Il présidera le prochain tour.'],
        execute: ['Exécuter…', (n: string) => `Exécuter ${n}`, 'S’il est l’Usurpateur, la Couronne gagne aussitôt.'],
      } as const;
      const t = titles[view.pendingPower as keyof typeof titles];
      return t ? (
        <PickPlayer
          title={t[0]}
          hint={t[2]}
          options={options}
          seatOf={seatOf}
          value={pick}
          onChange={setPick}
          confirm={t[1]}
          danger={view.pendingPower === 'execute'}
          onPick={(target) => sendMove({ type: 'power', target })}
        />
      ) : null;
    }

    case 'powerResult': {
      if (!isRegent || !privateView) return null;
      const last = view.me?.investigations.at(-1);
      return last ? (
        <Dock title="Résultat de l’enquête">
          <div className="flex justify-center">
            <Seal team={last.team} size={60} />
          </div>
          <p className="mt-2 text-center text-xl">
            {nameOf(last.target)} sert <strong style={{ color: last.team === 'crown' ? '#1f3f86' : '#7a120c' }}>{TEAM_LABEL[last.team]}</strong>.
          </p>
          <p className="muted mt-1 text-center text-[14px] italic">À toi de décider si tu le dis… et si tu dis la vérité.</p>
          <div className="mt-3 flex justify-center">
            <button type="button" className="tv-btn" onClick={() => sendMove({ type: 'power' })}>
              Compris
            </button>
          </div>
        </Dock>
      ) : null;
    }

    default:
      return null;
  }
}

function Dock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tv-dock">
      <h4 className="mb-3">{title}</h4>
      {children}
    </section>
  );
}

function PickPlayer({
  title,
  hint,
  options,
  seatOf,
  value,
  onChange,
  confirm,
  onPick,
  danger = false,
}: {
  title: string;
  hint?: string;
  options: ThronePlayerView[];
  seatOf: (id: PlayerId | null) => number;
  value: PlayerId | null;
  onChange: (id: PlayerId) => void;
  confirm: (name: string) => string;
  onPick: (id: PlayerId) => void;
  danger?: boolean;
}) {
  const picked = value && options.some((p) => p.id === value) ? value : null;
  const name = options.find((p) => p.id === picked)?.name;
  return (
    <Dock title={title}>
      {hint && <p className="muted -mt-1 mb-2 text-center text-[15px]">{hint}</p>}
      <div className="flex flex-wrap justify-center gap-1" role="radiogroup" aria-label={title}>
        {options.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={picked === p.id} onClick={() => onChange(p.id)} className="tv-pick">
            <Crest id={p.id} name={p.name} seat={seatOf(p.id)} size={40} />
            <span className="tv-title text-[13px]">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" disabled={!picked} onClick={() => picked && onPick(picked)} className={`tv-btn ${danger ? 'danger' : ''}`}>
          {name ? confirm(name) : 'Choisis un conseiller'}
        </button>
      </div>
    </Dock>
  );
}

function HandsVote({ view, seatOf, onSubmit }: { view: ThroneView; seatOf: (id: PlayerId | null) => number; onSubmit: (yes: PlayerId[]) => void }) {
  const alive = view.players.filter((p) => p.alive);
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.nominee]);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > alive.length;
  return (
    <Dock title="Qui a levé la main pour « oui » ?">
      <div className="flex flex-wrap justify-center gap-1">
        {alive.map((p) => (
          <button key={p.id} type="button" aria-pressed={yes.includes(p.id)} onClick={() => toggle(p.id)} className="tv-pick" style={yes.includes(p.id) ? { background: 'rgba(42,63,122,.16)', boxShadow: '0 0 0 2px #2a3f7a' } : undefined}>
            <span className="relative">
              <Crest id={p.id} name={p.name} seat={seatOf(p.id)} size={38} />
              {yes.includes(p.id) && (
                <span className="absolute -bottom-1 -right-2">
                  <RichIcon name="thumb-up" metal="gold" size={22} />
                </span>
              )}
            </span>
            <span className="tv-title text-[13px]">{p.name}</span>
          </button>
        ))}
      </div>
      <p className="muted mt-2 text-center text-[15px]">
        {yes.length} oui sur {alive.length} : le gouvernement serait {passes ? 'élu' : 'rejeté'}.
      </p>
      <div className="mt-3 flex justify-center">
        <button type="button" className="tv-btn" onClick={() => onSubmit(yes)}>
          Valider le vote
        </button>
      </div>
    </Dock>
  );
}

function ChooseEdict({
  title,
  hint,
  hand,
  verb,
  onPick,
  extra,
}: {
  title: string;
  hint: string;
  hand: Edict[];
  verb: string;
  onPick: (index: number) => void;
  extra?: ReactNode;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Dock title={title}>
      <p className="muted -mt-1 mb-3 text-center text-[15px]">{hint}</p>
      <div className="flex justify-center gap-2.5">
        {hand.map((e, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={picked === i}
            aria-label={EDICT_LABEL[e]}
            onClick={() => {
              sfx.whoosh(0, 0.1);
              setPicked(i);
            }}
          >
            <EdictCard edict={e} />
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          className="tv-btn"
          disabled={picked === null}
          onClick={() => {
            if (picked === null) return;
            sfx.seal();
            onPick(picked);
          }}
        >
          {picked === null ? 'Choisis un édit' : `${verb} : ${EDICT_LABEL[hand[picked]!]}`}
        </button>
        {extra}
      </div>
    </Dock>
  );
}

function EdictCard({ edict }: { edict: Edict }) {
  return (
    <span className="tv-edict">
      <Seal team={edict} size={50} />
      <span className="lbl" style={{ color: edict === 'crown' ? '#1f3f86' : '#7a120c' }}>
        {EDICT_LABEL[edict]}
      </span>
    </span>
  );
}

// ───────── Registre et journal ─────────

function History({ view, nameOf }: { view: ThroneView; nameOf: NameOf }) {
  if (view.history.length === 0) return null;
  return (
    <section className="rounded-xl border border-[#3a2410] bg-black/45 px-4 py-3 backdrop-blur-[2px]">
      <h3 className="tv-title text-[15px] uppercase tracking-[0.14em] text-[#e9c46a]">Registre des édits</h3>
      <ol className="mt-2 flex flex-col gap-1.5">
        {view.history.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <Seal team={e.edict} size={22} />
            <span className="text-[#efe3c8]">{e.regent ? `${nameOf(e.regent)} → ${nameOf(e.seneschal)}` : 'Émeute du peuple'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details open={open} className="rounded-xl border border-[#3a2410] bg-black/45 px-4 py-2.5 backdrop-blur-[2px]">
      <summary className="tv-title cursor-pointer select-none text-[15px] uppercase tracking-[0.14em] text-[#e9c46a]">Chronique du Conseil</summary>
      <ol className="mt-1 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#f6e7c4]' : 'text-[#bba77f]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}


'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Cinematic, Icon, RichIcon, RoundTable, sfx, useAmbient, useMediaQuery, type GameIconName, type TableLink } from '@arcade/tabletop';
import {
  MAX_REJECTIONS,
  ROLE_LABEL,
  SIDE_LABEL,
  TO_WIN,
  sideOf,
  type ExpeditionMove,
  type ExpeditionPlayerView,
  type ExpeditionView,
  type Role,
} from '../shared';
import { EXPEDITION_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<ExpeditionView, ExpeditionMove>;
type NameOf = (id: PlayerId | null) => string;

/** Couleurs des parkas et insignes, par place. */
const PARKA = ['#c0392b', '#d35400', '#c99a12', '#1f7a46', '#1f5f99', '#6b3a8a', '#8a5a12', '#2b6b6b', '#7a1d4a', '#4a5a1d'];
const BADGE: GameIconName[] = ['mountain-climbing', 'backpack', 'compass', 'lantern', 'winter-gloves', 'sitting-dog', 'spyglass', 'rope-coil', 'snowflake-1', 'camping-tent'];
const STAGE_ICON: GameIconName[] = ['camping-tent', 'rope-bridge', 'frozen-block', 'snowing', 'flying-flag'];
/** Position des étapes sur la carte (en % de la largeur et de la hauteur). */
const WAYPOINT = [
  { x: 12, y: 74 },
  { x: 31, y: 58 },
  { x: 50, y: 46 },
  { x: 69, y: 33 },
  { x: 88, y: 19 },
];

export default function ExpeditionBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.players.findIndex((p) => p.id === id));
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const wide = useMediaQuery('(min-width: 1024px)');
  useAmbient('wind');

  // La cordée en cours de composition (panneau du Chef, ou en touchant les explorateurs autour du feu).
  const size = view.missions[view.mission]?.size ?? 0;
  const [team, setTeam] = useState<PlayerId[]>([]);
  useEffect(() => setTeam([]), [view.mission, view.leader, view.phase]);
  const composing = view.phase === 'team' && actingAs === view.leader;
  const toggle = (id: PlayerId) => {
    sfx.click();
    setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < size ? [...t, id] : t));
  };

  const event = useExpeditionEvents(view);

  return (
    <div className="ex">
      <style href="arcade-expedition-v1" precedence="default">
        {EXPEDITION_CSS}
      </style>
      <div className="ex-stars" />
      <div className="ex-aurora" />
      <div className="ex-snow far" />
      <div className="ex-snow" />

      <header className="relative px-3 pt-[3.6rem] text-center sm:pt-4">
        <div className="ex-title ex-frost text-[1.75rem] leading-none sm:text-[2.4rem]">Expédition polaire</div>
        <div className="mt-1 text-[14px] italic text-[#cfe6ff]">Cap sur le Pôle — {TO_WIN} étapes réussies pour l’atteindre</div>
      </header>
      <div className="mx-auto mt-3 w-[min(1240px,calc(100%-20px))]">
        <RouteMap view={view} />
        <StepTrack view={view} />
        <Instruction {...instructionFor(view, actingAs, privateView, mode, nameOf)} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {actingAs && (
            <Actions view={view} actingAs={actingAs} privateView={privateView} nameOf={nameOf} seatOf={seatOf} team={team} toggle={toggle} sendMove={sendMove} />
          )}
          {me && <Notebook me={me} nameOf={nameOf} />}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Camp view={view} viewer={viewer} wide={wide} nameOf={nameOf} preview={composing ? team : null} onToggle={composing ? toggle : undefined} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <History view={view} nameOf={nameOf} />
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      <Cinematic trigger={event.key} onMount={mode !== 'hotseat'} duration={event.kind === 'mission' ? 2800 : 2000}>
        <EventBanner view={view} kind={event.kind} nameOf={nameOf} />
      </Cinematic>
    </div>
  );
}

// ───────── Événements ─────────

type EventKind = 'phase' | 'vote' | 'mission';

function useExpeditionEvents(view: ExpeditionView): { key: string; kind: EventKind } {
  const done = view.missions.filter((m) => m.result).length;
  const votes = view.votesHistory.length;
  const prev = useRef({ done, votes, phase: view.phase });
  const event = useRef<{ key: string; kind: EventKind }>({ key: `phase-${view.phase}-${view.mission}`, kind: 'phase' });
  const p = prev.current;
  if (done > p.done) event.current = { key: `mission-${done}`, kind: 'mission' };
  else if (votes > p.votes) event.current = { key: `vote-${votes}`, kind: 'vote' };
  else if (view.phase !== p.phase && (view.phase === 'team' || view.phase === 'spy')) event.current = { key: `phase-${view.phase}-${view.mission}-${votes}`, kind: 'phase' };
  prev.current = { done, votes, phase: view.phase };

  const played = useRef(event.current.key);
  useEffect(() => {
    const e = event.current;
    if (played.current === e.key) return;
    played.current = e.key;
    if (e.kind === 'mission') {
      const last = [...view.missions].reverse().find((m) => m.result)?.result;
      if (last?.success) sfx.chime(0.8);
      else {
        sfx.crack(0.6);
        sfx.boom(0.75);
      }
      for (let i = 0; i < (last?.team.length ?? 0); i++) sfx.whoosh(0.1 + i * 0.12, 0.08);
    } else if (e.kind === 'vote') {
      [0, 0.18].forEach((d) => sfx.knock(d, 0.35));
      if (view.votesHistory.at(-1)?.approved) sfx.chime(0.45);
    } else sfx.whoosh(0, 0.12);
  });
  return event.current;
}

function EventBanner({ view, kind, nameOf }: { view: ExpeditionView; kind: EventKind; nameOf: NameOf }) {
  if (kind === 'mission') {
    const m = [...view.missions].reverse().find((x) => x.result);
    if (!m?.result) return null;
    const r = m.result;
    // Les cartes se retournent une à une, les sabotages en dernier.
    const cards = [...Array<boolean>(r.team.length - r.sabotages).fill(true), ...Array<boolean>(r.sabotages).fill(false)];
    return (
      <div className="ex-banner">
        <div className="k">{m.name}</div>
        <div className="my-3 flex justify-center gap-2">
          {cards.map((ok, i) => (
            <span key={i} className={`ex-flip ex-mini grid h-[66px] w-12 place-items-center ${ok ? 'bg-[#d5ecff]' : 'bg-[#9c1b14]'}`} style={{ animationDelay: `${0.15 + i * 0.15}s` }}>
              <RichIcon name={ok ? 'flying-flag' : 'iceberg'} metal={ok ? 'gold' : 'bone'} size={32} />
            </span>
          ))}
        </div>
        <div className="ex-title ex-frost text-[2.3rem] leading-tight sm:text-5xl">{r.success ? 'Étape réussie !' : 'Sabotage !'}</div>
        <div className="s">
          {r.sabotages === 0
            ? 'Toute la cordée a tenu bon.'
            : `${r.sabotages} sabotage${r.sabotages > 1 ? 's' : ''} dans la cordée de ${r.team.map(nameOf).join(', ')}.`}
        </div>
      </div>
    );
  }
  if (kind === 'vote') {
    const v = view.votesHistory.at(-1);
    if (!v) return null;
    const yes = Object.values(v.votes).filter(Boolean).length;
    return (
      <div className="ex-banner">
        <div className="k">Cordée de {nameOf(v.leader)}</div>
        <div className="ex-title ex-frost text-[2.2rem] sm:text-5xl">{v.approved ? 'Cordée acceptée' : 'Cordée refusée'}</div>
        <div className="s">
          {yes} oui · {Object.keys(v.votes).length - yes} non
          {!v.approved && view.rejections > 0 ? ` — ${view.rejections}/${MAX_REJECTIONS} refus d’affilée` : ''}
        </div>
      </div>
    );
  }
  const stage = view.missions[view.mission];
  if (view.phase === 'spy')
    return (
      <div className="ex-banner">
        <div className="k">Au pied du Pôle</div>
        <div className="ex-title ex-frost text-[2.2rem] sm:text-5xl">L’Espion se révèle</div>
        <div className="s">{nameOf(view.spy)} peut tout renverser en démasquant la Cartographe.</div>
      </div>
    );
  if (view.phase !== 'team' || !stage) {
    return view.phase === 'reveal' ? (
      <div className="ex-banner">
        <div className="k">Expédition polaire</div>
        <div className="ex-title ex-frost text-[2.2rem] sm:text-5xl">Départ du camp de base</div>
        <div className="s">Chacun ouvre son carnet en secret : explorateur… ou mutin ?</div>
      </div>
    ) : null;
  }
  return (
    <div className="ex-banner">
      <div className="k">
        Étape {view.mission + 1} sur {view.missions.length}
      </div>
      <div className="ex-title ex-frost text-[2.2rem] sm:text-5xl">{stage.name}</div>
      <div className="s">
        {nameOf(view.leader)} compose une cordée de {stage.size}.
      </div>
    </div>
  );
}

// ───────── La carte du parcours ─────────

function RouteMap({ view }: { view: ExpeditionView }) {
  const ended = view.phase === 'over' || view.phase === 'spy';
  // Chemin parcouru : du camp de base jusqu'à l'étape en cours (tout le chemin en fin de partie).
  const reached = ended ? WAYPOINT.length - 1 : Math.min(view.mission, WAYPOINT.length - 1);
  const walked = `M2,92 Q8,80 12,74${WAYPOINT.slice(1, reached + 1)
    .map((w) => ` T${w.x},${w.y}`)
    .join('')}`;
  return (
    <section className="ex-route" aria-label="Le parcours">
      <svg className="bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="ex-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4fbff" />
            <stop offset="0.25" stopColor="#a9c3da" />
            <stop offset="1" stopColor="#24435f" />
          </linearGradient>
          <linearGradient id="ex-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor="#d2e4f2" />
            <stop offset="1" stopColor="#8fb0c9" />
          </linearGradient>
          <linearGradient id="ex-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#081a33" />
            <stop offset="1" stopColor="#2b5b80" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#ex-sky)" />
        <polygon points="0,62 8,46 15,54 24,34 33,48 43,26 52,40 61,20 70,36 80,10 89,30 100,16 100,100 0,100" fill="url(#ex-far)" opacity=".85" />
        <polygon points="0,88 10,74 20,80 32,64 42,72 54,58 64,66 76,50 86,60 100,48 100,100 0,100" fill="url(#ex-near)" />
        <path d="M2,92 Q8,80 12,74 T31,58 T50,46 T69,33 T88,19" fill="none" stroke="rgba(40,60,90,.55)" strokeWidth="5" vectorEffect="non-scaling-stroke" strokeDasharray="2 7" strokeLinecap="round" />
        <path d={walked} fill="none" stroke="#e3c58a" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
      {view.missions.map((m, i) => {
        const now = i === view.mission && !ended;
        const state = m.result ? (m.result.success ? 'done-ok' : 'done-ko') : now ? 'now' : 'future';
        const pos = WAYPOINT[i]!;
        return (
          <div key={m.name} className={`ex-way ${state}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
            <span className="pin">
              <RichIcon name={m.result && !m.result.success ? 'iceberg' : STAGE_ICON[i]!} metal={state === 'future' ? 'silver' : m.result && !m.result.success ? 'bone' : 'gold'} size={26} />
            </span>
            <span className="lbl">{m.name}</span>
            <span className="tag">
              {m.result
                ? m.result.success
                  ? 'réussie'
                  : `ratée · ${m.result.sabotages} sabotage${m.result.sabotages > 1 ? 's' : ''}`
                : `${m.size} grimpeurs${m.needed > 1 ? ' · 2 sabotages' : ''}`}
            </span>
          </div>
        );
      })}
      <div className="absolute left-3 top-2.5 flex items-center gap-1.5 rounded-full bg-[rgba(4,14,28,.75)] px-2.5 py-1 text-[13px]" title="Au 5e refus d’affilée, l’expédition s’enlise et les Mutins gagnent.">
        <span className="hidden sm:inline">Refus d’affilée</span>
        {Array.from({ length: MAX_REJECTIONS }, (_, i) => (
          <span key={i} className={`ex-flake ${i < view.rejections ? 'on' : ''}`}>
            <RichIcon name="snowflake-2" metal={i < view.rejections ? (view.rejections >= MAX_REJECTIONS - 1 ? 'ruby' : 'silver') : 'iron'} size={16} />
          </span>
        ))}
      </div>
    </section>
  );
}

// ───────── Étapes du tour et consigne ─────────

const STEPS: { label: string; icon: GameIconName }[] = [
  { label: 'Cordée', icon: 'rope-coil' },
  { label: 'Vote', icon: 'vote' },
  { label: 'Ascension', icon: 'mountain-climbing' },
];

function StepTrack({ view }: { view: ExpeditionView }) {
  if (view.phase === 'reveal' || view.phase === 'over' || view.phase === 'spy') return null;
  const now = { team: 0, vote: 1, mission: 2 }[view.phase];
  return (
    <ol className="ex-steps" aria-label="Étapes du tour">
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
  view: ExpeditionView,
  actingAs: PlayerId | null,
  privateView: boolean,
  mode: Props['mode'],
  nameOf: NameOf,
): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const leader = nameOf(view.leader);
  const stage = view.missions[view.mission];
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const isLeader = actingAs === view.leader;
  const self = view.players.find((p) => p.id === actingAs);
  switch (view.phase) {
    case 'reveal': {
      const ready = `${view.players.filter((p) => p.acked).length}/${view.players.length} prêts`;
      return privateView && self && !self.acked
        ? { icon: 'notebook', mine: true, text: you(`ouvre ton carnet : ton rôle est secret. (${ready})`) }
        : { icon: 'notebook', mine: false, text: `Chacun découvre son rôle en secret… ${ready}.` };
    }
    case 'team':
      return isLeader
        ? { icon: 'rope-coil', mine: true, text: you(`tu es Chef : choisis ${stage?.size} grimpeurs pour « ${stage?.name} » (touche-les autour du feu).`) }
        : { icon: 'rope-coil', mine: false, text: `${leader} compose la cordée pour « ${stage?.name} » (${stage?.size} grimpeurs). Discutez !` };
    case 'vote':
      if (view.config.votes === 'hands')
        return isLeader
          ? { icon: 'vote', mine: true, text: you('faites voter à main levée, puis coche les « oui ».') }
          : { icon: 'vote', mine: false, text: `Vote à main levée sur la cordée : ${view.team.map(nameOf).join(', ')}.` };
      return privateView && self && !self.voted
        ? { icon: 'vote', mine: true, text: you(`la cordée ${view.team.map(nameOf).join(', ')} part-elle ? Il faut une majorité de oui.`) }
        : { icon: 'vote', mine: false, text: `Vote sur la cordée : ${view.players.filter((p) => p.voted).length}/${view.players.length} bulletins.` };
    case 'mission':
      return privateView && view.team.includes(actingAs!) && !view.me?.myCard
        ? {
            icon: 'mountain-climbing',
            mine: true,
            text: you(`tu es dans la cordée : joue ta carte en secret. ${view.me?.side === 'mutiny' ? 'Toi, tu peux saboter…' : 'Un explorateur loyal joue toujours Réussite.'}`),
          }
        : { icon: 'mountain-climbing', mine: false, text: `La cordée affronte « ${stage?.name} » : chacun joue sa carte en secret.` };
    case 'spy':
      return actingAs === view.spy && privateView
        ? { icon: 'spy', mine: true, text: you('l’expédition touche au but… désigne la Cartographe pour tout renverser !') }
        : { icon: 'spy', mine: false, text: `L’expédition touche au but… mais l’Espion ${nameOf(view.spy)} peut démasquer la Cartographe !` };
    default:
      return { icon: 'flying-flag', mine: false, text: 'Fin de l’expédition : tous les rôles sont révélés.' };
  }
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`ex-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="iron" size={26} />
      </span>
      <p>{text}</p>
    </div>
  );
}

// ───────── Le camp ─────────

function Camp({
  view,
  viewer,
  wide,
  nameOf,
  preview,
  onToggle,
}: {
  view: ExpeditionView;
  viewer: PlayerId | null;
  wide: boolean;
  nameOf: NameOf;
  preview: PlayerId[] | null;
  onToggle?: (id: PlayerId) => void;
}) {
  const roped = preview ?? (view.phase === 'vote' || view.phase === 'mission' ? view.team : []);
  // La cordée est reliée par une corde, dans l'ordre des places autour du feu.
  const ordered = view.players.map((p) => p.id).filter((id) => roped.includes(id));
  const links: TableLink[] = [];
  for (let i = 0; i + 1 < ordered.length; i++) {
    links.push({ id: `rope-${i}`, from: ordered[i]!, to: ordered[i + 1]!, color: '#e3c58a', width: 4, head: false, curve: 0.35 });
  }
  return (
    <section className="relative pb-7 lg:pb-3" aria-label="Le camp">
      <h3 className="sr-only">L’expédition autour du feu</h3>
      <RoundTable
        ids={view.players.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 128, h: 150 } : { w: 84, h: 118 }}
        className={wide ? 'aspect-[1.3] max-h-[calc(100dvh-140px)] min-h-[500px]' : 'aspect-[0.84]'}
        links={links}
        under={<div className="ex-camp" />}
        center={<CampHeart view={view} nameOf={nameOf} />}
        renderSeat={(id) => {
          const p = view.players.find((x) => x.id === id)!;
          return <Seat p={p} seat={view.players.indexOf(p)} view={view} viewer={viewer} wide={wide} roped={roped.includes(id)} onToggle={onToggle ? () => onToggle(id) : undefined} />;
        }}
      />
    </section>
  );
}

function Hood({ seat, size }: { seat: number; size: number }) {
  const c = PARKA[seat % PARKA.length]!;
  return (
    <span className="ex-hood" style={{ width: size, height: size, background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${c} 50%, white), ${c} 55%, color-mix(in srgb, ${c} 55%, black))` }}>
      <RichIcon name={BADGE[seat % BADGE.length]!} metal="bone" size={size * 0.6} />
    </span>
  );
}

function seatChip(view: ExpeditionView, p: ExpeditionPlayerView): { text: string; tone: string } | null {
  if (view.phase === 'reveal') return p.acked ? { text: 'prêt', tone: 'green' } : { text: 'lit son carnet…', tone: 'dim' };
  if (view.phase === 'vote' && view.config.votes === 'secret') return p.voted ? { text: 'a voté', tone: 'green' } : { text: 'réfléchit…', tone: 'dim' };
  if (view.phase === 'mission' && p.onTeam) return p.played ? { text: 'a joué', tone: 'green' } : { text: 'grimpe…', tone: 'dim' };
  if (p.id === view.leader && view.phase !== 'over' && view.phase !== 'spy') return { text: 'Chef', tone: 'gold' };
  if (p.id === view.unmasked) return { text: 'démasqué', tone: 'red' };
  return null;
}

function Seat({
  p,
  seat,
  view,
  viewer,
  wide,
  roped,
  onToggle,
}: {
  p: ExpeditionPlayerView;
  seat: number;
  view: ExpeditionView;
  viewer: PlayerId | null;
  wide: boolean;
  roped: boolean;
  onToggle?: () => void;
}) {
  const leader = p.id === view.leader && view.phase !== 'over' && view.phase !== 'spy';
  const chip = seatChip(view, p);
  const size = wide ? 60 : 48;
  const last = view.lastVote;
  const ballot = view.phase !== 'vote' && last && Object.hasOwn(last.votes, p.id) ? last.votes[p.id] : null;
  const cls = `ex-seat ${roped ? 'is-team' : ''} ${leader ? 'is-leader' : ''} ${p.id === viewer ? 'is-me' : ''}`;
  const body = (
    <>
      {chip && <span className={`ex-chip tone-${chip.tone}`}>{chip.text}</span>}
      <span className="relative">
        <Hood seat={seat} size={size} />
        {leader && (
          <span className="ex-token -right-3 -top-1" style={{ width: size * 0.5, height: size * 0.5, background: '#14304f' }} title="Chef d’expédition">
            <RichIcon name="flying-flag" metal="gold" size={size * 0.34} />
          </span>
        )}
        {roped && (
          <span className="ex-token -bottom-1 -left-2" style={{ width: size * 0.46, height: size * 0.46, background: '#6b4a22' }} title="Dans la cordée">
            <RichIcon name="rope-coil" metal="brass" size={size * 0.32} />
          </span>
        )}
      </span>
      <span className="ex-plate">
        <span className="ex-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="ex-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      <span className="flex min-h-[18px] flex-wrap items-center justify-center gap-1">
        {p.role && <span className={`ex-role ${sideOf(p.role)}`}>{ROLE_LABEL[p.role]}</span>}
        {ballot !== null && ballot !== undefined && <span className={`ex-vote ${ballot ? 'yes' : 'no'}`}>{ballot ? 'oui' : 'non'}</span>}
      </span>
    </>
  );
  if (onToggle) {
    return (
      <button type="button" className={cls} style={{ width: wide ? 128 : 84 }} aria-label={roped ? `Retirer ${p.name} de la cordée` : `Ajouter ${p.name} à la cordée`} onClick={onToggle}>
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

function CampHeart({ view, nameOf }: { view: ExpeditionView; nameOf: NameOf }) {
  const stage = view.missions[view.mission];
  let line: ReactNode = null;
  switch (view.phase) {
    case 'reveal':
      line = `${view.players.filter((p) => p.acked).length}/${view.players.length} carnets lus`;
      break;
    case 'team':
      line = `${nameOf(view.leader)} choisit ${stage?.size} grimpeurs`;
      break;
    case 'vote':
      line = view.config.votes === 'secret' ? `${view.players.filter((p) => p.voted).length}/${view.players.length} bulletins` : 'vote à main levée';
      break;
    case 'mission': {
      const played = view.players.filter((p) => p.onTeam && p.played).length;
      line = (
        <span className="flex flex-col items-center gap-1">
          <span className="flex gap-1">
            {view.team.map((id, i) => (
              <span key={id} className="ex-mini h-7 w-5" style={{ background: i < played ? 'linear-gradient(135deg,#5a6f86,#26394f)' : 'rgba(255,255,255,.35)' }} />
            ))}
          </span>
          {played}/{view.team.length} cartes jouées
        </span>
      );
      break;
    }
    case 'spy':
      line = `${nameOf(view.spy)} cherche la Cartographe`;
      break;
    default:
      line = view.outcome?.winner === 'expedition' ? 'Le drapeau flotte sur le Pôle' : 'L’expédition a échoué';
  }
  return (
    <div className="flex flex-col items-center text-center">
      <span className="ex-fire">
        <RichIcon name="campfire" metal="copper" size={58} />
      </span>
      {stage && view.phase !== 'over' && view.phase !== 'spy' && <span className="ex-title mt-2 text-[14px] text-[#14304f]">{stage.name}</span>}
      <span className="mt-0.5 text-[14px] italic text-[#22344a]">{line}</span>
    </div>
  );
}

// ───────── Carnet secret ─────────

function Notebook({ me, nameOf }: { me: NonNullable<ExpeditionView['me']>; nameOf: NameOf }) {
  const goal: Record<Role, string> = {
    explorer: `Fais réussir ${TO_WIN} étapes. Repère les Mutins et écarte-les des cordées.`,
    cartographer: 'Tu connais les Mutins. Guide l’expédition… sans te faire repérer par l’Espion.',
    mutineer: `Fais rater ${TO_WIN} étapes en sabotant discrètement, ou bloque l’expédition.`,
    spy: 'Tu es un Mutin. Si l’expédition gagne, tu pourras désigner la Cartographe pour tout renverser.',
  };
  const mutiny = me.side === 'mutiny';
  return (
    <section className="ex-notebook">
      <div className="ex-title text-center text-[12px] uppercase tracking-[0.3em] text-[#a33a2a]">Carnet de bord · confidentiel</div>
      <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-2">
        <span className="muted">Ton rôle :</span>
        <span className="ex-title text-[1.6rem]" style={{ color: mutiny ? '#9c1b14' : '#1f4f86' }}>
          {ROLE_LABEL[me.role]}
        </span>
        <span className="muted">({SIDE_LABEL[me.side]})</span>
      </div>
      <div className="mt-1 flex justify-center">
        <RichIcon name={mutiny ? (me.role === 'spy' ? 'spy' : 'iceberg') : me.role === 'cartographer' ? 'compass' : 'mountain-climbing'} metal={mutiny ? 'ruby' : 'steel'} size={44} />
      </div>
      <p className="mt-1 text-center text-[1.05rem] leading-snug">{goal[me.role]}</p>
      {me.allies.length > 0 && (
        <p className="mt-2 text-center">
          {me.role === 'cartographer' ? 'Les Mutins : ' : 'Tes complices : '}
          <strong>{me.allies.map((a) => `${nameOf(a.id)}${me.side === 'mutiny' ? ` (${ROLE_LABEL[a.role]})` : ''}`).join(', ')}</strong>
        </p>
      )}
    </section>
  );
}

// ───────── Actions ─────────

function Actions({
  view,
  actingAs,
  privateView,
  nameOf,
  seatOf,
  team,
  toggle,
  sendMove,
}: {
  view: ExpeditionView;
  actingAs: PlayerId;
  privateView: boolean;
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  team: PlayerId[];
  toggle: (id: PlayerId) => void;
  sendMove: (m: ExpeditionMove) => void;
}) {
  const self = view.players.find((p) => p.id === actingAs);
  if (!self) return null;
  const isLeader = actingAs === view.leader;

  switch (view.phase) {
    case 'reveal':
      return !self.acked && privateView ? (
        <section className="ex-dock">
          <h4>Ton carnet de bord</h4>
          <p className="muted text-center">Mémorise-le bien : personne d’autre ne lira ce carnet.</p>
          <div className="mt-3 flex justify-center">
            <button type="button" className="ex-btn" onClick={() => sendMove({ type: 'ack' })}>
              J’ai retenu mon rôle
            </button>
          </div>
        </section>
      ) : null;

    case 'team': {
      if (!isLeader) return null;
      const size = view.missions[view.mission]!.size;
      return (
        <section className="ex-dock">
          <h4>
            Compose la cordée ({team.length}/{size})
          </h4>
          <p className="muted text-center text-[15px]">Choisis des grimpeurs de confiance : un seul Mutin peut tout faire rater.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {view.players.map((p) => (
              <button key={p.id} type="button" aria-pressed={team.includes(p.id)} onClick={() => toggle(p.id)} className="ex-pick">
                <Hood seat={seatOf(p.id)} size={40} />
                <span className="ex-name !text-[#14304f]">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <button type="button" className="ex-btn warm" disabled={team.length !== size} onClick={() => sendMove({ type: 'propose', team })}>
              Proposer la cordée
            </button>
          </div>
        </section>
      );
    }

    case 'vote':
      if (view.config.votes === 'hands') {
        return isLeader ? <HandsVote view={view} seatOf={seatOf} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
      }
      if (!privateView) return null;
      if (self.voted) {
        return (
          <section className="ex-dock">
            <h4>Bulletin déposé</h4>
            <p className="text-center">
              Tu as voté <strong>{view.me?.myVote ? 'oui' : 'non'}</strong>. On attend les autres…
            </p>
          </section>
        );
      }
      return (
        <section className="ex-dock">
          <h4>Accepter la cordée : {view.team.map(nameOf).join(', ')} ?</h4>
          <div className="mt-3 flex justify-center gap-4">
            {[true, false].map((yes) => (
              <button
                key={String(yes)}
                type="button"
                aria-label={yes ? 'Oui' : 'Non'}
                className={`ex-card ${yes ? 'ok' : 'ko'}`}
                onClick={() => {
                  sfx.knock(0, 0.35);
                  sendMove({ type: 'vote', yes });
                }}
              >
                <RichIcon name={yes ? 'thumb-up' : 'thumb-down'} metal={yes ? 'gold' : 'bone'} size={56} />
                <span className="w">{yes ? 'Oui' : 'Non'}</span>
              </button>
            ))}
          </div>
        </section>
      );

    case 'mission': {
      if (!privateView || !view.team.includes(actingAs)) return null;
      if (view.me?.myCard)
        return (
          <section className="ex-dock">
            <h4>Carte jouée</h4>
            <p className="text-center">On attend le reste de la cordée…</p>
          </section>
        );
      const loyal = view.me?.side === 'expedition';
      return (
        <section className="ex-dock">
          <h4>Ta carte pour « {view.missions[view.mission]?.name} »</h4>
          <div className="mt-3 flex justify-center gap-4">
            <button
              type="button"
              aria-label="Réussite"
              className="ex-card ok"
              onClick={() => {
                sfx.whoosh(0, 0.12);
                sendMove({ type: 'play', card: 'success' });
              }}
            >
              <RichIcon name="flying-flag" metal="gold" size={60} />
              <span className="w">Réussite</span>
            </button>
            <button
              type="button"
              aria-label="Sabotage"
              disabled={loyal}
              className="ex-card ko"
              onClick={() => {
                sfx.whoosh(0, 0.12);
                sendMove({ type: 'play', card: 'sabotage' });
              }}
            >
              <RichIcon name="iceberg" metal="bone" size={60} />
              <span className="w">Sabotage</span>
            </button>
          </div>
          {loyal && <p className="muted mt-2 text-center text-[14px] italic">Un membre loyal de l’expédition joue toujours Réussite.</p>}
        </section>
      );
    }

    case 'spy': {
      if (actingAs !== view.spy) return null;
      const known = new Set(view.me?.allies.map((a) => a.id) ?? []);
      const options = view.players.filter((p) => p.id !== actingAs && !known.has(p.id));
      return <SpyPicker options={options} seatOf={seatOf} onPick={(target) => sendMove({ type: 'unmask', target })} />;
    }

    default:
      return null;
  }
}

function HandsVote({ view, seatOf, onSubmit }: { view: ExpeditionView; seatOf: (id: PlayerId | null) => number; onSubmit: (yes: PlayerId[]) => void }) {
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.team.join()]);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > view.players.length;
  return (
    <section className="ex-dock">
      <h4>Qui a levé la main pour « oui » ?</h4>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {view.players.map((p) => (
          <button key={p.id} type="button" aria-pressed={yes.includes(p.id)} onClick={() => toggle(p.id)} className="ex-pick">
            <Hood seat={seatOf(p.id)} size={38} />
            <span className="ex-name !text-[#14304f]">
              {p.name} {yes.includes(p.id) ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
      <p className="muted mt-2 text-center text-[15px]">
        {yes.length} oui sur {view.players.length} : la cordée serait {passes ? 'acceptée' : 'refusée'}.
      </p>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ex-btn" onClick={() => onSubmit(yes)}>
          Valider le vote
        </button>
      </div>
    </section>
  );
}

function SpyPicker({ options, seatOf, onPick }: { options: ExpeditionPlayerView[]; seatOf: (id: PlayerId | null) => number; onPick: (id: PlayerId) => void }) {
  const [picked, setPicked] = useState<PlayerId | null>(null);
  const name = options.find((p) => p.id === picked)?.name;
  return (
    <section className="ex-dock">
      <h4>Qui est la Cartographe ?</h4>
      <div className="mt-2 flex flex-wrap justify-center gap-1" role="radiogroup" aria-label="Cartographe présumée">
        {options.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={picked === p.id} onClick={() => setPicked(p.id)} className="ex-pick">
            <Hood seat={seatOf(p.id)} size={40} />
            <span className="ex-name !text-[#14304f]">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" className="ex-btn danger" disabled={!picked} onClick={() => picked && onPick(picked)}>
          {name ? `Démasquer ${name}` : 'Choisis un explorateur'}
        </button>
      </div>
    </section>
  );
}

// ───────── Carnet de route et journal ─────────

function History({ view, nameOf }: { view: ExpeditionView; nameOf: NameOf }) {
  const done = view.missions.filter((m) => m.result);
  if (done.length === 0) return null;
  return (
    <section className="rounded-xl border border-[rgba(180,220,255,.3)] bg-[rgba(4,14,28,.72)] px-4 py-3 backdrop-blur-[2px]">
      <h3 className="ex-title text-[15px] uppercase tracking-[0.12em] text-[#bfe3ff]">Carnet de route</h3>
      <ol className="mt-2 flex flex-col gap-1.5">
        {done.map((m) => (
          <li key={m.name} className="flex items-start gap-2">
            <RichIcon name={m.result!.success ? 'flying-flag' : 'iceberg'} metal={m.result!.success ? 'gold' : 'ruby'} size={20} />
            <span>
              <strong className="ex-title text-[14px]">{m.name}</strong> · {m.result!.team.map(nameOf).join(', ')}
              <span className="text-[#9fb8cc]">
                {' '}
                (chef : {nameOf(m.result!.leader)}, {m.result!.sabotages} sabotage{m.result!.sabotages > 1 ? 's' : ''})
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details open={open} className="rounded-xl border border-[rgba(180,220,255,.3)] bg-[rgba(4,14,28,.72)] px-4 py-2.5 backdrop-blur-[2px]">
      <summary className="ex-title cursor-pointer select-none text-[15px] uppercase tracking-[0.12em] text-[#bfe3ff]">Journal de l’expédition</summary>
      <ol className="mt-1 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#eef6ff]' : 'text-[#9fb8cc]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}

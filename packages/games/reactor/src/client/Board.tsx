'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Cinematic, RichIcon, sfx, useAmbient, useOnChange } from '@arcade/tabletop';
import {
  ROLE_LABEL,
  type CardKind,
  type HandCounts,
  type ReactorMove,
  type ReactorPlayerView,
  type ReactorView,
  type Role,
} from '../shared';
import { REACTOR_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<ReactorView, ReactorMove>;

const CARD_FULL: Record<CardKind, string> = {
  rod: 'Barre de contrôle',
  overload: 'Surcharge',
  empty: 'Conduit vide',
};

/** Tension de 0 (calme) à 1 (fusion imminente) : lumière, alarmes et ambiance sonore. */
function tensionOf(view: ReactorView): number {
  if (view.outcome) return view.outcome.winner === 'saboteur' ? 1 : 0;
  const progress = (view.round - 1 + view.cutsThisRound / Math.max(1, view.cutsPerRound)) / view.rounds;
  return Math.min(1, Math.max(0, progress * 0.9));
}

/** Couleur du cœur : cyan, puis ambre, puis rouge. */
function coreColor(t: number): string {
  const lerp = (a: number[], b: number[], k: number) => a.map((v, i) => Math.round(v + (b[i]! - v) * k));
  const [r, g, b] = t < 0.5 ? lerp([88, 243, 255], [255, 181, 71], t * 2) : lerp([255, 181, 71], [255, 68, 51], (t - 0.5) * 2);
  return `rgb(${r},${g},${b})`;
}

export default function ReactorBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const [selected, setSelected] = useState<{ target: PlayerId; slot: number } | null>(null);
  const canCut = view.phase === 'cut' && actingAs !== null && actingAs === view.holder;
  const me = view.me && view.me.id === viewer ? view.me : null;
  const last = view.reveals.at(-1);
  const nameOf = (id: PlayerId) => view.players.find((p) => p.id === id)?.name ?? '?';
  const tension = tensionOf(view);

  // Toute nouvelle ouverture (de n'importe qui) annule une sélection en cours.
  useEffect(() => setSelected(null), [view.reveals.length, view.phase]);

  useAmbient('reactor', tension);
  const [flash, setFlash] = useState<CardKind | null>(null);
  useOnChange(view.reveals.length, (prev) => {
    if (view.reveals.length <= prev || !last) return;
    sfx.clank();
    if (last.kind === 'rod') sfx.chime(0.3);
    if (last.kind === 'overload') {
      sfx.alarm(0.25, 3);
      sfx.boom(0.15);
    }
    if (last.kind === 'empty') sfx.whoosh(0.2, 0.08);
    setFlash(last.kind);
  });
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);
  useOnChange(view.phase, () => {
    if (view.phase === 'over' && view.outcome?.winner === 'tech') sfx.fanfare(0.8);
  });

  return (
    <div className={`rx ${flash === 'overload' ? 'rx-shake' : ''}`} style={{ '--tension': tension } as CSSProperties}>
      <style href="arcade-reactor-v2" precedence="default">
        {REACTOR_CSS}
      </style>
      <div className="rx-wall" />
      <div className="rx-plates" />
      <div className="rx-light" />
      <div className="rx-alarm" />
      <div className="rx-scan" />

      <CoreHeader view={view} tension={tension} />
      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <Terminal view={view} canCut={canCut} mode={mode} actingAs={actingAs} viewer={viewer} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-4 pb-28 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-2 min-w-0 lg:order-1">
          <ul className="grid gap-3 sm:grid-cols-2">
            {view.players.map((p, i) => (
              <Station
                key={p.id}
                index={i}
                player={p}
                view={view}
                isViewer={p.id === viewer}
                cuttable={canCut && p.id !== actingAs}
                selectedSlot={selected?.target === p.id ? selected.slot : null}
                lastSlot={last && last.round === view.round && last.target === p.id ? last.slot : null}
                onPick={(slot) => {
                  sfx.click();
                  setSelected({ target: p.id, slot });
                }}
              />
            ))}
          </ul>
          <Journal lines={view.log} />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          {me && (
            <Badge
              view={view}
              role={me.role}
              hand={me.hand}
              acked={view.players.find((p) => p.id === me.id)?.acked ?? false}
              canAck={actingAs === me.id}
              showClaims={mode === 'online'}
              sendMove={sendMove}
            />
          )}
        </div>
      </div>

      {canCut && selected && (
        <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3">
          <div className="rx-panel rx-rivets flex w-full max-w-xl items-center gap-3 px-4 py-3">
            <RichIcon name="key-card" variant="neon" glow="#ffb547" size={30} />
            <p className="flex-1 text-[15px]">
              Ouvrir cette trappe de <strong className="text-white">{nameOf(selected.target)}</strong> ?
            </p>
            <button type="button" className="rx-btn2" onClick={() => setSelected(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="rx-btn amber"
              onClick={() => {
                sendMove({ type: 'cut', ...selected });
                setSelected(null);
              }}
            >
              Ouvrir
            </button>
          </div>
        </div>
      )}

      <Cinematic trigger={bannerKey(view)} onMount={mode !== 'hotseat'} duration={view.reveals.length && view.phase !== 'reveal' ? 2000 : 2200}>
        <ReactorBanner view={view} nameOf={nameOf} />
      </Cinematic>

      {flash && (
        <div
          className="rx-flash"
          style={{
            background:
              flash === 'overload'
                ? 'radial-gradient(circle at 50% 40%, rgba(255,60,40,.55), rgba(120,0,0,.35) 60%, transparent)'
                : flash === 'rod'
                  ? 'radial-gradient(circle at 50% 40%, rgba(88,243,255,.28), transparent 60%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(255,255,255,.08), transparent 60%)',
          }}
        />
      )}
    </div>
  );
}

// ───────── Annonces ─────────

/** Une nouvelle trappe ouverte, ou une nouvelle manche (le reste du temps, la clé ne change rien). */
function bannerKey(view: ReactorView): string {
  if (view.phase === 'reveal') return `round-${view.round}`;
  return view.reveals.length ? `cut-${view.reveals.length}` : `round-${view.round}`;
}

function ReactorBanner({ view, nameOf }: { view: ReactorView; nameOf: (id: PlayerId) => string }) {
  const last = view.reveals.at(-1);
  if (view.phase === 'reveal' || !last || last.round !== view.round || view.cutsThisRound === 0) {
    if (view.phase !== 'reveal') return null;
    return (
      <div className="rx-banner">
        <div className="k">
          Manche {view.round} sur {view.rounds}
        </div>
        <div className="rx-title rx-glow text-[2rem] sm:text-5xl">{view.round === 1 ? 'Démarrage du cœur' : 'Nouvelles trappes'}</div>
        <div className="s">{view.round === 1 ? 'Chacun découvre son rôle et ses trappes, en secret.' : 'Les trappes encore fermées sont mélangées et redistribuées.'}</div>
      </div>
    );
  }
  const tone = last.kind === 'overload' ? 'rx-redglow' : last.kind === 'rod' ? 'rx-glow' : 'text-[#c9d3de]';
  return (
    <div className="rx-banner">
      <div className="k">
        {nameOf(last.by)} ouvre une trappe de {nameOf(last.target)}
      </div>
      <div className="my-3 flex justify-center">
        <span className="rx-bigcard">
          <OpenHatch kind={last.kind} />
        </span>
      </div>
      <div className={`rx-title text-[2rem] sm:text-5xl ${tone}`}>{last.kind === 'overload' ? 'Surcharge !' : last.kind === 'rod' ? 'Barre de contrôle !' : 'Conduit vide'}</div>
      <div className="s">
        {last.kind === 'rod'
          ? `${view.rodsFound} barre${view.rodsFound > 1 ? 's' : ''} sur ${view.rodsTotal} : le cœur se stabilise.`
          : last.kind === 'overload'
            ? 'Le cœur entre en fusion !'
            : `Ouverture ${view.cutsThisRound} sur ${view.cutsPerRound} de la manche.`}
      </div>
    </div>
  );
}

// ───────── Le cœur du réacteur ─────────

function CoreHeader({ view, tension }: { view: ReactorView; tension: number }) {
  const holder = view.phase === 'over' ? null : (view.players.find((p) => p.id === view.holder)?.name ?? null);
  return (
    <header className="relative px-3 pb-3 pt-[3.75rem] sm:pt-6">
      <div className="rx-title text-center text-[10px] tracking-[0.45em] text-white/55">Station orbitale · Cœur du réacteur</div>
      {/* Téléphone : le cœur à gauche, trois cadrans à droite. Grand écran : cadrans de part et d'autre. */}
      <div className="mt-3 grid grid-cols-[auto_auto] items-center justify-center gap-x-3 gap-y-1.5 sm:grid-cols-[auto_auto_auto] sm:gap-x-10 sm:gap-y-2">
        <div className="col-start-1 row-span-3 row-start-1 sm:col-start-2 sm:row-span-2">
          <Core view={view} tension={tension} />
        </div>
        <Readout label="Manche" value={`${view.round} / ${view.rounds}`} className="col-start-2 row-start-1 sm:col-start-1 sm:self-end" />
        <Readout label="Ouvertures" value={`${view.cutsThisRound} / ${view.cutsPerRound}`} className="col-start-2 row-start-2 sm:col-start-1 sm:self-start" />
        <Readout label="Saboteurs" value={view.saboteursPossible.join(' ou ')} className="col-start-2 row-start-3 sm:col-start-3 sm:row-start-1 sm:self-end" />
        <Readout label="Clé" value={holder ?? '—'} amber className="hidden sm:col-start-3 sm:row-start-2 sm:block sm:self-start" />
      </div>
    </header>
  );
}

function Readout({ label, value, amber = false, className = '' }: { label: string; value: string; amber?: boolean; className?: string }) {
  return (
    <div className={`rx-screen w-[8.5rem] text-center sm:w-[9.5rem] ${className}`}>
      <div className="rx-title text-[9px] tracking-[0.3em] text-white/50">{label}</div>
      <div className={`rx-mono truncate text-lg leading-tight sm:text-xl ${amber ? 'rx-amber' : 'rx-glow'}`}>{value}</div>
    </div>
  );
}

function Core({ view, tension }: { view: ReactorView; tension: number }) {
  const color = coreColor(tension);
  const over = view.phase === 'over';
  const stabilized = view.outcome?.winner === 'tech';
  const n = view.rodsTotal;
  const center = over ? (stabilized ? 'Stabilisé' : 'Fusion') : `${view.rodsFound}/${n}`;
  return (
    <div className="rx-core" style={{ width: 'min(46vw, 250px)', aspectRatio: '1' }} role="img" aria-label={`${view.rodsFound} barres de contrôle sur ${n}`}>
      <svg viewBox="0 0 240 240" width="100%" height="100%">
        <defs>
          <radialGradient id="rx-core-grad" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor={color} />
            <stop offset="1" stopColor="#02080b" />
          </radialGradient>
          <filter id="rx-core-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="rx-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3eaf2" />
            <stop offset="0.5" stopColor="#5d6773" />
            <stop offset="1" stopColor="#c6ced8" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="114" fill="#05090d" stroke="url(#rx-ring)" strokeWidth="8" />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = i % 5 ? 104 : 100;
          return (
            <line
              key={i}
              x1={120 + Math.cos(a) * r1}
              y1={120 + Math.sin(a) * r1}
              x2={120 + Math.cos(a) * 108}
              y2={120 + Math.sin(a) * 108}
              stroke="#6b7682"
              strokeWidth={i % 5 ? 1 : 2}
            />
          );
        })}
        {Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 360 - 90;
          const found = i < view.rodsFound;
          return (
            <g key={i} transform={`rotate(${angle} 120 120)`}>
              <rect
                x={120 + 78}
                y={120 - 6}
                width={18}
                height={12}
                rx={3}
                fill={found ? '#58f3ff' : '#121a22'}
                stroke={found ? '#d6fdff' : '#2b3540'}
                strokeWidth={1.5}
                style={found ? { filter: 'drop-shadow(0 0 6px #58f3ff)' } : undefined}
              />
            </g>
          );
        })}
        <circle className="rx-spin" cx="120" cy="120" r="70" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="3 9" />
        <circle className="rx-spin-rev" cx="120" cy="120" r="62" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="6" strokeDasharray="40 22" />
        <g className="rx-pulse" style={{ transformOrigin: '120px 120px' }}>
          <circle cx="120" cy="120" r="50" fill="url(#rx-core-grad)" filter="url(#rx-core-glow)" />
        </g>
        <text
          x="120"
          y={over ? 126 : 128}
          textAnchor="middle"
          fontFamily="Orbitron, sans-serif"
          fontWeight="800"
          fontSize={over ? 15 : 24}
          fill="#04121a"
          letterSpacing="1"
        >
          {center.toUpperCase()}
        </text>
        {!over && (
          <text x="120" y="146" textAnchor="middle" fontFamily="Orbitron, sans-serif" fontSize="8" fill="#04121a" letterSpacing="3">
            BARRES
          </text>
        )}
      </svg>
    </div>
  );
}

// ───────── Terminal d'instructions ─────────

function Terminal({
  view,
  canCut,
  mode,
  actingAs,
  viewer,
}: {
  view: ReactorView;
  canCut: boolean;
  mode: Props['mode'];
  actingAs: PlayerId | null;
  viewer: PlayerId | null;
}) {
  const holder = view.players.find((p) => p.id === view.holder);
  let text: string;
  let urgent = false;
  if (view.phase === 'reveal') {
    const ready = view.players.filter((p) => p.acked).length;
    const meAcked = view.players.find((p) => p.id === viewer)?.acked;
    text = viewer && !meAcked ? 'Mémorise tes trappes, puis confirme.' : `Chacun découvre ses trappes en secret… ${ready}/${view.players.length} prêts`;
  } else if (view.phase === 'cut') {
    if (canCut) {
      urgent = true;
      const who = view.players.find((p) => p.id === actingAs)?.name;
      text = mode === 'hotseat' ? `${who}, tu as la clé : ouvre une trappe chez un autre joueur.` : 'Tu as la clé : ouvre une trappe chez un autre joueur.';
    } else {
      text = `${holder?.name ?? '?'} a la clé et choisit une trappe…`;
    }
  } else {
    text = view.outcome?.winner === 'tech' ? 'Cœur stabilisé. Rôles et trappes révélés.' : 'Fusion du cœur. Rôles et trappes révélés.';
  }
  return (
    <div className={`rx-screen flex items-center gap-3 px-4 py-3 ${urgent ? 'shadow-[inset_0_0_0_1px_rgba(255,181,71,.7),0_0_24px_rgba(255,181,71,.25)]' : ''}`}>
      <RichIcon name={view.phase === 'cut' ? 'key-card' : 'cpu'} variant="neon" glow={urgent ? '#ffb547' : '#58f3ff'} size={28} />
      <p className={`rx-mono rx-cursor text-[15px] ${urgent ? 'rx-amber' : 'text-[#bff7ff]'}`}>{text}</p>
    </div>
  );
}

// ───────── Badge d'accès (informations secrètes) ─────────

function Badge({
  view,
  role,
  hand,
  acked,
  canAck,
  showClaims,
  sendMove,
}: {
  view: ReactorView;
  role: Role;
  hand: HandCounts;
  acked: boolean;
  canAck: boolean;
  showClaims: boolean;
  sendMove: (m: ReactorMove) => void;
}) {
  const tech = role === 'tech';
  const goal = tech
    ? `Faites ouvrir toutes les Barres de contrôle avant la fin de la manche ${view.rounds}.`
    : `Faites ouvrir la Surcharge, ou tenez jusqu'à la fin de la manche ${view.rounds}.`;
  const cards: CardKind[] = [
    ...Array<CardKind>(hand.rod).fill('rod'),
    ...Array<CardKind>(hand.overload).fill('overload'),
    ...Array<CardKind>(hand.empty).fill('empty'),
  ];
  return (
    <section className="rx-panel rx-rivets p-4">
      <div className="flex items-center gap-3">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-xl"
          style={{
            background: tech ? 'radial-gradient(circle at 40% 30%, #1d6b7a, #071a20)' : 'radial-gradient(circle at 40% 30%, #7a1d14, #1d0605)',
            boxShadow: `inset 0 0 0 2px ${tech ? '#58f3ff' : '#ff4433'}, 0 0 18px ${tech ? 'rgba(88,243,255,.4)' : 'rgba(255,68,51,.45)'}`,
          }}
        >
          <RichIcon name={tech ? 'astronaut-helmet' : 'hooded-figure'} metal={tech ? 'silver' : 'ruby'} size={46} />
        </div>
        <div className="min-w-0">
          <div className="rx-mono text-[11px] tracking-[0.2em] text-white/50">BADGE D’ACCÈS · CONFIDENTIEL</div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm text-white/70">Ton rôle :</span>
            <span className={`rx-title text-lg ${tech ? 'rx-glow' : 'rx-redglow'}`}>{ROLE_LABEL[role]}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[15px] leading-snug text-white/80">{goal}</p>

      <div className="mt-4 text-sm text-white/60">Cette manche, tu as reçu :</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cards.map((k, i) => (
          <OpenHatch key={i} kind={k} small />
        ))}
      </div>
      <p className="rx-mono mt-2 text-sm text-[#bff7ff]">
        {hand.rod} barre{hand.rod > 1 ? 's' : ''}
        {hand.overload > 0 ? ' · la Surcharge' : ''} · {hand.empty} vide{hand.empty > 1 ? 's' : ''}
      </p>
      <p className="mt-1 text-xs text-white/50">Une fois posées, tes trappes sont mélangées : tu ne sais pas laquelle est laquelle.</p>

      {view.phase === 'reveal' && !acked && canAck && (
        <button
          type="button"
          className="rx-btn mt-4 w-full"
          onClick={() => {
            sfx.beep(0, 1318);
            sendMove({ type: 'ack' });
          }}
        >
          J&apos;ai mémorisé
        </button>
      )}
      {view.phase === 'reveal' && acked && <p className="rx-mono mt-4 text-sm text-white/60">En attente des autres postes…</p>}

      {showClaims && view.phase !== 'over' && (
        <ClaimForm handSize={cards.length} current={view.players.find((p) => p.id === view.me?.id)?.claim ?? null} sendMove={sendMove} />
      )}
    </section>
  );
}

function ClaimForm({
  handSize,
  current,
  sendMove,
}: {
  handSize: number;
  current: { rods: number; overload: boolean } | null;
  sendMove: (m: ReactorMove) => void;
}) {
  const [rods, setRods] = useState(current?.rods ?? 0);
  const [overload, setOverload] = useState(current?.overload ?? false);
  const max = handSize - (overload ? 1 : 0);
  useEffect(() => {
    if (rods > max) setRods(Math.max(0, max));
  }, [max, rods]);

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="rx-title text-xs tracking-[0.25em] text-white/80">Annonce publique</div>
      <p className="text-xs text-white/50">Tout le monde la verra. Tu peux mentir.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="rx-screen flex items-center gap-1 px-1 py-1">
          <button type="button" aria-label="Une barre de moins" onClick={() => setRods((r) => Math.max(0, r - 1))} className="h-8 w-8 rounded-md text-lg text-white/70 hover:bg-white/10">
            −
          </button>
          <span className="rx-mono rx-glow min-w-[5.5rem] text-center text-sm">
            {rods} barre{rods > 1 ? 's' : ''}
          </span>
          <button type="button" aria-label="Une barre de plus" onClick={() => setRods((r) => Math.min(max, r + 1))} className="h-8 w-8 rounded-md text-lg text-white/70 hover:bg-white/10">
            +
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={overload} onChange={(e) => setOverload(e.target.checked)} className="h-4 w-4 accent-[#ff4433]" />
          la Surcharge
        </label>
        <button type="button" className="rx-btn2" onClick={() => sendMove({ type: 'claim', rods, overload })}>
          {current ? 'Modifier' : 'Annoncer'}
        </button>
      </div>
    </div>
  );
}

// ───────── Postes et trappes ─────────

function Station({
  player: p,
  index,
  view,
  isViewer,
  cuttable,
  selectedSlot,
  lastSlot,
  onPick,
}: {
  player: ReactorPlayerView;
  index: number;
  view: ReactorView;
  isViewer: boolean;
  cuttable: boolean;
  selectedSlot: number | null;
  lastSlot: number | null;
  onPick: (slot: number) => void;
}) {
  const isHolder = view.holder === p.id && view.phase !== 'over';
  const led = view.phase === 'reveal' ? (p.acked ? 'on' : 'wait') : isHolder ? 'wait' : 'on';
  return (
    <li className={`rx-panel rx-rivets rx-station p-3 ${isHolder ? 'is-key' : isViewer ? 'is-me' : ''}`}>
      {isHolder && <div className="rx-hazard absolute inset-x-6 top-0 h-1.5 rounded-b-sm opacity-90" />}
      <div className="flex min-w-0 items-center gap-2">
        <span className={`rx-led ${led}`} />
        <span className="rx-mono shrink-0 text-[10px] text-white/40">P{String(index + 1).padStart(2, '0')}</span>
        <span className="rx-title truncate text-[13px] text-white">{p.name}</span>
        {isViewer && <Tag tone="cyan">toi</Tag>}
        {p.isBot && <Tag>bot</Tag>}
        {p.role && <Tag tone={p.role === 'tech' ? 'cyan' : 'red'}>{ROLE_LABEL[p.role]}</Tag>}
        {isHolder && (
          <span className="rx-mono rx-amber ml-auto flex shrink-0 items-center gap-1 text-xs" aria-label="détient la clé">
            <RichIcon name="key-card" variant="neon" glow="#ffb547" size={20} /> clé
          </span>
        )}
        {view.phase === 'reveal' && <span className={`rx-mono ml-auto shrink-0 text-xs ${p.acked ? 'text-[#5dff9e]' : 'text-white/45'}`}>{p.acked ? 'prêt' : '…'}</span>}
      </div>
      <div className="rx-screen rx-mono mt-2 min-h-[30px] text-[12.5px] text-[#bff7ff]">
        {p.claim ? (
          <>
            ANNONCE : {p.claim.rods} barre{p.claim.rods > 1 ? 's' : ''}
            {p.claim.overload ? <span className="rx-redglow"> + SURCHARGE</span> : ''}
          </>
        ) : (
          <span className="text-white/35">aucune annonce</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {p.slots.map((kind, i) =>
          kind === null ? (
            <ClosedHatch key={i} clickable={cuttable} selected={selectedSlot === i} label={`Ouvrir une trappe de ${p.name}`} onClick={() => onPick(i)} />
          ) : (
            <OpenHatch key={i} kind={kind} highlight={lastSlot === i} />
          ),
        )}
      </div>
    </li>
  );
}

function Bolts() {
  return (
    <>
      {[
        ['4px', '4px'],
        ['calc(100% - 9px)', '4px'],
        ['4px', 'calc(100% - 9px)'],
        ['calc(100% - 9px)', 'calc(100% - 9px)'],
      ].map(([left, top]) => (
        <span key={`${left}${top}`} className="rx-bolt" style={{ left, top }} />
      ))}
    </>
  );
}

function ClosedHatch({ clickable, selected, label, onClick }: { clickable: boolean; selected: boolean; label: string; onClick: () => void }) {
  if (!clickable) {
    return (
      <div className="rx-hatch" aria-label="Trappe fermée">
        <Bolts />
      </div>
    );
  }
  return (
    <button type="button" className="rx-hatch" aria-label={label} aria-pressed={selected} onClick={onClick}>
      <Bolts />
    </button>
  );
}

function OpenHatch({ kind, highlight = false, small = false }: { kind: CardKind; highlight?: boolean; small?: boolean }) {
  const size = small ? { width: 40, height: 54 } : { width: 54, height: 72 };
  return (
    <div
      className={`relative ${highlight ? 'rx-last' : ''}`}
      style={{ ...size, borderRadius: 10, animation: highlight ? 'rx-open .6s cubic-bezier(.3,1.4,.5,1)' : undefined }}
      title={CARD_FULL[kind]}
      aria-label={CARD_FULL[kind]}
    >
      {kind === 'rod' && (
        <div className="rx-cardface rx-face-rod">
          <span className="rx-rod" style={small ? { height: 26, width: 9 } : undefined} />
          {!small && 'Barre'}
        </div>
      )}
      {kind === 'overload' && (
        <div className="rx-cardface rx-face-overload">
          <RichIcon name="radioactive" variant="neon" glow="#ff4433" size={small ? 24 : 32} />
          {!small && 'Surch.'}
        </div>
      )}
      {kind === 'empty' && (
        <div className="rx-cardface rx-face-empty">
          <EmptyConduit size={small ? 24 : 30} />
          {!small && 'Vide'}
        </div>
      )}
    </div>
  );
}

/** Conduit vide : un hublot sombre, sans rien dedans. */
function EmptyConduit({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#06090d" stroke="#56616d" strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#28313b" strokeWidth="1.5" strokeDasharray="2 2.4" />
      <path d="M7.5 16.5l9-9" stroke="#3d4752" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Tag({ children, tone = 'dim' }: { children: ReactNode; tone?: 'dim' | 'cyan' | 'red' }) {
  const style = {
    dim: 'border-white/20 text-white/55',
    cyan: 'border-[#58f3ff]/50 text-[#9ff9ff]',
    red: 'border-[#ff4433]/60 text-[#ff8a7d]',
  }[tone];
  return <span className={`rx-mono shrink-0 rounded border px-1.5 py-px text-[10px] uppercase tracking-wider ${style}`}>{children}</span>;
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="rx-screen mt-4 px-4 py-3" open>
      <summary className="rx-title cursor-pointer select-none text-[11px] tracking-[0.3em] text-white/60">Registre de la station</summary>
      <ol className="rx-mono mt-2 flex flex-col gap-1 text-[13px]">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#bff7ff]' : 'text-white/45'}>
            › {line}
          </li>
        ))}
      </ol>
    </details>
  );
}

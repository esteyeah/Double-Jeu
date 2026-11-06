'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  ROLE_LABEL,
  type CardKind,
  type HandCounts,
  type ReactorMove,
  type ReactorPlayerView,
  type ReactorView,
  type Role,
} from '../shared';

type Props = BoardProps<ReactorView, ReactorMove>;

export default function ReactorBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const [selected, setSelected] = useState<{ target: PlayerId; slot: number } | null>(null);
  const canCut = view.phase === 'cut' && actingAs !== null && actingAs === view.holder;
  const me = view.me && view.me.id === viewer ? view.me : null;
  const last = view.reveals.at(-1);

  // Toute nouvelle ouverture (de n'importe qui) annule une sélection en cours.
  useEffect(() => setSelected(null), [view.reveals.length, view.phase]);

  const nameOf = (id: PlayerId) => view.players.find((p) => p.id === id)?.name ?? '?';

  return (
    <div className="flex flex-col gap-4">
      <StatusBar view={view} />
      <Instruction view={view} canCut={canCut} mode={mode} actingAs={actingAs} viewer={viewer} />

      {me && (
        <PrivatePanel
          view={view}
          role={me.role}
          hand={me.hand}
          acked={view.players.find((p) => p.id === me.id)?.acked ?? false}
          canAck={actingAs === me.id}
          showClaims={mode === 'online'}
          sendMove={sendMove}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {view.players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            view={view}
            isViewer={p.id === viewer}
            cuttable={canCut && p.id !== actingAs}
            selectedSlot={selected?.target === p.id ? selected.slot : null}
            lastSlot={
              last && last.round === view.round && last.target === p.id ? last.slot : null
            }
            onPick={(slot) => setSelected({ target: p.id, slot })}
          />
        ))}
      </div>

      {canCut && selected && (
        <div className="sticky bottom-3 z-10 flex animate-pop items-center gap-3 rounded-2xl border border-key/50 bg-surface-2/95 p-3 shadow-xl backdrop-blur">
          <p className="flex-1 text-sm">
            Ouvrir cette trappe de <strong>{nameOf(selected.target)}</strong> ?
          </p>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-lg px-3 py-2 text-sm text-muted hover:text-fg"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              sendMove({ type: 'cut', ...selected });
              setSelected(null);
            }}
            className="rounded-lg bg-key px-4 py-2 text-sm font-semibold text-bg hover:brightness-110"
          >
            Ouvrir
          </button>
        </div>
      )}

      <Journal lines={view.log} />
    </div>
  );
}

// ───────── En-tête ─────────

function StatusBar({ view }: { view: ReactorView }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Manche" value={`${view.round} / ${view.rounds}`} />
      <Stat label="Ouvertures" value={`${view.cutsThisRound} / ${view.cutsPerRound}`} />
      <div className="rounded-xl border border-line bg-surface px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-muted">Barres trouvées</div>
        <div className="mt-1 flex items-center gap-1" aria-label={`${view.rodsFound} sur ${view.rodsTotal}`}>
          {Array.from({ length: view.rodsTotal }, (_, i) => (
            <span
              key={i}
              className={`h-3 w-2 rounded-sm ${i < view.rodsFound ? 'bg-tech' : 'bg-line'}`}
            />
          ))}
          <span className="ml-1 text-sm font-semibold tabular-nums">
            {view.rodsFound}/{view.rodsTotal}
          </span>
        </div>
      </div>
      <Stat label="Saboteurs" value={view.saboteursPossible.join(' ou ')} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Instruction({
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
  let tone = 'border-line bg-surface text-fg';
  if (view.phase === 'reveal') {
    const ready = view.players.filter((p) => p.acked).length;
    const meAcked = view.players.find((p) => p.id === viewer)?.acked;
    text =
      viewer && !meAcked
        ? 'Mémorise tes trappes, puis confirme.'
        : `Chacun découvre ses trappes en secret… ${ready}/${view.players.length} prêts`;
  } else if (view.phase === 'cut') {
    if (canCut) {
      tone = 'border-key/50 bg-key/10 text-fg';
      const who = view.players.find((p) => p.id === actingAs)?.name;
      text =
        mode === 'hotseat'
          ? `${who}, tu as la clé : ouvre une trappe chez un autre joueur.`
          : 'Tu as la clé : ouvre une trappe chez un autre joueur.';
    } else {
      text = `${holder?.name ?? '?'} a la clé et choisit une trappe…`;
    }
  } else {
    text = 'Partie terminée : rôles et trappes révélés.';
  }
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      {view.phase === 'cut' && <KeyIcon className="h-4 w-4 shrink-0 text-key" />}
      <span>{text}</span>
    </div>
  );
}

// ───────── Panneau privé ─────────

function PrivatePanel({
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
  const roleColor = role === 'tech' ? 'text-tech border-tech/40' : 'text-sabo border-sabo/40';
  const goal =
    role === 'tech'
      ? `Faites ouvrir toutes les Barres de contrôle avant la fin de la manche ${view.rounds}.`
      : `Faites ouvrir la Surcharge, ou tenez jusqu'à la fin de la manche ${view.rounds}.`;
  const cards: CardKind[] = [
    ...Array<CardKind>(hand.rod).fill('rod'),
    ...Array<CardKind>(hand.overload).fill('overload'),
    ...Array<CardKind>(hand.empty).fill('empty'),
  ];

  return (
    <section className={`animate-pop rounded-2xl border bg-surface-2 p-4 ${roleColor}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm text-muted">Ton rôle :</span>
        <span className="text-xl font-bold">{ROLE_LABEL[role]}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{goal}</p>

      <div className="mt-4 text-sm text-muted">Cette manche, tu as reçu :</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cards.map((k, i) => (
          <Card key={i} kind={k} />
        ))}
      </div>
      <p className="mt-2 text-sm text-fg">
        {hand.rod} barre{hand.rod > 1 ? 's' : ''}
        {hand.overload > 0 ? ' · la Surcharge' : ''} · {hand.empty} vide{hand.empty > 1 ? 's' : ''}
      </p>
      <p className="mt-1 text-xs text-muted">
        Une fois posées, tes trappes sont mélangées : tu ne sais pas laquelle est laquelle.
      </p>

      {view.phase === 'reveal' && !acked && canAck && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'ack' })}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 sm:w-auto"
        >
          J'ai mémorisé
        </button>
      )}
      {view.phase === 'reveal' && acked && (
        <p className="mt-4 text-sm text-muted">En attente des autres joueurs…</p>
      )}

      {showClaims && view.phase !== 'over' && (
        <ClaimForm
          handSize={cards.length}
          current={view.players.find((p) => p.id === view.me?.id)?.claim ?? null}
          sendMove={sendMove}
        />
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
    <div className="mt-4 border-t border-line pt-4 text-fg">
      <div className="text-sm font-semibold">Annonce publique</div>
      <p className="text-xs text-muted">Tout le monde la verra. Tu peux mentir.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-line">
          <button
            type="button"
            aria-label="Une barre de moins"
            onClick={() => setRods((r) => Math.max(0, r - 1))}
            className="px-3 py-2 text-lg leading-none text-muted hover:text-fg"
          >
            −
          </button>
          <span className="min-w-20 text-center text-sm tabular-nums">
            {rods} barre{rods > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            aria-label="Une barre de plus"
            onClick={() => setRods((r) => Math.min(max, r + 1))}
            className="px-3 py-2 text-lg leading-none text-muted hover:text-fg"
          >
            +
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overload}
            onChange={(e) => setOverload(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-sabo)]"
          />
          la Surcharge
        </label>
        <button
          type="button"
          onClick={() => sendMove({ type: 'claim', rods, overload })}
          className="rounded-lg border border-accent/60 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          {current ? 'Modifier' : 'Annoncer'}
        </button>
      </div>
    </div>
  );
}

// ───────── Joueurs et trappes ─────────

function PlayerRow({
  player: p,
  view,
  isViewer,
  cuttable,
  selectedSlot,
  lastSlot,
  onPick,
}: {
  player: ReactorPlayerView;
  view: ReactorView;
  isViewer: boolean;
  cuttable: boolean;
  selectedSlot: number | null;
  lastSlot: number | null;
  onPick: (slot: number) => void;
}) {
  const isHolder = view.holder === p.id && view.phase !== 'over';
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isHolder ? 'border-key/60 bg-key/5' : 'border-line bg-surface'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isHolder && <KeyIcon className="h-4 w-4 shrink-0 text-key" aria-label="détient la clé" />}
        <span className="truncate font-semibold">{p.name}</span>
        {isViewer && <Tag className="border-accent/50 text-accent">toi</Tag>}
        {p.isBot && <Tag>bot</Tag>}
        {p.role && (
          <Tag className={p.role === 'tech' ? 'border-tech/50 text-tech' : 'border-sabo/50 text-sabo'}>
            {ROLE_LABEL[p.role]}
          </Tag>
        )}
        {view.phase === 'reveal' && (
          <span className={`ml-auto shrink-0 text-xs ${p.acked ? 'text-good' : 'text-muted'}`}>
            {p.acked ? '✓ prêt' : '…'}
          </span>
        )}
      </div>
      <div className="mt-0.5 min-h-4 text-xs text-muted">
        {p.claim &&
          `Annonce : ${p.claim.rods} barre${p.claim.rods > 1 ? 's' : ''}${
            p.claim.overload ? ' + Surcharge' : ''
          }`}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {p.slots.map((kind, i) =>
          kind === null ? (
            <FaceDown
              key={i}
              clickable={cuttable}
              selected={selectedSlot === i}
              label={`Ouvrir une trappe de ${p.name}`}
              onClick={() => onPick(i)}
            />
          ) : (
            <Card key={i} kind={kind} highlight={lastSlot === i} />
          ),
        )}
      </div>
    </div>
  );
}

const CARD_STYLE: Record<CardKind, string> = {
  rod: 'border-tech/70 bg-tech/15 text-tech',
  overload: 'border-sabo bg-sabo/20 text-sabo',
  empty: 'border-line bg-surface-2 text-muted',
};
const CARD_SHORT: Record<CardKind, string> = { rod: 'Barre', overload: 'Surch.', empty: 'Vide' };
const CARD_FULL: Record<CardKind, string> = {
  rod: 'Barre de contrôle',
  overload: 'Surcharge',
  empty: 'Conduit vide',
};

function Card({ kind, highlight = false }: { kind: CardKind; highlight?: boolean }) {
  return (
    <div
      title={CARD_FULL[kind]}
      aria-label={CARD_FULL[kind]}
      className={`flex h-16 w-11 animate-reveal flex-col items-center justify-center gap-1 rounded-lg border-2 ${
        CARD_STYLE[kind]
      } ${highlight ? 'ring-2 ring-key ring-offset-2 ring-offset-bg' : ''}`}
    >
      {kind === 'rod' && <RodIcon className="h-6 w-6" />}
      {kind === 'overload' && <OverloadIcon className="h-6 w-6" />}
      {kind === 'empty' && <EmptyIcon className="h-5 w-5" />}
      <span className="text-[9px] font-semibold uppercase tracking-wide">{CARD_SHORT[kind]}</span>
    </div>
  );
}

function FaceDown({
  clickable,
  selected,
  label,
  onClick,
}: {
  clickable: boolean;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  const base =
    'flex h-16 w-11 items-center justify-center rounded-lg border-2 bg-[linear-gradient(135deg,#1d2640,#151c30)] text-line';
  if (!clickable) {
    return (
      <div className={`${base} border-line`} aria-label="Trappe fermée">
        <HexIcon className="h-5 w-5" />
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={`${base} cursor-pointer transition hover:-translate-y-0.5 hover:border-key/70 hover:text-key ${
        selected ? '-translate-y-1 border-key text-key shadow-[0_0_0_3px_rgba(246,189,74,0.25)]' : 'border-line'
      }`}
    >
      <HexIcon className="h-5 w-5" />
    </button>
  );
}

function Tag({ children, className = 'border-line text-muted' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm" open>
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Journal
      </summary>
      <ol className="mt-2 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-fg' : 'text-muted'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}

// ───────── Icônes ─────────

type IconProps = React.SVGProps<SVGSVGElement>;

function RodIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="9" y="3" width="6" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h6" />
    </svg>
  );
}

function OverloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17v.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="3 3" {...props}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function HexIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function KeyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M14 9l2 2" strokeLinecap="round" />
    </svg>
  );
}

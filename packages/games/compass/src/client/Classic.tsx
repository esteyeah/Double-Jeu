'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  CLUE_MAX,
  PERFECT,
  SLOTS,
  SLOT_LABEL,
  WINDS,
  WIND_LABEL,
  pairFor,
  rating,
  wordAt,
  type Card,
  type CompassMove,
  type CompassView,
  type Placement,
  type Rot,
  type Side,
  type Slot,
  type Wind,
} from '../shared';

type Props = BoardProps<CompassView, CompassMove>;
type NameOf = (id: PlayerId | null) => string;

/** Côtés extérieurs de chaque emplacement (ceux que relient les indices). */
const OUTER: Record<Slot, Side[]> = { 0: [0, 3], 1: [0, 1], 2: [1, 2], 3: [2, 3] };

export default function CompassBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const privateView = viewer !== null && viewer === actingAs;
  const hotseatName = mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ` : '';

  return (
    <div className="flex flex-col gap-4">
      <Header view={view} nameOf={nameOf} />
      {view.phase === 'write' && view.mine && privateView && (
        <WritePanel mine={view.mine} title={`${hotseatName}écris tes quatre indices`} sendMove={sendMove} />
      )}
      {view.phase === 'write' && !(view.mine && privateView) && <Waiting view={view} nameOf={nameOf} />}
      {(view.phase === 'guess' || view.phase === 'reveal') && view.current && (
        <GuessPanel view={view} current={view.current} actingAs={actingAs} nameOf={nameOf} sendMove={sendMove} />
      )}
      {view.phase === 'over' && <Scores view={view} nameOf={nameOf} />}
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── En-tête ─────────

function Header({ view, nameOf }: { view: CompassView; nameOf: NameOf }) {
  const owner = view.current?.owner ?? null;
  const step =
    view.phase === 'write'
      ? 'Indices'
      : view.phase === 'over'
        ? 'Terminé'
        : `${Math.min(view.index + 1, view.order.length)} / ${view.order.length}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Boussole" value={step} />
        <Stat label="De" value={owner ? nameOf(owner) : '—'} />
        <Stat label="Score d’équipe" value={`${view.total} / ${view.max}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="truncate text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="truncate font-semibold tabular-nums">{value}</div>
    </div>
  );
}

// ───────── Cartes et boussole ─────────

function CardTile({
  card,
  rot,
  outer = [],
  tone = 'idle',
}: {
  card: Card;
  rot: Rot;
  outer?: Side[];
  tone?: 'idle' | 'selected' | 'good' | 'bad';
}) {
  const style = {
    idle: 'border-line bg-surface-2',
    selected: 'border-accent bg-accent/10 ring-2 ring-accent/50',
    good: 'border-good bg-good/10',
    bad: 'border-sabo bg-sabo/10',
  }[tone];
  const word = (side: Side) => (
    <span className={outer.includes(side) ? 'font-bold text-fg' : 'text-muted'}>{wordAt(card, rot, side)}</span>
  );
  // Les mots des côtés sont tournés vers l'extérieur ; la rotation ne change pas la mise en page.
  const flat = 'absolute inset-x-4 truncate text-center tracking-tight';
  const side = 'absolute inset-y-0 flex w-4 items-center justify-center';
  return (
    <div className={`relative aspect-square w-full overflow-hidden rounded-xl border-2 text-[10px] uppercase leading-snug sm:text-xs ${style}`}>
      <span className={`${flat} top-1`}>{word(0)}</span>
      <span className={`${side} right-0.5`}>
        <span className="rotate-90 whitespace-nowrap tracking-tight">{word(1)}</span>
      </span>
      <span className={`${flat} bottom-1`}>{word(2)}</span>
      <span className={`${side} left-0.5`}>
        <span className="-rotate-90 whitespace-nowrap tracking-tight">{word(3)}</span>
      </span>
    </div>
  );
}

function ClueLabel({ wind, text, vertical = false }: { wind: Wind; text: string | null; vertical?: boolean }) {
  const content = (
    <>
      <span className="text-[9px] uppercase tracking-wide text-muted">{WIND_LABEL[wind]}</span>
      <span className={`font-bold uppercase ${text ? 'text-key' : 'text-muted'}`}>{text || '?'}</span>
    </>
  );
  if (!vertical) {
    return (
      <div className="flex min-w-0 items-center justify-center gap-1 truncate rounded-lg border border-key/40 bg-key/5 px-2 py-1">
        {content}
      </div>
    );
  }
  return (
    <div className="relative flex h-full items-center justify-center rounded-lg border border-key/40 bg-key/5">
      <div className={`flex items-center gap-1 whitespace-nowrap ${wind === 3 ? '-rotate-90' : 'rotate-90'}`}>{content}</div>
    </div>
  );
}

/** La boussole : quatre emplacements en carré, un indice sur chaque bord. */
function Frame({ clues, slot }: { clues: (string | null)[]; slot: (s: Slot) => ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-md grid-cols-[1.75rem_1fr_1fr_1.75rem] items-stretch gap-1.5 sm:grid-cols-[2.25rem_1fr_1fr_2.25rem]">
      <div />
      <div className="col-span-2">
        <ClueLabel wind={0} text={clues[0] ?? null} />
      </div>
      <div />
      <div className="row-span-2">
        <ClueLabel wind={3} text={clues[3] ?? null} vertical />
      </div>
      <div>{slot(0)}</div>
      <div>{slot(1)}</div>
      <div className="row-span-2">
        <ClueLabel wind={1} text={clues[1] ?? null} vertical />
      </div>
      <div>{slot(3)}</div>
      <div>{slot(2)}</div>
      <div />
      <div className="col-span-2">
        <ClueLabel wind={2} text={clues[2] ?? null} />
      </div>
      <div />
    </div>
  );
}

// ───────── Écriture des indices ─────────

function WritePanel({
  mine,
  title,
  sendMove,
}: {
  mine: NonNullable<CompassView['mine']>;
  title: string;
  sendMove: (m: CompassMove) => void;
}) {
  const [clues, setClues] = useState(['', '', '', '']);
  const card = (id: number) => mine.cards.find((c) => c.id === id)!;
  const done = !!mine.clues;
  const shown = done ? mine.clues! : clues;
  const ready = clues.every((c) => c.trim().length > 0 && !/\s/.test(c.trim()));

  return (
    <section className="animate-pop flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="font-semibold first-letter:uppercase">{done ? 'Tes indices sont envoyés' : title}</h4>
      <Frame
        clues={shown.map((c) => c.trim() || null)}
        slot={(s) => {
          const p = mine.layout[s]!;
          return <CardTile card={card(p.card)} rot={p.rot} outer={OUTER[s]} />;
        }}
      />
      {!done && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) sendMove({ type: 'clues', clues: clues.map((c) => c.trim()) as [string, string, string, string] });
          }}
        >
          {WINDS.map((wind) => {
            const [a, b] = pairFor(mine.cards, mine.layout, wind);
            return (
              <label key={wind} className="flex flex-col gap-1 text-sm">
                <span className="text-muted">
                  {WIND_LABEL[wind]} : <strong className="uppercase text-fg">{a}</strong> +{' '}
                  <strong className="uppercase text-fg">{b}</strong>
                </span>
                <input
                  value={clues[wind]}
                  maxLength={CLUE_MAX}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label={`Indice ${WIND_LABEL[wind]}`}
                  onChange={(e) => setClues((c) => c.map((x, i) => (i === wind ? e.target.value : x)))}
                  placeholder="un seul mot"
                  className="w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
                />
              </label>
            );
          })}
          <p className="text-xs text-muted">Un seul mot par indice, sans espace, et aucun mot de tes cartes.</p>
          <button
            type="submit"
            disabled={!ready}
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
          >
            Valider mes indices
          </button>
        </form>
      )}
    </section>
  );
}

function Waiting({ view, nameOf }: { view: CompassView; nameOf: NameOf }) {
  const missing = view.players.filter((p) => !p.wrote);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <p>Chacun écrit ses indices en secret…</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {view.players.map((p) => (
          <li
            key={p.id}
            className={`rounded-lg border px-2 py-1 text-xs ${p.wrote ? 'border-good/60 text-good' : 'border-line text-muted'}`}
          >
            {nameOf(p.id)} {p.wrote ? '✓' : '…'}
          </li>
        ))}
      </ul>
      {missing.length > 0 && <p className="mt-2 text-xs text-muted">En attente : {missing.map((p) => p.name).join(', ')}</p>}
    </section>
  );
}

// ───────── Reconstitution ─────────

function GuessPanel({
  view,
  current,
  actingAs,
  nameOf,
  sendMove,
}: {
  view: CompassView;
  current: NonNullable<CompassView['current']>;
  actingAs: PlayerId | null;
  nameOf: NameOf;
  sendMove: (m: CompassMove) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setSelected(null), [view.index, current.attempt, view.phase]);

  const reveal = view.phase === 'reveal';
  const isOwner = actingAs === current.owner;
  const canEdit = !reveal && !!actingAs && !isOwner;
  const card = (id: number) => current.cards.find((c) => c.id === id)!;
  const slotOf = (id: number) => SLOTS.find((s) => current.board[s] === id) ?? null;
  const isLocked = (id: number) => {
    const s = slotOf(id);
    return s !== null && current.locked[s]!;
  };
  const pool = current.cards.filter((c) => slotOf(c.id) === null);
  const filled = current.board.every((c) => c !== null);

  const tapSlot = (s: Slot) => {
    if (!canEdit || current.locked[s]) return;
    const here = current.board[s] ?? null;
    if (selected !== null && selected !== here) {
      sendMove({ type: 'place', card: selected, slot: s });
      setSelected(null);
    } else if (here !== null) {
      setSelected(selected === here ? null : here);
    }
  };

  const solutionAt = (s: Slot): Placement | null => current.solution?.[s] ?? null;

  return (
    <section className="animate-pop flex flex-col gap-4 rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <div>
        <h4 className="font-semibold">
          {reveal
            ? `Boussole de ${nameOf(current.owner)} : ${current.score} point${(current.score ?? 0) > 1 ? 's' : ''}`
            : `Boussole de ${nameOf(current.owner)} — essai ${current.attempt} sur 2`}
        </h4>
        <p className="mt-1 text-xs text-muted">
          {reveal
            ? current.score === PERFECT
              ? 'Du premier coup !'
              : 'Voici la disposition d’origine.'
            : isOwner
              ? 'C’est ta boussole : interdit de parler, regarde ton équipe chercher !'
              : current.attempt === 2
                ? 'Les cartes en vert sont bien placées ; les autres ont été retirées. Dernier essai !'
                : 'Touchez une carte puis un emplacement pour l’y poser ; « Tourner » change son sens.'}
        </p>
      </div>

      <Frame
        clues={current.clues}
        slot={(s) => {
          if (reveal) {
            const sol = solutionAt(s)!;
            return <CardTile card={card(sol.card)} rot={sol.rot} outer={OUTER[s]} tone="good" />;
          }
          const id = current.board[s] ?? null;
          const label = `Emplacement ${SLOT_LABEL[s]}`;
          return (
            <button
              type="button"
              aria-label={id === null ? label : `${label} : ${card(id).words.join(', ')}`}
              onClick={() => tapSlot(s)}
              disabled={!canEdit}
              className="block w-full rounded-xl disabled:cursor-default"
            >
              {id === null ? (
                <div
                  className={`flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed text-[10px] uppercase ${
                    current.missed.includes(s) ? 'border-sabo/60 text-sabo' : 'border-line text-muted'
                  } ${selected !== null && canEdit ? 'border-accent/70 text-accent' : ''}`}
                >
                  {SLOT_LABEL[s]}
                </div>
              ) : (
                <CardTile
                  card={card(id)}
                  rot={current.rotations[id] ?? 0}
                  outer={OUTER[s]}
                  tone={current.locked[s] ? 'good' : selected === id ? 'selected' : 'idle'}
                />
              )}
            </button>
          );
        }}
      />

      {!reveal && (
        <>
          {canEdit && selected !== null && !isLocked(selected) && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-muted">Carte choisie : touche un emplacement</span>
              <button
                type="button"
                onClick={() => sendMove({ type: 'rotate', card: selected })}
                className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-accent"
              >
                ↻ Tourner
              </button>
              {slotOf(selected) !== null && (
                <button
                  type="button"
                  onClick={() => {
                    sendMove({ type: 'clear', slot: slotOf(selected)! });
                    setSelected(null);
                  }}
                  className="rounded-lg border border-line px-3 py-1.5 hover:border-sabo"
                >
                  Retirer
                </button>
              )}
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Cartes à placer ({pool.length}) — {view.config.decoys > 1 ? 'deux sont des leurres' : 'une est un leurre'}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pool.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canEdit}
                  aria-label={`Carte : ${c.words.join(', ')}`}
                  aria-pressed={selected === c.id}
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  className="block rounded-xl disabled:cursor-default"
                >
                  <CardTile card={c} rot={current.rotations[c.id] ?? 0} tone={selected === c.id ? 'selected' : 'idle'} />
                </button>
              ))}
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              disabled={!filled}
              onClick={() => sendMove({ type: 'submit' })}
              className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
            >
              {filled ? `Valider (essai ${current.attempt} sur 2)` : 'Placez une carte sur chaque emplacement'}
            </button>
          )}
          {isOwner && current.solution && (
            <details className="rounded-xl border border-line bg-surface p-3 text-sm">
              <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
                Ta disposition (pour toi seul)
              </summary>
              <div className="mt-3">
                <Frame
                  clues={current.clues}
                  slot={(s) => {
                    const sol = current.solution![s]!;
                    return <CardTile card={card(sol.card)} rot={sol.rot} outer={OUTER[s]} />;
                  }}
                />
              </div>
            </details>
          )}
        </>
      )}

      {reveal && actingAs && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'next' })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110"
        >
          {view.index + 1 >= view.order.length ? 'Voir le score final' : 'Boussole suivante'}
        </button>
      )}
    </section>
  );
}

// ───────── Fin de partie ─────────

function Scores({ view, nameOf }: { view: CompassView; nameOf: NameOf }) {
  return (
    <section className="rounded-2xl border border-key/50 bg-surface-2 p-4">
      <div className="text-3xl font-black tabular-nums">
        {view.total} <span className="text-lg font-semibold text-muted">/ {view.max}</span>
      </div>
      <p className="mt-1 text-sm">{rating(view.total, view.max)}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {view.order.map((id) => {
          const p = view.players.find((x) => x.id === id)!;
          return (
            <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span className="min-w-[5rem] flex-1 truncate">Boussole de {nameOf(id)}</span>
              <span className={`font-bold tabular-nums ${p.score === PERFECT ? 'text-good' : ''}`}>
                {p.score ?? 0} / {PERFECT}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
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

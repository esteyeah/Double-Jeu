'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  FACES,
  FACE_NAME,
  bidText,
  countFace,
  minQuantity,
  wild,
  type CupsMove,
  type CupsView,
  type Face,
  type Reveal,
} from '../shared';

type Props = BoardProps<CupsView, CupsMove>;
type NameOf = (id: PlayerId | null) => string;

export default function CupsBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);
  const hotseatName = mode === 'hotseat' && actor ? `${actor.name}, ` : '';

  return (
    <div className="flex flex-col gap-4">
      <Header view={view} nameOf={nameOf} />
      <Banner view={view} nameOf={nameOf} actingAs={actingAs} />
      {view.phase === 'bid' && <CurrentBid view={view} nameOf={nameOf} />}

      {me && privateView && view.phase === 'bid' && <MyCup dice={me.dice} view={view} />}
      {view.phase === 'bid' && actor && !actor.out && actingAs === view.active && privateView && me && (
        <BidPanel view={view} title={`${hotseatName}à toi d’enchérir`} sendMove={sendMove} />
      )}
      {view.reveal && view.phase !== 'bid' && (
        <RevealPanel
          view={view}
          reveal={view.reveal}
          nameOf={nameOf}
          canContinue={view.phase === 'reveal' && actingAs === view.starter}
          onNext={() => sendMove({ type: 'next' })}
        />
      )}

      <Table view={view} viewer={viewer} nameOf={nameOf} />
      <Reference view={view} />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── Dés ─────────

const PIPS: Record<Face, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const DIE_SIZE = { sm: 'h-6 w-6 p-[3px] rounded-md', md: 'h-10 w-10 p-1.5 rounded-lg', lg: 'h-12 w-12 p-2 rounded-xl' };
const PIP_SIZE = { sm: 'h-1 w-1', md: 'h-1.5 w-1.5', lg: 'h-2 w-2' };

function Die({ face, size = 'md', hit = false, dim = false }: { face: Face; size?: keyof typeof DIE_SIZE; hit?: boolean; dim?: boolean }) {
  const ace = face === 1;
  return (
    <span
      role="img"
      aria-label={FACE_NAME[face]}
      className={`inline-grid shrink-0 grid-cols-3 grid-rows-3 border-2 transition ${DIE_SIZE[size]} ${
        hit ? 'border-good bg-good/15' : ace ? 'border-key/70 bg-key/10' : 'border-line bg-fg/90'
      } ${dim ? 'opacity-35' : ''}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {PIPS[face].includes(i) && (
            <span className={`rounded-full ${PIP_SIZE[size]} ${hit ? 'bg-good' : ace ? 'bg-key' : 'bg-bg'} ${ace && size !== 'sm' ? 'scale-150' : ''}`} />
          )}
        </span>
      ))}
    </span>
  );
}

/** Un dé caché sous un gobelet. */
function Hidden({ size = 'sm' }: { size?: keyof typeof DIE_SIZE }) {
  return <span className={`inline-block shrink-0 border border-line bg-[linear-gradient(135deg,#1d2640,#151c30)] ${DIE_SIZE[size]}`} />;
}

// ───────── En-tête ─────────

function Header({ view, nameOf }: { view: CupsView; nameOf: NameOf }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Manche" value={`${view.round}`} />
      <Stat label="Dés en jeu" value={`${view.totalDice}`} />
      <Stat label={view.phase === 'bid' ? 'Au tour de' : 'Relance'} value={view.phase === 'over' ? '—' : nameOf(view.phase === 'bid' ? view.active : view.starter)} />
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

function Banner({ view, nameOf, actingAs }: { view: CupsView; nameOf: NameOf; actingAs: PlayerId | null }) {
  let text: string;
  if (view.phase === 'bid') {
    const who = actingAs === view.active ? 'À toi' : nameOf(view.active);
    text = view.bid
      ? `${who} : surenchérir${view.config.exact ? ', crier « Menteur ! » ou « Pile ! »' : ' ou crier « Menteur ! »'}.`
      : `${who} : ouvre la manche avec une première enchère.`;
  } else if (view.phase === 'reveal') {
    text = 'Gobelets levés ! Regardez les dés avant la manche suivante.';
  } else {
    text = `${nameOf(view.winner)} est le dernier à garder des dés.`;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-key/40 bg-key/5 px-4 py-3 text-sm">{text}</div>
      {view.dry && view.phase === 'bid' && (
        <div className="rounded-xl border border-sabo/50 bg-sabo/5 px-4 py-2 text-sm text-sabo">
          Manche sèche : les As ne sont pas jokers{view.bid ? ` et la valeur reste ${FACE_NAME[view.bid.face]}` : ''}.
        </div>
      )}
    </div>
  );
}

function CurrentBid({ view, nameOf }: { view: CupsView; nameOf: NameOf }) {
  const bid = view.bid;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Enchère en cours</div>
      {bid ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-3xl font-bold tabular-nums">{bid.quantity} ×</span>
          <Die face={bid.face} size="lg" />
          <span className="min-w-0 text-sm text-muted">
            par {nameOf(bid.by)}
            {wild(bid.face, view.dry) && <span className="block text-xs">As compris</span>}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Pas encore d’enchère dans cette manche.</p>
      )}
      {view.history.length > 1 && (
        <p className="mt-2 text-xs text-muted">
          Avant : {view.history.slice(0, -1).map((b) => `${nameOf(b.by)} ${bidText(b)}`).join(' · ')}
        </p>
      )}
    </section>
  );
}

// ───────── Mon gobelet ─────────

function MyCup({ dice, view }: { dice: Face[]; view: CupsView }) {
  const bid = view.bid;
  const matches = (d: Face) => !!bid && (d === bid.face || (d === 1 && wild(bid.face, view.dry)));
  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <div className="text-sm text-muted">Sous ton gobelet (secret) :</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {dice.map((d, i) => (
          <Die key={i} face={d} size="lg" hit={matches(d)} />
        ))}
      </div>
      {bid && (
        <p className="mt-2 text-xs text-muted">
          Tu en as {countFace(dice, bid.face, view.dry)} pour l’enchère en cours ; {view.totalDice - dice.length} dés sont cachés chez les autres.
        </p>
      )}
    </section>
  );
}

// ───────── Enchérir ─────────

function BidPanel({ view, title, sendMove }: { view: CupsView; title: string; sendMove: (m: CupsMove) => void }) {
  const bid = view.bid;
  const [face, setFace] = useState<Face | null>(null);
  const [quantity, setQuantity] = useState(1);
  // En manche sèche, la valeur est imposée : on part directement de la quantité minimale.
  const lockedFace = view.dry && bid ? bid.face : null;
  const lockedMin = lockedFace ? minQuantity(bid, lockedFace, true) : null;
  useEffect(() => {
    setFace(lockedFace);
    setQuantity(lockedMin ?? 1);
  }, [view.history.length, view.round, lockedFace, lockedMin]);

  const min = face === null ? null : minQuantity(bid, face, view.dry);
  const legal = min !== null && quantity >= min && quantity <= view.totalDice;

  const pick = (f: Face) => {
    const m = minQuantity(bid, f, view.dry);
    if (m === null || m > view.totalDice) return;
    setFace(f);
    setQuantity((q) => Math.min(view.totalDice, Math.max(q, m)));
  };

  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="font-semibold first-letter:uppercase">{title}</h4>
      <div className="mt-3 text-xs text-muted">Valeur :</div>
      <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Valeur">
        {FACES.map((f) => {
          const m = minQuantity(bid, f, view.dry);
          const disabled = m === null || m > view.totalDice;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={face === f}
              aria-label={FACE_NAME[f]}
              disabled={disabled}
              onClick={() => pick(f)}
              className={`rounded-xl p-1 disabled:opacity-25 ${face === f ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
            >
              <Die face={f} />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted">Quantité :</span>
        <button
          type="button"
          aria-label="Moins"
          disabled={face === null || min === null || quantity <= min}
          onClick={() => setQuantity((q) => q - 1)}
          className="h-10 w-10 rounded-xl border border-line text-lg font-bold disabled:opacity-30"
        >
          −
        </button>
        <span className="w-10 text-center text-2xl font-bold tabular-nums" aria-live="polite">
          {face === null ? '–' : quantity}
        </span>
        <button
          type="button"
          aria-label="Plus"
          disabled={face === null || quantity >= view.totalDice}
          onClick={() => setQuantity((q) => q + 1)}
          className="h-10 w-10 rounded-xl border border-line text-lg font-bold disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={!legal}
          onClick={() => face && sendMove({ type: 'bid', quantity, face })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
        >
          {face ? `Annoncer ${bidText({ quantity, face })}` : 'Choisis une valeur'}
        </button>
        {bid && (
          <button
            type="button"
            onClick={() => sendMove({ type: 'liar' })}
            className="rounded-xl bg-sabo px-4 py-3 font-bold text-bg hover:brightness-110"
          >
            Menteur !
          </button>
        )}
        {bid && view.config.exact && (
          <button
            type="button"
            onClick={() => sendMove({ type: 'exact' })}
            className="rounded-xl border border-good/60 px-4 py-3 font-bold text-good hover:bg-good/10"
          >
            Pile !
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {!bid
          ? view.dry
            ? 'Manche sèche : la valeur choisie à l’ouverture ne changera plus.'
            : 'On ne peut pas ouvrir sur les As.'
          : view.dry
            ? 'Manche sèche : on ne peut que monter la quantité.'
            : bid.face === 1
              ? `Quitter les As : il faut au moins ${bid.quantity * 2 + 1} dés.`
              : `Passer aux As : ${Math.ceil(bid.quantity / 2)} suffisent.`}
      </p>
    </section>
  );
}

// ───────── Révélation ─────────

function RevealPanel({
  view,
  reveal,
  nameOf,
  canContinue,
  onNext,
}: {
  view: CupsView;
  reveal: Reveal;
  nameOf: NameOf;
  canContinue: boolean;
  onNext: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.revealUntil) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view.revealUntil]);
  const left = view.revealUntil ? Math.max(0, Math.ceil((view.revealUntil - now) / 1000)) : null;
  const bid = reveal.bid;
  const hit = (d: Face) => d === bid.face || (d === 1 && wild(bid.face, reveal.dry));
  const held = bid.quantity <= reveal.count;

  let verdict: string;
  if (reveal.call === 'liar') {
    verdict = held
      ? `L’enchère tenait : ${nameOf(reveal.caller)} perd un dé.`
      : `${nameOf(bid.by)} bluffait : un dé de perdu.`;
  } else {
    verdict =
      reveal.count === bid.quantity
        ? `Pile ! ${reveal.gainer ? `${nameOf(reveal.caller)} regagne un dé.` : `Bien vu (${nameOf(reveal.caller)} a déjà tous ses dés).`}`
        : `Raté : ${nameOf(reveal.caller)} perd un dé.`;
  }

  return (
    <section className="animate-pop rounded-2xl border border-key/50 bg-surface-2 p-4">
      <h4 className="font-semibold">
        {nameOf(reveal.caller)} : « {reveal.call === 'liar' ? 'Menteur !' : 'Pile !'} » sur {bidText(bid)} de {nameOf(bid.by)}
      </h4>
      <ul className="mt-3 flex flex-col gap-1.5">
        {view.players
          .filter((p) => reveal.dice[p.id]?.length)
          .map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-sm">{p.name}</span>
              <span className="flex flex-wrap gap-1">
                {reveal.dice[p.id]!.map((d, i) => (
                  <Die key={i} face={d} size="sm" hit={hit(d)} dim={!hit(d)} />
                ))}
              </span>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-lg font-semibold">
        Il y en avait <span className={held ? 'text-good' : 'text-sabo'}>{reveal.count}</span> pour {bid.quantity} annoncés
        {wild(bid.face, reveal.dry) ? ' (As compris)' : ''}.
      </p>
      <p className="text-sm">{verdict}</p>
      {view.phase === 'reveal' &&
        (canContinue ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 sm:w-auto"
          >
            Secouer les gobelets : manche suivante
          </button>
        ) : (
          <p className="mt-3 text-xs text-muted">
            {nameOf(view.starter)} ouvre la manche suivante{left !== null ? ` (dans ${left} s)` : '…'}
          </p>
        ))}
    </section>
  );
}

// ───────── Table ─────────

function Table({ view, viewer, nameOf }: { view: CupsView; viewer: PlayerId | null; nameOf: NameOf }) {
  const lastBid = (id: PlayerId) => [...view.history].reverse().find((b) => b.by === id);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">La table</div>
      <ul className="mt-2 flex flex-col gap-2">
        {view.players.map((p) => {
          const b = view.phase === 'bid' ? lastBid(p.id) : undefined;
          return (
            <li
              key={p.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                p.id === view.active && view.phase === 'bid' ? 'border-key/60 bg-key/5' : 'border-line'
              } ${p.out ? 'opacity-50' : ''}`}
            >
              <span className={`min-w-[5rem] flex-1 truncate font-semibold ${p.out ? 'line-through' : ''}`}>
                {p.name}
                {p.id === viewer && <span className="font-normal text-accent"> (toi)</span>}
                {p.isBot && <span className="font-normal text-muted"> · bot</span>}
              </span>
              {b && <span className="shrink-0 text-xs text-muted">{bidText(b)}</span>}
              {p.out ? (
                <span className="shrink-0 text-xs text-muted">éliminé</span>
              ) : (
                <span className="flex shrink-0 gap-0.5" aria-label={`${p.dice} dé${p.dice > 1 ? 's' : ''}`}>
                  {Array.from({ length: p.dice }, (_, i) => (
                    <Hidden key={i} size="sm" />
                  ))}
                </span>
              )}
              {p.id === view.winner && <span className="shrink-0 text-xs font-semibold text-good">vainqueur</span>}
            </li>
          );
        })}
      </ul>
      {view.phase === 'over' && view.winner && (
        <p className="mt-2 text-sm text-muted">{nameOf(view.winner)} remporte la partie.</p>
      )}
    </section>
  );
}

function Reference({ view }: { view: CupsView }) {
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Aide-mémoire
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-muted">
        <li>Une enchère porte sur tous les dés de la table : « au moins N dés de cette valeur ».</li>
        <li>Les As sont jokers (sauf en manche sèche ou quand on parie sur les As).</li>
        <li>Monter : plus de dés, ou autant d’une valeur plus forte.</li>
        <li>Vers les As : la moitié (arrondie au-dessus) ; depuis les As : le double plus un.</li>
        <li>« Menteur ! » : celui qui a tort perd un dé.</li>
        {view.config.exact && <li>« Pile ! » : exact, on regagne un dé ; sinon on en perd un.</li>}
        {view.config.dry && <li>Manche sèche quand un joueur tombe à son dernier dé : pas de jokers, valeur fixe.</li>}
      </ul>
    </details>
  );
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-10).reverse();
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

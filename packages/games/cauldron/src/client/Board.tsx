'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  ACTION_HELP,
  ACTION_LABEL,
  EXPEL_AT,
  INGREDIENT_LABEL,
  ROLE_LABEL,
  signed,
  type Card,
  type CauldronMove,
  type CauldronView,
  type Ingredient,
  type Taste,
} from '../shared';

type Props = BoardProps<CauldronView, CauldronMove>;
type NameOf = (id: PlayerId | null) => string;

const INGREDIENT_STYLE: Record<Ingredient, string> = {
  1: 'border-key/70 bg-key/10 text-key',
  0: 'border-tech/70 bg-tech/10 text-tech',
  [-2]: 'border-sabo/70 bg-sabo/10 text-sabo',
} as Record<Ingredient, string>;
const INGREDIENTS: Ingredient[] = [1, 0, -2];

export default function CauldronBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);
  const canAct = !!actor && !actor.expelled && view.phase !== 'over';
  const hotseatName = mode === 'hotseat' && actor ? `${actor.name}, ` : '';

  return (
    <div className="flex flex-col gap-4">
      <Header view={view} />
      <Banner view={view} nameOf={nameOf} actingAs={actingAs} />

      {me && privateView && <Identity me={me} view={view} nameOf={nameOf} />}

      {canAct && view.phase === 'reveal' && privateView && !actor.acked && (
        <Primary onClick={() => sendMove({ type: 'ack' })}>J’ai retenu mon rôle</Primary>
      )}
      {canAct && view.phase === 'turn' && actingAs === view.active && privateView && me && (
        <TurnPanel view={view} hand={me.hand} me={me.id} title={`${hotseatName}à toi de jouer`} sendMove={sendMove} />
      )}
      {canAct && view.phase === 'tasted' && actingAs === view.active && privateView && me?.tastes.at(-1) && (
        <TastedPanel taste={me.tastes.at(-1)!} nameOf={nameOf} onDone={() => sendMove({ type: 'seen' })} />
      )}
      {canAct && view.phase === 'vote' && (
        <VotePanel view={view} actingAs={actingAs!} privateView={privateView} nameOf={nameOf} sendMove={sendMove} />
      )}

      {me && privateView && view.phase !== 'turn' && view.phase !== 'reveal' && me.hand.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ta main</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {me.hand.map((c, i) => (
              <CardFace key={i} card={c} />
            ))}
          </div>
        </section>
      )}

      <Cauldron view={view} nameOf={nameOf} />
      {me && privateView && me.tastes.length > 0 && <Tastes tastes={me.tastes} nameOf={nameOf} />}
      <Guild view={view} viewer={viewer} />
      {view.lastVote && <LastVote vote={view.lastVote} nameOf={nameOf} />}
      <Reference view={view} />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── En-tête ─────────

function Header({ view }: { view: CauldronView }) {
  const reached = view.announcedTotal >= view.target;
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Force visée" value={`${view.target}`} />
      {view.realTotal === null ? (
        <Stat label="Annoncé" value={signed(view.announcedTotal)} tone={reached ? 'text-good' : ''} />
      ) : (
        <Stat label="Force réelle" value={signed(view.realTotal)} tone={view.realTotal >= view.target ? 'text-good' : 'text-sabo'} />
      )}
      <Stat label="Pioche" value={`${view.deckCount} cartes`} tone={view.deckCount <= 6 ? 'text-sabo' : ''} />
    </div>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="truncate text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`truncate font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Banner({ view, nameOf, actingAs }: { view: CauldronView; nameOf: NameOf; actingAs: PlayerId | null }) {
  const active = nameOf(view.active);
  let text: string;
  switch (view.phase) {
    case 'reveal':
      text = `Chacun découvre son rôle en secret… ${view.players.filter((p) => p.acked).length}/${view.players.length} prêts`;
      break;
    case 'turn':
      text =
        actingAs === view.active
          ? 'À toi : verse un ingrédient, joue une action ou propose de servir la potion.'
          : `${active} verse un ingrédient, joue une action ou propose de servir la potion.`;
      break;
    case 'tasted':
      text = `${active} goûte le chaudron en secret…`;
      break;
    case 'vote': {
      const proposer = nameOf(view.vote?.proposer ?? null);
      text =
        view.config.votes === 'hands'
          ? `${proposer} propose de servir la potion : votez à main levée, ${proposer} reporte le résultat.`
          : `${proposer} propose de servir la potion : ${view.players.filter((p) => p.voted).length}/${
              view.players.filter((p) => !p.expelled).length
            } bulletins.`;
      break;
    }
    default:
      text = `Chaudron révélé : force réelle ${signed(view.realTotal ?? 0)} (annoncé ${signed(view.announcedTotal)}) pour ${view.target} visée. Les mensonges sont surlignés et tous les rôles révélés.`;
  }
  return <div className="rounded-xl border border-key/40 bg-key/5 px-4 py-3 text-sm">{text}</div>;
}

// ───────── Identité ─────────

function Identity({ me, view, nameOf }: { me: NonNullable<CauldronView['me']>; view: CauldronView; nameOf: NameOf }) {
  const poisoner = me.role === 'poisoner';
  return (
    <section
      className={`animate-pop rounded-2xl border p-4 ${poisoner ? 'border-sabo/50 bg-sabo/5' : 'border-good/50 bg-good/5'}`}
    >
      <div className="text-sm text-muted">Ton rôle secret :</div>
      <div className={`text-xl font-bold ${poisoner ? 'text-sabo' : 'text-good'}`}>{ROLE_LABEL[me.role]}</div>
      <p className="mt-1 text-xs text-muted">
        {poisoner
          ? `Fais rater la potion (force visée : ${view.target}) : verse de la Ciguë en mentant, écume les bons ingrédients, sème le doute.`
          : `Fais atteindre ${view.target} au chaudron, démasque les menteurs en goûtant, et ne sers la potion que si tu y crois.`}
      </p>
      {poisoner && (
        <p className="mt-2 text-sm">
          {me.allies.length ? `Tes complices : ${me.allies.map(nameOf).join(', ')}.` : 'Tu es le seul Empoisonneur.'}
        </p>
      )}
    </section>
  );
}

// ───────── Cartes ─────────

function CardFace({ card, selected = false }: { card: Card; selected?: boolean }) {
  const ring = selected ? '-translate-y-1 ring-2 ring-accent ring-offset-2 ring-offset-bg' : '';
  if (card.kind === 'ingredient') {
    return (
      <div className={`w-24 rounded-xl border-2 px-2 py-2 text-left transition ${INGREDIENT_STYLE[card.value]} ${ring}`}>
        <div className="text-2xl font-bold tabular-nums">{signed(card.value)}</div>
        <div className="text-[11px] font-semibold leading-tight">{INGREDIENT_LABEL[card.value]}</div>
      </div>
    );
  }
  return (
    <div className={`w-24 rounded-xl border-2 border-accent/60 bg-accent/10 px-2 py-2 text-left text-accent transition ${ring}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">Action</div>
      <div className="font-bold leading-tight">{ACTION_LABEL[card.action]}</div>
    </div>
  );
}

// ───────── Tour de jeu ─────────

function TurnPanel({
  view,
  hand,
  me,
  title,
  sendMove,
}: {
  view: CauldronView;
  hand: Card[];
  me: PlayerId;
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
    card?.kind === 'action' && card.action === 'suspect'
      ? members.filter((p) => p.id !== me)
      : card?.kind === 'action' && card.action === 'plead'
        ? members
        : [];
  const needsTarget = targets.length > 0;
  const empty = view.pours.length === 0;

  const pick = (i: number) => {
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
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="font-semibold first-letter:uppercase">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Ta main">
        {hand.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={index === i}
            aria-label={c.kind === 'ingredient' ? `${INGREDIENT_LABEL[c.value]} (${signed(c.value)})` : ACTION_LABEL[c.action]}
            onClick={() => pick(i)}
            className="rounded-xl"
          >
            <CardFace card={c} selected={index === i} />
          </button>
        ))}
      </div>

      {card?.kind === 'ingredient' && (
        <div className="mt-3">
          <div className="text-xs text-muted">Ce que tu annonces à la guilde :</div>
          <div className="mt-1 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Annonce">
            {INGREDIENTS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={announce === v}
                onClick={() => setAnnounce(v)}
                className={`min-w-0 rounded-lg border px-2 py-2 text-sm ${
                  announce === v ? INGREDIENT_STYLE[v] : 'border-line text-muted hover:text-fg'
                }`}
              >
                <span className="font-bold tabular-nums">{signed(v)}</span>
                <span className="block truncate text-[11px]">{INGREDIENT_LABEL[v]}</span>
              </button>
            ))}
          </div>
          {announce !== null && announce !== card.value && (
            <p className="mt-2 text-xs text-sabo">Mensonge : un goûteur pourrait le découvrir.</p>
          )}
        </div>
      )}

      {card?.kind === 'action' && (
        <div className="mt-3">
          <p className="text-xs text-muted">
            {ACTION_HELP[card.action]}
            {(card.action === 'taste' || card.action === 'skim') && empty && ' (le chaudron est vide : sans effet)'}
          </p>
          {needsTarget && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Joueur visé">
              {targets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={target === p.id}
                  onClick={() => setTarget(p.id)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    target === p.id ? 'border-sabo bg-sabo/15 text-fg' : 'border-line text-muted hover:text-fg'
                  }`}
                >
                  {p.id === me ? 'Moi' : p.name} · {p.suspicion}/{EXPEL_AT}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!card || (card.kind === 'ingredient' ? announce === null : needsTarget && !target)}
          onClick={play}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
        >
          {label}
        </button>
        <button
          type="button"
          disabled={empty}
          onClick={() => sendMove({ type: 'propose' })}
          className="rounded-xl border border-good/60 px-4 py-3 font-semibold text-good hover:bg-good/10 disabled:opacity-30"
        >
          Proposer de servir la potion
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Servir déclenche un vote de la guilde. S’il échoue, tu reçois un jeton de soupçon.
      </p>
    </section>
  );
}

function TastedPanel({ taste, nameOf, onDone }: { taste: Taste; nameOf: NameOf; onDone: () => void }) {
  return (
    <Panel title="Tu goûtes le chaudron… (secret)">
      <div className="flex flex-wrap gap-2">
        {taste.values.map((v, i) => (
          <CardFace key={i} card={{ kind: 'ingredient', value: v }} />
        ))}
      </div>
      <p className="mt-3 text-sm">
        Annoncé : {taste.pours.map((p) => `${nameOf(p.by)} ${signed(p.announced)}`).join(' · ')}
        {' '}(total annoncé {signed(taste.pours.reduce((s, p) => s + p.announced, 0))}, réel{' '}
        {signed(taste.values.reduce<number>((s, v) => s + v, 0))})
      </p>
      <p className="mt-1 text-xs text-muted">Les valeurs sont mélangées : tu ne sais pas qui a versé quoi.</p>
      <div className="mt-3">
        <Primary onClick={onDone}>Compris</Primary>
      </div>
    </Panel>
  );
}

// ───────── Vote ─────────

function VotePanel({
  view,
  actingAs,
  privateView,
  nameOf,
  sendMove,
}: {
  view: CauldronView;
  actingAs: PlayerId;
  privateView: boolean;
  nameOf: NameOf;
  sendMove: (m: CauldronMove) => void;
}) {
  const proposer = view.vote?.proposer ?? null;
  if (view.config.votes === 'hands') {
    return actingAs === proposer ? <HandsVote view={view} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
  }
  if (!privateView) return null;
  const self = view.players.find((p) => p.id === actingAs)!;
  if (self.voted) {
    return (
      <p className="text-sm text-muted">Ton bulletin : {view.me?.myVote ? 'Oui' : 'Non'}. En attente des autres…</p>
    );
  }
  return (
    <Panel title={`Servir la potion proposée par ${nameOf(proposer)} ?`}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => sendMove({ type: 'vote', yes: true })}
          className="rounded-xl bg-good px-4 py-3 font-bold text-bg hover:brightness-110"
        >
          Oui, on sert
        </button>
        <button
          type="button"
          onClick={() => sendMove({ type: 'vote', yes: false })}
          className="rounded-xl bg-sabo px-4 py-3 font-bold text-bg hover:brightness-110"
        >
          Non
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Majorité de oui : on révèle le chaudron et la partie s’arrête. Sinon {nameOf(proposer)} reçoit un jeton de soupçon.
      </p>
    </Panel>
  );
}

function HandsVote({ view, onSubmit }: { view: CauldronView; onSubmit: (yes: PlayerId[]) => void }) {
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.vote?.proposer]);
  const members = view.players.filter((p) => !p.expelled);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > members.length;
  return (
    <Panel title="Qui a levé la main pour servir la potion ?">
      <div className="flex flex-wrap gap-1.5">
        {members.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={yes.includes(p.id)}
            onClick={() => toggle(p.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              yes.includes(p.id) ? 'border-good bg-good/15 text-good' : 'border-line text-muted'
            }`}
          >
            {p.name} {yes.includes(p.id) ? '✓' : ''}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {yes.length} oui sur {members.length} : la potion serait {passes ? 'servie' : 'refusée'}.
      </p>
      <div className="mt-3">
        <Primary onClick={() => onSubmit(yes)}>Valider le vote</Primary>
      </div>
    </Panel>
  );
}

// ───────── Plateau public ─────────

function Cauldron({ view, nameOf }: { view: CauldronView; nameOf: NameOf }) {
  const over = view.phase === 'over';
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Le chaudron</div>
        <div className="text-xs text-muted">
          {view.pours.length} ingrédient{view.pours.length > 1 ? 's' : ''}
        </div>
      </div>
      {view.pours.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Le chaudron est vide.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1">
          {view.pours.map((p, i) => {
            const lie = p.value !== null && p.value !== p.announced;
            return (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${
                  lie && over ? 'border-sabo/60 bg-sabo/5' : 'border-line'
                }`}
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-[5rem] flex-1 truncate">{nameOf(p.by)}</span>
                <span className={`shrink-0 rounded border px-1.5 text-xs font-semibold tabular-nums ${INGREDIENT_STYLE[p.announced]}`}>
                  annonce {signed(p.announced)}
                </span>
                {p.value !== null && (
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${lie ? 'text-sabo' : 'text-muted'}`}
                    title={over ? 'Valeur réelle' : 'Ce que tu as vraiment versé'}
                  >
                    {lie ? `réel ${signed(p.value)}` : '✓'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!over && view.pours.length > 0 && (
        <p className="mt-2 text-xs text-muted">Tu vois la vraie valeur de tes propres versements seulement.</p>
      )}
    </section>
  );
}

function Tastes({ tastes, nameOf }: { tastes: Taste[]; nameOf: NameOf }) {
  return (
    <details className="rounded-xl border border-accent/30 bg-surface p-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Tes dégustations secrètes ({tastes.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {tastes.map((t, i) => (
          <li key={i}>
            <strong className="tabular-nums">{t.values.map(signed).join(', ')}</strong>{' '}
            <span className="text-muted">— annoncé : {t.pours.map((p) => `${nameOf(p.by)} ${signed(p.announced)}`).join(', ')}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Guild({ view, viewer }: { view: CauldronView; viewer: PlayerId | null }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">La guilde</div>
      <ul className="mt-2 flex flex-col gap-2">
        {view.players.map((p) => (
          <li
            key={p.id}
            className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              p.id === view.active && view.phase !== 'over' && !p.expelled ? 'border-key/60 bg-key/5' : 'border-line'
            } ${p.expelled ? 'opacity-60' : ''}`}
          >
            <span className={`min-w-[5rem] flex-1 truncate font-semibold ${p.expelled ? 'line-through' : ''}`}>
              {p.name}
              {p.id === viewer && <span className="font-normal text-accent"> (toi)</span>}
              {p.isBot && <span className="font-normal text-muted"> · bot</span>}
            </span>
            {view.phase === 'reveal' && <span className={`text-xs ${p.acked ? 'text-good' : 'text-muted'}`}>{p.acked ? '✓' : '…'}</span>}
            {view.phase === 'vote' && view.config.votes === 'secret' && !p.expelled && (
              <span className={`text-xs ${p.voted ? 'text-good' : 'text-muted'}`}>{p.voted ? 'a voté' : '…'}</span>
            )}
            {p.role && (
              <span
                className={`shrink-0 rounded border px-1 text-[10px] uppercase ${
                  p.role === 'poisoner' ? 'border-sabo/60 text-sabo' : 'border-good/60 text-good'
                }`}
              >
                {ROLE_LABEL[p.role]}
              </span>
            )}
            {p.expelled ? (
              <span className="shrink-0 text-xs text-muted">chassé</span>
            ) : (
              <span className="flex shrink-0 gap-0.5" aria-label={`${p.suspicion} jeton(s) de soupçon sur ${EXPEL_AT}`}>
                {Array.from({ length: EXPEL_AT }, (_, i) => (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full border ${i < p.suspicion ? 'border-sabo bg-sabo' : 'border-line'}`}
                  />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LastVote({ vote, nameOf }: { vote: NonNullable<CauldronView['lastVote']>; nameOf: NameOf }) {
  const yes = Object.entries(vote.votes).filter(([, v]) => v).map(([id]) => nameOf(id));
  const no = Object.entries(vote.votes).filter(([, v]) => !v).map(([id]) => nameOf(id));
  return (
    <section className="rounded-xl border border-line bg-surface p-3 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Dernier vote (proposé par {nameOf(vote.proposer)}) : {vote.passed ? 'potion servie' : 'refusé'}
      </div>
      <p className="mt-1">
        <span className="text-good">Oui : {yes.join(', ') || 'personne'}</span>
        <span className="text-muted"> · </span>
        <span className="text-sabo">Non : {no.join(', ') || 'personne'}</span>
      </p>
    </section>
  );
}

function Reference({ view }: { view: CauldronView }) {
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Aide-mémoire
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {INGREDIENTS.map((v) => (
          <li key={v}>
            <strong>{INGREDIENT_LABEL[v]}</strong> : <span className="text-muted">{signed(v)} de force</span>
          </li>
        ))}
        {(Object.keys(ACTION_LABEL) as (keyof typeof ACTION_LABEL)[]).map((a) => (
          <li key={a}>
            <strong>{ACTION_LABEL[a]}</strong> : <span className="text-muted">{ACTION_HELP[a]}</span>
          </li>
        ))}
        <li className="text-muted">
          Force visée : {view.target}. La pioche épuisée fait gagner les Empoisonneurs.
        </li>
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

// ───────── Petits composants ─────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="mb-3 font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function Primary({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 sm:w-auto"
    >
      {children}
    </button>
  );
}

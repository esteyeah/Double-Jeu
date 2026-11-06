'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
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
  type Role,
  type ThroneMove,
  type ThroneView,
} from '../shared';

type Props = BoardProps<ThroneView, ThroneMove>;

const ROLE_STYLE: Record<Role, string> = {
  loyal: 'border-key/60 text-key',
  conspirator: 'border-sabo/60 text-sabo',
  usurper: 'border-sabo bg-sabo/15 text-sabo',
};

export default function ThroneBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf = (id: PlayerId | null) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const actor = view.players.find((p) => p.id === actingAs) ?? null;
  const ctx = { view, nameOf, sendMove, mode, actingAs };

  return (
    <div className="flex flex-col gap-4">
      <Tracks view={view} />
      <Government view={view} nameOf={nameOf} />
      <Instruction {...ctx} />

      {me && <SecretPanel view={view} me={me} nameOf={nameOf} />}

      {actor?.alive && <Actions {...ctx} viewer={viewer} />}

      <Players view={view} viewer={viewer} />
      <History view={view} nameOf={nameOf} />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── Pistes ─────────

function Tracks({ view }: { view: ThroneView }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-key">Édits royaux</span>
          <span className="text-muted tabular-nums">
            {view.crown} / {CROWN_TO_WIN}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: CROWN_TO_WIN }, (_, i) => (
            <Slot key={i} filled={i < view.crown} tone="crown" label={i === CROWN_TO_WIN - 1 ? 'Victoire' : ''} />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-sabo">Édits de l’Ombre</span>
          <span className="text-muted tabular-nums">
            {view.shadow} / {SHADOW_TO_WIN}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {view.track.map((power, i) => (
            <Slot
              key={i}
              filled={i < view.shadow}
              tone="shadow"
              label={i === SHADOW_TO_WIN - 1 ? 'Victoire' : power ? POWER_LABEL[power] : ''}
              mark={i + 1 === USURPER_DANGER ? '⚠' : i + 1 === VETO_AT ? 'veto' : undefined}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          ⚠ Dès le {USURPER_DANGER}e édit de l’Ombre, élire l’Usurpateur Sénéchal le couronne.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          Agitation
          {Array.from({ length: MAX_AGITATION }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < view.agitation ? 'bg-sabo' : 'bg-line'}`}
            />
          ))}
        </span>
        <span>Pile : {view.deckCount}</span>
        <span>Défausse : {view.discardCount}</span>
      </div>
    </section>
  );
}

function Slot({
  filled,
  tone,
  label,
  mark,
}: {
  filled: boolean;
  tone: Edict;
  label: string;
  mark?: string;
}) {
  const on = tone === 'crown' ? 'border-key bg-key/25 text-key' : 'border-sabo bg-sabo/25 text-sabo';
  return (
    <div
      className={`relative flex h-12 flex-col items-center justify-center rounded-lg border px-0.5 text-center text-[9px] leading-tight font-semibold sm:text-[11px] ${
        filled ? on : 'border-line bg-bg/40 text-muted'
      }`}
    >
      {filled ? <EdictIcon edict={tone} className="h-5 w-5" /> : label}
      {mark && <span className="absolute -top-1.5 right-0.5 text-[9px] normal-case text-sabo">{mark}</span>}
    </div>
  );
}

function Government({ view, nameOf }: { view: ThroneView; nameOf: (id: PlayerId | null) => string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-key/40 bg-surface px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-muted">Régent</div>
        <div className="truncate font-semibold">{nameOf(view.regent)}</div>
      </div>
      <div className="rounded-xl border border-line bg-surface px-3 py-2">
        <div className="text-[11px] uppercase tracking-wide text-muted">Sénéchal</div>
        <div className="truncate font-semibold">{view.nominee ? nameOf(view.nominee) : '—'}</div>
      </div>
    </div>
  );
}

// ───────── Consignes ─────────

interface Ctx {
  view: ThroneView;
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: ThroneMove) => void;
  mode: Props['mode'];
  actingAs: PlayerId | null;
}

function Instruction({ view, nameOf, mode, actingAs }: Ctx) {
  const regent = nameOf(view.regent);
  const nominee = nameOf(view.nominee);
  const mine = (id: PlayerId | null) => actingAs !== null && actingAs === id;
  const call = (who: string, rest: string) =>
    mode === 'hotseat' ? `${who}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1);
  let text = '';
  switch (view.phase) {
    case 'reveal': {
      const ready = view.players.filter((p) => p.acked).length;
      text = `Chacun découvre son rôle en secret… ${ready}/${view.players.length} prêts`;
      break;
    }
    case 'nomination':
      text = mine(view.regent)
        ? call(regent, 'propose un Sénéchal parmi les joueurs éligibles.')
        : `${regent} choisit un Sénéchal. Discutez !`;
      break;
    case 'vote':
      if (view.config.votes === 'hands') {
        text = mine(view.regent)
          ? call(regent, `faites voter à main levée pour ${regent} et ${nominee}, puis coche les « oui ».`)
          : `Vote à main levée pour ${regent} et ${nominee}.`;
      } else {
        const done = view.players.filter((p) => p.voted).length;
        const alive = view.players.filter((p) => p.alive).length;
        text = `Vote pour le gouvernement ${regent} / ${nominee} : ${done}/${alive} bulletins.`;
      }
      break;
    case 'regent':
      text = `${regent} examine 3 édits et en défausse un en secret.`;
      break;
    case 'seneschal':
      text = `${nominee} choisit l’édit à promulguer.`;
      break;
    case 'veto':
      text = mine(view.regent)
        ? call(regent, `${nominee} propose un veto. Acceptes-tu ?`)
        : `${nominee} propose un veto : ${regent} décide.`;
      break;
    case 'power':
      text = `${regent} utilise son pouvoir : ${view.pendingPower ? POWER_LABEL[view.pendingPower] : ''}.`;
      break;
    case 'powerResult':
      text = `${regent} prend connaissance du résultat de son enquête.`;
      break;
    case 'over':
      text = 'Partie terminée : tous les rôles sont révélés.';
      break;
  }
  return <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">{text}</div>;
}

// ───────── Informations secrètes ─────────

function SecretPanel({
  view,
  me,
  nameOf,
}: {
  view: ThroneView;
  me: NonNullable<ThroneView['me']>;
  nameOf: (id: PlayerId | null) => string;
}) {
  const goal =
    me.team === 'crown'
      ? `Fais promulguer ${CROWN_TO_WIN} édits royaux, ou fais exécuter l’Usurpateur.`
      : me.role === 'usurper'
        ? 'Reste discret : après le 3e édit de l’Ombre, fais-toi élire Sénéchal pour t’emparer du trône.'
        : `Fais passer ${SHADOW_TO_WIN} édits de l’Ombre, ou fais élire l’Usurpateur Sénéchal après le 3e.`;
  return (
    <section className={`animate-pop rounded-2xl border bg-surface-2 p-4 ${ROLE_STYLE[me.role]}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm text-muted">Ton rôle :</span>
        <span className="text-xl font-bold">{ROLE_LABEL[me.role]}</span>
        <span className="text-sm text-muted">({TEAM_LABEL[me.team]})</span>
      </div>
      <p className="mt-1 text-sm text-muted">{goal}</p>
      {me.allies.length > 0 && (
        <p className="mt-3 text-sm text-fg">
          Tes complices :{' '}
          {me.allies.map((a) => `${nameOf(a.id)} (${ROLE_LABEL[a.role]})`).join(', ')}
        </p>
      )}
      {me.role === 'usurper' && me.allies.length === 0 && (
        <p className="mt-3 text-sm text-muted">Tu ne connais pas tes Conjurés, mais eux te connaissent.</p>
      )}
      {me.investigations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-fg">
          {me.investigations.map((i) => (
            <li key={i.target}>
              Enquête : {nameOf(i.target)} sert{' '}
              <strong className={i.team === 'crown' ? 'text-key' : 'text-sabo'}>{TEAM_LABEL[i.team]}</strong>
            </li>
          ))}
        </ul>
      )}
      {me.passed && (
        <p className="mt-3 text-sm text-muted">
          Tu as transmis : {me.passed.map((e) => EDICT_LABEL[e]).join(' + ')}
        </p>
      )}
    </section>
  );
}

// ───────── Actions de la phase ─────────

function Actions({ view, nameOf, sendMove, actingAs, viewer }: Ctx & { viewer: PlayerId | null }) {
  const me = actingAs as PlayerId;
  const isRegent = me === view.regent;
  const privateView = viewer !== null && viewer === actingAs;
  const self = view.players.find((p) => p.id === me)!;

  switch (view.phase) {
    case 'reveal':
      return !self.acked && privateView ? (
        <Primary onClick={() => sendMove({ type: 'ack' })}>J’ai retenu mon rôle</Primary>
      ) : null;

    case 'nomination':
      return isRegent ? (
        <PickPlayer
          title="Proposer un Sénéchal"
          options={view.players.filter((p) => p.eligible)}
          confirm={(name) => `Proposer ${name}`}
          onPick={(target) => sendMove({ type: 'nominate', target })}
        />
      ) : null;

    case 'vote':
      if (view.config.votes === 'hands') {
        return isRegent ? <HandsVote view={view} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
      }
      if (self.voted || !privateView) {
        return self.voted && view.me?.myVote !== null && privateView ? (
          <p className="text-sm text-muted">Ton bulletin : {view.me?.myVote ? 'Oui' : 'Non'}. En attente des autres…</p>
        ) : null;
      }
      return (
        <Panel title={`Élire ${nameOf(view.regent)} et ${nameOf(view.nominee)} ?`}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => sendMove({ type: 'vote', yes: true })}
              className="rounded-xl bg-good px-4 py-4 text-lg font-bold text-bg hover:brightness-110"
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => sendMove({ type: 'vote', yes: false })}
              className="rounded-xl bg-sabo px-4 py-4 text-lg font-bold text-bg hover:brightness-110"
            >
              Non
            </button>
          </div>
        </Panel>
      );

    case 'regent':
      return isRegent && privateView && view.me?.hand ? (
        <ChooseEdict
          title="Choisis l’édit à défausser"
          hint="Les deux autres iront au Sénéchal."
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
              <button
                type="button"
                onClick={() => sendMove({ type: 'veto' })}
                className="rounded-xl border border-line px-4 py-2.5 text-sm hover:border-sabo/60"
              >
                Proposer un veto au Régent
              </button>
            ) : null
          }
        />
      ) : null;

    case 'veto':
      return isRegent ? (
        <Panel title="Veto proposé par le Sénéchal">
          <div className="grid grid-cols-2 gap-2">
            <Primary onClick={() => sendMove({ type: 'vetoAnswer', accept: true })}>Accepter</Primary>
            <button
              type="button"
              onClick={() => sendMove({ type: 'vetoAnswer', accept: false })}
              className="rounded-xl border border-line px-4 py-3 font-semibold hover:border-sabo/60"
            >
              Refuser
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Accepter : aucun édit ne passe et l’agitation monte d’un cran.</p>
        </Panel>
      ) : null;

    case 'power': {
      if (!isRegent) return null;
      if (view.pendingPower === 'peek') {
        return privateView && view.me?.peek ? (
          <Panel title="Présage : les 3 prochains édits">
            <div className="flex gap-2">
              {view.me.peek.map((e, i) => (
                <EdictCard key={i} edict={e} />
              ))}
            </div>
            <div className="mt-3">
              <Primary onClick={() => sendMove({ type: 'power' })}>J’ai vu</Primary>
            </div>
          </Panel>
        ) : null;
      }
      const others = view.players.filter((p) => p.alive && p.id !== me);
      const options = view.pendingPower === 'investigate' ? others.filter((p) => !p.investigated) : others;
      const titles = {
        investigate: ['Enquêter sur…', (n: string) => `Enquêter sur ${n}`],
        special: ['Désigner le prochain Régent', (n: string) => `Désigner ${n}`],
        execute: ['Exécuter…', (n: string) => `Exécuter ${n}`],
      } as const;
      const t = titles[view.pendingPower as keyof typeof titles];
      return t ? (
        <PickPlayer
          title={t[0]}
          options={options}
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
        <Panel title="Résultat de l’enquête">
          <p className="text-lg">
            {nameOf(last.target)} sert{' '}
            <strong className={last.team === 'crown' ? 'text-key' : 'text-sabo'}>{TEAM_LABEL[last.team]}</strong>.
          </p>
          <p className="mt-1 text-xs text-muted">À toi de décider si tu le dis… et si tu dis la vérité.</p>
          <div className="mt-3">
            <Primary onClick={() => sendMove({ type: 'power' })}>Compris</Primary>
          </div>
        </Panel>
      ) : null;
    }

    default:
      return null;
  }
}

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

function PickPlayer({
  title,
  options,
  confirm,
  onPick,
  danger = false,
}: {
  title: string;
  options: ThroneView['players'];
  confirm: (name: string) => string;
  onPick: (id: PlayerId) => void;
  danger?: boolean;
}) {
  const [picked, setPicked] = useState<PlayerId | null>(null);
  const name = options.find((p) => p.id === picked)?.name;
  return (
    <Panel title={title}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={title}>
        {options.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={picked === p.id}
            onClick={() => setPicked(p.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              picked === p.id ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!picked}
        onClick={() => picked && onPick(picked)}
        className={`mt-3 w-full rounded-xl px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto ${
          danger ? 'bg-sabo' : 'bg-accent'
        }`}
      >
        {name ? confirm(name) : 'Choisis un joueur'}
      </button>
    </Panel>
  );
}

function HandsVote({ view, onSubmit }: { view: ThroneView; onSubmit: (yes: PlayerId[]) => void }) {
  const alive = view.players.filter((p) => p.alive);
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.nominee]);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > alive.length;
  return (
    <Panel title="Qui a levé la main pour « oui » ?">
      <div className="flex flex-wrap gap-1.5">
        {alive.map((p) => (
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
        {yes.length} oui sur {alive.length} : le gouvernement serait {passes ? 'élu' : 'rejeté'}.
      </p>
      <div className="mt-3">
        <Primary onClick={() => onSubmit(yes)}>Valider le vote</Primary>
      </div>
    </Panel>
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
  extra?: React.ReactNode;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Panel title={title}>
      <p className="-mt-2 mb-3 text-xs text-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {hand.map((e, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={picked === i}
            aria-label={EDICT_LABEL[e]}
            onClick={() => setPicked(i)}
            className={`rounded-xl transition ${picked === i ? '-translate-y-1 ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
          >
            <EdictCard edict={e} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={picked === null}
          onClick={() => picked !== null && onPick(picked)}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
        >
          {picked === null ? 'Choisis un édit' : `${verb} : ${EDICT_LABEL[hand[picked]!]}`}
        </button>
        {extra}
      </div>
    </Panel>
  );
}

function EdictCard({ edict }: { edict: Edict }) {
  return (
    <div
      className={`flex h-24 w-16 animate-reveal flex-col items-center justify-center gap-1.5 rounded-xl border-2 ${
        edict === 'crown' ? 'border-key bg-key/15 text-key' : 'border-sabo bg-sabo/15 text-sabo'
      }`}
    >
      <EdictIcon edict={edict} className="h-7 w-7" />
      <span className="px-1 text-center text-[9px] leading-tight font-bold uppercase">
        {edict === 'crown' ? 'Royal' : 'Ombre'}
      </span>
    </div>
  );
}

function EdictIcon({ edict, className }: { edict: Edict; className?: string }) {
  return edict === 'crown' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

// ───────── Joueurs, historique, journal ─────────

function Players({ view, viewer }: { view: ThroneView; viewer: PlayerId | null }) {
  const last = view.lastVote;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Conseil</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {view.players.map((p) => (
          <li key={p.id} className={`flex flex-wrap items-center gap-2 text-sm ${p.alive ? '' : 'opacity-50'}`}>
            <span className={`min-w-0 flex-1 truncate ${p.alive ? '' : 'line-through'}`}>
              {p.name}
              {p.id === viewer && <span className="text-accent"> (toi)</span>}
              {p.isBot && <span className="text-muted"> · bot</span>}
            </span>
            {!p.alive && <Badge className="border-line text-muted">exécuté</Badge>}
            {p.id === view.regent && view.phase !== 'over' && <Badge className="border-key/60 text-key">Régent</Badge>}
            {p.id === view.nominee && view.phase !== 'over' && <Badge className="border-accent/60 text-accent">Sénéchal</Badge>}
            {p.termLimited && view.phase === 'nomination' && <Badge className="border-line text-muted">inéligible</Badge>}
            {p.investigated && <Badge className="border-line text-muted">enquêté</Badge>}
            {p.role && <Badge className={ROLE_STYLE[p.role]}>{ROLE_LABEL[p.role]}</Badge>}
            {view.phase === 'reveal' && <span className={`text-xs ${p.acked ? 'text-good' : 'text-muted'}`}>{p.acked ? '✓' : '…'}</span>}
            {view.phase === 'vote' && p.alive && (
              <span className={`text-xs ${p.voted ? 'text-good' : 'text-muted'}`}>{p.voted ? 'a voté' : '…'}</span>
            )}
            {view.phase !== 'vote' && last && Object.hasOwn(last.votes, p.id) && (
              <span className={`w-9 text-right text-xs font-semibold ${last.votes[p.id] ? 'text-good' : 'text-sabo'}`}>
                {last.votes[p.id] ? 'Oui' : 'Non'}
              </span>
            )}
          </li>
        ))}
      </ul>
      {last && view.phase !== 'vote' && (
        <p className="mt-2 text-xs text-muted">Dernier vote : gouvernement {last.passed ? 'élu' : 'rejeté'}.</p>
      )}
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function History({ view, nameOf }: { view: ThroneView; nameOf: (id: PlayerId | null) => string }) {
  if (view.history.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Édits promulgués</div>
      <ol className="mt-2 flex flex-col gap-1">
        {view.history.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            <EdictIcon edict={e.edict} className={`h-4 w-4 ${e.edict === 'crown' ? 'text-key' : 'text-sabo'}`} />
            <span>
              {e.regent ? `${nameOf(e.regent)} → ${nameOf(e.seneschal)}` : 'Émeute'}
            </span>
          </li>
        ))}
      </ol>
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

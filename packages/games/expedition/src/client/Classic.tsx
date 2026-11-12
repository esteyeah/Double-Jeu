'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  MAX_REJECTIONS,
  ROLE_LABEL,
  SIDE_LABEL,
  TO_WIN,
  type ExpeditionMove,
  type ExpeditionView,
  type Role,
} from '../shared';

type Props = BoardProps<ExpeditionView, ExpeditionMove>;

const ROLE_STYLE: Record<Role, string> = {
  explorer: 'border-tech/60 text-tech',
  cartographer: 'border-tech bg-tech/15 text-tech',
  mutineer: 'border-sabo/60 text-sabo',
  spy: 'border-sabo bg-sabo/15 text-sabo',
};

export default function ExpeditionBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf = (id: PlayerId | null) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;

  return (
    <div className="flex flex-col gap-4">
      <Track view={view} />
      <Instruction view={view} actingAs={actingAs} mode={mode} nameOf={nameOf} />
      {me && <SecretPanel me={me} nameOf={nameOf} />}
      {actingAs && (
        <Actions view={view} actingAs={actingAs} privateView={privateView} nameOf={nameOf} sendMove={sendMove} />
      )}
      <Players view={view} viewer={viewer} />
      <History view={view} nameOf={nameOf} />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── Parcours ─────────

function Track({ view }: { view: ExpeditionView }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>Le parcours</span>
        <span>{TO_WIN} étapes pour gagner</span>
      </div>
      <ol className="grid grid-cols-5 gap-1.5">
        {view.missions.map((m, i) => {
          const current = i === view.mission && view.phase !== 'over' && view.phase !== 'spy';
          const tone = m.result
            ? m.result.success
              ? 'border-good bg-good/15 text-good'
              : 'border-sabo bg-sabo/15 text-sabo'
            : current
              ? 'border-accent bg-accent/10 text-fg'
              : 'border-line bg-bg/40 text-muted';
          return (
            <li
              key={i}
              className={`flex min-h-20 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center ${tone}`}
            >
              <span className="text-[9px] leading-tight font-semibold sm:text-[11px]">{m.name}</span>
              <span className="mt-1 text-lg font-bold tabular-nums">
                {m.result ? (m.result.success ? '✓' : '✗') : m.size}
              </span>
              <span className="text-[9px] leading-tight sm:text-[10px]">
                {m.result
                  ? `${m.result.sabotages} sabotage${m.result.sabotages > 1 ? 's' : ''}`
                  : m.needed > 1
                    ? '2 sabotages'
                    : 'membres'}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        Refus d’affilée
        {Array.from({ length: MAX_REJECTIONS }, (_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < view.rejections ? 'bg-sabo' : 'bg-line'}`} />
        ))}
      </div>
    </section>
  );
}

function Instruction({
  view,
  actingAs,
  mode,
  nameOf,
}: {
  view: ExpeditionView;
  actingAs: PlayerId | null;
  mode: Props['mode'];
  nameOf: (id: PlayerId | null) => string;
}) {
  const leader = nameOf(view.leader);
  const stage = view.missions[view.mission];
  const call = (rest: string) => (mode === 'hotseat' ? `${leader}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const isLeader = actingAs === view.leader;
  let text = '';
  switch (view.phase) {
    case 'reveal':
      text = `Chacun découvre son rôle en secret… ${view.players.filter((p) => p.acked).length}/${view.players.length} prêts`;
      break;
    case 'team':
      text = isLeader
        ? call(`compose la cordée pour « ${stage?.name} » : ${stage?.size} membres.`)
        : `${leader} compose la cordée pour « ${stage?.name} » (${stage?.size} membres). Discutez !`;
      break;
    case 'vote':
      text =
        view.config.votes === 'hands'
          ? isLeader
            ? call('faites voter à main levée, puis coche les « oui ».')
            : 'Vote à main levée sur la cordée proposée.'
          : `Vote sur la cordée : ${view.players.filter((p) => p.voted).length}/${view.players.length} bulletins.`;
      break;
    case 'mission':
      text = `La cordée affronte « ${stage?.name} » : chacun joue sa carte en secret.`;
      break;
    case 'spy':
      text = `L’expédition touche au but… mais l’Espion ${nameOf(view.spy)} peut démasquer la Cartographe !`;
      break;
    case 'over':
      text = 'Partie terminée : tous les rôles sont révélés.';
      break;
  }
  return <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">{text}</div>;
}

// ───────── Informations secrètes ─────────

function SecretPanel({
  me,
  nameOf,
}: {
  me: NonNullable<ExpeditionView['me']>;
  nameOf: (id: PlayerId | null) => string;
}) {
  const goal: Record<Role, string> = {
    explorer: `Fais réussir ${TO_WIN} étapes. Repère les Mutins et écarte-les des cordées.`,
    cartographer: 'Tu connais les Mutins. Guide l’expédition… sans te faire repérer par l’Espion.',
    mutineer: `Fais rater ${TO_WIN} étapes en sabotant discrètement, ou bloque l’expédition.`,
    spy: 'Tu es un Mutin. Si l’expédition gagne, tu pourras désigner la Cartographe pour tout renverser.',
  };
  return (
    <section className={`animate-pop rounded-2xl border bg-surface-2 p-4 ${ROLE_STYLE[me.role]}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm text-muted">Ton rôle :</span>
        <span className="text-xl font-bold">{ROLE_LABEL[me.role]}</span>
        <span className="text-sm text-muted">({SIDE_LABEL[me.side]})</span>
      </div>
      <p className="mt-1 text-sm text-muted">{goal[me.role]}</p>
      {me.allies.length > 0 && (
        <p className="mt-3 text-sm text-fg">
          {me.role === 'cartographer' ? 'Les Mutins : ' : 'Tes complices : '}
          {me.allies.map((a) => `${nameOf(a.id)}${me.side === 'mutiny' ? ` (${ROLE_LABEL[a.role]})` : ''}`).join(', ')}
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
  sendMove,
}: {
  view: ExpeditionView;
  actingAs: PlayerId;
  privateView: boolean;
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: ExpeditionMove) => void;
}) {
  const self = view.players.find((p) => p.id === actingAs);
  if (!self) return null;
  const isLeader = actingAs === view.leader;

  switch (view.phase) {
    case 'reveal':
      return !self.acked && privateView ? (
        <Primary onClick={() => sendMove({ type: 'ack' })}>J’ai retenu mon rôle</Primary>
      ) : null;

    case 'team':
      return isLeader ? <TeamPicker view={view} onSubmit={(team) => sendMove({ type: 'propose', team })} /> : null;

    case 'vote':
      if (view.config.votes === 'hands') {
        return isLeader ? <HandsVote view={view} onSubmit={(yes) => sendMove({ type: 'tally', yes })} /> : null;
      }
      if (!privateView) return null;
      if (self.voted) {
        return <p className="text-sm text-muted">Ton bulletin : {view.me?.myVote ? 'Oui' : 'Non'}. En attente des autres…</p>;
      }
      return (
        <Panel title={`Accepter la cordée : ${view.team.map(nameOf).join(', ')} ?`}>
          <TwoButtons
            yes="Oui"
            no="Non"
            onYes={() => sendMove({ type: 'vote', yes: true })}
            onNo={() => sendMove({ type: 'vote', yes: false })}
          />
        </Panel>
      );

    case 'mission': {
      if (!privateView || !view.team.includes(actingAs)) return null;
      if (view.me?.myCard) return <p className="text-sm text-muted">Carte jouée. En attente du reste de la cordée…</p>;
      const loyal = view.me?.side === 'expedition';
      return (
        <Panel title="Ta carte pour cette étape">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => sendMove({ type: 'play', card: 'success' })}
              className="rounded-xl bg-good px-4 py-4 text-lg font-bold text-bg hover:brightness-110"
            >
              Réussite
            </button>
            <button
              type="button"
              disabled={loyal}
              onClick={() => sendMove({ type: 'play', card: 'sabotage' })}
              className="rounded-xl bg-sabo px-4 py-4 text-lg font-bold text-bg hover:brightness-110 disabled:opacity-25"
            >
              Sabotage
            </button>
          </div>
          {loyal && <p className="mt-2 text-xs text-muted">Un membre loyal de l’expédition joue toujours Réussite.</p>}
        </Panel>
      );
    }

    case 'spy': {
      if (actingAs !== view.spy) return null;
      const known = new Set(view.me?.allies.map((a) => a.id) ?? []);
      const options = view.players.filter((p) => p.id !== actingAs && !known.has(p.id));
      return <SpyPicker options={options} onPick={(target) => sendMove({ type: 'unmask', target })} />;
    }

    default:
      return null;
  }
}

function TeamPicker({ view, onSubmit }: { view: ExpeditionView; onSubmit: (team: PlayerId[]) => void }) {
  const size = view.missions[view.mission]!.size;
  const [team, setTeam] = useState<PlayerId[]>([]);
  useEffect(() => setTeam([]), [view.mission, view.leader]);
  const toggle = (id: PlayerId) =>
    setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < size ? [...t, id] : t));
  return (
    <Panel title={`Compose la cordée (${team.length}/${size})`}>
      <div className="flex flex-wrap gap-1.5">
        {view.players.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={team.includes(p.id)}
            onClick={() => toggle(p.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              team.includes(p.id) ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {p.name} {team.includes(p.id) ? '✓' : ''}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Primary disabled={team.length !== size} onClick={() => onSubmit(team)}>
          Proposer la cordée
        </Primary>
      </div>
    </Panel>
  );
}

function HandsVote({ view, onSubmit }: { view: ExpeditionView; onSubmit: (yes: PlayerId[]) => void }) {
  const [yes, setYes] = useState<PlayerId[]>([]);
  useEffect(() => setYes([]), [view.team.join()]);
  const toggle = (id: PlayerId) => setYes((y) => (y.includes(id) ? y.filter((x) => x !== id) : [...y, id]));
  const passes = yes.length * 2 > view.players.length;
  return (
    <Panel title="Qui a levé la main pour « oui » ?">
      <div className="flex flex-wrap gap-1.5">
        {view.players.map((p) => (
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
        {yes.length} oui sur {view.players.length} : la cordée serait {passes ? 'acceptée' : 'refusée'}.
      </p>
      <div className="mt-3">
        <Primary onClick={() => onSubmit(yes)}>Valider le vote</Primary>
      </div>
    </Panel>
  );
}

function SpyPicker({ options, onPick }: { options: ExpeditionView['players']; onPick: (id: PlayerId) => void }) {
  const [picked, setPicked] = useState<PlayerId | null>(null);
  const name = options.find((p) => p.id === picked)?.name;
  return (
    <Panel title="Qui est la Cartographe ?">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cartographe présumée">
        {options.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={picked === p.id}
            onClick={() => setPicked(p.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              picked === p.id ? 'border-sabo bg-sabo/15 text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Primary disabled={!picked} onClick={() => picked && onPick(picked)}>
          {name ? `Démasquer ${name}` : 'Choisis un joueur'}
        </Primary>
      </div>
    </Panel>
  );
}

function TwoButtons({ yes, no, onYes, onNo }: { yes: string; no: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onYes} className="rounded-xl bg-good px-4 py-4 text-lg font-bold text-bg hover:brightness-110">
        {yes}
      </button>
      <button type="button" onClick={onNo} className="rounded-xl bg-sabo px-4 py-4 text-lg font-bold text-bg hover:brightness-110">
        {no}
      </button>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="mb-3 font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function Primary({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto"
    >
      {children}
    </button>
  );
}

// ───────── Joueurs, historique, journal ─────────

function Players({ view, viewer }: { view: ExpeditionView; viewer: PlayerId | null }) {
  const last = view.lastVote;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Expédition</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {view.players.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-[5rem] flex-1 truncate">
              {p.name}
              {p.id === viewer && <span className="text-accent"> (toi)</span>}
              {p.isBot && <span className="text-muted"> · bot</span>}
            </span>
            {p.id === view.leader && view.phase !== 'over' && <Badge className="border-key/60 text-key">Chef</Badge>}
            {p.onTeam && view.phase !== 'over' && <Badge className="border-accent/60 text-accent">Cordée</Badge>}
            {p.role && <Badge className={ROLE_STYLE[p.role]}>{ROLE_LABEL[p.role]}</Badge>}
            {view.phase === 'reveal' && <span className={`text-xs ${p.acked ? 'text-good' : 'text-muted'}`}>{p.acked ? '✓' : '…'}</span>}
            {view.phase === 'vote' && view.config.votes === 'secret' && (
              <span className={`text-xs ${p.voted ? 'text-good' : 'text-muted'}`}>{p.voted ? 'a voté' : '…'}</span>
            )}
            {view.phase === 'mission' && p.onTeam && (
              <span className={`text-xs ${p.played ? 'text-good' : 'text-muted'}`}>{p.played ? 'a joué' : '…'}</span>
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
        <p className="mt-2 text-xs text-muted">Dernier vote : cordée {last.approved ? 'acceptée' : 'refusée'}.</p>
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

function History({ view, nameOf }: { view: ExpeditionView; nameOf: (id: PlayerId | null) => string }) {
  const done = view.missions.filter((m) => m.result);
  if (done.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Carnet de route</div>
      <ol className="mt-2 flex flex-col gap-1.5">
        {done.map((m) => (
          <li key={m.name}>
            <span className={m.result!.success ? 'text-good' : 'text-sabo'}>{m.result!.success ? '✓' : '✗'}</span>{' '}
            <strong>{m.name}</strong> · {m.result!.team.map(nameOf).join(', ')}
            <span className="text-muted">
              {' '}
              (chef : {nameOf(m.result!.leader)}, {m.result!.sabotages} sabotage{m.result!.sabotages > 1 ? 's' : ''})
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

'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  ACTIONS,
  ACTION_RULES,
  CHARACTERS,
  CHARACTER_LABEL,
  CHARACTER_POWER,
  CHARACTER_THE,
  FORCED_CONSPIRACY,
  type ActionKind,
  type Character,
  type CourtMove,
  type CourtView,
} from '../shared';

type Props = BoardProps<CourtView, CourtMove>;

const CHARACTER_STYLE: Record<Character, string> = {
  banker: 'border-key/70 bg-key/10 text-key',
  swordsman: 'border-sabo/70 bg-sabo/10 text-sabo',
  corsair: 'border-tech/70 bg-tech/10 text-tech',
  envoy: 'border-accent/70 bg-accent/10 text-accent',
  guard: 'border-good/70 bg-good/10 text-good',
};

export default function CourtBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf = (id: PlayerId | null) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);

  return (
    <div className="flex flex-col gap-4">
      <Header view={view} nameOf={nameOf} />
      <Announcement view={view} nameOf={nameOf} />
      {me && <Hand hand={me.hand} />}

      {actor?.alive && view.phase === 'turn' && actingAs === view.active && (
        <ActionPicker view={view} me={actingAs!} hand={me?.hand ?? null} mode={mode} sendMove={sendMove} />
      )}
      {actor?.alive && view.responders.includes(actingAs!) && (
        <Reaction view={view} who={nameOf(actingAs)} mode={mode} nameOf={nameOf} sendMove={sendMove} />
      )}
      {view.phase === 'loss' && view.losing === actingAs && privateView && me && (
        <LoseInfluence hand={me.hand} sendMove={sendMove} />
      )}
      {view.phase === 'exchange' && view.active === actingAs && privateView && me?.exchange && (
        <Exchange pool={me.exchange} keep={me.hand.length} sendMove={sendMove} />
      )}

      <Court view={view} viewer={viewer} />
      <Reference />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── En-tête et annonce ─────────

function Header({ view, nameOf }: { view: CourtView; nameOf: (id: PlayerId | null) => string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.windowEndsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view.windowEndsAt]);
  const left = view.windowEndsAt ? Math.max(0, Math.ceil((view.windowEndsAt - now) / 1000)) : null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Au tour de" value={nameOf(view.active)} />
      <Stat label="Pioche" value={`${view.deckCount} cartes`} />
      <Stat label="Réaction" value={left === null ? '—' : `${left} s`} tone={left !== null && left <= 5 ? 'text-sabo' : ''} />
    </div>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`truncate font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Announcement({ view, nameOf }: { view: CourtView; nameOf: (id: PlayerId | null) => string }) {
  const a = view.action;
  let text: string;
  if (view.phase === 'over') text = 'Partie terminée : les dernières cartes sont révélées.';
  else if (!a || view.phase === 'turn') text = `${nameOf(view.active)} choisit son action.`;
  else {
    const rule = ACTION_RULES[a.kind];
    text = `${nameOf(a.actor)} annonce ${rule.label}${rule.claim ? ` (${CHARACTER_LABEL[rule.claim]})` : ''}${
      a.target ? ` sur ${nameOf(a.target)}` : ''
    }.`;
    if (view.block) text += ` ${nameOf(view.block.blocker)} contre avec ${CHARACTER_THE[view.block.claim]}.`;
    if (view.phase === 'challenge') text += ' Quelqu’un conteste ?';
    if (view.phase === 'block') text += ' Quelqu’un contre ?';
    if (view.phase === 'challengeBlock') text += ' Quelqu’un conteste le contre ?';
    if (view.phase === 'loss') text += ` ${nameOf(view.losing)} doit perdre une influence.`;
    if (view.phase === 'exchange') text += ` ${nameOf(a.actor)} choisit ses personnages.`;
  }
  return <div className="rounded-xl border border-key/40 bg-key/5 px-4 py-3 text-sm">{text}</div>;
}

// ───────── Main secrète ─────────

function CharacterCard({ c, small = false }: { c: Character; small?: boolean }) {
  return (
    <div className={`rounded-xl border-2 ${CHARACTER_STYLE[c]} ${small ? 'px-2 py-1' : 'w-36 px-3 py-2'}`}>
      <div className={`font-bold ${small ? 'text-xs' : ''}`}>{CHARACTER_LABEL[c]}</div>
      {!small && <div className="mt-1 text-[11px] leading-snug text-fg/80">{CHARACTER_POWER[c]}</div>}
    </div>
  );
}

function Hand({ hand }: { hand: Character[] }) {
  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <div className="text-sm text-muted">Tes influences secrètes :</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {hand.map((c, i) => (
          <CharacterCard key={i} c={c} />
        ))}
        {hand.length === 0 && <p className="text-sm text-muted">Tu as quitté la cour.</p>}
      </div>
    </section>
  );
}

// ───────── Choix de l'action ─────────

function ActionPicker({
  view,
  me,
  hand,
  mode,
  sendMove,
}: {
  view: CourtView;
  me: PlayerId;
  hand: Character[] | null;
  mode: Props['mode'];
  sendMove: (m: CourtMove) => void;
}) {
  const [kind, setKind] = useState<ActionKind | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  useEffect(() => {
    setKind(null);
    setTarget(null);
  }, [view.active, view.phase]);
  const coins = view.players.find((p) => p.id === me)!.coins;
  const forced = coins >= FORCED_CONSPIRACY;
  const targets = view.players.filter((p) => p.alive && p.id !== me);
  const rule = kind ? ACTION_RULES[kind] : null;

  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="font-semibold">{mode === 'hotseat' ? `${view.players.find((p) => p.id === me)!.name}, à toi : ` : 'À toi : '}choisis une action</h4>
      {forced && <p className="mt-1 text-xs text-sabo">Avec {FORCED_CONSPIRACY} ducats ou plus, la Conspiration est obligatoire.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((k) => {
          const r = ACTION_RULES[k];
          const disabled = coins < r.cost || (forced && k !== 'conspiracy');
          const bluff = hand && r.claim && !hand.includes(r.claim);
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setTarget(null);
              }}
              className={`rounded-xl border px-3 py-2 text-left disabled:opacity-30 ${
                kind === k ? 'border-accent bg-accent/15' : 'border-line hover:border-accent/50'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {r.label}
                {r.claim && <span className="text-xs font-normal text-muted">({CHARACTER_LABEL[r.claim]})</span>}
                {bluff && <span className="ml-auto rounded border border-sabo/50 px-1 text-[10px] uppercase text-sabo">bluff</span>}
              </div>
              <div className="text-xs text-muted">{r.summary}</div>
            </button>
          );
        })}
      </div>
      {rule?.targeted && (
        <>
          <div className="mt-3 text-xs text-muted">Sur qui ?</div>
          <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cible">
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
                {p.name} · {p.coins} ducats
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        disabled={!kind || (rule?.targeted && !target)}
        onClick={() => kind && sendMove({ type: 'act', kind, target: rule?.targeted ? (target ?? undefined) : undefined })}
        className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto"
      >
        {kind ? `Annoncer : ${ACTION_RULES[kind].label}` : 'Choisis une action'}
      </button>
    </section>
  );
}

// ───────── Réactions ─────────

function Reaction({
  view,
  who,
  mode,
  nameOf,
  sendMove,
}: {
  view: CourtView;
  who: string;
  mode: Props['mode'];
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: CourtMove) => void;
}) {
  const a = view.action!;
  const prefix = mode === 'hotseat' ? `${who} : ` : '';
  const pass = (
    <button
      type="button"
      onClick={() => sendMove({ type: 'pass' })}
      className="rounded-xl border border-line px-4 py-3 font-semibold hover:border-accent/60"
    >
      Laisser passer
    </button>
  );
  if (view.phase === 'block') {
    return (
      <Panel title={`${prefix}contrer ${ACTION_RULES[a.kind].label} ?`}>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACTION_RULES[a.kind].blockedBy.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => sendMove({ type: 'block', claim: c })}
              className={`rounded-xl border-2 px-4 py-3 font-semibold ${CHARACTER_STYLE[c]}`}
            >
              Contrer ({CHARACTER_LABEL[c]})
            </button>
          ))}
          {pass}
        </div>
      </Panel>
    );
  }
  const claimant = view.phase === 'challenge' ? a.actor : view.block!.blocker;
  const claim = view.phase === 'challenge' ? ACTION_RULES[a.kind].claim! : view.block!.claim;
  return (
    <Panel title={`${prefix}contester ? ${nameOf(claimant)} prétend avoir ${CHARACTER_THE[claim]}.`}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => sendMove({ type: 'challenge' })}
          className="rounded-xl bg-sabo px-4 py-3 font-bold text-bg hover:brightness-110"
        >
          Contester
        </button>
        {pass}
      </div>
      <p className="mt-2 text-xs text-muted">Si tu as tort, c’est toi qui perds une influence.</p>
    </Panel>
  );
}

function LoseInfluence({ hand, sendMove }: { hand: Character[]; sendMove: (m: CourtMove) => void }) {
  return (
    <Panel title="Quelle influence perds-tu ?">
      <div className="flex flex-wrap gap-2">
        {hand.map((c, i) => (
          <button key={i} type="button" onClick={() => sendMove({ type: 'lose', card: c })} aria-label={`Perdre ${CHARACTER_LABEL[c]}`}>
            <CharacterCard c={c} />
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">La carte choisie sera retournée, face visible pour tous.</p>
    </Panel>
  );
}

function Exchange({ pool, keep, sendMove }: { pool: Character[]; keep: number; sendMove: (m: CourtMove) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < keep ? [...p, i] : p));
  return (
    <Panel title={`Échange : garde ${keep} personnage${keep > 1 ? 's' : ''}`}>
      <div className="flex flex-wrap gap-2">
        {pool.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={picked.includes(i)}
            onClick={() => toggle(i)}
            className={`rounded-2xl transition ${picked.includes(i) ? '-translate-y-1 ring-2 ring-accent ring-offset-2 ring-offset-bg' : 'opacity-70'}`}
          >
            <CharacterCard c={c} />
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={picked.length !== keep}
        onClick={() => sendMove({ type: 'keep', cards: picked.map((i) => pool[i]!) })}
        className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto"
      >
        Garder ({picked.length}/{keep})
      </button>
    </Panel>
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

// ───────── La cour ─────────

function Court({ view, viewer }: { view: CourtView; viewer: PlayerId | null }) {
  const waiting = new Set(view.responders);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">La cour</div>
      <ul className="mt-2 flex flex-col gap-2">
        {view.players.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border px-3 py-2 ${p.id === view.active && view.phase !== 'over' ? 'border-key/60 bg-key/5' : 'border-line'} ${
              p.alive ? '' : 'opacity-50'
            }`}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className={`min-w-[5rem] flex-1 truncate font-semibold ${p.alive ? '' : 'line-through'}`}>
                {p.name}
                {p.id === viewer && <span className="font-normal text-accent"> (toi)</span>}
                {p.isBot && <span className="font-normal text-muted"> · bot</span>}
              </span>
              {waiting.has(p.id) && <span className="text-xs text-muted">réfléchit…</span>}
              {p.passed && <span className="text-xs text-good">laisse passer</span>}
              <span className="shrink-0 font-bold tabular-nums text-key">{p.coins} ducat{p.coins > 1 ? 's' : ''}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {Array.from({ length: p.influence }, (_, i) => (
                <span key={i} className="h-7 w-5 rounded-md border border-line bg-[linear-gradient(135deg,#1d2640,#151c30)]" aria-label="influence cachée" />
              ))}
              {p.revealed.map((c, i) => (
                <span key={`r${i}`} className={`opacity-80 ${p.alive || view.phase === 'over' ? '' : ''}`}>
                  <CharacterCard c={c} small />
                </span>
              ))}
              {!p.alive && view.phase !== 'over' && <span className="text-xs text-muted">a quitté la cour</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Reference() {
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Aide-mémoire des personnages
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {CHARACTERS.map((c) => (
          <li key={c}>
            <strong>{CHARACTER_LABEL[c]}</strong> : <span className="text-muted">{CHARACTER_POWER[c]}</span>
          </li>
        ))}
        <li className="text-muted">Pour tous : Revenu (+1), Faveur (+2, contrable), Conspiration (7 ducats, imparable).</li>
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

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  ROLE_LABEL,
  type InterrogationMove,
  type InterrogationPlayerView,
  type InterrogationView,
  type Role,
} from '../shared';

type Props = BoardProps<InterrogationView, InterrogationMove>;

const ROLE_STYLE: Record<Role, string> = {
  inspector: 'border-key/50 text-key',
  culprit: 'border-sabo/50 text-sabo',
  innocent: 'border-tech/50 text-tech',
};

export default function InterrogationBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const me = view.me && view.me.id === viewer ? view.me : null;
  const nameOf = (id: PlayerId | null) => view.players.find((p) => p.id === id)?.name ?? '?';
  const inspectorActs = actingAs !== null && actingAs === view.inspector;
  const suspects = view.players.filter((p) => p.id !== view.inspector);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Manche" value={`${view.round} / ${view.totalRounds}`} />
        <Stat label="Enquêteur" value={nameOf(view.inspector)} />
        <div className="col-span-2 sm:col-span-1">
          <Timer view={view} />
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">L’affaire</div>
        <h3 className="mt-1 text-lg font-bold">{view.case.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg/90">{view.case.text}</p>
      </section>

      <Instruction view={view} actingAs={actingAs} viewer={viewer} mode={mode} nameOf={nameOf} />

      {me && (
        <SecretPanel
          view={view}
          role={me.role}
          words={me.words}
          canAck={actingAs === me.id}
          acked={view.players.find((p) => p.id === me.id)?.acked ?? false}
          sendMove={sendMove}
        />
      )}

      {view.phase === 'interrogation' && inspectorActs && (
        <InspectorControls view={view} suspects={suspects} sendMove={sendMove} />
      )}

      {view.grills.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-3 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Mots grillés</div>
          <ul className="mt-2 flex flex-col gap-1">
            {view.grills.map((g, i) => (
              <li key={i}>
                « {g.word} » chez {nameOf(g.target)} :{' '}
                <span className={g.hit ? 'font-semibold text-good' : 'text-muted'}>
                  {g.hit ? 'touché !' : 'raté'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.phase === 'review' && (
        <Review view={view} actingAs={actingAs} nameOf={nameOf} sendMove={sendMove} />
      )}

      {(view.phase === 'scores' || view.phase === 'over') && (
        <RoundScores view={view} nameOf={nameOf} />
      )}

      {view.phase === 'scores' && inspectorActs && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'next' })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110"
        >
          {view.round >= view.totalRounds ? 'Voir le classement final' : 'Manche suivante'}
        </button>
      )}

      <Players view={view} viewer={viewer} />
    </div>
  );
}

// ───────── En-tête ─────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="truncate text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Timer({ view }: { view: InterrogationView }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (view.phase !== 'interrogation') return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [view.phase]);

  let label = `${view.minutes}:00`;
  let tone = 'text-fg';
  if (view.phase === 'interrogation' && view.endsAt) {
    const left = Math.max(0, Math.ceil((view.endsAt - now) / 1000));
    label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (left === 0) {
      label = 'Temps écoulé !';
      tone = 'animate-pulse text-sabo';
    } else if (left <= 30) {
      tone = 'text-key';
    }
  } else if (view.phase !== 'briefing') {
    label = 'Terminé';
    tone = 'text-muted';
  }
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2" aria-live="polite">
      <div className="text-[11px] uppercase tracking-wide text-muted">Chrono</div>
      <div className={`text-base font-semibold tabular-nums ${tone}`}>{label}</div>
    </div>
  );
}

function Instruction({
  view,
  actingAs,
  viewer,
  mode,
  nameOf,
}: {
  view: InterrogationView;
  actingAs: PlayerId | null;
  viewer: PlayerId | null;
  mode: Props['mode'];
  nameOf: (id: PlayerId | null) => string;
}) {
  const inspector = nameOf(view.inspector);
  const isInspector = actingAs === view.inspector;
  // Sur l'écran partagé, on interpelle l'Enquêteur par son nom ; sinon on le tutoie directement.
  const toInspector = (rest: string) =>
    mode === 'hotseat' ? `${inspector}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1);
  let text: string;
  switch (view.phase) {
    case 'briefing': {
      const ready = view.players.filter((p) => p.acked).length;
      const meAcked = view.players.find((p) => p.id === viewer)?.acked;
      text =
        viewer && !meAcked
          ? 'Lis ton rôle et retiens tes mots, puis confirme.'
          : `Chacun découvre son rôle en secret… ${ready}/${view.players.length} prêts`;
      break;
    }
    case 'interrogation':
      text = isInspector
        ? toInspector('lis l’affaire à voix haute, puis interroge les suspects. Grille les mots suspects, et accuse quand tu es prêt.')
        : `${inspector} interroge les suspects. Réponds à ses questions… et place tes mots.`;
      break;
    case 'review': {
      const waiting = view.players.filter((p) => p.id !== view.inspector && !p.declared);
      text = `${inspector} a accusé ${nameOf(view.accused)}. Le Coupable était ${nameOf(view.culprit)} ! ${
        waiting.length ? `Mots placés à cocher : ${waiting.map((p) => p.name).join(', ')}.` : ''
      }`;
      break;
    }
    case 'scores':
      text = isInspector
        ? toInspector('lance la suite quand tout le monde a vu les points.')
        : `Points de la manche. ${inspector} lancera la suite.`;
      break;
    default:
      text = 'Enquête terminée : voici le classement final.';
  }
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isInspector && view.phase === 'interrogation' ? 'border-key/50 bg-key/10' : 'border-line bg-surface'
      }`}
    >
      {text}
    </div>
  );
}

// ───────── Informations secrètes ─────────

function SecretPanel({
  view,
  role,
  words,
  canAck,
  acked,
  sendMove,
}: {
  view: InterrogationView;
  role: Role;
  words: { word: string; burned: boolean }[];
  canAck: boolean;
  acked: boolean;
  sendMove: (m: InterrogationMove) => void;
}) {
  const hint: Record<Role, string> = {
    inspector:
      'Tu ne connais ni le Coupable ni les mots secrets. Écoute bien : un mot placé trop habilement, ou qui colle trop à l’affaire, peut trahir quelqu’un.',
    culprit:
      'Personne ne doit le découvrir. Tes mots ont un lien avec l’affaire : place-les sans attirer l’attention.',
    innocent:
      'Tu n’as rien fait… mais tes mots sont bizarres. Place-les sans te faire griller, et évite de passer pour le Coupable.',
  };
  return (
    <section className={`animate-pop rounded-2xl border bg-surface-2 p-4 ${ROLE_STYLE[role]}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm text-muted">Ton rôle :</span>
        <span className="text-xl font-bold">{ROLE_LABEL[role]}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{hint[role]}</p>

      {words.length > 0 && (
        <>
          <div className="mt-4 text-sm text-muted">Tes mots à placer :</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {words.map((w) => (
              <li
                key={w.word}
                className={`rounded-lg border px-3 py-1.5 text-base font-semibold ${
                  w.burned ? 'border-line text-muted line-through' : 'border-current bg-bg/40 text-fg'
                }`}
              >
                {w.word}
              </li>
            ))}
          </ul>
        </>
      )}

      {view.phase === 'briefing' && !acked && canAck && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'ack' })}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 sm:w-auto"
        >
          {role === 'inspector' ? 'Je suis prêt à enquêter' : 'J’ai retenu mes mots'}
        </button>
      )}
      {view.phase === 'briefing' && acked && (
        <p className="mt-4 text-sm text-muted">En attente des autres joueurs…</p>
      )}
    </section>
  );
}

// ───────── Actions de l'Enquêteur ─────────

function InspectorControls({
  view,
  suspects,
  sendMove,
}: {
  view: InterrogationView;
  suspects: InterrogationPlayerView[];
  sendMove: (m: InterrogationMove) => void;
}) {
  const [grillTarget, setGrillTarget] = useState<PlayerId | null>(null);
  const [word, setWord] = useState('');
  const [accused, setAccused] = useState<PlayerId | null>(null);

  function grill(e: FormEvent) {
    e.preventDefault();
    if (!grillTarget || !word.trim()) return;
    sendMove({ type: 'grill', target: grillTarget, word: word.trim() });
    setWord('');
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-key/40 bg-surface-2 p-4">
      <form onSubmit={grill}>
        <div className="flex items-baseline justify-between">
          <h4 className="font-semibold">Griller un mot</h4>
          <span className="text-xs text-muted">
            {view.grillsLeft} essai{view.grillsLeft > 1 ? 's' : ''} restant{view.grillsLeft > 1 ? 's' : ''}
          </span>
        </div>
        <SuspectPicker suspects={suspects} value={grillTarget} onChange={setGrillTarget} label="Chez qui ?" />
        <div className="mt-2 flex gap-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            maxLength={40}
            placeholder="Le mot entendu"
            aria-label="Mot à griller"
            disabled={view.grillsLeft === 0}
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-key disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!grillTarget || !word.trim() || view.grillsLeft === 0}
            className="rounded-lg border border-key/60 px-4 py-2 text-sm font-semibold text-key hover:bg-key/10 disabled:opacity-40"
          >
            Griller
          </button>
        </div>
      </form>

      <div className="border-t border-line pt-4">
        <h4 className="font-semibold">Accuser</h4>
        <p className="text-xs text-muted">Termine l’interrogatoire et révèle tout.</p>
        <SuspectPicker suspects={suspects} value={accused} onChange={setAccused} label="Qui est le Coupable ?" />
        <button
          type="button"
          disabled={!accused}
          onClick={() => accused && sendMove({ type: 'accuse', target: accused })}
          className="mt-3 w-full rounded-xl bg-sabo px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto"
        >
          {accused ? `Accuser ${suspects.find((s) => s.id === accused)?.name}` : 'Choisis un suspect'}
        </button>
      </div>
    </section>
  );
}

function SuspectPicker({
  suspects,
  value,
  onChange,
  label,
}: {
  suspects: InterrogationPlayerView[];
  value: PlayerId | null;
  onChange: (id: PlayerId) => void;
  label: string;
}) {
  return (
    <div className="mt-2" role="radiogroup" aria-label={label}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {suspects.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={value === s.id}
            onClick={() => onChange(s.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              value === s.id ? 'border-key bg-key/15 text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────── Révélation et points ─────────

function Review({
  view,
  actingAs,
  nameOf,
  sendMove,
}: {
  view: InterrogationView;
  actingAs: PlayerId | null;
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: InterrogationMove) => void;
}) {
  const reveal = view.reveal ?? {};
  return (
    <section className="flex flex-col gap-3">
      {Object.entries(reveal).map(([id, words]) => (
        <ReviewRow
          key={id}
          name={nameOf(id)}
          isCulprit={id === view.culprit}
          isAccused={id === view.accused}
          words={words}
          canDeclare={actingAs === id && !view.players.find((p) => p.id === id)?.declared}
          onDeclare={(placed) => sendMove({ type: 'declare', placed })}
        />
      ))}
    </section>
  );
}

function ReviewRow({
  name,
  isCulprit,
  isAccused,
  words,
  canDeclare,
  onDeclare,
}: {
  name: string;
  isCulprit: boolean;
  isAccused: boolean;
  words: { word: string; burned: boolean; placed: boolean | null }[];
  canDeclare: boolean;
  onDeclare: (placed: string[]) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (w: string) =>
    setChecked((c) => (c.includes(w) ? c.filter((x) => x !== w) : [...c, w]));

  return (
    <div
      className={`rounded-xl border p-3 ${
        canDeclare ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{name}</span>
        <span
          className={`rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${
            isCulprit ? ROLE_STYLE.culprit : ROLE_STYLE.innocent
          }`}
        >
          {isCulprit ? 'Coupable' : 'Innocent'}
        </span>
        {isAccused && <span className="text-xs font-semibold text-key">accusé</span>}
      </div>
      {canDeclare && (
        <p className="mt-1 text-xs text-accent">
          Coche les mots que tu as vraiment prononcés. La table peut contester !
        </p>
      )}
      <ul className="mt-2 flex flex-wrap gap-2">
        {words.map((w) =>
          canDeclare && !w.burned ? (
            <li key={w.word}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-good has-[:checked]:text-good">
                <input
                  type="checkbox"
                  checked={checked.includes(w.word)}
                  onChange={() => toggle(w.word)}
                  className="h-4 w-4 accent-[var(--color-good)]"
                />
                {w.word}
              </label>
            </li>
          ) : (
            <li
              key={w.word}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                w.burned
                  ? 'border-line text-muted line-through'
                  : w.placed
                    ? 'border-good/60 text-good'
                    : 'border-line text-fg/80'
              }`}
            >
              {w.word}
              {w.burned ? ' · grillé' : w.placed ? ' ✓' : w.placed === false ? ' · non placé' : ''}
            </li>
          ),
        )}
      </ul>
      {canDeclare && (
        <button
          type="button"
          onClick={() => onDeclare(checked)}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:brightness-110"
        >
          Valider ({checked.length} placé{checked.length > 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}

function RoundScores({
  view,
  nameOf,
}: {
  view: InterrogationView;
  nameOf: (id: PlayerId | null) => string;
}) {
  if (!view.lastRound) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Points de la manche {view.round}
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {view.lastRound.map((line) => (
          <li key={line.playerId} className="flex items-start gap-3 text-sm">
            <span className="w-10 shrink-0 text-right font-bold tabular-nums text-good">+{line.points}</span>
            <span className="min-w-0">
              <span className="font-semibold">{nameOf(line.playerId)}</span>
              <span className="text-muted"> · {line.reasons.join(' · ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Players({ view, viewer }: { view: InterrogationView; viewer: PlayerId | null }) {
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Classement</div>
      <ol className="mt-2 flex flex-col gap-1.5">
        {ranked.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p.id === viewer && <span className="text-accent"> (toi)</span>}
            </span>
            {p.role && (
              <span
                className={`rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${ROLE_STYLE[p.role]}`}
              >
                {ROLE_LABEL[p.role]}
              </span>
            )}
            {view.phase === 'briefing' && (
              <span className={`text-xs ${p.acked ? 'text-good' : 'text-muted'}`}>{p.acked ? '✓' : '…'}</span>
            )}
            <span className="w-10 text-right font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

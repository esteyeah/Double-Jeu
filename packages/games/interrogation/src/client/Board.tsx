'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  ACCUSATION_SECONDS,
  ROLE_LABEL,
  type InterrogationMove,
  type InterrogationPlayerView,
  type InterrogationView,
  type RevealedWord,
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

      {(view.phase === 'interrogation' || view.phase === 'accusation') && inspectorActs && (
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

      {view.reveal && <Reveal view={view} actingAs={actingAs} nameOf={nameOf} sendMove={sendMove} />}

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
  const timed = view.phase === 'interrogation' || view.phase === 'accusation';
  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [timed]);

  let label = `${view.minutes}:00`;
  let tone = 'text-fg';
  let title = 'Chrono';
  if (timed && view.endsAt) {
    const left = Math.max(0, Math.ceil((view.endsAt - now) / 1000));
    label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (view.phase === 'accusation') {
      title = 'Temps pour accuser';
      tone = 'animate-pulse text-sabo';
    } else if (left <= 30) {
      tone = 'text-key';
    }
  } else if (view.phase !== 'briefing') {
    label = 'Terminé';
    tone = 'text-muted';
  }
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{title}</div>
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
    case 'accusation':
      text = isInspector
        ? toInspector(`le temps est écoulé ! Accuse un suspect dans les ${ACCUSATION_SECONDS} secondes, sinon le Coupable s’échappe.`)
        : `Temps écoulé, silence ! ${inspector} doit accuser un suspect.`;
      break;
    case 'review': {
      const waiting = view.players.filter((p) => p.id !== view.inspector && !p.declared);
      const verdict = view.accused
        ? `${inspector} a accusé ${nameOf(view.accused)}.`
        : 'Personne n’a été accusé.';
      text = `${verdict} Le Coupable était ${nameOf(view.culprit)} ! Mots placés à déclarer : ${waiting
        .map((p) => p.name)
        .join(', ')}.`;
      break;
    }
    case 'verify': {
      const waiting = view.players.filter((p) => !p.verified);
      text = `Vérification : chacun signale les mots qu’il n’a pas entendus. En attente : ${waiting
        .map((p) => p.name)
        .join(', ')}.`;
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

  const canGrill = view.phase === 'interrogation';
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-key/40 bg-surface-2 p-4">
      {canGrill && (
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
      )}

      <div className={canGrill ? 'border-t border-line pt-4' : ''}>
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

/**
 * Révélation des mots, en trois temps :
 * - review : chaque suspect déclare ses mots placés ;
 * - verify : chaque joueur signale les mots déclarés qu'il n'a pas entendus ;
 * - scores : verdict final (placé, grillé, refusé par la table).
 */
function Reveal({
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
  const [checked, setChecked] = useState<string[]>([]);
  const [doubts, setDoubts] = useState<{ target: PlayerId; word: string }[]>([]);
  const reveal = view.reveal ?? {};
  const actor = view.players.find((p) => p.id === actingAs);
  const declaring = view.phase === 'review' && !!actor && actor.id !== view.inspector && !actor.declared;
  const verifying = view.phase === 'verify' && !!actor && !actor.verified;

  // Sur l'écran partagé, chaque joueur repart d'une sélection vide.
  useEffect(() => {
    setChecked([]);
    setDoubts([]);
  }, [actingAs, view.phase]);

  const toggleWord = (w: string) =>
    setChecked((c) => (c.includes(w) ? c.filter((x) => x !== w) : [...c, w]));
  const isDoubted = (target: PlayerId, word: string) =>
    doubts.some((d) => d.target === target && d.word === word);
  const toggleDoubt = (target: PlayerId, word: string) =>
    setDoubts((list) =>
      isDoubted(target, word)
        ? list.filter((d) => !(d.target === target && d.word === word))
        : [...list, { target, word }],
    );

  return (
    <section className="flex flex-col gap-3">
      {declaring && (
        <p className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
          {actor.name}, coche les mots que tu as vraiment prononcés. Les autres joueurs pourront les
          contester.
        </p>
      )}
      {verifying && (
        <p className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
          {actor.name}, touche les mots que tu n’as <strong>pas</strong> entendus. Un mot signalé par la
          majorité des autres joueurs ne compte pas.
        </p>
      )}

      {Object.entries(reveal).map(([id, words]) => {
        const mine = id === actingAs;
        return (
          <div
            key={id}
            className={`rounded-xl border p-3 ${
              (declaring && mine) || (verifying && !mine) ? 'border-accent/60 bg-accent/5' : 'border-line bg-surface'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{nameOf(id)}</span>
              <span
                className={`rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${
                  id === view.culprit ? ROLE_STYLE.culprit : ROLE_STYLE.innocent
                }`}
              >
                {id === view.culprit ? 'Coupable' : 'Innocent'}
              </span>
              {id === view.accused && <span className="text-xs font-semibold text-key">accusé</span>}
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {words.map((w) => {
                if (declaring && mine && !w.burned) {
                  return (
                    <li key={w.word}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm has-[:checked]:border-good has-[:checked]:text-good">
                        <input
                          type="checkbox"
                          checked={checked.includes(w.word)}
                          onChange={() => toggleWord(w.word)}
                          className="h-4 w-4 accent-[var(--color-good)]"
                        />
                        {w.word}
                      </label>
                    </li>
                  );
                }
                if (verifying && !mine && w.placed) {
                  const doubted = isDoubted(id, w.word);
                  return (
                    <li key={w.word}>
                      <button
                        type="button"
                        aria-pressed={doubted}
                        onClick={() => toggleDoubt(id, w.word)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                          doubted ? 'border-sabo bg-sabo/15 text-sabo line-through' : 'border-good/60 text-good'
                        }`}
                      >
                        {w.word} {doubted ? '· pas entendu' : '✓'}
                      </button>
                    </li>
                  );
                }
                return <WordChip key={w.word} w={w} />;
              })}
            </ul>
          </div>
        );
      })}

      {declaring && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'declare', placed: checked })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110"
        >
          Valider ({checked.length} placé{checked.length > 1 ? 's' : ''})
        </button>
      )}
      {verifying && (
        <button
          type="button"
          onClick={() => sendMove({ type: 'verify', doubts })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110"
        >
          {doubts.length === 0
            ? 'Valider : j’ai tout entendu'
            : `Valider (${doubts.length} signalé${doubts.length > 1 ? 's' : ''})`}
        </button>
      )}
    </section>
  );
}

function WordChip({ w }: { w: RevealedWord }) {
  let style = 'border-line text-fg/80';
  let suffix = '';
  if (w.burned) {
    style = 'border-line text-muted line-through';
    suffix = ' · grillé';
  } else if (w.rejected) {
    style = 'border-sabo/60 text-sabo line-through';
    suffix = ` · refusé (${w.doubts} doute${(w.doubts ?? 0) > 1 ? 's' : ''})`;
  } else if (w.placed) {
    style = 'border-good/60 text-good';
    suffix = ' ✓';
  } else if (w.placed === false) {
    suffix = ' · non placé';
  }
  return (
    <li className={`rounded-lg border px-3 py-1.5 text-sm ${style}`}>
      {w.word}
      {suffix}
    </li>
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
            <span className="min-w-[5rem] flex-1 truncate">
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

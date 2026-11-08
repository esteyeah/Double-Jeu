import type { AnyGameModule, GameSnapshot, LogEntry, PlayerId, PlayerInfo, Rng, SetupExtras } from './types';

export type MoveOutcome<State> = { ok: true; state: State } | { ok: false; error: string };

/**
 * Point d'entrée unique pour jouer un coup, côté serveur comme en local :
 * forme (Zod) → règles (validate) → application (apply).
 * Le coup arrive en `unknown` : il vient d'un client, on ne lui fait pas confiance.
 */
export function applyMove<State>(
  mod: AnyGameModule,
  state: State,
  by: PlayerId,
  rawMove: unknown,
  rng: Rng,
  now: number = Date.now(),
): MoveOutcome<State> {
  if (mod.result(state)) return { ok: false, error: 'La partie est terminée.' };
  const parsed = mod.moveSchema.safeParse(rawMove);
  if (!parsed.success) return { ok: false, error: 'Coup mal formé.' };
  const error = mod.validate(state, by, parsed.data);
  if (error) return { ok: false, error };
  return { ok: true, state: mod.apply(state, by, parsed.data, rng, now) };
}

/** Applique l'échéance si elle est passée ; sinon renvoie `null`. */
export function applyDeadline<State>(
  mod: AnyGameModule,
  state: State,
  rng: Rng,
  now: number = Date.now(),
): State | null {
  if (!mod.deadline || !mod.onDeadline || mod.result(state)) return null;
  const at = mod.deadline(state);
  if (at === null || now < at) return null;
  return mod.onDeadline(state, rng, now) as State;
}

export function snapshotFor<State>(
  mod: AnyGameModule,
  state: State,
  viewer: PlayerId | null,
  seq: number,
): GameSnapshot {
  return {
    gameId: mod.meta.id,
    seq,
    view: mod.view(state, viewer),
    expectedActors: mod.expectedActors(state),
    result: mod.result(state),
  };
}

/** Garde uniquement les lignes de journal que `viewer` a le droit de lire. */
export function visibleLog(log: readonly LogEntry[], viewer: PlayerId | null): string[] {
  return log
    .filter((e) => e.visibleTo === 'all' || (viewer !== null && e.visibleTo.includes(viewer)))
    .map((e) => e.text);
}

/**
 * Cherche le prochain coup d'un joueur automatisé (bot, ou humain déconnecté).
 * Les joueurs attendus passent en premier pour que la partie avance.
 */
export function nextBotMove(
  mod: AnyGameModule,
  state: unknown,
  automated: readonly PlayerId[],
  rng: Rng,
): { by: PlayerId; move: unknown } | null {
  if (!mod.bot || mod.result(state)) return null;
  const expected = new Set(mod.expectedActors(state));
  const ordered = [...automated].sort(
    (a, b) => Number(expected.has(b)) - Number(expected.has(a)),
  );
  for (const id of ordered) {
    const move = mod.bot(mod.view(state, id), id, rng);
    if (move !== null && mod.validate(state, id, move) === null) return { by: id, move };
  }
  return null;
}

/**
 * Joue une partie complète avec des bots partout. Sert aux tests de robustesse :
 * des milliers de parties aléatoires ne doivent jamais bloquer ni planter.
 */
export function simulate<State>(
  mod: AnyGameModule,
  players: PlayerInfo[],
  rng: Rng,
  options: { maxSteps?: number; onStep?: (state: State) => void; config?: unknown; extras?: SetupExtras } = {},
): { state: State; steps: number } {
  const maxSteps = options.maxSteps ?? 10_000;
  let state = mod.setup(players, options.config ?? mod.defaultConfig, rng, options.extras) as State;
  let clock = 0; // horloge virtuelle : une minute par coup
  const ids = players.map((p) => p.id);
  for (let steps = 0; steps < maxSteps; steps++) {
    if (mod.result(state)) return { state, steps };
    const next = nextBotMove(mod, state, ids, rng);
    if (!next) {
      // Personne n'a de coup à jouer : on avance l'horloge jusqu'à l'échéance, s'il y en a une.
      const at = mod.deadline?.(state) ?? null;
      if (at === null) throw new Error(`Partie bloquée après ${steps} coups`);
      clock = Math.max(clock, at);
      state = applyDeadline(mod, state, rng, clock) as State;
      options.onStep?.(state);
      continue;
    }
    clock += 60_000;
    const out = applyMove(mod, state, next.by, next.move, rng, clock);
    if (!out.ok) throw new Error(`Le bot ${next.by} a joué un coup refusé : ${out.error}`);
    state = out.state;
    options.onStep?.(state);
  }
  throw new Error(`Pas de fin après ${maxSteps} coups`);
}

/** « 8 écus », « 1 écu », « 92 % » : valeur d'un record avec son unité accordée. */
export function formatRecordValue(value: number, unit: string): string {
  if (unit === '%') return `${value} %`;
  const singular = Math.abs(value) < 2 && /s$/.test(unit) ? unit.replace(/s$/, '') : unit;
  return `${value} ${singular}`;
}

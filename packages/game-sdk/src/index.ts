import type { GameModule } from './types';

export * from './types';
export * from './rng';
export * from './runtime';

/** Aide au typage : `defineGame({...})` infère State/Move/View/Config. */
export function defineGame<State, Move, View, Config>(
  mod: GameModule<State, Move, View, Config>,
): GameModule<State, Move, View, Config> {
  return mod;
}

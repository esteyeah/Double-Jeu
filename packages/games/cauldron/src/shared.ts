import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export type Role = 'alchemist' | 'poisoner';
export type Ingredient = 1 | 0 | -2;
export type ActionKind = 'taste' | 'skim' | 'suspect' | 'plead';
export type Card = { kind: 'ingredient'; value: Ingredient } | { kind: 'action'; action: ActionKind };
export type Phase = 'reveal' | 'turn' | 'tasted' | 'vote' | 'over';

export const HAND_SIZE = 3;
export const EXPEL_AT = 3;
export const TASTE_COUNT = 3;
export const SKIM_COUNT = 2;

/** Empoisonneurs selon la table. */
export const POISONERS: Record<number, number> = { 3: 1, 4: 1, 5: 2, 6: 2, 7: 2, 8: 3 };

/** Composition de la pioche (60 cartes). */
export const DECK: { card: Card; count: number }[] = [
  { card: { kind: 'ingredient', value: 1 }, count: 26 },
  { card: { kind: 'ingredient', value: 0 }, count: 8 },
  { card: { kind: 'ingredient', value: -2 }, count: 8 },
  { card: { kind: 'action', action: 'taste' }, count: 5 },
  { card: { kind: 'action', action: 'skim' }, count: 4 },
  { card: { kind: 'action', action: 'suspect' }, count: 6 },
  { card: { kind: 'action', action: 'plead' }, count: 3 },
];

/**
 * Force que la potion doit atteindre, selon la table (réglée par simulation de bots :
 * à 5 et 8 joueurs, les Empoisonneurs sont proportionnellement plus nombreux).
 */
export const TARGETS: Record<number, number> = { 3: 8, 4: 8, 5: 7, 6: 8, 7: 9, 8: 7 };
export const targetFor = (players: number) => TARGETS[players] ?? 8;

export const cauldronConfigSchema = z.object({
  votes: z.enum(['secret', 'hands']),
});
export type CauldronConfig = z.infer<typeof cauldronConfigSchema>;

const playerRef = z.string().min(1).max(64);
const ingredientSchema = z.union([z.literal(1), z.literal(0), z.literal(-2)]);

export const cauldronMoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ack') }),
  /** Verser un ingrédient en annonçant une valeur (mensonge permis). */
  z.object({ type: z.literal('pour'), index: z.number().int().min(0).max(HAND_SIZE - 1), announce: ingredientSchema }),
  z.object({ type: z.literal('action'), index: z.number().int().min(0).max(HAND_SIZE - 1), target: playerRef.optional() }),
  /** Proposer de servir la potion (déclenche un vote). */
  z.object({ type: z.literal('propose') }),
  z.object({ type: z.literal('vote'), yes: z.boolean() }),
  /** Vote à main levée : le proposant reporte qui a voté oui. */
  z.object({ type: z.literal('tally'), yes: z.array(playerRef).max(8) }),
  /** Le goûteur a vu le résultat. */
  z.object({ type: z.literal('seen') }),
]);
export type CauldronMove = z.infer<typeof cauldronMoveSchema>;

export interface Pour {
  by: PlayerId;
  value: Ingredient;
  announced: Ingredient;
}

export interface Taste {
  /** Valeurs réelles (dans le désordre). */
  values: Ingredient[];
  /** Les versements goûtés (qui, et ce qui avait été annoncé). */
  pours: { by: PlayerId; announced: Ingredient }[];
}

export type CauldronOutcome =
  | { winner: 'alchemist'; reason: 'potion' | 'expelled' }
  | { winner: 'poisoner'; reason: 'potion' | 'deck' | 'majority' };

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface CauldronState {
  players: PlayerInfo[];
  config: CauldronConfig;
  roles: Record<PlayerId, Role>;
  expelled: PlayerId[];
  hands: Record<PlayerId, Card[]>;
  deck: Card[];
  discard: Card[];
  cauldron: Pour[];
  suspicion: Record<PlayerId, number>;
  turn: number;
  active: PlayerId;
  phase: Phase;
  target: number;
  acked: PlayerId[];
  vote: { proposer: PlayerId; votes: Record<PlayerId, boolean> } | null;
  lastVote: { proposer: PlayerId; votes: Record<PlayerId, boolean>; passed: boolean } | null;
  /** Dégustations, connues seulement du goûteur. */
  tastes: Record<PlayerId, Taste[]>;
  outcome: CauldronOutcome | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface CauldronPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  expelled: boolean;
  suspicion: number;
  handCount: number;
  acked: boolean;
  voted: boolean;
  /** Connu : soi, ses complices, les chassés, et tout le monde en fin de partie. */
  role: Role | null;
}

export interface CauldronView {
  phase: Phase;
  config: CauldronConfig;
  players: CauldronPlayerView[];
  active: PlayerId;
  target: number;
  deckCount: number;
  /** Versements publics : qui a versé et ce qu'il a annoncé (valeurs réelles révélées en fin de partie). */
  pours: { by: PlayerId; announced: Ingredient; value: Ingredient | null }[];
  announcedTotal: number;
  /** Total réel, révélé en fin de partie seulement. */
  realTotal: number | null;
  vote: { proposer: PlayerId } | null;
  lastVote: CauldronState['lastVote'];
  me: {
    id: PlayerId;
    role: Role;
    allies: PlayerId[];
    hand: Card[];
    tastes: Taste[];
    myVote: boolean | null;
  } | null;
  outcome: CauldronOutcome | null;
  log: string[];
}

export const INGREDIENT_LABEL: Record<Ingredient, string> = {
  1: 'Racine dorée',
  0: 'Eau de source',
  [-2]: 'Ciguë',
} as Record<Ingredient, string>;

export const ACTION_LABEL: Record<ActionKind, string> = {
  taste: 'Goûter',
  skim: 'Écumer',
  suspect: 'Soupçon',
  plead: 'Plaidoyer',
};

export const ACTION_HELP: Record<ActionKind, string> = {
  taste: `Regarde en secret les ${TASTE_COUNT} derniers ingrédients versés.`,
  skim: `Retire les ${SKIM_COUNT} derniers ingrédients, sans les regarder.`,
  suspect: `Pose un jeton de soupçon sur un joueur (à ${EXPEL_AT}, il est chassé).`,
  plead: 'Retire un jeton de soupçon à un joueur (toi compris).',
};

export const ROLE_LABEL: Record<Role, string> = {
  alchemist: 'Alchimiste',
  poisoner: 'Empoisonneur',
};

export const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

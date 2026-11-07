import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export const CHARACTERS = ['banker', 'swordsman', 'corsair', 'envoy', 'guard'] as const;
export type Character = (typeof CHARACTERS)[number];

export const ACTIONS = ['income', 'favor', 'conspiracy', 'tax', 'assassinate', 'racket', 'exchange'] as const;
export type ActionKind = (typeof ACTIONS)[number];

export type Phase = 'turn' | 'challenge' | 'block' | 'challengeBlock' | 'loss' | 'exchange' | 'over';

export const START_COINS = 2;
export const COPIES = 3;
export const CONSPIRACY_COST = 7;
export const ASSASSINATE_COST = 3;
/** Dès ce montant, la Conspiration est obligatoire. */
export const FORCED_CONSPIRACY = 10;

export interface ActionRule {
  label: string;
  /** Personnage revendiqué (null = action générale, impossible à contester). */
  claim: Character | null;
  cost: number;
  targeted: boolean;
  /** Personnages qui peuvent contrer, et qui a le droit de contrer. */
  blockedBy: Character[];
  blockers: 'anyone' | 'target' | 'none';
  summary: string;
}

export const ACTION_RULES: Record<ActionKind, ActionRule> = {
  income: { label: 'Revenu', claim: null, cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: '+1 ducat' },
  favor: { label: 'Faveur', claim: null, cost: 0, targeted: false, blockedBy: ['banker'], blockers: 'anyone', summary: '+2 ducats, contrable par le Banquier' },
  conspiracy: { label: 'Conspiration', claim: null, cost: CONSPIRACY_COST, targeted: true, blockedBy: [], blockers: 'none', summary: `${CONSPIRACY_COST} ducats : la cible perd une influence, imparable` },
  tax: { label: 'Taxe', claim: 'banker', cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: '+3 ducats' },
  assassinate: { label: 'Assassinat', claim: 'swordsman', cost: ASSASSINATE_COST, targeted: true, blockedBy: ['guard'], blockers: 'target', summary: `${ASSASSINATE_COST} ducats : la cible perd une influence` },
  racket: { label: 'Racket', claim: 'corsair', cost: 0, targeted: true, blockedBy: ['corsair', 'envoy'], blockers: 'target', summary: 'prends 2 ducats à la cible' },
  exchange: { label: 'Échange', claim: 'envoy', cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: 'pioche 2 personnages, garde ceux que tu veux' },
};

export const CHARACTER_LABEL: Record<Character, string> = {
  banker: 'Banquier',
  swordsman: 'Spadassin',
  corsair: 'Corsaire',
  envoy: 'Émissaire',
  guard: 'Garde',
};

/** Avec l'article, pour des phrases correctes (« l’Émissaire », « la Garde »). */
export const CHARACTER_THE: Record<Character, string> = {
  banker: 'le Banquier',
  swordsman: 'le Spadassin',
  corsair: 'le Corsaire',
  envoy: 'l’Émissaire',
  guard: 'la Garde',
};

export const CHARACTER_POWER: Record<Character, string> = {
  banker: 'Taxe : +3 ducats. Contre la Faveur.',
  swordsman: `Assassinat : paie ${ASSASSINATE_COST}, la cible perd une influence.`,
  corsair: 'Racket : prends 2 ducats. Contre le Racket.',
  envoy: 'Échange : pioche 2, garde ce que tu veux. Contre le Racket.',
  guard: 'Contre l’Assassinat.',
};

export const courtConfigSchema = z.object({
  /** Secondes laissées pour contester ou contrer. */
  reaction: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});
export type CourtConfig = z.infer<typeof courtConfigSchema>;

const playerRef = z.string().min(1).max(64);
const characterSchema = z.enum(CHARACTERS);

export const courtMoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('act'), kind: z.enum(ACTIONS), target: playerRef.optional() }),
  z.object({ type: z.literal('challenge') }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('block'), claim: characterSchema }),
  z.object({ type: z.literal('lose'), card: characterSchema }),
  z.object({ type: z.literal('keep'), cards: z.array(characterSchema).min(1).max(2) }),
]);
export type CourtMove = z.infer<typeof courtMoveSchema>;

export interface Seat {
  /** Influences encore cachées. */
  cards: Character[];
  /** Influences perdues, face visible. */
  revealed: Character[];
  coins: number;
}

export interface ActionDecl {
  kind: ActionKind;
  actor: PlayerId;
  target: PlayerId | null;
  paid: number;
}

export interface BlockDecl {
  blocker: PlayerId;
  claim: Character;
}

/** Que faire une fois l'influence perdue. */
export type Then = 'next' | 'block' | 'resolve';

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface CourtState {
  players: PlayerInfo[];
  config: CourtConfig;
  seats: Record<PlayerId, Seat>;
  deck: Character[];
  turn: number;
  active: PlayerId;
  phase: Phase;
  action: ActionDecl | null;
  block: BlockDecl | null;
  passed: PlayerId[];
  windowEndsAt: number | null;
  loss: { player: PlayerId; then: Then } | null;
  exchange: Character[] | null;
  winner: PlayerId | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface CourtPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  coins: number;
  /** Nombre d'influences encore cachées. */
  influence: number;
  revealed: Character[];
  alive: boolean;
  /** Pendant une fenêtre de réaction : a déjà laissé passer. */
  passed: boolean;
}

export interface CourtView {
  phase: Phase;
  config: CourtConfig;
  players: CourtPlayerView[];
  active: PlayerId;
  action: ActionDecl | null;
  block: BlockDecl | null;
  /** Joueurs dont on attend une réaction (fenêtre ouverte). */
  responders: PlayerId[];
  windowEndsAt: number | null;
  losing: PlayerId | null;
  deckCount: number;
  me: { id: PlayerId; hand: Character[]; exchange: Character[] | null } | null;
  winner: PlayerId | null;
  log: string[];
}

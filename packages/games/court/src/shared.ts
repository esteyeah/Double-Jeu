import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

/** Tous les personnages disponibles ; l'hôte choisit ceux qui composent la cour. */
export const CHARACTERS = ['banker', 'executioner', 'brigand', 'envoy', 'guard', 'informer', 'mercenary'] as const;
export type Character = (typeof CHARACTERS)[number];
export const CLASSIC_COURT: Character[] = ['banker', 'executioner', 'brigand', 'envoy', 'guard'];
/** Plancher absolu ; le vrai minimum dépend du nombre de joueurs (voir `cardsNeeded`). */
export const MIN_COURT = 2;


export const ACTIONS = [
  'income',
  'favor',
  'conspiracy',
  'tax',
  'execute',
  'racket',
  'exchange',
  'snoop',
  'escort',
] as const;
export type ActionKind = (typeof ACTIONS)[number];

export type Phase = 'turn' | 'challenge' | 'block' | 'challengeBlock' | 'loss' | 'exchange' | 'show' | 'peek' | 'over';

export const START_COINS = 2;
export const COPIES = 3;
/** Personnages nécessaires pour avoir assez de cartes : 2 par joueur + 2 pour l'Échange. */
export const charactersNeeded = (players: number) => Math.ceil((2 * players + 2) / COPIES);
export const CONSPIRACY_COST = 7;
export const EXECUTE_COST = 3;
export const ESCORT_COST = 2;
/** Dès ce montant, la Conspiration est obligatoire. */
export const FORCED_CONSPIRACY = 10;

/** « 1 écu », « 3 écus ». */
export const ecus = (n: number) => `${n} écu${n > 1 ? 's' : ''}`;

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
  income: { label: 'Revenu', claim: null, cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: '+1 écu' },
  favor: { label: 'Faveur', claim: null, cost: 0, targeted: false, blockedBy: ['banker'], blockers: 'anyone', summary: '+2 écus, contrable par le Banquier' },
  conspiracy: { label: 'Conspiration', claim: null, cost: CONSPIRACY_COST, targeted: true, blockedBy: [], blockers: 'none', summary: `${CONSPIRACY_COST} écus : la cible perd une influence, imparable` },
  tax: { label: 'Taxe', claim: 'banker', cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: '+3 écus' },
  execute: { label: 'Exécution', claim: 'executioner', cost: EXECUTE_COST, targeted: true, blockedBy: ['guard'], blockers: 'target', summary: `${EXECUTE_COST} écus : la cible perd une influence` },
  racket: { label: 'Racket', claim: 'brigand', cost: 0, targeted: true, blockedBy: ['brigand', 'envoy'], blockers: 'target', summary: 'prends 2 écus à la cible' },
  exchange: { label: 'Échange', claim: 'envoy', cost: 0, targeted: false, blockedBy: [], blockers: 'none', summary: 'pioche 2 personnages, garde ceux que tu veux' },
  snoop: { label: 'Espionnage', claim: 'informer', cost: 0, targeted: true, blockedBy: [], blockers: 'none', summary: 'la cible te montre en secret une de ses influences' },
  escort: { label: 'Escorte', claim: 'mercenary', cost: ESCORT_COST, targeted: false, blockedBy: [], blockers: 'none', summary: `${ESCORT_COST} écus : intouchable par les personnages jusqu’à ton prochain tour` },
};

export const CHARACTER_LABEL: Record<Character, string> = {
  banker: 'Banquier',
  executioner: 'Bourreau',
  brigand: 'Brigand',
  envoy: 'Émissaire',
  guard: 'Garde',
  informer: 'Mouchard',
  mercenary: 'Mercenaire',
};

/** Avec l'article, pour des phrases correctes (« l’Émissaire », « la Garde »). */
export const CHARACTER_THE: Record<Character, string> = {
  banker: 'le Banquier',
  executioner: 'le Bourreau',
  brigand: 'le Brigand',
  envoy: 'l’Émissaire',
  guard: 'la Garde',
  informer: 'le Mouchard',
  mercenary: 'le Mercenaire',
};

export const CHARACTER_POWER: Record<Character, string> = {
  banker: 'Taxe : +3 écus. Contre la Faveur.',
  executioner: `Exécution : paie ${EXECUTE_COST}, la cible perd une influence.`,
  brigand: 'Racket : prends 2 écus. Contre le Racket.',
  envoy: 'Échange : pioche 2, garde ce que tu veux. Contre le Racket.',
  guard: 'Contre l’Exécution.',
  informer: 'Espionnage : la cible te montre en secret une de ses influences.',
  mercenary: `Escorte : paie ${ESCORT_COST}, intouchable par les personnages jusqu’à ton prochain tour.`,
};

export const courtConfigSchema = z.object({
  /** Secondes laissées pour contester ou contrer. */
  reaction: z.union([z.literal(10), z.literal(20), z.literal(30)]),
  /** Personnages en jeu (3 exemplaires de chacun). */
  characters: z
    .array(z.enum(CHARACTERS))
    .min(MIN_COURT)
    .max(CHARACTERS.length)
    .refine((list) => new Set(list).size === list.length, 'Personnage en double.'),
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
  /** Espionnage : la cible choisit l'influence qu'elle montre. */
  z.object({ type: z.literal('show'), card: characterSchema }),
  /** Le Mouchard a vu la carte. */
  z.object({ type: z.literal('seen') }),
]);
export type CourtMove = z.infer<typeof courtMoveSchema>;

export interface Seat {
  /** Influences encore cachées. */
  cards: Character[];
  /** Influences perdues, face visible. */
  revealed: Character[];
  coins: number;
  /** Escorte du Mercenaire : intouchable par les personnages jusqu'à son prochain tour. */
  escorted: boolean;
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

/** Ce qu'un joueur a appris par Espionnage. */
export interface Intel {
  target: PlayerId;
  card: Character;
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
  /** Espionnages réussis, connus seulement de celui qui a espionné. */
  intel: Record<PlayerId, Intel[]>;
  /**
   * Personnages revendiqués par chacun (annonces et contres, information publique),
   * depuis sa dernière main renouvelée. Plus de personnages différents que de cartes = bluff certain.
   */
  claims: Record<PlayerId, Character[]>;
  /** Pour les records : écus au plus haut, bluffs démasqués. */
  stats: Record<PlayerId, { maxCoins: number; caught: number }>;
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
  escorted: boolean;
  /** Pendant une fenêtre de réaction : a déjà laissé passer. */
  passed: boolean;
  /** Personnages revendiqués depuis sa dernière main renouvelée (dans l'ordre, avec répétitions). */
  claimed: Character[];
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
  me: {
    id: PlayerId;
    hand: Character[];
    exchange: Character[] | null;
    /** Ce que j'ai appris par Espionnage (le plus récent en dernier). */
    intel: Intel[];
  } | null;
  winner: PlayerId | null;
  log: string[];
}

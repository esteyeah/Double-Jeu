import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export type Role = 'inspector' | 'culprit' | 'innocent';
export type Phase =
  | 'briefing'
  | 'interrogation'
  | 'bets'
  | 'accusation'
  | 'review'
  | 'verify'
  | 'scores'
  | 'over';

export const WORDS_PER_SUSPECT = 3;
export const GRILLS_PER_ROUND = 3;
/** Temps laissé à l'Enquêteur pour accuser une fois les paris faits. */
export const ACCUSATION_SECONDS = 60;
/** Points d'un pari gagné (« il va trouver » / « il va se tromper »). */
export const BET_POINTS = 2;

export const interrogationConfigSchema = z.object({
  /** Durée indicative de l'interrogatoire. */
  minutes: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  /** 0 = chacun est Enquêteur une fois. */
  rounds: z.union([z.literal(0), z.literal(3), z.literal(5)]),
});
export type InterrogationConfig = z.infer<typeof interrogationConfigSchema>;

const playerRef = z.string().min(1).max(64);
const wordInput = z.string().trim().min(1).max(40);

export const interrogationMoveSchema = z.discriminatedUnion('type', [
  /** « J'ai lu mon rôle » (briefing). */
  z.object({ type: z.literal('ack') }),
  /** L'Enquêteur pense avoir entendu un mot secret chez ce suspect. */
  z.object({ type: z.literal('grill'), target: playerRef, word: wordInput }),
  /** L'Enquêteur clôt l'interrogatoire (avant le chrono) : place aux paris. */
  z.object({ type: z.literal('close') }),
  /** Chaque suspect parie en secret : l'Enquêteur va-t-il trouver le Coupable ? */
  z.object({ type: z.literal('bet'), found: z.boolean() }),
  /** L'Enquêteur accuse un suspect (après les paris). */
  z.object({ type: z.literal('accuse'), target: playerRef }),
  /** Un suspect indique les mots qu'il a vraiment placés (après révélation). */
  z.object({ type: z.literal('declare'), placed: z.array(wordInput).max(WORDS_PER_SUSPECT) }),
  /** Chaque joueur signale les mots déclarés qu'il n'a PAS entendus. */
  z.object({
    type: z.literal('verify'),
    doubts: z.array(z.object({ target: playerRef, word: wordInput })).max(32),
  }),
  /** L'Enquêteur passe à la manche suivante. */
  z.object({ type: z.literal('next') }),
]);
export type InterrogationMove = z.infer<typeof interrogationMoveSchema>;

/**
 * Comparaison tolérante : casse, accents, tirets, espaces et pluriel simple.
 * « Arc en ciel », « arcs-en-ciel » et « arc-en-ciel » désignent le même mot.
 */
export function normalizeWord(word: string): string {
  const base = word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => (part.length > 3 ? part.replace(/[sx]$/, '') : part))
    .join(' ');
  return base;
}

export interface Grill {
  target: PlayerId;
  word: string;
  hit: boolean;
}

export interface RoundScore {
  playerId: PlayerId;
  points: number;
  reasons: string[];
}

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface InterrogationState {
  players: PlayerInfo[];
  config: InterrogationConfig;
  totalRounds: number;
  round: number;
  /** Ordre de passage de l'Enquêteur. */
  order: PlayerId[];
  inspector: PlayerId;
  caseIndex: number;
  usedCases: number[];
  usedWords: string[];
  culprit: PlayerId;
  words: Record<PlayerId, string[]>;
  burned: Record<PlayerId, string[]>;
  grills: Grill[];
  endsAt: number | null;
  accused: PlayerId | null;
  /** Paris des suspects : true = « il va trouver ». */
  bets: Record<PlayerId, boolean>;
  declared: Record<PlayerId, string[]>;
  /** Signalements « pas entendu » de chaque votant. */
  doubts: Record<PlayerId, { target: PlayerId; word: string }[]>;
  verified: PlayerId[];
  /** Mots refusés par la majorité de la table. */
  rejected: Record<PlayerId, string[]>;
  acked: PlayerId[];
  phase: Phase;
  scores: Record<PlayerId, number>;
  lastRound: RoundScore[] | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface InterrogationPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  score: number;
  acked: boolean;
  declared: boolean;
  verified: boolean;
  /** Pendant les paris : a déjà parié (sans dire quoi). */
  betDone: boolean;
  /** L'Enquêteur est public ; Coupable/Innocent seulement pour soi, ou après révélation. */
  role: Role | null;
}

export interface RevealedWord {
  word: string;
  burned: boolean;
  /** null tant que le suspect n'a pas déclaré. */
  placed: boolean | null;
  /** Après vérification : nombre de joueurs qui ne l'ont pas entendu, et verdict. */
  doubts: number | null;
  rejected: boolean | null;
}

export interface InterrogationView {
  phase: Phase;
  round: number;
  totalRounds: number;
  inspector: PlayerId;
  case: { title: string; text: string };
  endsAt: number | null;
  minutes: number;
  grillsLeft: number;
  grills: Grill[];
  players: InterrogationPlayerView[];
  me: {
    id: PlayerId;
    role: Role;
    words: { word: string; burned: boolean }[];
    myBet: boolean | null;
  } | null;
  /** Paris de chacun, révélés après l'accusation. */
  bets: Record<PlayerId, boolean> | null;
  accused: PlayerId | null;
  /** Révélé à partir de la phase « review ». */
  culprit: PlayerId | null;
  reveal: Record<PlayerId, RevealedWord[]> | null;
  lastRound: RoundScore[] | null;
  log: string[];
}

export const ROLE_LABEL: Record<Role, string> = {
  inspector: 'Enquêteur',
  culprit: 'Coupable',
  innocent: 'Innocent',
};

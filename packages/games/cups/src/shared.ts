import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export type Face = 1 | 2 | 3 | 4 | 5 | 6;
export const FACES: Face[] = [1, 2, 3, 4, 5, 6];
export type Phase = 'bid' | 'reveal' | 'over';

/** Durée d'affichage des dés révélés quand c'est un bot qui relance. */
export const REVEAL_MS = 7000;

export interface Bid {
  by: PlayerId;
  quantity: number;
  face: Face;
}

export const cupsConfigSchema = z.object({
  dice: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  /** Annonce « Pile ! » : parier que l'enchère est exacte. */
  exact: z.boolean(),
  /** Manche sèche quand un joueur tombe à son dernier dé. */
  dry: z.boolean(),
});
export type CupsConfig = z.infer<typeof cupsConfigSchema>;

const faceSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);

export const cupsMoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bid'), quantity: z.number().int().min(1).max(200), face: faceSchema }),
  /** « Menteur ! » : l'enchère précédente est fausse. */
  z.object({ type: z.literal('liar') }),
  /** « Pile ! » : l'enchère précédente est exactement juste. */
  z.object({ type: z.literal('exact') }),
  /** Lancer la manche suivante après la révélation. */
  z.object({ type: z.literal('next') }),
]);
export type CupsMove = z.infer<typeof cupsMoveSchema>;

export interface Reveal {
  /** Tous les dés de la manche qui vient de se terminer. */
  dice: Record<PlayerId, Face[]>;
  bid: Bid;
  call: 'liar' | 'exact';
  caller: PlayerId;
  /** Nombre réel de dés correspondant à l'enchère (As compris s'ils sont jokers). */
  count: number;
  dry: boolean;
  loser: PlayerId | null;
  gainer: PlayerId | null;
}

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface CupsState {
  players: PlayerInfo[];
  config: CupsConfig;
  dice: Record<PlayerId, Face[]>;
  counts: Record<PlayerId, number>;
  round: number;
  phase: Phase;
  active: PlayerId;
  /** Celui qui ouvre la manche (en cours, ou suivante pendant la révélation). */
  starter: PlayerId;
  bid: Bid | null;
  history: Bid[];
  /** Manche sèche en cours / prévue pour la manche suivante. */
  dry: boolean;
  nextDry: boolean;
  /** Joueurs ayant déjà déclenché leur manche sèche. */
  dryUsed: PlayerId[];
  reveal: Reveal | null;
  revealUntil: number | null;
  /** Ordre d'élimination. */
  out: PlayerId[];
  /** Pour les records : « Pile ! » réussis et plus grand nombre de dés tenus. */
  stats: Record<PlayerId, { exact: number; maxDice: number }>;
  winner: PlayerId | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface CupsPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  dice: number;
  out: boolean;
  dryUsed: boolean;
}

export interface CupsView {
  phase: Phase;
  config: CupsConfig;
  round: number;
  players: CupsPlayerView[];
  active: PlayerId;
  starter: PlayerId;
  totalDice: number;
  bid: Bid | null;
  history: Bid[];
  dry: boolean;
  reveal: Reveal | null;
  revealUntil: number | null;
  me: { id: PlayerId; dice: Face[] } | null;
  winner: PlayerId | null;
  log: string[];
}

// ───────── Règles des enchères (partagées par le moteur, les bots et le plateau) ─────────

/** Les As sont jokers, sauf en manche sèche et quand on parie sur les As eux-mêmes. */
export const wild = (face: Face, dry: boolean) => face !== 1 && !dry;

/** Combien de dés correspondent à une valeur. */
export function countFace(dice: Face[], face: Face, dry: boolean): number {
  return dice.filter((d) => d === face || (d === 1 && wild(face, dry))).length;
}

/**
 * Quantité minimale pour annoncer `face` après `prev`, ou null si c'est interdit.
 * - Sans enchère : n'importe quelle valeur sauf les As (sauf en manche sèche).
 * - Manche sèche : la valeur ne change plus, on monte la quantité.
 * - Vers les As : la moitié (arrondie au-dessus) suffit ; depuis les As : le double plus un.
 */
export function minQuantity(prev: Bid | null, face: Face, dry: boolean): number | null {
  if (!prev) return face === 1 && !dry ? null : 1;
  if (dry) return face === prev.face ? prev.quantity + 1 : null;
  if (face === 1) return prev.face === 1 ? prev.quantity + 1 : Math.ceil(prev.quantity / 2);
  if (prev.face === 1) return prev.quantity * 2 + 1;
  return face > prev.face ? prev.quantity : prev.quantity + 1;
}

export function isLegalBid(prev: Bid | null, quantity: number, face: Face, dry: boolean, total: number): boolean {
  const min = minQuantity(prev, face, dry);
  return min !== null && quantity >= min && quantity <= total;
}

export const FACE_NAME: Record<Face, string> = { 1: 'As', 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six' };

/** « 4 × Cinq », « 1 × As ». */
export const bidText = (b: { quantity: number; face: Face }) => `${b.quantity} × ${FACE_NAME[b.face]}`;

/** Règles du jeu, affichées avant la partie et dans le grimoire du plateau. */
export const CUPS_RULES: string[] = [
  'Chacun cache ses dés sous son gobelet et les secoue : tu ne vois que les tiens. Les As (les 1) sont jokers : ils comptent pour n’importe quelle valeur.',
  'À tour de rôle, on enchérit sur TOUS les dés de la table : « 4 × Cinq » veut dire « il y a au moins quatre Cinq (As compris) sous l’ensemble des gobelets ». Chaque enchère doit monter : plus de dés, ou autant de dés d’une valeur plus forte.',
  'Parier sur les As : la moitié de la quantité suffit (arrondie au-dessus). Revenir des As vers une autre valeur : il faut le double plus un. On ne peut pas ouvrir une manche sur les As.',
  'Au lieu de monter, tu peux crier « Menteur ! » : on soulève les gobelets. S’il y a au moins la quantité annoncée, tu perds un dé ; sinon, c’est l’enchérisseur qui en perd un.',
  'Variante « Pile ! » : tu paries que l’enchère est exactement juste. Si c’est le cas, tu gagnes un dé, même au-delà de ton nombre de départ ; sinon, tu en perds un.',
  'Celui qui vient de perdre un dé ouvre la manche suivante, et tout le monde relance ses dés. Sans dé, on est éliminé ; le dernier à garder des dés gagne.',
  'Variante « Manche sèche » : quand un joueur tombe à son dernier dé (une fois par joueur, à trois joueurs ou plus), la manche suivante se joue sans jokers et la valeur annoncée à l’ouverture ne change plus.',
];

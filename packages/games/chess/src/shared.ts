import { z } from 'zod';
import type { PlayerId } from '@arcade/game-sdk';

export type Color = 'w' | 'b';
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Sq = [number, number];

export interface Piece {
  id: number;
  type: PieceType;
  color: Color;
  moved: boolean;
}

/** Ligne 0 = rangée 8 (en haut côté Blancs), colonne 0 = colonne a. */
export type BoardGrid = (Piece | null)[][];

export const MODES = ['missions', 'vanish', 'imposter', 'swap', 'blind'] as const;
export type Mode = (typeof MODES)[number];

export const configSchema = z.object({
  modes: z.array(z.enum(MODES)).max(MODES.length),
  constraints: z.number().int().min(0).max(5),
  reward: z.enum(['win', 'queen']),
  walled: z.boolean(),
});
export type ChessConfig = z.infer<typeof configSchema>;

const n8 = z.number().int().min(0).max(7);
export const moveSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('move'), fr: n8, fc: n8, tr: n8, tc: n8, promo: z.enum(['q', 'r', 'b', 'n']).optional() }),
  z.object({ t: z.literal('flip'), id: z.number().int() }),
  z.object({ t: z.literal('swap'), fr: n8, fc: n8, tr: n8, tc: n8 }),
  z.object({ t: z.literal('place'), r: n8, c: n8 }),
  z.object({ t: z.literal('pick'), pawn: z.number().int(), piece: z.number().int() }),
  z.object({ t: z.literal('resign') }),
  z.object({ t: z.literal('draw-offer') }),
  z.object({ t: z.literal('draw-accept') }),
  z.object({ t: z.literal('draw-decline') }),
  z.object({ t: z.literal('undo-request') }),
  z.object({ t: z.literal('undo-accept') }),
  z.object({ t: z.literal('undo-decline') }),
]);
export type ChessMove = z.infer<typeof moveSchema>;

/** Un coup légal tel que le moteur le décrit. */
export interface LegalMove {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  type: PieceType;
  capture: boolean;
  needPromo?: boolean;
  castle?: 'K' | 'Q';
}
export interface FlipAction {
  id: number;
  r: number;
  c: number;
  type: PieceType;
}
export interface SwapAction {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  type: PieceType;
}

export interface Legal {
  moves: LegalMove[];
  flips: FlipAction[];
  swaps: SwapAction[];
  /** Aucun coup ne respectait les contraintes : elles sont levées pour ce coup. */
  lifted: boolean;
  /** Cases où poser la dame gagnée (mission réussie). */
  place: Sq[];
}

export interface SecretView {
  constraints: string[];
  mission: string | null;
  progress: string;
  done: boolean;
  traitors: { id: number; label: string; used: boolean; alive: boolean }[];
}

export interface HistoryEntry {
  c: Color;
  t: string;
  cls: '' | 'flip' | 'swap' | 'queen';
}

export interface Frame {
  board: BoardGrid;
  holes: boolean[][];
  visits: number[][];
  lastMove: { from?: Sq; to?: Sq } | null;
}

export interface ChessView {
  phase: 'pick' | 'play' | 'place' | 'over';
  players: Record<Color, { id: PlayerId; name: string }>;
  /** Ma couleur (null = spectateur ou écran partagé). */
  me: Color | null;
  config: ChessConfig;
  board: BoardGrid;
  turn: Color;
  holes: boolean[][];
  visits: number[][];
  lastMove: { from?: Sq; to?: Sq } | null;
  history: HistoryEntry[];
  taken: { w: { t: PieceType; c: Color }[]; b: { t: PieceType; c: Color }[]; void: { t: PieceType; c: Color }[] };
  swapsLeft: Record<Color, number>;
  check: boolean;
  drawOffer: Color | null;
  /** Demande de retour au coup précédent, en attente de l'adversaire. */
  undoRequest: Color | null;
  /** Le demandeur peut-il revenir en arrière maintenant ? */
  canUndo: Record<Color, boolean>;
  /** Fin de partie : toutes les positions, pour revoir la partie. */
  frames: Frame[] | null;
  picked: Record<Color, boolean>;
  over: { winner: Color | null; reason: string } | null;
  /** Mes secrets (contraintes, mission, traîtres). */
  mine: SecretView | null;
  /** Mes actions possibles quand c'est à moi de jouer. */
  legal: Legal | null;
  /** Fin de partie : les secrets des deux camps. */
  reveal: Record<Color, SecretView> | null;
  /** Mission réussie, dame à poser : texte de la mission (public). */
  placing: string | null;
}

export const NAMES: Record<Color, string> = { w: 'Blancs', b: 'Noirs' };
export const PNAME: Record<PieceType, string> = { k: 'roi', q: 'dame', r: 'tour', b: 'fou', n: 'cavalier', p: 'pion' };
export const FR: Record<PieceType, string> = { k: 'R', q: 'D', r: 'T', b: 'F', n: 'C', p: '' };
export const GLYPH: Record<PieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const FILES = 'abcdefgh';
export const SWAPS = 3;
export const VANISH_AT = 3;
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const sq = (r: number, c: number) => FILES[c]! + (8 - r);
export const has = (cfg: ChessConfig, m: Mode) => cfg.modes.includes(m);

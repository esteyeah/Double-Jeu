import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

/** `dry` : pistolet chargé (balle réelle) ; `wet` : balle à blanc. */
export type Charge = 'dry' | 'wet';
export type LootKind = 'coin' | 'pearl' | 'map' | 'rum' | 'powder' | 'bicorne';
export type Phase = 'prepare' | 'order' | 'courage' | 'loot' | 'over';

export interface LootItem {
  kind: LootKind;
  /** Valeur en doublons (pièces uniquement). */
  value?: number;
}

export const ROUNDS = 8;
export const LOOT_PER_ROUND = 8;
export const MAX_WOUNDS = 3;
export const START_DRY = 3;
export const START_WET = 5;
export const PEARL_VALUE = 5;
export const PEARL_BONUS = 30;
export const RUM_VALUE = 5;

/** Valeur d'une série de fragments de carte : 1 → 5, 2 → 15, 3 → 30, 4 → 50, puis +25 par fragment. */
export function mapValue(count: number): number {
  const table = [0, 5, 15, 30, 50];
  return count < table.length ? (table[count] as number) : 50 + (count - 4) * 25;
}

export const plunderConfigSchema = z.object({
  /** Plongeon décidé chacun sur son écran, ou annoncé à voix haute et reporté par le Capitaine. */
  courage: z.enum(['secret', 'table']),
});
export type PlunderConfig = z.infer<typeof plunderConfigSchema>;

const playerRef = z.string().min(1).max(64);

export const plunderMoveSchema = z.discriminatedUnion('type', [
  /** Charger (en secret) et viser. */
  z.object({ type: z.literal('prepare'), charge: z.enum(['dry', 'wet']), target: playerRef }),
  /** Le Capitaine force un pirate qui le vise à viser ailleurs (ou laisse faire : pirate absent). */
  z.object({ type: z.literal('order'), pirate: playerRef.optional(), target: playerRef.optional() }),
  /** Tenir bon (false) ou plonger dans la cale (true). */
  z.object({ type: z.literal('courage'), flee: z.boolean() }),
  /** Mode « table » : le Capitaine reporte qui a plongé parmi les humains. */
  z.object({ type: z.literal('cowards'), fled: z.array(playerRef).max(8) }),
  /** Se servir un objet sur le pont. */
  z.object({ type: z.literal('take'), index: z.number().int().min(0).max(63) }),
]);
export type PlunderMove = z.infer<typeof plunderMoveSchema>;

export interface Shot {
  shooter: PlayerId;
  target: PlayerId;
  charge: Charge;
  hit: boolean;
}

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface PirateState {
  dry: number;
  wet: number;
  wounds: number;
  sunk: boolean;
  loot: LootItem[];
}

export interface PlunderState {
  players: PlayerInfo[];
  config: PlunderConfig;
  pirates: Record<PlayerId, PirateState>;
  round: number;
  captain: PlayerId;
  /** Celui qui a pris le bicorne devient Capitaine à la manche suivante. */
  nextCaptain: PlayerId | null;
  phase: Phase;
  prepared: Record<PlayerId, { charge: Charge; target: PlayerId }>;
  /** Visées révélées (et éventuellement modifiées par le Capitaine). */
  aims: Record<PlayerId, PlayerId>;
  order: { pirate: PlayerId; from: PlayerId; to: PlayerId } | null;
  fled: Record<PlayerId, boolean>;
  shots: Shot[];
  hit: PlayerId[];
  /** Ordre de service pour le partage de cette manche. */
  pickers: PlayerId[];
  turn: number;
  deck: LootItem[];
  deckOnBoard: LootItem[];
  /** Objets consommés (rhum bu, munitions ajoutées, bicorne porté). */
  used: LootItem[];
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface PirateView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  wounds: number;
  sunk: boolean;
  /** Balles restantes (le nombre est public, pas leur nature). */
  charges: number;
  loot: LootItem[];
  score: number;
  /** Pendant la préparation : a déjà chargé et visé. */
  prepared: boolean;
  /** Visée révélée (après la préparation de tous). */
  aim: PlayerId | null;
  /** Pendant le courage : a déjà décidé ; ensuite : a plongé. */
  decided: boolean;
  fled: boolean | null;
  hit: boolean;
}

export interface PlunderView {
  phase: Phase;
  config: PlunderConfig;
  round: number;
  rounds: number;
  captain: PlayerId;
  nextCaptain: PlayerId | null;
  pirates: PirateView[];
  board: LootItem[];
  deckLeft: number;
  order: PlunderState['order'];
  /** Tirs de la manche, révélés après le courage (les plongeurs gardent leur charge secrète). */
  shots: Shot[];
  picker: PlayerId | null;
  pickers: PlayerId[];
  /** Humains dont le Capitaine doit reporter le plongeon (mode « table »). */
  toReport: PlayerId[];
  /** Qui reporte : le Capitaine s'il est humain, sinon le premier humain après lui. */
  reporter: PlayerId | null;
  me: {
    id: PlayerId;
    dry: number;
    wet: number;
    prepared: { charge: Charge; target: PlayerId } | null;
    courage: boolean | null;
  } | null;
  pearlLeaders: PlayerId[];
  log: string[];
}

export const LOOT_LABEL: Record<LootKind, string> = {
  coin: 'Doublons',
  pearl: 'Perle',
  map: 'Fragment de carte',
  rum: 'Rhum',
  powder: 'Munitions',
  bicorne: 'Bicorne',
};

export const LOOT_ICON: Record<LootKind, string> = {
  coin: '🪙',
  pearl: '⚪',
  map: '🗺️',
  rum: '🍾',
  powder: '🧨',
  bicorne: '🎩',
};

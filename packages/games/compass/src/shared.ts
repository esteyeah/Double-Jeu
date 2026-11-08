import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

/** Côtés d'une carte, dans le sens des aiguilles d'une montre. */
export type Side = 0 | 1 | 2 | 3; // haut, droite, bas, gauche
/** Quarts de tour dans le sens des aiguilles d'une montre. */
export type Rot = 0 | 1 | 2 | 3;
/** Emplacements de la boussole : 0 = Nord-Ouest, 1 = Nord-Est, 2 = Sud-Est, 3 = Sud-Ouest. */
export type Slot = 0 | 1 | 2 | 3;
/** Indices : 0 = Nord, 1 = Est, 2 = Sud, 3 = Ouest. */
export type Wind = 0 | 1 | 2 | 3;
export type Phase = 'write' | 'guess' | 'reveal' | 'over';

export const SLOTS: Slot[] = [0, 1, 2, 3];
export const WINDS: Wind[] = [0, 1, 2, 3];
export const WIND_LABEL: Record<Wind, string> = { 0: 'Nord', 1: 'Est', 2: 'Sud', 3: 'Ouest' };
export const SLOT_LABEL: Record<Slot, string> = { 0: 'Nord-Ouest', 1: 'Nord-Est', 2: 'Sud-Est', 3: 'Sud-Ouest' };

export const CLUE_MAX = 24;
/** Points d'une boussole reconstituée du premier coup. */
export const PERFECT = 6;

export interface Card {
  id: number;
  /** Mots dans l'ordre haut, droite, bas, gauche (carte non tournée). */
  words: [string, string, string, string];
}

export interface Placement {
  card: number;
  rot: Rot;
}

/** Mot affiché sur le côté `side` d'une carte tournée de `rot` quarts de tour. */
export const wordAt = (card: Card, rot: Rot, side: Side): string => card.words[(side - rot + 4) % 4]!;

/**
 * Chaque indice relie deux cartes voisines, par leurs côtés extérieurs :
 * Nord = haut des cartes NO et NE, Est = droite de NE et SE, Sud = bas de SE et SO, Ouest = gauche de SO et NO.
 */
export const WIND_EDGES: Record<Wind, [[Slot, Side], [Slot, Side]]> = {
  0: [
    [0, 0],
    [1, 0],
  ],
  1: [
    [1, 1],
    [2, 1],
  ],
  2: [
    [2, 2],
    [3, 2],
  ],
  3: [
    [3, 3],
    [0, 3],
  ],
};

/** Les deux mots qu'un indice doit relier, pour une disposition donnée. */
export function pairFor(cards: Card[], layout: Placement[], wind: Wind): [string, string] {
  const [[s1, side1], [s2, side2]] = WIND_EDGES[wind];
  const at = (slot: Slot, side: Side) => {
    const p = layout[slot]!;
    return wordAt(cards.find((c) => c.id === p.card)!, p.rot, side);
  };
  return [at(s1, side1), at(s2, side2)];
}

export const compassConfigSchema = z.object({
  /** Cartes leurres ajoutées pour la reconstitution. */
  decoys: z.union([z.literal(1), z.literal(2)]),
});
export type CompassConfig = z.infer<typeof compassConfigSchema>;

const clueSchema = z.string().trim().min(1).max(CLUE_MAX);
const slotSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const compassMoveSchema = z.discriminatedUnion('type', [
  /** Les quatre indices de sa propre boussole (Nord, Est, Sud, Ouest). */
  z.object({ type: z.literal('clues'), clues: z.tuple([clueSchema, clueSchema, clueSchema, clueSchema]) }),
  /** Poser une carte sur un emplacement (elle quitte son ancienne place ; la carte déjà là retourne au paquet). */
  z.object({ type: z.literal('place'), card: z.number().int().min(0).max(9), slot: slotSchema }),
  /** Retirer la carte d'un emplacement. */
  z.object({ type: z.literal('clear'), slot: slotSchema }),
  /** Tourner une carte d'un quart de tour (sens des aiguilles d'une montre). */
  z.object({ type: z.literal('rotate'), card: z.number().int().min(0).max(9) }),
  /** Valider la disposition. */
  z.object({ type: z.literal('submit') }),
  /** Passer à la boussole suivante après la révélation. */
  z.object({ type: z.literal('next') }),
]);
export type CompassMove = z.infer<typeof compassMoveSchema>;

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface CompassBoard {
  owner: PlayerId;
  /** Cartes de la reconstitution (les 4 de la boussole + les leurres), dans un ordre mélangé. */
  cards: Card[];
  /** Disposition d'origine, par emplacement. */
  solution: Placement[];
  clues: [string, string, string, string] | null;
  score: number | null;
}

export interface Guess {
  /** Carte posée sur chaque emplacement. */
  board: (number | null)[];
  /** Orientation courante de chaque carte. */
  rotations: Record<number, Rot>;
  /** Emplacements validés au premier essai (bien placés). */
  locked: boolean[];
  attempt: 1 | 2;
  /** Emplacements faux retirés après le premier essai. */
  missed: Slot[];
}

export interface CompassState {
  players: PlayerInfo[];
  config: CompassConfig;
  phase: Phase;
  boards: Record<PlayerId, CompassBoard>;
  /** Ordre de résolution des boussoles. */
  order: PlayerId[];
  index: number;
  guess: Guess | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface CompassPlayerView {
  id: PlayerId;
  name: string;
  wrote: boolean;
  score: number | null;
}

export interface CompassView {
  phase: Phase;
  config: CompassConfig;
  players: CompassPlayerView[];
  order: PlayerId[];
  index: number;
  /** Ma boussole pendant l'écriture des indices : cartes et disposition. */
  mine: { cards: Card[]; layout: Placement[]; clues: CompassBoard['clues'] } | null;
  /** Boussole en cours de reconstitution. */
  current: {
    owner: PlayerId;
    clues: [string, string, string, string];
    cards: Card[];
    board: (number | null)[];
    rotations: Record<number, Rot>;
    locked: boolean[];
    attempt: 1 | 2;
    missed: Slot[];
    /** Révélée à la fin (et toujours visible pour l'auteur). */
    solution: Placement[] | null;
    score: number | null;
  } | null;
  total: number;
  max: number;
  log: string[];
}

export function rating(total: number, max: number): string {
  const r = max ? total / max : 0;
  if (r >= 0.9) return 'Boussole d’or : des esprits parfaitement accordés !';
  if (r >= 0.7) return 'Très beau cap, l’équipe se comprend à demi-mot.';
  if (r >= 0.5) return 'Bon cap, malgré quelques détours.';
  if (r >= 0.3) return 'L’aiguille a un peu tourné en rond…';
  return 'Perdus en mer ! On remet ça ?';
}

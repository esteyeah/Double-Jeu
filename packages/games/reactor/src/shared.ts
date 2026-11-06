import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

/** Barre de contrôle (à trouver), Surcharge (fin immédiate), Conduit vide. */
export type CardKind = 'rod' | 'overload' | 'empty';
export type Role = 'tech' | 'saboteur';
export type Phase = 'reveal' | 'cut' | 'over';

export const ROUNDS = 4;
export const FIRST_ROUND_CARDS = 5;

/** Rôles mis en jeu selon le nombre de joueurs : [techniciens, saboteurs]. Un de trop = un rôle écarté face cachée. */
export const ROLE_POOL: Record<number, [number, number]> = {
  4: [3, 2],
  5: [3, 2],
  6: [4, 2],
  7: [5, 3],
  8: [5, 3],
};

export const reactorConfigSchema = z.object({});
export type ReactorConfig = z.infer<typeof reactorConfigSchema>;

export const reactorMoveSchema = z.discriminatedUnion('type', [
  /** « J'ai mémorisé mes cartes » (phase de découverte). */
  z.object({ type: z.literal('ack') }),
  /** Le porteur de la clé ouvre une trappe chez un autre joueur. */
  z.object({
    type: z.literal('cut'),
    target: z.string().min(1).max(64),
    slot: z.number().int().min(0).max(FIRST_ROUND_CARDS - 1),
  }),
  /** Annonce publique (peut être un mensonge). */
  z.object({
    type: z.literal('claim'),
    rods: z.number().int().min(0).max(FIRST_ROUND_CARDS),
    overload: z.boolean(),
  }),
]);
export type ReactorMove = z.infer<typeof reactorMoveSchema>;

export interface Claim {
  rods: number;
  overload: boolean;
}

export interface HandCounts {
  rod: number;
  overload: number;
  empty: number;
}

export interface Reveal {
  round: number;
  by: PlayerId;
  target: PlayerId;
  slot: number;
  kind: CardKind;
}

export interface ReactorOutcome {
  winner: Role;
  reason: 'rods' | 'overload' | 'timeout';
}

// ───────── État complet : ne quitte JAMAIS le serveur (ou la mémoire du téléphone en local). ─────────

export interface Slot {
  kind: CardKind;
  revealed: boolean;
}

export interface ReactorState {
  players: PlayerInfo[];
  roles: Record<PlayerId, Role>;
  saboteursPossible: number[];
  hands: Record<PlayerId, Slot[]>;
  phase: Phase;
  round: number;
  cutsThisRound: number;
  rodsFound: number;
  rodsTotal: number;
  holder: PlayerId;
  acked: PlayerId[];
  claims: Record<PlayerId, Claim>;
  reveals: Reveal[];
  log: LogEntry[];
  outcome: ReactorOutcome | null;
}

// ───────── Vue filtrée : ce qu'un joueur donné a le droit de voir. ─────────

export interface ReactorPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  /** `null` = carte face cachée. */
  slots: (CardKind | null)[];
  claim: Claim | null;
  acked: boolean;
  /** Connu uniquement pour soi-même, ou pour tous en fin de partie. */
  role: Role | null;
}

export interface ReactorView {
  phase: Phase;
  round: number;
  rounds: number;
  cutsThisRound: number;
  cutsPerRound: number;
  rodsFound: number;
  rodsTotal: number;
  saboteursPossible: number[];
  holder: PlayerId;
  players: ReactorPlayerView[];
  me: { id: PlayerId; role: Role; hand: HandCounts } | null;
  reveals: Reveal[];
  log: string[];
  outcome: ReactorOutcome | null;
}

export const CARD_LABEL: Record<CardKind, string> = {
  rod: 'Barre de contrôle',
  overload: 'Surcharge',
  empty: 'Conduit vide',
};

export const ROLE_LABEL: Record<Role, string> = {
  tech: 'Technicien',
  saboteur: 'Saboteur',
};

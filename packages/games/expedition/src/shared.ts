import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export type Role = 'explorer' | 'mutineer' | 'cartographer' | 'spy';
export type Side = 'expedition' | 'mutiny';
export type Card = 'success' | 'sabotage';
export type Phase = 'reveal' | 'team' | 'vote' | 'mission' | 'spy' | 'over';

export const MISSIONS = 5;
export const TO_WIN = 3;
export const MAX_REJECTIONS = 5;

export const STAGE_NAMES = ['Le camp de base', 'La crevasse', 'Le glacier', 'La tempête', 'Le Pôle'];

/** Nombre de Mutins selon la table. */
export const MUTINEERS: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };

/** Taille de la cordée pour chaque étape, selon la table. */
export const TEAM_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

/** À partir de 7 joueurs, la 4e étape n'échoue qu'avec deux sabotages. */
export const sabotagesNeeded = (players: number, mission: number) => (mission === 3 && players >= 7 ? 2 : 1);

export const sideOf = (role: Role): Side => (role === 'explorer' || role === 'cartographer' ? 'expedition' : 'mutiny');

export const expeditionConfigSchema = z.object({
  votes: z.enum(['secret', 'hands']),
  /** Variante : Cartographe (connaît les Mutins) et Espion (peut la démasquer à la fin). */
  roles: z.enum(['basic', 'special']),
});
export type ExpeditionConfig = z.infer<typeof expeditionConfigSchema>;

const playerRef = z.string().min(1).max(64);

export const expeditionMoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ack') }),
  z.object({ type: z.literal('propose'), team: z.array(playerRef).min(1).max(5) }),
  z.object({ type: z.literal('vote'), yes: z.boolean() }),
  /** Vote à main levée : le Chef reporte qui a voté oui. */
  z.object({ type: z.literal('tally'), yes: z.array(playerRef).max(10) }),
  z.object({ type: z.literal('play'), card: z.enum(['success', 'sabotage']) }),
  /** L'Espion désigne celle qu'il croit être la Cartographe. */
  z.object({ type: z.literal('unmask'), target: playerRef }),
]);
export type ExpeditionMove = z.infer<typeof expeditionMoveSchema>;

export interface MissionResult {
  leader: PlayerId;
  team: PlayerId[];
  sabotages: number;
  success: boolean;
}

export interface VoteRecord {
  leader: PlayerId;
  team: PlayerId[];
  votes: Record<PlayerId, boolean>;
  approved: boolean;
}

export type ExpeditionOutcome =
  | { winner: 'expedition'; reason: 'missions' | 'spyMissed' }
  | { winner: 'mutiny'; reason: 'missions' | 'deadlock' | 'cartographer' };

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface ExpeditionState {
  players: PlayerInfo[];
  config: ExpeditionConfig;
  roles: Record<PlayerId, Role>;
  phase: Phase;
  leaderIndex: number;
  mission: number;
  rejections: number;
  team: PlayerId[];
  votes: Record<PlayerId, boolean>;
  lastVote: VoteRecord | null;
  votesHistory: VoteRecord[];
  cards: Record<PlayerId, Card>;
  results: MissionResult[];
  acked: PlayerId[];
  unmasked: PlayerId | null;
  outcome: ExpeditionOutcome | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface ExpeditionPlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  acked: boolean;
  voted: boolean;
  played: boolean;
  onTeam: boolean;
  /** Ce que le spectateur sait de ce joueur (soi, Mutins connus, ou tout en fin de partie). */
  role: Role | null;
}

export interface ExpeditionView {
  phase: Phase;
  config: ExpeditionConfig;
  players: ExpeditionPlayerView[];
  leader: PlayerId;
  mission: number;
  missions: { name: string; size: number; needed: number; result: MissionResult | null }[];
  rejections: number;
  team: PlayerId[];
  lastVote: VoteRecord | null;
  votesHistory: VoteRecord[];
  me: {
    id: PlayerId;
    role: Role;
    side: Side;
    allies: { id: PlayerId; role: Role }[];
    myVote: boolean | null;
    myCard: Card | null;
  } | null;
  spy: PlayerId | null;
  unmasked: PlayerId | null;
  outcome: ExpeditionOutcome | null;
  log: string[];
}

export const ROLE_LABEL: Record<Role, string> = {
  explorer: 'Explorateur',
  mutineer: 'Mutin',
  cartographer: 'Cartographe',
  spy: 'Espion',
};

export const SIDE_LABEL: Record<Side, string> = {
  expedition: 'l’Expédition',
  mutiny: 'les Mutins',
};

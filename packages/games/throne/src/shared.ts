import { z } from 'zod';
import type { LogEntry, PlayerId, PlayerInfo } from '@arcade/game-sdk';

export type Role = 'loyal' | 'conspirator' | 'usurper';
/** La Couronne (loyalistes) contre l'Ombre (conjurés + usurpateur). */
export type Team = 'crown' | 'shadow';
export type Edict = Team;
export type Power = 'investigate' | 'peek' | 'special' | 'execute';
export type Phase =
  | 'reveal'
  | 'nomination'
  | 'vote'
  | 'regent'
  | 'seneschal'
  | 'veto'
  | 'power'
  | 'powerResult'
  | 'over';

export const CROWN_TO_WIN = 5;
export const SHADOW_TO_WIN = 6;
export const USURPER_DANGER = 3;
export const VETO_AT = 5;
export const MAX_AGITATION = 3;

/** [loyalistes, conjurés] ; l'Usurpateur s'ajoute toujours. */
export const ROLE_TABLE: Record<number, [number, number]> = {
  5: [3, 1],
  6: [4, 1],
  7: [4, 2],
  8: [5, 2],
  9: [5, 3],
  10: [6, 3],
};

/** Pouvoir déclenché par le N-ième édit de l'Ombre (index N-1), selon la taille de la table. */
export function powerTrack(players: number): (Power | null)[] {
  if (players <= 6) return [null, null, 'peek', 'execute', 'execute', null];
  if (players <= 8) return [null, 'investigate', 'special', 'execute', 'execute', null];
  return ['investigate', 'investigate', 'special', 'execute', 'execute', null];
}

export const teamOf = (role: Role): Team => (role === 'loyal' ? 'crown' : 'shadow');

export const throneConfigSchema = z.object({
  /** Vote secret (chacun sur son écran) ou à main levée (le Régent reporte le résultat). */
  votes: z.enum(['secret', 'hands']),
});
export type ThroneConfig = z.infer<typeof throneConfigSchema>;

const playerRef = z.string().min(1).max(64);

export const throneMoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ack') }),
  z.object({ type: z.literal('nominate'), target: playerRef }),
  z.object({ type: z.literal('vote'), yes: z.boolean() }),
  /** Vote à main levée : le Régent reporte qui a voté oui. */
  z.object({ type: z.literal('tally'), yes: z.array(playerRef).max(10) }),
  z.object({ type: z.literal('discard'), index: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal('enact'), index: z.number().int().min(0).max(1) }),
  z.object({ type: z.literal('veto') }),
  z.object({ type: z.literal('vetoAnswer'), accept: z.boolean() }),
  z.object({ type: z.literal('power'), target: playerRef.optional() }),
]);
export type ThroneMove = z.infer<typeof throneMoveSchema>;

export interface EnactedEdict {
  edict: Edict;
  /** null quand l'édit vient d'une émeute. */
  regent: PlayerId | null;
  seneschal: PlayerId | null;
}

export interface VoteRecord {
  regent: PlayerId;
  nominee: PlayerId;
  votes: Record<PlayerId, boolean>;
  passed: boolean;
}

export interface Investigation {
  target: PlayerId;
  team: Team;
}

export type ThroneOutcome =
  | { winner: 'crown'; reason: 'edicts' | 'usurperExecuted' }
  | { winner: 'shadow'; reason: 'edicts' | 'usurperCrowned' };

// ───────── État complet (jamais envoyé tel quel) ─────────

export interface ThroneState {
  players: PlayerInfo[];
  config: ThroneConfig;
  roles: Record<PlayerId, Role>;
  dead: PlayerId[];
  phase: Phase;
  /** Pointeur de rotation : index (dans `players`) du dernier Régent « normal ». */
  rotation: number;
  regent: PlayerId;
  nominee: PlayerId | null;
  /** Dernier gouvernement élu : ils ne peuvent pas devenir Sénéchal au tour suivant. */
  lastRegent: PlayerId | null;
  lastSeneschal: PlayerId | null;
  votes: Record<PlayerId, boolean>;
  lastVote: VoteRecord | null;
  agitation: number;
  deck: Edict[];
  discard: Edict[];
  hand: Edict[];
  /** Ce que le Régent a transmis au Sénéchal (il s'en souvient). */
  passed: Edict[];
  vetoRefused: boolean;
  crown: number;
  shadow: number;
  history: EnactedEdict[];
  pendingPower: Power | null;
  investigated: PlayerId[];
  knowledge: Record<PlayerId, Investigation[]>;
  acked: PlayerId[];
  outcome: ThroneOutcome | null;
  log: LogEntry[];
}

// ───────── Vue filtrée ─────────

export interface ThronePlayerView {
  id: PlayerId;
  name: string;
  isBot: boolean;
  alive: boolean;
  /** Ancien gouvernement : ne peut pas être nommé Sénéchal ce tour-ci. */
  termLimited: boolean;
  /** Peut être nommé Sénéchal maintenant (phase de nomination). */
  eligible: boolean;
  acked: boolean;
  voted: boolean;
  investigated: boolean;
  /** Connu : soi-même, ses alliés, ou tout le monde en fin de partie. */
  role: Role | null;
}

export interface ThroneView {
  phase: Phase;
  config: ThroneConfig;
  players: ThronePlayerView[];
  regent: PlayerId;
  nominee: PlayerId | null;
  agitation: number;
  crown: number;
  shadow: number;
  track: (Power | null)[];
  vetoUnlocked: boolean;
  vetoRefused: boolean;
  deckCount: number;
  discardCount: number;
  lastVote: VoteRecord | null;
  history: EnactedEdict[];
  pendingPower: Power | null;
  me: {
    id: PlayerId;
    role: Role;
    team: Team;
    /** Rôles connus des autres (alliés). */
    allies: { id: PlayerId; role: Role }[];
    investigations: Investigation[];
    /** Édits en main (Régent puis Sénéchal pendant la session). */
    hand: Edict[] | null;
    /** Ce que ce joueur a transmis comme Régent pendant cette session. */
    passed: Edict[] | null;
    /** Présage : les 3 prochains édits. */
    peek: Edict[] | null;
    myVote: boolean | null;
  } | null;
  outcome: ThroneOutcome | null;
  log: string[];
}

export const ROLE_LABEL: Record<Role, string> = {
  loyal: 'Loyaliste',
  conspirator: 'Conjuré',
  usurper: 'Usurpateur',
};

export const TEAM_LABEL: Record<Team, string> = {
  crown: 'la Couronne',
  shadow: 'l’Ombre',
};

export const EDICT_LABEL: Record<Edict, string> = {
  crown: 'Édit royal',
  shadow: 'Édit de l’Ombre',
};

export const POWER_LABEL: Record<Power, string> = {
  investigate: 'Enquête',
  peek: 'Présage',
  special: 'Succession',
  execute: 'Exécution',
};

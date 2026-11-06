import type { z } from 'zod';

/** Identifiant public d'un joueur (jamais secret, à ne pas confondre avec le jeton de session). */
export type PlayerId = string;

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  isBot: boolean;
}

/** Source de hasard injectée : crypto en production, graine fixe dans les tests. */
export interface Rng {
  /** Entier uniforme dans [0, n). */
  int(n: number): number;
  /** Copie mélangée (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  pick<T>(items: readonly T[]): T;
}

/** Entrée de journal : chaque ligne déclare qui a le droit de la lire. */
export interface LogEntry {
  text: string;
  visibleTo: 'all' | PlayerId[];
}

export interface GameResult {
  winners: PlayerId[];
  title: string;
  detail?: string;
}

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: [number, number];
  /** Jouable sur un seul appareil qu'on se passe. */
  supportsHotseat: boolean;
  /** Règles affichées dans le lobby, un paragraphe par entrée. */
  rules: string[];
}

/**
 * Contrat d'un jeu. Toutes les fonctions sont pures : pas de réseau, pas d'horloge,
 * le hasard passe par `rng`. Le même module tourne sur le serveur (en ligne) et dans
 * le navigateur (mode local).
 */
export interface GameModule<State, Move, View, Config> {
  meta: GameMeta;
  configSchema: z.ZodType<Config>;
  defaultConfig: Config;
  moveSchema: z.ZodType<Move>;

  /** Distribution des rôles, mélange, état initial. */
  setup(players: PlayerInfo[], config: Config, rng: Rng): State;
  /** Joueurs dont le jeu attend une action (0, 1 ou plusieurs pour les choix simultanés). */
  expectedActors(state: State): PlayerId[];
  /** `null` si le coup est légal, sinon un message lisible. */
  validate(state: State, by: PlayerId, move: Move): string | null;
  /** Applique un coup déjà validé et renvoie un NOUVEL état. */
  apply(state: State, by: PlayerId, move: Move, rng: Rng): State;
  /** Projection de l'état pour un joueur (`null` = spectateur / écran partagé). */
  view(state: State, viewer: PlayerId | null): View;
  result(state: State): GameResult | null;

  /** Bot : ne reçoit que la vue filtrée, comme un humain. `null` = rien à faire. */
  bot?(view: View, me: PlayerId, rng: Rng): Move | null;

  hotseat?: {
    /** Vrai quand les actions attendues reposent sur de l'information privée. */
    needsPrivacy(state: State): boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any, any, any>;

/** Ce que le serveur envoie à chaque client après chaque coup. */
export interface GameSnapshot<View = unknown> {
  gameId: string;
  seq: number;
  view: View;
  expectedActors: PlayerId[];
  result: GameResult | null;
}

/** Props communes aux plateaux React de tous les jeux. */
export interface BoardProps<View, Move> {
  view: View;
  /** Joueur dont l'information privée est affichée (null = écran public). */
  viewer: PlayerId | null;
  /** Joueur autorisé à agir depuis cet écran (null = lecture seule). */
  actingAs: PlayerId | null;
  mode: 'online' | 'hotseat';
  sendMove: (move: Move) => void;
}

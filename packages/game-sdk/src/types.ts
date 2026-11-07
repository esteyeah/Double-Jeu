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

/** Option réglable par l'hôte (durée, nombre de manches…), affichée dans le lobby. */
export interface GameSetting {
  key: string;
  label: string;
  /** `hint` : courte description affichée sous le choix (rôles, variantes…). */
  choices: { value: string | number | boolean; label: string; hint?: string }[];
  /** `multi` : plusieurs choix cochables (la valeur est alors un tableau). */
  kind?: 'single' | 'multi';
  /** Bornes du nombre de choix cochés (options `multi`). */
  min?: number;
  max?: number;
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
  /**
   * Des bots peuvent occuper des sièges. Faux pour les jeux de discussion pure :
   * le module peut quand même fournir `bot` pour remplacer un joueur déconnecté.
   */
  supportsBots: boolean;
  /** Options proposées à l'hôte. Les valeurs sont validées par `configSchema`. */
  settings?: GameSetting[];
  /** Valeurs d'options suggérées pour le mode « un seul téléphone ». */
  hotseatDefaults?: Record<string, unknown>;
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

  /**
   * Vérifie qu'une partie peut démarrer avec ce nombre de joueurs et ces options
   * (ex. assez de cartes pour tous). `null` si c'est bon, sinon un message pour l'hôte.
   */
  canStart?(players: number, config: Config): string | null;
  /** Distribution des rôles, mélange, état initial. */
  setup(players: PlayerInfo[], config: Config, rng: Rng): State;
  /** Joueurs dont le jeu attend une action (0, 1 ou plusieurs pour les choix simultanés). */
  expectedActors(state: State): PlayerId[];
  /** `null` si le coup est légal, sinon un message lisible. */
  validate(state: State, by: PlayerId, move: Move): string | null;
  /**
   * Applique un coup déjà validé et renvoie un NOUVEL état.
   * `now` (ms) vient du runtime : le moteur reste pur et testable (chronos, délais).
   */
  apply(state: State, by: PlayerId, move: Move, rng: Rng, now: number): State;
  /** Projection de l'état pour un joueur (`null` = spectateur / écran partagé). */
  view(state: State, viewer: PlayerId | null): View;
  result(state: State): GameResult | null;

  /**
   * Échéance (horodatage en ms) à laquelle le runtime doit appeler `onDeadline`,
   * ou `null`. Sert aux chronos imposés par le serveur.
   */
  deadline?(state: State): number | null;
  /** Appelé par le runtime une fois l'échéance passée ; renvoie un NOUVEL état. */
  onDeadline?(state: State, rng: Rng, now: number): State;

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

import { z } from 'zod';
import type { GameSnapshot, PlayerId } from '@arcade/game-sdk';

// ───────── Constantes ─────────

/** Sans 0/O ni 1/I/L pour éviter les confusions quand on dicte le code. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const NAME_MAX = 20;
export const CHAT_MAX = 300;

// ───────── Schémas des messages client → serveur (tout est revalidé côté serveur) ─────────

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Choisis un pseudo.')
  .max(NAME_MAX, `Pseudo trop long (${NAME_MAX} caractères max).`);

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`), 'Code de salon invalide.');

export const gameIdSchema = z.string().min(1).max(32);

export const schemas = {
  'room:create': z.object({ name: nameSchema, gameId: gameIdSchema }),
  'room:join': z.object({ name: nameSchema, code: roomCodeSchema }),
  'room:leave': z.object({}),
  'room:setGame': z.object({ gameId: gameIdSchema }),
  /** Validé ensuite par le `configSchema` du jeu. */
  'room:setConfig': z.object({ config: z.record(z.string().max(32), z.unknown()) }),
  'room:addBot': z.object({}),
  'room:removeSeat': z.object({ playerId: z.string().min(1).max(64) }),
  'room:start': z.object({}),
  'room:backToLobby': z.object({}),
  'game:move': z.object({ move: z.unknown() }),
  'chat:send': z.object({ text: z.string().trim().min(1).max(CHAT_MAX) }),
} as const;

export type ClientEvent = keyof typeof schemas;
export type ClientPayload<E extends ClientEvent> = z.input<(typeof schemas)[E]>;

export type Ack<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface AckData {
  'room:create': { code: string };
  'room:join': { code: string };
  'room:leave': object;
  'room:setGame': object;
  'room:setConfig': object;
  'room:addBot': object;
  'room:removeSeat': object;
  'room:start': object;
  'room:backToLobby': object;
  'game:move': object;
  'chat:send': object;
}

// ───────── État public d'un salon ─────────

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export interface Seat {
  id: PlayerId;
  name: string;
  isBot: boolean;
  connected: boolean;
  /** Joueur déconnecté depuis trop longtemps : un bot joue à sa place. */
  autopilot: boolean;
}

export interface RoomState {
  code: string;
  hostId: PlayerId;
  gameId: string;
  /** Options choisies par l'hôte pour le jeu en cours. */
  config: Record<string, unknown>;
  status: RoomStatus;
  seats: Seat[];
  spectators: { id: PlayerId; name: string }[];
}

export interface ChatMessage {
  id: number;
  playerId: PlayerId | null;
  name: string;
  text: string;
  at: number;
  system?: boolean;
}

// ───────── Événements Socket.io typés ─────────

type Handler<E extends ClientEvent> = (
  payload: ClientPayload<E>,
  ack: (res: Ack<AckData[E]>) => void,
) => void;

export type ClientToServerEvents = { [E in ClientEvent]: Handler<E> };

export interface ServerToClientEvents {
  session: (data: { token: string; playerId: PlayerId }) => void;
  'room:state': (state: RoomState) => void;
  'room:left': (data: { reason: 'left' | 'kicked' }) => void;
  'game:snapshot': (snapshot: GameSnapshot) => void;
  'game:cleared': () => void;
  'chat:history': (messages: ChatMessage[]) => void;
  'chat:message': (message: ChatMessage) => void;
}

// ───────── Comptes et API HTTP (/api) ─────────

export const ACCOUNT_NAME_MIN = 3;
export const PASSWORD_MIN = 8;

export const accountNameSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(ACCOUNT_NAME_MIN, `Pseudo trop court (${ACCOUNT_NAME_MIN} caractères min).`)
      .max(NAME_MAX, `Pseudo trop long (${NAME_MAX} caractères max).`)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u, 'Lettres, chiffres, espaces et . _ \' - seulement.'),
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Mot de passe trop court (${PASSWORD_MIN} caractères min).`)
  .max(128, 'Mot de passe trop long.');

export const credentialsSchema = z.object({ name: accountNameSchema, password: passwordSchema });

/** Un compte tel que le site le voit. */
export interface ApiUser {
  id: string;
  name: string;
  /** Peut gérer les mots ajoutés aux jeux. */
  admin: boolean;
}

export interface ApiWord {
  id: string;
  word: string;
  createdAt: number;
}

/** Clé de comparaison : sans accents, sans majuscules, espaces réduits. */
export const wordKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const CUSTOM_WORD_MAX = 20;
export const customWordSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, ' ').toLocaleLowerCase('fr'))
  .pipe(
    z
      .string()
      .min(2, 'Mot trop court.')
      .max(CUSTOM_WORD_MAX, `Mot trop long (${CUSTOM_WORD_MAX} caractères max).`)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N}' -]*$/u, 'Lettres, chiffres, espaces, apostrophes et tirets seulement.'),
  );
export const addWordsSchema = z.object({ words: z.array(z.string().max(100)).min(1).max(300) });

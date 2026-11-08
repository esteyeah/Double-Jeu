import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@arcade/protocol';
import type { Session } from './sessions';

export interface SocketData {
  session: Session;
  /** Salon auquel CE socket est attaché (un onglet = un salon). */
  roomCode: string | null;
  /** Compte connecté sur ce navigateur (facultatif : on joue aussi sans compte). */
  account: { id: string; name: string } | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type InterServerEvents = {};

export type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type ArcadeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

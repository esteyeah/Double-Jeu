'use client';

import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { GameSnapshot, PlayerId } from '@arcade/game-sdk';
import type {
  Ack,
  AckData,
  ChatMessage,
  ClientEvent,
  ClientPayload,
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from '@arcade/protocol';
import { KEYS, storage } from './storage';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

interface OnlineState {
  connection: 'idle' | 'connecting' | 'connected' | 'disconnected';
  playerId: PlayerId | null;
  room: RoomState | null;
  snapshot: GameSnapshot | null;
  chat: ChatMessage[];
  /** Renseigné quand le serveur nous retire du salon. */
  left: 'left' | 'kicked' | null;
}

export const useOnline = create<OnlineState>(() => ({
  connection: 'idle',
  playerId: null,
  room: null,
  snapshot: null,
  chat: [],
  left: null,
}));

/**
 * Adresse du serveur de jeu :
 * - `same-origin` : même adresse que la page (tout passe par un seul port, cf. `pnpm play`) ;
 * - une URL explicite (déploiement) ;
 * - par défaut : même hôte que la page, port 4000 (pratique en dev, y compris depuis un téléphone).
 */
function serverUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;
  if (configured === 'same-origin') return undefined;
  return configured || `${window.location.protocol}//${window.location.hostname}:4000`;
}

let socket: Client | null = null;

/** Socket unique pour toute l'application, créé à la première utilisation. */
export function getSocket(): Client {
  if (socket) return socket;
  const options = {
    // Relu à chaque (re)connexion : le jeton secret identifie le joueur.
    auth: (cb: (data: object) => void) => cb({ token: storage.get(KEYS.token) }),
  };
  const url = serverUrl();
  const s: Client = url ? io(url, options) : io(options);
  socket = s;
  useOnline.setState({ connection: 'connecting' });

  s.on('connect', () => useOnline.setState({ connection: 'connected' }));
  s.on('disconnect', () => useOnline.setState({ connection: 'disconnected' }));
  s.on('session', ({ token, playerId }) => {
    storage.set(KEYS.token, token);
    useOnline.setState({ playerId });
  });
  s.on('room:state', (room) => useOnline.setState({ room, left: null }));
  s.on('room:left', ({ reason }) =>
    useOnline.setState({ room: null, snapshot: null, chat: [], left: reason }),
  );
  s.on('game:snapshot', (snapshot) => useOnline.setState({ snapshot }));
  s.on('game:cleared', () => useOnline.setState({ snapshot: null }));
  s.on('chat:history', (chat) => useOnline.setState({ chat }));
  s.on('chat:message', (message) =>
    useOnline.setState((st) => ({ chat: [...st.chat, message].slice(-100) })),
  );
  return s;
}

/** Envoie une requête et attend l'accusé de réception du serveur. */
export async function request<E extends ClientEvent>(
  event: E,
  payload: ClientPayload<E>,
): Promise<Ack<AckData[E]>> {
  try {
    // Le typage générique de Socket.io ne suit pas un nom d'événement paramétré.
    const emitter = getSocket().timeout(6000) as unknown as {
      emitWithAck(ev: string, p: unknown): Promise<Ack<AckData[E]>>;
    };
    return await emitter.emitWithAck(event, payload);
  } catch {
    return { ok: false, error: 'Le serveur ne répond pas. Vérifie ta connexion.' };
  }
}

export function resetOnlineRoom(): void {
  useOnline.setState({ room: null, snapshot: null, chat: [], left: null });
}

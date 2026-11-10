import type { z } from 'zod';
import { schemas, type Ack, type AckData, type ClientEvent } from '@arcade/protocol';
import { getGame } from './games';
import type { RoomManager } from './rooms';
import type { ArcadeSocket } from './types';

/** Seau à jetons par socket : 20 requêtes en rafale, 8 par seconde ensuite. */
function rateLimiter(capacity = 20, perSecond = 8) {
  let tokens = capacity;
  let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * perSecond);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

export function registerHandlers(socket: ArcadeSocket, rooms: RoomManager): void {
  const session = socket.data.session;
  const allow = rateLimiter();
  socket.emit('session', { token: session.token, playerId: session.playerId });

  /**
   * Enregistre un gestionnaire : limite de débit → validation Zod → logique.
   * Le payload est `unknown` : il vient du réseau et n'est jamais pris tel quel.
   */
  function on<E extends ClientEvent>(
    event: E,
    fn: (data: z.output<(typeof schemas)[E]>) => Ack<AckData[E]>,
  ): void {
    const listener = (payload: unknown, ack: unknown) => {
      const reply = (typeof ack === 'function' ? ack : () => {}) as (res: Ack<AckData[E]>) => void;
      if (!allow()) return reply({ ok: false, error: 'Trop de requêtes, ralentis un peu.' });
      const parsed = schemas[event].safeParse(payload ?? {});
      if (!parsed.success) {
        return reply({ ok: false, error: parsed.error.issues[0]?.message ?? 'Requête invalide.' });
      }
      session.lastSeen = Date.now();
      try {
        reply(fn(parsed.data as z.output<(typeof schemas)[E]>));
      } catch (err) {
        console.error(`[${event}]`, err);
        reply({ ok: false, error: 'Erreur interne du serveur.' });
      }
    };
    // Le typage générique de Socket.io ne suit pas les noms d'événements calculés.
    (socket.on as (ev: string, l: typeof listener) => void)(event, listener);
  }

  const currentRoom = () => rooms.get(session.roomCode);
  const noRoom = { ok: false, error: "Tu n'es dans aucun salon." } as const;

  on('room:create', ({ name, gameId, skin }) => {
    if (!getGame(gameId)) return { ok: false, error: 'Ce jeu n’est pas encore disponible.' };
    const room = rooms.create(session.playerId, gameId);
    if (skin !== undefined) room.setSkin(session.playerId, skin);
    const res = rooms.enter(socket, session, room, name);
    return res.ok ? { ok: true, code: room.code } : res;
  });

  on('room:join', ({ name, code, skin }) => {
    const room = rooms.get(code);
    if (!room) return { ok: false, error: 'Salon introuvable. Vérifie le code.' };
    if (skin !== undefined) room.setSkin(session.playerId, skin);
    const res = rooms.enter(socket, session, room, name);
    return res.ok ? { ok: true, code: room.code } : res;
  });

  on('room:setSkin', ({ skin }) => currentRoom()?.setSkin(session.playerId, skin) ?? noRoom);

  on('room:leave', () => {
    const room = currentRoom();
    if (room) room.leave(session.playerId, 'left');
    session.roomCode = null;
    return { ok: true };
  });

  on('room:setGame', ({ gameId }) => currentRoom()?.setGame(session.playerId, gameId) ?? noRoom);
  on('room:setConfig', ({ config }) => currentRoom()?.setConfig(session.playerId, config) ?? noRoom);
  on('room:addBot', () => currentRoom()?.addBot(session.playerId) ?? noRoom);
  on('room:removeSeat', ({ playerId }) => currentRoom()?.removeSeat(session.playerId, playerId) ?? noRoom);
  on('room:start', () => currentRoom()?.start(session.playerId) ?? noRoom);
  on('room:backToLobby', () => currentRoom()?.backToLobby(session.playerId) ?? noRoom);
  on('game:move', ({ move }) => currentRoom()?.move(session.playerId, move) ?? noRoom);
  on('chat:send', ({ text }) => currentRoom()?.say(session.playerId, text) ?? noRoom);

  socket.on('disconnect', () => {
    rooms.get(socket.data.roomCode)?.detach(socket.id, session.playerId);
  });
}

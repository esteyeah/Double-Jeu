import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type Ack } from '@arcade/protocol';
import { Room } from './room';
import type { Session } from './sessions';
import type { ArcadeSocket, IO } from './types';

/** Un salon sans aucun humain connecté depuis ce délai est supprimé. */
const EMPTY_ROOM_TTL_MS = 10 * 60_000;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private readonly io: IO) {}

  get(code: string | null | undefined): Room | undefined {
    return code ? this.rooms.get(code) : undefined;
  }

  has(code: string): boolean {
    return this.rooms.has(code);
  }

  get size(): number {
    return this.rooms.size;
  }

  create(hostId: string, gameId: string): Room {
    let code: string;
    do {
      code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
      ).join('');
    } while (this.rooms.has(code));
    const room = new Room(this.io, code, hostId, gameId);
    this.rooms.set(code, room);
    return room;
  }

  /** Fait entrer un socket dans un salon ; quitte d'abord l'ancien salon du joueur. */
  enter(socket: ArcadeSocket, session: Session, room: Room, name: string): Ack {
    if (session.roomCode && session.roomCode !== room.code) {
      this.get(session.roomCode)?.leave(session.playerId, 'left');
    }
    if (socket.data.roomCode && socket.data.roomCode !== room.code) {
      this.get(socket.data.roomCode)?.detach(socket.id, session.playerId);
    }
    session.roomCode = room.code;
    return room.join(socket, session.playerId, name);
  }

  sweep(): void {
    const limit = Date.now() - EMPTY_ROOM_TTL_MS;
    for (const [code, room] of this.rooms) {
      if (room.emptySince !== null && room.emptySince < limit) {
        room.dispose();
        this.rooms.delete(code);
      }
    }
  }

  disposeAll(): void {
    for (const room of this.rooms.values()) room.dispose();
    this.rooms.clear();
  }
}

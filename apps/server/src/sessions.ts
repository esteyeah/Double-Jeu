import { randomBytes } from 'node:crypto';
import type { PlayerId } from '@arcade/game-sdk';

/**
 * Une session relie un jeton SECRET (gardé par le navigateur) à un identifiant PUBLIC.
 * Le serveur déduit toujours l'auteur d'une action du jeton : un client ne peut pas
 * se faire passer pour un autre joueur en envoyant son playerId.
 */
export interface Session {
  token: string;
  playerId: PlayerId;
  roomCode: string | null;
  lastSeen: number;
}

export class SessionStore {
  private byToken = new Map<string, Session>();

  resumeOrCreate(token: unknown): Session {
    if (typeof token === 'string' && token.length <= 64) {
      const existing = this.byToken.get(token);
      if (existing) {
        existing.lastSeen = Date.now();
        return existing;
      }
    }
    const session: Session = {
      token: randomBytes(18).toString('base64url'),
      playerId: `p_${randomBytes(8).toString('base64url')}`,
      roomCode: null,
      lastSeen: Date.now(),
    };
    this.byToken.set(session.token, session);
    return session;
  }

  /** Oublie les sessions inactives qui ne sont plus dans aucun salon. */
  sweep(maxIdleMs: number, roomExists: (code: string) => boolean): void {
    const limit = Date.now() - maxIdleMs;
    for (const [token, s] of this.byToken) {
      if (s.lastSeen < limit && (s.roomCode === null || !roomExists(s.roomCode))) {
        this.byToken.delete(token);
      }
    }
  }

  get size(): number {
    return this.byToken.size;
  }
}

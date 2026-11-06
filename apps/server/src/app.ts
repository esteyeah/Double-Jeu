import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { listGames } from './games';
import { registerHandlers } from './handlers';
import { RoomManager } from './rooms';
import { SessionStore } from './sessions';
import type { IO } from './types';

export interface ArcadeServerOptions {
  /** Origines autorisées (CORS). `true` = toutes (pratique en dev, à restreindre en prod). */
  corsOrigin: string[] | true;
}

export interface ArcadeServer {
  http: HttpServer;
  io: IO;
  rooms: RoomManager;
  close(): Promise<void>;
}

export function createArcadeServer(options: ArcadeServerOptions): ArcadeServer {
  const sessions = new SessionStore();

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          rooms: rooms.size,
          sessions: sessions.size,
          games: listGames().map((g) => g.meta.id),
        }),
      );
      return;
    }
    res.writeHead(404).end();
  });

  const io: IO = new Server(http, {
    cors: { origin: options.corsOrigin },
    // Les messages légitimes font quelques centaines d'octets.
    maxHttpBufferSize: 16_000,
  });
  const rooms = new RoomManager(io);

  io.use((socket, next) => {
    socket.data.session = sessions.resumeOrCreate(socket.handshake.auth?.token);
    socket.data.roomCode = null;
    next();
  });
  io.on('connection', (socket) => registerHandlers(socket, rooms));

  const sweeper = setInterval(() => {
    rooms.sweep();
    sessions.sweep(24 * 3600_000, (code) => rooms.has(code));
  }, 60_000);
  sweeper.unref();

  return {
    http,
    io,
    rooms,
    close: () =>
      new Promise((resolve) => {
        clearInterval(sweeper);
        rooms.disposeAll();
        io.close(() => resolve());
      }),
  };
}

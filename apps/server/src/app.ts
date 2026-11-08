import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { Accounts } from './accounts';
import { createApi } from './api';
import { listGames, wordBankGames } from './games';
import { registerHandlers } from './handlers';
import { RoomManager } from './rooms';
import { SessionStore } from './sessions';
import { MemoryStore, type Store } from './store';
import type { IO } from './types';
import { WordBank } from './words';

export interface ArcadeServerOptions {
  /** Origines autorisées (CORS). `true` = toutes (pratique en dev, à restreindre en prod). */
  corsOrigin: string[] | true;
  /** Comptes et mots ajoutés ; par défaut, en mémoire (tests). */
  services?: ArcadeServices;
}

export interface ArcadeServices {
  store: Store;
  accounts: Accounts;
  words: WordBank;
  /** Faux si la base est injoignable : comptes et mots ajoutés ne vivent alors qu'en mémoire. */
  persistent: boolean;
}

/** Prépare le stockage durable puis les services qui s'en servent. */
export async function createServices(store: Store, admins: string[] = [], persistent = true): Promise<ArcadeServices> {
  await store.init();
  return { store, accounts: new Accounts(store, admins), words: await WordBank.load(store, wordBankGames()), persistent };
}

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`pas de réponse en ${ms / 1000} s`)), ms).unref()),
  ]);

/**
 * Comme `createServices`, mais si la base ne répond pas (supprimée, adresse fausse, panne),
 * le site démarre quand même : les jeux marchent, comptes et mots ajoutés restent en mémoire.
 */
export async function createServicesOrFallback(
  store: Store,
  admins: string[] = [],
  { timeoutMs = 15_000, warn = console.error }: { timeoutMs?: number; warn?: (msg: string) => void } = {},
): Promise<ArcadeServices> {
  try {
    return await withTimeout(createServices(store, admins), timeoutMs);
  } catch (err) {
    warn(
      `⚠ Base de données injoignable (${(err as Error).message}). Les jeux fonctionnent, mais les comptes et les mots ajoutés ne sont gardés qu'en mémoire jusqu'au prochain redémarrage.`,
    );
    void store.close().catch(() => {});
    return createServices(new MemoryStore(), admins, false);
  }
}

export interface ArcadeServer {
  http: HttpServer;
  io: IO;
  rooms: RoomManager;
  close(): Promise<void>;
}

export async function createArcadeServer(options: ArcadeServerOptions): Promise<ArcadeServer> {
  const sessions = new SessionStore();
  const services = options.services ?? (await createServices(new MemoryStore()));
  const api = createApi({
    accounts: services.accounts,
    words: services.words,
    corsOrigin: options.corsOrigin,
    persistent: services.persistent,
  });

  const http = createServer((req, res) => {
    if (api(req, res)) return;
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          rooms: rooms.size,
          sessions: sessions.size,
          storage: services.persistent ? 'database' : 'memory',
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
  const rooms = new RoomManager(io, (gameId) =>
    services.words.supports(gameId) ? { words: services.words.words(gameId) } : undefined,
  );

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
        io.close(() => void services.store.close().then(() => resolve()));
      }),
  };
}

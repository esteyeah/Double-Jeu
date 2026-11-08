import type { IncomingMessage, ServerResponse } from 'node:http';
import { addWordsSchema } from '@arcade/protocol';
import type { Accounts } from './accounts';
import { listGames } from './games';
import type { RecordBook } from './records';
import type { WordBank } from './words';

const BODY_LIMIT = 64 * 1024;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Seau à jetons par adresse IP (connexion / inscription). */
function ipLimiter(capacity: number, perMinute: number) {
  const buckets = new Map<string, { tokens: number; last: number }>();
  return (ip: string) => {
    const now = Date.now();
    if (buckets.size > 10_000) buckets.clear();
    const b = buckets.get(ip) ?? { tokens: capacity, last: now };
    b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 60_000) * perMinute);
    b.last = now;
    buckets.set(ip, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  };
}

/** Adresse du client : la DERNIÈRE entrée de X-Forwarded-For est celle ajoutée par l'hébergeur (les premières peuvent être inventées). */
function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const last = (Array.isArray(forwarded) ? forwarded.join(',') : forwarded)?.split(',').at(-1)?.trim();
  return last || req.socket.remoteAddress || '?';
}

function bearer(req: IncomingMessage): string | null {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_LIMIT) throw new HttpError(413, 'Requête trop volumineuse.');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON invalide.');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export interface ApiDeps {
  accounts: Accounts;
  words: WordBank;
  corsOrigin: string[] | true;
  /** Faux si la base est injoignable (les mots ajoutés seront perdus au redémarrage). */
  persistent?: boolean;
  records?: RecordBook;
}

/**
 * API HTTP du site :
 *   POST /api/auth/register · POST /api/auth/login · POST /api/auth/logout · GET /api/auth/me
 *   GET /api/words/:jeu (public) · POST /api/words/:jeu (admin) · DELETE /api/words/:jeu/:id (admin)
 * Renvoie false si l'URL ne commence pas par /api/.
 */
export function createApi({ accounts, words, corsOrigin, persistent = true, records }: ApiDeps) {
  const authLimit = ipLimiter(10, 10);

  function cors(req: IncomingMessage, res: ServerResponse): void {
    const origin = req.headers.origin;
    if (!origin) return;
    if (corsOrigin === true || corsOrigin.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-allow-headers', 'content-type, authorization');
      res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('access-control-max-age', '600');
    }
  }

  async function requireAdmin(req: IncomingMessage) {
    const user = await accounts.userForToken(bearer(req));
    if (!user) throw new HttpError(401, 'Connecte-toi d’abord.');
    if (!user.admin) throw new HttpError(403, 'Réservé à l’administrateur du site.');
    return user;
  }

  async function route(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
    const method = req.method ?? 'GET';

    if (path.startsWith('/api/auth/')) {
      const action = path.slice('/api/auth/'.length);
      if ((action === 'register' || action === 'login') && method === 'POST') {
        if (!authLimit(clientIp(req))) throw new HttpError(429, 'Trop de tentatives, réessaie dans une minute.');
        const body = await readJson(req);
        const out = action === 'register' ? await accounts.register(body) : await accounts.login(body);
        return send(res, out.ok ? 200 : action === 'register' ? 400 : 401, out);
      }
      if (action === 'logout' && method === 'POST') {
        await accounts.logout(bearer(req));
        return send(res, 200, { ok: true });
      }
      if (action === 'me' && method === 'GET') {
        const user = await accounts.userForToken(bearer(req));
        return user ? send(res, 200, { ok: true, user }) : send(res, 401, { ok: false, error: 'Non connecté.' });
      }
    }

    if (path === '/api/records' && method === 'GET') {
      const games = listGames()
        .filter((g) => g.meta.records?.length)
        .map((g) => ({
          id: g.meta.id,
          name: g.meta.name,
          records: g.meta.records!.map((r) => ({
            ...r,
            entries: (records?.top(g.meta.id, r.key) ?? []).map((e) => ({
              names: e.names,
              verified: e.verified,
              value: e.value,
              detail: e.detail,
              at: e.createdAt,
            })),
          })),
        }));
      return send(res, 200, { ok: true, games });
    }

    const wordsMatch = /^\/api\/words\/([a-z0-9-]{1,32})(?:\/([A-Za-z0-9_-]{1,40}))?$/.exec(path);
    if (wordsMatch) {
      const [, game, id] = wordsMatch as unknown as [string, string, string | undefined];
      if (!words.supports(game)) throw new HttpError(404, 'Ce jeu n’accepte pas de mots ajoutés.');
      if (!id && method === 'GET') {
        return send(res, 200, { ok: true, baseCount: words.baseCount(game), words: words.list(game), persistent });
      }
      if (!id && method === 'POST') {
        const user = await requireAdmin(req);
        const parsed = addWordsSchema.safeParse(await readJson(req));
        if (!parsed.success) throw new HttpError(400, 'Envoie une liste de 1 à 300 mots.');
        return send(res, 200, { ok: true, ...(await words.add(game, parsed.data.words, user.id)) });
      }
      if (id && method === 'DELETE') {
        await requireAdmin(req);
        const removed = await words.remove(game, id);
        return removed ? send(res, 200, { ok: true }) : send(res, 404, { ok: false, error: 'Mot introuvable.' });
      }
    }

    throw new HttpError(404, 'Introuvable.');
  }

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const path = (req.url ?? '/').split('?')[0]!;
    if (!path.startsWith('/api/')) return false;
    cors(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return true;
    }
    route(req, res, path).catch((err: unknown) => {
      if (err instanceof HttpError) return send(res, err.status, { ok: false, error: err.message });
      console.error('[api]', err);
      if (!res.headersSent) send(res, 500, { ok: false, error: 'Erreur interne du serveur.' });
    });
    return true;
  };
}

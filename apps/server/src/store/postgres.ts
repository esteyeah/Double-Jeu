import pg from 'pg';
import type { RecordRow, Store, UserRecord, WordRecord } from './types';

/** Stockage PostgreSQL (production) : `DATABASE_URL` fournie par l'hébergeur. */
export class PostgresStore implements Store {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: sslFor(connectionString),
      max: 5,
      // Une base qui ne répond pas ne doit jamais bloquer le serveur.
      connectionTimeoutMillis: 10_000,
      query_timeout: 15_000,
    });
    // Une connexion inactive qui tombe (base en veille, coupure réseau) ne doit pas faire planter le serveur.
    this.pool.on('error', (err) => console.error('[postgres]', err.message));
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_tokens (
        hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS custom_words (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        word TEXT NOT NULL,
        word_key TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE (game, word_key)
      );
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        key TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        detail TEXT,
        names TEXT NOT NULL,
        verified BOOLEAN NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createUser(user: UserRecord): Promise<UserRecord | null> {
    const res = await this.pool.query(
      `INSERT INTO users (id, name, name_key, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name_key) DO NOTHING`,
      [user.id, user.name, user.nameKey, user.passwordHash, user.createdAt],
    );
    return res.rowCount ? { ...user } : null;
  }

  async findUserByKey(nameKey: string): Promise<UserRecord | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE name_key = $1', [nameKey]);
    return res.rows[0] ? toUser(res.rows[0]) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] ? toUser(res.rows[0]) : null;
  }

  async saveToken(hash: string, userId: string, expiresAt: number): Promise<void> {
    await this.pool.query('DELETE FROM auth_tokens WHERE expires_at <= $1', [Date.now()]);
    await this.pool.query('INSERT INTO auth_tokens (hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      hash,
      userId,
      expiresAt,
    ]);
  }

  async findToken(hash: string, now: number): Promise<string | null> {
    const res = await this.pool.query('SELECT user_id FROM auth_tokens WHERE hash = $1 AND expires_at > $2', [hash, now]);
    return (res.rows[0]?.user_id as string | undefined) ?? null;
  }

  async deleteToken(hash: string): Promise<void> {
    await this.pool.query('DELETE FROM auth_tokens WHERE hash = $1', [hash]);
  }

  async listWords(): Promise<WordRecord[]> {
    const res = await this.pool.query('SELECT * FROM custom_words ORDER BY created_at, word');
    return res.rows.map(toWord);
  }

  async addWords(words: WordRecord[]): Promise<WordRecord[]> {
    const added: WordRecord[] = [];
    for (const w of words) {
      const res = await this.pool.query(
        `INSERT INTO custom_words (id, game, word, word_key, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (game, word_key) DO NOTHING`,
        [w.id, w.game, w.word, w.wordKey, w.createdBy, w.createdAt],
      );
      if (res.rowCount) added.push({ ...w });
    }
    return added;
  }

  async listRecords(): Promise<RecordRow[]> {
    const res = await this.pool.query('SELECT * FROM records ORDER BY created_at');
    return res.rows.map((r) => ({
      id: r.id,
      game: r.game,
      key: r.key,
      value: Number(r.value),
      detail: r.detail,
      names: JSON.parse(r.names) as string[],
      verified: r.verified,
      createdAt: Number(r.created_at),
    }));
  }

  async addRecord(r: RecordRow): Promise<void> {
    await this.pool.query(
      'INSERT INTO records (id, game, key, value, detail, names, verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [r.id, r.game, r.key, r.value, r.detail, JSON.stringify(r.names), r.verified, r.createdAt],
    );
  }

  async deleteRecords(ids: string[]): Promise<void> {
    if (ids.length) await this.pool.query('DELETE FROM records WHERE id = ANY($1)', [ids]);
  }

  async deleteWord(game: string, id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM custom_words WHERE game = $1 AND id = $2', [game, id]);
    return (res.rowCount ?? 0) > 0;
  }
}

/**
 * Chiffrement de la connexion :
 * - `sslmode=…` dans l'URL : on laisse le pilote l'appliquer ;
 * - base locale, ou adresse interne de l'hébergeur (nom sans point, ex. Render) : pas de TLS ;
 * - sinon (base hébergée joignable par Internet) : TLS.
 */
export function sslFor(connectionString: string): false | { rejectUnauthorized: false } | undefined {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return undefined;
  }
  if (url.searchParams.has('sslmode') || url.searchParams.has('ssl')) return undefined;
  const host = url.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || !host.includes('.')) return false;
  return { rejectUnauthorized: false };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toUser = (r: any): UserRecord => ({
  id: r.id,
  name: r.name,
  nameKey: r.name_key,
  passwordHash: r.password_hash,
  createdAt: Number(r.created_at),
});

const toWord = (r: any): WordRecord => ({
  id: r.id,
  game: r.game,
  word: r.word,
  wordKey: r.word_key,
  createdBy: r.created_by,
  createdAt: Number(r.created_at),
});

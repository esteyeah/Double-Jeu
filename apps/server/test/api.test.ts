import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Accounts, hashPassword, verifyPassword } from '../src/accounts';
import { createArcadeServer, type ArcadeServer } from '../src/app';
import { JsonFileStore, MemoryStore, PostgresStore, type Store } from '../src/store';
import { RecordBook } from '../src/records';
import { WordBank } from '../src/words';

let server: ArcadeServer;
let url: string;

beforeAll(async () => {
  const store = new MemoryStore();
  await store.init();
  server = await createArcadeServer({
    corsOrigin: true,
    services: {
      store,
      accounts: new Accounts(store, ['Maître Mots']),
      words: await WordBank.load(store, { compass: ['plage', 'lune', 'château'] }),
      records: await RecordBook.load(store),
      persistent: true,
    },
  });
  await new Promise<void>((resolve) => server.http.listen(0, resolve));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; data: any }> {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

describe('Mots de passe', () => {
  it('scrypt salé : deux empreintes différentes, vérification exacte', async () => {
    const a = await hashPassword('correct horse');
    const b = await hashPassword('correct horse');
    expect(a).not.toBe(b);
    expect(a).not.toContain('correct');
    expect(await verifyPassword('correct horse', a)).toBe(true);
    expect(await verifyPassword('correct hors', a)).toBe(false);
  });
});

describe('API comptes', () => {
  it('inscription, pseudo unique (insensible à la casse et aux accents), connexion, déconnexion', async () => {
    const reg = await api('POST', '/api/auth/register', { name: '  Élodie  ', password: 'motdepasse1' });
    expect(reg.status).toBe(200);
    expect(reg.data.user).toMatchObject({ name: 'Élodie', admin: false });
    expect(reg.data.token).toEqual(expect.any(String));
    expect(JSON.stringify(reg.data)).not.toContain('motdepasse1');

    const dup = await api('POST', '/api/auth/register', { name: 'elodie', password: 'autrechose' });
    expect(dup.status).toBe(400);
    expect(dup.data.error).toMatch(/déjà pris/);

    expect((await api('POST', '/api/auth/login', { name: 'ELODIE', password: 'mauvais!!' })).status).toBe(401);
    const login = await api('POST', '/api/auth/login', { name: 'élodie', password: 'motdepasse1' });
    expect(login.status).toBe(200);

    const me = await api('GET', '/api/auth/me', undefined, login.data.token);
    expect(me.data.user.name).toBe('Élodie');
    await api('POST', '/api/auth/logout', undefined, login.data.token);
    expect((await api('GET', '/api/auth/me', undefined, login.data.token)).status).toBe(401);
    // L'autre session (celle de l'inscription) reste valide.
    expect((await api('GET', '/api/auth/me', undefined, reg.data.token)).status).toBe(200);
  });

  it('refuse les pseudos et mots de passe invalides', async () => {
    expect((await api('POST', '/api/auth/register', { name: 'ab', password: 'motdepasse1' })).status).toBe(400);
    expect((await api('POST', '/api/auth/register', { name: 'Zoé', password: 'court' })).status).toBe(400);
    expect((await api('POST', '/api/auth/register', { name: '<script>', password: 'motdepasse1' })).status).toBe(400);
  });

  it('limite les tentatives de connexion par adresse', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
        body: JSON.stringify({ name: 'personne', password: 'nimportequoi' }),
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('API mots', () => {
  it('seul l’administrateur ajoute et supprime ; tout le monde peut lire', async () => {
    const admin = await api('POST', '/api/auth/register', { name: 'Maître Mots', password: 'motdepasse1' });
    expect(admin.data.user.admin).toBe(true);
    const player = await api('POST', '/api/auth/register', { name: 'Joueur', password: 'motdepasse1' });

    expect((await api('POST', '/api/words/compass', { words: ['fusée'] })).status).toBe(401);
    expect((await api('POST', '/api/words/compass', { words: ['fusée'] }, player.data.token)).status).toBe(403);

    const add = await api('POST', '/api/words/compass', { words: ['Fusée', 'fusee', 'Plage', 'x', '  grand  huit '] }, admin.data.token);
    expect(add.status).toBe(200);
    expect(add.data.added.map((w: { word: string }) => w.word)).toEqual(['fusée', 'grand huit']);
    expect(add.data.skipped.map((s: { reason: string }) => s.reason)).toEqual([
      'Déjà ajouté.',
      'Déjà dans la liste de base.',
      'Mot trop court.',
    ]);

    const list = await api('GET', '/api/words/compass');
    expect(list.data.baseCount).toBe(3);
    expect(list.data.words).toHaveLength(2);

    const id = list.data.words[0].id;
    expect((await api('DELETE', `/api/words/compass/${id}`, undefined, player.data.token)).status).toBe(403);
    expect((await api('DELETE', `/api/words/compass/${id}`, undefined, admin.data.token)).status).toBe(200);
    expect((await api('GET', '/api/words/compass')).data.words).toHaveLength(1);
    expect((await api('GET', '/api/words/inconnu')).status).toBe(404);
  });
});

// ───────── Stockages durables ─────────

async function exercise(make: () => Store): Promise<void> {
  const store = make();
  await store.init();
  const user = { id: 'u1', name: 'Léa', nameKey: 'lea', passwordHash: 'scrypt$a$b', createdAt: 1 };
  expect(await store.createUser(user)).toMatchObject({ name: 'Léa' });
  expect(await store.createUser({ ...user, id: 'u2' })).toBeNull();
  await store.saveToken('h1', 'u1', Date.now() + 60_000);
  await store.saveToken('h2', 'u1', Date.now() - 1);
  expect(await store.findToken('h1', Date.now())).toBe('u1');
  expect(await store.findToken('h2', Date.now())).toBeNull();
  const w = { id: 'w1', game: 'compass', word: 'fusée', wordKey: 'fusee', createdBy: 'u1', createdAt: 2 };
  expect(await store.addWords([w, { ...w, id: 'w2' }])).toHaveLength(1);
  await store.close();

  // Rechargement : tout est encore là.
  const again = make();
  await again.init();
  expect((await again.findUserByKey('lea'))?.id).toBe('u1');
  expect(await again.findToken('h1', Date.now())).toBe('u1');
  expect((await again.listWords()).map((x) => x.word)).toEqual(['fusée']);
  expect(await again.deleteWord('compass', 'w1')).toBe(true);
  await again.deleteToken('h1');
  expect(await again.findToken('h1', Date.now())).toBeNull();
  await again.close();
}

describe('Stockages', () => {
  it('fichier JSON : les données survivent à un redémarrage', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'arcade-'));
    try {
      await exercise(() => new JsonFileStore(join(dir, 'sub', 'data.json')));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // Lancé seulement si une base de test est fournie (PG_TEST_URL=postgres://…).
  it.skipIf(!process.env.PG_TEST_URL)('PostgreSQL : mêmes garanties', async () => {
    const reset = new PostgresStore(process.env.PG_TEST_URL!);
    await reset.init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (reset as any).pool.query('TRUNCATE users, auth_tokens, custom_words CASCADE');
    await reset.close();
    await exercise(() => new PostgresStore(process.env.PG_TEST_URL!));
  });
});

describe('Connexion PostgreSQL', () => {
  it('TLS seulement pour les bases joignables par Internet', async () => {
    const { sslFor } = await import('../src/store/postgres');
    expect(sslFor('postgres://u:p@localhost:5432/db')).toBe(false);
    expect(sslFor('postgresql://u:p@dpg-abc123-a/db')).toBe(false);
    expect(sslFor('postgresql://u:p@dpg-abc123-a.frankfurt-postgres.render.com/db')).toEqual({ rejectUnauthorized: false });
    expect(sslFor('postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require')).toBeUndefined();
  });
});

describe('Base injoignable', () => {
  it('le serveur démarre quand même, comptes en mémoire', async () => {
    const { createServicesOrFallback } = await import('../src/app');
    const warnings: string[] = [];
    // Port 1 : personne n'écoute, la connexion échoue tout de suite.
    const services = await createServicesOrFallback(new PostgresStore('postgres://x:y@127.0.0.1:1/absente'), ['Admin'], {
      warn: (m) => warnings.push(m),
    });
    expect(services.persistent).toBe(false);
    expect(warnings[0]).toMatch(/injoignable/);
    const reg = await services.accounts.register({ name: 'Admin', password: 'motdepasse1' });
    expect(reg.ok && reg.user.admin).toBe(true);
    expect((await services.words.add('compass', ['trottinette'], 'u')).added).toHaveLength(1);
  });

  it('une base qui ne répond pas du tout ne bloque pas le démarrage', async () => {
    const { createServicesOrFallback } = await import('../src/app');
    const hanging: Store = { ...new MemoryStore(), init: () => new Promise<void>(() => {}), close: async () => {} } as unknown as Store;
    const started = Date.now();
    const services = await createServicesOrFallback(hanging, [], { timeoutMs: 300, warn: () => {} });
    expect(services.persistent).toBe(false);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe('Diagnostic', () => {
  it('statut public : type de stockage et nombre d’administrateurs, sans pseudo', async () => {
    const res = await api('GET', '/api/status');
    expect(res.data).toEqual({ ok: true, storage: 'database', admins: 1 });
  });

  it('ADMIN_USERS tolère guillemets et @', async () => {
    const store = new MemoryStore();
    const accounts = new Accounts(store, ['"Élodie"', '@sami ']);
    expect(accounts.adminCount).toBe(2);
    const a = await accounts.register({ name: 'elodie', password: 'motdepasse1' });
    const b = await accounts.register({ name: 'Sami', password: 'motdepasse1' });
    expect(a.ok && a.user.admin).toBe(true);
    expect(b.ok && b.user.admin).toBe(true);
  });
});

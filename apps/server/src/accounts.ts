import { createHash, randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'node:crypto';
import { credentialsSchema, wordKey, type ApiUser } from '@arcade/protocol';
import type { Store, UserRecord } from './store';

const TOKEN_TTL_MS = 30 * 24 * 3600_000;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } satisfies ScryptOptions;
const KEY_LEN = 64;

const derive = (password: BinaryLike, salt: BinaryLike) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LEN, SCRYPT, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await derive(password, Buffer.from(salt, 'base64url'));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export type AuthResult = { ok: true; token: string; user: ApiUser } | { ok: false; error: string };

/**
 * Comptes joueurs. Jouer reste possible sans compte : un compte sert (pour l'instant)
 * à garder son pseudo et, pour les administrateurs, à gérer les mots des jeux.
 */
export class Accounts {
  private readonly admins: Set<string>;
  /** Empreinte factice : on calcule toujours un scrypt, même pour un pseudo inconnu (temps de réponse constant). */
  private readonly dummy = hashPassword('pas-un-vrai-mot-de-passe');

  constructor(
    private readonly store: Store,
    /** Pseudos administrateurs (variable ADMIN_USERS). */
    admins: string[] = [],
  ) {
    this.admins = new Set(admins.map(wordKey).filter(Boolean));
  }

  private toApi(user: UserRecord): ApiUser {
    return { id: user.id, name: user.name, admin: this.admins.has(user.nameKey) };
  }

  private async issue(user: UserRecord): Promise<AuthResult> {
    const token = randomBytes(32).toString('base64url');
    await this.store.saveToken(hashToken(token), user.id, Date.now() + TOKEN_TTL_MS);
    return { ok: true, token, user: this.toApi(user) };
  }

  async register(input: unknown): Promise<AuthResult> {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    const { name, password } = parsed.data;
    const user = await this.store.createUser({
      id: `u_${randomBytes(9).toString('base64url')}`,
      name,
      nameKey: wordKey(name),
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    });
    if (!user) return { ok: false, error: 'Ce pseudo est déjà pris.' };
    return this.issue(user);
  }

  async login(input: unknown): Promise<AuthResult> {
    const parsed = credentialsSchema.safeParse(input);
    const wrong = { ok: false, error: 'Pseudo ou mot de passe incorrect.' } as const;
    if (!parsed.success) return wrong;
    const user = await this.store.findUserByKey(wordKey(parsed.data.name));
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await this.dummy));
    if (!user || !valid) return wrong;
    return this.issue(user);
  }

  async userForToken(token: string | null): Promise<ApiUser | null> {
    if (!token || token.length > 100) return null;
    const id = await this.store.findToken(hashToken(token), Date.now());
    const user = id ? await this.store.findUserById(id) : null;
    return user ? this.toApi(user) : null;
  }

  async logout(token: string | null): Promise<void> {
    if (token && token.length <= 100) await this.store.deleteToken(hashToken(token));
  }
}

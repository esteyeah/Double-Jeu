import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Store, UserRecord, WordRecord } from './types';

interface Data {
  users: UserRecord[];
  tokens: { hash: string; userId: string; expiresAt: number }[];
  words: WordRecord[];
}

const empty = (): Data => ({ users: [], tokens: [], words: [] });

/** Stockage en mémoire (tests), et base de la version fichier. */
export class MemoryStore implements Store {
  protected data: Data = empty();

  async init(): Promise<void> {}
  async close(): Promise<void> {}
  /** Appelé après chaque écriture. */
  protected async persist(): Promise<void> {}

  async createUser(user: UserRecord): Promise<UserRecord | null> {
    if (this.data.users.some((u) => u.nameKey === user.nameKey)) return null;
    this.data.users.push({ ...user });
    await this.persist();
    return { ...user };
  }

  async findUserByKey(nameKey: string): Promise<UserRecord | null> {
    const u = this.data.users.find((x) => x.nameKey === nameKey);
    return u ? { ...u } : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const u = this.data.users.find((x) => x.id === id);
    return u ? { ...u } : null;
  }

  async saveToken(hash: string, userId: string, expiresAt: number): Promise<void> {
    const now = Date.now();
    // Au passage, on oublie les jetons expirés.
    this.data.tokens = this.data.tokens.filter((t) => t.expiresAt > now);
    this.data.tokens.push({ hash, userId, expiresAt });
    await this.persist();
  }

  async findToken(hash: string, now: number): Promise<string | null> {
    const t = this.data.tokens.find((x) => x.hash === hash);
    return t && t.expiresAt > now ? t.userId : null;
  }

  async deleteToken(hash: string): Promise<void> {
    this.data.tokens = this.data.tokens.filter((t) => t.hash !== hash);
    await this.persist();
  }

  async listWords(): Promise<WordRecord[]> {
    return this.data.words.map((w) => ({ ...w }));
  }

  async addWords(words: WordRecord[]): Promise<WordRecord[]> {
    const added: WordRecord[] = [];
    for (const w of words) {
      if (this.data.words.some((x) => x.game === w.game && x.wordKey === w.wordKey)) continue;
      this.data.words.push({ ...w });
      added.push({ ...w });
    }
    if (added.length) await this.persist();
    return added;
  }

  async deleteWord(game: string, id: string): Promise<boolean> {
    const before = this.data.words.length;
    this.data.words = this.data.words.filter((w) => !(w.game === game && w.id === id));
    if (this.data.words.length === before) return false;
    await this.persist();
    return true;
  }
}

/**
 * Stockage dans un fichier JSON : idéal en local (`pnpm play`), sans base de données à installer.
 * Écriture atomique (fichier temporaire puis renommage) pour ne jamais corrompre les données.
 */
export class JsonFileStore extends MemoryStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {
    super();
  }

  override async init(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as Partial<Data>;
      this.data = { ...empty(), ...parsed };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      await mkdir(dirname(this.file), { recursive: true });
    }
  }

  protected override persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data);
    // Les écritures s'enchaînent dans l'ordre, sans se marcher dessus.
    this.queue = this.queue.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, 'utf8');
      await rename(tmp, this.file);
    });
    return this.queue;
  }

  override async close(): Promise<void> {
    await this.queue;
  }
}

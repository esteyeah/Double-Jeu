import { randomBytes } from 'node:crypto';
import { customWordSchema, wordKey, type ApiWord } from '@arcade/protocol';
import type { Store, WordRecord } from './store';

export interface AddWordsResult {
  added: ApiWord[];
  skipped: { word: string; reason: string }[];
}

/**
 * Mots ajoutés depuis le site, par jeu. Gardés en mémoire (lecture instantanée au
 * lancement d'une partie) et recopiés dans le stockage durable à chaque modification.
 */
export class WordBank {
  private readonly byGame = new Map<string, WordRecord[]>();
  private readonly baseKeys = new Map<string, Set<string>>();

  private constructor(
    private readonly store: Store,
    /** Jeux qui acceptent des mots, avec leur liste de base. */
    base: Record<string, readonly string[]>,
    existing: WordRecord[],
  ) {
    for (const [game, words] of Object.entries(base)) {
      this.baseKeys.set(game, new Set(words.map(wordKey)));
      this.byGame.set(game, []);
    }
    for (const w of existing) this.byGame.get(w.game)?.push(w);
  }

  static async load(store: Store, base: Record<string, readonly string[]>): Promise<WordBank> {
    return new WordBank(store, base, await store.listWords());
  }

  supports(game: string): boolean {
    return this.byGame.has(game);
  }

  baseCount(game: string): number {
    return this.baseKeys.get(game)?.size ?? 0;
  }

  list(game: string): ApiWord[] {
    return (this.byGame.get(game) ?? []).map((w) => ({ id: w.id, word: w.word, createdAt: w.createdAt }));
  }

  /** Les mots ajoutés, tels que le moteur du jeu les reçoit. */
  words(game: string): string[] {
    return (this.byGame.get(game) ?? []).map((w) => w.word);
  }

  async add(game: string, raw: string[], by: string): Promise<AddWordsResult> {
    const list = this.byGame.get(game);
    const base = this.baseKeys.get(game);
    if (!list || !base) return { added: [], skipped: raw.map((word) => ({ word, reason: 'Jeu inconnu.' })) };
    const skipped: AddWordsResult['skipped'] = [];
    const fresh: WordRecord[] = [];
    const seen = new Set(list.map((w) => w.wordKey));
    const now = Date.now();
    for (const input of raw) {
      if (!input.trim()) continue;
      const parsed = customWordSchema.safeParse(input);
      if (!parsed.success) {
        skipped.push({ word: input.trim(), reason: parsed.error.issues[0]?.message ?? 'Mot invalide.' });
        continue;
      }
      const key = wordKey(parsed.data);
      if (base.has(key)) skipped.push({ word: parsed.data, reason: 'Déjà dans la liste de base.' });
      else if (seen.has(key)) skipped.push({ word: parsed.data, reason: 'Déjà ajouté.' });
      else {
        seen.add(key);
        fresh.push({
          id: `w_${randomBytes(8).toString('base64url')}`,
          game,
          word: parsed.data,
          wordKey: key,
          createdBy: by,
          createdAt: now,
        });
      }
    }
    const added = fresh.length ? await this.store.addWords(fresh) : [];
    list.push(...added);
    return { added: added.map((w) => ({ id: w.id, word: w.word, createdAt: w.createdAt })), skipped };
  }

  async remove(game: string, id: string): Promise<boolean> {
    const list = this.byGame.get(game);
    if (!list || !(await this.store.deleteWord(game, id))) return false;
    this.byGame.set(
      game,
      list.filter((w) => w.id !== id),
    );
    return true;
  }
}

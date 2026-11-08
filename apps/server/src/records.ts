import { randomBytes } from 'node:crypto';
import type { RecordRow, Store } from './store';

/** Nombre de places au tableau, par record. */
export const RECORD_TOP = 10;

export interface RecordCandidate {
  game: string;
  key: string;
  value: number;
  detail?: string;
  names: string[];
  verified: boolean;
}

const better = (a: RecordRow, b: RecordRow) => b.value - a.value || a.createdAt - b.createdAt;

/**
 * Tableau des records : les meilleures performances de chaque jeu, gardées en mémoire
 * (lecture instantanée) et recopiées dans le stockage durable. À égalité, le premier arrivé garde sa place.
 */
export class RecordBook {
  private readonly lists = new Map<string, RecordRow[]>();

  private constructor(
    private readonly store: Store,
    rows: RecordRow[],
  ) {
    for (const row of rows) this.listFor(row.game, row.key).push(row);
    for (const list of this.lists.values()) list.sort(better);
  }

  static async load(store: Store): Promise<RecordBook> {
    return new RecordBook(store, await store.listRecords());
  }

  private listFor(game: string, key: string): RecordRow[] {
    const k = `${game}:${key}`;
    let list = this.lists.get(k);
    if (!list) this.lists.set(k, (list = []));
    return list;
  }

  top(game: string, key: string): RecordRow[] {
    return this.listFor(game, key).slice(0, RECORD_TOP);
  }

  /** Propose une performance ; renvoie sa place (1 = record absolu) ou null si elle n'entre pas au tableau. */
  async submit(c: RecordCandidate, now = Date.now()): Promise<number | null> {
    if (!Number.isFinite(c.value) || c.value <= 0 || c.names.length === 0) return null;
    const list = this.listFor(c.game, c.key);
    if (list.length >= RECORD_TOP && c.value <= list[RECORD_TOP - 1]!.value) return null;
    const row: RecordRow = {
      id: `r_${randomBytes(8).toString('base64url')}`,
      game: c.game,
      key: c.key,
      value: c.value,
      detail: c.detail ?? null,
      names: c.names.map((n) => n.slice(0, 40)),
      verified: c.verified,
      createdAt: now,
    };
    list.push(row);
    list.sort(better);
    const dropped = list.splice(RECORD_TOP);
    await this.store.addRecord(row);
    if (dropped.length) await this.store.deleteRecords(dropped.map((r) => r.id));
    return list.indexOf(row) + 1;
  }
}

import { join } from 'node:path';
import { JsonFileStore, MemoryStore } from './memory';
import { PostgresStore } from './postgres';
import type { Store } from './types';

export type { RecordRow, Store, UserRecord, WordRecord } from './types';
export { MemoryStore, JsonFileStore, PostgresStore };

/**
 * Choisit le stockage selon l'environnement :
 * - `DATABASE_URL` → PostgreSQL (production) ;
 * - sinon un fichier JSON dans `DATA_DIR` (par défaut `./data`), parfait en local.
 */
export function storeFromEnv(env: NodeJS.ProcessEnv = process.env): { store: Store; label: string } {
  if (env.DATABASE_URL) return { store: new PostgresStore(env.DATABASE_URL), label: 'PostgreSQL' };
  const file = join(env.DATA_DIR ?? join(process.cwd(), 'data'), 'arcade.json');
  return { store: new JsonFileStore(file), label: `fichier ${file}` };
}

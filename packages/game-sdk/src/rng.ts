import type { Rng } from './types';

function makeRng(int: (n: number) => number): Rng {
  return {
    int,
    shuffle<T>(items: readonly T[]): T[] {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [a[i], a[j]] = [a[j] as T, a[i] as T];
      }
      return a;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('pick() sur une liste vide');
      return items[int(items.length)] as T;
    },
  };
}

/** Hasard cryptographique (Node 22+ et navigateurs exposent `crypto.getRandomValues`). */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(1);
  const RANGE = 2 ** 32;
  return makeRng((n) => {
    if (!Number.isInteger(n) || n <= 0) throw new Error(`int(${n}) invalide`);
    // Échantillonnage par rejet : pas de biais modulo.
    const limit = RANGE - (RANGE % n);
    let x: number;
    do {
      globalThis.crypto.getRandomValues(buf);
      x = buf[0] as number;
    } while (x >= limit);
    return x % n;
  });
}

/** Hasard déterministe (mulberry32) pour les tests et les rejeux. */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return makeRng((n) => Math.floor(next() * n));
}

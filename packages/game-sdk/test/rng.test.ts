import { describe, expect, it } from 'vitest';
import { cryptoRng, seededRng } from '../src/rng';

describe('rng', () => {
  it('seededRng est déterministe', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect(Array.from({ length: 20 }, () => a.int(100))).toEqual(
      Array.from({ length: 20 }, () => b.int(100)),
    );
  });

  it('shuffle conserve les éléments', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const rng of [seededRng(1), cryptoRng()]) {
      expect(rng.shuffle(items).sort()).toEqual(items);
    }
  });

  it('cryptoRng reste dans les bornes et couvre toutes les valeurs', () => {
    const rng = cryptoRng();
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = rng.int(7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
      seen.add(x);
    }
    expect(seen.size).toBe(7);
  });
});

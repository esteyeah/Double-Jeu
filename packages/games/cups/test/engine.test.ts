import { describe, expect, it } from 'vitest';
import { applyDeadline, applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  REVEAL_MS,
  countFace,
  cups,
  isLegalBid,
  minQuantity,
  type CupsConfig,
  type CupsState,
  type Face,
} from '../src';

const players = (n: number, bots = false): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: bots }));
const CLASSIC: CupsConfig = { dice: 5, exact: true, dry: true };

function play(s: CupsState, by: string, move: unknown, now = 1000): CupsState {
  const out = applyMove(cups, s, by, move, seededRng(4), now);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: CupsState, by: string, move: unknown) => applyMove(cups, s, by, move, seededRng(4), 1000).ok;

/** Partie avec des dés imposés ; p0 ouvre. */
function table(dice: Face[][], config: CupsConfig = CLASSIC, bots = false): CupsState {
  const s = cups.setup(players(dice.length, bots), config, seededRng(1));
  s.dice = Object.fromEntries(dice.map((d, i) => [`p${i}`, d]));
  s.counts = Object.fromEntries(dice.map((d, i) => [`p${i}`, d.length]));
  s.starter = 'p0';
  s.active = 'p0';
  return s;
}

describe('Gobelets — règles des enchères', () => {
  it('les As sont jokers, sauf sur les As et en manche sèche', () => {
    const dice: Face[] = [1, 1, 5, 5, 3];
    expect(countFace(dice, 5, false)).toBe(4);
    expect(countFace(dice, 1, false)).toBe(2);
    expect(countFace(dice, 5, true)).toBe(2);
  });

  it('monter : plus de dés, ou autant d’une valeur plus forte', () => {
    const prev = { by: 'p0', quantity: 3, face: 4 as Face };
    expect(isLegalBid(prev, 3, 5, false, 20)).toBe(true);
    expect(isLegalBid(prev, 3, 3, false, 20)).toBe(false);
    expect(isLegalBid(prev, 4, 2, false, 20)).toBe(true);
    expect(isLegalBid(prev, 3, 4, false, 20)).toBe(false);
    expect(isLegalBid(prev, 21, 6, false, 20)).toBe(false);
  });

  it('vers les As : la moitié ; depuis les As : le double plus un ; pas d’ouverture sur les As', () => {
    expect(minQuantity({ by: 'p0', quantity: 5, face: 6 }, 1, false)).toBe(3);
    expect(minQuantity({ by: 'p0', quantity: 3, face: 1 }, 2, false)).toBe(7);
    expect(minQuantity({ by: 'p0', quantity: 3, face: 1 }, 1, false)).toBe(4);
    expect(minQuantity(null, 1, false)).toBeNull();
    expect(minQuantity(null, 1, true)).toBe(1);
  });

  it('manche sèche : la valeur ne change plus', () => {
    const prev = { by: 'p0', quantity: 2, face: 3 as Face };
    expect(minQuantity(prev, 3, true)).toBe(3);
    expect(minQuantity(prev, 6, true)).toBeNull();
    expect(minQuantity(prev, 1, true)).toBeNull();
  });
});

describe('Gobelets — secrets', () => {
  it('chacun ne voit que ses dés pendant la manche', () => {
    const s = cups.setup(players(4), CLASSIC, seededRng(9));
    const v = cups.view(s, 'p1');
    expect(v.me!.dice).toEqual(s.dice.p1);
    expect(v.reveal).toBeNull();
    const json = JSON.stringify({ ...v, me: null });
    expect(json).not.toContain(JSON.stringify(s.dice.p0));
    expect(json).not.toContain('"dice":[');
    expect(cups.view(s, null).me).toBeNull();
  });

  it('les dés de la manche terminée sont révélés à tous, pas ceux de la suivante', () => {
    let s = table([[2, 2, 3], [4, 5, 6]]);
    s = play(s, 'p0', { type: 'bid', quantity: 2, face: 2 });
    s = play(s, 'p1', { type: 'liar' });
    expect(cups.view(s, 'p1').reveal!.dice.p0).toEqual([2, 2, 3]);
    s = play(s, 'p1', { type: 'next' });
    const v = cups.view(s, 'p0');
    expect(v.reveal).toBeNull();
    expect(JSON.stringify({ ...v, me: null })).not.toContain(JSON.stringify(s.dice.p1));
  });
});

describe('Gobelets — Menteur et Pile', () => {
  it('ouverture sur les As refusée ; seul le joueur actif enchérit', () => {
    const s = table([[1, 2, 3], [4, 5, 6], [2, 2, 2]]);
    expect(ok(s, 'p0', { type: 'bid', quantity: 1, face: 1 })).toBe(false);
    expect(ok(s, 'p1', { type: 'bid', quantity: 1, face: 2 })).toBe(false);
    expect(ok(s, 'p0', { type: 'liar' })).toBe(false);
    const after = play(s, 'p0', { type: 'bid', quantity: 1, face: 2 });
    expect(after.active).toBe('p1');
  });

  it('« Menteur ! » à tort : celui qui crie perd un dé et ouvre la manche suivante', () => {
    let s = table([[1, 4, 4], [4, 6, 6], [2, 3, 5]]);
    s = play(s, 'p0', { type: 'bid', quantity: 4, face: 4 }); // 4, 4, 4 et l'As : il y en a 4
    s = play(s, 'p1', { type: 'liar' }, 5000);
    expect(s.reveal).toMatchObject({ count: 4, loser: 'p1', call: 'liar' });
    expect(s.counts.p1).toBe(2);
    expect(s.phase).toBe('reveal');
    expect(s.starter).toBe('p1');
    expect(s.revealUntil).toBe(5000 + REVEAL_MS);
    expect(ok(s, 'p0', { type: 'next' })).toBe(false);
    s = play(s, 'p1', { type: 'next' });
    expect(s.phase).toBe('bid');
    expect(s.active).toBe('p1');
    expect(s.dice.p1).toHaveLength(2);
    expect(s.round).toBe(2);
  });

  it('« Menteur ! » à raison : l’enchérisseur perd un dé', () => {
    let s = table([[2, 3, 4], [5, 6, 6], [2, 3, 5]]);
    s = play(s, 'p0', { type: 'bid', quantity: 3, face: 6 });
    s = play(s, 'p1', { type: 'liar' });
    expect(s.reveal).toMatchObject({ count: 2, loser: 'p0' });
    expect(s.counts.p0).toBe(2);
    expect(s.starter).toBe('p0');
  });

  it('« Pile ! » réussi : on regagne un dé (sans dépasser le départ)', () => {
    let s = table([[2, 2], [2, 6, 6, 6, 6], [1, 3, 5]]);
    s = play(s, 'p0', { type: 'bid', quantity: 3, face: 6 });
    s = play(s, 'p1', { type: 'bid', quantity: 4, face: 2 }); // 2, 2, 2 et l'As
    s = play(s, 'p2', { type: 'exact' });
    expect(s.reveal).toMatchObject({ count: 4, gainer: 'p2', loser: null });
    expect(s.counts.p2).toBe(4);
    expect(s.starter).toBe('p2');
  });

  it('« Pile ! » raté : un dé de perdu ; variante désactivable', () => {
    let s = table([[2, 2, 2], [6, 6, 6], [3, 3, 3]]);
    s = play(s, 'p0', { type: 'bid', quantity: 2, face: 6 });
    s = play(s, 'p1', { type: 'exact' });
    expect(s.reveal).toMatchObject({ count: 3, loser: 'p1' });
    const off = play(table([[2], [3]], { ...CLASSIC, exact: false }), 'p0', { type: 'bid', quantity: 1, face: 2 });
    expect(ok(off, 'p1', { type: 'exact' })).toBe(false);
  });

  it('tomber au dernier dé déclenche une manche sèche (une fois par joueur)', () => {
    let s = table([[2, 3], [4, 5, 6], [2, 3, 5]]);
    s = play(s, 'p0', { type: 'bid', quantity: 3, face: 6 });
    s = play(s, 'p1', { type: 'liar' });
    expect(s.counts.p0).toBe(1);
    expect(s.nextDry).toBe(true);
    s = play(s, 'p0', { type: 'next' });
    expect(s.dry).toBe(true);
    // En manche sèche on peut ouvrir sur les As, puis la valeur ne change plus.
    expect(ok(s, 'p0', { type: 'bid', quantity: 1, face: 1 })).toBe(true);
    s = play(s, 'p0', { type: 'bid', quantity: 1, face: 4 });
    expect(ok(s, 'p1', { type: 'bid', quantity: 2, face: 5 })).toBe(false);
    expect(ok(s, 'p1', { type: 'bid', quantity: 2, face: 4 })).toBe(true);
    const noDry = play(play(table([[2, 3], [4, 5, 6], [2, 3, 5]], { ...CLASSIC, dry: false }), 'p0', { type: 'bid', quantity: 3, face: 6 }), 'p1', { type: 'liar' });
    expect(noDry.nextDry).toBe(false);
  });

  it('sans dé, on est éliminé ; le dernier en jeu gagne', () => {
    let s = table([[2], [6, 6], [3]]);
    s = play(s, 'p0', { type: 'bid', quantity: 2, face: 5 });
    s = play(s, 'p1', { type: 'liar' });
    expect(s.counts.p0).toBe(0);
    expect(s.starter).toBe('p1'); // le perdant est éliminé : le suivant ouvre
    s = play(s, 'p1', { type: 'next' });
    expect(Object.keys(s.dice).sort()).toEqual(['p1', 'p2']);
    expect(ok(s, 'p0', { type: 'bid', quantity: 1, face: 2 })).toBe(false);
    s.dice = { p1: [6, 6], p2: [3] };
    s = play(s, 'p1', { type: 'bid', quantity: 3, face: 6 });
    s = play(s, 'p2', { type: 'liar' });
    s = play(s, 'p1', { type: 'next' });
    s.dice = { p1: [6], p2: [3] };
    s = play(s, 'p1', { type: 'bid', quantity: 1, face: 3 });
    s = play(s, 'p2', { type: 'liar' });
    expect(s.phase).toBe('over');
    expect(cups.result(s)?.winners).toEqual(['p1']);
  });

  it('quand un bot relance, la manche suivante démarre seule après la révélation', () => {
    let s = table([[2, 3], [4, 5, 6]], CLASSIC, true);
    s = play(s, 'p0', { type: 'bid', quantity: 1, face: 6 });
    s = play(s, 'p1', { type: 'liar' }, 2000);
    expect(cups.deadline!(s)).toBe(2000 + REVEAL_MS);
    s = applyDeadline(cups, s, seededRng(2), 2000 + REVEAL_MS) as CupsState;
    expect(s.phase).toBe('bid');
  });
});

describe('Gobelets — robustesse', () => {
  it.each([2, 3, 4, 6, 8])('150 parties de bots à %i joueurs se terminent sans avantage de place', (n) => {
    const wins: number[] = Array(n).fill(0);
    for (let seed = 0; seed < 150; seed++) {
      const config: CupsConfig = { dice: ([5, 4, 3] as const)[seed % 3]!, exact: seed % 2 === 0, dry: seed % 4 < 2 };
      const { state } = simulate<CupsState>(cups, players(n, true), seededRng(seed * 17 + n), { config });
      expect(state.phase).toBe('over');
      wins[Number(state.winner!.slice(1))]!++;
    }
    for (const w of wins) expect(w).toBeGreaterThan(150 / n / 3);
  }, 60_000);
});

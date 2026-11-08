import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, type PlayerInfo } from '@arcade/game-sdk';
import { wordKey } from '@arcade/protocol';
import {
  BASE_WORDS,
  PERFECT,
  SLOTS,
  WINDS,
  compass,
  pairFor,
  wordPool,
  type CompassConfig,
  type CompassState,
  type Rot,
} from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));
const CLASSIC: CompassConfig = { decoys: 1 };
const CLUES = ['nordique', 'oriental', 'austral', 'couchant'] as const;

function play(s: CompassState, by: string, move: unknown): CompassState {
  const out = applyMove(compass, s, by, move, seededRng(4), 1000);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: CompassState, by: string, move: unknown) => applyMove(compass, s, by, move, seededRng(4), 1000).ok;

/** Tout le monde écrit ses indices : on arrive à la première reconstitution. */
function written(n = 3, config = CLASSIC): CompassState {
  let s = compass.setup(players(n), config, seededRng(n));
  for (const p of s.players) s = play(s, p.id, { type: 'clues', clues: CLUES });
  return s;
}
const owner = (s: CompassState) => s.order[s.index]!;
const guesser = (s: CompassState) => s.players.find((p) => p.id !== owner(s))!.id;

/** Pose la solution exacte (cartes et orientations) sur les emplacements `slots`. */
function placeSolution(s: CompassState, slots = SLOTS): CompassState {
  const sol = s.boards[owner(s)]!.solution;
  const by = guesser(s);
  for (const slot of slots) {
    const { card, rot } = sol[slot]!;
    s = play(s, by, { type: 'place', card, slot });
    while (s.guess!.rotations[card] !== rot) s = play(s, by, { type: 'rotate', card });
  }
  return s;
}

describe('Boussole — mise en place', () => {
  it('liste de base : plus de 500 mots, sans doublon', () => {
    const pool = wordPool();
    expect(pool.length).toBe(BASE_WORDS.length);
    expect(pool.length).toBeGreaterThan(500);
  });

  it('les mots ajoutés depuis le site rejoignent la pioche (sans doublon)', () => {
    const pool = wordPool(['fusée', 'Plage', 'grand huit']);
    expect(pool).toContain('fusée');
    expect(pool).toContain('grand huit');
    expect(pool.filter((w) => wordKey(w) === 'plage')).toHaveLength(1);
    // Les mots ajoutés peuvent vraiment sortir en partie.
    const s = compass.setup(players(2), CLASSIC, seededRng(1), { words: Array.from({ length: 600 }, (_, i) => `ajout${i}`) });
    const words = Object.values(s.boards).flatMap((b) => b.cards.flatMap((c) => c.words));
    expect(words.some((w) => w.startsWith('ajout'))).toBe(true);
  });

  it.each([2, 4, 6])('à %i joueurs : 4 cartes + leurres de 4 mots, tous différents', (n) => {
    for (const decoys of [1, 2] as const) {
      const s = compass.setup(players(n), { decoys }, seededRng(n + decoys));
      const all = Object.values(s.boards).flatMap((b) => b.cards.flatMap((c) => c.words));
      expect(new Set(all.map(wordKey)).size).toBe(all.length);
      for (const b of Object.values(s.boards)) {
        expect(b.cards).toHaveLength(4 + decoys);
        expect(new Set(b.solution.map((p) => p.card)).size).toBe(4);
      }
    }
  });

  it('les identifiants des cartes ne trahissent pas leur emplacement', () => {
    const positions: number[][] = [[], [], [], []];
    for (let seed = 0; seed < 200; seed++) {
      const s = compass.setup(players(2), CLASSIC, seededRng(seed));
      s.boards.p0!.solution.forEach((p, slot) => positions[slot]!.push(p.card));
    }
    for (const ids of positions) expect(new Set(ids).size).toBe(5);
  });
});

describe('Boussole — indices et secrets', () => {
  it('chacun ne voit que sa boussole pendant l’écriture', () => {
    const s = compass.setup(players(3), CLASSIC, seededRng(2));
    const v = compass.view(s, 'p1');
    expect(v.mine!.cards).toEqual(s.boards.p1!.cards);
    expect(v.current).toBeNull();
    const others = JSON.stringify({ ...v, mine: null });
    for (const w of s.boards.p0!.cards.flatMap((c) => c.words)) expect(others).not.toContain(`"${w}"`);
    expect(compass.view(s, null).mine).toBeNull();
  });

  it('un seul mot par indice, et aucun mot de ses cartes', () => {
    const s = compass.setup(players(2), CLASSIC, seededRng(3));
    const b = s.boards.p0!;
    const [a] = pairFor(b.cards, b.solution, 0);
    expect(ok(s, 'p0', { type: 'clues', clues: ['deux mots', 'b', 'c', 'd'] })).toBe(false);
    expect(ok(s, 'p0', { type: 'clues', clues: [a.toUpperCase(), 'b', 'c', 'd'] })).toBe(false);
    expect(ok(s, 'p0', { type: 'clues', clues: ['arc-en-ciel', 'b', 'c', 'd'] })).toBe(true);
    const after = play(s, 'p0', { type: 'clues', clues: CLUES });
    expect(ok(after, 'p0', { type: 'clues', clues: CLUES })).toBe(false);
  });

  it('pendant la reconstitution, la solution est cachée aux devineurs (mais pas à l’auteur)', () => {
    const s = written();
    const v = compass.view(s, guesser(s));
    expect(v.current!.solution).toBeNull();
    expect(v.current!.clues).toEqual(CLUES);
    expect(compass.view(s, owner(s)).current!.solution).toEqual(s.boards[owner(s)]!.solution);
    // L'auteur ne touche à rien.
    expect(ok(s, owner(s), { type: 'rotate', card: 0 })).toBe(false);
  });
});

describe('Boussole — reconstitution', () => {
  it('tout juste du premier coup : 6 points', () => {
    let s = written();
    expect(ok(s, guesser(s), { type: 'submit' })).toBe(false);
    s = placeSolution(s);
    s = play(s, guesser(s), { type: 'submit' });
    expect(s.phase).toBe('reveal');
    expect(s.boards[owner(s)]!.score).toBe(PERFECT);
    expect(compass.view(s, guesser(s)).current!.solution).not.toBeNull();
  });

  it('second essai : les bonnes cartes restent, 1 point par carte bien placée', () => {
    let s = placeSolution(written(), [0, 1]);
    const board = s.boards[owner(s)]!;
    const decoy = board.cards.find((c) => !board.solution.some((p) => p.card === c.id))!.id;
    const by = guesser(s);
    // Emplacement 2 : le leurre ; emplacement 3 : la bonne carte mais mal tournée.
    s = play(s, by, { type: 'place', card: decoy, slot: 2 });
    const third = board.solution[3]!;
    s = play(s, by, { type: 'place', card: third.card, slot: 3 });
    while (s.guess!.rotations[third.card] !== (((third.rot + 1) % 4) as Rot)) s = play(s, by, { type: 'rotate', card: third.card });
    s = play(s, by, { type: 'submit' });
    expect(s.guess!.attempt).toBe(2);
    expect(s.guess!.locked).toEqual([true, true, false, false]);
    expect(s.guess!.board).toEqual([board.solution[0]!.card, board.solution[1]!.card, null, null]);
    // Les cartes validées ne bougent plus.
    expect(ok(s, by, { type: 'clear', slot: 0 })).toBe(false);
    expect(ok(s, by, { type: 'rotate', card: board.solution[0]!.card })).toBe(false);
    // Second essai : on corrige la carte tournée, le leurre reste faux.
    s = play(s, by, { type: 'place', card: decoy, slot: 2 });
    s = play(s, by, { type: 'place', card: third.card, slot: 3 });
    while (s.guess!.rotations[third.card] !== third.rot) s = play(s, by, { type: 'rotate', card: third.card });
    s = play(s, by, { type: 'submit' });
    expect(s.phase).toBe('reveal');
    expect(s.boards[owner(s)]!.score).toBe(3);
  });

  it('poser une carte la déplace ; la carte déjà en place retourne au paquet', () => {
    let s = written();
    const by = guesser(s);
    s = play(s, by, { type: 'place', card: 0, slot: 0 });
    s = play(s, by, { type: 'place', card: 0, slot: 1 });
    expect(s.guess!.board).toEqual([null, 0, null, null]);
    s = play(s, by, { type: 'place', card: 1, slot: 1 });
    expect(s.guess!.board).toEqual([null, 1, null, null]);
    s = play(s, by, { type: 'clear', slot: 1 });
    expect(s.guess!.board).toEqual([null, null, null, null]);
  });

  it('toutes les boussoles passent, puis score d’équipe', () => {
    let s = written(3);
    for (let i = 0; i < 3; i++) {
      s = placeSolution(s);
      s = play(s, guesser(s), { type: 'submit' });
      s = play(s, s.players[0]!.id, { type: 'next' });
    }
    expect(s.phase).toBe('over');
    expect(compass.result(s)).toMatchObject({ title: `Score de l’équipe : 18 / 18`, winners: ['p0', 'p1', 'p2'] });
  });

  it('chaque indice relie bien les deux mots extérieurs voisins', () => {
    const s = compass.setup(players(2), CLASSIC, seededRng(8));
    const b = s.boards.p0!;
    const pairs = WINDS.map((w) => pairFor(b.cards, b.solution, w));
    const outer = b.solution.map((p, slot) => {
      const card = b.cards.find((c) => c.id === p.card)!;
      const sides = [[0, 3], [0, 1], [1, 2], [2, 3]][slot]!;
      return sides.map((side) => card.words[(side - p.rot + 4) % 4]);
    });
    expect(new Set(pairs.flat())).toEqual(new Set(outer.flat()));
  });
});

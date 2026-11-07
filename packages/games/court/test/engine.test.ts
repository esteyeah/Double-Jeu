import { describe, expect, it } from 'vitest';
import { applyDeadline, applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import { court, type Character, type CourtState } from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));

function play(s: CourtState, by: string, move: unknown, now = 1_000): CourtState {
  const out = applyMove(court, s, by, move, seededRng(5), now);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: CourtState, by: string, move: unknown) => applyMove(court, s, by, move, seededRng(5), 1_000).ok;

/** Partie à mains imposées ; p0 commence. */
function table(hands: Character[][], coins?: number[]): CourtState {
  const s = court.setup(players(hands.length), { reaction: 20 }, seededRng(1));
  const all = hands.flat();
  // Pioche : le reste des 15 cartes, pour garder un total cohérent.
  const deck: Character[] = (['banker', 'swordsman', 'corsair', 'envoy', 'guard'] as Character[]).flatMap((c) =>
    Array<Character>(3 - all.filter((x) => x === c).length).fill(c),
  );
  hands.forEach((h, i) => {
    s.seats[`p${i}`] = { cards: [...h], revealed: [], coins: coins?.[i] ?? 2 };
  });
  s.deck = deck;
  s.turn = 0;
  s.active = 'p0';
  return s;
}

const passAll = (s: CourtState) => {
  for (const id of court.expectedActors(s)) s = play(s, id, { type: 'pass' });
  return s;
};
const total = (s: CourtState) =>
  s.deck.length +
  Object.values(s.seats).reduce((n, seat) => n + seat.cards.length + seat.revealed.length, 0) +
  (s.exchange ? s.exchange.length - s.seats[s.active]!.cards.length : 0);

describe('Faux Jetons — mise en place et secrets', () => {
  it.each([2, 3, 6])('distribue 2 influences et des ducats à %i joueurs, 15 cartes en tout', (n) => {
    const s = court.setup(players(n), { reaction: 20 }, seededRng(n));
    expect(total(s)).toBe(15);
    for (const seat of Object.values(s.seats)) expect(seat.cards).toHaveLength(2);
    const coins = Object.values(s.seats).map((x) => x.coins);
    if (n === 2) expect(coins.sort()).toEqual([1, 2]);
    else expect(coins.every((c) => c === 2)).toBe(true);
  });

  it('un joueur ne voit que ses propres personnages', () => {
    const s = table([['banker', 'guard'], ['swordsman', 'corsair'], ['envoy', 'envoy']]);
    const v = court.view(s, 'p1');
    expect(v.me!.hand).toEqual(['swordsman', 'corsair']);
    expect(JSON.stringify({ ...v, me: null })).not.toMatch(/"(banker|swordsman|corsair|envoy|guard)"/);
    expect(v.players.find((p) => p.id === 'p0')!.influence).toBe(2);
  });
});

describe('Faux Jetons — actions et contres', () => {
  it('Revenu : +1, sans fenêtre de réaction', () => {
    let s = table([['banker', 'guard'], ['swordsman', 'corsair']]);
    s = play(s, 'p0', { type: 'act', kind: 'income' });
    expect(s.seats.p0!.coins).toBe(3);
    expect(s.active).toBe('p1');
  });

  it('Faveur : contrable par n’importe qui avec le Banquier ; un contre non contesté tient', () => {
    let s = table([['guard', 'guard'], ['swordsman', 'corsair'], ['envoy', 'corsair']]);
    s = play(s, 'p0', { type: 'act', kind: 'favor' });
    expect(s.phase).toBe('block');
    expect(court.expectedActors(s).sort()).toEqual(['p1', 'p2']);
    expect(ok(s, 'p1', { type: 'block', claim: 'guard' })).toBe(false);
    s = play(s, 'p2', { type: 'block', claim: 'banker' });
    expect(s.phase).toBe('challengeBlock');
    s = passAll(s);
    expect(s.seats.p0!.coins).toBe(2);
    expect(s.active).toBe('p1');
  });

  it('contestation gagnée : le bluffeur perd une influence (au choix) et n’a rien', () => {
    let s = table([['guard', 'corsair'], ['swordsman', 'envoy']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' });
    s = play(s, 'p1', { type: 'challenge' });
    expect(s.phase).toBe('loss');
    expect(court.expectedActors(s)).toEqual(['p0']);
    s = play(s, 'p0', { type: 'lose', card: 'corsair' });
    expect(s.seats.p0).toMatchObject({ cards: ['guard'], revealed: ['corsair'], coins: 2 });
    expect(s.active).toBe('p1');
  });

  it('contestation perdue : l’annonceur montre la carte, en change, et l’action passe', () => {
    let s = table([['banker', 'guard'], ['swordsman', 'envoy']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' });
    s = play(s, 'p1', { type: 'challenge' });
    expect(s.seats.p0!.cards).toHaveLength(2);
    expect(s.phase).toBe('loss');
    s = play(s, 'p1', { type: 'lose', card: 'envoy' });
    expect(s.seats.p0!.coins).toBe(5);
    expect(total(s)).toBe(15);
  });

  it('Assassinat payé ; contre bluffé démasqué : la cible perd DEUX influences', () => {
    let s = table([['swordsman', 'banker'], ['corsair', 'envoy'], ['guard', 'banker']], [3, 2, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'assassinate', target: 'p1' });
    expect(s.seats.p0!.coins).toBe(0);
    s = passAll(s); // personne ne conteste le Spadassin
    expect(s.phase).toBe('block');
    expect(court.expectedActors(s)).toEqual(['p1']); // seule la cible peut contrer
    s = play(s, 'p1', { type: 'block', claim: 'guard' });
    s = play(s, 'p0', { type: 'challenge' });
    s = play(s, 'p1', { type: 'lose', card: 'corsair' });
    expect(s.seats.p1!.cards).toEqual([]);
    expect(s.seats.p1!.revealed.sort()).toEqual(['corsair', 'envoy']);
  });

  it('Assassinat bluffé et démasqué : les ducats sont rendus', () => {
    let s = table([['banker', 'banker'], ['corsair', 'envoy']], [3, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'assassinate', target: 'p1' });
    s = play(s, 'p1', { type: 'challenge' });
    s = play(s, 'p0', { type: 'lose', card: 'banker' });
    expect(s.seats.p0!.coins).toBe(3);
    expect(s.seats.p1!.cards).toHaveLength(2);
  });

  it('Racket : seule la cible contre ; vole au plus 2 ducats', () => {
    let s = table([['corsair', 'banker'], ['guard', 'guard'], ['envoy', 'banker']], [2, 1, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'racket', target: 'p1' });
    s = passAll(s);
    expect(court.expectedActors(s)).toEqual(['p1']);
    s = play(s, 'p1', { type: 'pass' });
    expect(s.seats.p0!.coins).toBe(3);
    expect(s.seats.p1!.coins).toBe(0);
  });

  it('Échange : on garde autant de personnages qu’avant, la pioche reste complète', () => {
    let s = table([['envoy', 'guard'], ['swordsman', 'corsair']]);
    s = play(s, 'p0', { type: 'act', kind: 'exchange' });
    s = passAll(s);
    expect(s.phase).toBe('exchange');
    const pool = court.view(s, 'p0').me!.exchange!;
    expect(pool).toHaveLength(4);
    expect(court.view(s, 'p1').me!.exchange).toBeNull();
    expect(ok(s, 'p0', { type: 'keep', cards: [pool[0]!] })).toBe(false);
    s = play(s, 'p0', { type: 'keep', cards: [pool[2]!, pool[3]!] });
    expect(s.seats.p0!.cards).toEqual([pool[2], pool[3]]);
    expect(total(s)).toBe(15);
  });

  it('Conspiration obligatoire dès 10 ducats, imparable', () => {
    let s = table([['banker', 'guard'], ['swordsman', 'corsair']], [10, 2]);
    expect(ok(s, 'p0', { type: 'act', kind: 'tax' })).toBe(false);
    s = play(s, 'p0', { type: 'act', kind: 'conspiracy', target: 'p1' });
    expect(s.phase).toBe('loss');
    s = play(s, 'p1', { type: 'lose', card: 'corsair' });
    expect(s.seats.p0!.coins).toBe(3);
  });

  it('fin du délai : tout le monde laisse passer', () => {
    let s = table([['guard', 'guard'], ['swordsman', 'corsair']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' }, 1_000);
    expect(court.deadline!(s)).toBe(21_000);
    s = applyDeadline(court, s, seededRng(1), 21_000)!;
    expect(s.seats.p0!.coins).toBe(5);
    expect(s.active).toBe('p1');
  });

  it('dernier en lice : victoire', () => {
    let s = table([['swordsman', 'banker'], ['guard', 'envoy']], [7, 0]);
    s.seats.p1!.cards = ['guard'];
    s.seats.p1!.revealed = ['envoy'];
    s = play(s, 'p0', { type: 'act', kind: 'conspiracy', target: 'p1' });
    expect(s.phase).toBe('over');
    expect(court.result(s)?.winners).toEqual(['p0']);
  });
});

describe('Faux Jetons — robustesse', () => {
  it.each([2, 3, 4, 5, 6])('400 parties de bots à %i joueurs, 15 cartes toujours comptées', (n) => {
    for (let seed = 0; seed < 400; seed++) {
      const { state } = simulate<CourtState>(court, players(n), seededRng(seed * 17 + n), {
        config: { reaction: 20 },
        onStep: (s) => expect(total(s)).toBe(15),
      });
      expect(state.phase).toBe('over');
      expect(state.winner).not.toBeNull();
    }
  }, 60_000);
});

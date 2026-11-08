import { describe, expect, it } from 'vitest';
import { applyDeadline, applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  CHARACTERS,
  CLASSIC_COURT,
  court,
  courtConfigSchema,
  type Character,
  type CourtConfig,
  type CourtState,
} from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));
const CLASSIC: CourtConfig = { reaction: 20, characters: CLASSIC_COURT };
const FULL: CourtConfig = { reaction: 20, characters: [...CHARACTERS] };

function play(s: CourtState, by: string, move: unknown, now = 1_000): CourtState {
  const out = applyMove(court, s, by, move, seededRng(5), now);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: CourtState, by: string, move: unknown) => applyMove(court, s, by, move, seededRng(5), 1_000).ok;

/** Partie à mains imposées ; p0 commence. La pioche complète la cour à 3 exemplaires par personnage. */
function table(hands: Character[][], coins?: number[], config: CourtConfig = CLASSIC): CourtState {
  const s = court.setup(players(hands.length), config, seededRng(1));
  const all = hands.flat();
  s.deck = config.characters.flatMap((c) => Array<Character>(3 - all.filter((x) => x === c).length).fill(c));
  hands.forEach((h, i) => {
    s.seats[`p${i}`] = { cards: [...h], revealed: [], coins: coins?.[i] ?? 2, escorted: false };
  });
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

describe('La Cité — mise en place, composition et secrets', () => {
  it.each([2, 3, 6])('cour classique : 2 influences, 15 cartes en tout à %i joueurs', (n) => {
    const s = court.setup(players(n), CLASSIC, seededRng(n));
    expect(total(s)).toBe(15);
    for (const seat of Object.values(s.seats)) expect(seat.cards).toHaveLength(2);
    const coins = Object.values(s.seats).map((x) => x.coins);
    if (n === 2) expect(coins.sort()).toEqual([1, 2]);
    else expect(coins.every((c) => c === 2)).toBe(true);
  });

  it('cour complète : 7 personnages, 21 cartes', () => {
    const s = court.setup(players(6), FULL, seededRng(3));
    expect(total(s)).toBe(21);
  });

  it('chaque personnage est optionnel (au moins 2, sans doublon)', () => {
    expect(courtConfigSchema.safeParse({ reaction: 20, characters: ['banker'] }).success).toBe(false);
    expect(courtConfigSchema.safeParse({ reaction: 20, characters: ['banker', 'banker'] }).success).toBe(false);
    expect(courtConfigSchema.safeParse({ reaction: 20, characters: ['banker', 'guard'] }).success).toBe(true);
    expect(courtConfigSchema.safeParse(FULL).success).toBe(true);
  });

  it('au lancement, il faut assez de personnages pour le nombre de joueurs', () => {
    const cfg = (characters: Character[]): CourtConfig => ({ reaction: 20, characters });
    expect(court.canStart!(2, cfg(['banker', 'guard']))).toBeNull(); // 6 cartes pour 4 + 2
    expect(court.canStart!(4, cfg(['banker', 'guard', 'brigand']))).toMatch(/au moins 4/);
    expect(court.canStart!(6, cfg(CLASSIC_COURT.slice(0, 4)))).toMatch(/au moins 5/);
    expect(court.canStart!(6, CLASSIC)).toBeNull();
  });

  it('on ne peut pas annoncer un personnage absent de la cour', () => {
    const s = table([['banker', 'guard'], ['executioner', 'brigand']]);
    expect(ok(s, 'p0', { type: 'act', kind: 'snoop', target: 'p1' })).toBe(false);
    expect(ok(s, 'p0', { type: 'act', kind: 'escort' })).toBe(false);
  });

  it('sans Garde à la cour, l’Exécution ne peut pas être contrée', () => {
    const config: CourtConfig = { reaction: 20, characters: ['banker', 'executioner', 'brigand', 'envoy', 'informer'] };
    let s = table([['executioner', 'banker'], ['brigand', 'envoy']], [3, 2], config);
    s = play(s, 'p0', { type: 'act', kind: 'execute', target: 'p1' });
    s = passAll(s); // fenêtre de contestation
    expect(s.phase).toBe('loss'); // pas de fenêtre de contre : on passe à la perte
  });

  it('un joueur ne voit que ses propres personnages', () => {
    const s = table([['banker', 'guard'], ['executioner', 'brigand'], ['envoy', 'envoy']]);
    const v = court.view(s, 'p1');
    expect(v.me!.hand).toEqual(['executioner', 'brigand']);
    expect(JSON.stringify({ ...v, me: null, config: null })).not.toMatch(/"(banker|executioner|brigand|envoy|guard|informer|mercenary)"/);
  });
});

describe('La Cité — actions et contres', () => {
  it('Revenu : +1, sans fenêtre de réaction', () => {
    let s = table([['banker', 'guard'], ['executioner', 'brigand']]);
    s = play(s, 'p0', { type: 'act', kind: 'income' });
    expect(s.seats.p0!.coins).toBe(3);
    expect(s.active).toBe('p1');
  });

  it('Faveur : contrable par n’importe qui avec le Banquier ; un contre non contesté tient', () => {
    let s = table([['guard', 'guard'], ['executioner', 'brigand'], ['envoy', 'brigand']]);
    s = play(s, 'p0', { type: 'act', kind: 'favor' });
    expect(court.expectedActors(s).sort()).toEqual(['p1', 'p2']);
    expect(ok(s, 'p1', { type: 'block', claim: 'guard' })).toBe(false);
    s = play(s, 'p2', { type: 'block', claim: 'banker' });
    s = passAll(s);
    expect(s.seats.p0!.coins).toBe(2);
  });

  it('contestation gagnée : le bluffeur perd une influence et n’a rien', () => {
    let s = table([['guard', 'brigand'], ['executioner', 'envoy']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' });
    s = play(s, 'p1', { type: 'challenge' });
    s = play(s, 'p0', { type: 'lose', card: 'brigand' });
    expect(s.seats.p0).toMatchObject({ cards: ['guard'], revealed: ['brigand'], coins: 2 });
  });

  it('contestation perdue : l’annonceur montre la carte, en change, et l’action passe', () => {
    let s = table([['banker', 'guard'], ['executioner', 'envoy']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' });
    s = play(s, 'p1', { type: 'challenge' });
    s = play(s, 'p1', { type: 'lose', card: 'envoy' });
    expect(s.seats.p0!.coins).toBe(5);
    expect(total(s)).toBe(15);
  });

  it('Exécution payée ; contre bluffé démasqué : la cible perd DEUX influences', () => {
    let s = table([['executioner', 'banker'], ['brigand', 'envoy'], ['guard', 'banker']], [3, 2, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'execute', target: 'p1' });
    expect(s.seats.p0!.coins).toBe(0);
    s = passAll(s);
    expect(court.expectedActors(s)).toEqual(['p1']);
    s = play(s, 'p1', { type: 'block', claim: 'guard' });
    s = play(s, 'p0', { type: 'challenge' });
    s = play(s, 'p1', { type: 'lose', card: 'brigand' });
    expect(s.seats.p1!.cards).toEqual([]);
  });

  it('Exécution bluffée et démasquée : les écus sont rendus', () => {
    let s = table([['banker', 'banker'], ['brigand', 'envoy']], [3, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'execute', target: 'p1' });
    s = play(s, 'p1', { type: 'challenge' });
    s = play(s, 'p0', { type: 'lose', card: 'banker' });
    expect(s.seats.p0!.coins).toBe(3);
  });

  it('Racket du Brigand : seule la cible contre ; vole au plus 2 écus', () => {
    let s = table([['brigand', 'banker'], ['guard', 'guard'], ['envoy', 'banker']], [2, 1, 2]);
    s = play(s, 'p0', { type: 'act', kind: 'racket', target: 'p1' });
    s = passAll(s);
    expect(court.expectedActors(s)).toEqual(['p1']);
    s = play(s, 'p1', { type: 'pass' });
    expect([s.seats.p0!.coins, s.seats.p1!.coins]).toEqual([3, 0]);
  });

  it('Échange : on garde autant de personnages qu’avant', () => {
    let s = table([['envoy', 'guard'], ['executioner', 'brigand']]);
    s = play(s, 'p0', { type: 'act', kind: 'exchange' });
    s = passAll(s);
    const pool = court.view(s, 'p0').me!.exchange!;
    expect(pool).toHaveLength(4);
    expect(ok(s, 'p0', { type: 'keep', cards: [pool[0]!] })).toBe(false);
    s = play(s, 'p0', { type: 'keep', cards: [pool[2]!, pool[3]!] });
    expect(total(s)).toBe(15);
  });

  it('Conspiration obligatoire dès 10 écus, imparable', () => {
    let s = table([['banker', 'guard'], ['executioner', 'brigand']], [10, 2]);
    expect(ok(s, 'p0', { type: 'act', kind: 'tax' })).toBe(false);
    s = play(s, 'p0', { type: 'act', kind: 'conspiracy', target: 'p1' });
    s = play(s, 'p1', { type: 'lose', card: 'brigand' });
    expect(s.seats.p0!.coins).toBe(3);
  });

  it('fin du délai : tout le monde laisse passer', () => {
    let s = table([['guard', 'guard'], ['executioner', 'brigand']]);
    s = play(s, 'p0', { type: 'act', kind: 'tax' }, 1_000);
    s = applyDeadline(court, s, seededRng(1), 21_000)!;
    expect(s.seats.p0!.coins).toBe(5);
  });
});

describe('La Cité — Mouchard et Mercenaire', () => {
  it('Espionnage : la cible choisit la carte, seul le Mouchard la voit', () => {
    let s = table([['informer', 'guard'], ['executioner', 'brigand'], ['banker', 'envoy']], undefined, FULL);
    s = play(s, 'p0', { type: 'act', kind: 'snoop', target: 'p1' });
    s = passAll(s);
    expect(s.phase).toBe('show');
    expect(court.expectedActors(s)).toEqual(['p1']);
    s = play(s, 'p1', { type: 'show', card: 'brigand' });
    expect(s.phase).toBe('peek');
    expect(court.view(s, 'p0').me!.intel).toEqual([{ target: 'p1', card: 'brigand' }]);
    expect(court.view(s, 'p2').me!.intel).toEqual([]);
    expect(court.view(s, 'p2').log.join(' ')).not.toMatch(/Brigand/);
    expect(s.seats.p1!.cards).toEqual(['executioner', 'brigand']); // la carte reste en main
    s = play(s, 'p0', { type: 'seen' });
    expect(s.active).toBe('p1');
  });

  it('Espionnage d’un joueur à une seule influence : elle est montrée d’office', () => {
    let s = table([['informer', 'guard'], ['executioner', 'brigand']], undefined, FULL);
    s.seats.p1!.cards = ['brigand'];
    s.seats.p1!.revealed = ['executioner'];
    s = play(s, 'p0', { type: 'act', kind: 'snoop', target: 'p1' });
    s = passAll(s);
    expect(s.phase).toBe('peek');
    expect(s.intel.p0).toEqual([{ target: 'p1', card: 'brigand' }]);
  });

  it('Escorte : intouchable par les personnages jusqu’à son prochain tour, pas par la Conspiration', () => {
    let s = table([['mercenary', 'guard'], ['executioner', 'brigand'], ['informer', 'banker']], [2, 3, 7], FULL);
    s = play(s, 'p0', { type: 'act', kind: 'escort' });
    s = passAll(s);
    expect(s.seats.p0).toMatchObject({ coins: 0, escorted: true });
    expect(s.active).toBe('p1');
    expect(ok(s, 'p1', { type: 'act', kind: 'execute', target: 'p0' })).toBe(false);
    expect(ok(s, 'p1', { type: 'act', kind: 'racket', target: 'p0' })).toBe(false);
    s = play(s, 'p1', { type: 'act', kind: 'income' });
    expect(ok(s, 'p2', { type: 'act', kind: 'snoop', target: 'p0' })).toBe(false);
    expect(ok(s, 'p2', { type: 'act', kind: 'conspiracy', target: 'p0' })).toBe(true);
    s = play(s, 'p2', { type: 'act', kind: 'income' });
    expect(s.active).toBe('p0');
    expect(s.seats.p0!.escorted).toBe(false); // l'escorte prend fin à son tour
  });

  it('une Escorte bluffée et démasquée est remboursée et n’a pas d’effet', () => {
    let s = table([['banker', 'guard'], ['executioner', 'brigand']], [2, 2], FULL);
    s = play(s, 'p0', { type: 'act', kind: 'escort' });
    s = play(s, 'p1', { type: 'challenge' });
    s = play(s, 'p0', { type: 'lose', card: 'banker' });
    expect(s.seats.p0).toMatchObject({ coins: 2, escorted: false });
  });
});

describe('La Cité — petites cours', () => {
  it.each([
    [2, ['executioner', 'guard']],
    [3, ['banker', 'brigand', 'envoy']],
    [4, ['banker', 'executioner', 'informer', 'mercenary']],
  ] as [number, Character[]][])('%i joueurs avec %j : les parties se terminent', (n, characters) => {
    const config: CourtConfig = { reaction: 20, characters };
    expect(court.canStart!(n, config)).toBeNull();
    for (let seed = 0; seed < 150; seed++) {
      const { state } = simulate<CourtState>(court, players(n), seededRng(seed + 7 * n), {
        config,
        onStep: (s) => expect(total(s)).toBe(characters.length * 3),
      });
      expect(state.phase).toBe('over');
    }
  }, 60_000);
});

describe('La Cité — robustesse', () => {
  it.each([2, 3, 4, 5, 6])('400 parties de bots à %i joueurs, cartes toujours comptées', (n) => {
    for (let seed = 0; seed < 400; seed++) {
      const config = seed % 2 === 0 ? CLASSIC : FULL;
      const cards = config.characters.length * 3;
      const { state } = simulate<CourtState>(court, players(n), seededRng(seed * 17 + n), {
        config,
        onStep: (s) => expect(total(s)).toBe(cards),
      });
      expect(state.phase).toBe('over');
      expect(state.winner).not.toBeNull();
    }
  }, 90_000);
});

describe('La Cité — mémoire des annonces et contestations des bots', () => {
  it('les annonces publiques sont suivies, puis oubliées quand la main change', () => {
    let s = table([['banker', 'guard'], ['brigand', 'envoy'], ['executioner', 'envoy']], undefined, FULL);
    s = play(s, 'p0', { type: 'act', kind: 'tax' });
    expect(court.view(s, 'p1').players[0]!.claimed).toEqual(['banker']);
    s = passAll(s); // pas de contestation : +3 écus
    s = play(s, 'p1', { type: 'act', kind: 'exchange' });
    expect(court.view(s, 'p2').players[1]!.claimed).toEqual(['envoy']);
    s = passAll(s);
    s = play(s, 'p1', { type: 'keep', cards: s.exchange!.slice(0, 2) });
    expect(s.claims.p1).toEqual([]);
  });

  it('un bot conteste presque toujours un troisième personnage différent annoncé avec deux cartes', async () => {
    const { courtBot } = await import('../src');
    let s = table([['guard', 'guard'], ['brigand', 'envoy'], ['executioner', 'envoy']], [5, 2, 2], FULL);
    s.claims.p0 = ['banker', 'executioner'];
    s = play(s, 'p0', { type: 'act', kind: 'snoop', target: 'p1' });
    const tries = 400;
    let challenged = 0;
    for (let seed = 0; seed < tries; seed++) {
      const move = courtBot(court.view(s, 'p2'), 'p2', seededRng(seed));
      if (move?.type === 'challenge') challenged++;
    }
    // Annonce crédible (même personnage déjà revendiqué) : contestée bien plus rarement.
    let s2 = table([['guard', 'guard'], ['brigand', 'envoy'], ['executioner', 'envoy']], [5, 2, 2], FULL);
    s2.claims.p0 = ['informer', 'informer'];
    s2 = play(s2, 'p0', { type: 'act', kind: 'snoop', target: 'p1' });
    let credible = 0;
    for (let seed = 0; seed < tries; seed++) {
      if (courtBot(court.view(s2, 'p2'), 'p2', seededRng(seed))?.type === 'challenge') credible++;
    }
    expect(challenged / tries).toBeGreaterThan(0.35);
    expect(credible / tries).toBeLessThan(0.1);
  });

  it('un bot menacé d’Exécution avec sa dernière influence conteste très souvent', async () => {
    const { courtBot } = await import('../src');
    let s = table([['guard', 'banker'], ['brigand'], ['envoy', 'envoy']], [3, 2, 2], FULL);
    s.seats.p1!.revealed = ['guard'];
    s = play(s, 'p0', { type: 'act', kind: 'execute', target: 'p1' });
    let n = 0;
    for (let seed = 0; seed < 200; seed++) if (courtBot(court.view(s, 'p1'), 'p1', seededRng(seed))?.type === 'challenge') n++;
    expect(n / 200).toBeGreaterThan(0.5);
  });
});

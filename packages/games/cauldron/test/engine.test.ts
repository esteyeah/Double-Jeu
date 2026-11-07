import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  DECK,
  HAND_SIZE,
  POISONERS,
  TARGETS,
  cauldron,
  type ActionKind,
  type Card,
  type CauldronConfig,
  type CauldronState,
  type Ingredient,
  type Role,
} from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));
const SECRET: CauldronConfig = { votes: 'secret' };

function play(s: CauldronState, by: string, move: unknown): CauldronState {
  const out = applyMove(cauldron, s, by, move, seededRng(4), 1000);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: CauldronState, by: string, move: unknown) => applyMove(cauldron, s, by, move, seededRng(4), 1000).ok;

const ing = (value: Ingredient): Card => ({ kind: 'ingredient', value });
const act = (action: ActionKind): Card => ({ kind: 'action', action });
const FILLER: Card[] = [ing(0), ing(0), ing(0)];

/** Partie prête : rôles imposés, mains imposées (sinon trois Eaux de source), p0 commence. */
function ready(roles: Role[], hands: Record<string, Card[]> = {}, config: CauldronConfig = SECRET): CauldronState {
  let s = cauldron.setup(players(roles.length), config, seededRng(1));
  s.roles = Object.fromEntries(roles.map((r, i) => [`p${i}`, r]));
  for (const p of s.players) s.hands[p.id] = [...(hands[p.id] ?? FILLER)];
  s.deck = Array.from({ length: 30 }, () => ing(0));
  s.turn = 0;
  s.active = 'p0';
  for (const p of s.players) s = play(s, p.id, { type: 'ack' });
  return s;
}

const FIVE: Role[] = ['alchemist', 'alchemist', 'alchemist', 'poisoner', 'poisoner'];
/** Valeurs de rôle présentes dans un objet sérialisé (les noms de champs ne comptent pas). */
const ROLE_VALUE = /:"(alchemist|poisoner)"/;

describe('Le Chaudron — mise en place et secrets', () => {
  it.each([3, 4, 5, 6, 7, 8])('distribue rôles et mains à %i joueurs', (n) => {
    const s = cauldron.setup(players(n), SECRET, seededRng(n));
    expect(Object.values(s.roles).filter((r) => r === 'poisoner')).toHaveLength(POISONERS[n]!);
    const total = DECK.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(60);
    for (const p of s.players) expect(s.hands[p.id]).toHaveLength(HAND_SIZE);
    expect(s.deck).toHaveLength(total - HAND_SIZE * n);
    expect(s.target).toBe(TARGETS[n]);
  });

  it('les Empoisonneurs se connaissent ; un Alchimiste ne sait rien des autres', () => {
    const s = ready(FIVE);
    expect(cauldron.view(s, 'p3').me!.allies).toEqual(['p4']);
    const v = cauldron.view(s, 'p0');
    expect(v.me!.allies).toEqual([]);
    expect(JSON.stringify({ ...v, me: null, players: v.players.filter((p) => p.id !== 'p0') })).not.toMatch(ROLE_VALUE);
    // Les mains des autres restent cachées.
    expect(JSON.stringify(cauldron.view(s, 'p1').players)).not.toContain('"hand"');
  });

  it('un mensonge reste invisible des autres ; le verseur connaît la vraie valeur', () => {
    let s = ready(FIVE, { p0: [ing(-2), ing(0), ing(0)] });
    s = play(s, 'p0', { type: 'pour', index: 0, announce: 1 });
    const other = cauldron.view(s, 'p1');
    expect(other.announcedTotal).toBe(1);
    expect(other.realTotal).toBeNull();
    expect(other.pours).toEqual([{ by: 'p0', announced: 1, value: null }]);
    expect(JSON.stringify(other)).not.toContain('-2');
    expect(cauldron.view(s, 'p0').pours[0]!.value).toBe(-2);
    // La main est complétée et c'est au suivant.
    expect(s.hands.p0).toHaveLength(HAND_SIZE);
    expect(s.active).toBe('p1');
  });
});

describe('Le Chaudron — actions', () => {
  it('Goûter : seul le goûteur voit les 3 derniers ingrédients', () => {
    let s = ready(FIVE, { p0: [ing(1), ing(0), ing(0)], p1: [ing(-2)], p2: [ing(1)], p3: [act('taste'), ing(0), ing(0)] });
    s = play(s, 'p0', { type: 'pour', index: 0, announce: 1 });
    s = play(s, 'p1', { type: 'pour', index: 0, announce: 1 });
    s = play(s, 'p2', { type: 'pour', index: 0, announce: 1 });
    s = play(s, 'p3', { type: 'action', index: 0 });
    expect(s.phase).toBe('tasted');
    const taste = cauldron.view(s, 'p3').me!.tastes[0]!;
    expect([...taste.values].sort()).toEqual([-2, 1, 1]);
    expect(taste.pours.map((p) => p.by)).toEqual(['p0', 'p1', 'p2']);
    // Personne d'autre ne voit le résultat, ni dans la vue ni dans le journal.
    expect(cauldron.view(s, 'p0').me!.tastes).toEqual([]);
    expect(cauldron.view(s, 'p4').log.join(' ')).not.toMatch(/Tu as goûté/);
    expect(ok(s, 'p4', { type: 'seen' })).toBe(false);
    s = play(s, 'p3', { type: 'seen' });
    expect(s.phase).toBe('turn');
    expect(s.active).toBe('p4');
  });

  it('Écumer retire les 2 derniers ingrédients', () => {
    let s = ready(FIVE, { p2: [act('skim'), ing(0), ing(0)] });
    s = play(s, 'p0', { type: 'pour', index: 0, announce: 0 });
    s = play(s, 'p1', { type: 'pour', index: 0, announce: 1 });
    s = play(s, 'p2', { type: 'action', index: 0 });
    expect(s.cauldron).toEqual([]);
  });

  it('trois soupçons chassent un joueur, révèlent son rôle et le sortent du tour', () => {
    const sus: Card[] = [act('suspect'), ing(0), ing(0)];
    let s = ready(FIVE, { p0: sus, p1: sus, p2: sus });
    expect(ok(s, 'p0', { type: 'action', index: 0, target: 'p0' })).toBe(false);
    s = play(s, 'p0', { type: 'action', index: 0, target: 'p3' });
    s = play(s, 'p1', { type: 'action', index: 0, target: 'p3' });
    s = play(s, 'p2', { type: 'action', index: 0, target: 'p3' });
    expect(s.expelled).toEqual(['p3']);
    expect(s.hands.p3).toEqual([]);
    expect(cauldron.view(s, 'p0').players.find((p) => p.id === 'p3')!.role).toBe('poisoner');
    expect(s.active).toBe('p4');
    expect(ok(s, 'p3', { type: 'pour', index: 0, announce: 0 })).toBe(false);
  });

  it('Plaidoyer retire un jeton (et reste jouable sans jeton)', () => {
    let s = ready(FIVE, { p0: [act('suspect'), ing(0), ing(0)], p1: [act('plead'), ing(0), ing(0)], p2: [act('plead'), ing(0), ing(0)] });
    s = play(s, 'p0', { type: 'action', index: 0, target: 'p1' });
    s = play(s, 'p1', { type: 'action', index: 0, target: 'p1' });
    expect(s.suspicion.p1).toBe(0);
    s = play(s, 'p2', { type: 'action', index: 0, target: 'p0' });
    expect(s.suspicion.p0).toBe(0);
  });

  it('chasser le dernier Empoisonneur fait gagner les Alchimistes', () => {
    let s = ready(['alchemist', 'alchemist', 'alchemist', 'poisoner']);
    s.suspicion.p3 = 2;
    s.hands.p0 = [act('suspect'), ing(0), ing(0)];
    s = play(s, 'p0', { type: 'action', index: 0, target: 'p3' });
    expect(s.outcome).toEqual({ winner: 'alchemist', reason: 'expelled' });
    expect(cauldron.result(s)?.winners).toEqual(['p0', 'p1', 'p2']);
  });

  it('les Empoisonneurs prennent la guilde s’ils deviennent plus nombreux', () => {
    let s = ready(FIVE);
    s.suspicion.p1 = 2;
    s.suspicion.p2 = 2;
    s.hands.p0 = [act('suspect'), ing(0), ing(0)];
    s.hands.p3 = [act('suspect'), ing(0), ing(0)];
    s = play(s, 'p0', { type: 'action', index: 0, target: 'p1' });
    expect(s.outcome).toBeNull(); // 2 contre 2 : la partie continue
    s = play(s, 'p2', { type: 'pour', index: 0, announce: 0 });
    s = play(s, 'p3', { type: 'action', index: 0, target: 'p2' });
    expect(s.outcome).toEqual({ winner: 'poisoner', reason: 'majority' });
  });
});

describe('Le Chaudron — servir la potion', () => {
  /** Cinq versements : p0..p4 versent chacun une carte de leur main. */
  function brew(values: Ingredient[], announce: Ingredient[] = values, config: CauldronConfig = SECRET): CauldronState {
    const hands = Object.fromEntries(values.map((v, i) => [`p${i}`, [ing(v), ing(0), ing(0)]]));
    let s = ready(FIVE, hands, config);
    s.target = 4;
    values.forEach((_, i) => (s = play(s, `p${i}`, { type: 'pour', index: 0, announce: announce[i] })));
    return s;
  }

  it('on ne peut pas servir un chaudron vide', () => {
    const s = ready(FIVE);
    expect(ok(s, 'p0', { type: 'propose' })).toBe(false);
  });

  it('les votes restent secrets jusqu’au dépouillement ; majorité : on révèle la force réelle', () => {
    let s = brew([1, 1, 1, 1, 1]);
    s = play(s, 'p0', { type: 'propose' });
    s = play(s, 'p1', { type: 'vote', yes: false });
    expect(JSON.stringify(cauldron.view(s, 'p0'))).not.toContain('"p1":false');
    for (const id of ['p0', 'p2', 'p3', 'p4']) s = play(s, id, { type: 'vote', yes: true });
    expect(s.outcome).toEqual({ winner: 'alchemist', reason: 'potion' });
    const v = cauldron.view(s, 'p1');
    expect(v.realTotal).toBe(5);
    expect(v.lastVote?.votes).toMatchObject({ p1: false, p2: true });
  });

  it('une potion servie trop faible fait gagner les Empoisonneurs', () => {
    let s = brew([1, 1, 1, -2, -2], [1, 1, 1, 1, 1]);
    expect(cauldron.view(s, 'p0').announcedTotal).toBe(5);
    s = play(s, 'p0', { type: 'propose' });
    for (const p of s.players) s = play(s, p.id, { type: 'vote', yes: true });
    expect(s.outcome).toEqual({ winner: 'poisoner', reason: 'potion' });
    expect(cauldron.view(s, 'p0').pours.map((p) => p.value)).toEqual([1, 1, 1, -2, -2]);
    expect(cauldron.result(s)?.winners).toEqual(['p3', 'p4']);
  });

  it('un vote refusé donne un soupçon au proposant et passe au suivant', () => {
    let s = brew([1, 1, 1, 1, 1]);
    s = play(s, 'p0', { type: 'propose' });
    for (const p of s.players) s = play(s, p.id, { type: 'vote', yes: p.id === 'p0' || p.id === 'p1' });
    expect(s.outcome).toBeNull();
    expect(s.suspicion.p0).toBe(1);
    expect(s.active).toBe('p1');
    expect(s.phase).toBe('turn');
  });

  it('vote à main levée : seul le proposant reporte', () => {
    let s = brew([1, 1, 1, 1, 1], [1, 1, 1, 1, 1], { votes: 'hands' });
    s = play(s, 'p0', { type: 'propose' });
    expect(ok(s, 'p1', { type: 'vote', yes: true })).toBe(false);
    expect(ok(s, 'p1', { type: 'tally', yes: ['p1'] })).toBe(false);
    s = play(s, 'p0', { type: 'tally', yes: ['p0', 'p1', 'p2'] });
    expect(s.outcome).toEqual({ winner: 'alchemist', reason: 'potion' });
  });

  it('pioche épuisée : victoire des Empoisonneurs', () => {
    let s = ready(FIVE);
    s.deck = [ing(1)];
    s = play(s, 'p0', { type: 'pour', index: 0, announce: 0 });
    expect(s.outcome).toEqual({ winner: 'poisoner', reason: 'deck' });
  });
});

describe('Le Chaudron — robustesse', () => {
  it.each([3, 4, 5, 6, 7, 8])('200 parties de bots à %i joueurs se terminent', (n) => {
    const wins = { alchemist: 0, poisoner: 0 };
    for (let seed = 0; seed < 200; seed++) {
      const config: CauldronConfig = { votes: seed % 4 === 0 ? 'hands' : 'secret' };
      const { state } = simulate<CauldronState>(cauldron, players(n), seededRng(seed * 11 + n), { config });
      expect(state.phase).toBe('over');
      wins[state.outcome!.winner]++;
    }
    expect(wins.alchemist).toBeGreaterThan(20);
    expect(wins.poisoner).toBeGreaterThan(20);
  }, 60_000);
});

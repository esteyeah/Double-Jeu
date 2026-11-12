import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  DECK_SIZE,
  mapValue,
  plunder,
  scoreOf,
  type LootItem,
  type PlunderConfig,
  type PlunderState,
} from '../src';

const players = (n: number, bots = 0): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: i >= n - bots }));

function setup(n = 4, config: PlunderConfig = { courage: 'secret' }, bots = 0): PlunderState {
  const s = plunder.setup(players(n, bots), config, seededRng(5));
  s.captain = 'p0';
  return s;
}

function play(s: PlunderState, by: string, move: unknown): PlunderState {
  const out = applyMove(plunder, s, by, move, seededRng(2), 1000);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: PlunderState, by: string, move: unknown) => applyMove(plunder, s, by, move, seededRng(2), 1000).ok;

/** Charges et cibles imposées : { p0: ['dry', 'p1'], ... } */
function prepareAll(s: PlunderState, plan: Record<string, ['dry' | 'wet', string]>, stopAtOrder = false): PlunderState {
  for (const [id, [charge, target]] of Object.entries(plan)) s = play(s, id, { type: 'prepare', charge, target });
  // Le Capitaine laisse faire, sauf si le test examine son ordre.
  if (!stopAtOrder && s.phase === 'order') s = play(s, s.captain, { type: 'order' });
  return s;
}
function courageAll(s: PlunderState, fleeing: string[] = []): PlunderState {
  for (const id of s.players.map((p) => p.id)) {
    if (s.phase !== 'courage') break;
    if (!s.pirates[id]!.sunk && !Object.hasOwn(s.fled, id)) s = play(s, id, { type: 'courage', flee: fleeing.includes(id) });
  }
  return s;
}
function lootCount(s: PlunderState): number {
  return s.deck.length + s.deckOnBoard.length + s.used.length + Object.values(s.pirates).reduce((n, p) => n + p.loot.length, 0);
}

describe('Butin — mise en place et secrets', () => {
  it('64 objets, 8 sur le pont, 3 balles réelles et 5 à blanc par pirate', () => {
    const s = setup(5);
    expect(DECK_SIZE).toBe(64);
    expect(s.deckOnBoard).toHaveLength(8);
    expect(lootCount(s)).toBe(64);
    for (const p of Object.values(s.pirates)) expect(p).toMatchObject({ dry: 3, wet: 5, wounds: 0 });
  });

  it('charge et visée restent secrètes tant que tout le monde n’a pas chargé', () => {
    let s = setup(4);
    s = play(s, 'p1', { type: 'prepare', charge: 'dry', target: 'p2' });
    const v = plunder.view(s, 'p2');
    expect(v.pirates.find((p) => p.id === 'p1')).toMatchObject({ prepared: true, aim: null, charges: 7 });
    expect(JSON.stringify({ ...v, me: null })).not.toMatch(/"dry"|"wet"/);
    expect(plunder.view(s, 'p1').me!.prepared).toEqual({ charge: 'dry', target: 'p2' });
    expect(plunder.view(s, 'p1').me!.dry).toBe(2);
  });

  it('on ne peut ni se viser soi-même ni utiliser une poudre épuisée', () => {
    const s = setup(4);
    expect(ok(s, 'p1', { type: 'prepare', charge: 'dry', target: 'p1' })).toBe(false);
    s.pirates.p1!.dry = 0;
    expect(ok(s, 'p1', { type: 'prepare', charge: 'dry', target: 'p2' })).toBe(false);
    expect(ok(s, 'p1', { type: 'prepare', charge: 'wet', target: 'p2' })).toBe(true);
  });
});

describe('Butin — visées, Capitaine et courage', () => {
  it('le Capitaine visé peut forcer un pirate à viser ailleurs', () => {
    let s = setup(4);
    s = prepareAll(s, { p0: ['wet', 'p1'], p1: ['dry', 'p0'], p2: ['dry', 'p3'], p3: ['wet', 'p0'] }, true);
    expect(s.phase).toBe('order');
    expect(ok(s, 'p0', { type: 'order', pirate: 'p1', target: 'p0' })).toBe(false); // pas vers le Capitaine
    expect(ok(s, 'p0', { type: 'order', pirate: 'p0', target: 'p2' })).toBe(false); // pas son propre pistolet
    expect(ok(s, 'p0', { type: 'order', pirate: 'p2', target: 'p3' })).toBe(false); // vise déjà p3
    s = play(s, 'p0', { type: 'order', pirate: 'p1', target: 'p3' });
    expect(s.aims.p1).toBe('p3');
    expect(s.phase).toBe('courage');
  });

  it('le Capitaine peut aussi réorienter un pirate qui ne le vise pas', () => {
    let s = prepareAll(setup(4), { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p1'] }, true);
    expect(s.phase).toBe('order');
    s = play(s, 'p0', { type: 'order', pirate: 'p2', target: 'p1' });
    expect(s.aims.p2).toBe('p1');
    expect(s.phase).toBe('courage');
  });

  it('à deux pirates debout, pas d’ordre du Capitaine', () => {
    let s = setup(3);
    s.pirates.p2!.sunk = true;
    s = prepareAll(s, { p0: ['wet', 'p1'], p1: ['wet', 'p0'] }, true);
    expect(s.phase).toBe('courage');
  });

  it('les décisions de plongeon restent secrètes jusqu’au tir', () => {
    let s = prepareAll(setup(4), { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p1'] });
    s = play(s, 'p1', { type: 'courage', flee: true });
    const v = plunder.view(s, 'p2');
    expect(v.pirates.find((p) => p.id === 'p1')).toMatchObject({ decided: true, fled: null });
  });
});

describe('Butin — tirs et partage', () => {
  it('les charges sèches blessent, les plongeurs sont épargnés et gardent leur charge secrète', () => {
    let s = prepareAll(setup(4), { p0: ['dry', 'p1'], p1: ['dry', 'p2'], p2: ['dry', 'p3'], p3: ['wet', 'p1'] });
    s = courageAll(s, ['p2']);
    expect(s.pirates.p1!.wounds).toBe(1); // touché par p0
    expect(s.pirates.p2!.wounds).toBe(0); // a plongé
    expect(s.shots.map((x) => x.shooter)).not.toContain('p2');
    expect(s.pickers).toEqual(['p0', 'p3']); // p1 touché, p2 plongé
    expect(s.phase).toBe('loot');
  });

  it('deux balles sur la même cible font deux blessures ; trois blessures coulent', () => {
    let s = setup(4);
    s.pirates.p3!.wounds = 1;
    s = prepareAll(s, { p0: ['wet', 'p1'], p1: ['dry', 'p3'], p2: ['dry', 'p3'], p3: ['wet', 'p1'] });
    s = courageAll(s);
    expect(s.pirates.p3!.sunk).toBe(true);
    expect(ok(s, 'p3', { type: 'take', index: 0 })).toBe(false);
  });

  it('partage à tour de rôle depuis le Capitaine ; le reste du pont s’ajoute à la manche suivante', () => {
    let s = prepareAll(setup(4), { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p1'] });
    s = courageAll(s, ['p1', 'p2', 'p3']);
    expect(s.pickers).toEqual(['p0']);
    for (let i = 0; i < 8; i++) s = play(s, 'p0', { type: 'take', index: 0 });
    expect(s.round).toBe(2);
    expect(s.captain).toBe('p1');

    // Personne ne vise le nouveau Capitaine (p1) : pas d'ordre, on passe au courage.
    s = prepareAll(s, { p0: ['wet', 'p2'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p0'] });
    s = courageAll(s, ['p0', 'p1', 'p2', 'p3']);
    expect(s.round).toBe(3);
    expect(s.deckOnBoard).toHaveLength(16);
    expect(lootCount(s)).toBe(64);
  });

  it('rhum, poudre et bicorne ont leur effet immédiat', () => {
    let s = prepareAll(setup(4), { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p1'] });
    s = courageAll(s, ['p1', 'p2', 'p3']);
    const items: LootItem[] = [{ kind: 'rum' }, { kind: 'powder' }, { kind: 'bicorne' }, { kind: 'rum' }];
    s.deckOnBoard = items;
    s.pirates.p0!.wounds = 1;
    for (let i = 0; i < 4; i++) s = play(s, 'p0', { type: 'take', index: 0 });
    expect(s.pirates.p0!.wounds).toBe(0);
    expect(s.pirates.p0!.dry).toBe(4);
    expect(s.pirates.p0!.loot).toEqual([{ kind: 'rum' }]); // 2e rhum : pas de blessure, vaut 5
    expect(s.captain).toBe('p0'); // bicorne
  });

  it('décompte : doublons, perles (+30 au plus gros collier, ex æquo compris) et cartes', () => {
    const s = setup(3);
    s.pirates.p0!.loot = [{ kind: 'coin', value: 20 }, { kind: 'pearl' }, { kind: 'pearl' }, { kind: 'map' }, { kind: 'map' }];
    s.pirates.p1!.loot = [{ kind: 'pearl' }, { kind: 'pearl' }, { kind: 'rum' }];
    expect(scoreOf(s, 'p0')).toBe(20 + 10 + 30 + 15);
    expect(scoreOf(s, 'p1')).toBe(10 + 30 + 5);
    expect([mapValue(1), mapValue(3), mapValue(6)]).toEqual([5, 30, 100]);
  });
});

describe('Butin — mode « table »', () => {
  it('les bots décident seuls, puis le Capitaine (humain) reporte les humains', () => {
    let s = setup(4, { courage: 'table' }, 2); // p2, p3 bots
    s = prepareAll(s, { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p3'], p3: ['wet', 'p1'] });
    expect(plunder.expectedActors(s).sort()).toEqual(['p2', 'p3']);
    expect(ok(s, 'p1', { type: 'courage', flee: true })).toBe(false);
    expect(ok(s, 'p0', { type: 'cowards', fled: ['p1'] })).toBe(false); // bots pas encore décidés
    s = play(s, 'p2', { type: 'courage', flee: false });
    s = play(s, 'p3', { type: 'courage', flee: false });
    expect(plunder.expectedActors(s)).toEqual(['p0']);
    expect(plunder.view(s, 'p0').toReport.sort()).toEqual(['p0', 'p1']);
    s = play(s, 'p0', { type: 'cowards', fled: ['p1'] });
    expect(s.fled).toMatchObject({ p0: false, p1: true });
  });

  it('si le Capitaine est un bot, c’est le premier humain après lui qui reporte', () => {
    let s = setup(4, { courage: 'table' }, 2);
    s.captain = 'p3';
    s = prepareAll(s, { p0: ['wet', 'p1'], p1: ['wet', 'p2'], p2: ['wet', 'p0'], p3: ['wet', 'p1'] });
    s = play(s, 'p2', { type: 'courage', flee: false });
    s = play(s, 'p3', { type: 'courage', flee: false });
    expect(plunder.expectedActors(s)).toEqual(['p0']);
  });
});

describe('Butin — robustesse', () => {
  it.each([3, 4, 5, 6, 7, 8])('300 parties de bots à %i joueurs, 64 objets toujours comptés', (n) => {
    for (let seed = 0; seed < 300; seed++) {
      const config: PlunderConfig = { courage: seed % 3 === 0 ? 'table' : 'secret' };
      const { state } = simulate<PlunderState>(plunder, players(n, n), seededRng(seed * 11 + n), {
        config,
        onStep: (s) => expect(lootCount(s)).toBe(64),
      });
      expect(state.phase).toBe('over');
      expect(state.round).toBeLessThanOrEqual(8);
    }
  }, 60_000);
});

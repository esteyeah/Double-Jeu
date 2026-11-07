import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  MUTINEERS,
  TEAM_SIZES,
  expedition,
  type ExpeditionConfig,
  type ExpeditionState,
  type Role,
} from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));
const BASIC: ExpeditionConfig = { votes: 'secret', roles: 'basic' };
const SPECIAL: ExpeditionConfig = { votes: 'secret', roles: 'special' };

function play(s: ExpeditionState, by: string, move: unknown): ExpeditionState {
  const out = applyMove(expedition, s, by, move, seededRng(4), 1000);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}
const ok = (s: ExpeditionState, by: string, move: unknown) => applyMove(expedition, s, by, move, seededRng(4), 1000).ok;

/** Partie prête, rôles imposés, p0 premier Chef. */
function ready(roles: Role[], config: ExpeditionConfig = BASIC): ExpeditionState {
  let s = expedition.setup(players(roles.length), config, seededRng(1));
  s.roles = Object.fromEntries(roles.map((r, i) => [`p${i}`, r]));
  s.leaderIndex = 0;
  for (const p of s.players) s = play(s, p.id, { type: 'ack' });
  return s;
}

const leader = (s: ExpeditionState) => s.players[s.leaderIndex]!.id;
const voteAll = (s: ExpeditionState, yes: boolean | ((id: string) => boolean)) =>
  s.players.reduce((st, p) => play(st, p.id, { type: 'vote', yes: typeof yes === 'function' ? yes(p.id) : yes }), s);

/** Propose `team`, la fait accepter, puis chacun joue : les Mutins listés dans `saboteurs` sabotent. */
function mission(s: ExpeditionState, team: string[], saboteurs: string[] = []): ExpeditionState {
  s = play(s, leader(s), { type: 'propose', team });
  s = voteAll(s, true);
  for (const id of team) s = play(s, id, { type: 'play', card: saboteurs.includes(id) ? 'sabotage' : 'success' });
  return s;
}

const FIVE: Role[] = ['explorer', 'explorer', 'explorer', 'mutineer', 'mutineer'];

describe('Expédition — mise en place et secrets', () => {
  it.each([5, 6, 7, 8, 9, 10])('distribue les rôles à %i joueurs', (n) => {
    const s = expedition.setup(players(n), SPECIAL, seededRng(n));
    const roles = Object.values(s.roles);
    const mutiny = roles.filter((r) => r === 'mutineer' || r === 'spy').length;
    expect(mutiny).toBe(MUTINEERS[n]);
    expect(roles.filter((r) => r === 'cartographer')).toHaveLength(1);
    expect(roles.filter((r) => r === 'spy')).toHaveLength(1);
  });

  it('les Mutins se connaissent ; un explorateur ne sait rien', () => {
    const s = ready(FIVE);
    expect(expedition.view(s, 'p3').me!.allies).toEqual([{ id: 'p4', role: 'mutineer' }]);
    const v = expedition.view(s, 'p0');
    expect(v.me!.allies).toEqual([]);
    // Aucune VALEUR de rôle (les noms de champs comme "spy" ne comptent pas).
    expect(JSON.stringify({ ...v, me: null, players: v.players.filter((p) => p.id !== 'p0') })).not.toMatch(
      /:"(mutineer|explorer|spy|cartographer)"/,
    );
  });

  it('la Cartographe voit les Mutins sans savoir qui est l’Espion', () => {
    const s = ready(['cartographer', 'explorer', 'explorer', 'mutineer', 'spy'], SPECIAL);
    const allies = expedition.view(s, 'p0').me!.allies;
    expect(allies).toEqual([
      { id: 'p3', role: 'mutineer' },
      { id: 'p4', role: 'mutineer' },
    ]);
    expect(expedition.view(s, 'p4').me!.allies).toEqual([{ id: 'p3', role: 'mutineer' }]);
  });
});

describe('Expédition — cordées et votes', () => {
  it('la cordée doit avoir la bonne taille et seul le Chef la compose', () => {
    const s = ready(FIVE);
    expect(TEAM_SIZES[5]![0]).toBe(2);
    expect(ok(s, 'p0', { type: 'propose', team: ['p0', 'p1', 'p2'] })).toBe(false);
    expect(ok(s, 'p1', { type: 'propose', team: ['p0', 'p1'] })).toBe(false);
    expect(ok(s, 'p0', { type: 'propose', team: ['p0', 'p0'] })).toBe(false);
    expect(ok(s, 'p0', { type: 'propose', team: ['p0', 'p1'] })).toBe(true);
  });

  it('majorité stricte, sinon le Chef suivant ; 5 refus d’affilée : victoire des Mutins', () => {
    let s = ready(FIVE);
    for (let i = 0; i < 5; i++) {
      s = play(s, leader(s), { type: 'propose', team: ['p0', 'p1'] });
      s = voteAll(s, (id) => ['p0', 'p1'].includes(id));
      if (i < 4) expect(s.leaderIndex).toBe(i + 1);
    }
    expect(expedition.result(s)?.title).toMatch(/Mutins/);
    expect(s.outcome).toEqual({ winner: 'mutiny', reason: 'deadlock' });
  });

  it('les votes restent secrets jusqu’au dépouillement, puis sont publics', () => {
    let s = ready(FIVE);
    s = play(s, 'p0', { type: 'propose', team: ['p0', 'p1'] });
    s = play(s, 'p3', { type: 'vote', yes: false });
    const v = expedition.view(s, 'p0');
    expect(v.players.find((p) => p.id === 'p3')).toMatchObject({ voted: true });
    expect(JSON.stringify(v)).not.toContain('"p3":false');
    s = voteAll({ ...s, votes: {} }, true);
    expect(expedition.view(s, 'p0').lastVote?.votes).toMatchObject({ p3: true });
  });

  it('vote à main levée : le Chef reporte', () => {
    let s = ready(FIVE, { votes: 'hands', roles: 'basic' });
    s = play(s, 'p0', { type: 'propose', team: ['p0', 'p1'] });
    expect(ok(s, 'p2', { type: 'vote', yes: true })).toBe(false);
    s = play(s, 'p0', { type: 'tally', yes: ['p0', 'p1', 'p2'] });
    expect(s.phase).toBe('mission');
  });
});

describe('Expédition — étapes', () => {
  it('un loyal ne peut pas saboter ; on ne révèle que le nombre de sabotages', () => {
    let s = ready(FIVE);
    s = play(s, 'p0', { type: 'propose', team: ['p0', 'p3'] });
    s = voteAll(s, true);
    expect(ok(s, 'p0', { type: 'play', card: 'sabotage' })).toBe(false);
    s = play(s, 'p3', { type: 'play', card: 'sabotage' });
    expect(JSON.stringify(expedition.view(s, 'p0'))).not.toMatch(/:"sabotage"/);
    s = play(s, 'p0', { type: 'play', card: 'success' });
    expect(s.results[0]).toMatchObject({ success: false, sabotages: 1 });
    expect(JSON.stringify(expedition.view(s, 'p1'))).not.toMatch(/:"(success|sabotage)"/);
  });

  it('à 7 joueurs, la 4e étape ne tombe qu’avec deux sabotages', () => {
    let s = ready(['explorer', 'explorer', 'explorer', 'explorer', 'mutineer', 'mutineer', 'mutineer']);
    s = mission(s, ['p0', 'p1']);
    s = mission(s, ['p0', 'p1', 'p2'], []);
    s = mission(s, ['p0', 'p1', 'p4'], ['p4']);
    expect(s.results.map((r) => r.success)).toEqual([true, true, false]);
    s = mission(s, ['p0', 'p1', 'p2', 'p4'], ['p4']);
    expect(s.results[3]).toMatchObject({ success: true, sabotages: 1 });
    expect(expedition.result(s)?.title).toMatch(/Expédition/);
  });

  it('trois étapes ratées : victoire des Mutins', () => {
    let s = ready(FIVE);
    s = mission(s, ['p0', 'p3'], ['p3']);
    s = mission(s, ['p0', 'p1', 'p3'], ['p3']);
    s = mission(s, ['p0', 'p4'], ['p4']);
    expect(s.outcome).toEqual({ winner: 'mutiny', reason: 'missions' });
    expect(expedition.result(s)?.winners.sort()).toEqual(['p3', 'p4']);
  });

  it('variante : l’Espion qui démasque la Cartographe renverse la victoire', () => {
    const roles: Role[] = ['cartographer', 'explorer', 'explorer', 'mutineer', 'spy'];
    let s = ready(roles, SPECIAL);
    s = mission(s, ['p0', 'p1']);
    s = mission(s, ['p0', 'p1', 'p2']);
    s = mission(s, ['p1', 'p2']);
    expect(s.phase).toBe('spy');
    expect(expedition.view(s, 'p1').spy).toBe('p4');
    expect(ok(s, 'p3', { type: 'unmask', target: 'p0' })).toBe(false);
    const hit = play(s, 'p4', { type: 'unmask', target: 'p0' });
    expect(hit.outcome).toEqual({ winner: 'mutiny', reason: 'cartographer' });
    const miss = play(s, 'p4', { type: 'unmask', target: 'p1' });
    expect(miss.outcome).toEqual({ winner: 'expedition', reason: 'spyMissed' });
  });
});

describe('Expédition — robustesse', () => {
  it.each([5, 6, 7, 8, 9, 10])('400 parties de bots à %i joueurs se terminent', (n) => {
    const wins = { expedition: 0, mutiny: 0 };
    for (let seed = 0; seed < 400; seed++) {
      const config: ExpeditionConfig = {
        votes: seed % 5 === 0 ? 'hands' : 'secret',
        roles: seed % 2 === 0 ? 'special' : 'basic',
      };
      const { state } = simulate<ExpeditionState>(expedition, players(n), seededRng(seed * 13 + n), { config });
      expect(state.phase).toBe('over');
      expect(state.results.length).toBeLessThanOrEqual(5);
      wins[state.outcome!.winner]++;
    }
    expect(wins.expedition).toBeGreaterThan(0);
    expect(wins.mutiny).toBeGreaterThan(0);
  }, 60_000);
});

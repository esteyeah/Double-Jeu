import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import { throne, type Edict, type Role, type ThroneConfig, type ThroneState } from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));

function setup(n = 5, seed = 1, config: ThroneConfig = { votes: 'secret' }): ThroneState {
  return throne.setup(players(n), config, seededRng(seed));
}

function play(s: ThroneState, by: string, move: unknown): ThroneState {
  const out = applyMove(throne, s, by, move, seededRng(9), 1000);
  if (!out.ok) throw new Error(`${by} ${JSON.stringify(move)} : ${out.error}`);
  return out.state;
}

const ok = (s: ThroneState, by: string, move: unknown) =>
  applyMove(throne, s, by, move, seededRng(9), 1000).ok;

/** Partie prête à jouer, avec rôles et pile imposés. */
function ready(n: number, roles: Role[], deck?: Edict[], config?: ThroneConfig): ThroneState {
  let s = setup(n, 3, config);
  s.roles = Object.fromEntries(roles.map((r, i) => [`p${i}`, r]));
  if (deck) s.deck = [...deck];
  s.rotation = 0;
  s.regent = 'p0';
  for (const p of s.players) s = play(s, p.id, { type: 'ack' });
  return s;
}

function voteAll(s: ThroneState, yes: boolean | ((id: string) => boolean)): ThroneState {
  for (const id of s.players.map((p) => p.id).filter((id) => !s.dead.includes(id))) {
    s = play(s, id, { type: 'vote', yes: typeof yes === 'function' ? yes(id) : yes });
  }
  return s;
}

/** Fait élire (regent, nominee) puis promulguer l'édit `want` s'il est en main. */
function government(s: ThroneState, nominee: string, want: Edict): ThroneState {
  s = play(s, s.regent, { type: 'nominate', target: nominee });
  s = voteAll(s, true);
  const discard = s.hand.findIndex((c) => c !== want);
  s = play(s, s.regent, { type: 'discard', index: discard === -1 ? 0 : discard });
  const keep = s.hand.indexOf(want);
  return play(s, nominee, { type: 'enact', index: keep === -1 ? 0 : keep });
}

const FIVE: Role[] = ['loyal', 'loyal', 'loyal', 'conspirator', 'usurper'];
const SEVEN: Role[] = ['loyal', 'loyal', 'loyal', 'loyal', 'conspirator', 'conspirator', 'usurper'];

describe('Le Trône Vide — mise en place et secrets', () => {
  it.each([5, 6, 7, 8, 9, 10])('distribue les rôles et 17 édits à %i joueurs', (n) => {
    const s = setup(n);
    const roles = Object.values(s.roles);
    expect(roles.filter((r) => r === 'usurper')).toHaveLength(1);
    expect(roles.filter((r) => r === 'loyal').length).toBeGreaterThan(n / 2);
    expect(s.deck.filter((c) => c === 'crown')).toHaveLength(6);
    expect(s.deck.filter((c) => c === 'shadow')).toHaveLength(11);
  });

  it('les Conjurés se connaissent et connaissent l’Usurpateur ; un Loyaliste ne sait rien', () => {
    const s = ready(7, SEVEN);
    const conj = throne.view(s, 'p4');
    expect(conj.me!.allies.map((a) => a.id).sort()).toEqual(['p5', 'p6']);
    const loyal = throne.view(s, 'p0');
    expect(loyal.me!.allies).toEqual([]);
    expect(loyal.players.filter((p) => p.role !== null).map((p) => p.id)).toEqual(['p0']);
    expect(JSON.stringify({ ...loyal, me: null, players: loyal.players.filter((p) => p.id !== 'p0') })).not.toMatch(
      /"(conspirator|usurper|loyal)"/,
    );
  });

  it('l’Usurpateur connaît ses Conjurés seulement à 5 ou 6 joueurs', () => {
    expect(throne.view(ready(5, FIVE), 'p4').me!.allies).toEqual([{ id: 'p3', role: 'conspirator' }]);
    expect(throne.view(ready(7, SEVEN), 'p6').me!.allies).toEqual([]);
  });

  it('la pile n’est jamais envoyée, la main seulement à celui qui la tient', () => {
    let s = ready(5, FIVE, ['crown', 'shadow', 'shadow', ...Array<Edict>(14).fill('shadow')]);
    s = play(s, 'p0', { type: 'nominate', target: 'p1' });
    s = voteAll(s, true);
    expect(throne.view(s, 'p0').me!.hand).toEqual(['crown', 'shadow', 'shadow']);
    expect(throne.view(s, 'p1').me!.hand).toBeNull();
    expect(JSON.stringify(throne.view(s, 'p2'))).not.toContain('"hand":["');
  });
});

describe('Le Trône Vide — gouvernements', () => {
  it('le dernier gouvernement élu est inéligible (le Régent redevient éligible à 5 survivants)', () => {
    let s = ready(7, SEVEN);
    s = government(s, 'p1', 'crown');
    expect(s.regent).toBe('p1');
    const v = throne.view(s, null);
    expect(v.players.find((p) => p.id === 'p0')!.eligible).toBe(false);
    expect(v.players.find((p) => p.id === 'p1')!.eligible).toBe(false); // lui-même
    expect(ok(s, 'p1', { type: 'nominate', target: 'p0' })).toBe(false);

    let five = ready(5, FIVE);
    five = government(five, 'p1', 'crown');
    expect(ok(five, 'p1', { type: 'nominate', target: 'p0' })).toBe(true);
  });

  it('majorité stricte : une égalité fait échouer le vote', () => {
    let s = ready(6, ['loyal', 'loyal', 'loyal', 'loyal', 'conspirator', 'usurper']);
    s = play(s, 'p0', { type: 'nominate', target: 'p1' });
    s = voteAll(s, (id) => ['p0', 'p1', 'p2'].includes(id));
    expect(s.lastVote!.passed).toBe(false);
    expect(s.agitation).toBe(1);
    expect(s.regent).toBe('p1');
  });

  it('trois rejets : émeute, l’édit du dessus passe sans pouvoir, mandats oubliés', () => {
    let s = ready(7, SEVEN, ['shadow', 'shadow', ...Array<Edict>(15).fill('crown')]);
    s.shadow = 1; // le 2e édit de l'Ombre donnerait « Enquête » à 7 joueurs
    s.lastSeneschal = 'p3';
    for (let i = 0; i < 3; i++) {
      const nominee = s.players.map((p) => p.id).find((id) => id !== s.regent && id !== s.lastSeneschal)!;
      s = play(s, s.regent, { type: 'nominate', target: nominee });
      s = voteAll(s, false);
    }
    expect(s.shadow).toBe(2);
    expect(s.agitation).toBe(0);
    expect(s.pendingPower).toBeNull();
    expect(s.phase).toBe('nomination');
    expect(s.lastSeneschal).toBeNull();
    expect(s.history.at(-1)).toMatchObject({ edict: 'shadow', regent: null });
  });

  it('session : le Régent défausse 1, le Sénéchal promulgue 1, la défausse garde les 2 autres', () => {
    let s = ready(5, FIVE, ['crown', 'shadow', 'crown', ...Array<Edict>(14).fill('shadow')]);
    s = play(s, 'p0', { type: 'nominate', target: 'p2' });
    s = voteAll(s, true);
    s = play(s, 'p0', { type: 'discard', index: 1 });
    expect(throne.view(s, 'p2').me!.hand).toEqual(['crown', 'crown']);
    expect(throne.view(s, 'p0').me!.passed).toEqual(['crown', 'crown']);
    s = play(s, 'p2', { type: 'enact', index: 0 });
    expect(s.crown).toBe(1);
    expect(s.discard.sort()).toEqual(['crown', 'shadow']);
  });

  it('vote à main levée : le Régent reporte, le vote individuel est refusé', () => {
    let s = ready(5, FIVE, undefined, { votes: 'hands' });
    s = play(s, 'p0', { type: 'nominate', target: 'p1' });
    expect(ok(s, 'p2', { type: 'vote', yes: true })).toBe(false);
    expect(ok(s, 'p2', { type: 'tally', yes: ['p0'] })).toBe(false);
    s = play(s, 'p0', { type: 'tally', yes: ['p0', 'p1', 'p2'] });
    expect(s.lastVote!.passed).toBe(true);
    expect(s.phase).toBe('regent');
  });
});

describe('Le Trône Vide — pouvoirs et victoires', () => {
  it('Succession : le Régent désigné gouverne, puis la rotation reprend après l’ancien Régent', () => {
    let s = ready(7, SEVEN, Array<Edict>(17).fill('shadow'));
    s.shadow = 2; // le 3e édit de l'Ombre donne « Succession » à 7 joueurs
    s = government(s, 'p1', 'shadow');
    expect(s.pendingPower).toBe('special');
    s = play(s, 'p0', { type: 'power', target: 'p5' });
    expect(s.regent).toBe('p5');
    s = play(s, 'p5', { type: 'nominate', target: 'p2' });
    s = voteAll(s, false);
    expect(s.regent).toBe('p1');
  });

  it('Enquête : seul le Régent apprend le camp, pas deux fois sur la même personne', () => {
    let s = ready(7, SEVEN, Array<Edict>(17).fill('shadow'));
    s.shadow = 1;
    s = government(s, 'p1', 'shadow');
    expect(s.pendingPower).toBe('investigate');
    s = play(s, 'p0', { type: 'power', target: 'p5' });
    expect(s.phase).toBe('powerResult');
    expect(throne.view(s, 'p0').me!.investigations).toEqual([{ target: 'p5', team: 'shadow' }]);
    expect(throne.view(s, 'p1').me!.investigations).toEqual([]);
    expect(throne.view(s, 'p1').log.join(' ')).not.toMatch(/sert/);
    s = play(s, 'p0', { type: 'power' });
    expect(s.regent).toBe('p1');
    s.shadow = 1;
    s = government(s, 'p2', 'shadow');
    expect(ok(s, 'p1', { type: 'power', target: 'p5' })).toBe(false);
  });

  it('Présage : le Régent voit les 3 prochains édits', () => {
    let s = ready(5, FIVE, [...Array<Edict>(3).fill('shadow'), 'crown', 'shadow', 'crown', ...Array<Edict>(11).fill('shadow')]);
    s.shadow = 2;
    s = government(s, 'p1', 'shadow');
    expect(s.pendingPower).toBe('peek');
    expect(throne.view(s, 'p0').me!.peek).toEqual(['crown', 'shadow', 'crown']);
    expect(throne.view(s, 'p1').me!.peek).toBeNull();
  });

  it('Exécution de l’Usurpateur : victoire de la Couronne ; un mort ne vote plus', () => {
    let s = ready(5, FIVE, Array<Edict>(17).fill('shadow'));
    s.shadow = 3;
    s = government(s, 'p1', 'shadow');
    expect(s.pendingPower).toBe('execute');
    s = play(s, 'p0', { type: 'power', target: 'p2' });
    expect(s.dead).toEqual(['p2']);
    expect(ok(s, 'p2', { type: 'vote', yes: true })).toBe(false);
    s.shadow = 3;
    s = government(s, s.regent === 'p1' ? 'p3' : 'p1', 'shadow');
    s = play(s, s.history.at(-1)!.regent!, { type: 'power', target: 'p4' });
    expect(throne.result(s)?.title).toMatch(/Couronne/);
  });

  it('Usurpateur élu Sénéchal après le 3e édit de l’Ombre : victoire de l’Ombre', () => {
    let s = ready(5, FIVE);
    s.shadow = 3;
    s = play(s, 'p0', { type: 'nominate', target: 'p4' });
    s = voteAll(s, true);
    expect(throne.result(s)?.title).toMatch(/Ombre/);
    expect(throne.result(s)?.winners.sort()).toEqual(['p3', 'p4']);
  });

  it('Veto après 5 édits de l’Ombre : accepté (rien ne passe) ou refusé (le Sénéchal promulgue)', () => {
    let s = ready(5, FIVE, Array<Edict>(17).fill('shadow'));
    s.shadow = 5;
    s = play(s, 'p0', { type: 'nominate', target: 'p1' });
    s = voteAll(s, true);
    s = play(s, 'p0', { type: 'discard', index: 0 });
    s = play(s, 'p1', { type: 'veto' });
    const refused = play(s, 'p0', { type: 'vetoAnswer', accept: false });
    expect(refused.phase).toBe('seneschal');
    expect(ok(refused, 'p1', { type: 'veto' })).toBe(false);
    const accepted = play(s, 'p0', { type: 'vetoAnswer', accept: true });
    expect(accepted.shadow).toBe(5);
    expect(accepted.agitation).toBe(1);
    expect(accepted.regent).toBe('p1');
  });

  it('cinq édits royaux : victoire de la Couronne', () => {
    let s = ready(5, FIVE, Array<Edict>(17).fill('crown'));
    s.crown = 4;
    s = government(s, 'p1', 'crown');
    expect(throne.result(s)?.winners.sort()).toEqual(['p0', 'p1', 'p2']);
  });
});

describe('Le Trône Vide — robustesse', () => {
  it.each([5, 6, 7, 8, 9, 10])('300 parties de bots à %i joueurs, édits toujours au compte', (n) => {
    const wins = { crown: 0, shadow: 0 };
    for (let seed = 0; seed < 300; seed++) {
      const config: ThroneConfig = { votes: seed % 4 === 0 ? 'hands' : 'secret' };
      const { state } = simulate<ThroneState>(throne, players(n), seededRng(seed * 7 + n), {
        config,
        onStep: (s) => {
          const total = s.deck.length + s.discard.length + s.hand.length + s.crown + s.shadow;
          expect(total).toBe(17);
        },
      });
      expect(state.phase).toBe('over');
      wins[state.outcome!.winner]++;
    }
    expect(wins.crown).toBeGreaterThan(0);
    expect(wins.shadow).toBeGreaterThan(0);
  });
});

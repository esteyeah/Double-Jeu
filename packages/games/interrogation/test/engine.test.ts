import { describe, expect, it } from 'vitest';
import { applyDeadline, applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import {
  CASES,
  WORDS,
  interrogation,
  normalizeWord,
  type InterrogationConfig,
  type InterrogationState,
} from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Joueur ${i}`, isBot: false }));

const setup = (n = 5, seed = 1, config: InterrogationConfig = { minutes: 5, rounds: 0 }) =>
  interrogation.setup(players(n), config, seededRng(seed));

function play(s: InterrogationState, by: string, move: unknown, now = 1_000): InterrogationState {
  const out = applyMove(interrogation, s, by, move, seededRng(3), now);
  if (!out.ok) throw new Error(out.error);
  return out.state;
}

const ackAll = (s: InterrogationState) =>
  s.players.reduce((st, p) => play(st, p.id, { type: 'ack' }), s);
const suspectsOf = (s: InterrogationState) => s.players.map((p) => p.id).filter((id) => id !== s.inspector);
const innocentsOf = (s: InterrogationState) => suspectsOf(s).filter((id) => id !== s.culprit);
const innocentOf = (s: InterrogationState) => innocentsOf(s)[0]!;

/** Clôt l'interrogatoire et fait parier chaque suspect (`found(id)` : « il va trouver »). */
function toAccusation(s: InterrogationState, found: (id: string) => boolean = () => false): InterrogationState {
  s = play(s, s.inspector, { type: 'close' });
  for (const id of suspectsOf(s)) s = play(s, id, { type: 'bet', found: found(id) });
  return s;
}

describe('Garde à vue — contenu', () => {
  it('les mots des innocents ne recoupent aucun indice ni aucun texte d’affaire', () => {
    const clueSet = new Set(CASES.flatMap((c) => c.clues).map(normalizeWord));
    const texts = CASES.map((c) => ` ${normalizeWord(`${c.title} ${c.text}`)} `);
    for (const w of WORDS) {
      const n = normalizeWord(w);
      expect(clueSet.has(n), `« ${w} » est aussi un indice`).toBe(false);
      for (const t of texts) expect(t.includes(` ${n} `), `« ${w} » apparaît dans une affaire`).toBe(false);
    }
  });

  it('pas de doublons, assez de mots et d’affaires', () => {
    expect(new Set(WORDS.map(normalizeWord)).size).toBe(WORDS.length);
    expect(CASES.length).toBeGreaterThanOrEqual(8);
    for (const c of CASES) expect(new Set(c.clues).size).toBe(6);
  });

  it('normalise casse, accents, tirets et pluriel', () => {
    expect(normalizeWord('Arcs en Ciel')).toBe(normalizeWord('arc-en-ciel'));
    expect(normalizeWord('ÉCLIPSES')).toBe(normalizeWord('éclipse'));
    expect(normalizeWord('  Ukulélé ')).toBe(normalizeWord('ukulele'));
  });
});

describe('Garde à vue — mots partagés et secret', () => {
  it.each([4, 6, 8])('à %i joueurs, tous les innocents ont la même liste, le Coupable une autre', (n) => {
    const s = setup(n);
    const innocents = innocentsOf(s);
    expect(innocents).toHaveLength(n - 2);
    const shared = s.words[innocents[0]!]!;
    expect(shared).toHaveLength(3);
    for (const id of innocents) expect(s.words[id]).toEqual(shared);
    const culprit = s.words[s.culprit]!;
    expect(CASES[s.caseIndex]!.clues).toEqual(expect.arrayContaining(culprit));
    expect(culprit.some((w) => shared.includes(w))).toBe(false);
    expect(s.words[s.inspector]).toBeUndefined();
  });

  it("l'Enquêteur ne voit ni le Coupable ni les mots", () => {
    const s = setup(5);
    const v = interrogation.view(s, s.inspector);
    expect(v.culprit).toBeNull();
    expect(v.reveal).toBeNull();
    expect(v.me?.words).toEqual([]);
    for (const p of v.players) if (p.id !== s.inspector) expect(p.role).toBeNull();
    const json = JSON.stringify(v);
    for (const id of suspectsOf(s)) for (const w of s.words[id]!) expect(json).not.toContain(`"${w}"`);
  });

  it('le Coupable ne voit pas la liste des innocents', () => {
    const s = setup(6);
    const json = JSON.stringify(interrogation.view(s, s.culprit));
    for (const w of s.words[innocentOf(s)]!) expect(json).not.toContain(`"${w}"`);
  });

  it('griller un mot partagé ne le brûle que chez ce suspect', () => {
    let s = ackAll(setup(6, 2));
    const [a, b] = innocentsOf(s);
    const word = s.words[a!]![0]!;
    s = play(s, s.inspector, { type: 'grill', target: a!, word });
    expect(s.burned[a!]).toEqual([word]);
    expect(s.burned[b!]).toBeUndefined();
  });
});

describe('Garde à vue — interrogatoire, paris et accusation', () => {
  it('griller un vrai mot le brûle, un faux est raté, 3 essais maximum', () => {
    let s = ackAll(setup(5, 2));
    const target = innocentOf(s);
    const word = s.words[target]![0]!;
    s = play(s, s.inspector, { type: 'grill', target, word: word.toUpperCase() });
    expect(s.grills.at(-1)?.hit).toBe(true);
    s = play(s, s.inspector, { type: 'grill', target, word: 'zzz' });
    expect(s.grills.at(-1)?.hit).toBe(false);
    s = play(s, s.inspector, { type: 'grill', target: s.culprit, word: 'pas-un-mot' });
    expect(applyMove(interrogation, s, s.inspector, { type: 'grill', target, word: 'autre' }, seededRng(1)).ok).toBe(false);
  });

  it('on ne peut accuser qu’après les paris ; seul l’Enquêteur clôt et accuse', () => {
    let s = ackAll(setup(5));
    const sus = innocentOf(s);
    expect(interrogation.validate(s, s.inspector, { type: 'accuse', target: s.culprit })).not.toBeNull();
    expect(interrogation.validate(s, sus, { type: 'close' })).not.toBeNull();
    s = play(s, s.inspector, { type: 'close' });
    expect(s.phase).toBe('bets');
    expect(interrogation.validate(s, s.inspector, { type: 'bet', found: true })).toMatch(/ne parie pas/);
    expect(interrogation.validate(s, s.inspector, { type: 'grill', target: sus, word: 'x' })).toMatch(/terminé/);
    s = play(s, sus, { type: 'bet', found: true });
    expect(interrogation.validate(s, sus, { type: 'bet', found: false })).toMatch(/déjà/);
  });

  it('les paris restent secrets jusqu’à l’accusation', () => {
    let s = ackAll(setup(5, 6));
    s = play(s, s.inspector, { type: 'close' });
    const [a, b] = suspectsOf(s);
    s = play(s, a!, { type: 'bet', found: true });
    const v = interrogation.view(s, b!);
    expect(v.players.find((p) => p.id === a)).toMatchObject({ betDone: true });
    expect(v.bets).toBeNull();
    expect(interrogation.view(s, a!).me!.myBet).toBe(true);
    for (const id of suspectsOf(s)) if (id !== a) s = play(s, id, { type: 'bet', found: false });
    expect(s.phase).toBe('accusation');
    expect(s.endsAt).toBe(1_000 + 60_000);
    s = play(s, s.inspector, { type: 'accuse', target: s.culprit });
    expect(interrogation.view(s, b!).bets).toMatchObject({ [a!]: true });
  });

  it('un suspect ne peut déclarer que ses mots non grillés', () => {
    let s = ackAll(setup(5, 4));
    const target = innocentOf(s);
    const [w0, w1] = s.words[target]!;
    s = play(s, s.inspector, { type: 'grill', target, word: w0! });
    s = toAccusation(s);
    s = play(s, s.inspector, { type: 'accuse', target: s.culprit });
    expect(interrogation.validate(s, target, { type: 'declare', placed: [w0!] })).toMatch(/grillé/);
    expect(interrogation.validate(s, target, { type: 'declare', placed: ['girafe-inventée'] })).not.toBeNull();
    expect(interrogation.validate(s, target, { type: 'declare', placed: [w1!] })).toBeNull();
  });
});

describe('Garde à vue — points', () => {
  /** 5 joueurs : l'Enquêteur grille 1 mot chez un innocent, tous parient `found`, accusation, tout est déclaré. */
  function roundWith(accuseCulprit: boolean, found: boolean) {
    let s = ackAll(setup(5, 7));
    const innocent = innocentOf(s);
    s = play(s, s.inspector, { type: 'grill', target: innocent, word: s.words[innocent]![0]! });
    s = toAccusation(s, () => found);
    s = play(s, s.inspector, { type: 'accuse', target: accuseCulprit ? s.culprit : innocent });
    for (const id of suspectsOf(s)) {
      const usable = s.words[id]!.filter((w) => !(s.burned[id] ?? []).includes(w));
      s = play(s, id, { type: 'declare', placed: usable });
    }
    expect(s.phase).toBe('verify');
    for (const p of s.players) s = play(s, p.id, { type: 'verify', doubts: [] });
    const other = innocentsOf(s).find((id) => id !== innocent)!;
    return { s, innocent, other };
  }

  it('Coupable arrêté, paris « il va trouver » gagnants (sauf pour le Coupable)', () => {
    const { s, innocent, other } = roundWith(true, true);
    expect(s.phase).toBe('scores');
    expect(s.scores[s.inspector]).toBe(4); // +3 arrestation, +1 mot grillé
    expect(s.scores[s.culprit]).toBe(0); // arrêté : rien, même avec un pari juste
    expect(s.scores[innocent]).toBe(2 + 2); // 2 mots + pari
    expect(s.scores[other]).toBe(3 + 2); // 3 mots + pari
  });

  it('Coupable en fuite, paris « il va se tromper » gagnants ; l’innocent accusé à tort gagne +1', () => {
    const { s, innocent, other } = roundWith(false, false);
    expect(s.scores[s.inspector]).toBe(1);
    expect(s.scores[s.culprit]).toBe(3 + 3 + 2); // fuite + 3 mots + pari
    expect(s.scores[innocent]).toBe(2 + 1 + 2); // 2 mots + accusé à tort + pari
    expect(s.scores[other]).toBe(3 + 2);
  });

  it('un pari perdu ne rapporte rien', () => {
    const { s, other } = roundWith(true, false);
    expect(s.scores[other]).toBe(3);
  });

  it('la vue révèle tout après l’accusation', () => {
    const { s } = roundWith(true, true);
    const v = interrogation.view(s, null);
    expect(v.culprit).toBe(s.culprit);
    expect(v.players.every((p) => p.role !== null)).toBe(true);
    expect(Object.keys(v.reveal!)).toHaveLength(4);
    expect(v.lastRound).toHaveLength(5);
  });
});

describe('Garde à vue — chrono imposé', () => {
  it('à la fin du chrono : paris, puis une minute pour accuser', () => {
    let s = ackAll(setup(5, 21));
    const end = s.endsAt!;
    expect(interrogation.deadline!(s)).toBe(end);
    expect(applyDeadline(interrogation, s, seededRng(1), end - 1)).toBeNull();
    s = applyDeadline(interrogation, s, seededRng(1), end)!;
    expect(s.phase).toBe('bets');
    expect(interrogation.deadline!(s)).toBeNull(); // pas de chrono pendant les paris
    for (const id of suspectsOf(s)) s = play(s, id, { type: 'bet', found: true }, end + 5_000);
    expect(s.phase).toBe('accusation');
    expect(s.endsAt).toBe(end + 5_000 + 60_000);
  });

  it('sans accusation à temps, le Coupable s’échappe (et les paris « il va se tromper » gagnent)', () => {
    let s = ackAll(setup(5, 22));
    s = applyDeadline(interrogation, s, seededRng(1), s.endsAt!)!;
    for (const id of suspectsOf(s)) s = play(s, id, { type: 'bet', found: false });
    s = applyDeadline(interrogation, s, seededRng(1), s.endsAt!)!;
    expect(s.phase).toBe('review');
    expect(s.accused).toBeNull();
    for (const id of suspectsOf(s)) s = play(s, id, { type: 'declare', placed: [] });
    expect(s.phase).toBe('scores');
    expect(s.scores[s.culprit]).toBe(3 + 2);
    expect(s.scores[s.inspector]).toBe(0);
    expect(s.lastRound?.[0]?.reasons).toContain('Aucune accusation');
  });
});

describe('Garde à vue — vérification par la table', () => {
  function toVerify(seed = 30) {
    let s = ackAll(setup(5, seed));
    s = toAccusation(s);
    s = play(s, s.inspector, { type: 'accuse', target: s.culprit });
    for (const id of suspectsOf(s)) s = play(s, id, { type: 'declare', placed: s.words[id]!.slice(0, 1) });
    return s;
  }

  it('un mot signalé par la majorité des autres joueurs est refusé, pas en cas d’égalité', () => {
    let s = toVerify();
    const [a, b] = innocentsOf(s);
    const wa = s.words[a!]![0]!;
    const wb = s.words[b!]![0]!;
    const others = (id: string) => s.players.map((p) => p.id).filter((x) => x !== id);
    const doubtersA = others(a!).slice(0, 3);
    const doubtersB = others(b!).slice(0, 2);
    for (const p of s.players) {
      const doubts = [
        ...(doubtersA.includes(p.id) && p.id !== a ? [{ target: a!, word: wa }] : []),
        ...(doubtersB.includes(p.id) && p.id !== b ? [{ target: b!, word: wb }] : []),
      ];
      s = play(s, p.id, { type: 'verify', doubts });
    }
    expect(s.phase).toBe('scores');
    expect(s.rejected[a!]).toEqual([wa]);
    expect(s.rejected[b!]).toBeUndefined();
    const v = interrogation.view(s, null);
    expect(v.reveal![a!]!.find((w) => w.word === wa)).toMatchObject({ rejected: true, doubts: 3 });
    expect(v.reveal![b!]!.find((w) => w.word === wb)).toMatchObject({ rejected: false, doubts: 2 });
  });

  it('on ne peut pas douter de ses propres mots ni d’un mot non déclaré', () => {
    const s = toVerify(31);
    const a = innocentOf(s);
    expect(interrogation.validate(s, a, { type: 'verify', doubts: [{ target: a, word: s.words[a]![0]! }] })).not.toBeNull();
    expect(
      interrogation.validate(s, s.inspector, { type: 'verify', doubts: [{ target: a, word: s.words[a]![2]! }] }),
    ).toMatch(/pas été déclaré/);
  });

  it('les signalements restent secrets jusqu’au verdict', () => {
    let s = toVerify(32);
    const a = innocentOf(s);
    s = play(s, s.inspector, { type: 'verify', doubts: [{ target: a, word: s.words[a]![0]! }] });
    const v = interrogation.view(s, a);
    expect(v.reveal![a]!.every((w) => w.doubts === null && w.rejected === null)).toBe(true);
  });

  it('si personne ne déclare de mot, on passe directement aux points', () => {
    let s = ackAll(setup(4, 33));
    s = toAccusation(s);
    s = play(s, s.inspector, { type: 'accuse', target: s.culprit });
    for (const id of suspectsOf(s)) s = play(s, id, { type: 'declare', placed: [] });
    expect(s.phase).toBe('scores');
  });
});

describe('Garde à vue — déroulé', () => {
  it('chacun enquête une fois, sans répéter une affaire, puis fin de partie', () => {
    const n = 5;
    const inspectors: string[] = [];
    const cases = new Set<number>();
    const { state } = simulate<InterrogationState>(interrogation, players(n), seededRng(11), {
      config: { minutes: 3, rounds: 0 },
      onStep: (s) => {
        if (s.phase === 'briefing' && !inspectors.includes(s.inspector)) inspectors.push(s.inspector);
        cases.add(s.caseIndex);
      },
    });
    expect(state.phase).toBe('over');
    expect(inspectors.sort()).toEqual(players(n).map((p) => p.id).sort());
    expect(cases.size).toBe(n);
    expect(interrogation.result(state)?.winners.length).toBeGreaterThan(0);
  });

  it.each([4, 5, 6, 7, 8])('200 parties simulées à %i joueurs se terminent', (n) => {
    for (let seed = 0; seed < 200; seed++) {
      const config: InterrogationConfig = { minutes: 5, rounds: ([0, 3, 5] as const)[seed % 3]! };
      const { state } = simulate<InterrogationState>(interrogation, players(n), seededRng(seed + n * 1000), { config });
      expect(state.phase).toBe('over');
      expect(state.round).toBe(config.rounds === 0 ? n : config.rounds);
    }
  });
});

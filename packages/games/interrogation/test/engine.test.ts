import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
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
const innocentOf = (s: InterrogationState) => suspectsOf(s).find((id) => id !== s.culprit)!;

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
    expect(WORDS.length).toBeGreaterThanOrEqual(7 * 3 * 2);
    expect(CASES.length).toBeGreaterThanOrEqual(8);
    for (const c of CASES) expect(new Set(c.clues).size).toBe(6);
  });

  it('normalise casse, accents, tirets et pluriel', () => {
    expect(normalizeWord('Arcs en Ciel')).toBe(normalizeWord('arc-en-ciel'));
    expect(normalizeWord('ÉCLIPSES')).toBe(normalizeWord('éclipse'));
    expect(normalizeWord('  Ukulélé ')).toBe(normalizeWord('ukulele'));
  });
});

describe('Garde à vue — mise en place et secret', () => {
  it.each([4, 6, 8])('distribue rôles et mots à %i joueurs', (n) => {
    const s = setup(n);
    const sus = suspectsOf(s);
    expect(sus).toHaveLength(n - 1);
    expect(sus).toContain(s.culprit);
    expect(CASES[s.caseIndex]!.clues).toEqual(expect.arrayContaining(s.words[s.culprit]!));
    const all = sus.flatMap((id) => s.words[id]!);
    expect(all).toHaveLength((n - 1) * 3);
    expect(new Set(all).size).toBe(all.length);
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

  it('un suspect ne voit que ses propres mots et son propre rôle', () => {
    const s = setup(6);
    const me = innocentOf(s);
    const v = interrogation.view(s, me);
    expect(v.me?.role).toBe('innocent');
    expect(v.me?.words.map((w) => w.word)).toEqual(s.words[me]);
    const others = JSON.stringify({ ...v, me: null });
    for (const id of suspectsOf(s)) {
      if (id === me) continue;
      for (const w of s.words[id]!) expect(others).not.toContain(`"${w}"`);
    }
    expect(v.players.find((p) => p.id === s.culprit)?.role).toBeNull();
  });

  it('le chrono démarre quand tout le monde a lu son rôle', () => {
    let s = setup(4);
    expect(interrogation.expectedActors(s)).toHaveLength(4);
    s = ackAll(s);
    expect(s.phase).toBe('interrogation');
    expect(s.endsAt).toBe(1_000 + 5 * 60_000);
  });
});

describe('Garde à vue — interrogatoire', () => {
  it('griller un vrai mot le brûle, un faux est raté, 3 essais maximum', () => {
    let s = ackAll(setup(5, 2));
    const target = innocentOf(s);
    const word = s.words[target]![0]!;
    s = play(s, s.inspector, { type: 'grill', target, word: word.toUpperCase() });
    expect(s.burned[target]).toEqual([word]);
    expect(s.grills.at(-1)?.hit).toBe(true);
    s = play(s, s.inspector, { type: 'grill', target, word: 'zzz' });
    expect(s.grills.at(-1)?.hit).toBe(false);
    s = play(s, s.inspector, { type: 'grill', target: s.culprit, word: 'pas-un-mot' });
    expect(
      applyMove(interrogation, s, s.inspector, { type: 'grill', target, word: 'autre' }, seededRng(1)).ok,
    ).toBe(false);
  });

  it('seul l’Enquêteur grille et accuse, et jamais lui-même', () => {
    const s = ackAll(setup(5));
    const sus = innocentOf(s);
    expect(interrogation.validate(s, sus, { type: 'accuse', target: s.culprit })).not.toBeNull();
    expect(interrogation.validate(s, s.inspector, { type: 'accuse', target: s.inspector })).not.toBeNull();
    expect(interrogation.validate(s, s.inspector, { type: 'grill', target: '__proto__', word: 'x' })).not.toBeNull();
  });

  it('un suspect ne peut déclarer que ses mots non grillés', () => {
    let s = ackAll(setup(5, 4));
    const target = innocentOf(s);
    const [w0, w1] = s.words[target]!;
    s = play(s, s.inspector, { type: 'grill', target, word: w0! });
    s = play(s, s.inspector, { type: 'accuse', target: s.culprit });
    expect(interrogation.validate(s, target, { type: 'declare', placed: [w0!] })).toMatch(/grillé/);
    expect(interrogation.validate(s, target, { type: 'declare', placed: ['girafe-inventée'] })).not.toBeNull();
    expect(interrogation.validate(s, target, { type: 'declare', placed: [w1!] })).toBeNull();
  });
});

describe('Garde à vue — points', () => {
  function roundWith(accuseCulprit: boolean) {
    let s = ackAll(setup(5, 7));
    const innocent = innocentOf(s);
    s = play(s, s.inspector, { type: 'grill', target: innocent, word: s.words[innocent]![0]! });
    s = play(s, s.inspector, { type: 'accuse', target: accuseCulprit ? s.culprit : innocent });
    for (const id of suspectsOf(s)) {
      const usable = s.words[id]!.filter((w) => !(s.burned[id] ?? []).includes(w));
      s = play(s, id, { type: 'declare', placed: usable });
    }
    return { s, innocent };
  }

  it('Coupable arrêté : +3 et +1 par mot grillé pour l’Enquêteur, rien pour le Coupable', () => {
    const { s, innocent } = roundWith(true);
    expect(s.phase).toBe('scores');
    expect(s.scores[s.inspector]).toBe(4);
    expect(s.scores[s.culprit]).toBe(0);
    expect(s.scores[innocent]).toBe(2);
  });

  it('Coupable en fuite : +3 et ses mots ; l’innocent accusé à tort gagne +1', () => {
    const { s, innocent } = roundWith(false);
    expect(s.scores[s.inspector]).toBe(1);
    expect(s.scores[s.culprit]).toBe(6);
    expect(s.scores[innocent]).toBe(3);
  });

  it('la vue révèle tout après l’accusation', () => {
    const { s } = roundWith(true);
    const v = interrogation.view(s, null);
    expect(v.culprit).toBe(s.culprit);
    expect(v.players.every((p) => p.role !== null)).toBe(true);
    expect(Object.keys(v.reveal!)).toHaveLength(4);
    expect(v.lastRound).toHaveLength(5);
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
      const { state } = simulate<InterrogationState>(interrogation, players(n), seededRng(seed + n * 1000), {
        config,
      });
      expect(state.phase).toBe('over');
      expect(state.round).toBe(config.rounds === 0 ? n : config.rounds);
    }
  });
});

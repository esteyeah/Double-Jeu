import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import { reactor, type ReactorState } from '../src';

const players = (n: number): PlayerInfo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Joueur ${i}`, isBot: false }));

const setup = (n: number, seed = 1) => reactor.setup(players(n), {}, seededRng(seed));

function play(state: ReactorState, by: string, move: unknown, seed = 7): ReactorState {
  const out = applyMove(reactor, state, by, move, seededRng(seed));
  if (!out.ok) throw new Error(out.error);
  return out.state;
}

function ackAll(state: ReactorState): ReactorState {
  return state.players.reduce((s, p) => play(s, p.id, { type: 'ack' }), state);
}

/** Trouve chez un autre joueur que `holder` une trappe fermée du type voulu. */
function findSlot(s: ReactorState, kind: string) {
  for (const p of s.players) {
    if (p.id === s.holder) continue;
    const slot = s.hands[p.id]!.findIndex((c) => c.kind === kind && !c.revealed);
    if (slot >= 0) return { target: p.id, slot };
  }
  return null;
}

describe('Réacteur — mise en place', () => {
  it.each([4, 5, 6, 7, 8])('distribue correctement à %i joueurs', (n) => {
    const s = setup(n);
    const all = Object.values(s.hands).flat();
    expect(all).toHaveLength(5 * n);
    expect(all.filter((c) => c.kind === 'rod')).toHaveLength(n);
    expect(all.filter((c) => c.kind === 'overload')).toHaveLength(1);
    for (const p of s.players) expect(s.hands[p.id]).toHaveLength(5);
    const sabs = Object.values(s.roles).filter((r) => r === 'saboteur').length;
    expect(s.saboteursPossible).toContain(sabs);
    expect(s.phase).toBe('reveal');
  });

  it('refuse un nombre de joueurs hors limites', () => {
    expect(() => setup(3)).toThrow();
    expect(() => setup(9)).toThrow();
  });
});

describe('Réacteur — information secrète', () => {
  it("la vue d'un joueur ne contient ni les rôles ni les cartes des autres", () => {
    const s = setup(5);
    const v = reactor.view(s, 'p0');
    expect(v.me?.role).toBe(s.roles.p0);
    for (const p of v.players) {
      expect(p.slots.every((k) => k === null)).toBe(true);
      if (p.id !== 'p0') expect(p.role).toBeNull();
    }
    // Les comptes de sa propre main sont exacts.
    const hand = s.hands.p0!;
    expect(v.me?.hand.rod).toBe(hand.filter((c) => c.kind === 'rod').length);
  });

  it('un spectateur ne voit aucun rôle', () => {
    const v = reactor.view(setup(6), null);
    expect(v.me).toBeNull();
    expect(v.players.every((p) => p.role === null)).toBe(true);
  });

  it('la vue sérialisée ne contient aucune trace des cartes cachées', () => {
    const s = setup(4);
    const v = reactor.view(s, 'p1');
    // En dehors de ce qui concerne p1 lui-même, aucun type de carte ni rôle ne doit apparaître.
    const others = JSON.stringify({ ...v, me: null, players: v.players.filter((p) => p.id !== 'p1') });
    expect(others).not.toMatch(/"(rod|overload|empty|tech|saboteur)"/);
  });

  it('tout est révélé en fin de partie', () => {
    let s = ackAll(setup(5, 3));
    s = play(s, s.holder, { type: 'cut', ...findSlot(s, 'overload')! });
    const v = reactor.view(s, null);
    expect(v.phase).toBe('over');
    expect(v.players.every((p) => p.role !== null)).toBe(true);
    expect(v.players.every((p) => p.slots.every((k) => k !== null))).toBe(true);
  });
});

describe('Réacteur — règles', () => {
  it("n'autorise l'ouverture qu'au porteur de la clé, chez un autre joueur", () => {
    const s = ackAll(setup(5));
    const other = s.players.find((p) => p.id !== s.holder)!.id;
    expect(reactor.validate(s, other, { type: 'cut', target: s.holder, slot: 0 })).not.toBeNull();
    expect(reactor.validate(s, s.holder, { type: 'cut', target: s.holder, slot: 0 })).not.toBeNull();
    expect(reactor.validate(s, s.holder, { type: 'cut', target: other, slot: 0 })).toBeNull();
  });

  it('refuse les cibles forgées par un client malveillant', () => {
    const s = ackAll(setup(5));
    for (const target of ['__proto__', 'constructor', 'inconnu']) {
      expect(applyMove(reactor, s, s.holder, { type: 'cut', target, slot: 0 }, seededRng(1)).ok).toBe(
        false,
      );
    }
    expect(applyMove(reactor, s, s.holder, { type: 'cut', target: 'p1', slot: 99 }, seededRng(1)).ok).toBe(
      false,
    );
    expect(applyMove(reactor, s, 'intrus', { type: 'ack' }, seededRng(1)).ok).toBe(false);
  });

  it("pas d'ouverture tant que tout le monde n'a pas vu ses cartes", () => {
    const s = setup(4);
    expect(reactor.expectedActors(s)).toHaveLength(4);
    const target = s.players.find((p) => p.id !== s.holder)!.id;
    expect(reactor.validate(s, s.holder, { type: 'cut', target, slot: 0 })).not.toBeNull();
  });

  it('ouvrir la Surcharge fait gagner les Saboteurs', () => {
    let s = ackAll(setup(6, 11));
    s = play(s, s.holder, { type: 'cut', ...findSlot(s, 'overload')! });
    expect(reactor.result(s)?.title).toMatch(/Saboteurs/);
    const sabs = s.players.filter((p) => s.roles[p.id] === 'saboteur').map((p) => p.id);
    expect(reactor.result(s)?.winners.sort()).toEqual(sabs.sort());
  });

  it('une manche se termine après N ouvertures et redistribue une carte de moins', () => {
    let s = ackAll(setup(4, 5));
    for (let i = 0; i < 4; i++) {
      const pick = findSlot(s, 'empty') ?? findSlot(s, 'rod');
      s = play(s, s.holder, { type: 'cut', ...pick! });
      if (s.phase === 'over') return; // toutes les barres trouvées par chance : rien à tester ici
    }
    expect(s.round).toBe(2);
    expect(s.phase).toBe('reveal');
    for (const p of s.players) expect(s.hands[p.id]).toHaveLength(4);
    expect(Object.values(s.hands).flat().every((c) => !c.revealed)).toBe(true);
  });
});

describe('Réacteur — robustesse (parties simulées)', () => {
  it.each([4, 5, 6, 7, 8])('500 parties de bots à %i joueurs se terminent sans erreur', (n) => {
    const wins = { tech: 0, saboteur: 0 };
    for (let seed = 0; seed < 500; seed++) {
      const rng = seededRng(seed * 31 + n);
      const { state } = simulate<ReactorState>(reactor, players(n), rng, {
        onStep: (s) => {
          // Invariant : cartes en jeu + cartes ouvertes des manches passées = 5N.
          const inPlay = Object.values(s.hands).flat().length;
          const removed = s.reveals.filter((r) => r.round < s.round).length;
          expect(inPlay + removed).toBe(5 * n);
        },
      });
      expect(state.phase).toBe('over');
      wins[state.outcome!.winner]++;
    }
    // Les deux camps doivent pouvoir gagner.
    expect(wins.tech).toBeGreaterThan(0);
    expect(wins.saboteur).toBeGreaterThan(0);
  });
});

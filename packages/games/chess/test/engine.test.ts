import { describe, expect, it } from 'vitest';
import { applyMove, seededRng, simulate, type PlayerInfo } from '@arcade/game-sdk';
import { chess, type ChessConfig, type ChessState } from '../src';
import { legalMoves, newCore, simMove, type Core } from '../src/core';

const players: PlayerInfo[] = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: false },
];
const base: ChessConfig = { modes: [], constraints: 2, reward: 'win', walled: true };

function perft(s: Core, d: number): number {
  if (!d) return 1;
  let n = 0;
  for (const m of legalMoves(s, s.turn)) {
    const t = simMove(s, m);
    t.turn = s.turn === 'w' ? 'b' : 'w';
    n += perft(t, d - 1);
  }
  return n;
}

describe('échecs classiques', () => {
  it('compte les coups depuis la position initiale (perft)', () => {
    expect([1, 2, 3].map((d) => perft(newCore(base), d))).toEqual([20, 400, 8902]);
  });

  it('refuse un coup hors tour et applique un coup légal', () => {
    let s = chess.setup(players, base, seededRng(1));
    const white = s.players.w.id;
    const black = s.players.b.id;
    expect(chess.validate(s, black, { t: 'move', fr: 1, fc: 4, tr: 3, tc: 4 })).toBe('Ce n’est pas ton tour.');
    const out = applyMove<ChessState>(chess, s, white, { t: 'move', fr: 6, fc: 4, tr: 4, tc: 4 }, seededRng(1));
    expect(out.ok).toBe(true);
    if (out.ok) s = out.state;
    expect(s.core.turn).toBe('b');
  });

  it('ne montre pas les secrets de l’adversaire', () => {
    const s = chess.setup(players, { ...base, modes: ['missions'] }, seededRng(3));
    const v = chess.view(s, s.players.w.id);
    expect(v.mine?.constraints.length).toBe(2);
    expect(v.reveal).toBeNull();
    expect(JSON.stringify(v)).not.toContain(s.core.secrets.b.mission!.text === s.core.secrets.w.mission!.text ? '§' : s.core.secrets.b.mission!.text);
  });
});

describe('retour en arrière et revue', () => {
  const go = (s: ChessState, by: string, mv: unknown) => {
    const out = applyMove<ChessState>(chess, s, by, mv, seededRng(1));
    if (!out.ok) throw new Error(out.error);
    return out.state;
  };
  it('annule un coup seulement si l’adversaire accepte', () => {
    let s = chess.setup(players, base, seededRng(2));
    const w = s.players.w.id,
      b = s.players.b.id;
    s = go(s, w, { t: 'move', fr: 6, fc: 4, tr: 4, tc: 4 });
    s = go(s, w, { t: 'undo-request' });
    expect(chess.expectedActors(s)).toEqual([b]);
    expect(chess.validate(s, b, { t: 'move', fr: 1, fc: 4, tr: 3, tc: 4 })).toMatch(/demande/);
    const refused = go(s, b, { t: 'undo-decline' });
    expect(refused.core.history.length).toBe(1);
    s = go(s, b, { t: 'undo-accept' });
    expect(s.core.history.length).toBe(0);
    expect(s.core.turn).toBe('w');
    // Après la réponse adverse, annuler revient deux demi-coups en arrière.
    s = go(s, w, { t: 'move', fr: 6, fc: 4, tr: 4, tc: 4 });
    s = go(s, b, { t: 'move', fr: 1, fc: 4, tr: 3, tc: 4 });
    s = go(s, w, { t: 'undo-request' });
    s = go(s, b, { t: 'undo-accept' });
    expect(s.core.history.length).toBe(0);
    expect(s.core.turn).toBe('w');
  });
  it('donne toutes les positions en fin de partie', () => {
    let s = chess.setup(players, base, seededRng(5));
    const w = s.players.w.id;
    expect(chess.view(s, w).frames).toBeNull();
    s = go(s, w, { t: 'move', fr: 6, fc: 4, tr: 4, tc: 4 });
    s = go(s, w, { t: 'resign' });
    expect(chess.view(s, w).frames?.length).toBe(2);
  });
});

describe('simulation', () => {
  const combos: ChessConfig[] = [
    base,
    { ...base, modes: ['missions'], constraints: 5 },
    { ...base, modes: ['missions'], reward: 'queen' },
    { ...base, modes: ['vanish'] },
    { ...base, modes: ['vanish'], walled: false },
    { ...base, modes: ['imposter', 'swap'] },
    { ...base, modes: ['missions', 'vanish', 'imposter', 'swap', 'blind'], reward: 'queen' },
  ];
  it('des centaines de parties entre bots se terminent sans erreur', () => {
    let i = 0;
    for (const config of combos)
      for (let k = 0; k < 40; k++) {
        const { state } = simulate<ChessState>(chess, players, seededRng(++i), { config, maxSteps: 3000 });
        expect(state.phase === 'over' || state.core.history.length > 0).toBe(true);
      }
  }, 120_000);
});

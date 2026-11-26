import type { PlayerId, Rng } from '@arcade/game-sdk';
import type { ChessMove, ChessView } from './shared';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as const;

/**
 * Bot simple : choisit ses traîtres au hasard, préfère les captures les plus riches,
 * sinon joue un coup au hasard. Sert surtout à remplacer un joueur déconnecté.
 */
export function chessBot(view: ChessView, me: PlayerId, rng: Rng): ChessMove | null {
  const c = view.me;
  if (!c || view.phase === 'over') return null;
  if (view.drawOffer && view.drawOffer !== c) return { t: 'draw-accept' };
  if (view.undoRequest && view.undoRequest !== c) return { t: 'undo-accept' };
  if (view.phase === 'pick') {
    if (view.picked[c]) return null;
    const pawns: number[] = [];
    const others: number[] = [];
    for (const row of view.board)
      for (const p of row) {
        if (!p || p.color === c || p.type === 'k') continue;
        (p.type === 'p' ? pawns : others).push(p.id);
      }
    if (!pawns.length || !others.length) return null;
    return { t: 'pick', pawn: rng.pick(pawns), piece: rng.pick(others) };
  }
  const legal = view.legal;
  if (!legal || view.turn !== c) return null;
  if (view.phase === 'place') {
    const sq = legal.place.length ? rng.pick(legal.place) : null;
    return sq ? { t: 'place', r: sq[0], c: sq[1] } : null;
  }
  if (legal.moves.length) {
    let best = -1;
    let picks = legal.moves;
    for (const m of legal.moves) {
      const t = m.capture ? view.board[m.tr]?.[m.tc]?.type : undefined;
      const v = t ? VAL[t] : m.capture ? 1 : 0;
      if (v > best) {
        best = v;
        picks = [m];
      } else if (v === best) picks.push(m);
    }
    const m = best > 0 && rng.int(4) > 0 ? rng.pick(picks) : rng.pick(legal.moves);
    return { t: 'move', fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc, ...(m.needPromo ? { promo: 'q' as const } : {}) };
  }
  if (legal.swaps.length) {
    const a = rng.pick(legal.swaps);
    return { t: 'swap', fr: a.fr, fc: a.fc, tr: a.tr, tc: a.tc };
  }
  if (legal.flips.length) return { t: 'flip', id: rng.pick(legal.flips).id };
  return null;
}

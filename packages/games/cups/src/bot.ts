import type { PlayerId, Rng } from '@arcade/game-sdk';
import { FACES, countFace, isLegalBid, minQuantity, wild, type CupsMove, type CupsView, type Face } from './shared';

const chance = (rng: Rng, p: number) => rng.int(1000) < p * 1000;

/** P(X ≥ k) pour X ~ Binomiale(n, p). */
function atLeast(n: number, p: number, k: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let term = (1 - p) ** n; // P(X = 0)
  let below = 0;
  for (let i = 0; i < k; i++) {
    below += term;
    term = (term * (n - i) * p) / ((i + 1) * (1 - p));
  }
  return Math.max(0, 1 - below);
}

/** P(X = k) pour X ~ Binomiale(n, p). */
function exactly(n: number, p: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return atLeast(n, p, k) - atLeast(n, p, k + 1);
}

/**
 * Bot de Gobelets : il ne connaît que ses dés et les enchères de la manche.
 * Il estime la probabilité de chaque enchère (loi binomiale sur les dés cachés),
 * en tenant un peu compte des valeurs annoncées par les autres.
 */
export function cupsBot(view: CupsView, me: PlayerId, rng: Rng): CupsMove | null {
  if (view.phase !== 'bid' || view.active !== me || !view.me) return null;
  const mine = view.me.dice;
  const hidden = view.totalDice - mine.length;
  const dry = view.dry;

  // Les autres annoncent souvent ce qu'ils ont : un petit bonus par enchère adverse sur une valeur.
  const hint = (face: Face) =>
    0.5 * view.history.filter((b) => b.by !== me && (b.face === face || (wild(face, dry) && b.face === 1))).length;

  const odds = (face: Face) => (wild(face, dry) ? 1 / 3 : 1 / 6);
  const known = (face: Face) => countFace(mine, face, dry) + hint(face);
  const pTrue = (quantity: number, face: Face) => atLeast(hidden, odds(face), Math.ceil(quantity - known(face)));

  const bid = view.bid;
  // Ouverture : la valeur dont on a le plus, pour une quantité un peu en dessous de l'espérance.
  if (!bid) {
    const faces = FACES.filter((f) => minQuantity(null, f, dry) !== null);
    const face = faces.reduce((best, f) => (countFace(mine, f, dry) > countFace(mine, best, dry) ? f : best), faces[0]!);
    const expected = countFace(mine, face, dry) + hidden * odds(face);
    const quantity = Math.max(1, Math.min(view.totalDice, Math.floor(expected - rng.int(2))));
    return { type: 'bid', quantity, face };
  }

  const current = pTrue(bid.quantity, bid.face);
  if (view.config.exact) {
    const pExact = exactly(hidden, odds(bid.face), bid.quantity - countFace(mine, bid.face, dry));
    if (pExact >= 0.38 && current < 0.7) return { type: 'exact' };
  }

  // Meilleure surenchère : la plus probable, en préférant les plus petites marches.
  let best: { quantity: number; face: Face; p: number } | null = null;
  for (const face of FACES) {
    const min = minQuantity(bid, face, dry);
    if (min === null) continue;
    for (let quantity = min; quantity <= Math.min(view.totalDice, min + 1); quantity++) {
      if (!isLegalBid(bid, quantity, face, dry, view.totalDice)) continue;
      const p = pTrue(quantity, face) - 0.02 * (quantity - min);
      if (!best || p > best.p) best = { quantity, face, p };
    }
  }

  const doubt = 0.42 + (rng.int(11) - 5) / 100;
  if (!best || (current < doubt && best.p < 0.55)) return { type: 'liar' };
  // Un peu de bluff : de temps en temps, on monte sur une valeur qu'on n'a pas.
  if (best.p > 0.45 && chance(rng, 0.12)) {
    const bluffs = FACES.filter((f) => f !== best.face && minQuantity(bid, f, dry) !== null).filter((f) => {
      const q = minQuantity(bid, f, dry)!;
      return isLegalBid(bid, q, f, dry, view.totalDice) && pTrue(q, f) > 0.3;
    });
    if (bluffs.length) {
      const face = rng.pick(bluffs);
      return { type: 'bid', quantity: minQuantity(bid, face, dry)!, face };
    }
  }
  return { type: 'bid', quantity: best.quantity, face: best.face };
}

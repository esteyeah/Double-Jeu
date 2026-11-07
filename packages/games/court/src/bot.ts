import type { PlayerId, Rng } from '@arcade/game-sdk';
import {
  ACTION_RULES,
  ASSASSINATE_COST,
  CONSPIRACY_COST,
  COPIES,
  FORCED_CONSPIRACY,
  type Character,
  type CourtMove,
  type CourtPlayerView,
  type CourtView,
} from './shared';

/** Préférence quand il faut garder ou sacrifier un personnage. */
const VALUE: Record<Character, number> = { swordsman: 5, banker: 4, guard: 3, corsair: 3, envoy: 2 };

/**
 * Bot de Faux Jetons. Il ne voit que sa main, les ducats et les cartes retournées :
 * il conteste quand une annonce devient improbable au vu des cartes déjà visibles.
 */
export function courtBot(view: CourtView, me: PlayerId, rng: Rng): CourtMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !self.alive || !view.me) return null;
  const hand = view.me.hand;
  const others = view.players.filter((p) => p.alive && p.id !== me);

  switch (view.phase) {
    case 'turn':
      return view.active === me ? chooseAction(view, self, hand, others, rng) : null;

    case 'challenge':
    case 'challengeBlock': {
      if (!view.responders.includes(me)) return null;
      const claimant = view.phase === 'challenge' ? view.action!.actor : view.block!.blocker;
      const claim = view.phase === 'challenge' ? ACTION_RULES[view.action!.kind].claim! : view.block!.claim;
      const p = challengeChance(view, hand, claim, claimant, me);
      return rng.int(100) < p ? { type: 'challenge' } : { type: 'pass' };
    }

    case 'block': {
      if (!view.responders.includes(me)) return null;
      const options = ACTION_RULES[view.action!.kind].blockedBy;
      const genuine = options.find((c) => hand.includes(c));
      if (genuine) return { type: 'block', claim: genuine };
      // Bluff de survie : contre une Assassinat qui me coûterait la partie.
      const lethal = view.action!.kind === 'assassinate' && self.influence === 1;
      if (lethal && rng.int(100) < 65) return { type: 'block', claim: options[0]! };
      if (view.action!.kind === 'racket' && self.coins >= 2 && rng.int(100) < 20) return { type: 'block', claim: rng.pick(options) };
      if (view.action!.kind === 'favor' && rng.int(100) < 10) return { type: 'block', claim: 'banker' };
      return { type: 'pass' };
    }

    case 'loss':
      if (view.losing !== me) return null;
      return { type: 'lose', card: [...hand].sort((a, b) => VALUE[a] - VALUE[b])[0]! };

    case 'exchange': {
      if (view.active !== me || !view.me.exchange) return null;
      const keep = [...view.me.exchange].sort((a, b) => VALUE[b] - VALUE[a]);
      // Varier les personnages vaut mieux que deux exemplaires du même.
      const picked: Character[] = [];
      for (const c of keep) if (picked.length < hand.length && !picked.includes(c)) picked.push(c);
      for (const c of keep) if (picked.length < hand.length) picked.push(c);
      return { type: 'keep', cards: picked.slice(0, hand.length) };
    }

    default:
      return null;
  }
}

function chooseAction(
  view: CourtView,
  self: CourtPlayerView,
  hand: Character[],
  others: CourtPlayerView[],
  rng: Rng,
): CourtMove {
  const threat = [...others].sort((a, b) => b.influence * 10 + b.coins - (a.influence * 10 + a.coins))[0]!;
  if (self.coins >= FORCED_CONSPIRACY || (self.coins >= CONSPIRACY_COST && rng.int(100) < 75)) {
    return { type: 'act', kind: 'conspiracy', target: threat.id };
  }
  const has = (c: Character) => hand.includes(c);
  const bluff = rng.int(100) < 20;
  if (self.coins >= ASSASSINATE_COST && (has('swordsman') || (bluff && rng.int(2) === 0))) {
    return { type: 'act', kind: 'assassinate', target: threat.id };
  }
  if (has('banker') || bluff) return { type: 'act', kind: 'tax' };
  const rich = others.filter((p) => p.coins >= 2);
  if (has('corsair') && rich.length) return { type: 'act', kind: 'racket', target: rng.pick(rich).id };
  if (has('envoy') && rng.int(100) < 40) return { type: 'act', kind: 'exchange' };
  return rng.int(100) < 55 ? { type: 'act', kind: 'favor' } : { type: 'act', kind: 'income' };
}

/** Probabilité (en %) de contester une annonce, selon les exemplaires déjà visibles. */
function challengeChance(view: CourtView, hand: Character[], claim: Character, claimant: PlayerId, me: PlayerId): number {
  const visible =
    hand.filter((c) => c === claim).length +
    view.players.reduce((n, p) => n + p.revealed.filter((c) => c === claim).length, 0);
  if (visible >= COPIES) return 100; // impossible : c'est un bluff
  let p = visible === 2 ? 45 : visible === 1 ? 12 : 5;
  const a = view.action!;
  // On conteste plus volontiers ce qui nous vise directement.
  if (a.target === me && view.phase === 'challenge') p += a.kind === 'assassinate' ? 20 : 10;
  if (view.phase === 'challengeBlock' && a.actor === me) p += 15;
  // Contester avec une seule influence est risqué.
  if (view.players.find((x) => x.id === me)!.influence === 1) p = Math.round(p * 0.5);
  if (claimant === me) return 0;
  return Math.min(100, p);
}

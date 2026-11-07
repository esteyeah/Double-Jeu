import type { PlayerId, Rng } from '@arcade/game-sdk';
import {
  ACTION_RULES,
  CONSPIRACY_COST,
  COPIES,
  ESCORT_COST,
  EXECUTE_COST,
  FORCED_CONSPIRACY,
  type ActionKind,
  type Character,
  type CourtMove,
  type CourtPlayerView,
  type CourtView,
} from './shared';

/** Préférence quand il faut garder, montrer ou sacrifier un personnage. */
const VALUE: Record<Character, number> = {
  executioner: 5,
  banker: 4,
  guard: 3,
  brigand: 3,
  mercenary: 3,
  envoy: 2,
  informer: 2,
};

/**
 * Bot de Faux Jetons. Il ne voit que sa main, les écus, les cartes retournées
 * et ce qu'il a espionné : il conteste quand une annonce devient improbable.
 */
export function courtBot(view: CourtView, me: PlayerId, rng: Rng): CourtMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !self.alive || !view.me) return null;
  const hand = view.me.hand;
  const others = view.players.filter((p) => p.alive && p.id !== me);
  const inCourt = (c: Character) => view.config.characters.includes(c);

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
      const options = ACTION_RULES[view.action!.kind].blockedBy.filter(inCourt);
      if (options.length === 0) return { type: 'pass' };
      const genuine = options.find((c) => hand.includes(c));
      if (genuine) return { type: 'block', claim: genuine };
      // Bluff de survie : contrer une Exécution qui me coûterait la partie.
      const lethal = view.action!.kind === 'execute' && self.influence === 1;
      if (lethal && rng.int(100) < 65) return { type: 'block', claim: options[0]! };
      if (view.action!.kind === 'racket' && self.coins >= 2 && rng.int(100) < 20) return { type: 'block', claim: rng.pick(options) };
      if (view.action!.kind === 'favor' && rng.int(100) < 10) return { type: 'block', claim: options[0]! };
      return { type: 'pass' };
    }

    case 'loss':
      return view.losing === me ? { type: 'lose', card: cheapest(hand) } : null;

    case 'show':
      // On montre ce qui nous trahit le moins.
      return view.action?.target === me ? { type: 'show', card: cheapest(hand) } : null;

    case 'peek':
      return view.active === me ? { type: 'seen' } : null;

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

function cheapest(hand: Character[]): Character {
  return [...hand].sort((a, b) => VALUE[a] - VALUE[b])[0]!;
}

function chooseAction(
  view: CourtView,
  self: CourtPlayerView,
  hand: Character[],
  others: CourtPlayerView[],
  rng: Rng,
): CourtMove {
  const inCourt = (c: Character) => view.config.characters.includes(c);
  const byThreat = [...others].sort((a, b) => b.influence * 10 + b.coins - (a.influence * 10 + a.coins));
  const threat = byThreat[0]!;
  if (self.coins >= FORCED_CONSPIRACY || (self.coins >= CONSPIRACY_COST && rng.int(100) < 75)) {
    return { type: 'act', kind: 'conspiracy', target: threat.id };
  }
  // Une action de personnage n'est possible que si le personnage est à la cour ; on peut bluffer.
  const can = (kind: ActionKind) => {
    const claim = ACTION_RULES[kind].claim;
    return !claim || inCourt(claim);
  };
  const has = (c: Character) => hand.includes(c);
  const bluff = rng.int(100) < 20;
  const targetable = byThreat.filter((p) => !p.escorted);

  if (can('execute') && self.coins >= EXECUTE_COST && targetable.length && (has('executioner') || (bluff && rng.int(2) === 0))) {
    return { type: 'act', kind: 'execute', target: targetable[0]!.id };
  }
  const threatened = self.influence === 1 || self.coins >= CONSPIRACY_COST - 2;
  if (can('escort') && has('mercenary') && self.coins >= ESCORT_COST && threatened && rng.int(100) < 50) {
    return { type: 'act', kind: 'escort' };
  }
  if (can('tax') && (has('banker') || bluff)) return { type: 'act', kind: 'tax' };
  const rich = targetable.filter((p) => p.coins >= 2);
  if (can('racket') && has('brigand') && rich.length) return { type: 'act', kind: 'racket', target: rng.pick(rich).id };
  if (can('snoop') && has('informer') && targetable.length && rng.int(100) < 30) {
    return { type: 'act', kind: 'snoop', target: rng.pick(targetable).id };
  }
  if (can('exchange') && has('envoy') && rng.int(100) < 40) return { type: 'act', kind: 'exchange' };
  return rng.int(100) < 55 ? { type: 'act', kind: 'favor' } : { type: 'act', kind: 'income' };
}

/** Probabilité (en %) de contester une annonce, selon les exemplaires déjà visibles. */
function challengeChance(view: CourtView, hand: Character[], claim: Character, claimant: PlayerId, me: PlayerId): number {
  if (claimant === me) return 0;
  const visible =
    hand.filter((c) => c === claim).length +
    view.players.reduce((n, p) => n + p.revealed.filter((c) => c === claim).length, 0);
  if (visible >= COPIES) return 100; // impossible : c'est un bluff
  // Ce que l'Espionnage a appris (peut être périmé si la carte a été échangée depuis).
  const spied = view.me!.intel.filter((i) => i.target === claimant).at(-1);
  if (spied?.card === claim) return 2;
  let p = visible === 2 ? 45 : visible === 1 ? 12 : 5;
  const a = view.action!;
  // On conteste plus volontiers ce qui nous vise directement.
  if (a.target === me && view.phase === 'challenge') p += a.kind === 'execute' ? 20 : 10;
  if (view.phase === 'challengeBlock' && a.actor === me) p += 15;
  // Contester avec une seule influence est risqué.
  if (view.players.find((x) => x.id === me)!.influence === 1) p = Math.round(p * 0.5);
  return Math.min(100, p);
}

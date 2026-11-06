import type { PlayerId, Rng } from '@arcade/game-sdk';
import type { ReactorMove, ReactorView } from './shared';

/**
 * Bot simple. Il ne voit que sa vue filtrée (son rôle, ses comptes de cartes,
 * les annonces publiques) : il ne peut pas tricher.
 */
export function reactorBot(view: ReactorView, me: PlayerId, rng: Rng): ReactorMove | null {
  if (view.phase === 'over' || !view.me) return null;
  const self = view.players.find((p) => p.id === me);
  if (!self) return null;

  // Annoncer AVANT de confirmer : sinon la clé peut circuler avant que les annonces n'arrivent.
  if (!self.claim) return makeClaim(view);
  if (view.phase === 'reveal' && !self.acked) return { type: 'ack' };
  if (view.phase === 'cut' && view.holder === me) return chooseCut(view, me, rng);
  return null;
}

function makeClaim(view: ReactorView): ReactorMove {
  const { role, hand } = view.me!;
  const size = hand.rod + hand.overload + hand.empty;
  if (role === 'tech') return { type: 'claim', rods: hand.rod, overload: hand.overload > 0 };
  // Saboteur : cache toujours la Surcharge et annonce une barre de plus s'il peut,
  // pour attirer la clé chez lui.
  const rods = Math.min(hand.rod + (hand.overload > 0 ? 1 : 0), size - 1);
  return { type: 'claim', rods, overload: false };
}

/** Réglages des bots, calibrés par simulation (voir test « équilibre »). */
const TRUST = 0.5;
const LIAR_PENALTY = 0.3;
const SABOTEUR_OVERLOAD_PULL = 1.5;
const SUSPICION_PENALTY = 0.15;

function chooseCut(view: ReactorView, me: PlayerId, rng: Rng): ReactorMove | null {
  const saboteur = view.me!.role === 'saboteur';
  const overloadOpen = view.reveals.some((r) => r.kind === 'overload');
  const hiddenTotal = view.players.reduce(
    (sum, p) => sum + p.slots.filter((k) => k === null).length,
    0,
  );
  const baseRate = hiddenTotal > 0 ? (view.rodsTotal - view.rodsFound) / hiddenTotal : 0;

  // Soupçon : viser quelqu'un qui a annoncé la Surcharge, c'est jouer pour les Saboteurs.
  // Un Technicien évite alors de passer la clé à ce joueur.
  const suspicion = new Map<PlayerId, number>();
  for (const r of view.reveals) {
    if (r.round !== view.round || r.kind === 'overload') continue;
    const target = view.players.find((p) => p.id === r.target);
    if (target?.claim?.overload) suspicion.set(r.by, (suspicion.get(r.by) ?? 0) + 1);
  }

  const options = view.players
    .filter((p) => p.id !== me)
    .map((p) => {
      const hidden = p.slots.flatMap((k, i) => (k === null ? [i] : []));
      const openedRods = p.slots.filter((k) => k === 'rod').length;
      const openedEmpty = p.slots.filter((k) => k === 'empty').length;
      const claimsOverload = (p.claim?.overload ?? false) && !overloadOpen;
      // Menteur démasqué : ses trappes ouvertes contredisent son annonce.
      const liar =
        !!p.claim &&
        (openedRods > p.claim.rods ||
          openedEmpty > p.slots.length - p.claim.rods - (p.claim.overload ? 1 : 0));
      // Confiance partielle : une annonce peut toujours être un bluff.
      const trust = liar ? 0 : TRUST;
      const claimRate =
        p.claim && hidden.length > 0
          ? Math.min(1, Math.max(0, p.claim.rods - openedRods) / hidden.length)
          : baseRate;
      // Probabilité estimée qu'une trappe fermée de ce joueur soit une barre.
      const rodRate = trust * claimRate + (1 - trust) * baseRate;
      const weight = saboteur
        ? 0.3 + (claimsOverload ? SABOTEUR_OVERLOAD_PULL : 0) + (1 - rodRate)
        : claimsOverload
          ? 0.01
          : (0.2 + rodRate * 3) *
            (liar ? LIAR_PENALTY : 1) *
            SUSPICION_PENALTY ** (suspicion.get(p.id) ?? 0);
      return { id: p.id, hidden, weight };
    })
    .filter((o) => o.hidden.length > 0);

  if (options.length === 0) return null;
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = (rng.int(10_000) / 10_000) * total;
  let chosen = options[options.length - 1]!;
  for (const o of options) {
    roll -= o.weight;
    if (roll <= 0) {
      chosen = o;
      break;
    }
  }
  return { type: 'cut', target: chosen.id, slot: rng.pick(chosen.hidden) };
}

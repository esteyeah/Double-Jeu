import type { PlayerId, Rng } from '@arcade/game-sdk';
import type { InterrogationMove, InterrogationView } from './shared';

/**
 * Remplaçant minimal d'un joueur déconnecté : il ne peut pas parler, il se contente
 * de ne pas bloquer la partie (confirmer, accuser au hasard, ne rien déclarer, enchaîner).
 */
export function interrogationBot(
  view: InterrogationView,
  me: PlayerId,
  rng: Rng,
): InterrogationMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !view.me) return null;
  const inspector = view.inspector === me;

  switch (view.phase) {
    case 'briefing':
      return self.acked ? null : { type: 'ack' };
    case 'interrogation':
      return inspector ? { type: 'close' } : null;
    case 'bets':
      if (inspector || self.betDone || view.me.myBet !== null) return null;
      // Le Coupable parie sur l'échec ; un innocent tente sa chance.
      return { type: 'bet', found: view.me.role === 'culprit' ? false : rng.int(2) === 0 };
    case 'accusation': {
      if (!inspector) return null;
      const suspects = view.players.filter((p) => p.id !== me).map((p) => p.id);
      return { type: 'accuse', target: rng.pick(suspects) };
    }
    case 'review':
      return !inspector && !self.declared ? { type: 'declare', placed: [] } : null;
    case 'verify':
      return self.verified ? null : { type: 'verify', doubts: [] };
    case 'scores':
      return inspector ? { type: 'next' } : null;
    default:
      return null;
  }
}

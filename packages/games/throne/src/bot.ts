import type { PlayerId, Rng } from '@arcade/game-sdk';
import { USURPER_DANGER, type ThroneMove, type ThroneView } from './shared';

/**
 * Bot du Trône Vide. Il ne voit que sa vue filtrée : son rôle, ses alliés connus,
 * ses enquêtes et l'historique public des gouvernements.
 */
export function throneBot(view: ThroneView, me: PlayerId, rng: Rng): ThroneMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !view.me || !self.alive) return null;
  const mind = new Mind(view, me);

  switch (view.phase) {
    case 'reveal':
      return self.acked ? null : { type: 'ack' };

    case 'nomination': {
      if (view.regent !== me) return null;
      const options = view.players.filter((p) => p.eligible).map((p) => p.id);
      if (options.length === 0) return null;
      return { type: 'nominate', target: mind.pickNominee(options, rng) };
    }

    case 'vote':
      if (view.config.votes === 'hands') {
        if (view.regent !== me) return null;
        // Le bot Régent reporte un vote simulé de chaque bot… et oui pour lui-même.
        const yes = view.players.filter((p) => p.alive && (p.id === me || rng.int(2) === 0)).map((p) => p.id);
        return { type: 'tally', yes };
      }
      return self.voted ? null : { type: 'vote', yes: mind.wouldApprove(rng) };

    case 'regent': {
      if (view.regent !== me || !view.me.hand) return null;
      return { type: 'discard', index: mind.discardIndex(view.me.hand, rng) };
    }

    case 'seneschal': {
      if (view.nominee !== me || !view.me.hand) return null;
      const hand = view.me.hand;
      // En début de partie, l'Ombre laisse parfois passer un édit royal pour gagner la confiance.
      const bluff = mind.shadow && view.shadow < 2 && rng.int(10) < 3;
      const wanted = mind.shadow && !bluff ? 'shadow' : 'crown';
      const idx = hand.indexOf(wanted);
      if (idx === -1 && !mind.shadow && view.vetoUnlocked && !view.vetoRefused) return { type: 'veto' };
      return { type: 'enact', index: idx === -1 ? 0 : idx };
    }

    case 'veto':
      if (view.regent !== me) return null;
      // Un loyaliste accepte (il sait ce qu'il a transmis) ; l'Ombre refuse.
      return { type: 'vetoAnswer', accept: !mind.shadow };

    case 'power': {
      if (view.regent !== me) return null;
      if (view.pendingPower === 'peek') return { type: 'power' };
      const others = view.players.filter((p) => p.alive && p.id !== me);
      let candidates = others;
      if (view.pendingPower === 'investigate') candidates = others.filter((p) => !p.investigated);
      if (candidates.length === 0) return null;
      const target =
        view.pendingPower === 'special'
          ? mind.mostTrusted(candidates.map((p) => p.id), rng)
          : mind.mostSuspect(candidates.map((p) => p.id), rng);
      return { type: 'power', target };
    }

    case 'powerResult':
      return view.regent === me ? { type: 'power' } : null;

    default:
      return null;
  }
}

/** Ce que le bot pense des autres joueurs. */
class Mind {
  readonly shadow: boolean;
  private readonly allies: Map<PlayerId, string>;

  constructor(
    private readonly view: ThroneView,
    private readonly me: PlayerId,
  ) {
    this.shadow = view.me!.team === 'shadow';
    this.allies = new Map(view.me!.allies.map((a) => [a.id, a.role]));
  }

  /** Plus c'est haut, plus le joueur semble servir l'Ombre (du point de vue d'un loyaliste). */
  suspicion(id: PlayerId): number {
    const known = this.view.me!.investigations.find((i) => i.target === id);
    if (known) return known.team === 'shadow' ? 10 : -10;
    let score = 0;
    for (const e of this.view.history) {
      if (e.regent !== id && e.seneschal !== id) continue;
      score += e.edict === 'shadow' ? 1 : -0.6;
    }
    return score;
  }

  private isAlly(id: PlayerId): boolean {
    return this.allies.has(id);
  }

  private usurperId(): PlayerId | null {
    for (const [id, role] of this.allies) if (role === 'usurper') return id;
    return null;
  }

  pickNominee(options: PlayerId[], rng: Rng): PlayerId {
    if (this.shadow) {
      const usurper = this.usurperId();
      if (usurper && options.includes(usurper) && this.view.shadow >= USURPER_DANGER) return usurper;
      const allies = options.filter((id) => this.isAlly(id));
      if (allies.length && rng.int(10) < 6) return rng.pick(allies);
      return rng.pick(options);
    }
    return this.mostTrusted(options, rng);
  }

  wouldApprove(rng: Rng): boolean {
    const v = this.view;
    const nominee = v.nominee as PlayerId;
    if (this.shadow) {
      const usurper = this.usurperId();
      if (usurper === nominee && v.shadow >= USURPER_DANGER) return true;
      if (this.isAlly(v.regent) || this.isAlly(nominee) || v.regent === this.me || nominee === this.me) return true;
      return rng.int(10) < 5;
    }
    if (v.regent === this.me || nominee === this.me) return true;
    const risk = this.suspicion(v.regent) + this.suspicion(nominee);
    // Après le 3e édit de l'Ombre, élire un inconnu peut couronner l'Usurpateur.
    if (v.shadow >= USURPER_DANGER && this.suspicion(nominee) > 0) return false;
    if (v.agitation === 2 && risk < 3) return true;
    return risk <= 1 || rng.int(10) < 2;
  }

  discardIndex(hand: string[], rng: Rng): number {
    if (this.shadow) {
      // Parfois l'Ombre laisse passer un édit royal pour gagner la confiance.
      const trust = this.view.shadow < 2 && rng.int(10) < 2;
      const idx = hand.indexOf(trust ? 'shadow' : 'crown');
      return idx === -1 ? 0 : idx;
    }
    const idx = hand.indexOf('shadow');
    return idx === -1 ? 0 : idx;
  }

  mostSuspect(options: PlayerId[], rng: Rng): PlayerId {
    if (this.shadow) {
      const loyalists = options.filter((id) => !this.isAlly(id));
      return rng.pick(loyalists.length ? loyalists : options);
    }
    return this.extreme(options, rng, 1);
  }

  mostTrusted(options: PlayerId[], rng: Rng): PlayerId {
    if (this.shadow) {
      const allies = options.filter((id) => this.isAlly(id));
      return rng.pick(allies.length ? allies : options);
    }
    return this.extreme(options, rng, -1);
  }

  /** Le plus (sign=1) ou le moins (sign=-1) suspect, au hasard parmi les ex æquo. */
  private extreme(options: PlayerId[], rng: Rng, sign: 1 | -1): PlayerId {
    const scored = options.map((id) => ({ id, s: sign * this.suspicion(id) }));
    const best = Math.max(...scored.map((x) => x.s));
    return rng.pick(scored.filter((x) => x.s === best).map((x) => x.id));
  }
}

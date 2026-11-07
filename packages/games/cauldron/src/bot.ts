import type { PlayerId, Rng } from '@arcade/game-sdk';
import { POISONERS, type Card, type CauldronMove, type CauldronView, type Ingredient } from './shared';

const chance = (rng: Rng, p: number) => rng.int(1000) < p * 1000;
/** Échelle de méfiance : écart attendu annonce/réalité d'un versement d'un coupable certain (réglée par simulation). */
const LIE = 0.5;

/**
 * Bot du Chaudron. Il ne voit que sa vue : sa main, ses dégustations,
 * ce qu'il a lui-même versé, les annonces et les jetons de soupçon.
 */
export function cauldronBot(view: CauldronView, me: PlayerId, rng: Rng): CauldronMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !view.me || self.expelled) return null;
  const mind = new Mind(view, me);

  switch (view.phase) {
    case 'reveal':
      return self.acked ? null : { type: 'ack' };
    case 'tasted':
      return view.active === me ? { type: 'seen' } : null;
    case 'vote':
      if (view.config.votes === 'hands') {
        if (view.vote?.proposer !== me) return null;
        // Le bot qui propose ne voit pas les mains levées : oui pour lui, au hasard pour les autres.
        const yes = mind.members.filter((id) => id === me || chance(rng, 0.5));
        return { type: 'tally', yes };
      }
      return self.voted ? null : { type: 'vote', yes: mind.approves() };
    case 'turn':
      if (view.active !== me) return null;
      return mind.poisoner ? mind.poisonerTurn(rng) : mind.alchemistTurn(rng);
    default:
      return null;
  }
}

class Mind {
  readonly poisoner: boolean;
  readonly members: PlayerId[];
  private readonly hand: Card[];
  /** Indices de « mensonge » relevés lors des dégustations, par joueur. */
  private readonly evidence = new Map<PlayerId, number>();
  /** Dégustations sans mensonge où le joueur figurait. */
  private readonly trust = new Map<PlayerId, number>();
  private readonly prior: number;

  constructor(
    private readonly view: CauldronView,
    private readonly me: PlayerId,
  ) {
    this.poisoner = view.me!.role === 'poisoner';
    this.members = view.players.filter((p) => !p.expelled).map((p) => p.id);
    this.hand = view.me!.hand;

    // Proportion d'Empoisonneurs inconnus parmi les autres membres.
    const total = POISONERS[view.players.length] ?? 1;
    const caught = view.players.filter((p) => p.expelled && p.role === 'poisoner').length;
    const unknown = view.players.filter((p) => !p.expelled && p.id !== me).length;
    this.prior = unknown ? Math.max(0, total - caught) / unknown : 0;

    for (const taste of view.me!.tastes) {
      const announced = taste.pours.reduce((sum, p) => sum + p.announced, 0);
      const real = taste.values.reduce<number>((sum, v) => sum + v, 0);
      const others = taste.pours.filter((p) => p.by !== me).map((p) => p.by);
      if (!others.length) continue;
      const lie = announced - real;
      for (const id of others) {
        if (lie > 0) this.evidence.set(id, (this.evidence.get(id) ?? 0) + lie / LIE / others.length);
        else this.trust.set(id, (this.trust.get(id) ?? 0) + 1);
      }
    }
  }

  private player(id: PlayerId) {
    return this.view.players.find((p) => p.id === id);
  }

  /** Probabilité (grossière) qu'un joueur soit Empoisonneur, vue par un Alchimiste. */
  guilt(id: PlayerId): number {
    if (id === this.me) return this.poisoner ? 1 : 0;
    const p = this.player(id);
    if (p?.role) return p.role === 'poisoner' ? 1 : 0;
    const q =
      this.prior + 0.5 * (this.evidence.get(id) ?? 0) - 0.12 * (this.trust.get(id) ?? 0) + 0.08 * (p?.suspicion ?? 0);
    return Math.min(0.97, Math.max(0.03, q));
  }

  /** Valeur attendue d'un versement. */
  private worth(pour: CauldronView['pours'][number]): number {
    if (pour.value !== null) return pour.value;
    if (this.poisoner) {
      // L'Empoisonneur se méfie surtout de ses complices… qui mentent volontiers.
      return this.view.me!.allies.includes(pour.by) ? pour.announced - 0.6 * LIE : pour.announced;
    }
    return pour.announced - Math.min(pour.announced + 2, this.guilt(pour.by) * LIE);
  }

  /** Force estimée du chaudron. */
  estimate(): number {
    return this.view.pours.reduce((sum, p) => sum + this.worth(p), 0);
  }

  approves(): boolean {
    const est = this.estimate();
    if (this.poisoner) return est < this.view.target;
    const proposer = this.view.vote?.proposer;
    const doubt = proposer && proposer !== this.me ? this.guilt(proposer) * 1.5 : 0;
    return est - doubt >= this.view.target;
  }

  private find(pred: (c: Card) => boolean): number {
    return this.hand.findIndex(pred);
  }
  private ingredient(v: Ingredient) {
    return this.find((c) => c.kind === 'ingredient' && c.value === v);
  }
  private action(a: string) {
    return this.find((c) => c.kind === 'action' && c.action === a);
  }

  /** Le membre (autre que soi) le plus suspect à ses yeux. */
  private mostSuspect(exclude: PlayerId[] = []): { id: PlayerId; guilt: number } | null {
    let best: { id: PlayerId; guilt: number } | null = null;
    for (const id of this.members) {
      if (id === this.me || exclude.includes(id)) continue;
      const g = this.guilt(id);
      if (!best || g > best.guilt) best = { id, guilt: g };
    }
    return best;
  }

  alchemistTurn(rng: Rng): CauldronMove {
    const v = this.view;
    const est = this.estimate();
    if (v.pours.length && est >= v.target + 1) return { type: 'propose' };

    // Écumer si les deux derniers versements sentent la ciguë.
    const skim = this.action('skim');
    const tail = v.pours.slice(-2).reduce((sum, p) => sum + this.worth(p), 0);
    if (skim >= 0 && v.pours.length >= 2 && tail < 0) return { type: 'action', index: skim };

    // Soupçonner un coupable probable.
    const suspect = this.action('suspect');
    const target = this.mostSuspect();
    if (suspect >= 0 && target && target.guilt >= 0.6) return { type: 'action', index: suspect, target: target.id };

    const plus = this.ingredient(1);
    if (plus >= 0) return { type: 'pour', index: plus, announce: 1 };

    // Goûter les derniers versements des autres.
    const taste = this.action('taste');
    const fresh = v.pours.slice(-3).some((p) => p.by !== this.me);
    if (taste >= 0 && fresh && chance(rng, 0.8)) return { type: 'action', index: taste };

    const plead = this.action('plead');
    const self = this.player(this.me)!;
    if (plead >= 0 && self.suspicion > 0) return { type: 'action', index: plead, target: this.me };

    const zero = this.ingredient(0);
    if (zero >= 0) return { type: 'pour', index: zero, announce: 0 };

    // Il ne reste que des actions peu utiles ou de la ciguë : on préfère une action.
    if (taste >= 0) return { type: 'action', index: taste };
    if (skim >= 0 && tail < 1) return { type: 'action', index: skim };
    if (suspect >= 0 && target) return { type: 'action', index: suspect, target: target.id };
    if (plead >= 0) {
      const friend = this.members.filter((id) => this.player(id)!.suspicion > 0 && this.guilt(id) < 0.4)[0];
      return { type: 'action', index: plead, target: friend ?? this.me };
    }
    if (skim >= 0) return { type: 'action', index: skim };
    // Ciguë versée honnêtement, en dernier recours.
    return { type: 'pour', index: this.ingredient(-2), announce: -2 };
  }

  poisonerTurn(rng: Rng): CauldronMove {
    const v = this.view;
    const est = this.estimate();
    const allies = v.me!.allies;
    // Proposer de servir une potion qui semble bonne mais ne l'est pas.
    if (v.pours.length && v.announcedTotal >= v.target && est < v.target && chance(rng, 0.8)) return { type: 'propose' };

    const self = this.player(this.me)!;
    const plead = this.action('plead');
    if (plead >= 0 && self.suspicion >= 2) return { type: 'action', index: plead, target: this.me };

    // Chasser un Alchimiste déjà soupçonné, ou le plus actif.
    const suspect = this.action('suspect');
    const alchemists = this.members.filter((id) => id !== this.me && !allies.includes(id));
    const victim = alchemists.sort((a, b) => this.player(b)!.suspicion - this.player(a)!.suspicion)[0];
    if (suspect >= 0 && victim && this.player(victim)!.suspicion >= 2) {
      return { type: 'action', index: suspect, target: victim };
    }

    const hemlock = this.ingredient(-2);
    if (hemlock >= 0) {
      const roll = rng.int(100);
      const announce: Ingredient = roll < 60 ? 1 : roll < 85 ? 0 : -2;
      return { type: 'pour', index: hemlock, announce };
    }

    // Écumer les bons ingrédients des autres.
    const skim = this.action('skim');
    const honest = v.pours.slice(-2).filter((p) => p.by !== this.me && !allies.includes(p.by)).length;
    if (skim >= 0 && honest >= 1 && chance(rng, 0.7)) return { type: 'action', index: skim };

    if (plead >= 0) {
      const friend = [this.me, ...allies].find((id) => (this.player(id)?.suspicion ?? 0) > 0 && !this.player(id)!.expelled);
      if (friend) return { type: 'action', index: plead, target: friend };
    }
    if (suspect >= 0 && victim && chance(rng, 0.6)) return { type: 'action', index: suspect, target: victim };

    const zero = this.ingredient(0);
    if (zero >= 0) return { type: 'pour', index: zero, announce: chance(rng, 0.3) ? 1 : 0 };

    const taste = this.action('taste');
    if (taste >= 0) return { type: 'action', index: taste };
    if (skim >= 0) return { type: 'action', index: skim };
    if (suspect >= 0 && victim) return { type: 'action', index: suspect, target: victim };
    if (plead >= 0) return { type: 'action', index: plead, target: this.me };
    // Racine dorée pour se couvrir, en dernier recours.
    return { type: 'pour', index: this.ingredient(1), announce: 1 };
  }
}

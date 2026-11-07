import type { PlayerId, Rng } from '@arcade/game-sdk';
import { MAX_REJECTIONS, MUTINEERS, type ExpeditionMove, type ExpeditionView } from './shared';

/**
 * Bot d'Expédition. Il ne voit que sa vue : son rôle, les Mutins qu'il connaît,
 * l'historique public des cordées, des votes et des sabotages.
 */
export function expeditionBot(view: ExpeditionView, me: PlayerId, rng: Rng): ExpeditionMove | null {
  const self = view.players.find((p) => p.id === me);
  if (!self || !view.me) return null;
  const mind = new Mind(view, me);

  switch (view.phase) {
    case 'reveal':
      return self.acked ? null : { type: 'ack' };

    case 'team':
      if (view.leader !== me) return null;
      return { type: 'propose', team: mind.buildTeam(view.missions[view.mission]!.size, rng) };

    case 'vote':
      if (view.config.votes === 'hands') {
        if (view.leader !== me) return null;
        // Le bot Chef reporte : oui pour lui, au hasard pour les autres.
        const yes = view.players.filter((p) => p.id === me || rng.int(2) === 0).map((p) => p.id);
        return { type: 'tally', yes };
      }
      return self.voted ? null : { type: 'vote', yes: mind.approves(rng) };

    case 'mission':
      if (!view.team.includes(me) || view.me.myCard) return null;
      return { type: 'play', card: mind.card(rng) };

    case 'spy':
      return view.spy === me ? { type: 'unmask', target: mind.guessCartographer(rng) } : null;

    default:
      return null;
  }
}

class Mind {
  readonly mutiny: boolean;
  private readonly mutineers: Set<PlayerId>;

  constructor(
    private readonly view: ExpeditionView,
    private readonly me: PlayerId,
  ) {
    this.mutiny = view.me!.side === 'mutiny';
    this.mutineers = new Set(
      view.me!.allies.filter((a) => a.role === 'mutineer' || a.role === 'spy').map((a) => a.id),
    );
    if (this.mutiny) this.mutineers.add(me);
  }

  private worlds: { mutiny: Set<PlayerId>; weight: number }[] | null = null;

  /**
   * Toutes les répartitions possibles des Mutins parmi les AUTRES joueurs (le bot loyal
   * sait qu'il est innocent), pondérées par leur cohérence avec les étapes jouées.
   */
  private possibleWorlds(): { mutiny: Set<PlayerId>; weight: number }[] {
    if (this.worlds) return this.worlds;
    const others = this.view.players.map((p) => p.id).filter((id) => id !== this.me);
    const k = MUTINEERS[this.view.players.length] ?? 0;
    const worlds: { mutiny: Set<PlayerId>; weight: number }[] = [];
    const pick = (start: number, chosen: PlayerId[]) => {
      if (chosen.length === k) {
        const mutiny = new Set(chosen);
        let weight = 1;
        for (const m of this.view.missions) {
          const r = m.result;
          if (!r) continue;
          const inTeam = r.team.filter((id) => mutiny.has(id)).length;
          if (inTeam < r.sabotages) {
            weight = 0;
            break;
          }
          // Des Mutins qui ne sabotent pas, c'est possible mais moins probable.
          weight *= 0.4 ** (inTeam - r.sabotages);
        }
        if (weight > 0) worlds.push({ mutiny, weight });
        return;
      }
      for (let i = start; i < others.length; i++) pick(i + 1, [...chosen, others[i]!]);
    };
    pick(0, []);
    this.worlds = worlds;
    return worlds;
  }

  /** Probabilité (selon le bot) qu'un joueur soit Mutin. */
  suspicion(id: PlayerId): number {
    if (id === this.me) return 0;
    const worlds = this.possibleWorlds();
    const total = worlds.reduce((sum, w) => sum + w.weight, 0) || 1;
    const inferred = worlds.reduce((sum, w) => sum + (w.mutiny.has(id) ? w.weight : 0), 0) / total;
    // La Cartographe sait, mais doit rester discrète : elle mélange savoir et déduction.
    if (this.view.me!.role === 'cartographer') return 0.5 * inferred + 0.5 * (this.mutineers.has(id) ? 1 : 0);
    return inferred;
  }

  /** Probabilité qu'une cordée ne contienne aucun Mutin. */
  private clean(team: PlayerId[]): number {
    if (this.view.me!.role === 'cartographer') {
      return team.reduce((p, id) => p * (1 - this.suspicion(id)), 1);
    }
    const worlds = this.possibleWorlds();
    const total = worlds.reduce((sum, w) => sum + w.weight, 0) || 1;
    return worlds.reduce((sum, w) => sum + (team.some((id) => w.mutiny.has(id)) ? 0 : w.weight), 0) / total;
  }

  buildTeam(size: number, rng: Rng): PlayerId[] {
    const others = rng.shuffle(this.view.players.map((p) => p.id).filter((id) => id !== this.me));
    if (this.mutiny) {
      // Un seul complice suffit : pas besoin de se faire repérer à deux.
      const allies = others.filter((id) => this.mutineers.has(id));
      const loyal = others.filter((id) => !this.mutineers.has(id));
      const team = [this.me];
      if (size >= 3 && allies.length && rng.int(2) === 0) team.push(allies[0]!);
      for (const id of loyal) if (team.length < size) team.push(id);
      for (const id of allies) if (team.length < size && !team.includes(id)) team.push(id);
      return team.slice(0, size);
    }
    const ranked = [...others].sort((a, b) => this.suspicion(a) - this.suspicion(b));
    return [this.me, ...ranked].slice(0, size);
  }

  approves(rng: Rng): boolean {
    const v = this.view;
    if (this.mutiny) {
      if (v.team.some((id) => this.mutineers.has(id))) return true;
      // L'enlisement fait gagner les Mutins : au 5e vote, ils refusent tout.
      return v.rejections < MAX_REJECTIONS - 1 && rng.int(10) < 3;
    }
    if (v.rejections === MAX_REJECTIONS - 1) return true;
    const best = this.clean(this.buildTeam(v.team.length, rng));
    const mine = this.clean(v.team);
    return mine >= best - 0.08 || mine >= 0.75;
  }

  card(rng: Rng): 'success' | 'sabotage' {
    if (!this.mutiny) return 'success';
    // Plusieurs Mutins dans la cordée : un seul sabote (sauf si l'étape en exige deux).
    const mates = this.view.team.filter((id) => this.mutineers.has(id));
    const needed = this.view.missions[this.view.mission]!.needed;
    if (mates.length > needed && mates.indexOf(this.me) >= needed) return 'success';
    // Au tout début, rester discret paie parfois.
    return this.view.mission === 0 && rng.int(10) < 3 ? 'success' : 'sabotage';
  }

  /** L'Espion cherche le joueur qui a le plus souvent refusé les cordées contenant des Mutins. */
  guessCartographer(rng: Rng): PlayerId {
    const candidates = this.view.players.map((p) => p.id).filter((id) => !this.mutineers.has(id));
    const score = (id: PlayerId) =>
      this.view.votesHistory.reduce((sum, v) => {
        const dirty = v.team.some((t) => this.mutineers.has(t));
        const vote = v.votes[id];
        if (vote === undefined) return sum;
        return sum + (dirty ? (vote ? -1 : 1) : 0);
      }, 0) + rng.int(2) * 0.1;
    return candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
  }
}

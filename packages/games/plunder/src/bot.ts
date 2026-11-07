import type { PlayerId, Rng } from '@arcade/game-sdk';
import { MAX_WOUNDS, mapValue, type LootItem, type PirateView, type PlunderMove, type PlunderView } from './shared';

/**
 * Bot de Butin. Il ne voit que sa vue : ses propres charges, les visées une fois
 * révélées, le butin de chacun (public).
 */
export function plunderBot(view: PlunderView, me: PlayerId, rng: Rng): PlunderMove | null {
  const self = view.pirates.find((p) => p.id === me);
  if (!self || self.sunk || !view.me) return null;
  const others = view.pirates.filter((p) => p.id !== me && !p.sunk);

  switch (view.phase) {
    case 'prepare': {
      if (view.me.prepared || others.length === 0) return null;
      const { dry, wet } = view.me;
      const roundsLeft = view.rounds - view.round + 1;
      const wantDry = dry > 0 && (dry >= roundsLeft || wet === 0 || rng.int(100) < (120 * dry) / (dry + wet));
      return { type: 'prepare', charge: wantDry ? 'dry' : 'wet', target: pickTarget(others, rng) };
    }

    case 'order': {
      if (view.captain !== me) return null;
      const aimers = view.pirates.filter((p) => !p.sunk && p.aim === me);
      if (aimers.length === 0) return { type: 'order' };
      const pirate = rng.pick(aimers).id;
      const targets = others.filter((p) => p.id !== pirate);
      if (targets.length === 0) return { type: 'order' };
      return { type: 'order', pirate, target: richest(targets).id };
    }

    case 'courage': {
      // Mode « table » : si ce bot remplace l'humain qui reporte, il déclare que personne n'a plongé.
      if (view.reporter === me && view.toReport.length > 0) return { type: 'cowards', fled: [] };
      if (self.decided || (view.config.courage === 'table' && !self.isBot)) return null;
      const threats = view.pirates.filter((p) => !p.sunk && p.aim === me).length;
      let flee = false;
      if (threats > 0 && self.wounds >= MAX_WOUNDS - 1) flee = true;
      else if (threats >= 2) flee = rng.int(100) < 60;
      else if (threats === 1) flee = rng.int(100) < 25;
      return { type: 'courage', flee };
    }

    case 'loot': {
      if (view.picker !== me || view.board.length === 0) return null;
      let best = 0;
      let bestValue = -Infinity;
      view.board.forEach((item, i) => {
        const v = worth(item, self, view) + rng.int(3);
        if (v > bestValue) {
          bestValue = v;
          best = i;
        }
      });
      return { type: 'take', index: best };
    }

    default:
      return null;
  }
}

function richest(pirates: PirateView[]): PirateView {
  return pirates.reduce((a, b) => (b.score > a.score ? b : a));
}

function pickTarget(others: PirateView[], rng: Rng): PlayerId {
  return rng.int(100) < 55 ? richest(others).id : rng.pick(others).id;
}

/** Ce que vaut un objet pour ce pirate, maintenant. */
function worth(item: LootItem, self: PirateView, view: PlunderView): number {
  const mine = (k: LootItem['kind']) => self.loot.filter((l) => l.kind === k).length;
  switch (item.kind) {
    case 'coin':
      return item.value ?? 0;
    case 'pearl': {
      const rival = Math.max(0, ...view.pirates.filter((p) => p.id !== self.id).map((p) => p.loot.filter((l) => l.kind === 'pearl').length));
      return 5 + (mine('pearl') + 1 >= rival ? 12 : 2);
    }
    case 'map':
      return mapValue(mine('map') + 1) - mapValue(mine('map'));
    case 'rum':
      return self.wounds > 0 ? 15 : 5;
    case 'powder':
      return view.round < view.rounds ? 6 : 0;
    case 'bicorne':
      return 3;
  }
}

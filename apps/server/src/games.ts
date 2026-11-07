import type { AnyGameModule } from '@arcade/game-sdk';
import { interrogation } from '@arcade/interrogation';
import { plunder } from '@arcade/plunder';
import { reactor } from '@arcade/reactor';
import { throne } from '@arcade/throne';

/** Registre des moteurs côté serveur. Ajouter un jeu = une ligne ici. */
const registry: Record<string, AnyGameModule> = {
  [reactor.meta.id]: reactor,
  [interrogation.meta.id]: interrogation,
  [throne.meta.id]: throne,
  [plunder.meta.id]: plunder,
};

export function getGame(id: string): AnyGameModule | undefined {
  return Object.hasOwn(registry, id) ? registry[id] : undefined;
}

export function listGames(): AnyGameModule[] {
  return Object.values(registry);
}

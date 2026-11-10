import type { ComponentType } from 'react';
import type { AnyGameModule, BoardProps } from '@arcade/game-sdk';
import type { StageSkin } from '@arcade/tabletop';
import { cauldron } from '@arcade/cauldron';
import CauldronBoard from '@arcade/cauldron/client';
import { compass } from '@arcade/compass';
import CompassBoard from '@arcade/compass/client';
import { court } from '@arcade/court';
import CourtBoard, { skin as courtSkin } from '@arcade/court/client';
import { cups } from '@arcade/cups';
import CupsBoard from '@arcade/cups/client';
import { expedition } from '@arcade/expedition';
import ExpeditionBoard from '@arcade/expedition/client';
import { interrogation } from '@arcade/interrogation';
import InterrogationBoard from '@arcade/interrogation/client';
import { plunder } from '@arcade/plunder';
import PlunderBoard, { skin as plunderSkin } from '@arcade/plunder/client';
import { reactor } from '@arcade/reactor';
import ReactorBoard, { skin as reactorSkin } from '@arcade/reactor/client';
import { throne } from '@arcade/throne';
import ThroneBoard, { skin as throneSkin } from '@arcade/throne/client';

export interface ClientGame {
  /** Le moteur sert au mode local (un seul téléphone) : en ligne, c'est le serveur qui l'exécute. */
  module: AnyGameModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Board: ComponentType<BoardProps<any, any>>;
  /**
   * Plateau immersif : le jeu occupe tout l'écran avec son propre décor (le site s'efface),
   * et les écrans communs (passage du téléphone, fin de partie, menus) prennent son habillage.
   */
  immersive?: StageSkin;
}

/** Jeux jouables. Ajouter un jeu = une entrée ici + une dans le registre du serveur. */
const games: Record<string, ClientGame> = {
  reactor: {
    module: reactor,
    Board: ReactorBoard,
    immersive: reactorSkin,
  },
  interrogation: { module: interrogation, Board: InterrogationBoard },
  throne: { module: throne, Board: ThroneBoard, immersive: throneSkin },
  plunder: {
    module: plunder,
    Board: PlunderBoard,
    immersive: plunderSkin,
  },
  expedition: { module: expedition, Board: ExpeditionBoard },
  court: { module: court, Board: CourtBoard, immersive: courtSkin },
  cauldron: { module: cauldron, Board: CauldronBoard },
  cups: { module: cups, Board: CupsBoard },
  compass: { module: compass, Board: CompassBoard },
};

export function getClientGame(id: string): ClientGame | undefined {
  return Object.hasOwn(games, id) ? games[id] : undefined;
}

export interface CatalogEntry {
  id: string;
  name: string;
  tagline: string;
  players: string;
  ready: boolean;
  /** Classe Tailwind de la couleur d'accent du jeu. */
  accent: string;
}

/** Vitrine du hub : les jeux disponibles et ceux à venir. */
export const catalog: CatalogEntry[] = [
  {
    id: 'reactor',
    name: 'Réacteur',
    tagline: 'Ouvrez les bonnes trappes avant la fusion du cœur. Bluff et coupes à l’aveugle.',
    players: '4–8',
    ready: true,
    accent: 'from-tech/30',
  },
  {
    id: 'throne',
    name: 'Le Trône Vide',
    tagline: 'Le roi est mort. Élections, édits votés en secret et un usurpateur caché qui convoite le trône.',
    players: '5–10',
    ready: true,
    accent: 'from-sabo/30',
  },
  {
    id: 'expedition',
    name: 'Expédition',
    tagline: 'Des Mutins sabotent l’expédition polaire. Composez la bonne cordée.',
    players: '5–10',
    ready: true,
    accent: 'from-accent/30',
  },
  {
    id: 'court',
    name: 'La Cité',
    tagline: 'Deux influences cachées, des écus et beaucoup de mensonges à la cour de la Cité.',
    players: '2–6',
    ready: true,
    accent: 'from-key/30',
  },
  {
    id: 'cauldron',
    name: 'Le Chaudron',
    tagline: 'La guilde prépare une potion… et des Empoisonneurs y versent de la ciguë en mentant.',
    players: '3–8',
    ready: true,
    accent: 'from-good/20 via-sabo/10',
  },
  {
    id: 'cups',
    name: 'Gobelets',
    tagline: 'Des dés cachés sous les gobelets et des enchères de plus en plus folles. Menteur !',
    players: '2–8',
    ready: true,
    accent: 'from-key/20 via-tech/10',
  },
  {
    id: 'compass',
    name: 'Boussole',
    tagline: 'Un mot pour en relier deux : retrouvez ensemble la boussole de chacun. Jeu coopératif.',
    players: '2–6',
    ready: true,
    accent: 'from-tech/20 via-good/10',
  },
  {
    id: 'plunder',
    name: 'Butin',
    tagline: 'Pistolet chargé ou balle à blanc : les pirates se partagent le trésor, arme au poing.',
    players: '3–8',
    ready: true,
    accent: 'from-good/30',
  },
  {
    id: 'interrogation',
    name: 'Garde à vue',
    tagline: 'Glissez vos mots secrets dans vos réponses sous le nez de l’enquêteur.',
    players: '4–8',
    ready: true,
    accent: 'from-muted/30',
  },
];

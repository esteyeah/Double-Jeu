'use client';

import { Component, lazy, Suspense, type ReactNode, type RefObject } from 'react';
import { useWebGL } from './Table3D';

/**
 * Le pont d'un navire pirate en 3D, vu à la première personne : l'équipage modélisé se tient
 * autour du butin, face au joueur, qui peut tourner la tête en faisant glisser. Les pirates qui
 * visent lèvent leur pistolet vers leur cible. Pendant une fusillade, la caméra cadre le duel de
 * côté, sous l'orage. Les étiquettes (noms, vies, clics pour viser) restent en HTML : la scène les
 * place elle-même au-dessus des têtes, image par image.
 */
export type PiratePose = 'idle' | 'aim' | 'duck' | 'hit' | 'down' | 'cheer';

export interface DeckPirate {
  id: string;
  /** Modèle (0 à 5), et une teinte si deux joueurs partagent le même. */
  model: number;
  tint?: string;
  pose: PiratePose;
  /** Pour `aim` : le pirate visé. */
  aimAt?: string | null;
  hidden?: boolean;
}

export interface DeckDuel {
  /** Change à chaque tir. */
  key: string;
  shooter: string;
  target: string;
  charge: 'dry' | 'wet';
  hit: boolean;
  /** Le coup est parti (éclair, recul, la cible encaisse). */
  fired: boolean;
}

export interface DeckAim {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}

export type DeckLootKind = 'coin' | 'pearl' | 'map' | 'rum' | 'powder' | 'bicorne';
export interface DeckLootItem {
  kind: DeckLootKind;
  value?: number;
}

export interface PirateDeckProps {
  crew: DeckPirate[];
  viewer: string | null;
  time: 'sunset' | 'night';
  storm: boolean;
  duel: DeckDuel | null;
  aims: DeckAim[];
  /** Les trésors de la manche, dans l'ordre du pont. */
  loot: DeckLootItem[];
  /** Dossier des modèles (ex. `/themes/plunder/3d/`). */
  base: string;
  /** Étiquettes HTML à placer au-dessus des pirates (par identifiant). */
  tags: RefObject<Map<string, HTMLElement>>;
  /** Toucher un pirate dans la scène. */
  onPick?: (id: string) => void;
  pickable?: string[];
  /** Toucher un trésor dans la scène (quand c'est à soi de se servir). */
  onLoot?: (index: number) => void;
}

const Deck = lazy(() => import('./pirate-deck'));

export function PirateDeck3D({ fallback = null, ...props }: PirateDeckProps & { fallback?: ReactNode }) {
  const ok = useWebGL();
  if (!ok) return <>{fallback}</>;
  return (
    <div className="absolute inset-0" style={{ touchAction: 'pan-y' }}>
      <Guard fallback={fallback}>
        <Suspense fallback={fallback}>
          <Deck {...props} />
        </Suspense>
      </Guard>
    </div>
  );
}

class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

'use client';

import { Component, lazy, Suspense, type ReactNode } from 'react';
import { useWebGL } from './Table3D';

/**
 * Le pont d'un navire pirate en 3D, vu à la première personne : l'équipage modélisé se tient
 * autour du butin, face au joueur. Pendant une fusillade, la caméra passe par-dessus l'épaule
 * du tireur, sous l'orage. Les étiquettes (noms, vies, clics pour viser) restent en HTML :
 * la scène donne leur position à l'écran par `onAnchors`.
 */
export type PiratePose = 'idle' | 'duck' | 'hit' | 'down' | 'cheer' | 'shoot';

export interface DeckPirate {
  id: string;
  /** Modèle (0 à 5), et une teinte si deux joueurs partagent le même. */
  model: number;
  tint?: string;
  pose: PiratePose;
  hidden?: boolean;
}

export interface DeckDuel {
  /** Change à chaque tir (rejoue l'éclair du coup de feu). */
  key: string;
  shooter: string;
  target: string;
  charge: 'dry' | 'wet';
  hit: boolean;
}

export interface DeckAim {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}

export interface DeckLoot {
  coins: number;
  rum: number;
  powder: number;
}

export type DeckAnchors = Record<string, { x: number; y: number }>;

export interface PirateDeckProps {
  crew: DeckPirate[];
  viewer: string | null;
  time: 'sunset' | 'night';
  storm: boolean;
  duel: DeckDuel | null;
  aims: DeckAim[];
  loot: DeckLoot;
  /** Dossier des modèles (ex. `/themes/plunder/3d/`). */
  base: string;
  /** Position à l'écran (px dans la scène) du haut de la tête de chaque pirate ; `null` pendant un duel. */
  onAnchors: (anchors: DeckAnchors | null) => void;
  /** Toucher un pirate dans la scène. */
  onPick?: (id: string) => void;
  pickable?: string[];
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

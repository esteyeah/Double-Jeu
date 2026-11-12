'use client';

import { Component, lazy, Suspense, type ReactNode, type RefObject } from 'react';
import { useWebGL } from './Table3D';

/**
 * La salle du trône en 3D : un grand palais (colonnades, vitraux, bannières, lustre), le trône
 * vide sur son estrade sous un baldaquin, et le Conseil assis autour d'une table ronde. Chaque
 * conseiller est un personnage modélisé et animé, assis sur sa chaise. Les étiquettes (noms,
 * statuts, clics pour choisir quelqu'un) restent en HTML : la scène les place elle-même
 * au-dessus des têtes, image par image.
 */
export type CouncilPose = 'sit' | 'stand' | 'cheer' | 'dead';
export type CouncilRing = 'regent' | 'nominee' | 'picked' | 'pickable' | null;

export interface HallCouncillor {
  id: string;
  /** Modèle (0 à 4) ; une teinte quand deux conseillers partagent le même. */
  model: number;
  tint?: string;
  pose: CouncilPose;
  /** Cercle lumineux au pied de la chaise. */
  ring?: CouncilRing;
}

export interface HallLink {
  from: string;
  to: string;
  color: string;
}

/** Marges (en pixels) que l'interface recouvre : la scène se cadre dans ce qui reste visible. */
export interface HallFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ThroneHallProps {
  /** Dans l'ordre des places autour de la table. */
  councillors: HallCouncillor[];
  viewer: string | null;
  /** Dossier des modèles (ex. `/themes/throne/3d/`). */
  base: string;
  /** Étiquettes HTML à placer au-dessus des têtes (par identifiant) ; `__center` : au centre de la table. */
  tags: RefObject<Map<string, HTMLElement>>;
  links: HallLink[];
  frame: HallFrame;
  onPick?: (id: string) => void;
  /** Fin de partie : la lumière prend la couleur du camp vainqueur. */
  mood?: 'council' | 'crown' | 'shadow';
}

export const CENTER_TAG = '__center';

const Hall = lazy(() => import('./throne-hall'));

export function ThroneHall3D({ fallback = null, ...props }: ThroneHallProps & { fallback?: ReactNode }) {
  const ok = useWebGL();
  if (!ok) return <>{fallback}</>;
  return (
    <div className="absolute inset-0">
      <Guard fallback={fallback}>
        <Suspense fallback={fallback}>
          <Hall {...props} />
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

'use client';

import { Component, lazy, Suspense, type ReactNode, type RefObject } from 'react';
import { useWebGL } from './Table3D';

/**
 * Gobelets en 3D : un grand tonneau debout sert de table, cerclé de fer, et les joueurs sont
 * assis autour sur des tabourets, chacun devant son gobelet d'étain retourné. Le fond est
 * transparent (le décor de la cave reste celui de la page) et la scène tient dans le cadre
 * qu'on lui donne. Les étiquettes (noms, dés, enchères) restent en HTML : la scène les place
 * elle-même au-dessus des têtes, image par image.
 */
export type DrinkerPose = 'sit' | 'cheer' | 'out';

export interface CellarDrinker {
  id: string;
  /** Modèle (0 à 4) ; une teinte quand deux joueurs partagent le même. */
  model: number;
  tint?: string;
  pose: DrinkerPose;
  /** Gobelet posé, soulevé (dés révélés) ou absent (joueur éliminé). */
  cup: 'down' | 'lift' | 'none';
  /** Nombre de dés sous le gobelet (montrés quand il est soulevé). */
  dice: number;
  /** C'est à lui de parler : cercle lumineux au pied du tabouret. */
  active?: boolean;
}

export interface CellarProps {
  /** Dans l'ordre des places autour de la table. */
  drinkers: CellarDrinker[];
  viewer: string | null;
  /** Dossier des modèles de personnages (ex. `/themes/throne/3d/`). */
  base: string;
  /** Étiquettes HTML à placer au-dessus des têtes (par identifiant) ; `__center` : au centre de la table. */
  tags: RefObject<Map<string, HTMLElement>>;
  /** Change à chaque nouvelle manche : les gobelets sont secoués. */
  shake: number;
}

const Cellar = lazy(() => import('./cellar'));

export function Cellar3D({ fallback = null, ...props }: CellarProps & { fallback?: ReactNode }) {
  const ok = useWebGL();
  if (!ok) return <>{fallback}</>;
  return (
    <div className="absolute inset-0">
      <Guard fallback={fallback}>
        <Suspense fallback={fallback}>
          <Cellar {...props} />
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

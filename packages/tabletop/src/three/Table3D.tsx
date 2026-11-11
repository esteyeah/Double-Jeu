'use client';

import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

/**
 * Plateau en 3D temps réel (three.js) posé sous une `RoundTable` : vraie lumière, ombres,
 * reflets métalliques et halo. Les places, le centre et les flèches restent en HTML par-dessus,
 * donc tout reste cliquable et lisible. Chargé à la demande ; sans WebGL, on garde `fallback`.
 */
export type Scene3D =
  | { kind: 'deck' }
  | { kind: 'council'; seats?: number }
  | { kind: 'lair'; brew: 'poison' | 'brew' | 'ready' };

const Stage = lazy(() => import('./stage'));

export function Table3D({ scene, fallback = null, inset = { x: 0.07, y: 0.09 } }: { scene: Scene3D; fallback?: ReactNode; inset?: { x: number; y: number } }) {
  const ok = useWebGL();
  if (!ok) return <>{fallback}</>;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Guard fallback={fallback}>
        <Suspense fallback={fallback}>
          <Stage scene={scene} inset={inset} />
        </Suspense>
      </Guard>
    </div>
  );
}

let cached: boolean | null = null;
const KEY = 'arcade.3d';
const listeners = new Set<() => void>();

/** Préférence du joueur : la 3D est-elle activée ? (on peut la couper sur un appareil modeste) */
export function table3DEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setTable3DEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // stockage indisponible : réglage pour cette page seulement
  }
  cached = on ? webglAvailable() : false;
  listeners.forEach((f) => f());
}

/** La 3D est-elle possible et voulue sur cet appareil ? (`null` tant qu'on ne le sait pas encore) */
export function useWebGL(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(cached);
  useEffect(() => {
    cached ??= table3DEnabled() && webglAvailable();
    setOk(cached);
    const f = () => setOk(cached);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return ok;
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
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

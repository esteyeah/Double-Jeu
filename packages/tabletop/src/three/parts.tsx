'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/** Inclinaison de la caméra au-dessus de la table. */
export const ELEVATION = (52 * Math.PI) / 180;

/** Demi-axes de la table (unités = pixels) et une longueur de référence pour les objets. */
export interface Fit {
  A: number;
  B: number;
  u: number;
}

/** Ellipse horizontale (plan XZ) à la hauteur y, pour les cerclages et les rangées de clous. */
export class EllipseCurve3 extends THREE.Curve<THREE.Vector3> {
  constructor(
    private a: number,
    private b: number,
    private y = 0,
  ) {
    super();
  }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const ang = t * Math.PI * 2;
    return target.set(this.a * Math.cos(ang), this.y, this.b * Math.sin(ang));
  }
}

/** Texture du dossier public, répétée `rx` × `ry` fois. */
export function useTex(url: string, rx = 1, ry = rx) {
  const base = useTexture(url);
  return useMemo(() => {
    const t = base.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [base, rx, ry]);
}

/** Corps de la table : un cylindre elliptique (dessus, chant), qui reçoit et projette des ombres. */
export function TableBody({ A, B, thickness, top, side }: { A: number; B: number; thickness: number; top: THREE.Material; side: THREE.Material }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 0.97, 1, 128, 1), []);
  return <mesh geometry={geo} material={[side, top, side]} scale={[A, thickness, B]} position={[0, -thickness / 2, 0]} receiveShadow castShadow />;
}

/** Cerclage (tube) qui suit le bord de la table. */
export function Rim({ A, B, y, radius, material }: { A: number; B: number; y: number; radius: number; material: THREE.Material }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new EllipseCurve3(A, B, y), 220, radius, 14, true), [A, B, y, radius]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}

/** Rangée de clous ou de perles le long d'une ellipse. */
export function Studs({ A, B, y, count, size, material }: { A: number; B: number; y: number; count: number; size: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 16, 12), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      m.compose(new THREE.Vector3(A * Math.cos(a), y, B * Math.sin(a)), new THREE.Quaternion(), new THREE.Vector3(size, size * 0.7, size));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [A, B, y, count, size]);
  return <instancedMesh ref={ref} args={[geo, material, count]} castShadow />;
}

/** Lumière qui vacille comme une flamme. */
export function FlickerLight({ position, color, intensity, distance, seed = 0 }: { position: [number, number, number]; color: string; intensity: number; distance: number; seed?: number }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 3.1;
    if (ref.current) ref.current.intensity = intensity * (0.86 + 0.08 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.7 + 1.3));
  });
  return <pointLight ref={ref} position={position} color={color} intensity={intensity} distance={distance} decay={0} />;
}

/** Petite flamme lumineuse (le halo vient du post-traitement). */
export function Flame({ position, size, color = '#ffb347', seed = 0 }: { position: [number, number, number]; size: number; color?: string; seed?: number }) {
  const ref = useRef<THREE.Group>(null);
  const outer = useMemo(() => hdr(color, 3.2), [color]);
  const core = useMemo(() => hdr('#fff3cf', 4), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 2.3;
    if (ref.current) {
      ref.current.scale.set(1 + 0.08 * Math.sin(t * 11), 1 + 0.18 * Math.sin(t * 8.7 + 0.6), 1 + 0.08 * Math.cos(t * 10));
      ref.current.rotation.z = 0.08 * Math.sin(t * 5.1);
    }
  });
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh position={[0, size * 0.55, 0]} scale={[size * 0.42, size, size * 0.42]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={outer} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, size * 0.45, 0]} scale={[size * 0.22, size * 0.6, size * 0.22]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color={core} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Couleur « plus que blanche » : elle dépasse le seuil du halo et se met à luire. */
export function hdr(color: string, k: number) {
  return new THREE.Color(color).multiplyScalar(k);
}

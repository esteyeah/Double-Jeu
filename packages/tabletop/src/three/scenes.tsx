'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Flame, FlickerLight, hdr, KeyLight, Rim, Studs, TableBody, useTex, type Fit } from './parts';

// ───────── Butin : le pont du navire ─────────

export function DeckScene({ fit }: { fit: Fit }) {
  const { A, B, u } = fit;
  const T = u * 0.08;
  const plank = useTex('/themes/plunder/plank.jpg', A / 170, B / 170);
  const linen = useMemo(() => linenTexture(), []);
  const mats = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ map: plank, bumpMap: plank, bumpScale: 4, roughness: 0.68, color: '#f0cfa6' }),
      side: new THREE.MeshStandardMaterial({ map: plank, color: '#5a3a1e', roughness: 0.85 }),
      brass: new THREE.MeshStandardMaterial({ color: '#d9a646', metalness: 1, roughness: 0.26 }),
      sail: new THREE.MeshStandardMaterial({ map: linen, bumpMap: linen, bumpScale: 1.4, color: '#6a1912', roughness: 0.92, side: THREE.DoubleSide }),
    }),
    [plank, linen],
  );
  return (
    <>
      <hemisphereLight args={['#ffe6c2', '#2a160a', 0.9]} />
      <KeyLight A={A} B={B} u={u} color="#ffdcae" intensity={3} />
      <FlickerLight position={[-A * 0.62, u * 0.9, -B * 0.15]} color="#ffad55" intensity={2.4} distance={u * 3.2} />
      <FlickerLight position={[A * 0.62, u * 0.9, -B * 0.15]} color="#ffad55" intensity={2.4} distance={u * 3.2} seed={1} />
      <TableBody A={A} B={B} thickness={T} top={mats.top} side={mats.side} />
      <Rim A={A} B={B} y={u * 0.004} radius={u * 0.024} material={mats.brass} />
      <Rim A={A} B={B} y={-T * 0.7} radius={u * 0.016} material={mats.brass} />
      <Studs A={A * 0.952} B={B * 0.952} y={u * 0.004} count={40} size={u * 0.011} material={mats.brass} />
      <Sail A={A} B={B} u={u} material={mats.sail} />
      <Sparkles count={26} scale={[A * 1.7, u * 0.7, B * 1.7]} position={[0, u * 0.35, 0]} size={u * 0.018} speed={0.18} color="#ffd59a" opacity={0.55} />
    </>
  );
}

/** Toile de voile tissée, dessinée à la volée (fils clairs, légères irrégularités). */
function linenTexture(): THREE.CanvasTexture {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2ead8';
  g.fillRect(0, 0, n, n);
  for (let i = 0; i < n; i += 2) {
    g.fillStyle = `rgba(110,90,60,${0.04 + ((i * 37) % 11) / 160})`;
    g.fillRect(0, i, n, 1);
    g.fillStyle = `rgba(110,90,60,${0.03 + ((i * 53) % 13) / 190})`;
    g.fillRect(i, 0, 1, n);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Voile étalée sur le pont, avec des plis doux. */
function Sail({ A, B, u, material }: { A: number; B: number; u: number; material: THREE.Material }) {
  const geo = useMemo(() => {
    const w = A * 1.18;
    const h = B * 1.12;
    const g = new THREE.PlaneGeometry(w, h, 56, 56);
    const pos = g.attributes.position!;
    const amp = u * 0.03;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / w;
      const y = pos.getY(i) / h;
      const folds = Math.sin(x * 9 + 1.2) * Math.cos(y * 6 - 0.4) * 0.55 + Math.sin((x * 0.7 + y) * 15) * 0.22 + Math.cos(x * 23 - y * 4) * 0.08;
      const edge = Math.max(Math.abs(x), Math.abs(y)) > 0.46 ? (Math.max(Math.abs(x), Math.abs(y)) - 0.46) * 9 : 0;
      pos.setZ(i, amp * (0.9 + folds) + amp * edge);
    }
    g.computeVertexNormals();
    return g;
  }, [A, B, u]);
  return <mesh geometry={geo} material={material} rotation={[-Math.PI / 2, 0, 0.07]} position={[0, u * 0.004, 0]} receiveShadow castShadow />;
}

// ───────── Le Chaudron : l'antre ─────────

const BREW = { poison: '#b46cff', brew: '#57ff8a', ready: '#e6ff5c' } as const;

export function LairScene({ fit, brew }: { fit: Fit; brew: keyof typeof BREW }) {
  const { A, B, u } = fit;
  const T = u * 0.09;
  const stone = useTex('/themes/cauldron/stone.jpg', A / 200, B / 200);
  const wood = useTex('/themes/cauldron/wood.jpg', 1, 1);
  const tone = BREW[brew];
  const mats = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ map: stone, bumpMap: stone, bumpScale: 4, color: '#9aaa9c', roughness: 0.9 }),
      side: new THREE.MeshStandardMaterial({ map: stone, color: '#4a564c', roughness: 0.95 }),
      iron: new THREE.MeshStandardMaterial({ color: '#59625c', metalness: 0.55, roughness: 0.4 }),
      rim: new THREE.MeshStandardMaterial({ color: '#3a443d', metalness: 0.6, roughness: 0.5 }),
      log: new THREE.MeshStandardMaterial({ map: wood, color: '#6b4220', roughness: 0.9 }),
    }),
    [stone, wood],
  );
  return (
    <>
      <hemisphereLight args={['#d6f2df', '#0a120c', 1.3]} />
      <KeyLight A={A} B={B} u={u} color="#e2f4e8" intensity={2.6} />
      <TableBody A={A} B={B} thickness={T} top={mats.top} side={mats.side} />
      <Rim A={A} B={B} y={u * 0.004} radius={u * 0.022} material={mats.rim} />
      <RitualCircle A={A} B={B} u={u} tone={tone} />
      <Cauldron u={u} tone={tone} iron={mats.iron} log={mats.log} />
      <Sparkles count={46} scale={[A * 1.7, u * 1.1, B * 1.7]} position={[0, u * 0.5, 0]} size={u * 0.022} speed={0.3} color={tone} opacity={0.75} />
    </>
  );
}

/** Cercle de transmutation gravé, qui luit et tourne lentement. */
function RitualCircle({ A, B, u, tone }: { A: number; B: number; u: number; tone: string }) {
  const tex = useMemo(() => ritualTexture(), []);
  const color = useMemo(() => hdr(tone, 0.9), [tone]);
  useFrame((_, dt) => {
    tex.rotation += dt * 0.025;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, u * 0.003, 0]} scale={[A * 1.9, B * 1.9, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function ritualTexture(): THREE.CanvasTexture {
  const n = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const o = n / 2;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  const ring = (r: number, w: number, alpha = 1) => {
    g.globalAlpha = alpha;
    g.lineWidth = w;
    g.beginPath();
    g.arc(o, o, r, 0, Math.PI * 2);
    g.stroke();
  };
  ring(500, 2, 0.45);
  ring(480, 4);
  ring(388, 3);
  ring(232, 2, 0.7);
  // Signes alchimiques tout autour
  g.globalAlpha = 0.95;
  g.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.save();
    g.translate(o + Math.cos(a) * 433, o + Math.sin(a) * 433);
    g.rotate(a + Math.PI / 2);
    const k = i % 4;
    g.beginPath();
    if (k === 0) {
      g.moveTo(0, -18);
      g.lineTo(16, 12);
      g.lineTo(-16, 12);
      g.closePath();
    } else if (k === 1) {
      g.moveTo(0, 18);
      g.lineTo(16, -12);
      g.lineTo(-16, -12);
      g.closePath();
      g.moveTo(-18, 0);
      g.lineTo(18, 0);
    } else if (k === 2) {
      g.arc(0, 0, 15, 0, Math.PI * 2);
      g.moveTo(4, 0);
      g.arc(0, 0, 4, 0, Math.PI * 2);
    } else {
      g.arc(0, -6, 11, 0, Math.PI * 2);
      g.moveTo(0, 5);
      g.lineTo(0, 22);
      g.moveTo(-9, 14);
      g.lineTo(9, 14);
    }
    g.stroke();
    g.restore();
  }
  // Hexagramme
  g.lineWidth = 3;
  for (const start of [-Math.PI / 2, Math.PI / 2]) {
    g.beginPath();
    for (let k = 0; k <= 3; k++) {
      const a = start + (k * Math.PI * 2) / 3;
      const x = o + Math.cos(a) * 376;
      const y = o + Math.sin(a) * 376;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    g.beginPath();
    g.arc(o + Math.cos(a) * 376, o + Math.sin(a) * 376, 12, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.center.set(0.5, 0.5);
  t.anisotropy = 8;
  return t;
}

/** Surface de la potion : un tourbillon clair au centre, plus sombre sur les bords. */
function swirlTexture(): THREE.CanvasTexture {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 4, n / 2, n / 2, n / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#b9b9b9');
  grad.addColorStop(1, '#4a4a4a');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 3 + (k * Math.PI * 2) / 3;
      const rr = (i / 120) * n * 0.46;
      const x = n / 2 + Math.cos(a) * rr;
      const y = n / 2 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.center.set(0.5, 0.5);
  return t;
}

/** Chaudron de fonte sur son feu : potion lumineuse, bulles, flammes. */
function Cauldron({ u, tone, iron, log }: { u: number; tone: string; iron: THREE.Material; log: THREE.Material }) {
  const r = u * 0.25;
  const leg = r * 0.62;
  const body = useMemo(() => {
    const pts = [
      [0, 0],
      [0.5, 0.03],
      [0.82, 0.18],
      [0.98, 0.45],
      [1, 0.66],
      [0.93, 0.88],
      [0.84, 0.98],
      [0.92, 1.03],
      [0.9, 1.09],
      [0.8, 1.05],
      [0.78, 0.95],
    ].map(([x, y]) => new THREE.Vector2(x! * r, y! * r));
    return new THREE.LatheGeometry(pts, 64);
  }, [r]);
  const liquid = useRef<THREE.MeshBasicMaterial>(null);
  const bubbles = useRef<THREE.Group>(null);
  const base = useMemo(() => hdr(tone, 1.9), [tone]);
  const swirl = useMemo(() => swirlTexture(), []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    swirl.rotation += dt * 0.35;
    if (liquid.current) liquid.current.color.copy(base).multiplyScalar(0.9 + 0.12 * Math.sin(t * 2.2));
    bubbles.current?.children.forEach((b, i) => {
      const p = ((t * 0.7 + i * 0.37) % 1 + 1) % 1;
      const k = p < 0.8 ? p / 0.8 : (1 - p) * 5;
      b.scale.setScalar(Math.max(0.001, k) * r * (0.07 + (i % 3) * 0.025));
    });
  });
  const bubblePos = [
    [-0.35, 0.2],
    [0.25, -0.3],
    [0.1, 0.4],
    [-0.15, -0.15],
    [0.45, 0.1],
    [-0.5, -0.25],
  ];
  return (
    <group position={[0, 0, -u * 0.1]}>
      {/* Bûches et feu */}
      <group position={[0, 0, r * 0.32]}>
      <mesh material={log} rotation={[0, 0.5, Math.PI / 2]} position={[0, r * 0.08, 0]} castShadow>
        <cylinderGeometry args={[r * 0.08, r * 0.09, r * 1.5, 12]} />
      </mesh>
      <mesh material={log} rotation={[0, -0.6, Math.PI / 2]} position={[0, r * 0.1, 0]} castShadow>
        <cylinderGeometry args={[r * 0.08, r * 0.09, r * 1.5, 12]} />
      </mesh>
      <Flame position={[-r * 0.26, r * 0.1, r * 0.08]} size={r * 0.34} color="#ff6a14" seed={0} />
      <Flame position={[r * 0.22, r * 0.1, -r * 0.02]} size={r * 0.4} color="#ff8f2a" seed={1} />
      <Flame position={[0, r * 0.1, r * 0.2]} size={r * 0.32} color="#ffb347" seed={2} />
      <Flame position={[r * 0.05, r * 0.1, -r * 0.2]} size={r * 0.3} color="#ff7a1a" seed={3} />
      <FlickerLight position={[0, r * 0.3, r * 0.5]} color="#ff8a2a" intensity={4} distance={u * 1.4} />
      </group>
      {/* Pieds */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} material={iron} position={[Math.cos(a) * r * 0.62, leg / 2, Math.sin(a) * r * 0.62]} rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]} castShadow>
            <cylinderGeometry args={[r * 0.07, r * 0.05, leg, 10]} />
          </mesh>
        );
      })}
      {/* Panse et anses */}
      <group position={[0, leg, 0]}>
        <mesh geometry={body} castShadow receiveShadow>
          <meshStandardMaterial attach="material" color="#59625c" metalness={0.55} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={iron} position={[s * r * 1.02, r * 0.78, 0]} rotation={[0, 0, s * 0.3]} castShadow>
            <torusGeometry args={[r * 0.16, r * 0.035, 10, 24]} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, r * 0.97, 0]}>
          <circleGeometry args={[r * 0.8, 48]} />
          <meshBasicMaterial ref={liquid} map={swirl} color={base} toneMapped={false} />
        </mesh>
        <group ref={bubbles} position={[0, r * 0.98, 0]}>
          {bubblePos.map(([x, z], i) => (
            <mesh key={i} position={[x! * r, 0, z! * r]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshBasicMaterial color={base} toneMapped={false} />
            </mesh>
          ))}
        </group>
        <Sparkles count={18} scale={[r * 1.4, r * 1.6, r * 1.4]} position={[0, r * 1.7, 0]} size={r * 0.22} speed={0.6} color={tone} opacity={0.6} noise={0.6} />
        <pointLight position={[0, r * 1.7, 0]} color={tone} intensity={3.2} distance={u * 2.4} decay={0} />
      </group>
    </group>
  );
}

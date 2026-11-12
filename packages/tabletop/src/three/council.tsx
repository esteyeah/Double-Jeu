'use client';

import { useMemo } from 'react';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { GAME_ICONS } from '../icons.generated';
import { Flame, FlickerLight, KeyLight, Rim, Studs, TableBody, useTex, type Fit } from './parts';

/**
 * Le Trône Vide : la grande table du Conseil. Chêne verni incrusté de laiton, tapis de velours
 * brodé d'or (lys de la Couronne, yeux de l'Ombre), candélabres, et devant chaque conseiller
 * un objet de séance (coupe, pli scellé, encrier, pièces) posé entre les places.
 */
export function CouncilScene({ fit, seats }: { fit: Fit; seats: number }) {
  const { A, B, u } = fit;
  const T = u * 0.08;
  const wood = useTex('/themes/throne/table.jpg', A / 240, B / 240);
  const velvet = useTex('/themes/throne/velvet.jpg', 3, 3);
  const tex = useMemo(() => ({ embroidery: embroideryTexture(), inlay: inlayTexture(), shadow: radialShadowTexture() }), []);
  const mats = useMemo(
    () => ({
      top: new THREE.MeshPhysicalMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, color: '#c47a40', roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.25, envMapIntensity: 0.55 }),
      side: new THREE.MeshStandardMaterial({ map: wood, color: '#5a3016', roughness: 0.5 }),
      apron: new THREE.MeshStandardMaterial({ map: wood, color: '#3a1d0c', roughness: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: '#e5b24c', metalness: 1, roughness: 0.22 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c9973e', metalness: 0.9, roughness: 0.32 }),
      cloth: new THREE.MeshPhysicalMaterial({ bumpMap: velvet, bumpScale: 0.6, color: '#1d3f9e', roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#8fb0ff'), sheenRoughness: 0.4 }),
      thread: new THREE.MeshStandardMaterial({
        map: tex.embroidery,
        color: '#f3c766',
        metalness: 0.85,
        roughness: 0.38,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
      inlay: new THREE.MeshStandardMaterial({
        map: tex.inlay,
        color: '#e8b65a',
        metalness: 0.6,
        roughness: 0.35,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
      wax: new THREE.MeshStandardMaterial({ color: '#f4e8cc', roughness: 0.55, emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0.22 }),
      parchment: new THREE.MeshStandardMaterial({ color: '#ead6a6', roughness: 0.85 }),
      seal: new THREE.MeshStandardMaterial({ color: '#a3150f', roughness: 0.35, metalness: 0.1 }),
      ink: new THREE.MeshPhysicalMaterial({ color: '#10141c', roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
      wine: new THREE.MeshPhysicalMaterial({ color: '#4a0710', roughness: 0.05, clearcoat: 1 }),
      feather: new THREE.MeshStandardMaterial({ color: '#f6efe2', roughness: 0.8, side: THREE.DoubleSide }),
      shadow: new THREE.MeshBasicMaterial({ map: tex.shadow, color: '#000', transparent: true, depthWrite: false, opacity: 0.7 }),
    }),
    [wood, velvet, tex],
  );

  const cloth = 0.78;
  const ch = u * 0.012;
  const candelabra = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const n = Math.max(0, Math.min(12, seats));
  return (
    <>
      <hemisphereLight args={['#ffe2b0', '#26120a', 1.1]} />
      <KeyLight A={A} B={B} u={u} color="#ffe3b8" intensity={2.4} mapSize={2048} />
      {/* Halo de lumière chaude au-dessus du tapis : le centre de la table attire l'œil. */}
      <spotLight position={[0, u * 4, u * 0.6]} angle={0.55} penumbra={1} intensity={1.4} decay={0} color="#ffcf94" />

      {/* Ombre portée douce de la table sur le sol de la salle. */}
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -T * 2.4, u * 0.05]} scale={[A * 2.5, B * 2.5, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Plateau, ceinture sculptée, moulures et clous de laiton */}
      <TableBody A={A} B={B} thickness={T} top={mats.top} side={mats.side} />
      <mesh material={mats.apron} scale={[A * 0.965, T * 1.1, B * 0.965]} position={[0, -T * 1.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.96, 1, 128, 1]} />
      </mesh>
      <Rim A={A} B={B} y={u * 0.003} radius={u * 0.018} material={mats.gold} />
      <Rim A={A * 0.99} B={B * 0.99} y={-T} radius={u * 0.009} material={mats.gold} />
      <Studs A={A * 0.985} B={B * 0.985} y={-T * 0.5} count={72} size={u * 0.008} material={mats.brass} />

      {/* Marqueterie de laiton sur le chêne */}
      <mesh material={mats.inlay} rotation={[-Math.PI / 2, 0, 0]} position={[0, u * 0.001, 0]} scale={[A * 2, B * 2, 1]} receiveShadow>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* Tapis de velours brodé */}
      <mesh scale={[A * cloth, ch, B * cloth]} position={[0, ch / 2, 0]} material={mats.cloth} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 128]} />
      </mesh>
      <mesh material={mats.thread} rotation={[-Math.PI / 2, 0, 0]} position={[0, ch + u * 0.001, 0]} scale={[A * cloth * 2, B * cloth * 2, 1]} receiveShadow>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <Rim A={A * cloth} B={B * cloth} y={ch} radius={u * 0.01} material={mats.gold} />
      <Studs A={A * cloth} B={B * cloth} y={ch * 0.4} count={56} size={u * 0.007} material={mats.gold} />

      {candelabra.map((a, i) => (
        <Candelabrum
          key={a}
          position={[A * 0.64 * Math.cos(a), ch, B * 0.64 * Math.sin(a)]}
          yaw={-a + Math.PI / 2}
          u={u}
          mats={mats}
          seed={i}
        />
      ))}

      {Array.from({ length: n }, (_, i) => {
        // Même placement que RoundTable (premier siège en bas), décalé d'une demi-place : l'objet tombe entre deux conseillers.
        const a = Math.PI / 2 + (2 * Math.PI * (i + 0.5)) / n;
        return <Keepsake key={i} kind={i % 4} position={[A * 0.885 * Math.cos(a), 0, B * 0.885 * Math.sin(a)]} yaw={-a + (i * 0.7) % 1} u={u} mats={mats} />;
      })}

      <Sparkles count={36} scale={[A * 1.8, u * 0.9, B * 1.8]} position={[0, u * 0.45, 0]} size={u * 0.016} speed={0.15} color="#ffe2a8" opacity={0.5} />
    </>
  );
}

type Mats = Record<'gold' | 'brass' | 'wax' | 'parchment' | 'seal' | 'ink' | 'wine' | 'feather' | 'shadow', THREE.Material>;

/** Candélabre à trois branches, bougies coulées et flammes vivantes. */
function Candelabrum({ position, yaw, u, mats, seed }: { position: [number, number, number]; yaw: number; u: number; mats: Mats; seed: number }) {
  const s = u * 0.13;
  const arms = useMemo(() => new THREE.TorusGeometry(s * 0.36, s * 0.035, 10, 32, Math.PI), [s]);
  const knob = useMemo(() => lathe([[0, 0], [0.5, 0], [0.62, 0.05], [0.5, 0.12], [0.2, 0.16], [0.13, 0.22], [0.2, 0.3], [0.1, 0.38], [0, 0.38]], s), [s]);
  const cup = useMemo(() => lathe([[0, 0], [0.04, 0], [0.12, 0.05], [0.14, 0.09], [0.1, 0.1], [0, 0.1]], s), [s]);
  const candles: [number, number][] = [
    [-0.36, 1.0],
    [0.36, 1.0],
    [0, 1.16],
  ];
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[s * 0.1, u * 0.001, s * 0.15]} scale={[s * 1.9, s * 1.9, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh geometry={knob} material={mats.gold} castShadow />
      <mesh material={mats.gold} position={[0, s * 0.72, 0]} castShadow>
        <cylinderGeometry args={[s * 0.045, s * 0.07, s * 0.7, 12]} />
      </mesh>
      <mesh material={mats.gold} position={[0, s * 0.62, 0]} castShadow>
        <sphereGeometry args={[s * 0.09, 16, 12]} />
      </mesh>
      <mesh geometry={arms} material={mats.gold} position={[0, s * 1.0, 0]} rotation={[0, 0, Math.PI]} castShadow />
      {candles.map(([x, y], i) => (
        <group key={i} position={[x * s, y * s, 0]}>
          <mesh geometry={cup} material={mats.gold} castShadow />
          <mesh material={mats.wax} position={[0, s * (0.1 + 0.22), 0]} castShadow>
            <cylinderGeometry args={[s * 0.075, s * 0.08, s * 0.44, 16]} />
          </mesh>
          {/* coulures de cire */}
          <mesh material={mats.wax} position={[s * 0.07, s * 0.44, s * 0.02]} scale={[s * 0.03, s * 0.09, s * 0.03]}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          <mesh material={mats.wax} position={[-s * 0.05, s * 0.48, -s * 0.05]} scale={[s * 0.025, s * 0.06, s * 0.025]}>
            <sphereGeometry args={[1, 8, 8]} />
          </mesh>
          <Flame position={[0, s * 0.56, 0]} size={s * 0.13} seed={seed * 3 + i} />
        </group>
      ))}
      <FlickerLight position={[0, s * 1.9, 0]} color="#ffb257" intensity={1.5} distance={u * 1.7} seed={seed} />
    </group>
  );
}

/** Objet de séance posé entre deux conseillers. */
function Keepsake({ kind, position, yaw, u, mats }: { kind: number; position: [number, number, number]; yaw: number; u: number; mats: Mats }) {
  const s = u * 0.11;
  const goblet = useMemo(
    () => lathe([[0, 0], [0.32, 0], [0.34, 0.03], [0.12, 0.08], [0.06, 0.16], [0.06, 0.42], [0.12, 0.48], [0.3, 0.62], [0.36, 0.9], [0.33, 0.9], [0.27, 0.64], [0.1, 0.52], [0, 0.52]], s),
    [s],
  );
  const well = useMemo(() => lathe([[0, 0], [0.3, 0], [0.36, 0.1], [0.34, 0.24], [0.16, 0.34], [0.14, 0.4], [0.17, 0.42], [0, 0.42]], s), [s]);
  const feather = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.quadraticCurveTo(0.16, 0.4, 0.08, 1.1);
    sh.quadraticCurveTo(0.02, 1.2, -0.04, 1.05);
    sh.quadraticCurveTo(-0.08, 0.5, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 12);
    g.scale(s, s, s);
    return g;
  }, [s]);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[s * 0.08, u * 0.0015, s * 0.12]} scale={[s * 1.9, s * 1.9, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {kind === 0 && (
        <>
          <mesh geometry={goblet} material={mats.gold} castShadow />
          <mesh material={mats.wine} position={[0, s * 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[s * 0.31, 24]} />
          </mesh>
        </>
      )}
      {kind === 1 && (
        <group rotation={[0, 0.4, 0]}>
          <mesh material={mats.parchment} position={[0, s * 0.13, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[s * 0.13, s * 0.13, s * 1.1, 20]} />
          </mesh>
          <mesh material={mats.seal} position={[0, s * 0.27, 0]} scale={[1, 0.45, 1]} castShadow>
            <sphereGeometry args={[s * 0.15, 16, 12]} />
          </mesh>
          <mesh material={mats.seal} position={[s * 0.05, s * 0.02, s * 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[s * 0.06, s * 0.36]} />
          </mesh>
        </group>
      )}
      {kind === 2 && (
        <>
          <mesh geometry={well} material={mats.ink} castShadow />
          <mesh material={mats.gold} position={[0, s * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 0.16, s * 0.025, 8, 24]} />
          </mesh>
          <mesh geometry={feather} material={mats.feather} position={[0, s * 0.3, 0]} rotation={[0, 0.5, -0.45]} castShadow />
        </>
      )}
      {kind === 3 && (
        <>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} material={mats.gold} position={[Math.sin(k * 2.1) * s * 0.03, s * (0.04 + k * 0.075), Math.cos(k * 1.7) * s * 0.03]} castShadow>
              <cylinderGeometry args={[s * 0.22, s * 0.22, s * 0.07, 24]} />
            </mesh>
          ))}
          <mesh material={mats.gold} position={[s * 0.45, s * 0.04, s * 0.15]} rotation={[0.1, 0, 0.15]} castShadow>
            <cylinderGeometry args={[s * 0.22, s * 0.22, s * 0.07, 24]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Pièce tournée à partir d'un profil (rayon, hauteur) exprimé en fraction de `s`. */
function lathe(profile: [number, number][], s: number) {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r * s, y * s)),
    32,
  );
}

// ───────── Textures dessinées à la volée ─────────

function canvas(n: number) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  return [c, c.getContext('2d')!] as const;
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const ICON_PATHS = new Map<string, Path2D[]>();
/** Dessine une icône du jeu (contours game-icons, 512×512) centrée en (x, y). */
function drawIcon(g: CanvasRenderingContext2D, name: keyof typeof GAME_ICONS, x: number, y: number, size: number, rot: number) {
  let paths = ICON_PATHS.get(name);
  if (!paths) {
    const icon = GAME_ICONS[name];
    paths = [...icon.body.matchAll(/\sd="([^"]+)"/g)].map((m) => new Path2D(m[1]));
    ICON_PATHS.set(name, paths);
  }
  const icon = GAME_ICONS[name];
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(size / icon.w, size / icon.h);
  g.translate(-icon.w / 2, -icon.h / 2);
  for (const p of paths) g.fill(p);
  g.restore();
}

/** Broderie d'or du tapis : bordure festonnée, lys et yeux en alternance, rosace centrale. */
function embroideryTexture() {
  const n = 2048;
  const [c, g] = canvas(n);
  const o = n / 2;
  const k = n / 1024;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  const ring = (r: number, w: number, alpha = 1, dash: number[] = []) => {
    g.globalAlpha = alpha;
    g.lineWidth = w * k;
    g.setLineDash(dash.map((d) => d * k));
    g.beginPath();
    g.arc(o, o, r * k, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  };
  // Bordure : deux filets, une torsade et un rang de perles.
  ring(492, 5);
  ring(478, 1.6, 0.9);
  g.globalAlpha = 0.95;
  g.lineWidth = 2.4 * k;
  for (const phase of [0, Math.PI]) {
    g.beginPath();
    for (let i = 0; i <= 720; i++) {
      const a = (i / 720) * Math.PI * 2;
      const r = (462 + 9 * Math.sin(a * 60 + phase)) * k;
      if (i === 0) g.moveTo(o + r * Math.cos(a), o + r * Math.sin(a));
      else g.lineTo(o + r * Math.cos(a), o + r * Math.sin(a));
    }
    g.stroke();
  }
  ring(446, 1.6, 0.9);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    g.beginPath();
    g.arc(o + 434 * k * Math.cos(a), o + 434 * k * Math.sin(a), 3.2 * k, 0, Math.PI * 2);
    g.fill();
  }
  // Médaillons : lys de la Couronne et yeux de l'Ombre, chacun dans un cartouche.
  const motifs = 12;
  for (let i = 0; i < motifs; i++) {
    const a = (i / motifs) * Math.PI * 2 + Math.PI / motifs;
    const x = o + 360 * k * Math.cos(a);
    const y = o + 360 * k * Math.sin(a);
    g.globalAlpha = 0.9;
    g.lineWidth = 2 * k;
    g.beginPath();
    g.arc(x, y, 44 * k, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 0.5;
    g.beginPath();
    g.arc(x, y, 37 * k, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
    drawIcon(g, i % 2 ? 'all-seeing-eye' : 'fleur-de-lys', x, y, 58 * k, a + Math.PI / 2);
    // rinceaux entre les médaillons
    const b = a + Math.PI / motifs;
    g.globalAlpha = 0.75;
    g.lineWidth = 1.8 * k;
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let j = 0; j <= 30; j++) {
        const t = j / 30;
        const aa = b + side * t * (Math.PI / motifs - 0.09);
        const r = (360 + 22 * Math.sin(t * Math.PI * 2)) * k;
        if (j === 0) g.moveTo(o + r * Math.cos(aa), o + r * Math.sin(aa));
        else g.lineTo(o + r * Math.cos(aa), o + r * Math.sin(aa));
      }
      g.stroke();
    }
    g.beginPath();
    g.arc(o + 360 * k * Math.cos(b), o + 360 * k * Math.sin(b), 5 * k, 0, Math.PI * 2);
    g.fill();
  }
  ring(288, 3);
  ring(278, 1.2, 0.8, [2, 9]);
  // Rosace centrale très discrète : elle ne doit pas gêner la lecture du centre.
  g.globalAlpha = 0.16;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const w = i % 2 ? 0.018 : 0.03;
    g.beginPath();
    g.moveTo(o + 70 * k * Math.cos(a - w * 3), o + 70 * k * Math.sin(a - w * 3));
    g.lineTo(o + (i % 2 ? 210 : 262) * k * Math.cos(a), o + (i % 2 ? 210 : 262) * k * Math.sin(a));
    g.lineTo(o + 70 * k * Math.cos(a + w * 3), o + 70 * k * Math.sin(a + w * 3));
    g.fill();
  }
  ring(70, 2, 0.35);
  return finish(c);
}

/** Incrustations de laiton dans le chêne, sur la couronne de bois autour du tapis. */
function inlayTexture() {
  const n = 2048;
  const [c, g] = canvas(n);
  const o = n / 2;
  const k = n / 1024;
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const ring = (r: number, w: number, alpha = 1) => {
    g.globalAlpha = alpha;
    g.lineWidth = w * k;
    g.beginPath();
    g.arc(o, o, r * k, 0, Math.PI * 2);
    g.stroke();
  };
  ring(494, 2.2, 0.85);
  ring(487, 1, 0.6);
  ring(412, 2.2, 0.85);
  ring(419, 1, 0.6);
  // Losanges et points alternés le long de la couronne.
  const count = 48;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.save();
    g.translate(o + 453 * k * Math.cos(a), o + 453 * k * Math.sin(a));
    g.rotate(a);
    g.globalAlpha = 0.7;
    if (i % 2 === 0) {
      g.beginPath();
      g.moveTo(-10 * k, 0);
      g.lineTo(0, -4 * k);
      g.lineTo(10 * k, 0);
      g.lineTo(0, 4 * k);
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.arc(0, 0, 2.2 * k, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  return finish(c);
}

/** Tache d'ombre ronde et floue (ombre de contact sous les objets et sous la table). */
function radialShadowTexture() {
  const n = 128;
  const [c, g] = canvas(n);
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  return t;
}

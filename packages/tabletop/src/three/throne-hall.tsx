'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, QuadraticBezierLine, Sparkles, useGLTF, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CENTER_TAG, type CouncilPose, type HallCouncillor, type HallFrame, type HallLink, type ThroneHallProps } from './ThroneHall3D';
import { Candelabrum, Keepsake, canvas, drawIcon, embroideryTexture, finish, radialShadowTexture, type Mats } from './council';
import { Flame, FlickerLight } from './parts';

/** Personnages (KayKit « Adventurers » de Kay Lousberg, CC0), armes retirées. */
const MODELS = ['knight', 'mage', 'rogue', 'barbarian', 'rogue-hooded'];
const TABLE_H = 0.8;
const SEAT_H = 0.5;
const ELEVATION = THREE.MathUtils.degToRad(33);
const FOV = 36;

/** Mesures de la salle, selon le nombre de conseillers. */
function layout(n: number) {
  const R = THREE.MathUtils.clamp(1.5 + n * 0.17, 2.1, 3.3);
  const S = R + 0.5;
  const dais = -(R + 4.2);
  return { R, S, dais, wall: dais - 1.5, colX: R + 3.4 };
}
type Layout = ReturnType<typeof layout>;

export default function ThroneHall(props: ThroneHallProps) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 6, 14] }}
    >
      <color attach="background" args={['#0d0605']} />
      <fog attach="fog" args={['#120806', 16, 42]} />
      <Ticker fps={30} />
      <Suspense fallback={null}>
        <World {...props} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} color="#ffe4b8" position={[0, 6, 6]} scale={[12, 4, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffc98a" position={[-8, 4, 0]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#9fbcff" position={[8, 4, -4]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
        </Environment>
      </Suspense>
      <EffectComposer multisampling={2} frameBufferType={THREE.UnsignedByteType}>
        <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.9} radius={0.65} />
        <Vignette offset={0.32} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}

/** Anime la scène à cadence réduite, et seulement quand elle est visible. */
function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree((st) => st.invalidate);
  const el = useThree((st) => st.gl.domElement);
  useEffect(() => {
    let onScreen = true;
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting;
    });
    io.observe(el);
    const id = window.setInterval(() => {
      if (onScreen && document.visibilityState === 'visible') invalidate();
    }, 1000 / fps);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, [el, fps, invalidate]);
  return null;
}

function World(p: ThroneHallProps) {
  const n = p.councillors.length;
  const L = useMemo(() => layout(n), [n]);
  const mats = useHallMaterials();

  // Le joueur s'assoit au premier rang, dos à la caméra ; les autres suivent autour de la table.
  const me = Math.max(0, p.councillors.findIndex((c) => c.id === p.viewer));
  const seats = useMemo(
    () =>
      p.councillors.map((c, i) => {
        const k = (i - me + n) % n;
        const a = Math.PI / 2 + (2 * Math.PI * k) / n;
        return { c, pos: new THREE.Vector3(L.S * Math.cos(a), 0, L.S * Math.sin(a)), yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
      }),
    [p.councillors, me, n, L.S],
  );
  const heads = useRef(new Map<string, THREE.Object3D>());

  return (
    <>
      <Rig L={L} frame={p.frame} />
      <Lights L={L} mood={p.mood ?? 'council'} />
      <Room L={L} mats={mats} />
      <Dais L={L} mats={mats} />
      <Chandelier mats={mats} position={[-(L.S + 1.4), 5.0, -0.6]} />
      <Chandelier mats={mats} position={[L.S + 1.4, 5.0, -0.6]} />
      <CouncilTable L={L} mats={mats} n={n} me={me} />
      {seats.map(({ c, pos, yaw }) => (
        <group key={c.id} position={pos} rotation={[0, yaw, 0]}>
          <Chair mats={mats} />
          <SeatRing ring={c.ring ?? null} />
          <Councillor
            base={p.base}
            c={c}
            onHead={(o) => {
              if (o) heads.current.set(c.id, o);
              else heads.current.delete(c.id);
            }}
            onPick={p.onPick ? () => p.onPick!(c.id) : undefined}
          />
        </group>
      ))}
      {p.links.map((l) => {
        const a = seats.find((s) => s.c.id === l.from)?.pos;
        const b = seats.find((s) => s.c.id === l.to)?.pos;
        return a && b ? <Arc key={`${l.from}-${l.to}`} from={a} to={b} color={l.color} /> : null;
      })}
      <Tags tags={p.tags} heads={heads} />
      <Sparkles count={60} scale={[L.colX * 2, 5, Math.abs(L.wall) + L.S + 2]} position={[0, 3, (L.wall + L.S) / 2]} size={3} speed={0.12} color="#ffe2a8" opacity={0.45} />
    </>
  );
}

// ───────── Caméra : cadrer la table et le trône dans la partie visible de l'écran ─────────

function Rig({ L, frame }: { L: Layout; frame: HallFrame }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const W = size.width;
    const H = size.height;
    const free = {
      x0: Math.min(W - 40, frame.left),
      x1: Math.max(frame.left + 40, W - frame.right),
      y0: Math.min(H - 40, frame.top),
      y1: Math.max(frame.top + 40, H - frame.bottom),
    };
    const cx = (free.x0 + free.x1) / 2;
    const cy = (free.y0 + free.y1) / 2;
    camera.fov = FOV;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    const target = new THREE.Vector3(0, 0.9, -L.R * 0.55);
    const dir = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    // Ce qui doit rester visible : les conseillers de côté et de face, et le trône au fond.
    const pts = [
      new THREE.Vector3(0, 0, L.S + 1.7),
      new THREE.Vector3(0, 2.1, L.S + 0.2),
      new THREE.Vector3(L.S + 0.75, 2.0, 0),
      new THREE.Vector3(-L.S - 0.75, 2.0, 0),
      new THREE.Vector3(0, 3.8, L.dais - 0.4),
    ];
    const m = 4;
    const fits = (d: number) => {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      return pts.every((q) => {
        const v = q.clone().project(camera);
        const x = ((v.x + 1) / 2) * W;
        const y = ((1 - v.y) / 2) * H;
        return v.z < 1 && x > free.x0 + m && x < free.x1 - m && y > free.y0 + m && y < free.y1 - m;
      });
    };
    let lo = 3;
    let hi = 70;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fits(hi);
    invalidate();
  }, [camera, size.width, size.height, frame.left, frame.right, frame.top, frame.bottom, L, invalidate]);
  return null;
}

/** Place chaque étiquette HTML au-dessus de la tête de son conseiller, à chaque image. */
function Tags({ tags, heads }: { tags: ThroneHallProps['tags']; heads: React.RefObject<Map<string, THREE.Object3D>> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const map = tags.current;
    if (!map) return;
    camera.updateMatrixWorld();
    map.forEach((el, id) => {
      const below = el.dataset.anchor === 'below';
      if (id === CENTER_TAG) v.set(0, TABLE_H + 0.05, 0);
      else {
        const h = heads.current?.get(id);
        if (!h) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          return;
        }
        h.getWorldPosition(v);
        // Le joueur, vu de dos au premier rang : son étiquette passe sous lui, pour ne rien cacher de la table.
        if (below) v.set(v.x * 1.12, 0.05, v.z * 1.12);
        else v.y += 0.42;
      }
      v.project(camera);
      if (v.z >= 1) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      const anchor = id === CENTER_TAG ? 'translate(-50%,-50%)' : below ? 'translate(-50%,0)' : 'translate(-50%,-100%)';
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * size.width).toFixed(1)}px,${(((1 - v.y) / 2) * size.height).toFixed(1)}px,0) ${anchor}`;
    });
  });
  return null;
}

// ───────── Matériaux et textures ─────────

type HallMats = Mats & Record<'wood' | 'darkWood' | 'velvet' | 'tuft' | 'marble' | 'floor' | 'wall' | 'carpet' | 'clothBlue' | 'thread' | 'tapestry' | 'glass' | 'shaft' | 'stone', THREE.Material>;

function useHallMaterials(): HallMats {
  const woodTex = useTexture('/themes/throne/table.jpg');
  return useMemo(() => {
    const wood = woodTex.clone();
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.colorSpace = THREE.SRGBColorSpace;
    wood.needsUpdate = true;
    const floor = marbleFloorTexture();
    floor.repeat.set(9, 9);
    const wall = damaskTexture();
    wall.repeat.set(10, 4);
    const shadow = radialShadowTexture();
    const tuft = tuftTexture();
    tuft.repeat.set(4, 4);
    return {
      wood: new THREE.MeshPhysicalMaterial({ map: wood, color: '#c47a40', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      darkWood: new THREE.MeshStandardMaterial({ map: wood, color: '#5a2c12', roughness: 0.55 }),
      gold: new THREE.MeshStandardMaterial({ color: '#e5b24c', metalness: 1, roughness: 0.24 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c9973e', metalness: 0.9, roughness: 0.32 }),
      velvet: new THREE.MeshPhysicalMaterial({ color: '#8e1712', roughness: 0.85, sheen: 1, sheenColor: new THREE.Color('#ff8a70'), sheenRoughness: 0.4, side: THREE.DoubleSide }),
      tuft: new THREE.MeshPhysicalMaterial({ map: tuft, color: '#ffffff', roughness: 0.7, sheen: 0.8, sheenColor: new THREE.Color('#ff9a80') }),
      marble: new THREE.MeshStandardMaterial({ map: marbleTexture(), color: '#f2ead8', roughness: 0.32 }),
      stone: new THREE.MeshStandardMaterial({ color: '#5a4a3e', roughness: 0.8 }),
      floor: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.22, metalness: 0.05, envMapIntensity: 0.8 }),
      wall: new THREE.MeshStandardMaterial({ map: wall, roughness: 0.85 }),
      carpet: new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.95 }),
      clothBlue: new THREE.MeshPhysicalMaterial({ color: '#1d3f9e', roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#8fb0ff'), sheenRoughness: 0.4 }),
      thread: new THREE.MeshStandardMaterial({ map: embroideryTexture(), color: '#f3c766', metalness: 0.85, roughness: 0.38, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      tapestry: new THREE.MeshStandardMaterial({ map: tapestryTexture(), roughness: 0.9 }),
      glass: new THREE.MeshBasicMaterial({ map: windowTexture(), transparent: true, toneMapped: false }),
      shaft: new THREE.MeshBasicMaterial({ map: shaftTexture(), color: '#9fbcff', transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      wax: new THREE.MeshStandardMaterial({ color: '#f4e8cc', roughness: 0.55, emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0.22 }),
      parchment: new THREE.MeshStandardMaterial({ color: '#ead6a6', roughness: 0.85 }),
      seal: new THREE.MeshStandardMaterial({ color: '#a3150f', roughness: 0.35, metalness: 0.1 }),
      ink: new THREE.MeshPhysicalMaterial({ color: '#10141c', roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
      wine: new THREE.MeshPhysicalMaterial({ color: '#4a0710', roughness: 0.05, clearcoat: 1 }),
      feather: new THREE.MeshStandardMaterial({ color: '#f6efe2', roughness: 0.8, side: THREE.DoubleSide }),
      shadow: new THREE.MeshBasicMaterial({ map: shadow, color: '#000', transparent: true, depthWrite: false, opacity: 0.7 }),
    };
  }, [woodTex]);
}

function repeatTex(t: THREE.CanvasTexture) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Dallage de marbre clair et sombre, veiné, aux joints dorés. */
function marbleFloorTexture() {
  const n = 1024;
  const [c, g] = canvas(n);
  const t = n / 2;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#2c2320' : '#ddd1b8';
      g.fillRect(i * t, j * t, t, t);
    }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 70; k++) {
    g.strokeStyle = rnd() > 0.5 ? 'rgba(120,100,80,.22)' : 'rgba(255,255,255,.12)';
    g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath();
    let x = rnd() * n;
    let y = rnd() * n;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rnd() - 0.5) * 160;
      y += (rnd() - 0.3) * 120;
      g.quadraticCurveTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 60, x, y);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(214,170,80,.85)';
  g.lineWidth = 4;
  g.strokeRect(0, 0, n, n);
  g.beginPath();
  g.moveTo(t, 0);
  g.lineTo(t, n);
  g.moveTo(0, t);
  g.lineTo(n, t);
  g.stroke();
  return repeatTex(finish(c));
}

function marbleTexture() {
  const n = 256;
  const [c, g] = canvas(n);
  g.fillStyle = '#f4ecdc';
  g.fillRect(0, 0, n, n);
  for (let k = 0; k < 18; k++) {
    g.strokeStyle = `rgba(150,130,110,${0.08 + (k % 3) * 0.05})`;
    g.lineWidth = 1 + (k % 3);
    g.beginPath();
    g.moveTo((k * 37) % n, 0);
    g.bezierCurveTo(((k * 53) % n) - 30, n / 3, ((k * 71) % n) + 30, (2 * n) / 3, (k * 29) % n, n);
    g.stroke();
  }
  return repeatTex(finish(c));
}

/** Damas rouge sombre semé de lys dorés. */
function damaskTexture() {
  const n = 256;
  const [c, g] = canvas(n);
  g.fillStyle = '#4a1410';
  g.fillRect(0, 0, n, n);
  g.fillStyle = 'rgba(225,170,80,.16)';
  drawIcon(g, 'fleur-de-lys', n / 4, n / 4, 70, 0);
  drawIcon(g, 'fleur-de-lys', (3 * n) / 4, (3 * n) / 4, 70, 0);
  g.fillStyle = 'rgba(225,170,80,.08)';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc((i % 2) * n + (i > 1 ? 0 : n / 2) - n / 4 + n / 4, (i > 1 ? n : 0) + (i % 2 ? n / 2 : 0) - n / 4 + n / 4, 6, 0, Math.PI * 2);
    g.fill();
  }
  return repeatTex(finish(c));
}

function carpetTexture() {
  const [c, g] = canvas(128);
  g.fillStyle = '#8e1712';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#d9a648';
  g.fillRect(0, 0, 10, 128);
  g.fillRect(118, 0, 10, 128);
  g.fillStyle = '#5e0c08';
  g.fillRect(14, 0, 3, 128);
  g.fillRect(111, 0, 3, 128);
  const t = repeatTex(finish(c));
  t.repeat.set(1, 12);
  return t;
}

/** Capitonnage du trône : velours rouge, losanges et boutons dorés. */
function tuftTexture() {
  const n = 128;
  const [c, g] = canvas(n);
  const grad = g.createRadialGradient(n / 2, n / 2, 4, n / 2, n / 2, n * 0.7);
  grad.addColorStop(0, '#c42e24');
  grad.addColorStop(1, '#6a0e0a');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(30,0,0,.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, n / 2);
  g.lineTo(n / 2, 0);
  g.lineTo(n, n / 2);
  g.lineTo(n / 2, n);
  g.closePath();
  g.stroke();
  g.fillStyle = '#f0cd6e';
  for (const [x, y] of [
    [n / 2, 0],
    [0, n / 2],
    [n, n / 2],
    [n / 2, n],
  ]) {
    g.beginPath();
    g.arc(x!, y!, 5, 0, Math.PI * 2);
    g.fill();
  }
  return repeatTex(finish(c));
}

/** Tapisserie bleue fleurdelisée, bordée d'or. */
function tapestryTexture() {
  const w = 512;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#14245a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(214,165,70,.7)';
  for (let y = 40; y < h; y += 80)
    for (let x = 40 + ((y / 80) % 2) * 40; x < w; x += 80) drawIcon(g, 'fleur-de-lys', x, y, 40, 0);
  g.strokeStyle = '#d9a648';
  g.lineWidth = 14;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.lineWidth = 3;
  g.strokeRect(30, 30, w - 60, h - 60);
  return finish(c);
}

/** Vitrail en ogive : losanges de verre bleu et or, plombs sombres, transparent hors de l'arc. */
function windowTexture() {
  const w = 256;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, w * 0.6);
  g.quadraticCurveTo(0, 0, w / 2, 0);
  g.quadraticCurveTo(w, 0, w, w * 0.6);
  g.lineTo(w, h);
  g.closePath();
  g.save();
  g.clip();
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#cfe0ff');
  grad.addColorStop(0.4, '#5d86e0');
  grad.addColorStop(1, '#22408e');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,200,90,.55)';
  for (let y = 60; y < h; y += 90) g.fillRect(0, y, w, 14);
  g.strokeStyle = 'rgba(20,12,8,.9)';
  g.lineWidth = 5;
  for (let k = -h; k < w + h; k += 42) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + h, h);
    g.moveTo(k, h);
    g.lineTo(k + h, 0);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = '#2a1a10';
  g.lineWidth = 12;
  g.stroke();
  return finish(c);
}

function shaftTexture() {
  const [c, g] = canvas(64);
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.3, 'rgba(0,0,0,0)');
  side.addColorStop(0.7, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 64);
  return finish(c);
}

function bannerTexture(crown: boolean) {
  const w = 256;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w, 0);
  g.lineTo(w, h);
  g.lineTo(w / 2, h - 110);
  g.lineTo(0, h);
  g.closePath();
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, crown ? '#0f2462' : '#3e0604');
  grad.addColorStop(0.3, crown ? '#2a56b8' : '#a3201a');
  grad.addColorStop(0.6, crown ? '#173a8c' : '#6e0f0a');
  grad.addColorStop(1, crown ? '#0f2462' : '#3e0604');
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = '#e9c46a';
  g.lineWidth = 10;
  g.stroke();
  g.fillStyle = '#f0cd6e';
  drawIcon(g, crown ? 'fleur-de-lys' : 'all-seeing-eye', w / 2, h * 0.36, 170, 0);
  return finish(c);
}

// ───────── Lumières ─────────

function Lights({ L, mood }: { L: Layout; mood: 'council' | 'crown' | 'shadow' }) {
  const throneTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 1.8, L.dais - 0.3);
    return o;
  }, [L.dais]);
  const r = L.S + 2;
  const tint = mood === 'crown' ? '#cfe0ff' : mood === 'shadow' ? '#ff9a80' : '#ffe1b0';
  return (
    <>
      <hemisphereLight args={['#ffd9a8', '#2a120a', 0.55]} />
      <directionalLight
        position={[-5, 11, 7]}
        intensity={1.6}
        color={tint}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r - 4}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[6, 7, L.wall + 2]} intensity={0.5} color="#9fbcff" />
      <primitive object={throneTarget} />
      <spotLight position={[0, 8.5, L.dais + 5]} target={throneTarget} angle={0.36} penumbra={0.7} intensity={70} distance={22} decay={1.6} color="#ffd59a" />
      <pointLight position={[0, 4.2, 1]} intensity={22} distance={14} decay={1.6} color="#ffc27a" />
    </>
  );
}

// ───────── La salle ─────────

function Room({ L, mats }: { L: Layout; mats: HallMats }) {
  const crown = useMemo(() => new THREE.MeshStandardMaterial({ map: bannerTexture(true), transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), []);
  const shadowBanner = useMemo(() => new THREE.MeshStandardMaterial({ map: bannerTexture(false), transparent: true, alphaTest: 0.5, roughness: 0.8, side: THREE.DoubleSide }), []);
  const depth = L.S + 8 - L.wall;
  const zMid = (L.S + 8 + L.wall) / 2;
  const cols: number[] = [];
  for (let z = L.dais + 0.4; z < L.S + 4; z += 3.1) cols.push(z);
  return (
    <>
      {/* Sol de marbre et tapis rouge jusqu'au trône */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zMid]} material={mats.floor} receiveShadow>
        <planeGeometry args={[40, depth + 10]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, (L.S + 6 + L.dais + 1.6) / 2]} material={mats.carpet} receiveShadow>
        <planeGeometry args={[2.3, L.S + 6 - (L.dais + 1.6)]} />
      </mesh>

      {/* Murs de damas */}
      <mesh position={[0, 6, L.wall]} material={mats.wall} receiveShadow>
        <planeGeometry args={[40, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (L.colX + 2.6), 6, zMid]} rotation={[0, -s * (Math.PI / 2), 0]} material={mats.wall}>
          <planeGeometry args={[depth + 10, 12]} />
        </mesh>
      ))}
      {/* Lambris sombre au pied des murs */}
      <mesh position={[0, 0.6, L.wall + 0.02]} material={mats.darkWood}>
        <planeGeometry args={[40, 1.2]} />
      </mesh>

      {/* Colonnades de marbre, chapiteaux et bases dorés, entablement */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {cols.map((z) => (
            <Column key={z} position={[s * L.colX, 0, z]} mats={mats} />
          ))}
          <mesh position={[s * L.colX, 7.85, (cols[0]! + cols[cols.length - 1]!) / 2]} material={mats.marble} castShadow>
            <boxGeometry args={[1.1, 0.5, cols[cols.length - 1]! - cols[0]! + 1.2]} />
          </mesh>
          <mesh position={[s * L.colX, 7.58, (cols[0]! + cols[cols.length - 1]!) / 2]} material={mats.gold}>
            <boxGeometry args={[1.14, 0.06, cols[cols.length - 1]! - cols[0]! + 1.24]} />
          </mesh>
        </group>
      ))}

      {/* Vitraux et rais de lumière */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 5.6, 0, L.wall + 0.03]}>
          <mesh position={[0, 4.6, 0]} material={mats.glass}>
            <planeGeometry args={[1.5, 3.75]} />
          </mesh>
          <mesh position={[-s * 1.2, 3.0, 2.6]} rotation={[-0.9, -s * 0.35, 0]} material={mats.shaft}>
            <planeGeometry args={[1.6, 6.5]} />
          </mesh>
        </group>
      ))}

      {/* Bannières des deux camps */}
      <Banner position={[-3.35, 4.1, L.wall + 0.08]} material={crown} seed={0} />
      <Banner position={[3.35, 4.1, L.wall + 0.08]} material={shadowBanner} seed={1.7} />

      {/* Torchères sur les colonnes les plus proches du trône */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (L.colX - 0.5), 2.6, cols[1] ?? L.dais + 3]}>
          <mesh material={mats.gold}>
            <cylinderGeometry args={[0.07, 0.04, 0.5, 10]} />
          </mesh>
          <Flame position={[0, 0.25, 0]} size={0.16} seed={s + 3} />
          <FlickerLight position={[0, 0.6, 0]} color="#ffa14a" intensity={1.4} distance={7} seed={s + 3} />
        </group>
      ))}
    </>
  );
}

function Column({ position, mats }: { position: [number, number, number]; mats: HallMats }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} material={mats.marble} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.5, 1.0]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={mats.gold}>
        <cylinderGeometry args={[0.44, 0.48, 0.12, 28]} />
      </mesh>
      <mesh position={[0, 4.0, 0]} material={mats.marble} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.38, 6.8, 28]} />
      </mesh>
      <mesh position={[0, 7.38, 0]} material={mats.gold} castShadow>
        <cylinderGeometry args={[0.52, 0.36, 0.36, 28]} />
      </mesh>
      <mesh position={[0, 7.0, 0]} material={mats.gold}>
        <torusGeometry args={[0.37, 0.05, 8, 28]} />
      </mesh>
    </group>
  );
}

function Banner({ position, material, seed }: { position: [number, number, number]; material: THREE.Material; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = 0.03 * Math.sin(clock.elapsedTime * 0.8 + seed);
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.55, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 10]} />
        <meshStandardMaterial color="#e5b24c" metalness={1} roughness={0.25} />
      </mesh>
      <group ref={ref} position={[0, 1.55, 0]}>
        <mesh position={[0, -1.6, 0]} material={material}>
          <planeGeometry args={[1.25, 3.2]} />
        </mesh>
      </group>
    </group>
  );
}

// ───────── L'estrade, le baldaquin et le trône ─────────

function Dais({ L, mats }: { L: Layout; mats: HallMats }) {
  const z = L.dais;
  const steps = [
    { w: 5.6, d: 3.6, y: 0.11 },
    { w: 4.7, d: 3.0, y: 0.33 },
    { w: 3.8, d: 2.4, y: 0.55 },
  ];
  const curtain = useMemo(() => drapeGeometry(1.5, 5.6), []);
  return (
    <group>
      {steps.map((s, i) => (
        <group key={i}>
          <mesh position={[0, s.y, z - (3.6 - s.d) / 2]} material={mats.marble} castShadow receiveShadow>
            <boxGeometry args={[s.w, 0.22, s.d]} />
          </mesh>
          <mesh position={[0, s.y + 0.11, z - (3.6 - s.d) / 2 + s.d / 2]} material={mats.gold}>
            <boxGeometry args={[s.w + 0.02, 0.03, 0.04]} />
          </mesh>
          <mesh position={[0, s.y + 0.115, z - (3.6 - s.d) / 2]} material={mats.carpet} receiveShadow>
            <boxGeometry args={[1.8, 0.01, s.d]} />
          </mesh>
        </group>
      ))}
      {/* Tapisserie et baldaquin */}
      <mesh position={[0, 3.3, L.wall + 0.06]} material={mats.tapestry}>
        <planeGeometry args={[3.6, 5.4]} />
      </mesh>
      <group position={[0, 6.1, z - 1.0]}>
        <mesh material={mats.velvet} castShadow>
          <boxGeometry args={[4.6, 0.6, 1.5]} />
        </mesh>
        <mesh position={[0, 0.33, 0]} material={mats.gold}>
          <boxGeometry args={[4.7, 0.08, 1.6]} />
        </mesh>
        <mesh position={[0, -0.32, 0.76]} material={mats.gold}>
          <boxGeometry args={[4.62, 0.06, 0.04]} />
        </mesh>
        <Fringe width={4.5} z={0.77} mats={mats} />
        <Crown position={[0, 0.55, 0.2]} scale={0.6} mats={mats} />
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={curtain} position={[s * 2.0, 0.2, z - 0.4]} rotation={[0, s * 0.25, 0]} material={mats.velvet} castShadow />
      ))}
      <Throne position={[0, 0.66, z - 0.35]} mats={mats} />
    </group>
  );
}

/** Rideau de velours : un plan plissé, resserré vers le bas comme s'il était retenu. */
function drapeGeometry(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h, 30, 40);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (h / 2 - y) / h;
    const pinch = 1 - 0.45 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * (t < 0.62 ? 1 : 1 - (t - 0.62) * 1.4);
    pos.setX(i, x * pinch);
    pos.setZ(i, Math.sin((x / w) * Math.PI * 7) * 0.09 * (0.6 + t));
    pos.setY(i, y + h / 2);
  }
  g.computeVertexNormals();
  return g;
}

function Fringe({ width, z, mats }: { width: number; z: number; mats: HallMats }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 34;
  const geo = useMemo(() => new THREE.SphereGeometry(0.05, 10, 8), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(-width / 2 + (width * i) / (count - 1), -0.38, z);
      ref.current?.setMatrixAt(i, m);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [width, z]);
  return <instancedMesh ref={ref} args={[geo, mats.gold, count]} />;
}

function Crown({ position, scale, mats }: { position: [number, number, number]; scale: number; mats: HallMats }) {
  return (
    <group position={position} scale={scale}>
      <mesh material={mats.gold} castShadow>
        <cylinderGeometry args={[0.32, 0.3, 0.22, 24, 1, true]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[0.31 * Math.cos(a), 0.2, 0.31 * Math.sin(a)]}>
            <mesh material={mats.gold}>
              <coneGeometry args={[0.06, 0.2, 8]} />
            </mesh>
            <mesh position={[0, 0.13, 0]} material={mats.gold}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0, 0.31]} material={mats.seal}>
        <sphereGeometry args={[0.05, 10, 10]} />
      </mesh>
    </group>
  );
}

/** Le trône vide : grand dossier doré en ogive, capitonné de velours, lys d'or, couronne au sommet. */
function Throne({ position, mats }: { position: [number, number, number]; mats: HallMats }) {
  const geo = useMemo(() => {
    const arch = (hw: number, y0: number, y1: number, top: number) => {
      const s = new THREE.Shape();
      s.moveTo(-hw, y0);
      s.lineTo(-hw, y1);
      s.quadraticCurveTo(-hw, (y1 + top) / 2 + 0.15, 0, top);
      s.quadraticCurveTo(hw, (y1 + top) / 2 + 0.15, hw, y1);
      s.lineTo(hw, y0);
      s.closePath();
      return s;
    };
    return {
      back: new THREE.ExtrudeGeometry(arch(0.82, 0, 1.95, 3.0), { depth: 0.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 24 }),
      pad: new THREE.ExtrudeGeometry(arch(0.62, 0.82, 2.0, 2.72), { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 24 }),
    };
  }, []);
  const lys = useMemo(() => {
    const [c, g] = canvas(256);
    g.fillStyle = '#ffffff';
    drawIcon(g, 'fleur-de-lys', 128, 128, 230, 0);
    const t = finish(c);
    return new THREE.MeshStandardMaterial({ map: t, color: '#f3d27a', metalness: 1, roughness: 0.25, transparent: true, alphaTest: 0.4 });
  }, []);
  return (
    <group position={position}>
      <mesh geometry={geo.back} material={mats.gold} position={[0, 0, -0.45]} castShadow receiveShadow />
      <mesh geometry={geo.pad} material={mats.tuft} position={[0, 0, -0.22]} castShadow />
      <mesh position={[0, 2.05, -0.12]} material={lys}>
        <planeGeometry args={[0.55, 0.55]} />
      </mesh>
      <Crown position={[0, 3.12, -0.35]} scale={0.55} mats={mats} />
      {/* Montants et pommeaux */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.95, 1.2, -0.35]} material={mats.gold} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 2.4, 14]} />
          </mesh>
          <mesh position={[s * 0.95, 2.48, -0.35]} material={mats.gold}>
            <sphereGeometry args={[0.14, 18, 14]} />
          </mesh>
          {/* Accoudoirs en volute */}
          <mesh position={[s * 0.9, 1.0, 0.05]} material={mats.gold} castShadow>
            <boxGeometry args={[0.16, 0.12, 0.9]} />
          </mesh>
          <mesh position={[s * 0.9, 1.0, 0.52]} rotation={[0, Math.PI / 2, 0]} material={mats.gold}>
            <torusGeometry args={[0.09, 0.04, 8, 20]} />
          </mesh>
          <mesh position={[s * 0.9, 0.72, 0.4]} material={mats.gold}>
            <cylinderGeometry args={[0.05, 0.06, 0.55, 10]} />
          </mesh>
          {/* Pattes de lion */}
          {[-0.3, 0.45].map((z) => (
            <mesh key={z} position={[s * 0.75, 0.08, z]} scale={[1, 0.7, 1.2]} material={mats.gold}>
              <sphereGeometry args={[0.11, 14, 10]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Assise et coussin */}
      <mesh position={[0, 0.45, 0.08]} material={mats.gold} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.5, 1.0]} />
      </mesh>
      <mesh position={[0, 0.78, 0.08]} material={mats.velvet} castShadow>
        <boxGeometry args={[1.42, 0.18, 0.92]} />
      </mesh>
      <mesh position={[0, 0.42, 0.59]} material={mats.velvet}>
        <boxGeometry args={[1.3, 0.3, 0.02]} />
      </mesh>
    </group>
  );
}

// ───────── Lustre ─────────

function Chandelier({ mats, position }: { mats: HallMats; position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.05;
  });
  const arms = 10;
  return (
    <group ref={ref} position={position} scale={0.7}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[0.55 * Math.cos(a), 2.2, 0.55 * Math.sin(a)]} rotation={[0.25 * Math.sin(a), 0, -0.25 * Math.cos(a)]} material={mats.gold}>
            <cylinderGeometry args={[0.015, 0.015, 4.4, 6]} />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.gold}>
        <torusGeometry args={[1.15, 0.05, 10, 60]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} material={mats.gold}>
        <torusGeometry args={[0.55, 0.035, 8, 40]} />
      </mesh>
      <mesh position={[0, -0.45, 0]} material={mats.gold}>
        <sphereGeometry args={[0.14, 16, 12]} />
      </mesh>
      {Array.from({ length: arms }, (_, i) => {
        const a = (i / arms) * Math.PI * 2;
        return (
          <group key={i} position={[1.15 * Math.cos(a), 0.04, 1.15 * Math.sin(a)]}>
            <mesh position={[0, 0.12, 0]} material={mats.wax}>
              <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
            </mesh>
            <Flame position={[0, 0.24, 0]} size={0.06} seed={i} />
          </group>
        );
      })}
    </group>
  );
}

// ───────── Table du Conseil ─────────

function CouncilTable({ L, mats, n, me }: { L: Layout; mats: HallMats; n: number; me: number }) {
  const { R } = L;
  const cloth = R * 0.8;
  const pedestal = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.0, 0],
          [0.7, 0],
          [0.72, 0.06],
          [0.5, 0.14],
          [0.26, 0.24],
          [0.2, 0.4],
          [0.26, 0.5],
          [0.18, 0.62],
          [0.22, 0.7],
          [0.0, 0.72],
        ].map(([r, y]) => new THREE.Vector2(r!, y!)),
        40,
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={pedestal} material={mats.darkWood} castShadow receiveShadow />
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={[R * 2.8, R * 2.8, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[0, TABLE_H - 0.04, 0]} material={[mats.darkWood, mats.wood, mats.darkWood]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R * 0.97, 0.08, 96]} />
      </mesh>
      <mesh position={[0, TABLE_H - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.gold} castShadow>
        <torusGeometry args={[R, 0.022, 10, 120]} />
      </mesh>
      <mesh position={[0, TABLE_H + 0.004, 0]} material={mats.clothBlue} receiveShadow>
        <cylinderGeometry args={[cloth, cloth, 0.008, 96]} />
      </mesh>
      <mesh position={[0, TABLE_H + 0.0095, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.thread} receiveShadow>
        <planeGeometry args={[cloth * 2, cloth * 2]} />
      </mesh>
      <mesh position={[0, TABLE_H + 0.008, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.gold}>
        <torusGeometry args={[cloth, 0.012, 8, 100]} />
      </mesh>
      {[-1, 1].map((s) => (
        <Candelabrum key={s} position={[s * R * 0.42, TABLE_H + 0.008, -R * 0.1]} yaw={0} u={1.9} mats={mats} seed={s + 2} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const k = (i - me + n) % n;
        const a = Math.PI / 2 + (2 * Math.PI * k) / n + 0.32;
        return <Keepsake key={i} kind={i % 4} position={[(R - 0.3) * Math.cos(a), TABLE_H + 0.004, (R - 0.3) * Math.sin(a)]} yaw={-a} u={1.6} mats={mats} />;
      })}
    </group>
  );
}

/** Chaise à haut dossier : bois sombre, velours rouge, pommeaux dorés. Le dos est vers -z. */
function Chair({ mats }: { mats: HallMats }) {
  return (
    <group position={[0, 0, -0.08]}>
      <mesh position={[0, SEAT_H - 0.04, 0]} material={mats.darkWood} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.08, 0.58]} />
      </mesh>
      <mesh position={[0, SEAT_H + 0.02, 0.02]} material={mats.velvet} castShadow>
        <boxGeometry args={[0.54, 0.05, 0.5]} />
      </mesh>
      {[
        [-0.27, -0.25],
        [0.27, -0.25],
        [-0.27, 0.25],
        [0.27, 0.25],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x!, (SEAT_H - 0.08) / 2, z!]} material={mats.darkWood} castShadow>
          <cylinderGeometry args={[0.03, 0.025, SEAT_H - 0.08, 8]} />
        </mesh>
      ))}
      <mesh position={[0, SEAT_H + 0.42, -0.3]} material={mats.darkWood} castShadow>
        <boxGeometry args={[0.64, 0.84, 0.07]} />
      </mesh>
      <mesh position={[0, SEAT_H + 0.42, -0.26]} material={mats.velvet}>
        <boxGeometry args={[0.46, 0.6, 0.03]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, SEAT_H + 0.88, -0.3]} material={mats.gold}>
          <sphereGeometry args={[0.055, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/** Cercle lumineux au pied du siège : or (Régent), bleu (Sénéchal proposé), blanc (choix en cours). */
function SeatRing({ ring }: { ring: HallCouncillor['ring'] }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  const color = ring === 'regent' ? '#ffcf6a' : ring === 'nominee' ? '#7fa8ff' : '#fff4d6';
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = ring === 'pickable' ? 0.25 + 0.2 * Math.sin(clock.elapsedTime * 4) : ring === 'picked' ? 0.95 : 0.75;
    ref.current.opacity = pulse;
  });
  if (!ring) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.55, ring === 'picked' ? 0.72 : 0.66, 48]} />
      <meshBasicMaterial ref={ref} color={new THREE.Color(color).multiplyScalar(2.2)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Arc lumineux du Régent vers son Sénéchal (ou vers la cible d'un pouvoir). */
function Arc({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const ref = useRef<{ material: { dashOffset: number } } | null>(null);
  const a = useMemo(() => from.clone().setY(1.75).lerp(new THREE.Vector3(0, 1.75, 0), 0.25), [from]);
  const b = useMemo(() => to.clone().setY(1.75).lerp(new THREE.Vector3(0, 1.75, 0), 0.25), [to]);
  const mid = useMemo(() => a.clone().lerp(b, 0.5).setY(2.9), [a, b]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.material.dashOffset -= dt * 0.8;
  });
  return (
    <QuadraticBezierLine
      ref={ref as never}
      start={a}
      end={b}
      mid={mid}
      color={new THREE.Color(color).multiplyScalar(2.5)}
      lineWidth={4}
      dashed
      dashSize={0.25}
      gapSize={0.12}
      transparent
      toneMapped={false}
    />
  );
}

// ───────── Conseillers ─────────

const POSES: Record<CouncilPose, { clip: string; loop: boolean }> = {
  sit: { clip: 'Sit_Chair_Idle', loop: true },
  stand: { clip: 'Idle', loop: true },
  cheer: { clip: 'Cheer', loop: true },
  dead: { clip: 'Death_A_Pose', loop: false },
};

const _v = new THREE.Vector3();

function Councillor({ base, c, onHead, onPick }: { base: string; c: HallCouncillor; onHead: (o: THREE.Object3D | null) => void; onPick?: () => void }) {
  const gltf = useGLTF(`${base}${MODELS[c.model % MODELS.length]}.glb`);
  const obj = useMemo(() => {
    const o = cloneSkinned(gltf.scene);
    o.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (c.tint) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.color.multiply(new THREE.Color(c.tint));
        mesh.material = mat;
      }
    });
    return o;
  }, [gltf, c.tint]);
  // Même échelle pour tous (les chapeaux faussent une mesure par boîte englobante).
  const scale = 0.95;
  const bones = useMemo(() => {
    let hips: THREE.Object3D | undefined;
    let head: THREE.Object3D | undefined;
    obj.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      if (!hips && /hips/i.test(o.name)) hips = o;
      if (!head && /^head$/i.test(o.name)) head = o;
    });
    return { hips, head };
  }, [obj]);
  useEffect(() => {
    onHead(bones.head ?? obj);
    return () => onHead(null);
  }, [bones.head, obj]); // eslint-disable-line react-hooks/exhaustive-deps

  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj]);
  const offset = useRef(new THREE.Vector3());
  useEffect(() => {
    mixer.stopAllAction();
    const spec = POSES[c.pose];
    const clip = THREE.AnimationClip.findByName(gltf.animations, spec.clip) ?? THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    if (!clip) return;
    const a = mixer.clipAction(clip);
    a.reset();
    if (spec.loop) {
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.time = Math.random() * clip.duration;
    } else {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    }
    a.play();
    mixer.update(spec.loop ? 0 : clip.duration);
    // Assis : on cale le bassin sur le coussin de la chaise, quel que soit le modèle.
    obj.position.set(0, 0, 0);
    obj.scale.setScalar(scale);
    obj.updateMatrixWorld(true);
    if (c.pose === 'sit' && bones.hips) {
      bones.hips.getWorldPosition(_v);
      obj.parent?.worldToLocal(_v);
      offset.current.set(0, SEAT_H + 0.1 - _v.y, -0.06 - _v.z);
    } else if (c.pose === 'dead') offset.current.set(0.2, 0, -1.05);
    else offset.current.set(0.75, 0, -0.1);
    obj.position.copy(offset.current);
  }, [c.pose, mixer, gltf, obj, scale, bones.hips]);

  useFrame((_, dt) => {
    mixer.update(Math.min(dt, 0.1));
  });

  return (
    <primitive
      object={obj}
      onClick={
        onPick
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onPick();
            }
          : undefined
      }
      onPointerOver={onPick ? () => (document.body.style.cursor = 'pointer') : undefined}
      onPointerOut={onPick ? () => (document.body.style.cursor = '') : undefined}
    />
  );
}

for (const m of MODELS) useGLTF.preload(`/themes/throne/3d/${m}.glb`);



'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CellarDrinker, CellarProps, DrinkerPose } from './Cellar3D';
import { canvas, finish, lathe, radialShadowTexture } from './council';
import { Flame, FlickerLight } from './parts';

/** Personnages (KayKit « Adventurers » de Kay Lousberg, CC0), les mêmes que la salle du trône. */
const MODELS = ['knight', 'mage', 'rogue', 'barbarian', 'rogue-hooded'];
const CENTER = '__center';
const TABLE_H = 0.8;
const SEAT_H = 0.5;
const ELEVATION = THREE.MathUtils.degToRad(47);
const FOV = 30;

/** Rayon du tonneau et distance des tabourets, selon le nombre de joueurs. */
function layout(n: number) {
  const R = THREE.MathUtils.clamp(1.35 + n * 0.13, 1.7, 2.45);
  return { R, S: R + 0.45 };
}
type Layout = ReturnType<typeof layout>;

export default function CellarScene(props: CellarProps) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.1, far: 80, position: [0, 6, 10] }}
      style={{ background: 'transparent' }}
    >
      <Ticker fps={30} />
      <Suspense fallback={null}>
        <World {...props} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.8} color="#ffcf94" position={[0, 6, 5]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ff9a3c" position={[-7, 3, -1]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ff9a3c" position={[7, 3, -1]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#9fb4d8" position={[0, 4, -7]} scale={[10, 3, 1]} />
        </Environment>
      </Suspense>
      <EffectComposer multisampling={2} frameBufferType={THREE.UnsignedByteType}>
        <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.8} radius={0.6} />
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

function World(p: CellarProps) {
  const n = p.drinkers.length;
  const L = useMemo(() => layout(n), [n]);
  const mats = useCellarMaterials();
  // Le joueur de cet écran est au premier rang, dos à la caméra ; les autres suivent autour du tonneau.
  const me = Math.max(0, p.drinkers.findIndex((d) => d.id === p.viewer));
  const seats = useMemo(
    () =>
      p.drinkers.map((d, i) => {
        const k = (i - me + n) % n;
        const a = Math.PI / 2 + (2 * Math.PI * k) / n;
        return { d, a, pos: new THREE.Vector3(L.S * Math.cos(a), 0, L.S * Math.sin(a)), yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
      }),
    [p.drinkers, me, n, L.S],
  );
  const heads = useRef(new Map<string, THREE.Object3D>());
  return (
    <>
      <Rig L={L} />
      <Lights L={L} />
      <Floor L={L} />
      <Barrel L={L} mats={mats} />
      {seats.map(({ d, a, pos, yaw }) => (
        <group key={d.id}>
          <group position={pos} rotation={[0, yaw, 0]}>
            <Stool mats={mats} />
            {d.active && <SeatGlow />}
            <Drinker
              base={p.base}
              d={d}
              onHead={(o) => {
                if (o) heads.current.set(d.id, o);
                else heads.current.delete(d.id);
              }}
            />
          </group>
          {d.cup !== 'none' && <Cup position={[L.R * 0.68 * Math.cos(a), TABLE_H, L.R * 0.68 * Math.sin(a)]} yaw={yaw} lift={d.cup === 'lift'} dice={d.dice} shake={p.shake} seed={a} mats={mats} />}
        </group>
      ))}
      <Tags tags={p.tags} heads={heads} />
    </>
  );
}

// ───────── Caméra : toute la tablée tient dans le cadre ─────────

function Rig({ L }: { L: Layout }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const W = size.width;
    const H = size.height;
    camera.fov = FOV;
    camera.aspect = W / H;
    const target = new THREE.Vector3(0, 0.75, 0);
    const dir = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    // Ce qui doit rester visible : le joueur de devant (et son étiquette dessous), les têtes du fond et des côtés.
    const pts = [
      new THREE.Vector3(0, 0, L.S + 0.55),
      new THREE.Vector3(0, 2.15, -L.S),
      new THREE.Vector3(L.S + 0.4, 1.9, 0),
      new THREE.Vector3(-L.S - 0.4, 1.9, 0),
      new THREE.Vector3(L.S * 0.75, 0, L.S * 0.75),
      new THREE.Vector3(-L.S * 0.75, 0, L.S * 0.75),
    ];
    const m = 6;
    const fits = (d: number) => {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      return pts.every((q) => {
        const v = q.clone().project(camera);
        const x = ((v.x + 1) / 2) * W;
        const y = ((1 - v.y) / 2) * H;
        return v.z < 1 && x > m && x < W - m && y > m + 34 + H * 0.14 && y < H - m - 44;
      });
    };
    let lo = 2;
    let hi = 60;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fits(hi);
    invalidate();
  }, [camera, size.width, size.height, L, invalidate]);
  return null;
}

/** Place chaque étiquette HTML au-dessus de la tête de son joueur (le sien : sous lui), à chaque image. */
function Tags({ tags, heads }: { tags: CellarProps['tags']; heads: React.RefObject<Map<string, THREE.Object3D>> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const map = tags.current;
    if (!map) return;
    camera.updateMatrixWorld();
    map.forEach((el, id) => {
      const below = el.dataset.anchor === 'below';
      if (id === CENTER) v.set(0, TABLE_H + 0.02, 0);
      else {
        const h = heads.current?.get(id);
        if (!h) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          return;
        }
        h.getWorldPosition(v);
        if (below) v.set(v.x * 1.1, 0.02, v.z * 1.1);
        else v.y += 0.38;
      }
      v.project(camera);
      if (v.z >= 1) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      const anchor = id === CENTER ? 'translate(-50%,-50%)' : below ? 'translate(-50%,0)' : 'translate(-50%,-100%)';
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * size.width).toFixed(1)}px,${(((1 - v.y) / 2) * size.height).toFixed(1)}px,0) ${anchor}`;
    });
  });
  return null;
}

// ───────── Matériaux ─────────

type CellarMats = Record<'lid' | 'staves' | 'iron' | 'pewter' | 'stool' | 'bone' | 'pip' | 'shadow', THREE.Material>;

function useCellarMaterials(): CellarMats {
  const planks = useTexture('/themes/cups/table.jpg');
  return useMemo(() => {
    const lid = planks.clone();
    lid.wrapS = lid.wrapT = THREE.RepeatWrapping;
    lid.repeat.set(1.4, 1.4);
    lid.colorSpace = THREE.SRGBColorSpace;
    lid.anisotropy = 8;
    lid.needsUpdate = true;
    // Douelles : les planches de la texture, tournées à la verticale tout autour du fût.
    const staves = planks.clone();
    staves.wrapS = staves.wrapT = THREE.RepeatWrapping;
    staves.repeat.set(1, 6);
    staves.rotation = Math.PI / 2;
    staves.colorSpace = THREE.SRGBColorSpace;
    staves.needsUpdate = true;
    return {
      lid: new THREE.MeshPhysicalMaterial({ map: lid, bumpMap: lid, bumpScale: 1.5, color: '#d08a50', roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      staves: new THREE.MeshStandardMaterial({ map: staves, color: '#9a6232', roughness: 0.7 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.85, roughness: 0.45 }),
      pewter: new THREE.MeshStandardMaterial({ color: '#cfd3d8', metalness: 0.75, roughness: 0.32, envMapIntensity: 1.4 }),
      stool: new THREE.MeshStandardMaterial({ map: lid, color: '#6a3c1c', roughness: 0.7 }),
      bone: new THREE.MeshStandardMaterial({ color: '#f1e6cf', roughness: 0.45 }),
      pip: new THREE.MeshStandardMaterial({ color: '#2a0806', roughness: 0.6 }),
      shadow: new THREE.MeshBasicMaterial({ map: radialShadowTexture(), color: '#000', transparent: true, depthWrite: false, opacity: 0.75 }),
    };
  }, [planks]);
}

// ───────── Lumières : deux torches et le halo au-dessus du tonneau ─────────

function Lights({ L }: { L: Layout }) {
  const r = L.S + 1.5;
  return (
    <>
      <hemisphereLight args={['#ffd9a8', '#1a1410', 0.55]} />
      <directionalLight
        position={[-3, 9, 5]}
        intensity={1.3}
        color="#ffe1b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <FlickerLight position={[-(L.S + 1.6), 2.6, -1.2]} color="#ff9a3c" intensity={2.2} distance={0} seed={1} />
      <FlickerLight position={[L.S + 1.6, 2.6, -1.2]} color="#ff9a3c" intensity={2.2} distance={0} seed={2} />
      <pointLight position={[0, 2.6, 0.6]} intensity={14} distance={9} decay={1.6} color="#ffc27a" />
    </>
  );
}

// ───────── Le sol : dalles de pierre sous la tablée, qui se fondent dans le décor ─────────

function Floor({ L }: { L: Layout }) {
  const mat = useMemo(() => {
    const map = flagstoneTexture();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4.5, 4.5);
    return new THREE.MeshStandardMaterial({ map, alphaMap: fadeTexture(), transparent: true, depthWrite: false, roughness: 0.85, color: '#a9adb4' });
  }, []);
  // Le sol s'étend loin derrière les joueurs du fond : où que tombe le décor, personne ne flotte.
  const r = L.S + 3.4;
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.1]} receiveShadow>
      <circleGeometry args={[r, 72]} />
    </mesh>
  );
}

/** Dalles irrégulières, joints sombres, comme le sol peint du décor. */
function flagstoneTexture() {
  const n = 1024;
  const [c, g] = canvas(n);
  g.fillStyle = '#141619';
  g.fillRect(0, 0, n, n);
  const rows = 6;
  const h = n / rows;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -h * 0.5 : 0;
    while (x < n) {
      const w = h * (0.9 + rnd() * 0.8);
      const shade = 34 + Math.floor(rnd() * 12);
      g.fillStyle = `rgb(${shade},${shade + 3},${shade + 8})`;
      g.fillRect(x + 5, r * h + 5, w - 10, h - 10);
      // grain de la pierre
      for (let k = 0; k < 40; k++) {
        g.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.03})`;
        g.fillRect(x + 5 + rnd() * (w - 14), r * h + 5 + rnd() * (h - 14), 2 + rnd() * 6, 2 + rnd() * 4);
      }
      x += w;
    }
  }
  return finish(c);
}

/** Masque : plein au centre, qui s'efface vers le bord (le sol se fond dans celui du décor). */
function fadeTexture() {
  const n = 256;
  const [c, g] = canvas(n);
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.5, '#fff');
  grad.addColorStop(0.8, '#666');
  grad.addColorStop(1, '#000');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  return new THREE.CanvasTexture(c);
}

// ───────── Le tonneau-table ─────────

function Barrel({ L, mats }: { L: Layout; mats: CellarMats }) {
  const { R } = L;
  const body = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.84, 0],
          [0.93, 0.18],
          [0.98, 0.4],
          [0.95, 0.62],
          [0.9, TABLE_H - 0.02],
        ].map(([r, y]) => new THREE.Vector2(r! * R, y!)),
        64,
      ),
    [R],
  );
  const hoop = (y: number, k: number) => (
    <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.iron} castShadow>
      <torusGeometry args={[R * k, 0.028, 8, 96]} />
    </mesh>
  );
  return (
    <group>
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} scale={[R * 3.2, R * 3.2, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh geometry={body} material={mats.staves} castShadow receiveShadow />
      {/* Dessus : le fond du tonneau, un peu débordant, posé dans son jable */}
      <mesh position={[0, TABLE_H - 0.03, 0]} material={[mats.iron, mats.lid, mats.iron]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 0.93, R * 0.93, 0.06, 96]} />
      </mesh>
      <mesh position={[0, TABLE_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.iron} castShadow>
        <torusGeometry args={[R * 0.93, 0.035, 10, 120]} />
      </mesh>
      {hoop(0.1, 0.875)}
      {hoop(0.28, 0.955)}
      {hoop(0.56, 0.965)}
      {/* Bonde de laiton et petite bougie pour la chaleur */}
      <group position={[R * 0.32, TABLE_H, -R * 0.36]}>
        <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={[0.3, 0.3, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <mesh material={mats.iron} position={[0, 0.015, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.03, 20]} />
        </mesh>
        <mesh material={mats.bone} position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.033, 0.14, 14]} />
        </mesh>
        <Flame position={[0, 0.17, 0]} size={0.035} seed={4} />
      </group>
    </group>
  );
}

/** Tabouret à trois pieds ; le joueur s'y assoit (face à +z, le tonneau). */
function Stool({ mats }: { mats: CellarMats }) {
  return (
    <group position={[0, 0, -0.08]}>
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[0.8, 0.8, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[0, SEAT_H - 0.03, 0]} material={mats.stool} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 24]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[0.15 * Math.cos(a), (SEAT_H - 0.06) / 2, 0.15 * Math.sin(a)]} rotation={[0.12 * Math.sin(a), 0, -0.12 * Math.cos(a)]} material={mats.stool} castShadow>
            <cylinderGeometry args={[0.025, 0.03, SEAT_H - 0.04, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Cercle ambré au pied du tabouret de celui qui doit parler. */
function SeatGlow() {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.opacity = 0.55 + 0.3 * Math.sin(clock.elapsedTime * 3.5);
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -0.08]}>
      <ringGeometry args={[0.42, 0.52, 48]} />
      <meshBasicMaterial ref={ref} color={new THREE.Color('#ff9a3c').multiplyScalar(2)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ───────── Gobelet d'étain et dés ─────────

const PIPS: [number, number][][] = [
  [[0, 0]],
  [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]],
  [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
];

function Cup({ position, yaw, lift, dice, shake, seed, mats }: { position: [number, number, number]; yaw: number; lift: boolean; dice: number; shake: number; seed: number; mats: CellarMats }) {
  const s = 0.34;
  // Gobelet retourné : l'embouchure sur la table, le fond en haut, deux moulures.
  const geo = useMemo(() => lathe([[0, 0.98], [0.34, 0.98], [0.36, 0.94], [0.38, 0.8], [0.42, 0.78], [0.44, 0.3], [0.48, 0.28], [0.5, 0.06], [0.54, 0.04], [0.54, 0], [0.5, 0], [0.48, 0.05], [0, 0.05]], s), []);
  const cup = useRef<THREE.Group>(null);
  const t0 = useRef(-10);
  const prevShake = useRef(shake);
  const k = useRef(lift ? 1 : 0);
  useFrame(({ clock }, dt) => {
    const g = cup.current;
    if (!g) return;
    if (shake !== prevShake.current) {
      prevShake.current = shake;
      t0.current = clock.elapsedTime;
    }
    k.current = THREE.MathUtils.damp(k.current, lift ? 1 : 0, 6, Math.min(dt, 0.1));
    const since = clock.elapsedTime - t0.current;
    const wobble = since < 0.6 ? Math.sin(since * 40 + seed) * 0.25 * (1 - since / 0.6) : 0;
    g.position.set(0, k.current * 0.2, -k.current * 0.06);
    g.rotation.set(-k.current * 0.9, 0, wobble);
  });
  // Dés visibles quand le gobelet est levé (le détail des faces est dans l'étiquette du joueur).
  const faces = useMemo(() => Array.from({ length: dice }, (_, i) => ((Math.floor(Math.abs(Math.sin(seed * 7 + i * 3.3)) * 997) % 6) as number)), [dice, seed]);
  const d = 0.075;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh material={mats.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} scale={[0.32, 0.32, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {lift &&
        faces.map((f, i) => {
          const a = (i / Math.max(1, faces.length)) * Math.PI * 2 + seed;
          const r = faces.length > 1 ? 0.075 : 0;
          return (
            <group key={i} position={[r * Math.cos(a), d / 2, r * Math.sin(a)]} rotation={[0, a * 1.7, 0]}>
              <mesh material={mats.bone} castShadow>
                <boxGeometry args={[d, d, d]} />
              </mesh>
              {PIPS[f]!.map(([x, z], j) => (
                <mesh key={j} material={mats.pip} position={[x * d * 0.27, d / 2 + 0.0005, z * d * 0.27]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[d * 0.09, 10]} />
                </mesh>
              ))}
            </group>
          );
        })}
      <group ref={cup}>
        <mesh geometry={geo} material={mats.pewter} castShadow receiveShadow />
      </group>
    </group>
  );
}

// ───────── Les joueurs ─────────

const POSES: Record<DrinkerPose, string> = { sit: 'Sit_Chair_Idle', cheer: 'Cheer', out: 'Sit_Chair_Idle' };
const _v = new THREE.Vector3();

function Drinker({ base, d, onHead }: { base: string; d: CellarDrinker; onHead: (o: THREE.Object3D | null) => void }) {
  const gltf = useGLTF(`${base}${MODELS[d.model % MODELS.length]}.glb`);
  const out = d.pose === 'out';
  const obj = useMemo(() => {
    const o = cloneSkinned(gltf.scene);
    o.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (d.tint || out) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (d.tint) mat.color.multiply(new THREE.Color(d.tint));
        // Éliminé : il reste assis, mais grisé et en retrait.
        if (out) {
          mat.color.lerp(new THREE.Color('#3a3c40'), 0.65);
          mat.transparent = true;
          mat.opacity = 0.55;
        }
        mesh.material = mat;
      }
    });
    return o;
  }, [gltf, d.tint, out]);
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
  useEffect(() => {
    mixer.stopAllAction();
    const clip = THREE.AnimationClip.findByName(gltf.animations, POSES[d.pose]) ?? THREE.AnimationClip.findByName(gltf.animations, 'Idle');
    if (!clip) return;
    const a = mixer.clipAction(clip);
    a.reset();
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.time = Math.random() * clip.duration;
    a.play();
    mixer.update(0);
    obj.position.set(0, 0, 0);
    obj.scale.setScalar(0.95);
    obj.updateMatrixWorld(true);
    if (d.pose !== 'cheer' && bones.hips) {
      // Assis : on cale le bassin sur le tabouret, quel que soit le modèle.
      bones.hips.getWorldPosition(_v);
      obj.parent?.worldToLocal(_v);
      obj.position.set(0, SEAT_H + 0.08 - _v.y, -0.04 - _v.z);
    } else obj.position.set(0, 0, -0.35);
  }, [d.pose, mixer, gltf, obj, bones.hips]);

  useFrame((_, dt) => {
    mixer.update(Math.min(dt, 0.1));
  });

  return <primitive object={obj} />;
}

for (const m of MODELS) useGLTF.preload(`/themes/throne/3d/${m}.glb`);

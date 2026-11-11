'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { QuadraticBezierLine, Sky, Stars, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { DeckAim, DeckAnchors, DeckDuel, DeckLoot, DeckPirate, PirateDeckProps, PiratePose } from './PirateDeck3D';

/** Modèles de l'équipage (Pirate Kit de Quaternius, CC0). */
const MODELS = ['pirate-captain', 'pirate-anne', 'pirate-henry', 'pirate-mako', 'pirate-sharky', 'pirate-skeleton'];
const SHIP_SCALE = 2;
/** Le butin est posé sur l'écoutille, au milieu du pont ; le joueur se tient vers la poupe. */
const CHEST = new THREE.Vector3(-1.1, 0, 0.1);
const STERN = new THREE.Vector3(2.7, 0, 0.15);
const EYE = 1.3;
const HEAD = 1.5;
type Mode = 'sunset' | 'night' | 'storm';

export default function PirateDeck(props: PirateDeckProps) {
  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 54, near: 0.05, far: 6000, position: [STERN.x, 3, STERN.z] }}
    >
      <Ticker fps={30} />
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}

/** Anime la scène à cadence réduite, et seulement quand elle est visible (onglet affiché, scène à l'écran). */
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

function World(p: PirateDeckProps) {
  const mode: Mode = p.storm ? 'storm' : p.time;
  const ship = useGLTF(`${p.base}ship.glb`);
  const shipObj = useMemo(() => {
    const o = ship.scene.clone(true);
    shade(o);
    return o;
  }, [ship]);
  const deckY = useMemo(() => {
    const probe = ship.scene.clone(true);
    probe.scale.setScalar(SHIP_SCALE);
    probe.position.y = -0.2;
    probe.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const cache = new Map<string, number>();
    return (x: number, z: number) => {
      const k = `${x.toFixed(2)},${z.toFixed(2)}`;
      const hit = cache.get(k);
      if (hit !== undefined) return hit;
      ray.set(new THREE.Vector3(x, 60, z), down);
      const y = ray.intersectObject(probe, true).map((h) => h.point.y).find((v) => v < 4.5) ?? 1.8;
      cache.set(k, y);
      return y;
    };
  }, [ship]);

  const me = p.crew.find((c) => c.id === p.viewer) ?? null;
  const others = p.crew.filter((c) => c !== me);
  const crewKey = p.crew.map((c) => c.id).join(',') + `|${p.viewer}`;
  const spots = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    const n = others.length;
    const spread = n <= 1 ? 0 : (Math.min(140, 22 + n * 17) * Math.PI) / 180;
    others.forEach((c, i) => {
      const t = n <= 1 ? 0 : spread / 2 - (spread * i) / (n - 1);
      const a = Math.PI + t;
      const x = CHEST.x + 2.15 * Math.cos(a);
      const z = CHEST.z + 2.15 * Math.sin(a);
      m.set(c.id, new THREE.Vector3(x, deckY(x, z), z));
    });
    if (me) m.set(me.id, new THREE.Vector3(STERN.x, deckY(STERN.x, STERN.z), STERN.z));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewKey, deckY]);

  const duel = p.duel && spots.get(p.duel.shooter) && spots.get(p.duel.target) ? p.duel : null;
  const eye = new THREE.Vector3(STERN.x, deckY(STERN.x, STERN.z) + EYE, STERN.z);
  const faceOf = (id: string) => {
    if (duel && id === duel.shooter) return spots.get(duel.target)!;
    if (duel && id === duel.target) return spots.get(duel.shooter)!;
    return id === me?.id ? CHEST : eye;
  };

  return (
    <>
      <Exposure mode={mode} />
      <SkyDome mode={mode} />
      <Lights mode={mode} />
      <Ocean base={p.base} mode={mode} />
      <primitive object={shipObj} scale={SHIP_SCALE} position={[0, -0.2, 0]} />
      <Shark base={p.base} />
      <Loot base={p.base} loot={p.loot} deckY={deckY} />
      {mode !== 'sunset' && <Lanterns deckY={deckY} />}
      {p.crew.map((c) => {
        const pos = spots.get(c.id);
        if (!pos) return null;
        const firstPerson = c.id === me?.id && !duel;
        return (
          <Pirate
            key={c.id}
            base={p.base}
            c={c}
            pos={pos}
            face={faceOf(c.id)}
            visible={!c.hidden && !firstPerson}
            pistol={duel?.shooter === c.id}
            shot={duel?.shooter === c.id ? duel : null}
            onPick={p.onPick && p.pickable?.includes(c.id) ? () => p.onPick!(c.id) : undefined}
          />
        );
      })}
      {!duel && me && <HeldPistol base={p.base} />}
      {!duel && <AimLines aims={p.aims} spots={spots} viewer={me?.id ?? null} eye={eye} />}
      <Rig duel={duel} spots={spots} eye={eye} />
      <Anchors crew={p.crew} viewer={me?.id ?? null} spots={spots} duel={!!duel} onAnchors={p.onAnchors} />
    </>
  );
}

function shade(o: THREE.Object3D) {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

// ───────── Caméra et étiquettes ─────────

function Rig({ duel, spots, eye }: { duel: DeckDuel | null; spots: Map<string, THREE.Vector3>; eye: THREE.Vector3 }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    if (duel) {
      // Par-dessus l'épaule droite du tireur, la cible face à nous.
      const s = spots.get(duel.shooter)!;
      const t = spots.get(duel.target)!;
      const d = new THREE.Vector3(t.x - s.x, 0, t.z - s.z).normalize();
      const perp = new THREE.Vector3(-d.z, 0, d.x);
      const back = aspect < 1 ? 2.3 : 1.55;
      const x = THREE.MathUtils.clamp(s.x - d.x * back + perp.x * 1.05, -7, 5.4);
      const z = THREE.MathUtils.clamp(s.z - d.z * back + perp.z * 1.05, -3.1, 3.1);
      camera.position.set(x, Math.max(s.y, t.y) + 1.05, z);
      camera.fov = aspect < 1 ? 64 : 50;
      camera.lookAt((s.x + t.x) / 2, Math.max(s.y, t.y) + 1.1, (s.z + t.z) / 2);
    } else {
      camera.position.copy(eye);
      camera.fov = aspect < 1 ? 74 : aspect < 1.4 ? 62 : 54;
      camera.lookAt(-6, eye.y - 0.7, 0);
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [duel?.shooter, duel?.target, size.width, size.height, camera, spots, eye.y, invalidate]);
  return null;
}

function Anchors({
  crew,
  viewer,
  spots,
  duel,
  onAnchors,
}: {
  crew: DeckPirate[];
  viewer: string | null;
  spots: Map<string, THREE.Vector3>;
  duel: boolean;
  onAnchors: (a: DeckAnchors | null) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const last = useRef('');
  useLayoutEffect(() => {
    let next: DeckAnchors | null = null;
    if (!duel) {
      camera.updateMatrixWorld();
      next = {};
      for (const c of crew) {
        const s = spots.get(c.id);
        if (!s || c.id === viewer || c.hidden) continue;
        const v = new THREE.Vector3(s.x, s.y + (c.pose === 'down' ? 0.7 : HEAD), s.z).project(camera);
        next[c.id] = { x: Math.round(((v.x + 1) / 2) * size.width), y: Math.round(((1 - v.y) / 2) * size.height) };
      }
    }
    const key = JSON.stringify(next);
    if (key !== last.current) {
      last.current = key;
      onAnchors(next);
    }
  });
  return null;
}

// ───────── Équipage ─────────

const POSES: Record<PiratePose, { clip: string; loop?: boolean; hold?: number }> = {
  idle: { clip: 'Idle', loop: true },
  cheer: { clip: 'Yes', loop: true },
  duck: { clip: 'Duck', hold: 0.55 },
  hit: { clip: 'HitReact' },
  down: { clip: 'Death' },
  shoot: { clip: 'Punch', hold: 0.48 },
};

function Pirate({
  base,
  c,
  pos,
  face,
  visible,
  pistol,
  shot,
  onPick,
}: {
  base: string;
  c: DeckPirate;
  pos: THREE.Vector3;
  face: THREE.Vector3;
  visible: boolean;
  pistol: boolean;
  shot: DeckDuel | null;
  onPick?: () => void;
}) {
  const gltf = useGLTF(`${base}${MODELS[c.model % MODELS.length]}.glb`);
  const gun = useGLTF(`${base}pistol.glb`);
  const obj = useMemo(() => {
    const o = cloneSkinned(gltf.scene);
    o.traverse((m) => {
      if (m.name === 'Weapon_Lute') m.visible = false;
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (c.tint) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.color.multiply(new THREE.Color(c.tint));
        mesh.material = mat;
      }
    });
    return o;
  }, [gltf, c.tint]);

  // Pose : une boucle (attente, joie) ou un geste joué une fois puis figé.
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj]);
  const stopAt = useRef<{ a: THREE.AnimationAction; t: number } | null>(null);
  useEffect(() => {
    mixer.stopAllAction();
    stopAt.current = null;
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
      if (spec.hold !== undefined) stopAt.current = { a, t: clip.duration * spec.hold };
    }
    a.play();
  }, [c.pose, mixer, gltf]);

  // Pistol dans la main droite pendant le duel, avec l'éclair du coup de feu.
  const held = useMemo(() => {
    const g = gun.scene.clone(true);
    shade(g);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flash.position.set(1.25, 0.08, 0);
    flash.visible = false;
    g.add(flash);
    const light = new THREE.PointLight(0xff9a3a, 0, 6, 1.6);
    light.position.copy(flash.position);
    g.add(light);
    return { g, flash, light };
  }, [gun]);
  useEffect(() => {
    const hand = obj.getObjectByName('LowerArmR');
    if (!pistol || !hand) return;
    obj.updateMatrixWorld(true);
    const hs = new THREE.Vector3();
    hand.getWorldScale(hs);
    held.g.scale.setScalar(0.42 / (hs.x || 1));
    held.g.position.set(0, 0.3, 0.02);
    held.g.rotation.set(0, 0, Math.PI / 2);
    hand.add(held.g);
    return () => {
      hand.remove(held.g);
    };
  }, [pistol, obj, held]);
  const fired = useRef(0);
  useEffect(() => {
    fired.current = shot ? performance.now() : 0;
  }, [shot?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    mixer.update(Math.min(dt, 0.1));
    const s = stopAt.current;
    if (s && s.a.time >= s.t) {
      s.a.paused = true;
      stopAt.current = null;
    }
    if (!shot || !fired.current) {
      held.flash.visible = false;
      held.light.intensity = 0;
      return;
    }
    // L'éclair part un instant après que le bras s'est tendu.
    const e = (performance.now() - fired.current) / 1000 - 0.3;
    const wet = shot.charge === 'wet';
    const k = e < 0 ? 0 : e < 0.06 ? e / 0.06 : Math.max(0, 1 - (e - 0.06) / (wet ? 0.6 : 0.35));
    held.flash.visible = k > 0.01;
    held.flash.scale.setScalar((wet ? 0.7 : 1.1) * (0.6 + 0.6 * k));
    (held.flash.material as THREE.SpriteMaterial).color.set(wet ? '#cfd6dc' : '#ffffff');
    (held.flash.material as THREE.SpriteMaterial).opacity = wet ? 0.6 * k : k;
    held.light.intensity = wet ? 0 : 7 * k;
  });

  return (
    <primitive
      object={obj}
      position={pos}
      rotation={[0, Math.atan2(face.x - pos.x, face.z - pos.z), 0]}
      visible={visible}
      onClick={
        onPick
          ? (e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              onPick();
            }
          : undefined
      }
    />
  );
}

let flashTex: THREE.CanvasTexture | null = null;
function flashTexture() {
  if (flashTex) return flashTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,240,1)');
  rg.addColorStop(0.25, 'rgba(255,214,110,1)');
  rg.addColorStop(0.6, 'rgba(255,120,30,.6)');
  rg.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  flashTex = new THREE.CanvasTexture(c);
  return flashTex;
}

/** Le pistolet du joueur, au premier plan, comme dans un jeu à la première personne. */
function HeldPistol({ base }: { base: string }) {
  const gun = useGLTF(`${base}pistol.glb`);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const obj = useMemo(() => gun.scene.clone(true), [gun]);
  useEffect(() => {
    obj.scale.setScalar(0.24);
    obj.position.set(0.32, -0.27, -0.58);
    obj.rotation.set(0.12, Math.PI / 2 + 0.22, 0.1);
    const fill = new THREE.PointLight(0xffe0b0, 0.6, 2, 1.5);
    fill.position.set(0.2, 0.1, -0.2);
    camera.add(obj);
    camera.add(fill);
    scene.add(camera);
    return () => {
      camera.remove(obj);
      camera.remove(fill);
    };
  }, [obj, camera, scene]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    obj.position.y = -0.27 + Math.sin(t * 1.3) * 0.006;
    obj.rotation.z = 0.1 + Math.sin(t * 0.9) * 0.012;
  });
  return null;
}

function AimLines({ aims, spots, viewer, eye }: { aims: DeckAim[]; spots: Map<string, THREE.Vector3>; viewer: string | null; eye: THREE.Vector3 }) {
  const head = (id: string): THREE.Vector3 | null => {
    if (id === viewer) return new THREE.Vector3(eye.x - 1.3, eye.y - 0.75, eye.z);
    const s = spots.get(id);
    return s ? new THREE.Vector3(s.x, s.y + 1.25, s.z) : null;
  };
  return (
    <>
      {aims.map((a) => {
        const from = head(a.from);
        const to = head(a.to);
        if (!from || !to) return null;
        const mid = from.clone().lerp(to, 0.5);
        mid.y += 0.6 + from.distanceTo(to) * 0.08;
        return (
          <QuadraticBezierLine
            key={`${a.from}-${a.to}`}
            start={from}
            end={to}
            mid={mid}
            color={a.color}
            lineWidth={a.to === viewer ? 4 : 3}
            dashed={!!a.dashed}
            dashSize={0.18}
            gapSize={0.12}
            transparent
            opacity={0.95}
          />
        );
      })}
    </>
  );
}

// ───────── Décor ─────────

function Loot({ base, loot, deckY }: { base: string; loot: DeckLoot; deckY: (x: number, z: number) => number }) {
  const chest = useGLTF(`${base}chest.glb`);
  const coins = useGLTF(`${base}coins.glb`);
  const bottle = useGLTF(`${base}bottle.glb`);
  const barrel = useGLTF(`${base}barrel.glb`);
  const items = useMemo(() => {
    const out: { key: string; obj: THREE.Object3D; s: number; x: number; z: number; ry: number }[] = [];
    const total = loot.coins + loot.rum + loot.powder;
    if (total === 0) return out;
    const add = (key: string, src: THREE.Object3D, s: number, x: number, z: number, ry: number) => {
      const o = src.clone(true);
      shade(o);
      out.push({ key, obj: o, s, x, z, ry });
    };
    add('chest', chest.scene, 0.5, CHEST.x, CHEST.z, 0.9);
    const ring = (i: number) => {
      const a = Math.PI / 2 + 0.25 + i * 0.42;
      return { x: CHEST.x + 0.95 * Math.cos(a), z: CHEST.z + 0.95 * Math.sin(a) };
    };
    let k = 0;
    for (let i = 0; i < Math.min(loot.coins, 5); i++, k++) add(`c${i}`, coins.scene, 0.9, ring(k).x, ring(k).z, k);
    for (let i = 0; i < Math.min(loot.rum, 2); i++, k++) add(`r${i}`, bottle.scene, 0.9, ring(k).x, ring(k).z, k);
    for (let i = 0; i < Math.min(loot.powder, 1); i++, k++) add(`p${i}`, barrel.scene, 0.6, ring(k).x, ring(k).z, k);
    return out;
  }, [loot.coins, loot.rum, loot.powder, chest, coins, bottle, barrel]);
  return (
    <>
      {items.map((it) => (
        <primitive key={it.key} object={it.obj} scale={it.s} position={[it.x, deckY(it.x, it.z), it.z]} rotation={[0, it.ry, 0]} />
      ))}
    </>
  );
}

/** Un requin qui tourne autour du navire : on aperçoit son aileron. */
function Shark({ base }: { base: string }) {
  const g = useGLTF(`${base}shark.glb`);
  const obj = useMemo(() => cloneSkinned(g.scene), [g]);
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj]);
  useEffect(() => {
    const clip = THREE.AnimationClip.findByName(g.animations, 'Swim');
    if (clip) mixer.clipAction(clip).play();
  }, [g, mixer]);
  useFrame(({ clock }, dt) => {
    mixer.update(Math.min(dt, 0.1));
    const a = clock.elapsedTime * 0.12;
    obj.position.set(-14 + Math.cos(a) * 16, -0.55, Math.sin(a) * 13);
    obj.rotation.y = -a;
  });
  return <primitive object={obj} scale={1.4} />;
}

function Lanterns({ deckY }: { deckY: (x: number, z: number) => number }) {
  const spots: [number, number, number, number][] = [
    [-1.6, 1.3, -2.25, 1],
    [-1.8, 1.3, 2.25, 1],
    [-6.1, 2.4, 0.45, 0.8],
  ];
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd58a'), toneMapped: false }), []);
  const halo = useMemo(() => new THREE.SpriteMaterial({ map: flashTexture(), color: '#ffb35a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }), []);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (l) l.intensity = 9 * spots[i]![3] * (0.86 + 0.08 * Math.sin(t * 7.3 + i) + 0.06 * Math.sin(t * 13.1 + i * 2));
    });
  });
  return (
    <>
      {spots.map(([x, h, z, k], i) => {
        const y = deckY(x, z) + h;
        return (
          <group key={i} position={[x, y, z]}>
            <mesh material={glow}>
              <sphereGeometry args={[0.1, 16, 16]} />
            </mesh>
            <sprite scale={0.9} material={halo} />
            <pointLight
              ref={(l) => {
                lights.current[i] = l;
              }}
              color="#ffa64a"
              intensity={9 * k}
              distance={9}
              decay={1.6}
            />
          </group>
        );
      })}
    </>
  );
}

const SUN = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(82), 0.3);
const MOON = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(73), -Math.PI / 2 + 0.55);
const STORM_SUN = new THREE.Vector3(-0.4, 0.5, 0.3).normalize();
const sunFor = (m: Mode) => (m === 'sunset' ? SUN : m === 'night' ? MOON : STORM_SUN);

function Exposure({ mode }: { mode: Mode }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = { sunset: 0.62, night: 1.25, storm: 1.2 }[mode];
    scene.fog = mode === 'storm' ? new THREE.FogExp2(0x26343b, 0.016) : null;
  }, [gl, scene, mode]);
  return null;
}

function SkyDome({ mode }: { mode: Mode }) {
  const dome = useMemo(() => {
    if (mode === 'sunset') return null;
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 512;
    const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, 0, 0, 512);
    if (mode === 'night') {
      gr.addColorStop(0, '#02040e');
      gr.addColorStop(0.42, '#0a1638');
      gr.addColorStop(0.5, '#23376e');
      gr.addColorStop(0.53, '#0b1a3a');
      gr.addColorStop(1, '#020610');
    } else {
      gr.addColorStop(0, '#202b33');
      gr.addColorStop(0.38, '#3e5059');
      gr.addColorStop(0.5, '#7b9094');
      gr.addColorStop(0.52, '#3a4b50');
      gr.addColorStop(1, '#10161a');
    }
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [mode]);
  const clouds = useMemo(() => {
    if (mode !== 'storm') return null;
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 512;
    const g = c.getContext('2d')!;
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 520; i++) {
      const x = rnd() * 2048;
      const y = 250 + rnd() * 250;
      const r = 40 + rnd() * 130;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rnd() < 0.3 ? 'rgba(92,110,120,.6)' : 'rgba(8,12,16,.6)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [mode]);
  if (mode === 'sunset') return <Sky distance={4500} sunPosition={SUN.clone().multiplyScalar(100)} turbidity={4} rayleigh={3} mieCoefficient={0.005} mieDirectionalG={0.88} />;
  return (
    <>
      <mesh>
        <sphereGeometry args={[4000, 32, 32]} />
        <meshBasicMaterial map={dome} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      {mode === 'night' && (
        <>
          <Stars radius={1500} depth={300} count={2500} factor={18} saturation={0} fade speed={0.3} />
          <mesh position={MOON.clone().multiplyScalar(3500)}>
            <sphereGeometry args={[110, 32, 32]} />
            <meshBasicMaterial color="#fff4d8" fog={false} />
          </mesh>
        </>
      )}
      {clouds && (
        <mesh>
          <sphereGeometry args={[3900, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial map={clouds} transparent side={THREE.BackSide} fog={false} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

function Lights({ mode }: { mode: Mode }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const flash = useRef({ next: 2.5, level: 0 });
  const dir = sunFor(mode);
  const base = { sunset: 1.7, night: 0.55, storm: 2.0 }[mode];
  useLayoutEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.shadow.mapSize.set(1536, 1536);
    Object.assign(l.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 200 });
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.03;
  }, []);
  // Éclairs d'orage : de brefs flashs blancs, à intervalles irréguliers.
  useFrame(({ clock }, dt) => {
    const f = flash.current;
    if (mode === 'storm' && clock.elapsedTime > f.next) {
      f.level = 1;
      f.next = clock.elapsedTime + 2.5 + Math.random() * 4;
    }
    f.level = Math.max(0, f.level - dt * 3.2);
    const k = mode === 'storm' ? f.level * (0.7 + 0.3 * Math.sin(clock.elapsedTime * 60)) : 0;
    if (hemi.current) hemi.current.intensity = base + k * 3.5;
    if (sun.current) sun.current.intensity = { sunset: 3.6, night: 1.1, storm: 1.7 }[mode] + k * 4;
  });
  return (
    <>
      <directionalLight
        ref={sun}
        castShadow
        position={dir.clone().multiplyScalar(60)}
        color={{ sunset: '#ffbf80', night: '#9fb4ff', storm: '#a9c0d4' }[mode]}
        intensity={{ sunset: 3.6, night: 1.1, storm: 1.7 }[mode]}
      />
      <hemisphereLight
        ref={hemi}
        args={[{ sunset: '#bfdcff', night: '#31416e', storm: '#6c7f8a' }[mode], { sunset: '#5a3a20', night: '#0a0a14', storm: '#1a1a1a' }[mode], base]}
      />
      {mode === 'storm' && <directionalLight position={[-20, 18, -10]} color="#9fc4ff" intensity={1.4} />}
    </>
  );
}

function Ocean({ base, mode }: { base: string; mode: Mode }) {
  const normals = useTexture(`${base}waternormals.jpg`);
  const water = useMemo(() => {
    normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
    const w = new Water(new THREE.PlaneGeometry(6000, 6000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: SUN.clone(),
      sunColor: 0xffd2a0,
      waterColor: 0x0b6f86,
      distortionScale: 3.2,
      fog: true,
    });
    w.rotation.x = -Math.PI / 2;
    return w;
  }, [normals]);
  useEffect(() => {
    const u = water.material.uniforms;
    u.sunDirection!.value.copy(sunFor(mode));
    u.sunColor!.value.set({ sunset: 0xffd2a0, night: 0xd8e0ff, storm: 0x8a9aa8 }[mode]);
    u.waterColor!.value.set({ sunset: 0x0b6f86, night: 0x02182e, storm: 0x0b3640 }[mode]);
    u.distortionScale!.value = mode === 'storm' ? 7 : 3.2;
    u.size!.value = mode === 'storm' ? 1.2 : 2.6;
  }, [water, mode]);
  useFrame((_, dt) => {
    water.material.uniforms.time!.value += Math.min(dt, 0.1) * (mode === 'storm' ? 0.9 : 0.4);
  });
  return <primitive object={water} />;
}

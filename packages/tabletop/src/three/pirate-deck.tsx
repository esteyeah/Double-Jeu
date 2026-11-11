'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { QuadraticBezierLine, Sky, Stars, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { DeckAim, DeckDuel, DeckLootItem, DeckPirate, PirateDeckProps, PiratePose } from './PirateDeck3D';

/** Modèles de l'équipage (Pirate Kit de Quaternius, CC0). */
const MODELS = ['pirate-captain', 'pirate-anne', 'pirate-henry', 'pirate-mako', 'pirate-sharky', 'pirate-skeleton'];
const SHIP_SCALE = 2;
/** Le coffre est au milieu du pont, l'équipage autour ; le joueur se tient vers la poupe. */
const CHEST = new THREE.Vector3(-1.25, 0, 0.1);
const STERN = new THREE.Vector3(2.7, 0, 0.15);
const EYE = 1.3;
const HEAD = 1.5;
type Mode = 'sunset' | 'night' | 'storm';
type Spots = Map<string, THREE.Vector3>;

const clamp = THREE.MathUtils.clamp;

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
  const probe = useMemo(() => {
    const o = ship.scene.clone(true);
    o.scale.setScalar(SHIP_SCALE);
    o.position.y = -0.2;
    o.updateMatrixWorld(true);
    return o;
  }, [ship]);
  /** Le navire cache-t-il `b` depuis `a` ? (pour placer la caméra du duel) */
  const blocked = useMemo(() => {
    const ray = new THREE.Raycaster();
    return (a: THREE.Vector3, b: THREE.Vector3) => {
      const dir = b.clone().sub(a);
      ray.set(a, dir.clone().normalize());
      ray.far = dir.length();
      return ray.intersectObject(probe, true).length > 0;
    };
  }, [probe]);
  const deckY = useMemo(() => {
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
  }, [probe]);

  const me = p.crew.find((c) => c.id === p.viewer) ?? null;
  const others = p.crew.filter((c) => c !== me);
  const crewKey = p.crew.map((c) => c.id).join(',') + `|${p.viewer}`;
  // L'équipage en arc de cercle de l'autre côté du coffre, face au joueur.
  const spots = useMemo(() => {
    const m: Spots = new Map();
    const n = others.length;
    const spread = n <= 1 ? 0 : (Math.min(140, 22 + n * 17) * Math.PI) / 180;
    others.forEach((c, i) => {
      const t = n <= 1 ? 0 : spread / 2 - (spread * i) / (n - 1);
      const a = Math.PI + t;
      const x = CHEST.x + 1.75 * Math.cos(a);
      const z = CHEST.z + 1.75 * Math.sin(a);
      m.set(c.id, new THREE.Vector3(x, deckY(x, z), z));
    });
    if (me) m.set(me.id, new THREE.Vector3(STERN.x, deckY(STERN.x, STERN.z), STERN.z));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewKey, deckY]);

  const duel = p.duel && spots.get(p.duel.shooter) && spots.get(p.duel.target) ? p.duel : null;
  const eye = useMemo(() => new THREE.Vector3(STERN.x, deckY(STERN.x, STERN.z) + EYE, STERN.z), [deckY]);
  /** Où l'on vise quelqu'un : la poitrine, ou les yeux du joueur quand c'est lui (vue à la première personne). */
  const aimPoint = (id: string): THREE.Vector3 | null => {
    if (id === me?.id && !duel) return eye.clone().add(new THREE.Vector3(0, -0.2, 0));
    const s = spots.get(id);
    return s ? new THREE.Vector3(s.x, s.y + 1.05, s.z) : null;
  };

  return (
    <>
      <Exposure mode={mode} />
      <SkyDome mode={mode} />
      <Lights mode={mode} />
      <Ocean base={p.base} mode={mode} />
      <primitive object={shipObj} scale={SHIP_SCALE} position={[0, -0.2, 0]} />
      <Shark base={p.base} />
      <LootPile base={p.base} loot={p.loot} deckY={deckY} onLoot={duel ? undefined : p.onLoot} />
      {mode !== 'sunset' && <Lanterns deckY={deckY} />}
      <Rig duel={duel} spots={spots} eye={eye} blocked={blocked} />
      {p.crew.map((c) => {
        const pos = spots.get(c.id);
        if (!pos) return null;
        const firstPerson = c.id === me?.id && !duel;
        const aimAt = c.pose === 'aim' && c.aimAt ? aimPoint(c.aimAt) : null;
        const face = aimAt ?? (c.id === me?.id ? CHEST : eye);
        return (
          <Pirate
            key={c.id}
            base={p.base}
            c={c}
            pos={pos}
            face={face}
            aimAt={aimAt}
            visible={!c.hidden && !firstPerson}
            fired={duel && duel.shooter === c.id && duel.fired ? duel : null}
            onPick={p.onPick && p.pickable?.includes(c.id) ? () => p.onPick!(c.id) : undefined}
          />
        );
      })}
      {!duel && me && <HeldPistol base={p.base} />}
      {duel && <TargetRing at={spots.get(duel.target)!} />}
      {!duel && <AimArcs aims={p.aims} aimPoint={aimPoint} spots={spots} viewer={me?.id ?? null} />}
      <Tags tags={p.tags} crew={p.crew} spots={spots} viewer={me?.id ?? null} duel={!!duel} />
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

// ───────── Caméra : regard libre à la première personne, plan de duel ─────────

function Rig({ duel, spots, eye, blocked }: { duel: DeckDuel | null; spots: Spots; eye: THREE.Vector3; blocked: (a: THREE.Vector3, b: THREE.Vector3) => boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const look = useRef<{ yaw: number; pitch: number; drag: { x: number; y: number; yaw: number; pitch: number } | null }>({ yaw: 0, pitch: 0, drag: null });
  const cur = useRef<{ pos: THREE.Vector3; at: THREE.Vector3; fov: number; ready: boolean }>({ pos: new THREE.Vector3(), at: new THREE.Vector3(), fov: 54, ready: false });
  const duelSince = useRef(0);
  const plan = useRef<{ key: string; pos: THREE.Vector3; at: THREE.Vector3; push: THREE.Vector3; fov: number } | null>(null);
  const duelKey = duel ? `${duel.shooter}>${duel.target}` : '';
  useEffect(() => {
    duelSince.current = performance.now();
  }, [duelKey]);

  // Tourner la tête : glisser (souris ou doigt) ; double-clic pour revenir face au butin.
  useEffect(() => {
    const el = gl.domElement;
    const L = look.current;
    const down = (e: PointerEvent) => {
      L.drag = { x: e.clientX, y: e.clientY, yaw: L.yaw, pitch: L.pitch };
    };
    const move = (e: PointerEvent) => {
      const d = L.drag;
      if (!d) return;
      L.yaw = clamp(d.yaw - (e.clientX - d.x) * 0.0042, -1.1, 1.1);
      if (e.pointerType === 'mouse') L.pitch = clamp(d.pitch + (e.clientY - d.y) * 0.0032, -0.32, 0.42);
    };
    const up = () => {
      L.drag = null;
    };
    const reset = () => {
      L.yaw = 0;
      L.pitch = 0;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', reset);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('dblclick', reset);
    };
  }, [gl]);

  const wantPos = useMemo(() => new THREE.Vector3(), []);
  const wantAt = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const aspect = size.width / Math.max(1, size.height);
    let fov: number;
    if (duel) {
      // Le plan du duel est choisi une fois par tir : le premier cadrage d'où le navire ne cache
      // ni le tireur ni sa cible (épaule droite, épaule gauche, de côté, puis en plongée).
      const S = spots.get(duel.shooter)!;
      const T = spots.get(duel.target)!;
      if (plan.current?.key !== duelKey) {
        const d = new THREE.Vector3(T.x - S.x, 0, T.z - S.z);
        const dist = Math.max(0.5, d.length());
        d.normalize();
        const n = new THREE.Vector3(-d.z, 0, d.x);
        const M = S.clone().lerp(T, 0.5);
        const top = Math.max(S.y, T.y);
        const headS = new THREE.Vector3(S.x, S.y + 1.25, S.z);
        const headT = new THREE.Vector3(T.x, T.y + 1.05, T.z);
        const onDeck = (c: THREE.Vector3) => c.x > -4.3 && c.x < 4.2 && Math.abs(c.z) < 1.95;
        const inside = new THREE.Vector3(-0.4 - M.x, 0, -M.z).dot(n) >= 0 ? 1 : -1;
        const shots: { pos: THREE.Vector3; at: THREE.Vector3; fov: number }[] = [];
        const shoulder = (side: number) => ({
          pos: S.clone().addScaledVector(d, -1.6).addScaledVector(n, side * 0.95).setY(top + 1.85),
          at: new THREE.Vector3(T.x, top + 0.85, T.z),
          fov: 40,
        });
        const flank = (side: number) => {
          let room = clamp(dist * 0.7 + 1.9, 2.8, 4.6);
          const c = new THREE.Vector3();
          for (; room > 1.4; room -= 0.2) {
            c.copy(M).addScaledVector(n, side * room).addScaledVector(d, -0.45);
            if (onDeck(c)) break;
          }
          return { pos: c.setY(top + (room < 2.4 ? 2.4 : 1.8)), at: new THREE.Vector3(M.x, top + 0.9, M.z), fov: 46 };
        };
        // Contrechamp : derrière la cible, face au tireur qui tend le bras vers nous.
        const reverse = (side: number) => ({
          pos: T.clone().addScaledVector(d, 1.5).addScaledVector(n, side * 0.8).setY(top + 2.0),
          at: new THREE.Vector3(S.x, top + 1.0, S.z),
          fov: 40,
        });
        if (dist > 2.6) shots.push(shoulder(1), shoulder(-1), reverse(-1), reverse(1));
        shots.push(flank(inside), flank(-inside));
        const crane = { pos: M.clone().addScaledVector(n, inside * 1.6).setY(top + 4.6), at: new THREE.Vector3(M.x, top + 0.5, M.z), fov: 50 };
        const ok = shots.find((c) => onDeck(c.pos) && !blocked(c.pos, headS) && !blocked(c.pos, headT)) ?? crane;
        plan.current = { key: duelKey, ...ok, push: ok.at.clone().sub(ok.pos).normalize() };
      }
      const t = Math.min(1, (performance.now() - duelSince.current) / 2300);
      const ease = t * t * (3 - 2 * t);
      wantPos.copy(plan.current.pos).addScaledVector(plan.current.push, 0.55 * ease);
      wantAt.copy(plan.current.at);
      fov = aspect < 1 ? plan.current.fov + 18 : plan.current.fov;
    } else {
      const L = look.current;
      const yaw = Math.PI + L.yaw;
      const pitch = -0.08 - L.pitch;
      wantPos.copy(eye);
      wantAt.set(eye.x + Math.cos(pitch) * Math.cos(yaw) * 10, eye.y + Math.sin(pitch) * 10, eye.z + Math.cos(pitch) * Math.sin(yaw) * 10);
      fov = aspect < 1 ? 74 : aspect < 1.4 ? 62 : 54;
    }
    const c = cur.current;
    const k = c.ready ? 1 - Math.exp(-Math.min(dt, 0.1) * (duel ? 3.4 : look.current.drag ? 14 : 5)) : 1;
    c.ready = true;
    c.pos.lerp(wantPos, k);
    c.at.lerp(wantAt, k);
    c.fov += (fov - c.fov) * k;
    camera.position.copy(c.pos);
    camera.lookAt(c.at);
    if (Math.abs(camera.fov - c.fov) > 0.01) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** Place chaque étiquette HTML au-dessus de la tête de son pirate (ou la cache), à chaque image. */
function Tags({ tags, crew, spots, viewer, duel }: { tags: PirateDeckProps['tags']; crew: DeckPirate[]; spots: Spots; viewer: string | null; duel: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const map = tags.current;
    if (!map) return;
    camera.updateMatrixWorld();
    map.forEach((el, id) => {
      const c = crew.find((x) => x.id === id);
      const s = spots.get(id);
      let show = !!c && !!s && !duel && id !== viewer && !c.hidden;
      if (show) {
        v.set(s!.x, s!.y + (c!.pose === 'down' ? 0.55 : HEAD), s!.z).project(camera);
        show = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      }
      if (!show) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * size.width).toFixed(1)}px,${(((1 - v.y) / 2) * size.height).toFixed(1)}px,0) translate(-50%,-100%)`;
    });
  });
  return null;
}

// ───────── Équipage ─────────

const POSES: Record<PiratePose, { clip: string; loop?: boolean; hold?: number }> = {
  idle: { clip: 'Idle', loop: true },
  aim: { clip: 'Idle', loop: true },
  cheer: { clip: 'Yes', loop: true },
  duck: { clip: 'Duck', hold: 0.5 },
  hit: { clip: 'HitReact' },
  down: { clip: 'Death' },
};

const _p = new THREE.Vector3();
const _c = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _bw = new THREE.Quaternion();
const _pw = new THREE.Quaternion();

/** Oriente un os (bras, avant-bras) pour que son prolongement pointe vers `target`. */
function pointBone(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
  bone.getWorldPosition(_p);
  child.getWorldPosition(_c);
  _a.subVectors(_c, _p).normalize();
  _b.subVectors(target, _p).normalize();
  _q.setFromUnitVectors(_a, _b);
  bone.getWorldQuaternion(_bw);
  bone.parent!.getWorldQuaternion(_pw);
  bone.quaternion.copy(_pw.invert().multiply(_q.multiply(_bw)));
  bone.updateMatrixWorld(true);
}

function Pirate({
  base,
  c,
  pos,
  face,
  aimAt,
  visible,
  fired,
  onPick,
}: {
  base: string;
  c: DeckPirate;
  pos: THREE.Vector3;
  face: THREE.Vector3;
  aimAt: THREE.Vector3 | null;
  visible: boolean;
  fired: DeckDuel | null;
  onPick?: () => void;
}) {
  const gltf = useGLTF(`${base}${MODELS[c.model % MODELS.length]}.glb`);
  const gun = useGLTF(`${base}pistol.glb`);
  const obj = useMemo(() => {
    const o = cloneSkinned(gltf.scene);
    o.traverse((m) => {
      if (m.name.startsWith('Weapon_')) m.visible = false;
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
  const bones = useMemo(
    () => ({ upper: obj.getObjectByName('UpperArmR'), lower: obj.getObjectByName('LowerArmR'), hand: obj.getObjectByName('Middle1R') }),
    [obj],
  );

  // Pose : une boucle (attente, joie) ou un geste joué une fois puis figé (cadavre, se baisser…).
  const mixer = useMemo(() => new THREE.AnimationMixer(obj), [obj]);
  const stopAt = useRef<{ a: THREE.AnimationAction; t: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const initial = first.current;
    first.current = false;
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
    // Un pirate déjà tombé avant qu'on arrive : directement à terre, sans rejouer sa chute.
    if (initial && c.pose === 'down') mixer.setTime(clip.duration);
  }, [c.pose, mixer, gltf]);

  // Le pistolet : il apparaît quand le pirate vise, au bout de son bras tendu.
  const held = useMemo(() => {
    const holder = new THREE.Group();
    const g = gun.scene.clone(true);
    shade(g);
    g.scale.setScalar(0.42);
    g.rotation.set(0, -Math.PI / 2, 0);
    g.position.set(0, -0.02, -0.02);
    holder.add(g);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flash.position.set(0, 0.07, 0.52);
    flash.visible = false;
    holder.add(flash);
    const light = new THREE.PointLight(0xff9a3a, 0, 6, 1.6);
    light.position.copy(flash.position);
    holder.add(light);
    holder.visible = false;
    // La trace de la balle, du canon jusqu'à la cible.
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.006, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: '#ffdf8a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    tracer.visible = false;
    return { holder, flash, light, tracer };
  }, [gun]);
  const firedAt = useRef(0);
  useEffect(() => {
    firedAt.current = fired ? performance.now() : 0;
  }, [fired?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    mixer.update(Math.min(dt, 0.1));
    const s = stopAt.current;
    if (s && s.a.time >= s.t) {
      s.a.paused = true;
      stopAt.current = null;
    }
    const aiming = !!aimAt && visible && c.pose === 'aim' && !!bones.upper && !!bones.lower && !!bones.hand;
    held.holder.visible = aiming;
    if (!aiming) {
      held.flash.visible = false;
      held.light.intensity = 0;
      held.tracer.visible = false;
      return;
    }
    // Recul : le bras remonte un instant après le coup de feu.
    const e = firedAt.current ? (performance.now() - firedAt.current) / 1000 : -1;
    const recoil = e < 0 ? 0 : e < 0.06 ? e / 0.06 : Math.max(0, 1 - (e - 0.06) / 0.35);
    target.copy(aimAt!);
    target.y += recoil * 0.9;
    obj.updateMatrixWorld(true);
    pointBone(bones.upper!, bones.lower!, target);
    pointBone(bones.lower!, bones.hand!, target);
    bones.hand!.getWorldPosition(held.holder.position);
    held.holder.lookAt(target);
    const wet = fired?.charge === 'wet';
    const k = e < 0 ? 0 : recoil;
    held.flash.visible = k > 0.02;
    held.flash.scale.setScalar((wet ? 0.6 : 1.0) * (0.5 + 0.7 * k));
    const m = held.flash.material as THREE.SpriteMaterial;
    m.color.set(wet ? '#cfd6dc' : '#ffffff');
    m.opacity = wet ? 0.55 * k : k;
    held.light.intensity = wet ? 0 : 8 * k;
    const tr = held.tracer;
    tr.visible = !wet && k > 0.05;
    if (tr.visible) {
      held.flash.getWorldPosition(tr.position);
      const len = tr.position.distanceTo(aimAt!);
      tr.lookAt(aimAt!);
      tr.scale.set(1, 1, len);
      (tr.material as THREE.MeshBasicMaterial).opacity = Math.min(1, k * 1.4);
    }
  });

  return (
    <>
      <primitive
        object={obj}
        position={pos}
        rotation={[0, Math.atan2(face.x - pos.x, face.z - pos.z), 0]}
        visible={visible}
        onClick={
          onPick
            ? (e: ThreeEvent<MouseEvent>) => {
                if (e.delta > 6) return;
                e.stopPropagation();
                onPick();
              }
            : undefined
        }
      />
      <primitive object={held.holder} />
      <primitive object={held.tracer} />
    </>
  );
}

/** Pendant un duel : un cercle rouge qui pulse au pied de la cible. */
function TargetRing({ at }: { at: THREE.Vector3 }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const r = ring.current;
    if (!r) return;
    const k = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6);
    r.scale.setScalar(1 + 0.15 * k);
    (r.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.35 * k;
  });
  return (
    <mesh ref={ring} position={[at.x, at.y + 0.04, at.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
      <ringGeometry args={[0.42, 0.55, 48]} />
      <meshBasicMaterial color="#ff3b2e" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
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

/** Qui vise qui : un arc épais et animé, avec une pointe de flèche, du tireur à sa cible. */
function AimArcs({ aims, aimPoint, spots, viewer }: { aims: DeckAim[]; aimPoint: (id: string) => THREE.Vector3 | null; spots: Spots; viewer: string | null }) {
  return (
    <>
      {aims.map((a) => {
        const s = spots.get(a.from);
        const to = aimPoint(a.to);
        // Celui qui te vise te braque son pistolet dessus : pas besoin d'arc jusqu'à la caméra.
        if (!s || !to || a.to === viewer) return null;
        // Ma propre visée part de mon pistolet, juste devant moi.
        const from = a.from === viewer ? new THREE.Vector3(s.x - 1.1, s.y + EYE - 0.45, s.z - 0.25) : new THREE.Vector3(s.x, s.y + 1.2, s.z);
        return <AimArc key={`${a.from}-${a.to}`} from={from} to={to} aim={a} />;
      })}
    </>
  );
}

function AimArc({ from, to, aim }: { from: THREE.Vector3; to: THREE.Vector3; aim: DeckAim }) {
  const line = useRef<{ material: { dashOffset: number } } | null>(null);
  const end = to.clone().lerp(from, Math.min(0.35, 0.45 / Math.max(0.5, from.distanceTo(to))));
  const mid = from.clone().lerp(end, 0.5);
  mid.y += 0.45 + from.distanceTo(end) * 0.09;
  const dir = end.clone().sub(mid).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  useFrame((_, dt) => {
    if (line.current) line.current.material.dashOffset -= dt * 0.9;
  });
  return (
    <>
      <QuadraticBezierLine
        ref={line as never}
        start={from}
        end={end}
        mid={mid}
        color={aim.color}
        lineWidth={5}
        dashed
        dashSize={aim.dashed ? 0.12 : 0.32}
        gapSize={aim.dashed ? 0.12 : 0.08}
        transparent
        opacity={0.95}
        depthTest={false}
        renderOrder={10}
      />
      <mesh position={end} quaternion={q} renderOrder={11}>
        <coneGeometry args={[0.09, 0.26, 16]} />
        <meshBasicMaterial color={aim.color} depthTest={false} transparent />
      </mesh>
    </>
  );
}

// ───────── Le butin de la manche, posé et éclairé au milieu du pont ─────────

function LootPile({ base, loot, deckY, onLoot }: { base: string; loot: DeckLootItem[]; deckY: (x: number, z: number) => number; onLoot?: (index: number) => void }) {
  const chest = useGLTF(`${base}chest.glb`);
  const coins = useGLTF(`${base}coins.glb`);
  const bottle = useGLTF(`${base}bottle.glb`);
  const map = useGLTF(`${base}map.glb`);
  const lootKey = loot.map((l) => `${l.kind}${l.value ?? ''}`).join(',');
  const items = useMemo(() => {
    // Deux rangées au plus, de gauche à droite dans l'ordre du pont, entre le coffre et le joueur.
    const n = loot.length;
    const perRow = n <= 4 ? n : Math.ceil(n / 2);
    return loot.map((item, i) => {
      const obj = buildLoot(item, { coins: coins.scene, bottle: bottle.scene, map: map.scene });
      const row = Math.floor(i / perRow);
      const inRow = row === 0 ? perRow : n - perRow;
      const col = i - row * perRow;
      const spacing = 0.52;
      const z = CHEST.z + ((inRow - 1) * spacing) / 2 - col * spacing + (row ? 0.26 : 0);
      const x = CHEST.x + (n <= 4 ? 1.1 : row === 0 ? 0.78 : 1.3);
      return { obj, x, z };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lootKey, coins, bottle, map]);
  const chestObj = useMemo(() => {
    const o = chest.scene.clone(true);
    shade(o);
    return o;
  }, [chest]);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    groups.current.forEach((g, i) => {
      if (!g) return;
      g.position.y = 0.04 + Math.sin(t * 1.8 + i * 0.9) * 0.025;
      g.rotation.y = Math.sin(t * 0.7 + i) * 0.35;
    });
    rings.current.forEach((r, i) => {
      if (!r) return;
      const k = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.5);
      (r.material as THREE.MeshBasicMaterial).opacity = onLoot ? 0.35 + 0.45 * k : 0.18;
      r.scale.setScalar(onLoot ? 1 + 0.12 * k : 1);
    });
  });
  if (loot.length === 0) return null;
  const cy = deckY(CHEST.x + 1.2, CHEST.z);
  spotTarget.position.set(CHEST.x + 1.2, cy, CHEST.z);
  return (
    <>
      <primitive object={chestObj} scale={0.48} position={[CHEST.x - 0.15, deckY(CHEST.x - 0.15, CHEST.z), CHEST.z]} rotation={[0, Math.PI / 2, 0]} />
      <primitive object={spotTarget} />
      <spotLight position={[CHEST.x + 2.2, cy + 4.2, CHEST.z]} target={spotTarget} color="#ffd9a0" intensity={22} angle={0.62} penumbra={0.7} distance={10} decay={1.2} />
      {items.map((it, i) => {
        const y = deckY(it.x, it.z);
        return (
          <group
            key={`${lootKey}-${i}`}
            position={[it.x, y, it.z]}
            onClick={
              onLoot
                ? (e: ThreeEvent<MouseEvent>) => {
                    if (e.delta > 6) return;
                    e.stopPropagation();
                    onLoot(i);
                  }
                : undefined
            }
          >
            <mesh
              ref={(r) => {
                rings.current[i] = r;
              }}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, 0]}
            >
              <ringGeometry args={[0.2, 0.27, 40]} />
              <meshBasicMaterial color="#ffd36a" transparent opacity={0.2} depthWrite={false} />
            </mesh>
            <group
              ref={(g) => {
                groups.current[i] = g;
              }}
            >
              <primitive object={it.obj} />
            </group>
          </group>
        );
      })}
    </>
  );
}

/** Un objet du butin, à une taille lisible depuis la poupe. */
function buildLoot(item: DeckLootItem, src: { coins: THREE.Object3D; bottle: THREE.Object3D; map: THREE.Object3D }): THREE.Object3D {
  let o: THREE.Object3D;
  let size = 0.42;
  switch (item.kind) {
    case 'coin':
      o = src.coins.clone(true);
      size = (item.value ?? 5) >= 20 ? 0.52 : (item.value ?? 5) >= 10 ? 0.45 : 0.38;
      break;
    case 'rum':
      o = src.bottle.clone(true);
      size = 0.42;
      break;
    case 'map':
      o = src.map.clone(true);
      size = 0.42;
      break;
    case 'powder':
      o = shotPile();
      size = 0.36;
      break;
    case 'pearl':
      o = pearl();
      size = 0.34;
      break;
    default:
      o = bicorne();
      size = 0.46;
  }
  shade(o);
  const box = new THREE.Box3().setFromObject(o);
  const s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z, 0.001);
  const wrap = new THREE.Group();
  o.scale.multiplyScalar(k);
  o.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
  wrap.add(o);
  return wrap;
}

/** Munitions : une petite pyramide de boulets sur un sac de poudre. */
function shotPile(): THREE.Object3D {
  const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: '#3a3f44', metalness: 0.75, roughness: 0.35 });
  const sack = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 0.9 }));
  sack.scale.set(0.16, 0.13, 0.13);
  sack.position.set(-0.12, 0.12, -0.05);
  g.add(sack);
  const r = 0.06;
  const spots: [number, number, number][] = [
    [0.04, r, -0.05],
    [0.16, r, -0.05],
    [0.1, r, 0.06],
    [0.1, r * 2.6, -0.01],
  ];
  for (const [x, y, z] of spots) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), iron);
    b.position.set(x, y, z);
    g.add(b);
  }
  return g;
}

function pearl(): THREE.Object3D {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: '#b9a48c', roughness: 0.7 });
  const nacre = new THREE.MeshStandardMaterial({ color: '#f1dfe6', roughness: 0.35, metalness: 0.1 });
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shell);
  bottom.scale.set(0.2, 0.06, 0.17);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(1, 24), nacre);
  inside.rotation.x = -Math.PI / 2;
  inside.scale.set(0.19, 0.16, 1);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell);
  top.scale.set(0.2, 0.08, 0.17);
  top.position.set(0, 0.02, -0.1);
  top.rotation.x = -1.1;
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#fffaf0', roughness: 0.12, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd6f0') }));
  p.position.set(0, 0.07, 0.02);
  g.add(bottom, inside, top, p);
  return g;
}

function bicorne(): THREE.Object3D {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.3, 0, Math.PI, false);
  shape.absarc(0, 0.02, 0.17, Math.PI, 0, true);
  const felt = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: '#1d1a1f', roughness: 0.85 }));
  felt.position.z = -0.06;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: '#e2b04a', metalness: 0.9, roughness: 0.3 }));
  trim.position.z = 0.08;
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.5 }));
  badge.position.set(0, 0.17, 0.09);
  g.add(felt, trim, badge);
  return g;
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

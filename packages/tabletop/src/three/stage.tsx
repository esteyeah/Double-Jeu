'use client';

import { Suspense, useEffect, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Scene3D } from './Table3D';
import { DeckScene, LairScene } from './scenes';
import { CouncilScene } from './council';
import { ELEVATION, type Fit } from './parts';

/**
 * Caméra orthographique inclinée : 1 unité = 1 pixel. La table (ellipse de demi-axes A et B)
 * retombe exactement sous l'ellipse où `RoundTable` assoit les joueurs.
 */
export default function Stage({ scene, inset }: { scene: Scene3D; inset: { x: number; y: number } }) {
  return (
    <Canvas
      orthographic
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ zoom: 1, near: 1, far: 5000, position: [0, 1000 * Math.sin(ELEVATION), 1000 * Math.cos(ELEVATION)] }}
      style={{ pointerEvents: 'none' }}
    >
      <Rig />
      <Ticker fps={30} />
      <Suspense fallback={null}>
        <Fitted scene={scene} inset={inset} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#fff1d6" position={[0, 5, -6]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffd29a" position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#b8d4ff" position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={4} />
        </Environment>
      </Suspense>
      <EffectComposer multisampling={2} frameBufferType={THREE.UnsignedByteType}>
        <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={1.1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}

function Rig() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/**
 * Anime la scène à cadence réduite (économie de batterie), et seulement quand elle est visible :
 * onglet affiché et table à l'écran.
 */
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

function Fitted({ scene, inset }: { scene: Scene3D; inset: { x: number; y: number } }) {
  const { width, height } = useThree((s) => s.size);
  const fit: Fit = {
    A: width * (0.5 - inset.x),
    B: (height * (0.5 - inset.y)) / Math.sin(ELEVATION),
    u: Math.min(width * (0.5 - inset.x), height * (0.5 - inset.y)),
  };
  switch (scene.kind) {
    case 'deck':
      return <DeckScene fit={fit} />;
    case 'council':
      return <CouncilScene fit={fit} seats={scene.seats ?? 0} />;
    case 'lair':
      return <LairScene fit={fit} brew={scene.brew} />;
  }
}

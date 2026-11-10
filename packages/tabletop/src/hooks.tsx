'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { onSoundChange, setSoundOn, soundOn, startAmbient, type AmbientKind } from './sound';

/** Réglage du son partagé par tout le site. */
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundOn());
    return onSoundChange(setOn);
  }, []);
  return [on, (v: boolean) => setSoundOn(v)];
}

/** Ambiance sonore en boucle pendant que le plateau est affiché. */
export function useAmbient(kind: AmbientKind, intensity = 0): void {
  const handle = useRef<ReturnType<typeof startAmbient> | null>(null);
  useEffect(() => {
    handle.current = startAmbient(kind, intensity);
    return () => handle.current?.stop();
    // L'intensité est suivie à part, sans relancer l'ambiance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  useEffect(() => handle.current?.setIntensity(intensity), [intensity]);
}

/** Exécute `effect` quand `key` change (pas au premier affichage) : sons et animations d'événements. */
export function useOnChange<T>(key: T, effect: (prev: T) => void): void {
  const prev = useRef<{ value: T } | null>(null);
  useEffect(() => {
    if (prev.current && !Object.is(prev.current.value, key)) effect(prev.current.value);
    prev.current = { value: key };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Carte qui se retourne en 3D. */
export function Flip({
  flipped,
  front,
  back,
  className = '',
  style,
  duration = 0.7,
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  className?: string;
  style?: CSSProperties;
  duration?: number;
}) {
  return (
    <div className={className} style={{ perspective: '900px', ...style }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: `transform ${duration}s cubic-bezier(.3,1.4,.5,1)`,
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>{back}</div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {front}
        </div>
      </div>
    </div>
  );
}

/** Vrai quand la requête média correspond (ex. « (min-width: 1024px) »), mis à jour au redimensionnement. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return match;
}

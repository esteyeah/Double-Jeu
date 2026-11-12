'use client';

import { useSyncExternalStore } from 'react';
import { storage } from './storage';

/**
 * Préférence « ambiance » : décors, personnages et scènes plein écran (par défaut), ou bien les
 * plateaux simples et sans thème du début. Mémorisée sur l'appareil, partagée par tous les jeux.
 */
const KEY = 'arcade.ambiance';
const listeners = new Set<() => void>();

function read(): boolean {
  return storage.get(KEY) !== 'off';
}

export function setAmbiance(on: boolean) {
  storage.set(KEY, on ? 'on' : 'off');
  listeners.forEach((f) => f());
}

function subscribe(f: () => void) {
  listeners.add(f);
  const onStorage = (e: StorageEvent) => e.key === KEY && f();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(f);
    window.removeEventListener('storage', onStorage);
  };
}

export function useAmbiance(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => true);
  return [on, setAmbiance];
}

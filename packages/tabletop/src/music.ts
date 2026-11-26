'use client';

import { useEffect, useState } from 'react';
import { audioOut } from './sound';

/**
 * Musique de fond synthétisée (rien à télécharger) : une harpe à cordes pincées (synthèse
 * Karplus-Strong) sur un bourdon grave de vielle, dans la réverbération d'une cave voûtée.
 * Air original en ré dorien, rythme de danse à 6/8. Elle suit le réglage général du son et
 * se coupe à part (réglage « musique »).
 */

const KEY = 'arcade.music';
const EVENT = 'arcade-music';

export function musicOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMusicOn(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* réglage non retenu */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/** Réglage « musique » (activée par défaut), partagé entre tous les composants. */
export function useMusicSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(musicOn());
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return [on, setMusicOn];
}

export type MusicKind = 'tavern';

/** Joue la musique tant que le composant est affiché (et que la musique est activée). */
export function useMusic(kind: MusicKind): void {
  const [on] = useMusicSetting();
  useEffect(() => {
    if (!on) return;
    const m = startMusic(kind);
    return () => m.stop();
  }, [kind, on]);
}

// ───────── L'air : ré dorien, 6/8, mesures de six croches ─────────

type Note = [midi: number, eighths: number];
type Bar = { root: number; minor: boolean; tune: Note[] };

const D = 50; // ré grave (basse)
const C = 48;
const F = 53;
const A = 45;
const bar = (root: number, minor: boolean, tune: Note[]): Bar => ({ root, minor, tune });

const TUNE: Bar[] = [
  // A
  bar(D, true, [[69, 3], [74, 2], [72, 1]]),
  bar(D, true, [[69, 2], [67, 1], [65, 2], [67, 1]]),
  bar(C, false, [[64, 2], [67, 1], [72, 3]]),
  bar(D, true, [[69, 2], [65, 1], [62, 3]]),
  bar(F, false, [[65, 2], [69, 1], [72, 2], [74, 1]]),
  bar(C, false, [[76, 3], [74, 2], [72, 1]]),
  bar(A, true, [[69, 2], [72, 1], [71, 2], [67, 1]]),
  bar(D, true, [[69, 6]]),
  // B
  bar(F, false, [[72, 2], [69, 1], [65, 2], [69, 1]]),
  bar(C, false, [[67, 2], [64, 1], [60, 3]]),
  bar(D, true, [[62, 1], [65, 1], [69, 1], [74, 3]]),
  bar(C, false, [[72, 2], [71, 1], [67, 3]]),
  bar(D, true, [[69, 2], [74, 1], [77, 2], [76, 1]]),
  bar(C, false, [[74, 2], [72, 1], [76, 3]]),
  bar(A, true, [[74, 2], [72, 1], [69, 2], [67, 1]]),
  bar(D, true, [[62, 6]]),
];
/** Mesures d'accompagnement seul après l'air, pour respirer. */
const REST: Bar[] = [bar(D, true, []), bar(C, false, []), bar(F, false, []), bar(D, true, [])];
const SONG = [...TUNE, ...TUNE, ...REST];
const EIGHTH = 0.34;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// ───────── Synthèse ─────────

/** Corde pincée (Karplus-Strong), calculée une fois par hauteur. */
const plucks = new Map<string, AudioBuffer>();
function pluck(ac: AudioContext, midi: number, bright: number): AudioBuffer {
  const id = `${midi}:${bright}`;
  const cached = plucks.get(id);
  if (cached) return cached;
  const sr = ac.sampleRate;
  const len = Math.floor(sr * 3.2);
  const buf = ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const period = sr / hz(midi);
  const n = Math.max(2, Math.round(period));
  const line = new Float32Array(n);
  // Attaque : un bruit adouci (doigt sur la corde plutôt que médiator).
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 2 - 1;
    prev = prev + bright * (r - prev);
    line[i] = prev;
  }
  // Plus la note est grave, plus elle tient.
  const decay = 0.9965 + Math.min(0.0028, (69 - midi) * 0.00008);
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const a = line[idx]!;
    const b = line[(idx + 1) % n]!;
    const v = decay * 0.5 * (a + b);
    line[idx] = v;
    data[i] = a;
    idx = (idx + 1) % n;
  }
  // Fondu de fin, sans clic.
  const tail = Math.floor(sr * 0.3);
  for (let i = 0; i < tail; i++) data[len - 1 - i]! *= i / tail;
  plucks.set(id, buf);
  return buf;
}

/** Réverbération de cave : une queue de bruit qui décroît. */
function caveImpulse(ac: AudioContext): AudioBuffer {
  const sr = ac.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  return buf;
}

export function startMusic(kind: MusicKind): { stop: () => void } {
  void kind;
  const io = audioOut();
  if (!io) return { stop: () => {} };
  const { ac, out } = io;

  const bus = ac.createGain();
  bus.gain.value = 0;
  bus.gain.setTargetAtTime(0.4, ac.currentTime, 2);
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4200;
  const dry = ac.createGain();
  dry.gain.value = 0.8;
  const verb = ac.createConvolver();
  verb.buffer = caveImpulse(ac);
  const wet = ac.createGain();
  wet.gain.value = 0.32;
  bus.connect(tone);
  tone.connect(dry).connect(out);
  tone.connect(verb).connect(wet).connect(out);

  // Bourdon : ré et la graves, très doux, qui respirent lentement (vielle à roue lointaine).
  const droneGain = ac.createGain();
  droneGain.gain.value = 0.016;
  const droneFilter = ac.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 380;
  droneFilter.Q.value = 0.7;
  droneFilter.connect(droneGain).connect(bus);
  const sources: AudioScheduledSourceNode[] = [];
  for (const [f, detune] of [
    [hz(38), -4],
    [hz(45), 3],
    [hz(50), 0],
  ] as const) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(droneFilter);
    o.start();
    sources.push(o);
  }
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 120;
  lfo.connect(lfoDepth).connect(droneFilter.frequency);
  lfo.start();
  sources.push(lfo);

  const note = (at: number, midi: number, gain: number, bright: number) => {
    const src = ac.createBufferSource();
    src.buffer = pluck(ac, midi, bright);
    // Jeu humain : un rien d'irrégularité dans le temps et la force.
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.002;
    const g = ac.createGain();
    g.gain.value = gain * (0.85 + Math.random() * 0.3);
    src.connect(g).connect(bus);
    const t = at + Math.random() * 0.012;
    src.start(t);
    src.stop(t + 3.2);
  };

  const scheduleBar = (b: Bar, at: number) => {
    const third = b.root + (b.minor ? 3 : 4);
    // Basse et arpège de harpe, main gauche.
    note(at, b.root, 0.5, 0.45);
    note(at + 2 * EIGHTH, third + 12, 0.16, 0.6);
    note(at + 3 * EIGHTH, b.root + 7, 0.3, 0.5);
    note(at + 5 * EIGHTH, b.root + 12, 0.14, 0.6);
    // L'air, main droite.
    let t = at;
    for (const [midi, len] of b.tune) {
      note(t, midi, 0.42, 0.75);
      t += len * EIGHTH;
    }
  };

  // Programmation en avance, par petites tranches (la minuterie du navigateur n'est pas précise).
  let i = 0;
  let next = ac.currentTime + 0.8;
  const tick = () => {
    while (next < ac.currentTime + 1.2) {
      scheduleBar(SONG[i % SONG.length]!, next);
      next += 6 * EIGHTH;
      i++;
    }
  };
  tick();
  const timer = window.setInterval(tick, 250);

  return {
    stop: () => {
      window.clearInterval(timer);
      bus.gain.setTargetAtTime(0, ac.currentTime, 0.6);
      window.setTimeout(() => {
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {
            /* déjà arrêté */
          }
        });
        bus.disconnect();
        wet.disconnect();
        dry.disconnect();
      }, 3000);
    },
  };
}

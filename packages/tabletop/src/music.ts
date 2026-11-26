'use client';

import { useEffect, useState } from 'react';
import { audioOut } from './sound';

/**
 * Musique de fond synthétisée (rien à télécharger) : une harpe à cordes pincées (synthèse
 * Karplus-Strong) sur un bourdon grave de vielle, dans la réverbération d'une cave voûtée.
 * Gigue originale en ré dorien (6/8, enlevée), avec tambour sur cadre et tambourin. Elle suit le réglage général du son et
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
  // A : la gigue
  bar(D, true, [[74, 1], [72, 1], [69, 1], [74, 2], [69, 1]]),
  bar(C, false, [[72, 1], [71, 1], [67, 1], [72, 2], [67, 1]]),
  bar(D, true, [[69, 1], [71, 1], [72, 1], [74, 1], [76, 1], [77, 1]]),
  bar(C, false, [[76, 2], [74, 1], [72, 2], [67, 1]]),
  bar(D, true, [[74, 1], [72, 1], [69, 1], [74, 2], [69, 1]]),
  bar(C, false, [[72, 1], [71, 1], [67, 1], [72, 2], [74, 1]]),
  bar(F, false, [[77, 1], [76, 1], [74, 1], [72, 1], [69, 1], [67, 1]]),
  bar(D, true, [[69, 2], [74, 1], [74, 3]]),
  // B : on monte, on tape du pied
  bar(F, false, [[77, 2], [77, 1], [76, 1], [74, 1], [72, 1]]),
  bar(C, false, [[76, 2], [76, 1], [74, 1], [72, 1], [71, 1]]),
  bar(D, true, [[74, 1], [72, 1], [69, 1], [65, 1], [69, 1], [72, 1]]),
  bar(C, false, [[67, 1], [71, 1], [72, 1], [74, 2], [72, 1]]),
  bar(F, false, [[77, 2], [77, 1], [76, 1], [74, 1], [72, 1]]),
  bar(C, false, [[76, 1], [74, 1], [72, 1], [71, 1], [72, 1], [74, 1]]),
  bar(A, true, [[76, 1], [72, 1], [69, 1], [71, 1], [67, 1], [71, 1]]),
  bar(D, true, [[74, 3], [62, 3]]),
];
/** Deux mesures de tambour seul entre deux tours. */
const BREAK: Bar[] = [bar(D, true, []), bar(D, true, [])];
const SONG = [...TUNE, ...TUNE, ...BREAK];
const EIGHTH = 0.19;

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
  tone.frequency.value = 6500;
  const dry = ac.createGain();
  dry.gain.value = 0.8;
  const verb = ac.createConvolver();
  verb.buffer = caveImpulse(ac);
  const wet = ac.createGain();
  wet.gain.value = 0.22;
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

  // Tambour sur cadre (bodhrán) : un coup sourd dont la hauteur tombe.
  const drum = (at: number, gain: number) => {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(130, at);
    o.frequency.exponentialRampToValueAtTime(52, at + 0.16);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + 0.25);
  };
  // Tambourin : un frisson de cymbalettes.
  const noiseBuf = (() => {
    const len = Math.floor(ac.sampleRate * 0.12);
    const nb = ac.createBuffer(1, len, ac.sampleRate);
    const d = nb.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    return nb;
  })();
  const jingle = (at: number, gain: number) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 7500;
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    src.connect(bp).connect(g).connect(bus);
    src.start(at);
  };

  const scheduleBar = (b: Bar, at: number) => {
    const third = b.root + (b.minor ? 3 : 4);
    // Rythme de gigue : « boum-tchi-tchi, boum-tchi-tchi ».
    drum(at, 0.55);
    drum(at + 3 * EIGHTH, 0.45);
    if (Math.random() < 0.35) drum(at + 5 * EIGHTH, 0.2);
    for (const k of [1, 2, 4, 5]) jingle(at + k * EIGHTH, k === 2 || k === 5 ? 0.05 : 0.03);
    // Basse qui saute et accords plaqués sur les temps faibles.
    note(at, b.root, 0.5, 0.5);
    note(at + 3 * EIGHTH, b.root + 7, 0.4, 0.5);
    for (const k of [2, 5]) {
      note(at + k * EIGHTH, third + 12, 0.14, 0.7);
      note(at + k * EIGHTH, b.root + 19, 0.12, 0.7);
    }
    // L'air, main droite.
    let t = at;
    for (const [midi, len] of b.tune) {
      note(t, midi, 0.42, 0.85);
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

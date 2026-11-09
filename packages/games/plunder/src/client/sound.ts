'use client';

/**
 * Bruitages synthétisés à la volée (Web Audio) : aucun fichier à charger, fonctionne hors ligne.
 * Le navigateur n'autorise le son qu'après une première interaction : avant, les sons sont simplement ignorés.
 */

const KEY = 'arcade.plunder.sound';
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* stockage indisponible : réglage non retenu */
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !soundEnabled()) return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx.state === 'running' ? ctx : null;
}

function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  return src;
}

function envelope(ac: AudioContext, at: number, peak: number, decay: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  g.connect(ac.destination);
  return g;
}

/** Coup de pistolet : claquement de bruit filtré et grondement grave. */
export function bang(delay = 0, volume = 0.6): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  const src = noise(ac, 0.6);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, at);
  filter.frequency.exponentialRampToValueAtTime(300, at + 0.4);
  src.connect(filter).connect(envelope(ac, at, volume, 0.5));
  src.start(at);
  src.stop(at + 0.6);
  const boom = ac.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(120, at);
  boom.frequency.exponentialRampToValueAtTime(40, at + 0.3);
  boom.connect(envelope(ac, at, volume * 0.8, 0.35));
  boom.start(at);
  boom.stop(at + 0.4);
}

/** Poudre mouillée : un « pschitt » qui s'essouffle. */
export function fizzle(delay = 0): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  const src = noise(ac, 0.7);
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2500;
  src.connect(filter).connect(envelope(ac, at, 0.12, 0.6));
  src.start(at);
  src.stop(at + 0.7);
}

/** Plongeon dans la cale. */
export function splash(delay = 0): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  const src = noise(ac, 0.9);
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(1800, at);
  filter.frequency.exponentialRampToValueAtTime(250, at + 0.8);
  src.connect(filter).connect(envelope(ac, at, 0.25, 0.85));
  src.start(at);
  src.stop(at + 0.9);
}

/** Tintement de pièces. */
export function clink(delay = 0): void {
  const ac = audio();
  if (!ac) return;
  const at = ac.currentTime + delay;
  [2637, 3520].forEach((freq, i) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    o.connect(envelope(ac, at + i * 0.07, 0.12, 0.25));
    o.start(at + i * 0.07);
    o.stop(at + i * 0.07 + 0.3);
  });
}

/** Petite fanfare de fin de voyage. */
export function fanfare(): void {
  const ac = audio();
  if (!ac) return;
  [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
    const at = ac.currentTime + i * 0.16;
    const o = ac.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    o.connect(filter).connect(envelope(ac, at, 0.08, i === 3 ? 0.9 : 0.25));
    o.start(at);
    o.stop(at + 1);
  });
}

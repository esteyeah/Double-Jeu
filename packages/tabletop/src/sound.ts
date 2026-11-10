'use client';

/**
 * Sons des jeux, synthétisés à la volée (Web Audio) : rien à télécharger, fonctionne hors ligne.
 * Un seul réglage pour tout le site (bouton du plateau). Le navigateur n'autorise le son qu'après
 * une première interaction : avant, les sons sont ignorés et les ambiances démarrent au premier clic.
 */

const KEY = 'arcade.sound';
const EVENT = 'arcade-sound';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function soundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* réglage non retenu */
  }
  if (master && ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function onSoundChange(listener: (on: boolean) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<boolean>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = soundOn() ? 1 : 0;
    master.connect(ctx.destination);
    // Le premier geste de l'utilisateur débloque le son.
    const unlock = () => void ctx?.resume().catch(() => {});
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

function out(): AudioNode {
  return master!;
}

function noiseBuffer(ac: AudioContext, seconds: number, brown = false): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else data[i] = white;
  }
  return buffer;
}

function env(ac: AudioContext, at: number, peak: number, attack: number, decay: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(out());
  return g;
}

function ready(): AudioContext | null {
  const ac = audio();
  return ac && ac.state === 'running' && soundOn() ? ac : null;
}

function noise(ac: AudioContext, at: number, seconds: number, filter: BiquadFilterNode, gain: GainNode): void {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, seconds);
  src.connect(filter).connect(gain);
  src.start(at);
  src.stop(at + seconds);
}

function tone(ac: AudioContext, at: number, freq: number, type: OscillatorType, gain: GainNode, seconds: number, slideTo?: number) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + seconds);
  o.connect(gain);
  o.start(at);
  o.stop(at + seconds + 0.05);
}

export const sfx = {
  /** Détonation de pistolet. */
  bang(delay = 0, volume = 0.7) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, at);
    f.frequency.exponentialRampToValueAtTime(260, at + 0.45);
    noise(ac, at, 0.7, f, env(ac, at, volume, 0.003, 0.55));
    tone(ac, at, 140, 'sine', env(ac, at, volume * 0.9, 0.003, 0.32), 0.35, 38);
  },
  /** Chien qui claque sur une balle à blanc : « clic » sec puis petit souffle. */
  blank(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    noise(ac, at, 0.03, hp, env(ac, at, 0.5, 0.001, 0.03));
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    noise(ac, at + 0.06, 0.4, bp, env(ac, at + 0.06, 0.12, 0.02, 0.35));
  },
  /** Petit clic mécanique (interface, chien qu'on arme). */
  click(delay = 0, volume = 0.25) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    noise(ac, at, 0.025, hp, env(ac, at, volume, 0.001, 0.025));
  },
  /** Plongeon. */
  splash(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1;
    bp.frequency.setValueAtTime(2200, at);
    bp.frequency.exponentialRampToValueAtTime(220, at + 0.9);
    noise(ac, at, 1, bp, env(ac, at, 0.3, 0.01, 0.9));
  },
  /** Pièces qui tintent. */
  coins(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    [2637, 3136, 3951, 2960].forEach((freq, i) => tone(ac, at + i * 0.055, freq, 'triangle', env(ac, at + i * 0.055, 0.09, 0.002, 0.22), 0.25));
  },
  /** Glissement (carte, trappe qui coulisse). */
  whoosh(delay = 0, volume = 0.18) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(400, at);
    bp.frequency.exponentialRampToValueAtTime(2500, at + 0.25);
    noise(ac, at, 0.35, bp, env(ac, at, volume, 0.08, 0.25));
  },
  /** Choc métallique (trappe qui s'ouvre). */
  clank(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    [220, 331, 587, 913].forEach((freq) => tone(ac, at, freq, 'square', env(ac, at, 0.035, 0.002, 0.4), 0.45, freq * 0.97));
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    noise(ac, at, 0.12, lp, env(ac, at, 0.25, 0.002, 0.1));
  },
  /** Carillon positif (barre trouvée, bonne nouvelle). */
  chime(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    [880, 1318.5, 1760].forEach((freq, i) => tone(ac, at + i * 0.09, freq, 'sine', env(ac, at + i * 0.09, 0.12, 0.005, 0.7), 0.8));
  },
  /** Bip électronique. */
  beep(delay = 0, freq = 1046, volume = 0.06) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    tone(ac, at, freq, 'sine', env(ac, at, volume, 0.004, 0.12), 0.14);
  },
  /** Sirène d'alarme. */
  alarm(delay = 0, repeats = 3) {
    const ac = ready();
    if (!ac) return;
    for (let i = 0; i < repeats; i++) {
      const at = ac.currentTime + delay + i * 0.7;
      tone(ac, at, 520, 'sawtooth', env(ac, at, 0.07, 0.05, 0.6), 0.65, 880);
    }
  },
  /** Fanfare de fin. */
  fanfare(delay = 0) {
    const ac = ready();
    if (!ac) return;
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const at = ac.currentTime + delay + i * 0.16;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2000;
      lp.connect(env(ac, at, 0.09, 0.01, i === 3 ? 1 : 0.25));
      const o = ac.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      o.connect(lp);
      o.start(at);
      o.stop(at + 1.2);
    });
  },
  /** Grondement sourd (défaite, explosion). */
  boom(delay = 0) {
    const ac = ready();
    if (!ac) return;
    const at = ac.currentTime + delay;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, at);
    lp.frequency.exponentialRampToValueAtTime(60, at + 2);
    noise(ac, at, 2.2, lp, env(ac, at, 0.8, 0.01, 2));
    tone(ac, at, 70, 'sine', env(ac, at, 0.6, 0.01, 1.6), 1.7, 28);
  },
};

export type AmbientKind = 'sea' | 'reactor';

/**
 * Ambiance de fond en boucle : la mer qui clapote et le bois qui grince, ou le ronronnement du réacteur.
 * `intensity` (0 à 1) fait monter la tension (réacteur).
 */
export function startAmbient(kind: AmbientKind, intensity = 0): { stop: () => void; setIntensity: (v: number) => void } {
  const ac = audio();
  const none = { stop: () => {}, setIntensity: () => {} };
  if (!ac) return none;
  const bus = ac.createGain();
  bus.gain.value = 0;
  bus.connect(out());
  bus.gain.setTargetAtTime(1, ac.currentTime, 1.5);
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];

  const loopNoise = (brown: boolean) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, 6, brown);
    src.loop = true;
    nodes.push(src);
    return src;
  };
  const lfo = (freq: number, depth: number, target: AudioParam) => {
    const o = ac.createOscillator();
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.value = depth;
    o.connect(g).connect(target);
    o.start();
    nodes.push(o);
  };

  let level = intensity;
  if (kind === 'sea') {
    // Houle : bruit brun filtré, dont le volume ondule lentement.
    const waves = loopNoise(true);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const g = ac.createGain();
    g.gain.value = 0.11;
    lfo(0.11, 0.07, g.gain);
    lfo(0.07, 180, lp.frequency);
    waves.connect(lp).connect(g).connect(bus);
    waves.start();
    // Grincements de la coque, de temps en temps.
    const creak = () => {
      const at = ac.currentTime;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 18;
      bp.frequency.setValueAtTime(320 + Math.random() * 200, at);
      bp.frequency.linearRampToValueAtTime(260 + Math.random() * 120, at + 0.9);
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer(ac, 1);
      const eg = ac.createGain();
      eg.gain.setValueAtTime(0.0001, at);
      eg.gain.exponentialRampToValueAtTime(0.18, at + 0.3);
      eg.gain.exponentialRampToValueAtTime(0.0001, at + 1);
      src.connect(bp).connect(eg).connect(bus);
      src.start(at);
      src.stop(at + 1.05);
      timers.push(window.setTimeout(creak, 7000 + Math.random() * 9000));
    };
    timers.push(window.setTimeout(creak, 4000));
  } else {
    // Ronronnement grave, sifflement de ventilation et bips de console.
    const hum = ac.createGain();
    hum.gain.value = 0.05;
    [50, 100, 150].forEach((freq, i) => {
      const o = ac.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = [0.6, 0.25, 0.1][i]!;
      o.connect(g).connect(hum);
      o.start();
      nodes.push(o);
    });
    lfo(0.25, 0.015, hum.gain);
    hum.connect(bus);
    const air = loopNoise(false);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.6;
    const ag = ac.createGain();
    ag.gain.value = 0.012;
    air.connect(bp).connect(ag).connect(bus);
    air.start();
    const blip = () => {
      const at = ac.currentTime;
      const freq = [988, 1175, 1319, 1568][Math.floor(Math.random() * 4)]! * (1 + level * 0.5);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.03 + level * 0.03, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
      g.connect(bus);
      const o = ac.createOscillator();
      o.frequency.value = freq;
      o.connect(g);
      o.start(at);
      o.stop(at + 0.12);
      timers.push(window.setTimeout(blip, (5000 - level * 3500) * (0.5 + Math.random())));
    };
    timers.push(window.setTimeout(blip, 2500));
    // Plus la tension monte, plus le ronronnement s'aiguise.
    const setLevel = () => {
      hum.gain.setTargetAtTime(0.05 + level * 0.05, ac.currentTime, 0.8);
    };
    setLevel();
    return {
      stop: () => stopAll(),
      setIntensity: (v: number) => {
        level = Math.max(0, Math.min(1, v));
        setLevel();
      },
    };
  }

  function stopAll() {
    timers.forEach((t) => window.clearTimeout(t));
    bus.gain.setTargetAtTime(0, ac!.currentTime, 0.4);
    window.setTimeout(() => {
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* déjà arrêté */
        }
      });
      bus.disconnect();
    }, 1500);
  }
  return { stop: stopAll, setIntensity: (v: number) => void (level = v) };
}

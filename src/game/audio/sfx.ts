// Tiny generated sound effects (Web Audio API): no audio files, no downloads, no licensing.
// Framework-free, so both the game (detections) and the UI (button clicks) can use it.

export type SoundName = "spotted" | "alarm" | "search" | "clear" | "capture" | "noise" | "click";

/** One beep: an oscillator gliding from `freq` to `to` (Hz) with a quick fade out. */
export interface Note {
  readonly freq: number;
  readonly to?: number;
  /** Seconds after the sound starts. */
  readonly at: number;
  readonly duration: number;
  readonly wave: OscillatorType;
  /** Peak loudness before the master volume (0..1). */
  readonly gain: number;
}

/** The recipes. Short and quiet on purpose: feedback, not music. */
export const SOUNDS: Readonly<Record<SoundName, readonly Note[]>> = {
  // A guard notices the player: a quick rising "!".
  spotted: [
    { freq: 660, to: 990, at: 0, duration: 0.09, wave: "square", gain: 0.18 },
    { freq: 990, at: 0.1, duration: 0.08, wave: "square", gain: 0.14 },
  ],
  // The chase starts: a two-tone alarm.
  alarm: [
    { freq: 880, at: 0, duration: 0.12, wave: "sawtooth", gain: 0.12 },
    { freq: 660, at: 0.13, duration: 0.12, wave: "sawtooth", gain: 0.12 },
    { freq: 880, at: 0.26, duration: 0.12, wave: "sawtooth", gain: 0.1 },
  ],
  // A guard starts searching: a questioning glide up.
  search: [{ freq: 330, to: 520, at: 0, duration: 0.22, wave: "triangle", gain: 0.2 }],
  // A guard gives up and goes back to patrol: a soft falling tone.
  clear: [{ freq: 520, to: 330, at: 0, duration: 0.25, wave: "triangle", gain: 0.14 }],
  // Caught: a descending buzz.
  capture: [
    { freq: 440, to: 220, at: 0, duration: 0.3, wave: "square", gain: 0.18 },
    { freq: 220, to: 110, at: 0.3, duration: 0.4, wave: "square", gain: 0.16 },
  ],
  // The player makes a noise (Space): a low thump.
  noise: [{ freq: 160, to: 60, at: 0, duration: 0.14, wave: "sine", gain: 0.35 }],
  // A UI button: a tiny tick.
  click: [{ freq: 1200, at: 0, duration: 0.025, wave: "square", gain: 0.05 }],
};

/** Ignore a repeat of the same sound within this many milliseconds (e.g. two guards at once). */
const REPEAT_GUARD_MS = 80;

let enabled = true;
let volume = 0.5;
let context: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed = new Map<SoundName, number>();

/** Sound on/off and master volume (0..1). */
export function configureSound(options: { readonly enabled: boolean; readonly volume: number }): void {
  enabled = options.enabled;
  volume = Math.min(1, Math.max(0, options.volume));
  if (master) master.gain.value = volume;
}

export function soundSettings(): { enabled: boolean; volume: number } {
  return { enabled, volume };
}

function audio(): AudioContext | null {
  if (context) return context;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = volume;
  master.connect(context.destination);
  return context;
}

/**
 * Plays a sound now. Returns false when it was not played: sound off, a repeat within
 * REPEAT_GUARD_MS, or no Web Audio available. Never throws.
 */
export function playSound(name: SoundName): boolean {
  if (!enabled) return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < REPEAT_GUARD_MS) return false;
  try {
    const ctx = audio();
    if (!ctx || !master) return false;
    // Browsers start audio suspended until the user interacts; resume on the next sound.
    if (ctx.state === "suspended") void ctx.resume();
    lastPlayed.set(name, now);
    const start = ctx.currentTime + 0.01;
    for (const note of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.freq, start + note.at);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, start + note.at + note.duration);
      gain.gain.setValueAtTime(0, start + note.at);
      gain.gain.linearRampToValueAtTime(note.gain, start + note.at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
      osc.connect(gain).connect(master);
      osc.start(start + note.at);
      osc.stop(start + note.at + note.duration + 0.02);
    }
    if (typeof window !== "undefined" && import.meta.env?.DEV) {
      const log = ((window as { __sfxLog?: string[] }).__sfxLog ??= []);
      log.push(name);
    }
    return true;
  } catch {
    return false;
  }
}

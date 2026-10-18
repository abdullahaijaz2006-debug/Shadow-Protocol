import { afterEach, describe, expect, it } from "vitest";
import { configureSound, playSound, SOUNDS, soundSettings, type SoundName } from "./sfx";

afterEach(() => configureSound({ enabled: true, volume: 0.5 }));

describe("SOUNDS", () => {
  it.each(Object.entries(SOUNDS) as [SoundName, (typeof SOUNDS)[SoundName]][])("'%s' is short, quiet and audible", (_name, notes) => {
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.at + note.duration).toBeLessThanOrEqual(1);
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(0.4);
      for (const f of [note.freq, note.to ?? note.freq]) {
        expect(f).toBeGreaterThanOrEqual(40);
        expect(f).toBeLessThanOrEqual(4000);
      }
    }
  });

  it("has a sound for detection, chase, capture and interface clicks", () => {
    for (const name of ["spotted", "alarm", "capture", "click"] as const) expect(SOUNDS[name]).toBeDefined();
  });
});

describe("playSound", () => {
  it("does nothing (and never throws) without Web Audio, e.g. in Node", () => {
    expect(() => playSound("spotted")).not.toThrow();
    expect(playSound("alarm")).toBe(false);
  });

  it("does nothing when sound is off", () => {
    configureSound({ enabled: false, volume: 1 });
    expect(playSound("capture")).toBe(false);
  });
});

describe("configureSound", () => {
  it("clamps the volume to 0..1", () => {
    configureSound({ enabled: true, volume: 7 });
    expect(soundSettings()).toEqual({ enabled: true, volume: 1 });
    configureSound({ enabled: false, volume: -2 });
    expect(soundSettings()).toEqual({ enabled: false, volume: 0 });
  });
});

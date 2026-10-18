import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_STORAGE_KEY } from "./settings";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

describe("settings", () => {
  it("uses the defaults when nothing is saved or the data is broken", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{ nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid fields, replaces invalid ones with defaults, and clamps the volume", () => {
    expect(parseSettings(JSON.stringify({ sound: false, volume: 3, visionCones: "yes" }))).toEqual({
      ...DEFAULT_SETTINGS,
      sound: false,
      volume: 1,
    });
  });

  it("saves and loads a round trip", () => {
    const storage = memoryStorage();
    const settings = { sound: false, volume: 0.2, visionCones: false, animations: false };
    saveSettings(settings, storage);
    expect(storage.data.has(SETTINGS_STORAGE_KEY)).toBe(true);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it("never throws when storage is missing or fails", () => {
    expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    const failing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadSettings(failing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, failing)).not.toThrow();
  });
});

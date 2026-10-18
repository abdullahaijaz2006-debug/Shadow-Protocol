// User settings (sound, visuals), saved in localStorage. Pure TypeScript apart from the storage passed in.

export interface AppSettings {
  readonly sound: boolean;
  /** Master volume, 0..1. */
  readonly volume: number;
  /** Draw the guards' vision cones (detection is the same either way). */
  readonly visionCones: boolean;
  /** UI animations, camera shake, flashes and icon motion. */
  readonly animations: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = { sound: true, volume: 0.5, visionCones: true, animations: true };

export const SETTINGS_STORAGE_KEY = "shadow-protocol.settings";

/** Reads saved settings, keeping defaults for anything missing or malformed. Never throws. */
export function parseSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
  const d = data as Record<string, unknown>;
  const bool = (key: keyof AppSettings) => (typeof d[key] === "boolean" ? (d[key] as boolean) : (DEFAULT_SETTINGS[key] as boolean));
  const volume = typeof d.volume === "number" && Number.isFinite(d.volume) ? Math.min(1, Math.max(0, d.volume)) : DEFAULT_SETTINGS.volume;
  return { sound: bool("sound"), volume, visionCones: bool("visionCones"), animations: bool("animations") };
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export function loadSettings(storage: Storage | undefined): AppSettings {
  try {
    return parseSettings(storage?.getItem(SETTINGS_STORAGE_KEY) ?? null);
  } catch {
    return DEFAULT_SETTINGS; // storage can be unavailable (privacy modes, quota, …)
  }
}

export function saveSettings(settings: AppSettings, storage: Storage | undefined): void {
  try {
    storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not being able to save settings is not worth interrupting the user.
  }
}

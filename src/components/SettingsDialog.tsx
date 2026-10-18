import { useEffect, useRef } from "react";
import { playSound } from "../game/audio/sfx";
import type { AppSettings } from "./settings";
import { pressHandler } from "./visualizer/pressHandler";

interface SettingsDialogProps {
  readonly settings: AppSettings;
  readonly onChange: (settings: AppSettings) => void;
  readonly onClose: () => void;
}

/** A small modal with the user settings. Changes apply immediately and are saved automatically. */
export function SettingsDialog({ settings, onChange, onClose }: SettingsDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} ref={dialog}>
        <h2 id="settings-title" className="panel-title">
          SETTINGS
        </h2>
        <label className="setting">
          <input type="checkbox" checked={settings.sound} onChange={(e) => set({ sound: e.target.checked })} />
          Sound effects
        </label>
        <label className="setting">
          Volume
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.volume * 100)}
            disabled={!settings.sound}
            onChange={(e) => set({ volume: Number(e.target.value) / 100 })}
          />
          <span className="setting-value">{Math.round(settings.volume * 100)}%</span>
          <button type="button" disabled={!settings.sound} onClick={pressHandler(() => playSound("spotted"))}>
            test
          </button>
        </label>
        <label className="setting">
          <input type="checkbox" checked={settings.visionCones} onChange={(e) => set({ visionCones: e.target.checked })} />
          Show guard vision cones <span className="formal-dim">(detection works the same either way)</span>
        </label>
        <label className="setting">
          <input type="checkbox" checked={settings.animations} onChange={(e) => set({ animations: e.target.checked })} />
          Animations and screen effects <span className="formal-dim">(shake, flashes, pulsing highlights)</span>
        </label>
        <div className="dialog-actions">
          <button type="button" onClick={pressHandler(onClose)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

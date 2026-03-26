import { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "../lib/api";

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  defaultInterval: 30,
  favoriteProfiles: [],
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    window.electronAPI.loadSettings().then(setSettings);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const updated = { ...settings, ...patch };
      setSettings(updated);
      await window.electronAPI.saveSettings(updated);
    },
    [settings]
  );

  return { settings, updateSettings };
}

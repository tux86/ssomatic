import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import type { AppSettings } from "../lib/api";

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  defaultInterval: 30,
  favoriteProfiles: [],
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    api.loadSettings().then(setSettings);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const updated = { ...settings, ...patch };
      setSettings(updated);
      await api.saveSettings(updated);
    },
    [settings]
  );

  return { settings, updateSettings };
}

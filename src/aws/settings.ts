import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export interface AppSettings {
  notifications: boolean;
  refreshLeadMinutes: number;
  favoriteProfiles: string[];
}

/**
 * Bounds for the refresh lead. Role credentials live an hour, so a lead beyond
 * that would mark every profile permanently due and refresh in a tight loop.
 */
export const LEAD_MINUTES_MIN = 1;
export const LEAD_MINUTES_MAX = 45;

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  refreshLeadMinutes: 5,
  favoriteProfiles: [],
};

export function clampLeadMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.refreshLeadMinutes;
  return Math.min(LEAD_MINUTES_MAX, Math.max(LEAD_MINUTES_MIN, Math.round(value)));
}

function settingsPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return join(home, ".aws", "credentials-manager.json");
}

/** Coerce arbitrary on-disk JSON into valid settings. Exported for testing. */
export function normalizeSettings(raw: unknown): AppSettings {
  const record = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    notifications:
      typeof record.notifications === "boolean" ? record.notifications : DEFAULT_SETTINGS.notifications,
    refreshLeadMinutes:
      typeof record.refreshLeadMinutes === "number"
        ? clampLeadMinutes(record.refreshLeadMinutes)
        : DEFAULT_SETTINGS.refreshLeadMinutes,
    // Drop non-string entries so a corrupted file cannot crash name comparisons.
    favoriteProfiles: Array.isArray(record.favoriteProfiles)
      ? [...new Set(record.favoriteProfiles.filter((n): n is string => typeof n === "string"))]
      : [...DEFAULT_SETTINGS.favoriteProfiles],
  };
}

export function loadSettings(): AppSettings {
  const path = settingsPath();
  if (!existsSync(path)) return { ...DEFAULT_SETTINGS, favoriteProfiles: [] };
  try {
    return normalizeSettings(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return { ...DEFAULT_SETTINGS, favoriteProfiles: [] };
  }
}

export function saveSettings(settings: AppSettings): void {
  const path = settingsPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(normalizeSettings(settings), null, 2) + "\n");
}

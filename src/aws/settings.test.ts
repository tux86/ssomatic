import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let home: string;
let prevHome: string | undefined;

beforeEach(() => {
  prevHome = process.env.HOME;
  home = mkdtempSync(join(tmpdir(), "awssesh-settings-"));
  process.env.HOME = home;
});
afterEach(() => {
  process.env.HOME = prevHome;
  rmSync(home, { recursive: true, force: true });
});

test("loadSettings returns defaults when no file exists", async () => {
  const { loadSettings, DEFAULT_SETTINGS } = await import("./settings");
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test("saveSettings then loadSettings round-trips", async () => {
  const { loadSettings, saveSettings } = await import("./settings");
  saveSettings({ notifications: false, refreshLeadMinutes: 10, favoriteProfiles: ["prod", "dev"] });
  expect(loadSettings()).toEqual({ notifications: false, refreshLeadMinutes: 10, favoriteProfiles: ["prod", "dev"] });
});

test("loadSettings migrates a legacy file with defaultInterval", async () => {
  const { loadSettings } = await import("./settings");
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(join(home, ".aws"), { recursive: true });
  writeFileSync(join(home, ".aws", "credentials-manager.json"), JSON.stringify({ notifications: true, defaultInterval: 30, favoriteProfiles: ["x"] }));
  const s = loadSettings();
  expect(s.favoriteProfiles).toEqual(["x"]);
  expect(s.refreshLeadMinutes).toBe(5);
  expect("defaultInterval" in s).toBe(false);
});

test("loadSettings ignores unknown fields including autoStartDaemon", async () => {
  const { loadSettings } = await import("./settings");
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(join(home, ".aws"), { recursive: true });
  writeFileSync(join(home, ".aws", "credentials-manager.json"), JSON.stringify({ notifications: false, autoStartDaemon: true, favoriteProfiles: ["y"] }));
  const s = loadSettings();
  expect(s.notifications).toBe(false);
  expect(s.favoriteProfiles).toEqual(["y"]);
  expect("autoStartDaemon" in s).toBe(false);
});

test("refreshLeadMinutes is clamped to a range that cannot cause a refresh loop", async () => {
  const { normalizeSettings, LEAD_MINUTES_MAX, LEAD_MINUTES_MIN } = await import("./settings");
  expect(normalizeSettings({ refreshLeadMinutes: 9999 }).refreshLeadMinutes).toBe(LEAD_MINUTES_MAX);
  expect(normalizeSettings({ refreshLeadMinutes: 0 }).refreshLeadMinutes).toBe(LEAD_MINUTES_MIN);
  expect(normalizeSettings({ refreshLeadMinutes: -5 }).refreshLeadMinutes).toBe(LEAD_MINUTES_MIN);
  expect(normalizeSettings({ refreshLeadMinutes: Number.NaN }).refreshLeadMinutes).toBe(5);
});

test("a corrupted favourites list cannot poison name comparisons", async () => {
  const { normalizeSettings } = await import("./settings");
  expect(normalizeSettings({ favoriteProfiles: ["a", 7, null, "a"] }).favoriteProfiles).toEqual(["a"]);
  expect(normalizeSettings({ favoriteProfiles: "nope" }).favoriteProfiles).toEqual([]);
});

test("loadSettings survives a truncated or non-JSON settings file", async () => {
  const { loadSettings, DEFAULT_SETTINGS } = await import("./settings");
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(join(home, ".aws"), { recursive: true });
  writeFileSync(join(home, ".aws", "credentials-manager.json"), "{ not json");
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

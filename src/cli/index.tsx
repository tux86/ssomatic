#!/usr/bin/env node
/**
 * awssesh - Interactive TUI for managing AWS SSO credentials
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, useApp, useInput } from "ink";
import { parseArgs } from "./args.js";
import { runStatus } from "./commands/status.js";
import { runExport } from "./commands/export.js";
import { runRefresh } from "./commands/refresh.js";
import { App, renderApp, Spinner, StatusMessage, ACTIONS } from "./components/index.js";
import { Dashboard } from "./tui/Dashboard.js";
import { Details } from "./tui/Details.js";
import { Settings } from "./tui/Settings.js";
import { LoginPrompt } from "./tui/LoginPrompt.js";
import { useDeviceAuth, type LoginResult } from "./tui/useDeviceAuth.js";
import { useAutoRefresh } from "./tui/useAutoRefresh.js";
import { useTransientMessage } from "./hooks/useTransientMessage.js";
import {
  type SSOProfile,
  discoverProfiles,
  refreshProfile,
  readProfileCredentials,
  credentialsAreFresh,
  sendNotification,
  openBrowser,
} from "../aws/sso.js";
import { buildExportBlock, getConsoleSigninUrl } from "../aws/console.js";
import { copyToClipboard } from "../aws/utils.js";
import { loadSettings, saveSettings, type AppSettings } from "../aws/settings.js";
import { VERSION, checkForUpdate } from "../version.js";

type ViewState = "dashboard" | "details" | "settings";

const TITLE = `awssesh v${VERSION}`;

function Awssesh() {
  const { exit } = useApp();

  const [view, setView] = useState<ViewState>("dashboard");
  const [detailName, setDetailName] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [ssoProfiles, setSSOProfiles] = useState<SSOProfile[]>([]);
  const [seeding, setSeeding] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<SSOProfile | null>(null);

  const { message, notify, hold } = useTransientMessage();

  // Notify-once on auto-refresh login expiry, respecting the notifications setting.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const onNeedsLogin = useCallback((name: string) => {
    if (settingsRef.current.notifications) {
      void sendNotification("SSO Login Required", `Token expired for profile '${name}'`);
    }
  }, []);

  const { profiles, reload, refreshOne, setFavorite } = useAutoRefresh(settings, onNeedsLogin);

  // Seed discovered SSO profiles on mount (the hook seeds the profile states).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const discovered = await discoverProfiles();
      if (cancelled) return;
      setSSOProfiles(discovered);
      setSeeding(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void checkForUpdate().then((v) => {
      if (!cancelled) setUpdateAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const findProfile = useCallback(
    (name: string): SSOProfile | undefined => ssoProfiles.find((p) => p.name === name),
    [ssoProfiles],
  );

  // ── Interactive login ──────────────────────────────────────────────────────
  const handleLoginComplete = useCallback(
    (profile: SSOProfile, result: LoginResult) => {
      setPendingLogin(null);
      // The failure reason used to be dropped on the floor, leaving the user
      // back at the dashboard with no idea why nothing changed.
      if (result.success) notify(`Signed in to ${profile.name}`, "success");
      else notify(`${profile.name}: ${result.error ?? "login failed"}`, "error");
      void reload();
    },
    [reload, notify],
  );

  const deviceAuth = useDeviceAuth({ pendingLogin, onLoginComplete: handleLoginComplete });

  // Keyboard for the login prompt overlay (only active while a login is pending).
  useInput(
    (input, key) => {
      if (key.escape) {
        setPendingLogin(null);
        notify("Login cancelled");
        return;
      }
      if (deviceAuth.authError) return;
      if (key.return) deviceAuth.openInBrowser();
      else if (input === "c") deviceAuth.copyUrl();
    },
    { isActive: !!pendingLogin },
  );

  // ── Profile actions ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(
    async (name: string) => {
      hold(`Refreshing ${name}…`);
      const result = await refreshOne(name);
      if (result.needsLogin) {
        const profile = findProfile(name);
        if (profile) {
          hold(`${name} needs an interactive login`);
          setPendingLogin(profile); // login completion reloads state
          return;
        }
        notify(`${name} needs login, but it is no longer in ~/.aws/config`, "error");
        return;
      }
      if (result.ok) notify(`Refreshed ${name}`, "success");
      else notify(`${name}: ${result.error ?? "refresh failed"}`, "error");
    },
    [refreshOne, findProfile, hold, notify],
  );

  const handleToggleAuto = useCallback(
    (name: string) => {
      // `setFavorite` owns persistence, so settings have a single writer.
      const next = setFavorite(name);
      setSettings(next);
      notify(`⟳ auto-refresh ${next.favoriteProfiles.includes(name) ? "on" : "off"} for ${name}`);
    },
    [setFavorite, notify],
  );

  /**
   * Read credentials that are actually usable, refreshing when the stored ones
   * are missing, expired, or about to expire.
   *
   * Checking only for *presence* meant copying an hour-old, already-dead
   * session token to the clipboard and reporting success — the profile still
   * showed "valid" because that reflects the SSO token, which outlives the role
   * credentials several times over.
   */
  const ensureCredentials = useCallback(
    async (name: string) => {
      const existing = readProfileCredentials(name);
      if (credentialsAreFresh(existing)) return existing;

      const profile = findProfile(name);
      if (!profile) return null;
      const result = await refreshProfile(profile);
      if (!result.success) return null;

      const refreshed = readProfileCredentials(name);
      // A profile whose expiry we still cannot determine (written by another
      // tool) is better used than refused — it was just re-fetched.
      return refreshed;
    },
    [findProfile],
  );

  const handleCopyExport = useCallback(
    async (name: string) => {
      hold(`Fetching credentials for ${name}…`);
      const creds = await ensureCredentials(name);
      if (!creds) {
        notify(`No credentials for ${name} — refresh or log in first`, "error");
        return;
      }
      const ok = await copyToClipboard(buildExportBlock(creds));
      if (ok) notify(`Copied AWS_* export lines for ${name}`, "success");
      else notify("Copy failed — no clipboard tool available", "error");
    },
    [ensureCredentials, hold, notify],
  );

  const handleCopyName = useCallback(
    async (name: string) => {
      const ok = await copyToClipboard(name);
      if (ok) notify(`Copied “${name}”`, "success");
      else notify("Copy failed — no clipboard tool available", "error");
    },
    [notify],
  );

  const handleOpenConsole = useCallback(
    async (name: string) => {
      hold(`Opening console for ${name}…`);
      const creds = await ensureCredentials(name);
      if (!creds) {
        notify(`No credentials for ${name} — refresh or log in first`, "error");
        return;
      }
      try {
        openBrowser(await getConsoleSigninUrl(creds));
        notify(`Opened the AWS console for ${name}`, "success");
      } catch {
        notify(`Console sign-in failed for ${name}`, "error");
      }
    },
    [ensureCredentials, hold, notify],
  );

  const handleOpenDetails = useCallback((name: string) => {
    setDetailName(name);
    setView("details");
  }, []);

  const handleSettingsChange = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const statusItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    if (updateAvailable) {
      items.push(
        <Text key="update" color="yellow">
          {`↑ v${updateAvailable} available — npx awssesh@latest`}
        </Text>,
      );
    }
    if (message) {
      const color = message.tone === "error" ? "red" : message.tone === "success" ? "green" : "cyan";
      items.push(
        <Text key="message" color={color}>
          {message.text}
        </Text>,
      );
    }
    return items;
  }, [updateAvailable, message]);

  // Loading / seeding state.
  if (seeding && profiles.length === 0) {
    return (
      <App title={TITLE} actions={[ACTIONS.quit]} captureQuit onQuit={exit}>
        <Spinner label="Discovering SSO profiles…" />
      </App>
    );
  }

  // No profiles found.
  if (!seeding && ssoProfiles.length === 0 && profiles.length === 0) {
    return (
      <App title={TITLE} actions={[ACTIONS.quit]} captureQuit onQuit={exit}>
        <StatusMessage type="error">No SSO profiles found in ~/.aws/config</StatusMessage>
        <Text dimColor>Add a profile with `aws configure sso`, then restart awssesh.</Text>
      </App>
    );
  }

  // Login overlay takes precedence over the active view.
  if (pendingLogin) {
    return (
      <App title={TITLE} statusItems={statusItems} onQuit={exit}>
        <LoginPrompt
          profile={pendingLogin}
          deviceAuth={deviceAuth.deviceAuth}
          authError={deviceAuth.authError}
          copied={deviceAuth.copied}
          copyFailed={deviceAuth.copyFailed}
          authorizing={deviceAuth.authorizing}
        />
      </App>
    );
  }

  if (view === "settings") {
    return (
      <App title={TITLE} statusItems={statusItems} onQuit={exit}>
        <Settings settings={settings} onChange={handleSettingsChange} onBack={() => setView("dashboard")} />
      </App>
    );
  }

  const detail = view === "details" && detailName ? profiles.find((p) => p.name === detailName) : undefined;
  if (detail) {
    const sso = findProfile(detail.name);
    return (
      <App title={TITLE} statusItems={statusItems} onQuit={exit}>
        <Details
          profile={detail}
          roleName={sso?.ssoRoleName}
          region={sso?.region ?? sso?.ssoRegion}
          startUrl={sso?.ssoStartUrl}
          onBack={() => setView("dashboard")}
          onRefresh={(name) => void handleRefresh(name)}
          onCopyExport={(name) => void handleCopyExport(name)}
          onCopyName={(name) => void handleCopyName(name)}
          onOpenConsole={(name) => void handleOpenConsole(name)}
          onToggleAuto={handleToggleAuto}
        />
      </App>
    );
  }

  return (
    <App title={TITLE} statusItems={statusItems} onQuit={exit}>
      <Dashboard
        profiles={profiles}
        onRefresh={(name) => void handleRefresh(name)}
        onToggleAuto={handleToggleAuto}
        onOpenDetails={handleOpenDetails}
        onOpenConsole={(name) => void handleOpenConsole(name)}
        onCopyExport={(name) => void handleCopyExport(name)}
        onCopyName={(name) => void handleCopyName(name)}
        onOpenSettings={() => setView("settings")}
        onQuit={exit}
      />
    </App>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────

const HELP = `awssesh — interactive AWS SSO credential manager

Usage:
  awssesh                    launch the interactive TUI
  awssesh status             print profile statuses and exit
  awssesh refresh [profile]  refresh a profile (or all ⟳ profiles) now
  awssesh export <profile>   print export AWS_* lines for eval $(...)
  awssesh --version          print the version
  awssesh --help             show this message

Examples:
  eval $(awssesh export prod)
  awssesh refresh prod

Environment:
  AWSSESH_NO_UPDATE_CHECK    skip the release check on startup
  AWSSESH_NO_HYPERLINKS      render URLs as plain text
`;

async function launchTui(): Promise<void> {
  const instance = renderApp(<Awssesh />);
  // Always terminate promptly on quit; the in-process auto-refresh interval is
  // cleared on unmount, so there are no lingering handles.
  await instance.waitUntilExit();
  process.exit(0);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  switch (parsed.kind) {
    case "version":
      process.stdout.write(`awssesh v${VERSION}\n`);
      return;
    case "help":
      process.stdout.write(HELP);
      return;
    case "status":
      process.exit(await runStatus());
      return;
    case "export":
      process.exit(await runExport(parsed.profile));
      return;
    case "refresh":
      process.exit(await runRefresh(parsed.profile));
      return;
    case "error":
      process.stderr.write(parsed.message + "\n");
      process.stderr.write("\n" + HELP);
      process.exit(1);
      return;
    case "tui":
      await launchTui();
      return;
  }
}

void main();

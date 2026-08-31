import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildProfileState,
  type ProfileState,
} from "../../aws/profileState.js";
import { decideAction } from "../../aws/refreshScheduler.js";
import { discoverProfiles, findCachedToken, readProfileCredentials, refreshProfile } from "../../aws/sso.js";
import { saveSettings, type AppSettings } from "../../aws/settings.js";

/** How often the in-process loop checks favorites for due refreshes. */
const TICK_MS = 30_000;

export interface AutoRefreshView {
  profiles: ProfileState[];
  reload: () => Promise<void>;
  refreshOne: (name: string) => Promise<{ needsLogin: boolean; ok: boolean; error?: string }>;
  /** Toggle ⟳ for a profile, persist it, and return the resulting settings. */
  setFavorite: (name: string) => AppSettings;
}

/**
 * In-process auto-refresh for the TUI. While the dashboard is open it keeps the
 * ⟳ (favorite) profiles fresh: every tick it decides, per favorite, whether the
 * cached role credentials are due for a silent refresh and performs it,
 * expiry-aware — entirely in-process, no background process or sockets.
 *
 * Both the periodic tick and the on-demand reload derive their view from disk
 * (SSO token cache + the credentials file), so they can never disagree about
 * when something expires.
 */
export function useAutoRefresh(
  settings: AppSettings,
  onNeedsLogin?: (name: string) => void,
): AutoRefreshView {
  const [profiles, setProfiles] = useState<ProfileState[]>([]);
  const notified = useRef(new Set<string>());

  // Keep the latest settings + callback in refs so the interval closure always
  // reads current values without resubscribing the timer.
  const settingsRef = useRef(settings);
  const onNeedsLoginRef = useRef(onNeedsLogin);
  useEffect(() => {
    settingsRef.current = settings;
    onNeedsLoginRef.current = onNeedsLogin;
  }, [settings, onNeedsLogin]);

  const notifyOnce = useCallback((name: string) => {
    if (notified.current.has(name)) return;
    notified.current.add(name);
    onNeedsLoginRef.current?.(name);
  }, []);

  /** Recompute every profile from disk, refreshing the favorites that are due. */
  const sync = useCallback(
    async ({ refreshDue }: { refreshDue: boolean }) => {
      const s = settingsRef.current;
      const leadMs = s.refreshLeadMinutes * 60 * 1000;
      const favorites = new Set(s.favoriteProfiles);
      const now = new Date();
      const discovered = await discoverProfiles();
      const states: ProfileState[] = [];

      for (const p of discovered) {
        const favorite = favorites.has(p.name);
        let errorMsg: string | undefined;
        let status: ProfileState["status"] | undefined;

        if (refreshDue && favorite) {
          const cachedToken = await findCachedToken(p);
          const ssoTokenValid = cachedToken !== null && cachedToken.expiresAt > now;
          const credsExpireAt = readProfileCredentials(p.name)?.expiresAt ?? null;
          const action = decideAction({ ssoTokenValid, credsExpireAt }, now, leadMs);

          if (action === "refresh") {
            const r = await refreshProfile(p);
            if (r.success) notified.current.delete(p.name);
            else if (r.needsLogin) notifyOnce(p.name);
            else {
              status = "error";
              errorMsg = r.error;
            }
          } else if (action === "needs-login") {
            notifyOnce(p.name);
          }
        }

        // Read back after any refresh, so the state reflects what is on disk.
        const state = await buildProfileState(p, favorite, new Date());
        states.push({
          ...state,
          ...(status !== undefined && { status }),
          ...(errorMsg !== undefined && { error: errorMsg }),
        });
      }

      setProfiles(states);
    },
    [notifyOnce],
  );

  const reload = useCallback(() => sync({ refreshDue: false }), [sync]);

  // Seed from disk on mount.
  useEffect(() => {
    void reload();
  }, [reload]);

  // Run the auto-refresh loop while mounted. The callback never throws
  // unhandled; any failure is swallowed so the timer survives.
  useEffect(() => {
    const id = setInterval(() => {
      void sync({ refreshDue: true }).catch(() => {
        /* keep the loop alive on transient failures */
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [sync]);

  // Refresh a single profile immediately (silent). Returns whether the caller
  // should kick off an interactive device-auth flow.
  const refreshOne = useCallback(
    async (name: string): Promise<{ needsLogin: boolean; ok: boolean; error?: string }> => {
      const p = (await discoverProfiles()).find((x) => x.name === name);
      if (!p) return { needsLogin: false, ok: false, error: "profile not found" };

      const r = await refreshProfile(p);
      if (r.success) notified.current.delete(name);
      await reload();

      if (r.success) return { needsLogin: false, ok: true };
      if (r.needsLogin) return { needsLogin: true, ok: false };
      return { needsLogin: false, ok: false, error: r.error };
    },
    [reload],
  );

  // Toggle ⟳ (favorite) for a profile: persist favoriteProfiles, then reload so
  // the marker updates immediately. This is the single writer for favourites —
  // the caller mirrors the returned settings into React state rather than
  // computing its own copy, which previously let the two drift apart.
  const setFavorite = useCallback(
    (name: string): AppSettings => {
      const current = settingsRef.current;
      const favorites = new Set(current.favoriteProfiles);
      if (favorites.has(name)) favorites.delete(name);
      else favorites.add(name);

      const next: AppSettings = { ...current, favoriteProfiles: [...favorites] };
      settingsRef.current = next;
      saveSettings(next);
      void reload();
      return next;
    },
    [reload],
  );

  return { profiles, reload, refreshOne, setFavorite };
}

import React, { useState, useCallback } from "react";
import { api } from "../lib/api";
import type { SSOProfile } from "../lib/api";
import type { ProfileStatusUI } from "../hooks/useProfiles";
import { ProfileCard } from "./ProfileCard";

interface RefreshViewProps {
  profiles: SSOProfile[];
  statuses: ProfileStatusUI[];
  favorites: string[];
  settings: { notifications: boolean };
}

interface RefreshResult {
  name: string;
  success: boolean;
  error?: string;
}

type Phase = "select" | "refreshing" | "login" | "done";

export function RefreshView({ profiles, statuses, favorites, settings }: RefreshViewProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(favorites));
  const [phase, setPhase] = useState<Phase>("select");
  const [results, setResults] = useState<RefreshResult[]>([]);
  const [currentProfile, setCurrentProfile] = useState<string>("");
  const [loginInfo, setLoginInfo] = useState<{
    url: string;
    code: string;
    profile: string;
  } | null>(null);

  // Sort: favorites first
  const sorted = [...profiles].sort((a, b) => {
    const aFav = favorites.includes(a.name);
    const bFav = favorites.includes(b.name);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === profiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(profiles.map((p) => p.name)));
    }
  };

  const startRefresh = useCallback(async () => {
    const toRefresh = profiles.filter((p) => selected.has(p.name));
    if (toRefresh.length === 0) return;

    setPhase("refreshing");
    setResults([]);

    for (const profile of toRefresh) {
      setCurrentProfile(profile.name);
      const result = await api.refreshProfile(profile);

      if (result.needsLogin) {
        // Need SSO login
        setPhase("login");
        if (settings.notifications) {
          api.sendNotification(
            "SSO Login Required",
            `Token expired for '${profile.name}'`
          );
        }

        const deviceAuth = await api.startDeviceAuth(profile);
        if (deviceAuth) {
          setLoginInfo({
            url: deviceAuth.verificationUri,
            code: deviceAuth.userCode,
            profile: profile.name,
          });

          // Poll for authorization
          const loginResult = await api.performSSOLogin(profile, {
            ...deviceAuth,
            expiresAt: new Date(deviceAuth.expiresAt),
          });

          setResults((prev) => [
            ...prev,
            { name: profile.name, success: loginResult.success, error: loginResult.error },
          ]);
          setLoginInfo(null);
        } else {
          setResults((prev) => [
            ...prev,
            { name: profile.name, success: false, error: "Failed to start device auth" },
          ]);
        }

        setPhase("refreshing");
      } else {
        setResults((prev) => [
          ...prev,
          { name: profile.name, success: result.success, error: result.error },
        ]);
      }
    }

    setPhase("done");
    setCurrentProfile("");
  }, [profiles, selected, settings]);

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Refresh Credentials</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {phase === "select"
              ? "Select profiles to refresh"
              : phase === "done"
                ? `Done - ${successCount} refreshed${errorCount > 0 ? `, ${errorCount} failed` : ""}`
                : `Refreshing ${currentProfile}...`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {phase === "select" && (
            <>
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-surface-2 border border-border text-text-secondary
                           hover:bg-surface-3 hover:text-text-primary transition-all"
              >
                {selected.size === profiles.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={startRefresh}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold
                           bg-accent text-white hover:bg-accent-hover transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                </svg>
                Refresh ({selected.size})
              </button>
            </>
          )}
          {phase === "done" && (
            <button
              onClick={() => {
                setPhase("select");
                setResults([]);
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-medium
                         bg-surface-2 border border-border text-text-secondary
                         hover:bg-surface-3 transition-all"
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Login prompt overlay */}
      {loginInfo && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 animate-slide-up">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg mt-0.5">&#9888;</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-400">
                SSO Login Required - {loginInfo.profile}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Authorize in your browser to continue
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Code</span>
                  <div className="text-lg font-mono font-bold text-purple-400 tracking-widest mt-0.5">
                    {loginInfo.code}
                  </div>
                </div>
                <button
                  onClick={() => api.openBrowser(loginInfo.url)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                             bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open Browser
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Waiting for authorization...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="flex flex-col gap-2">
          {phase === "select" &&
            sorted.map((profile) => {
              const status = statuses.find((s) => s.profile.name === profile.name);
              return (
                <ProfileCard
                  key={profile.name}
                  profile={profile}
                  status={status}
                  isFavorite={favorites.includes(profile.name)}
                  selected={selected.has(profile.name)}
                  onSelect={() => toggleSelect(profile.name)}
                />
              );
            })}

          {(phase === "refreshing" || phase === "login" || phase === "done") && (
            <div className="flex flex-col gap-2">
              {profiles
                .filter((p) => selected.has(p.name))
                .map((profile) => {
                  const result = results.find((r) => r.name === profile.name);
                  const isCurrent = currentProfile === profile.name && !result;
                  return (
                    <div
                      key={profile.name}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border transition-all
                        ${result?.success ? "border-green-500/20 bg-green-500/5" : ""}
                        ${result && !result.success ? "border-red-500/20 bg-red-500/5" : ""}
                        ${isCurrent ? "border-accent/30 bg-accent-muted" : ""}
                        ${!result && !isCurrent ? "border-border bg-surface-1 opacity-50" : ""}
                      `}
                    >
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {result?.success && (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        {result && !result.success && (
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </div>
                        )}
                        {isCurrent && (
                          <div className="w-6 h-6 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
                        )}
                        {!result && !isCurrent && (
                          <div className="w-6 h-6 rounded-full border-2 border-border" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary">{profile.name}</span>
                        {result?.error && (
                          <span className="text-xs text-status-expired ml-2">{result.error}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

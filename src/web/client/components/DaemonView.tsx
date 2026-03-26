import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import type { SSOProfile } from "../lib/api";
import { ProfileCard } from "./ProfileCard";
import type { ProfileStatusUI } from "../hooks/useProfiles";

const INTERVALS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hr" },
  { value: 120, label: "2 hr" },
];

interface DaemonViewProps {
  profiles: SSOProfile[];
  statuses: ProfileStatusUI[];
  favorites: string[];
  defaultInterval: number;
  notifications: boolean;
}

export function DaemonView({
  profiles,
  statuses,
  favorites,
  defaultInterval,
  notifications,
}: DaemonViewProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(favorites));
  const [interval, setIntervalMin] = useState(defaultInterval);
  const [running, setRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [results, setResults] = useState<{ name: string; success: boolean }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sorted = [...profiles].sort((a, b) => {
    const aFav = favorites.includes(a.name);
    const bFav = favorites.includes(b.name);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setResults([]);
    const toRefresh = profiles.filter((p) => selected.has(p.name));

    for (const profile of toRefresh) {
      const result = await api.refreshProfile(profile);
      if (result.needsLogin && notifications) {
        api.sendNotification(
          "SSO Login Required",
          `Token expired for '${profile.name}'`
        );
      }
      setResults((prev) => [...prev, { name: profile.name, success: result.success }]);
    }

    setRefreshing(false);
    setLastRefresh(new Date());
    setNextRefresh(new Date(Date.now() + interval * 60 * 1000));
  }, [profiles, selected, interval, notifications]);

  const start = useCallback(() => {
    setRunning(true);
    doRefresh();
    timerRef.current = setInterval(doRefresh, interval * 60 * 1000);
  }, [doRefresh, interval]);

  const stop = useCallback(() => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setNextRefresh(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Auto-Refresh</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {running
              ? `Running - refreshing every ${interval} minutes`
              : "Configure continuous credential refresh"}
          </p>
        </div>

        {running ? (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold
                       bg-red-500/10 border border-red-500/20 text-status-expired
                       hover:bg-red-500/20 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold
                       bg-accent text-white hover:bg-accent-hover transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start ({selected.size})
          </button>
        )}
      </div>

      {/* Daemon status when running */}
      {running && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-accent-muted border border-accent/20">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-2 mt-1">
                {refreshing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-accent">Refreshing</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-status-valid animate-pulse-dot" />
                    <span className="text-sm font-medium text-status-valid">Active</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Interval</span>
              <div className="text-sm font-medium text-text-primary mt-1">{interval} min</div>
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Last Refresh</span>
              <div className="text-sm font-medium text-text-primary mt-1">
                {lastRefresh ? lastRefresh.toLocaleTimeString() : "-"}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Next Refresh</span>
              <div className="text-sm font-medium text-text-primary mt-1">
                {nextRefresh && !refreshing ? nextRefresh.toLocaleTimeString() : "-"}
              </div>
            </div>
          </div>
          {results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-accent/10 flex items-center gap-4">
              <span className="text-xs text-status-valid">{successCount} refreshed</span>
              {errorCount > 0 && (
                <span className="text-xs text-status-expired">{errorCount} failed</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interval selector (when not running) */}
      {!running && (
        <div className="px-6 py-4 border-b border-border">
          <span className="text-xs text-text-muted font-medium">Refresh Interval</span>
          <div className="flex gap-2 mt-2">
            {INTERVALS.map((i) => (
              <button
                key={i.value}
                onClick={() => setIntervalMin(i.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${
                    interval === i.value
                      ? "bg-accent text-white"
                      : "bg-surface-2 border border-border text-text-secondary hover:bg-surface-3"
                  }
                `}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile selection (when not running) */}
      {!running && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-2">
            {sorted.map((profile) => {
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
          </div>
        </div>
      )}

      {/* Running profile list */}
      {running && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-1.5">
            {profiles
              .filter((p) => selected.has(p.name))
              .map((profile) => {
                const result = results.find((r) => r.name === profile.name);
                return (
                  <div
                    key={profile.name}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-1 border border-border"
                  >
                    {result ? (
                      <div
                        className={`w-2 h-2 rounded-full ${result.success ? "bg-status-valid" : "bg-status-expired"}`}
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-text-muted" />
                    )}
                    <span className="text-sm text-text-primary">{profile.name}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

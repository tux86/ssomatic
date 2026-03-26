import React from "react";
import type { AppSettings, SSOProfile } from "../lib/api";

const INTERVALS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
];

interface SettingsViewProps {
  settings: AppSettings;
  profiles: SSOProfile[];
  onUpdate: (patch: Partial<AppSettings>) => void;
}

export function SettingsView({ settings, profiles, onUpdate }: SettingsViewProps) {
  const toggleFavorite = (name: string) => {
    const favs = settings.favoriteProfiles.includes(name)
      ? settings.favoriteProfiles.filter((f) => f !== name)
      : [...settings.favoriteProfiles, name];
    onUpdate({ favoriteProfiles: favs });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure notifications, intervals, and favorites
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg flex flex-col gap-8">
          {/* Notifications */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Notifications
            </h2>
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-1 border border-border">
              <div>
                <div className="text-sm font-medium text-text-primary">System Notifications</div>
                <div className="text-xs text-text-muted mt-0.5">
                  Alert when SSO login is required
                </div>
              </div>
              <button
                onClick={() => onUpdate({ notifications: !settings.notifications })}
                className={`
                  relative w-11 h-6 rounded-full transition-all duration-200
                  ${settings.notifications ? "bg-accent" : "bg-surface-3"}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm
                    ${settings.notifications ? "left-6" : "left-1"}
                  `}
                />
              </button>
            </div>
          </section>

          {/* Default Interval */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Default Refresh Interval
            </h2>
            <div className="flex gap-2">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  onClick={() => onUpdate({ defaultInterval: i.value })}
                  className={`
                    flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border
                    ${
                      settings.defaultInterval === i.value
                        ? "bg-accent-muted border-accent/30 text-accent-hover"
                        : "bg-surface-1 border-border text-text-secondary hover:bg-surface-2"
                    }
                  `}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </section>

          {/* Favorite Profiles */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Favorite Profiles
            </h2>
            <p className="text-xs text-text-muted mb-3">
              Favorites appear first and are pre-selected for refresh
            </p>
            <div className="flex flex-col gap-1.5">
              {profiles.map((profile) => {
                const isFav = settings.favoriteProfiles.includes(profile.name);
                return (
                  <button
                    key={profile.name}
                    onClick={() => toggleFavorite(profile.name)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                      ${
                        isFav
                          ? "border-yellow-500/20 bg-yellow-500/5"
                          : "border-border bg-surface-1 hover:bg-surface-2"
                      }
                    `}
                  >
                    <span className={`text-sm ${isFav ? "text-yellow-400" : "text-text-muted"}`}>
                      {isFav ? "\u2605" : "\u2606"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text-primary">{profile.name}</span>
                      <span className="text-[11px] font-mono text-text-muted ml-2">
                        {profile.ssoAccountId}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { RefreshView } from "./components/RefreshView";
import { DaemonView } from "./components/DaemonView";
import { SettingsView } from "./components/SettingsView";
import { useProfiles } from "./hooks/useProfiles";
import { useSettings } from "./hooks/useSettings";

type View = "dashboard" | "refresh" | "daemon" | "settings";

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const { profiles, statuses, loading, fetchStatuses } = useProfiles();
  const { settings, updateSettings } = useSettings();

  const toggleFavorite = (name: string) => {
    const favs = settings.favoriteProfiles.includes(name)
      ? settings.favoriteProfiles.filter((f) => f !== name)
      : [...settings.favoriteProfiles, name];
    updateSettings({ favoriteProfiles: favs });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        active={view}
        onChange={setView}
        profileCount={profiles.length}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Drag region for right side of titlebar */}
        <div className="drag-region h-11 flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === "dashboard" && (
            <Dashboard
              profiles={profiles}
              statuses={statuses}
              loading={loading}
              favorites={settings.favoriteProfiles}
              onToggleFavorite={toggleFavorite}
              onRefreshStatuses={fetchStatuses}
            />
          )}
          {view === "refresh" && (
            <RefreshView
              profiles={profiles}
              statuses={statuses}
              favorites={settings.favoriteProfiles}
              settings={settings}
            />
          )}
          {view === "daemon" && (
            <DaemonView
              profiles={profiles}
              statuses={statuses}
              favorites={settings.favoriteProfiles}
              defaultInterval={settings.defaultInterval}
              notifications={settings.notifications}
            />
          )}
          {view === "settings" && (
            <SettingsView
              settings={settings}
              profiles={profiles}
              onUpdate={updateSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
}

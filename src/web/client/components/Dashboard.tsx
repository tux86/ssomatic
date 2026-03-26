import React from "react";
import type { SSOProfile } from "../lib/api";
import type { ProfileStatusUI } from "../hooks/useProfiles";
import { ProfileCard } from "./ProfileCard";

interface DashboardProps {
  profiles: SSOProfile[];
  statuses: ProfileStatusUI[];
  loading: boolean;
  favorites: string[];
  onToggleFavorite: (name: string) => void;
  onRefreshStatuses: () => void;
}

export function Dashboard({
  profiles,
  statuses,
  loading,
  favorites,
  onToggleFavorite,
  onRefreshStatuses,
}: DashboardProps) {
  const validCount = statuses.filter((s) => s.status === "valid").length;
  const expiredCount = statuses.filter((s) => s.status === "expired").length;
  const totalCount = profiles.length;

  const sorted = [...profiles].sort((a, b) => {
    const aFav = favorites.includes(a.name);
    const bFav = favorites.includes(b.name);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-2 pb-5">
        <div>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-[12px] text-text-muted mt-0.5">
            Overview of your SSO profiles
          </p>
        </div>
        <button
          onClick={onRefreshStatuses}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-[7px] rounded-lg text-[12px] font-medium
                     bg-white/[0.05] text-text-secondary
                     hover:bg-white/[0.08] hover:text-text-primary transition-all
                     disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={loading ? "animate-spin" : ""}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {loading ? "Checking..." : "Refresh Status"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-8 pb-5">
        <StatCard label="Total Profiles" value={totalCount} color="indigo" />
        <StatCard label="Valid" value={validCount} color="green" />
        <StatCard label="Expired" value={expiredCount} color="red" />
      </div>

      {/* Profile list */}
      <div className="px-8 pb-2">
        <span className="text-[10.5px] font-semibold text-text-muted/60 uppercase tracking-widest">
          Profiles
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="flex flex-col gap-2">
          {sorted.map((profile) => {
            const status = statuses.find((s) => s.profile.name === profile.name);
            return (
              <ProfileCard
                key={profile.name}
                profile={profile}
                status={status}
                isFavorite={favorites.includes(profile.name)}
                onToggleFavorite={() => onToggleFavorite(profile.name)}
              />
            );
          })}
        </div>

        {profiles.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              No SSO profiles found
            </h3>
            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
              Make sure your ~/.aws/config has profiles with sso_start_url, sso_account_id,
              sso_role_name, and sso_region
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "indigo" | "green" | "red";
}) {
  const styles = {
    indigo: {
      bg: "bg-indigo-500/[0.08]",
      border: "border-indigo-500/[0.12]",
      text: "text-indigo-400",
      glow: "shadow-indigo-500/5",
    },
    green: {
      bg: "bg-emerald-500/[0.08]",
      border: "border-emerald-500/[0.12]",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/5",
    },
    red: {
      bg: "bg-red-500/[0.08]",
      border: "border-red-500/[0.12]",
      text: "text-red-400",
      glow: "shadow-red-500/5",
    },
  };

  const s = styles[color];

  return (
    <div className={`${s.bg} rounded-xl px-4 py-3.5`}>
      <div className={`text-[28px] font-bold ${s.text} leading-none`}>{value}</div>
      <div className="text-[10.5px] text-text-muted/50 font-medium mt-1.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

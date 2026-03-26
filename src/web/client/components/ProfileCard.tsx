import React from "react";
import type { SSOProfile } from "../lib/api";
import type { ProfileStatusUI } from "../hooks/useProfiles";
import { StatusBadge } from "./StatusBadge";

interface ProfileCardProps {
  profile: SSOProfile;
  status?: ProfileStatusUI;
  isFavorite: boolean;
  selected?: boolean;
  onToggleFavorite?: () => void;
  onSelect?: () => void;
}

export function ProfileCard({
  profile,
  status,
  isFavorite,
  selected,
  onToggleFavorite,
  onSelect,
}: ProfileCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-150
        ${onSelect ? "cursor-pointer" : ""}
        ${
          selected
            ? "border-accent/20 bg-accent/[0.06]"
            : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
        }
      `}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={`
            w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all flex-shrink-0
            ${selected ? "border-accent bg-accent" : "border-white/[0.1] group-hover:border-white/[0.18]"}
          `}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Profile info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text-primary truncate">
            {profile.name}
          </span>
          {isFavorite && (
            <span className="text-amber-400/80 text-[11px] flex-shrink-0">&#9733;</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10.5px] font-mono text-text-muted/70 truncate">
            {profile.ssoAccountId}
          </span>
          <span className="text-text-muted/30 text-[10px]">&#x2022;</span>
          <span className="text-[10.5px] text-text-muted/70 truncate">
            {profile.ssoRoleName}
          </span>
        </div>
      </div>

      {/* Status + Favorite */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {status && <StatusBadge status={status.status} expiresAt={status.expiresAt} />}

        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`
              p-1 rounded-md transition-all
              ${
                isFavorite
                  ? "text-amber-400/80 hover:text-amber-400"
                  : "text-transparent group-hover:text-text-muted/30 hover:!text-amber-400/60"
              }
            `}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

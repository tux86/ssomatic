import React from "react";
import type { CredentialStatus } from "../lib/api";

interface StatusBadgeProps {
  status: CredentialStatus;
  expiresAt?: Date | null;
}

function formatExpiry(date?: Date | null): string {
  if (!date) return "";
  const diff = date.getTime() - Date.now();
  if (diff < 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

const STATUS_CONFIG: Record<
  CredentialStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  valid: {
    label: "Valid",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-400",
  },
  expired: {
    label: "Expired",
    dotClass: "bg-red-400",
    textClass: "text-red-400",
  },
  error: {
    label: "Error",
    dotClass: "bg-amber-400",
    textClass: "text-amber-400",
  },
  unknown: {
    label: "Unknown",
    dotClass: "bg-gray-500",
    textClass: "text-gray-500",
  },
};

export function StatusBadge({ status, expiresAt }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const expiry = status === "valid" ? formatExpiry(expiresAt) : "";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${config.textClass}`}>
      <span
        className={`w-[6px] h-[6px] rounded-full ${config.dotClass} ${status === "valid" ? "animate-pulse-dot" : ""}`}
      />
      {config.label}
      {expiry && <span className="opacity-60 font-normal">{expiry}</span>}
    </span>
  );
}

/**
 * Human-readable relative times, shared by the TUI and the `status` command so
 * they never drift apart.
 */

/** Compact "time left" for a table cell: `2h 05m`, `47m`, `38s`, `expired`. */
export function formatTimeLeft(target: Date | string | null | undefined, now: number = Date.now()): string {
  if (!target) return "—";
  const ms = (typeof target === "string" ? new Date(target).getTime() : target.getTime()) - now;
  if (Number.isNaN(ms)) return "—";
  if (ms <= 0) return "expired";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Prose form for a sentence: "9m 42s", "1h 3m". */
export function formatCountdown(target: Date | null | undefined, now: number = Date.now()): string {
  if (!target) return "—";
  const ms = target.getTime() - now;
  if (ms <= 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

/** Local wall-clock time, for showing when a session actually ends. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

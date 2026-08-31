/**
 * Version management — current version + update checking via GitHub API.
 */

// Read from package.json at build/runtime
import pkg from "../package.json";

export const VERSION = pkg.version;

const GITHUB_REPO = "tux86/awssesh";
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Compare two semver-ish versions. Returns >0 when `a` is newer than `b`.
 * Pre-release suffixes are ignored beyond ranking below the matching release.
 */
export function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const [core = "", pre = ""] = v.replace(/^v/, "").split("-", 2);
    return { parts: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const left = split(a);
  const right = split(b);

  for (let i = 0; i < 3; i++) {
    const diff = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  // 1.0.0 > 1.0.0-rc.1, and a pre-release only outranks another pre-release.
  if (left.pre === right.pre) return 0;
  if (!left.pre) return 1;
  if (!right.pre) return -1;
  return left.pre < right.pre ? -1 : 1;
}

/**
 * Resolve the newest published release, or null when we are already current.
 *
 * Only a *strictly newer* release is reported: comparing tag strings for mere
 * inequality made every local/dev build ahead of the latest tag advertise a
 * phantom "update" back down to the release. Set `AWSSESH_NO_UPDATE_CHECK` to
 * skip the network call entirely.
 */
export async function checkForUpdate(): Promise<string | null> {
  if (process.env.AWSSESH_NO_UPDATE_CHECK) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string };
    if (!data.tag_name) return null;
    const latest = data.tag_name.replace(/^v/, "");
    return compareVersions(latest, VERSION) > 0 ? latest : null;
  } catch {
    return null;
  }
}

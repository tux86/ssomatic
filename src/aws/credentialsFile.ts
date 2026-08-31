/**
 * Reading and writing ~/.aws/credentials in the exact dialect the AWS CLI and
 * the AWS SDKs expect.
 *
 * The `ini` package is deliberately not used here. It quotes any value that
 * contains `=` — which every SSO session token does, thanks to base64 padding —
 * while the AWS parsers take everything after the first `=` verbatim. A quoted
 * token therefore reaches AWS with literal `"` characters and every signed
 * request fails. This module also preserves unrelated sections, comments and
 * formatting, since ~/.aws/credentials is frequently hand-maintained.
 */

export interface CredentialEntry {
  [key: string]: string;
}

const SECTION_RE = /^\s*\[([^\]]+)\]/;

/** Strip surrounding quotes left behind by an older awssesh (or by `ini`). */
export function unquote(value: string): string {
  const match = /^(["'])([\s\S]*)\1$/.exec(value.trim());
  return match ? match[2]! : value.trim();
}

function keyOf(line: string): string | null {
  if (SECTION_RE.test(line)) return null;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) return null;
  const eq = trimmed.indexOf("=");
  return eq > 0 ? trimmed.slice(0, eq).trim() : null;
}

/**
 * Parse a credentials file into `{ section: { key: value } }`.
 * Values are unquoted defensively so files written by earlier versions still read back.
 */
export function parseCredentials(text: string): Record<string, CredentialEntry> {
  const sections: Record<string, CredentialEntry> = {};
  let current: string | null = null;

  for (const line of text.split(/\r?\n/)) {
    const section = SECTION_RE.exec(line);
    if (section) {
      current = section[1]!.trim();
      sections[current] ??= {};
      continue;
    }
    if (!current) continue;
    const key = keyOf(line);
    if (key === null) continue;
    const value = line.slice(line.indexOf("=") + 1);
    sections[current]![key] = unquote(value);
  }

  return sections;
}

/**
 * Insert or update `entries` under `[profile]`, leaving every other line —
 * other profiles, comments, blank lines, key order — exactly as it was.
 */
export function upsertProfile(text: string, profile: string, entries: CredentialEntry): string {
  const lines = text.length === 0 ? [] : text.split("\n");
  const header = `[${profile}]`;

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const section = SECTION_RE.exec(lines[i]!);
    if (section && section[1]!.trim() === profile) {
      start = i;
      break;
    }
  }

  // Profile absent — append a fresh section.
  if (start === -1) {
    const body = Object.entries(entries).map(([k, v]) => `${k} = ${v}`);
    const prefix = lines.length > 0 && lines.some((l) => l.trim() !== "") ? [...trimTrailingBlank(lines), ""] : [];
    return [...prefix, header, ...body, ""].join("\n");
  }

  // Section spans until the next section header (or EOF).
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (SECTION_RE.test(lines[i]!)) {
      end = i;
      break;
    }
  }

  const body = lines.slice(start + 1, end);
  const remaining = new Map(Object.entries(entries));

  const rewritten = body.map((line) => {
    const key = keyOf(line);
    if (key === null || !remaining.has(key)) return line;
    const value = remaining.get(key)!;
    remaining.delete(key);
    return `${key} = ${value}`;
  });

  // Append keys the section did not already have, before its trailing blank lines.
  let insertAt = rewritten.length;
  while (insertAt > 0 && rewritten[insertAt - 1]!.trim() === "") insertAt--;
  rewritten.splice(insertAt, 0, ...[...remaining].map(([k, v]) => `${k} = ${v}`));

  return [...lines.slice(0, start), header, ...rewritten, ...lines.slice(end)].join("\n");
}

function trimTrailingBlank(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1]!.trim() === "") end--;
  return lines.slice(0, end);
}

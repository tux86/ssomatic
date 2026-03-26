/**
 * General utilities
 */

import { spawn } from "child_process";

/**
 * Copy text to clipboard (cross-platform)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = process.platform === "darwin" ? "pbcopy" : "xclip";
    const args = process.platform === "darwin" ? [] : ["-selection", "clipboard"];
    const proc = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });

    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

/**
 * Format JSON string with pretty printing
 */
export function formatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

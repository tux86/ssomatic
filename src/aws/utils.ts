/**
 * General utilities
 */

import { spawn } from "node:child_process";

interface ClipboardTool {
  cmd: string;
  args: string[];
}

/**
 * Clipboard helpers in preference order for the current platform.
 *
 * Linux needs several: `xclip` only works under X11, so Wayland desktops
 * (`wl-copy`) and WSL (`clip.exe`) would otherwise silently fail.
 */
export function clipboardTools(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): ClipboardTool[] {
  if (platform === "darwin") return [{ cmd: "pbcopy", args: [] }];
  if (platform === "win32") return [{ cmd: "clip", args: [] }];

  const wayland: ClipboardTool[] = [{ cmd: "wl-copy", args: [] }];
  const x11: ClipboardTool[] = [
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
  ];
  const wsl: ClipboardTool[] = [{ cmd: "clip.exe", args: [] }];

  // Prefer the tool matching the active display server, but keep the others as
  // fallbacks — a machine can have both stacks installed.
  const ordered = env.WAYLAND_DISPLAY ? [...wayland, ...x11] : [...x11, ...wayland];
  return [...ordered, ...wsl];
}

function pipeTo(tool: ClipboardTool, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    try {
      const proc = spawn(tool.cmd, tool.args, { stdio: ["pipe", "ignore", "ignore"] });
      proc.on("close", (code) => done(code === 0));
      // Covers both a missing binary and an EPIPE from a process that died mid-write.
      proc.on("error", () => done(false));
      proc.stdin.on("error", () => done(false));
      proc.stdin.end(text);
    } catch {
      done(false);
    }
  });
}

/**
 * Copy via the terminal itself (OSC 52). This is the only thing that reaches the
 * *local* clipboard when awssesh runs over SSH, where no clipboard binary on the
 * remote host can help. Emitted as a last resort — many terminals ignore it, and
 * we cannot detect whether it landed, so it is reported as a best-effort success.
 */
function copyViaTerminal(text: string, out: NodeJS.WriteStream = process.stdout): boolean {
  if (!out.isTTY) return false;
  const payload = Buffer.from(text, "utf8").toString("base64");
  const ESC = "\u001B";
  const BEL = "\u0007";
  const osc52 = `${ESC}]52;c;${payload}${BEL}`;
  // tmux swallows unknown escapes, so it needs a DCS passthrough wrapper with
  // the inner ESCs doubled to reach the outer terminal.
  const sequence = process.env.TMUX
    ? `${ESC}Ptmux;${osc52.replaceAll(ESC, ESC + ESC)}${ESC}\\`
    : osc52;
  try {
    out.write(sequence);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy text to the clipboard, trying every mechanism available on this machine.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  for (const tool of clipboardTools()) {
    if (await pipeTo(tool, text)) return true;
  }
  return copyViaTerminal(text);
}

import { test, expect } from "bun:test";
import { clipboardTools } from "./utils.ts";

test("clipboardTools prefers wl-copy under Wayland and xclip under X11", () => {
  const wayland = clipboardTools("linux", { WAYLAND_DISPLAY: "wayland-0" } as NodeJS.ProcessEnv);
  expect(wayland[0]!.cmd).toBe("wl-copy");

  const x11 = clipboardTools("linux", { DISPLAY: ":0" } as NodeJS.ProcessEnv);
  expect(x11[0]!.cmd).toBe("xclip");

  // Both stacks stay available as fallbacks, plus WSL's clip.exe.
  const names = x11.map((t) => t.cmd);
  expect(names).toEqual(["xclip", "xsel", "wl-copy", "clip.exe"]);
});

test("clipboardTools uses the native tool on macOS and Windows", () => {
  expect(clipboardTools("darwin", {} as NodeJS.ProcessEnv)).toEqual([{ cmd: "pbcopy", args: [] }]);
  expect(clipboardTools("win32", {} as NodeJS.ProcessEnv)).toEqual([{ cmd: "clip", args: [] }]);
});

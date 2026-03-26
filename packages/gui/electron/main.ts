import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import { createInterface } from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let bunServer: ChildProcess | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Bun RPC Server — child process that handles AWS operations
// ─────────────────────────────────────────────────────────────────────────────

let rpcId = 0;
const pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function startBunServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverScript = isDev
      ? path.join(__dirname, "..", "electron", "server.ts")
      : path.join(__dirname, "server.js");

    const bunPath = process.env.BUN_PATH || "bun";
    bunServer = spawn(bunPath, ["run", serverScript], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: isDev ? path.join(__dirname, "..") : __dirname,
    });

    const rl = createInterface({ input: bunServer.stdout! });

    rl.on("line", (line: string) => {
      try {
        const msg = JSON.parse(line);

        // Ready signal
        if (msg.ready) {
          console.log("[bun-server] Ready");
          resolve();
          return;
        }

        // RPC response
        if (msg.id !== undefined) {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            pendingRequests.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      } catch {
        // ignore malformed lines
      }
    });

    bunServer.stderr?.on("data", (data: Buffer) => {
      console.error("[bun-server]", data.toString());
    });

    bunServer.on("exit", (code) => {
      console.log("[bun-server] Exited with code", code);
      bunServer = null;
    });

    bunServer.on("error", (err) => {
      console.error("[bun-server] Failed to start:", err.message);
      reject(err);
    });
  });
}

function rpcCall(method: string, ...params: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!bunServer?.stdin?.writable) {
      reject(new Error("Bun server not running"));
      return;
    }

    const id = ++rpcId;
    pendingRequests.set(id, { resolve, reject });

    const request = JSON.stringify({ id, method, params }) + "\n";
    bunServer.stdin.write(request);

    // Timeout after 5 minutes (SSO login can take a while)
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("RPC timeout"));
      }
    }, 300_000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Window
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0f0f13",
    show: false,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Handlers — proxy to Bun server
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle("discover-profiles", () => rpcCall("discover-profiles"));
ipcMain.handle("check-all-profiles", (_e, profiles) => rpcCall("check-all-profiles", profiles));
ipcMain.handle("check-token-status", (_e, profile) => rpcCall("check-token-status", profile));
ipcMain.handle("refresh-profile", (_e, profile) => rpcCall("refresh-profile", profile));
ipcMain.handle("start-device-auth", (_e, profile) => rpcCall("start-device-auth", profile));
ipcMain.handle("perform-sso-login", (_e, profile, deviceAuth) => rpcCall("perform-sso-login", profile, deviceAuth));
ipcMain.handle("load-settings", () => rpcCall("load-settings"));
ipcMain.handle("save-settings", (_e, settings) => rpcCall("save-settings", settings));
ipcMain.handle("send-notification", (_e, title, message) => rpcCall("send-notification", title, message));

ipcMain.handle("open-browser", (_e, url) => {
  shell.openExternal(url);
});

// ─────────────────────────────────────────────────────────────────────────────
// App Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startBunServer();
  } catch (err) {
    console.error("Failed to start Bun server:", err);
    app.quit();
    return;
  }

  createWindow();
});

app.on("window-all-closed", () => {
  bunServer?.kill();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  bunServer?.kill();
});

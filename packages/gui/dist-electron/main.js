// electron/main.ts
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createInterface } from "readline";
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = path.dirname(__filename2);
var isDev = !app.isPackaged;
var mainWindow = null;
var bunServer = null;
var rpcId = 0;
var pendingRequests = new Map;
function startBunServer() {
  return new Promise((resolve, reject) => {
    const serverScript = isDev ? path.join(__dirname2, "..", "electron", "server.ts") : path.join(__dirname2, "server.js");
    const bunPath = process.env.BUN_PATH || "bun";
    bunServer = spawn(bunPath, ["run", serverScript], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: isDev ? path.join(__dirname2, "..") : __dirname2
    });
    const rl = createInterface({ input: bunServer.stdout });
    rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.ready) {
          console.log("[bun-server] Ready");
          resolve();
          return;
        }
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
      } catch {}
    });
    bunServer.stderr?.on("data", (data) => {
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
function rpcCall(method, ...params) {
  return new Promise((resolve, reject) => {
    if (!bunServer?.stdin?.writable) {
      reject(new Error("Bun server not running"));
      return;
    }
    const id = ++rpcId;
    pendingRequests.set(id, { resolve, reject });
    const request = JSON.stringify({ id, method, params }) + `
`;
    bunServer.stdin.write(request);
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("RPC timeout"));
      }
    }, 300000);
  });
}
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
      preload: isDev ? path.join(__dirname2, "preload.js") : path.join(__dirname2, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173/");
  } else {
    mainWindow.loadFile(path.join(__dirname2, "../dist-renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
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

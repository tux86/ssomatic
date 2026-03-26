var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;

// electron/preload.ts
var exports_preload = {};
module.exports = __toCommonJS(exports_preload);
var import_electron = require("electron");
var api = {
  discoverProfiles: () => import_electron.ipcRenderer.invoke("discover-profiles"),
  checkAllProfiles: (profiles) => import_electron.ipcRenderer.invoke("check-all-profiles", profiles),
  checkTokenStatus: (profile) => import_electron.ipcRenderer.invoke("check-token-status", profile),
  refreshProfile: (profile) => import_electron.ipcRenderer.invoke("refresh-profile", profile),
  startDeviceAuth: (profile) => import_electron.ipcRenderer.invoke("start-device-auth", profile),
  performSSOLogin: (profile, deviceAuth) => import_electron.ipcRenderer.invoke("perform-sso-login", profile, deviceAuth),
  loadSettings: () => import_electron.ipcRenderer.invoke("load-settings"),
  saveSettings: (settings) => import_electron.ipcRenderer.invoke("save-settings", settings),
  openBrowser: (url) => import_electron.ipcRenderer.invoke("open-browser", url),
  sendNotification: (title, message) => import_electron.ipcRenderer.invoke("send-notification", title, message)
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", api);

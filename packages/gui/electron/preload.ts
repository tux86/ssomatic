import { contextBridge, ipcRenderer } from "electron";

import type {
  SSOProfile,
  DeviceAuthInfo,
  AppSettings,
} from "@toolbox/aws-creds/core";

export interface ElectronAPI {
  discoverProfiles: () => Promise<SSOProfile[]>;
  checkAllProfiles: (profiles: SSOProfile[]) => Promise<Array<{
    profile: SSOProfile;
    status: "valid" | "expired" | "error" | "unknown";
    expiresAt: string | null;
  }>>;
  checkTokenStatus: (profile: SSOProfile) => Promise<{
    profile: SSOProfile;
    status: "valid" | "expired" | "error" | "unknown";
    expiresAt: string | null;
  }>;
  refreshProfile: (profile: SSOProfile) => Promise<{
    success: boolean;
    error?: string;
    needsLogin?: boolean;
  }>;
  startDeviceAuth: (profile: SSOProfile) => Promise<(DeviceAuthInfo & { expiresAt: string }) | null>;
  performSSOLogin: (profile: SSOProfile, deviceAuth: DeviceAuthInfo) => Promise<{
    success: boolean;
    error?: string;
  }>;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  openBrowser: (url: string) => Promise<void>;
  sendNotification: (title: string, message: string) => Promise<void>;
}

const api: ElectronAPI = {
  discoverProfiles: () => ipcRenderer.invoke("discover-profiles"),
  checkAllProfiles: (profiles) => ipcRenderer.invoke("check-all-profiles", profiles),
  checkTokenStatus: (profile) => ipcRenderer.invoke("check-token-status", profile),
  refreshProfile: (profile) => ipcRenderer.invoke("refresh-profile", profile),
  startDeviceAuth: (profile) => ipcRenderer.invoke("start-device-auth", profile),
  performSSOLogin: (profile, deviceAuth) => ipcRenderer.invoke("perform-sso-login", profile, deviceAuth),
  loadSettings: () => ipcRenderer.invoke("load-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  openBrowser: (url) => ipcRenderer.invoke("open-browser", url),
  sendNotification: (title, message) => ipcRenderer.invoke("send-notification", title, message),
};

contextBridge.exposeInMainWorld("electronAPI", api);

/**
 * Type-safe wrapper around Electron IPC API.
 * Types are duplicated here to avoid importing from backend modules
 * that Vite can't resolve (they use Bun APIs / Electron).
 */

// ─── Types (mirrored from @toolbox/aws-creds/core) ─────────────────────────

export interface SSOProfile {
  name: string;
  ssoStartUrl: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoRegion: string;
  region?: string;
  ssoSession?: string;
}

export type CredentialStatus = "valid" | "expired" | "error" | "unknown";

export interface ProfileStatus {
  profile: SSOProfile;
  status: CredentialStatus;
  expiresAt?: string | null;
}

export interface DeviceAuthInfo {
  verificationUri: string;
  userCode: string;
  deviceCode: string;
  clientId: string;
  clientSecret: string;
  expiresAt: string | Date;
  interval: number;
}

export interface AppSettings {
  notifications: boolean;
  defaultInterval: number;
  favoriteProfiles: string[];
  lastRefresh?: string;
}

// ─── Electron API interface ─────────────────────────────────────────────────

export interface ElectronAPI {
  discoverProfiles: () => Promise<SSOProfile[]>;
  checkAllProfiles: (profiles: SSOProfile[]) => Promise<ProfileStatus[]>;
  checkTokenStatus: (profile: SSOProfile) => Promise<ProfileStatus>;
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

// ─── Global augmentation ────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

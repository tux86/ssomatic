/**
 * Fetch-based API client for the SSOmatic web server.
 */

// ─── Types (mirrored from src/aws/sso.ts) ────────────────────────────────

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
  webServer: boolean;
  webPort: number;
  lastRefresh?: string;
}

// ─── RPC client ─────────────────────────────────────────────────────────────

async function rpc<T>(method: string, ...params: unknown[]): Promise<T> {
  const res = await fetch("/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result as T;
}

// ─── Typed API ──────────────────────────────────────────────────────────────

export const api = {
  discoverProfiles: () => rpc<SSOProfile[]>("discover-profiles"),

  checkAllProfiles: (profiles: SSOProfile[]) =>
    rpc<ProfileStatus[]>("check-all-profiles", profiles),

  checkTokenStatus: (profile: SSOProfile) =>
    rpc<ProfileStatus>("check-token-status", profile),

  refreshProfile: (profile: SSOProfile) =>
    rpc<{ success: boolean; error?: string; needsLogin?: boolean }>("refresh-profile", profile),

  startDeviceAuth: (profile: SSOProfile) =>
    rpc<(DeviceAuthInfo & { expiresAt: string }) | null>("start-device-auth", profile),

  performSSOLogin: (profile: SSOProfile, deviceAuth: DeviceAuthInfo) =>
    rpc<{ success: boolean; error?: string }>("perform-sso-login", profile, deviceAuth),

  loadSettings: () => rpc<AppSettings>("load-settings"),

  saveSettings: (settings: AppSettings) => rpc<void>("save-settings", settings),

  openBrowser: (url: string) => {
    window.open(url, "_blank");
  },

  sendNotification: (title: string, message: string) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body: message });
      });
    }
  },
};

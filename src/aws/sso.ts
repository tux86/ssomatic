/**
 * awssesh - Core business logic (UI-agnostic)
 * Used by the CLI (Ink) interface
 */

import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
} from "@aws-sdk/client-sso-oidc";
import { SSOClient, GetRoleCredentialsCommand } from "@aws-sdk/client-sso";
import { parse as parseIni } from "ini";
import { parseCredentials, upsertProfile } from "./credentialsFile.js";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SSOProfile {
  name: string;
  ssoStartUrl: string;
  ssoAccountId: string;
  ssoRoleName: string;
  ssoRegion: string;
  region?: string;
  ssoSession?: string;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
}

export interface DeviceAuthInfo {
  verificationUri: string;
  userCode: string;
  deviceCode: string;
  clientId: string;
  clientSecret: string;
  expiresAt: Date;
  interval: number;
}

export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
}

interface ConfigSection {
  [key: string]: string | undefined;
}

interface ParsedConfig {
  [section: string]: ConfigSection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AWS config locations, resolved per call rather than captured at import time.
 * Reading `HOME` once at module load froze the paths for the life of the
 * process, which silently ignored a later `HOME` change (and made the module
 * impossible to sandbox in tests).
 */
export function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "";
}
export function awsDir(): string {
  return `${homeDir()}/.aws`;
}
export function configPath(): string {
  return `${awsDir()}/config`;
}
export function credentialsPath(): string {
  return `${awsDir()}/credentials`;
}
export function ssoCacheDir(): string {
  return `${awsDir()}/sso/cache`;
}

/**
 * Demo recording mode. When `AWSSESH_DEMO` is set, the interactive SSO network
 * calls are stubbed with canned values so the README demo GIF (scripts/demo/)
 * can show the device-login screen and the silent auto-refresh using mock data,
 * fully offline. Inert for real users — has no effect unless the env var is set.
 */
const DEMO = !!process.env.AWSSESH_DEMO;

// ─────────────────────────────────────────────────────────────────────────────
// File Utilities
// ─────────────────────────────────────────────────────────────────────────────

export async function parseIniFile(path: string): Promise<ParsedConfig> {
  try {
    const content = await readFile(path, "utf8");
    return parseIni(content);
  } catch {
    return {};
  }
}

/**
 * Key used to persist when the role credentials stop working.
 *
 * The AWS parsers ignore keys they do not recognise, and `x_security_token_expires`
 * is the de-facto name other SSO helpers (aws-vault, granted) already use for
 * exactly this. Without it awssesh had no way to tell live credentials from
 * hour-old dead ones, so it happily copied expired keys to the clipboard and
 * reported success.
 */
export const EXPIRY_KEY = "x_security_token_expires";

export async function writeCredentials(profileName: string, credentials: AWSCredentials): Promise<void> {
  const existing = await readFile(credentialsPath(), "utf8").catch(() => "");

  const next = upsertProfile(existing, profileName, {
    aws_access_key_id: credentials.accessKeyId,
    aws_secret_access_key: credentials.secretAccessKey,
    ...(credentials.sessionToken && { aws_session_token: credentials.sessionToken }),
    ...(credentials.expiration && { [EXPIRY_KEY]: credentials.expiration.toISOString() }),
  });

  await mkdir(awsDir(), { recursive: true });
  await writeFile(credentialsPath(), next, { mode: 0o600 });
  // `mode` only applies when the file is created, so enforce it on every write:
  // these are live session credentials and must not be world-readable.
  await chmod(credentialsPath(), 0o600).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// SSO Cache
// ─────────────────────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

export async function findCachedToken(profile: SSOProfile): Promise<CachedToken | null> {
  try {
    const cacheKey = profile.ssoSession ?? profile.ssoStartUrl;
    const hash = createHash("sha1").update(cacheKey).digest("hex");
    const cacheFile = `${ssoCacheDir()}/${hash}.json`;

    const content = JSON.parse(await readFile(cacheFile, "utf8"));
    if (content.accessToken && content.expiresAt) {
      return {
        accessToken: content.accessToken,
        expiresAt: new Date(content.expiresAt),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function discoverProfiles(): Promise<SSOProfile[]> {
  const config = await parseIniFile(configPath());
  const profiles: SSOProfile[] = [];
  const ssoSessions: Map<string, ConfigSection> = new Map();

  for (const [section, values] of Object.entries(config)) {
    if (section.startsWith("sso-session ")) {
      ssoSessions.set(section.replace("sso-session ", ""), values);
    }
  }

  for (const [section, values] of Object.entries(config)) {
    if (!section.startsWith("profile ") && section !== "default") continue;

    const profileName = section === "default" ? "default" : section.replace("profile ", "");

    if (values.sso_session) {
      const session = ssoSessions.get(values.sso_session);
      if (session && values.sso_account_id && values.sso_role_name) {
        profiles.push({
          name: profileName,
          ssoStartUrl: session.sso_start_url || "",
          ssoAccountId: values.sso_account_id,
          ssoRoleName: values.sso_role_name,
          ssoRegion: session.sso_region || "us-east-1",
          region: values.region,
          ssoSession: values.sso_session,
        });
      }
    } else if (values.sso_start_url && values.sso_account_id && values.sso_role_name) {
      profiles.push({
        name: profileName,
        ssoStartUrl: values.sso_start_url,
        ssoAccountId: values.sso_account_id,
        ssoRoleName: values.sso_role_name,
        ssoRegion: values.sso_region || "us-east-1",
        region: values.region,
      });
    }
  }

  return profiles;
}



// ─────────────────────────────────────────────────────────────────────────────
// SSO OIDC Device Authorization Flow
// ─────────────────────────────────────────────────────────────────────────────

export async function startDeviceAuthorization(profile: SSOProfile): Promise<DeviceAuthInfo | null> {
  if (DEMO) {
    // Mirror the shape AWS actually returns for `verificationUriComplete` —
    // a long portal URL with the code embedded — so the demo exercises the
    // same wrapping the real login screen has to survive.
    return {
      verificationUri: `${profile.ssoStartUrl.replace(/\/$/, "")}/#/device?user_code=BRWS-DEMO`,
      userCode: "BRWS-DEMO",
      deviceCode: "demo-device-code",
      clientId: "demo-client",
      clientSecret: "demo-secret",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      interval: 5,
    };
  }
  try {
    const client = new SSOOIDCClient({ region: profile.ssoRegion });

    const registerResponse = await client.send(
      new RegisterClientCommand({
        clientName: "awssesh",
        clientType: "public",
      })
    );

    if (!registerResponse.clientId || !registerResponse.clientSecret) {
      return null;
    }

    const authResponse = await client.send(
      new StartDeviceAuthorizationCommand({
        clientId: registerResponse.clientId,
        clientSecret: registerResponse.clientSecret,
        startUrl: profile.ssoStartUrl,
      })
    );

    if (!authResponse.verificationUriComplete || !authResponse.deviceCode || !authResponse.userCode) {
      return null;
    }

    return {
      verificationUri: authResponse.verificationUriComplete,
      userCode: authResponse.userCode,
      deviceCode: authResponse.deviceCode,
      clientId: registerResponse.clientId,
      clientSecret: registerResponse.clientSecret,
      expiresAt: new Date(Date.now() + (authResponse.expiresIn || 600) * 1000),
      interval: authResponse.interval || 5,
    };
  } catch {
    return null;
  }
}

export async function saveSSOTokenToCache(profile: SSOProfile, tokenInfo: TokenInfo): Promise<void> {
  try {
    await mkdir(ssoCacheDir(), { recursive: true });

    const cacheKey = profile.ssoSession ?? profile.ssoStartUrl;
    const hash = createHash("sha1").update(cacheKey).digest("hex");
    const cacheFile = `${ssoCacheDir()}/${hash}.json`;

    const cacheData = {
      startUrl: profile.ssoStartUrl,
      region: profile.ssoRegion,
      accessToken: tokenInfo.accessToken,
      expiresAt: tokenInfo.expiresAt.toISOString(),
    };

    await writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    await chmod(cacheFile, 0o600);
  } catch {
    // Silently fail - credentials will still work via credentials file
  }
}

export async function pollForToken(
  profile: SSOProfile,
  deviceAuth: DeviceAuthInfo
): Promise<TokenInfo | null> {
  if (DEMO) {
    // Stay pending: the recording shows the URL/code screen, then Esc cancels.
    return new Promise<TokenInfo | null>(() => {
      /* never resolves in demo mode */
    });
  }
  const client = new SSOOIDCClient({ region: profile.ssoRegion });
  const startTime = Date.now();
  const maxWaitMs = deviceAuth.expiresAt.getTime() - Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const tokenResponse = await client.send(
        new CreateTokenCommand({
          clientId: deviceAuth.clientId,
          clientSecret: deviceAuth.clientSecret,
          grantType: "urn:ietf:params:oauth:grant-type:device_code",
          deviceCode: deviceAuth.deviceCode,
        })
      );

      if (tokenResponse.accessToken) {
        const expiresAt = new Date(Date.now() + (tokenResponse.expiresIn || 28800) * 1000);
        return { accessToken: tokenResponse.accessToken, expiresAt };
      }
    } catch (error) {
      const errName = error instanceof Error ? error.name : "";
      if (errName === "AuthorizationPendingException") {
        await new Promise((resolve) => setTimeout(resolve, deviceAuth.interval * 1000));
        continue;
      }
      if (errName === "SlowDownException") {
        await new Promise((resolve) => setTimeout(resolve, (deviceAuth.interval + 5) * 1000));
        continue;
      }
      if (errName === "ExpiredTokenException" || errName === "AccessDeniedException") {
        return null;
      }
      return null;
    }
  }
  return null;
}

/**
 * Why a credential fetch failed. `expired-token` is the only outcome that an
 * interactive browser login can actually fix — the rest used to be lumped in
 * with it, so a network blip or a missing role grant told the user "needs
 * login" and marched them through a pointless SSO flow that then failed again.
 */
export type CredentialsFailure = "expired-token" | "denied" | "unavailable";

export interface CredentialsResult {
  credentials?: AWSCredentials;
  failure?: CredentialsFailure;
  error?: string;
}

/** AWS SSO error names that genuinely mean "your cached token is no longer good". */
const TOKEN_ERRORS = new Set(["UnauthorizedException", "ExpiredTokenException", "AccessDeniedException"]);
/** Errors about the role/account, not the token — logging in again changes nothing. */
const ACCESS_ERRORS = new Set(["ForbiddenException", "ResourceNotFoundException"]);

/** Classify a GetRoleCredentials failure. Pure, so the routing is unit-testable. */
export function classifyCredentialsError(error: unknown, profile: SSOProfile): CredentialsResult {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (TOKEN_ERRORS.has(name)) return { failure: "expired-token", error: message };
  if (ACCESS_ERRORS.has(name)) {
    return {
      failure: "denied",
      error: `no access to ${profile.ssoRoleName} in ${profile.ssoAccountId}`,
    };
  }
  return { failure: "unavailable", error: message || "could not reach AWS SSO" };
}

export async function getCredentialsWithToken(
  profile: SSOProfile,
  accessToken: string
): Promise<CredentialsResult> {
  try {
    const client = new SSOClient({ region: profile.ssoRegion });
    const response = await client.send(
      new GetRoleCredentialsCommand({
        accountId: profile.ssoAccountId,
        roleName: profile.ssoRoleName,
        accessToken,
      })
    );

    const role = response.roleCredentials;
    if (!role?.accessKeyId || !role.secretAccessKey) {
      return { failure: "unavailable", error: "AWS returned no role credentials" };
    }

    return {
      credentials: {
        accessKeyId: role.accessKeyId,
        secretAccessKey: role.secretAccessKey,
        sessionToken: role.sessionToken,
        expiration: role.expiration ? new Date(role.expiration) : undefined,
      },
    };
  } catch (error) {
    return classifyCredentialsError(error, profile);
  }
}

export function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore" }).on("error", () => {});
}

export async function performSSOLoginFlow(
  profile: SSOProfile,
  deviceAuth: DeviceAuthInfo
): Promise<{ success: boolean; error?: string }> {
  const tokenInfo = await pollForToken(profile, deviceAuth);
  if (!tokenInfo) {
    return { success: false, error: "Authorization failed or timed out" };
  }

  await saveSSOTokenToCache(profile, tokenInfo);

  const result = await getCredentialsWithToken(profile, tokenInfo.accessToken);
  if (!result.credentials) {
    return { success: false, error: result.error ?? "Failed to get credentials" };
  }
  await writeCredentials(profile.name, result.credentials);
  return { success: true };
}

export async function refreshProfile(
  profile: SSOProfile
): Promise<{ success: boolean; error?: string; needsLogin?: boolean; expiresAt?: Date }> {
  const cachedToken = await findCachedToken(profile);
  if (!cachedToken || cachedToken.expiresAt <= new Date()) {
    return { success: false, needsLogin: true };
  }

  if (DEMO) {
    // Pretend the silent refresh succeeded so the auto-refresh tick stays
    // offline and the ⟳ favorites keep their valid state during recording.
    return { success: true, expiresAt: new Date(Date.now() + 50 * 60 * 1000) };
  }

  const result = await getCredentialsWithToken(profile, cachedToken.accessToken);
  if (!result.credentials) {
    // Only an actually-rejected token warrants sending the user to a browser.
    if (result.failure === "expired-token") return { success: false, needsLogin: true };
    return { success: false, error: result.error ?? "could not fetch credentials" };
  }

  await writeCredentials(profile.name, result.credentials);
  return { success: true, expiresAt: result.credentials.expiration };
}

export interface StoredCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  /** When these credentials stop working, if awssesh wrote them. */
  expiresAt: Date | null;
}

export function readProfileCredentials(profileName: string): StoredCredentials | null {
  try {
    const content = readFileSync(credentialsPath(), "utf8");
    const section = parseCredentials(content)[profileName];
    if (!section) return null;
    const accessKeyId = section.aws_access_key_id;
    const secretAccessKey = section.aws_secret_access_key;
    const sessionToken = section.aws_session_token;
    if (!accessKeyId || !secretAccessKey || !sessionToken) return null;

    // Absent for credentials written by an older awssesh or by another tool;
    // callers treat an unknown expiry as "assume stale and re-fetch".
    const raw = section[EXPIRY_KEY];
    const parsed = raw ? new Date(raw) : null;
    const expiresAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

    return { accessKeyId, secretAccessKey, sessionToken, expiresAt };
  } catch {
    return null;
  }
}

/** Whether stored credentials are usable for at least `leadMs` longer. */
export function credentialsAreFresh(
  creds: StoredCredentials | null,
  leadMs = 60_000,
  now: number = Date.now(),
): boolean {
  if (!creds) return false;
  if (!creds.expiresAt) return false; // unknown expiry — never trust it
  return creds.expiresAt.getTime() - now > leadMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNotification(title: string, message: string): Promise<void> {
  const os = process.platform;
  try {
    if (os === "darwin") {
      // Both values are interpolated into an AppleScript string literal, so
      // backslashes and quotes must be escaped or a profile name containing
      // either would break (or inject into) the script.
      const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      spawn("osascript", [
        "-e",
        `display notification "${esc(message)}" with title "${esc(title)}"`,
      ], { stdio: "ignore" }).on("error", () => {});
    } else if (os === "linux") {
      spawn("notify-send", [title, message], { stdio: "ignore" }).on("error", () => {});
    }
  } catch {
    // Silently fail
  }
}

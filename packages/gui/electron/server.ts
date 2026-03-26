#!/usr/bin/env bun
/**
 * Bun IPC server — runs as a child process of Electron.
 * Receives JSON-RPC requests via stdin, sends responses via stdout.
 * This allows using Bun APIs (Bun.file, Bun.write, Bun.spawn)
 * which aren't available in Electron's Node.js runtime.
 */

import {
  discoverProfiles,
  checkAllProfiles,
  checkTokenStatus,
  refreshProfile,
  startDeviceAuthorization,
  performSSOLoginFlow,
  loadSettings,
  saveSettings,
  sendNotification,
  type SSOProfile,
  type DeviceAuthInfo,
  type AppSettings,
} from "@toolbox/aws-creds/core";

interface RpcRequest {
  id: number;
  method: string;
  params: unknown[];
}

interface RpcResponse {
  id: number;
  result?: unknown;
  error?: string;
}

// Method handlers
const methods: Record<string, (...args: unknown[]) => Promise<unknown>> = {
  "discover-profiles": async () => {
    return await discoverProfiles();
  },

  "check-all-profiles": async (profiles: unknown) => {
    const statuses = await checkAllProfiles(profiles as SSOProfile[]);
    return statuses.map((s) => ({
      ...s,
      expiresAt: s.expiresAt?.toISOString() ?? null,
    }));
  },

  "check-token-status": async (profile: unknown) => {
    const status = await checkTokenStatus(profile as SSOProfile);
    return {
      ...status,
      expiresAt: status.expiresAt?.toISOString() ?? null,
    };
  },

  "refresh-profile": async (profile: unknown) => {
    return await refreshProfile(profile as SSOProfile);
  },

  "start-device-auth": async (profile: unknown) => {
    const auth = await startDeviceAuthorization(profile as SSOProfile);
    if (!auth) return null;
    return { ...auth, expiresAt: auth.expiresAt.toISOString() };
  },

  "perform-sso-login": async (profile: unknown, deviceAuth: unknown) => {
    const auth = deviceAuth as DeviceAuthInfo & { expiresAt: string };
    return await performSSOLoginFlow(profile as SSOProfile, {
      ...auth,
      expiresAt: new Date(auth.expiresAt),
    });
  },

  "load-settings": async () => {
    return await loadSettings();
  },

  "save-settings": async (settings: unknown) => {
    await saveSettings(settings as AppSettings);
    return { ok: true };
  },

  "send-notification": async (title: unknown, message: unknown) => {
    await sendNotification(title as string, message as string);
    return { ok: true };
  },
};

// Read JSON-RPC from stdin, line-delimited
const decoder = new TextDecoder();

async function processLine(line: string) {
  if (!line.trim()) return;

  let req: RpcRequest;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const response: RpcResponse = { id: req.id };

  try {
    const handler = methods[req.method];
    if (!handler) {
      response.error = `Unknown method: ${req.method}`;
    } else {
      response.result = await handler(...(req.params || []));
    }
  } catch (err) {
    response.error = err instanceof Error ? err.message : String(err);
  }

  // Write response as a single line to stdout
  process.stdout.write(JSON.stringify(response) + "\n");
}

// Signal ready
process.stdout.write(JSON.stringify({ ready: true }) + "\n");

// Read stdin line by line
const reader = Bun.stdin.stream().getReader();
let buffer = "";

async function readLoop() {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      processLine(line);
    }
  }
}

readLoop().catch(() => process.exit(0));

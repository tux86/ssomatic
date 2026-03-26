/**
 * SSOmatic Web Server — Bun HTTP API + static file server.
 * Exposes core functions via a single POST /rpc endpoint.
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
} from "../aws/sso.js";
import { VERSION, checkForUpdate } from "../version.js";
import { ASSETS } from "./assets.generated.js";

const DEFAULT_PORT = 9876;

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

  "get-version": async () => {
    const latest = await checkForUpdate();
    return { current: VERSION, latest };
  },
};

let server: ReturnType<typeof Bun.serve> | null = null;

export function startServer(port?: number): string | null {
  if (server) return `http://127.0.0.1:${server.port}`;

  const resolvedPort = port ?? parseInt(process.env.SSOMATIC_PORT || String(DEFAULT_PORT));

  try {
    server = Bun.serve({
    port: resolvedPort,
    hostname: "127.0.0.1",

    async fetch(req) {
      const url = new URL(req.url);

      // RPC endpoint
      if (url.pathname === "/rpc" && req.method === "POST") {
        const body = (await req.json()) as { method: string; params?: unknown[] };
        const handler = methods[body.method];
        if (!handler) {
          return Response.json({ error: `Unknown method: ${body.method}` }, { status: 400 });
        }
        try {
          const result = await handler(...(body.params || []));
          return Response.json({ result });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
          );
        }
      }

      // Serve embedded web assets
      const asset = ASSETS.get(url.pathname) ?? ASSETS.get("/");
      if (asset) {
        return new Response(asset.content, {
          headers: { "Content-Type": asset.contentType },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
    });

    return `http://127.0.0.1:${server.port}`;
  } catch {
    server = null;
    return null;
  }
}

export function stopServer(): void {
  if (server) {
    server.stop();
    server = null;
  }
}

export function isServerRunning(): boolean {
  return server !== null;
}

import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let TMP: string;
let sso: typeof import("./sso.ts");

beforeAll(async () => {
  TMP = await mkdtemp(join(tmpdir(), "awssesh-test-"));
  process.env.HOME = TMP;
  process.env.USERPROFILE = TMP;
  sso = await import("./sso.ts");
  await mkdir(join(TMP, ".aws"), { recursive: true });
});

afterAll(async () => {
  await rm(TMP, { recursive: true, force: true });
});

const DEV = {
  name: "dev",
  ssoStartUrl: "https://example.awsapps.com/start",
  ssoAccountId: "111111111111",
  ssoRoleName: "Developer",
  ssoRegion: "us-east-1",
};

test("discoverProfiles parses sso-session and inline profiles", async () => {
  await writeFile(
    join(TMP, ".aws", "config"),
    [
      "[sso-session my-sso]",
      "sso_start_url = https://example.awsapps.com/start",
      "sso_region = us-east-1",
      "",
      "[profile dev]",
      "sso_session = my-sso",
      "sso_account_id = 111111111111",
      "sso_role_name = Developer",
      "region = eu-west-1",
      "",
      "[profile legacy]",
      "sso_start_url = https://legacy.awsapps.com/start",
      "sso_region = us-west-2",
      "sso_account_id = 222222222222",
      "sso_role_name = Admin",
      "",
    ].join("\n"),
  );

  const profiles = await sso.discoverProfiles();
  expect(profiles).toHaveLength(2);

  const dev = profiles.find((p) => p.name === "dev")!;
  expect(dev.ssoStartUrl).toBe("https://example.awsapps.com/start");
  expect(dev.ssoAccountId).toBe("111111111111");
  expect(dev.ssoRegion).toBe("us-east-1");
  expect(dev.ssoSession).toBe("my-sso");

  const legacy = profiles.find((p) => p.name === "legacy")!;
  expect(legacy.ssoRoleName).toBe("Admin");
  expect(legacy.ssoRegion).toBe("us-west-2");
});

test("saveSettings / loadSettings round-trip", async () => {
  const { saveSettings, loadSettings } = await import("./settings");
  saveSettings({ notifications: false, refreshLeadMinutes: 30, favoriteProfiles: ["dev"] });
  const loaded = loadSettings();
  expect(loaded.notifications).toBe(false);
  expect(loaded.refreshLeadMinutes).toBe(30);
  expect(loaded.favoriteProfiles).toEqual(["dev"]);
});

test("token cache round-trips through disk", async () => {
  const future = new Date(Date.now() + 3_600_000);
  await sso.saveSSOTokenToCache(DEV, { accessToken: "tok-123", expiresAt: future });

  const cached = await sso.findCachedToken(DEV);
  expect(cached?.accessToken).toBe("tok-123");
  expect(cached?.expiresAt.getTime()).toBe(future.getTime());
});

test("findCachedToken returns null when no token has been cached", async () => {
  const unknown = { ...DEV, ssoSession: "never-logged-in" };
  expect(await sso.findCachedToken(unknown)).toBeNull();
});


test("only a rejected token routes the user to an interactive login", () => {
  const named = (name: string) => Object.assign(new Error("boom"), { name });

  expect(sso.classifyCredentialsError(named("UnauthorizedException"), DEV).failure).toBe("expired-token");
  expect(sso.classifyCredentialsError(named("ExpiredTokenException"), DEV).failure).toBe("expired-token");

  // A transient network fault must NOT send the user through a browser login
  // it cannot fix.
  expect(sso.classifyCredentialsError(named("TimeoutError"), DEV).failure).toBe("unavailable");
  expect(sso.classifyCredentialsError(named("TooManyRequestsException"), DEV).failure).toBe("unavailable");

  // Neither must a role the user simply is not entitled to.
  const denied = sso.classifyCredentialsError(named("ForbiddenException"), DEV);
  expect(denied.failure).toBe("denied");
  expect(denied.error).toContain(DEV.ssoRoleName);
});

test("classifyCredentialsError copes with a non-Error throw", () => {
  expect(sso.classifyCredentialsError("just a string", DEV).failure).toBe("unavailable");
});

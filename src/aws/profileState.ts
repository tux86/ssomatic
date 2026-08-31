import { discoverProfiles, findCachedToken, readProfileCredentials, type SSOProfile } from "./sso.js";
import { loadSettings } from "./settings.js";

export type ProfileStatusKind = "valid" | "expired" | "needs-login" | "error" | "refreshing";

export interface ProfileState {
  name: string;
  status: ProfileStatusKind;
  /**
   * When the thing that expires next runs out: the role credentials if awssesh
   * knows their expiry, otherwise the SSO token. ISO string, or null.
   */
  expiresAt: string | null;
  /** SSO token expiry — when the next interactive browser login is due. */
  ssoExpiresAt: string | null;
  favorite: boolean;
  accountId?: string;
  error?: string;
}

/**
 * Derive one profile's state from what is on disk.
 *
 * Single source of truth for both the initial load and the auto-refresh tick.
 * They used to compute `expiresAt` differently — the tick from an in-memory map
 * of role-credential expiries, the reload from the SSO token — so every refresh
 * made the countdown jump from "58m" up to the token's "7h 58m" until the next
 * tick corrected it.
 */
export async function buildProfileState(profile: SSOProfile, favorite: boolean, now: Date): Promise<ProfileState> {
  const cachedToken = await findCachedToken(profile);
  const ssoValid = cachedToken !== null && cachedToken.expiresAt > now;
  const credsExpireAt = readProfileCredentials(profile.name)?.expiresAt ?? null;
  const ssoExpiresAt = cachedToken ? cachedToken.expiresAt.toISOString() : null;

  return {
    name: profile.name,
    status: ssoValid ? "valid" : "needs-login",
    expiresAt: credsExpireAt ? credsExpireAt.toISOString() : ssoExpiresAt,
    ssoExpiresAt,
    favorite,
    accountId: profile.ssoAccountId,
  };
}

/**
 * Build the list of profile states from local disk (config, SSO token cache and
 * the credentials file). Shared by the CLI `status` command and the TUI root so
 * there is a single source of truth for the locally-derived view.
 */
export async function buildLocalProfileStates(): Promise<ProfileState[]> {
  const favorites = new Set(loadSettings().favoriteProfiles);
  const now = new Date();
  const profiles = await discoverProfiles();
  return Promise.all(profiles.map((p) => buildProfileState(p, favorites.has(p.name), now)));
}

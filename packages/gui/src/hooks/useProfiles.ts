import { useState, useEffect, useCallback } from "react";
import type { SSOProfile, CredentialStatus } from "../lib/api";

export interface ProfileStatusUI {
  profile: SSOProfile;
  status: CredentialStatus;
  expiresAt: Date | null;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<SSOProfile[]>([]);
  const [statuses, setStatuses] = useState<ProfileStatusUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.discoverProfiles();
      setProfiles(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover profiles");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatuses = useCallback(
    async (profs?: SSOProfile[]) => {
      const toCheck = profs ?? profiles;
      if (toCheck.length === 0) return;
      setLoading(true);
      try {
        const raw = await window.electronAPI.checkAllProfiles(toCheck);
        setStatuses(
          raw.map((s) => ({
            profile: s.profile,
            status: s.status,
            expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check statuses");
      } finally {
        setLoading(false);
      }
    },
    [profiles]
  );

  useEffect(() => {
    fetchProfiles().then((profs) => {
      if (profs.length > 0) {
        window.electronAPI.checkAllProfiles(profs).then((raw) => {
          setStatuses(
            raw.map((s) => ({
              profile: s.profile,
              status: s.status,
              expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
            }))
          );
        });
      }
    });
  }, [fetchProfiles]);

  return { profiles, statuses, loading, error, fetchProfiles, fetchStatuses };
}

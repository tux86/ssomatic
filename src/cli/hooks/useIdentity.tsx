import { useState, useEffect } from "react";
import { getAwsEnv, getCallerIdentity, parseIdentityArn } from "../../aws/aws.js";

export interface AwsIdentity {
  accountId: string;
  profile: string;
  region: string;
  role: string;
  arn: string;
}

export interface UseIdentityResult {
  identity: AwsIdentity | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIdentity(): UseIdentityResult {
  const [identity, setIdentity] = useState<AwsIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => setRefreshCount((c) => c + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchIdentity() {
      setLoading(true);
      setError(null);

      try {
        const env = getAwsEnv();
        const caller = await getCallerIdentity();

        if (cancelled) return;

        const parsed = parseIdentityArn(caller.arn);

        setIdentity({
          accountId: caller.accountId,
          profile: env.profile || "default",
          region: env.region || "us-east-1",
          role: parsed.name,
          arn: caller.arn,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to get identity");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchIdentity();

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  return { identity, loading, error, refresh };
}

import { useEffect, useState } from "react";

/**
 * A clock that re-renders on an interval, so relative times ("4m", "expires in
 * 9m 12s") count down live instead of freezing until the next data refresh.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

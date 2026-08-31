import { useCallback, useEffect, useRef, useState } from "react";

export type MessageTone = "info" | "success" | "error";

export interface TransientMessage {
  text: string;
  tone: MessageTone;
}

export interface UseTransientMessage {
  message: TransientMessage | null;
  /** Show a message that clears itself after `durationMs`. */
  notify: (text: string, tone?: MessageTone) => void;
  /** Show a message that stays until replaced — for work still in flight. */
  hold: (text: string, tone?: MessageTone) => void;
  clear: () => void;
}

/**
 * Status-line messages that expire on their own.
 *
 * Previously the status line kept whatever it was last given forever, so a
 * stale "Refreshing prod…" or a one-off error stayed on screen for the rest of
 * the session and read as current state.
 */
export function useTransientMessage(durationMs = 4000): UseTransientMessage {
  const [message, setMessage] = useState<TransientMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const hold = useCallback(
    (text: string, tone: MessageTone = "info") => {
      stopTimer();
      setMessage({ text, tone });
    },
    [stopTimer],
  );

  const notify = useCallback(
    (text: string, tone: MessageTone = "info") => {
      hold(text, tone);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [hold, durationMs],
  );

  const clear = useCallback(() => {
    stopTimer();
    setMessage(null);
  }, [stopTimer]);

  return { message, notify, hold, clear };
}

import { useCallback, useState } from 'react';

/** Manages a single ephemeral toast message, auto-dismissed after `durationMs`. */
export function useToast(durationMs = 4000) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback(
    (text: string) => {
      setMessage(text);
      setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs],
  );

  return { message, showToast };
}

"use client";

import { useEffect, useState } from "react";

/**
 * Live wall clock that appears after mount so SSR markup stays stable.
 * Re-renders every 30 seconds; the initial tick fires on a timeout so no
 * synchronous state updates run inside the effect.
 */
export function useLiveClock(intervalMs = 30_000) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}

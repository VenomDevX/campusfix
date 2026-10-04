"use client";

import { useCallback, useEffect, useState } from "react";

/** Load data on mount and refresh every `ms` so the dashboard stays live during the demo. */
export function usePoll<T>(load: () => Promise<T>, ms = 10000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => load().then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message)), []);
  useEffect(() => {
    run();
    const t = setInterval(run, ms);
    return () => clearInterval(t);
  }, [run, ms]);
  return { data, error, reload: run };
}

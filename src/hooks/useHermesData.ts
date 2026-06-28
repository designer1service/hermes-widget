import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { HermesMetrics } from "@/types/metrics";

const POLL_INTERVAL_MS = 5000;

export interface UseHermesDataResult {
  metrics: HermesMetrics | null;
  isLoading: boolean;
  error: string | null;
}

export function useHermesData(): UseHermesDataResult {
  const [metrics, setMetrics] = useState<HermesMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const tick = async () => {
      try {
        const next = await invoke<HermesMetrics>("get_hermes_metrics");
        if (!active) return;
        setMetrics(next);
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return { metrics, isLoading, error };
}

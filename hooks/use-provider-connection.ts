"use client";
import { useEffect, useState } from "react";
import { supportsTemperature, type Settings } from "@/lib/settings";
import type { ProviderInfo } from "@/lib/providers";

export function useProviderConnection(settings: Settings, key: string, enabled: boolean) {
  const { provider, model } = settings;
  const [result, setResult] = useState<{ provider: string; model: string; key: string; info: ProviderInfo } | null>(null);
  const needsKey = provider !== "ollama" && !key.trim();
  const current = result?.provider === provider && result.model === model && result.key === key ? result.info : null;
  useEffect(() => {
    if (!enabled || !model.trim() || needsKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/provider", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, model, key: provider === "ollama" ? undefined : key }),
          signal: controller.signal, cache: "no-store",
        });
        const data = await response.json() as ProviderInfo & { error?: string };
        if (!response.ok) throw Error(data.error || "Unable to verify this provider.");
        if (!controller.signal.aborted) setResult({ provider, model, key, info: data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ provider, model, key, info: {
          connected: false, models: [], temperature: supportsTemperature(provider, model),
          message: error instanceof Error ? error.message : "Unable to verify this provider.",
        } });
      }
    }, 600);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [provider, model, key, enabled, needsKey]);
  return {
    state: !model.trim() || needsKey ? "disconnected" : current ? current.connected ? "connected" : "disconnected" : "checking",
    message: !model.trim() ? "Enter a Model ID to verify availability."
      : needsKey ? "Add this provider's API key to verify model access."
        : current?.message || "Checking provider and model availability…",
    models: current?.models || [],
    temperature: current?.temperature ?? supportsTemperature(provider, model),
  } as const;
}

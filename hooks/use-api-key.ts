"use client";
import { useSyncExternalStore } from "react";
import { createSessionKeys } from "@/lib/session-keys";
import type { Provider } from "@/lib/settings";

const keys = createSessionKeys();
export function useApiKey(provider: Provider) {
  const key = useSyncExternalStore(keys.subscribe, () => keys.get(provider), () => "");
  return [key, (value: string) => keys.set(provider, value)] as const;
}

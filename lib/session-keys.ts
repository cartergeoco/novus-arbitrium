import type { Provider } from "./settings";

/** Deliberately never writes to localStorage, sessionStorage, or campaign saves. */
export function createSessionKeys() {
  const keys: Partial<Record<Provider, string>> = {};
  const listeners = new Set<() => void>();
  return {
    get: (provider: Provider) => provider === "ollama" ? "" : keys[provider] || "",
    set(provider: Provider, value: string) {
      if (provider === "ollama") return;
      keys[provider] = value.trim();
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

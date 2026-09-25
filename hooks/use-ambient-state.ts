"use client";

import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.addEventListener("visibilitychange", notify);
  motion.addEventListener("change", notify);
  return () => {
    document.removeEventListener("visibilitychange", notify);
    motion.removeEventListener("change", notify);
  };
}

export function useAmbientState() {
  const hidden = useSyncExternalStore(subscribe, () => document.hidden, () => false);
  const reducedMotion = useSyncExternalStore(subscribe, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  return { hidden, reducedMotion };
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { defaults, type Settings } from "@/lib/game";
import { parseSettings } from "@/lib/validation";

const listeners = new Set<() => void>();
let snapshot: Settings = defaults;
let initialized = false;

function readSettings() {
  try {
    const saved = window.localStorage.getItem("novus-settings");
    snapshot = saved ? parseSettings(JSON.parse(saved)) : defaults;
  } catch { snapshot = defaults; }
}

function getSnapshot() {
  if (!initialized) { initialized = true; readSettings(); }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key === "novus-settings" || event.key === null) {
      readSettings();
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}

function setSettings(settings: Settings) {
  snapshot = settings;
  try { window.localStorage.setItem("novus-settings", JSON.stringify(settings)); } catch {}
  listeners.forEach((notify) => notify());
}

/** One preference source for the landing page, game, and portal dialogs. */
export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => defaults);
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontSize}px`;
    root.dataset.contrast = String(settings.contrast);
    root.dataset.motion = String(settings.motion);
    root.dataset.transparency = String(settings.transparency);
    root.dataset.texture = String(settings.texture);
    root.dataset.highlights = String(settings.highlights);
  }, [settings]);
  return [settings, setSettings] as const;
}

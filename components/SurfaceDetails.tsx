"use client";

import { useEffect } from "react";

const SURFACES = "[data-shine], .site-menu a:not(.disabled), .map-controls button, .nation-results button, .collection-card, .collection-empty, .about-grid article, .floating-panel, .decision-dock, .lab-panel, .conflict-card, .settings-nav [role=tab], .setting-row, [data-slot=dialog-content], [data-slot=alert-dialog-content], [data-slot=popover-content], [data-slot=select-content], [data-slot=select-trigger], .primary-button, .outline-button, .account-action, .collection-primary, .collection-continue, .collection-search, .search-field, .settings-dialog input, .settings-dialog textarea, .floating-panel input, .floating-panel textarea, .decision-dock textarea, .lab-panel input, .lab-panel textarea, .color-picker input";

/** One delegated, event-driven light source, including portalled surfaces. */
export function SurfaceDetails({ disabled }: { disabled: boolean }) {
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (prefers-contrast: no-preference)");
    if (disabled) return;
    let frame = 0;
    let active: HTMLElement[] = [];
    let target: Element | null = null;
    let x = 0;
    let y = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      active.forEach((element) => element.removeAttribute("data-lit"));
      active = [];
      target = null;
    };
    const paint = () => {
      frame = 0;
      const next: HTMLElement[] = [];
      let element = target?.closest<HTMLElement>(SURFACES);
      while (element && next.length < 4) {
        if (!element.matches(":disabled, [aria-disabled=true]")) next.push(element);
        element = element.parentElement?.closest<HTMLElement>(SURFACES);
      }
      // Batch layout reads before any style writes.
      const bounds = next.map((item) => item.getBoundingClientRect());
      active.filter((item) => !next.includes(item)).forEach((item) => item.removeAttribute("data-lit"));
      next.forEach((item, index) => {
        item.style.setProperty("--light-x", `${Math.round(x - bounds[index].left)}px`);
        item.style.setProperty("--light-y", `${Math.round(y - bounds[index].top)}px`);
        item.dataset.lit = "true";
      });
      active = next;
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === "touch") { clear(); return; }
      target = event.target instanceof Element ? event.target : null;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    document.addEventListener("pointercancel", clear);
    window.addEventListener("resize", clear);
    document.addEventListener("scroll", clear, { passive: true, capture: true });
    document.addEventListener("visibilitychange", clear);
    window.addEventListener("blur", clear);
    media.addEventListener("change", clear);
    return () => {
      clear();
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", clear);
      document.removeEventListener("pointercancel", clear);
      window.removeEventListener("resize", clear);
      document.removeEventListener("scroll", clear, true);
      document.removeEventListener("visibilitychange", clear);
      window.removeEventListener("blur", clear);
      media.removeEventListener("change", clear);
    };
  }, [disabled]);
  return null;
}

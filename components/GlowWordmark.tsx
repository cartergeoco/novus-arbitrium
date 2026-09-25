"use client";

import { useEffect, useRef } from "react";

const TITLE = "Novus Arbitrium";
const RANGE = 80;

export function GlowWordmark({ onHome, disabled }: { onHome: () => void; disabled: boolean }) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const link = linkRef.current;
    if (!link || disabled) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
    let frame = 0;
    let x = 0;
    let y = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      link.removeAttribute("data-glowing");
    };
    const paint = () => {
      frame = 0;
      const bounds = link.getBoundingClientRect();
      const dx = Math.max(bounds.left - x, 0, x - bounds.right);
      const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
      if (Math.hypot(dx, dy) >= RANGE) { clear(); return; }
      link.style.setProperty("--glow-x", `${x - bounds.left}px`);
      link.style.setProperty("--glow-y", `${y - bounds.top}px`);
      link.dataset.glowing = "true";
    };
    const track = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === "touch") { clear(); return; }
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", track, { passive: true });
    document.documentElement.addEventListener("pointerleave", clear);
    document.addEventListener("pointercancel", clear);
    document.addEventListener("visibilitychange", clear);
    document.addEventListener("scroll", clear, { passive: true, capture: true });
    window.addEventListener("blur", clear);
    window.addEventListener("resize", clear);
    media.addEventListener("change", clear);
    return () => {
      clear();
      document.removeEventListener("pointermove", track);
      document.documentElement.removeEventListener("pointerleave", clear);
      document.removeEventListener("pointercancel", clear);
      document.removeEventListener("visibilitychange", clear);
      document.removeEventListener("scroll", clear, true);
      window.removeEventListener("blur", clear);
      window.removeEventListener("resize", clear);
      media.removeEventListener("change", clear);
    };
  }, [disabled]);

  return (
    <a ref={linkRef} className="glow-wordmark" href="#home" onClick={(event) => { event.preventDefault(); onHome(); }}>
      <span className="wordmark-label">{TITLE}</span>
      <span className="wordmark-glow" aria-hidden="true"><span>{TITLE}</span></span>
    </a>
  );
}

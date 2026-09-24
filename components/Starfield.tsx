"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
};

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars: Star[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.length = 0;
      const count = Math.round((width * height) / 900);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() < 0.92 ? 1 : 1.5,
          alpha: 0.35 + Math.random() * 0.65,
          phase: Math.random() * Math.PI * 2,
          speed: 0.35 + Math.random() * 1.1,
        });
      }
    };

    const draw = (time: number) => {
      const still = document.documentElement.dataset.motion === "true";
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#fff";
      for (const star of stars) {
        const flicker = still
          ? 1
          : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
        ctx.globalAlpha = star.alpha * flicker;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    layout();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", layout);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", layout);
    };
  }, []);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}

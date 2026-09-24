"use client";

import { memo, useEffect, useRef } from "react";

const TAU = Math.PI * 2;
const GLYPHS = ".:+|i-~=";
const GLYPH_WIDTH = 16;
const GLYPH_HEIGHT = 18;

type Cell = {
  x: number;
  y: number;
  baseMask: number;
  mask: number;
  phase: number;
  flow: number;
  glyph: number;
};

function smoothstep(from: number, to: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

// A fixed seed keeps the same landscape through navigation and resizing.
function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 1979;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const u = smoothstep(0, 1, x - ix);
  const v = smoothstep(0, 1, y - iy);
  const top = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u;
  const bottom = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return top * (1 - v) + bottom * v;
}

/** Continuous ASCII contours; geometry and phase survive page changes. */
export const AsciiBackground = memo(function AsciiBackground({
  section,
  reading = false,
  disabled = false,
  paused = false,
  reduceMotion = false,
}: {
  section: string;
  reading?: boolean;
  disabled?: boolean;
  paused?: boolean;
  reduceMotion?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const controls = useRef({ section, reading, paused, reduceMotion });
  const configure = useRef<(() => void) | null>(null);

  useEffect(() => {
    controls.current = { section, reading, paused, reduceMotion };
    configure.current?.();
  }, [section, reading, paused, reduceMotion]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (disabled) {
      canvas.width = 1;
      canvas.height = 1;
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Rasterize each character once, instead of rendering text every frame.
    const atlas = document.createElement("canvas");
    const ink = atlas.getContext("2d");
    if (!ink) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cells: Cell[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameDelay = 1000 / 20;
    let lastTime = 0;
    let frame = 0;
    let timer = 0;
    let resizeTimer = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const time = elapsed.current;
      for (const cell of cells) {
        // Moving light runs through a fixed field of glyphs, without flicker.
        const phase = cell.phase - time * 0.68 + Math.sin(time * 0.22 + cell.flow) * 0.52;
        const contour = Math.pow(0.5 + 0.5 * Math.cos(phase), 8);
        const trace = 0.82 + 0.18 * Math.sin(cell.flow - time * 0.46);
        const alpha = cell.mask * (0.07 + contour * 0.54) * trace;
        if (alpha < 0.008) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(
          atlas,
          cell.glyph * GLYPH_WIDTH * dpr, 0,
          GLYPH_WIDTH * dpr, GLYPH_HEIGHT * dpr,
          cell.x - GLYPH_WIDTH / 2, cell.y - GLYPH_HEIGHT / 2,
          GLYPH_WIDTH, GLYPH_HEIGHT,
        );
      }
      ctx.globalAlpha = 1;
    };

    const stop = () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };

    const tick = () => {
      const now = performance.now();
      elapsed.current += Math.min((now - lastTime) / 1000, 0.25);
      lastTime = now;
      draw();
      timer = window.setTimeout(() => { frame = requestAnimationFrame(tick); }, frameDelay);
    };

    const restart = () => {
      stop();
      if (document.hidden || !width || !height) return;
      draw();
      if (controls.current.paused || controls.current.reduceMotion || motionQuery.matches) return;
      lastTime = performance.now();
      timer = window.setTimeout(() => { frame = requestAnimationFrame(tick); }, frameDelay);
    };

    const updateExclusion = () => {
      const content = canvas.parentElement?.querySelector<HTMLElement>("[data-ascii-content]");
      const bounds = content?.getBoundingClientRect();
      const fontSize = content ? parseFloat(getComputedStyle(content).fontSize) : 0;
      const compact = width < 600;
      for (const cell of cells) {
        let mask = cell.baseMask;
        if (bounds) {
          if (controls.current.reading) {
            const distance = Math.max(bounds.left - cell.x, cell.x - bounds.right, 0);
            mask *= smoothstep(0, 100, distance);
          } else {
            const right = bounds.left + Math.min(bounds.width, fontSize * 5.5);
            const dx = Math.max(bounds.left - 32 - cell.x, cell.x - right - 32, 0);
            const dy = Math.max(bounds.top - 40 - cell.y, cell.y - bounds.bottom - 40, 0);
            mask *= smoothstep(0, compact ? 80 : 140, Math.hypot(dx, dy));
          }
        }
        cell.mask = mask;
      }
    };

    const layout = () => {
      stop();
      ({ width, height } = canvas.getBoundingClientRect());
      if (!width || !height) return;

      // Preserve native detail on Retina displays while bounding bitmap memory.
      dpr = Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(6000000 / (width * height)));
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      atlas.width = Math.ceil(GLYPHS.length * GLYPH_WIDTH * dpr);
      atlas.height = Math.ceil(GLYPH_HEIGHT * dpr);
      ink.setTransform(dpr, 0, 0, dpr, 0, 0);
      ink.font = '10px "Courier New", monospace';
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      ink.fillStyle = "#b8b9ad";
      for (let i = 0; i < GLYPHS.length; i++) {
        ink.fillText(GLYPHS[i], (i + 0.5) * GLYPH_WIDTH, GLYPH_HEIGHT / 2);
      }

      // Fewer than ~5,000 candidate cells even on ultrawide displays.
      const cell = Math.max(12, Math.sqrt((width * height) / 8500));
      const rowHeight = cell * 1.25;
      const scale = Math.min(width * 0.68, height * 0.85);
      const compact = width < 600;
      frameDelay = 1000 / (compact ? 15 : 20);
      cells = [];

      for (let row = 0, y = rowHeight / 2; y < height; row++, y += rowHeight) {
        for (let col = 0, x = cell / 2; x < width; col++, x += cell) {
          // Domain-warped contours evoke an unfinished atlas, with a second
          // fragment at the lower left. Large shapes avoid uniform visual static.
          const px = (x - width * 0.8) / scale;
          const py = (y - height * 0.52) / scale;
          const warp = noise(px * 2.3 + 12, py * 2.3 + 8);
          const radius = Math.hypot(px * 0.86, py * 1.12);
          const field = radius + (warp - 0.5) * 0.42;
          const island = 1 - smoothstep(0.32, 0.86, radius);
          const fragment = Math.exp(-(((x / width + 0.06) / 0.38) ** 2 + ((y / height - 0.94) / 0.3) ** 2));
          const shape = Math.max(island, fragment * 0.55);
          const grain = hash(col, row);

          // Sample once. The same sparse cells persist throughout the animation.
          if (grain > 0.72 || shape < 0.025) continue;
          let mask = shape * (0.75 + grain * 0.35);
          mask *= smoothstep(85, 180, y);
          mask *= 1 - smoothstep(height - 100, height + 60, y);
          mask *= compact ? 0.72 : 1;
          if (mask < 0.025) continue;
          const strokes = Math.abs(px) > Math.abs(py) ? ":|i" : "-~=";
          const glyph = grain < 0.36
            ? strokes[Math.floor(hash(col + 81, row + 37) * strokes.length)]
            : grain < 0.4 ? "+" : grain < 0.5 ? ":" : ".";
          cells.push({
            x, y, baseMask: mask, mask,
            phase: field * TAU * 7,
            flow: Math.atan2(py, px) * 2 + warp,
            glyph: GLYPHS.indexOf(glyph),
          });
        }
      }
      updateExclusion();
      restart();
    };

    // Debounce live resizing; the existing bitmap remains visible meanwhile.
    const scheduleLayout = () => {
      stop();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 120);
    };
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(canvas);
    configure.current = () => { updateExclusion(); restart(); };
    document.fonts.addEventListener("loadingdone", scheduleLayout);
    document.addEventListener("visibilitychange", restart);
    motionQuery.addEventListener("change", restart);
    layout();

    return () => {
      stop();
      configure.current = null;
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", scheduleLayout);
      document.removeEventListener("visibilitychange", restart);
      motionQuery.removeEventListener("change", restart);
    };
  }, [disabled]);

  return <canvas ref={ref} className="ascii-background" aria-hidden="true" />;
});

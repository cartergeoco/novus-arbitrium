import type { Params } from "./params";
import { num, str } from "./params";
import { hashString, random, type Box } from "./svg";

export const arrangements = [
  "single", "row", "column", "grid", "staggered", "rows", "ring", "rings", "arc", "semicircle",
  "scatter", "cluster", "constellation", "quincunx", "pyramid", "diagonal", "canton", "custom",
] as const;
export type Arrangement = (typeof arrangements)[number];

export const constellations: Record<string, [number, number, number][]> = {
  // [x, y, relative size] in a unit box centered on 0.
  southern_cross: [[0, -0.42, 1], [-0.3, -0.05, 1], [0.27, -0.14, 0.9], [0.03, 0.42, 1.05], [0.12, 0.1, 0.55]],
  crux: [[0, -0.42, 1], [-0.3, -0.05, 1], [0.27, -0.14, 0.9], [0.03, 0.42, 1.05]],
  big_dipper: [[-0.45, -0.1, 0.8], [-0.28, -0.14, 0.8], [-0.12, -0.08, 0.8], [0.02, 0.02, 0.8], [0.06, 0.22, 0.8], [0.38, 0.28, 0.8], [0.42, 0.06, 0.8]],
  orion_belt: [[-0.3, 0.2, 1], [0, 0, 1], [0.3, -0.2, 1]],
  cassiopeia: [[-0.45, -0.15, 1], [-0.22, 0.2, 1], [0, -0.05, 1], [0.22, 0.2, 1], [0.45, -0.18, 1]],
  pleiades: [[-0.1, -0.3, 1], [0.15, -0.2, 0.8], [-0.3, 0, 0.9], [0.05, 0.02, 1.1], [0.3, 0.08, 0.8], [-0.12, 0.3, 0.8], [0.2, 0.34, 0.7]],
  triangle: [[0, -0.4, 1], [-0.42, 0.35, 1], [0.42, 0.35, 1]],
};

export type Instance = { x: number; y: number; size: number; rotation: number; index: number };

/** Where every copy of an emblem goes. Positions are canvas coordinates. */
export function arrange(p: Params, body: Box, explicit: ReadonlySet<string>): Instance[] {
  let kind = str(p, "arrangement") as Arrangement;
  const count = Math.max(1, num(p, "count"));
  let x = num(p, "x"), y = num(p, "y"), width = num(p, "width"), height = num(p, "height");
  if (kind === "canton") {
    if (!explicit.has("x")) x = 0.2;
    if (!explicit.has("y")) y = 7 / 26;
    if (!explicit.has("width")) width = 0.4;
    if (!explicit.has("height")) height = 7 / 13;
    kind = "staggered";
  }
  const cx = body.x + x * body.w, cy = body.y + y * body.h, S = num(p, "scale") * body.h;
  const itemScale = num(p, "itemScale");
  const item = (auto: number) => (itemScale > 0 ? itemScale * S : auto);
  const out: Instance[] = [];
  const push = (px: number, py: number, size: number, angle = 0) => out.push({ x: px, y: py, size, rotation: angle, index: out.length });
  const box = (defaultAspect: number) => {
    const H = height > 0 ? height * body.h : S;
    const W = width > 0 ? width * body.w : S * defaultAspect;
    return { W, H };
  };

  switch (kind) {
    case "single": push(cx, cy, S); break;
    case "row":
    case "column": {
      const horizontal = kind === "row";
      const { W, H } = box(horizontal ? count * 1.3 : 1);
      const length = horizontal ? W : height > 0 ? H : S * count * 1.3;
      const across = horizontal ? H : W;
      const step = length / count, size = item(Math.min(across, step * 0.82));
      for (let i = 0; i < count; i++) {
        const t = -length / 2 + step * (i + 0.5);
        if (horizontal) push(cx + t, cy, size);
        else push(cx, cy + t, size);
      }
      break;
    }
    case "grid": {
      const rows = num(p, "rows") || Math.max(1, Math.round(Math.sqrt(count / 2))), cols = num(p, "cols") || Math.ceil(count / rows);
      const { W, H } = box(cols / rows);
      const sx = W / cols, sy = H / rows, size = item(Math.min(sx, sy) * 0.8);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (out.length >= count && explicit.has("count")) break;
        push(cx - W / 2 + sx * (c + 0.5), cy - H / 2 + sy * (r + 0.5), size);
      }
      break;
    }
    case "staggered": {
      const rows = num(p, "rows") || 9, cols = num(p, "cols") || 6;
      const { W, H } = box((cols / rows) * 1.4);
      const sx = W / (cols * 2), sy = H / (rows + 1), size = item(Math.min(sx * 2, sy) * 1.12);
      for (let r = 0; r < rows; r++) {
        for (let k = r % 2 ? 2 : 1; k < cols * 2; k += 2) push(cx - W / 2 + sx * k, cy - H / 2 + sy * (r + 1), size);
      }
      break;
    }
    case "rows": {
      const pattern = String(p.pattern || "").split(/[,;\s]+/).map(Number).filter((v) => v > 0).slice(0, 20);
      const counts = pattern.length ? pattern : [Math.ceil(count / 2), Math.floor(count / 2)].filter(Boolean);
      const most = Math.max(...counts);
      const { W, H } = box((most / counts.length) * 1.2);
      const sx = W / most, sy = H / counts.length, size = item(Math.min(sx, sy) * 0.8);
      counts.forEach((c, r) => {
        for (let i = 0; i < c; i++) push(cx + (i - (c - 1) / 2) * sx, cy - H / 2 + sy * (r + 0.5), size);
      });
      break;
    }
    case "ring":
    case "arc":
    case "semicircle": {
      const radius = S / 2;
      const full = kind === "ring";
      const [defaultFrom, defaultTo] = kind === "ring" ? [0, 360] : kind === "arc" ? [-60, 60] : [-90, 90];
      const from = explicit.has("startAngle") ? num(p, "startAngle") : defaultFrom;
      const to = full ? from + 360 : explicit.has("endAngle") ? num(p, "endAngle") : defaultTo;
      const span = to - from, steps = full ? count : Math.max(1, count - 1);
      const spacing = (Math.abs(span) / 360) * Math.PI * S / Math.max(1, steps);
      const size = item(Math.min(spacing * 0.64, S * 0.35));
      for (let i = 0; i < count; i++) {
        const a = from + (count === 1 && !full ? span / 2 : (span * i) / steps);
        const rad = ((a - 90) * Math.PI) / 180;
        push(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius, size, a);
      }
      break;
    }
    case "rings": {
      const pattern = String(p.pattern || "").split(/[,;\s]+/).map(Number).filter((v) => v > 0).slice(0, 8);
      const counts = pattern.length ? pattern : [1, Math.max(1, count - 1)];
      const size = item(S / (counts.length * 2.4));
      counts.forEach((c, r) => {
        const radius = counts[0] === 1 ? (S / 2) * (r / Math.max(1, counts.length - 1)) : (S / 2) * ((r + 1) / counts.length);
        for (let i = 0; i < c; i++) {
          const a = num(p, "startAngle") + (360 * i) / c, rad = ((a - 90) * Math.PI) / 180;
          push(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius, size, a);
        }
      });
      break;
    }
    case "scatter": {
      const { W, H } = box(2);
      const rand = random(num(p, "seed") * 7919 + hashString("scatter"));
      const size = item(Math.min(W, H) * 0.14);
      const placed: [number, number][] = [];
      for (let i = 0; i < count; i++) {
        let best: [number, number] = [0, 0], bestGap = -1;
        for (let attempt = 0; attempt < 24; attempt++) {
          const candidate: [number, number] = [cx + (rand() - 0.5) * (W - size), cy + (rand() - 0.5) * (H - size)];
          const gap = placed.reduce((m, q) => Math.min(m, Math.hypot(q[0] - candidate[0], q[1] - candidate[1])), Infinity);
          if (gap > bestGap) { best = candidate; bestGap = gap; }
          if (gap > size * 1.3) break;
        }
        placed.push(best);
        push(best[0], best[1], size);
      }
      break;
    }
    case "cluster": {
      const size = item(S / (Math.sqrt(count) * 1.9 + 0.4));
      const c = count > 1 ? (S / 2 - size / 2) / Math.sqrt(count - 0.5) : 0;
      for (let i = 0; i < count; i++) {
        const r = c * Math.sqrt(i + 0.5), a = i * 137.508;
        const rad = (a * Math.PI) / 180;
        push(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, size, a);
      }
      break;
    }
    case "constellation":
    case "custom": {
      const { W, H } = box(1);
      const points = kind === "custom"
        ? String(p.positions || "").split(";").map((pair) => pair.split(",").map(Number)).filter((v) => v.length >= 2 && v.every(Number.isFinite)).slice(0, 200).map(([a, b, s = 1]) => [a - 0.5, b - 0.5, s] as [number, number, number])
        : constellations[str(p, "constellation")] || constellations.southern_cross;
      const size = item(Math.min(W, H) * 0.16);
      for (const [px, py, s] of points) push(cx + px * W, cy + py * H, size * s);
      break;
    }
    case "quincunx": {
      const { W, H } = box(1);
      const size = item(Math.min(W, H) * 0.3);
      for (const [px, py] of [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]]) push(cx + px * (W - size), cy + py * (H - size), size);
      break;
    }
    case "pyramid": {
      let rows = 1;
      while ((rows * (rows + 1)) / 2 < count) rows++;
      const { W, H } = box(1.15);
      const step = Math.min(W / rows, H / rows), size = item(step * 0.82);
      let placed = 0;
      for (let r = 0; r < rows && placed < count; r++) {
        for (let i = 0; i <= r && placed < count; i++, placed++) push(cx + (i - r / 2) * step, cy - H / 2 + step * (r + 0.5), size);
      }
      break;
    }
    case "diagonal": {
      const { W, H } = box(2);
      const size = item(Math.min(W, H) / Math.max(2, count) * 1.2);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        push(cx - W / 2 + size / 2 + t * (W - size), cy + H / 2 - size / 2 - t * (H - size), size);
      }
      break;
    }
  }

  const groupRotation = num(p, "groupRotation");
  if (groupRotation) {
    const a = (groupRotation * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    for (const inst of out) {
      const dx = inst.x - cx, dy = inst.y - cy;
      inst.x = cx + dx * cos - dy * sin;
      inst.y = cy + dx * sin + dy * cos;
      inst.rotation += groupRotation;
    }
  }
  const orient = str(p, "orient");
  const rand = random(num(p, "seed") * 104729 + 17);
  for (const inst of out) {
    const facing = kind === "ring" || kind === "arc" || kind === "semicircle" || kind === "rings" ? inst.rotation : (Math.atan2(inst.y - cy, inst.x - cx) * 180) / Math.PI + 90;
    inst.rotation = orient === "outward" ? facing : orient === "inward" ? facing + 180 : orient === "tangent" ? facing + 90 : orient === "random" ? rand() * 360 : 0;
  }
  return out;
}

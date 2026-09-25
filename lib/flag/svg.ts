/** The working canvas. Every exported flag is exactly this 2:1 area. */
export const CANVAS = { width: 200, height: 100 } as const;

export type Box = { x: number; y: number; w: number; h: number };
export type Point = [number, number];

/** Fixed precision keeps output byte-identical across runs and platforms. */
export function n(value: number) {
  const r = Math.round(value * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
}

export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function attrs(values: Record<string, string | number | undefined | null | false>) {
  let out = "";
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === false) continue;
    out += ` ${key}="${typeof value === "number" ? n(value) : esc(value)}"`;
  }
  return out;
}

export const fillAttr = (color: string) => (color === "none" ? "none" : color);

export function rect(x: number, y: number, w: number, h: number, fill: string, extra = "") {
  if (fill === "none" || w <= 0 || h <= 0) return "";
  return `<rect${attrs({ x, y, width: w, height: h, fill })}${extra}/>`;
}

export function poly(points: Point[]) {
  return "M" + points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + "Z";
}

export function path(d: string, fill: string, extra = "") {
  if (fill === "none" || !d) return "";
  return `<path${attrs({ d, fill })}${extra}/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string, extra = "") {
  if (fill === "none" || r <= 0) return "";
  return `<circle${attrs({ cx, cy, r, fill })}${extra}/>`;
}

export function polar(cx: number, cy: number, r: number, angleDeg: number): Point {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Star polygon; angle 0 points the first tip straight up. */
export function starPoints(points: number, outer: number, inner: number, rotation = 0, cx = 0, cy = 0): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    out.push(polar(cx, cy, i % 2 ? inner : outer, rotation + (i * 180) / points));
  }
  return out;
}

export function regularPolygon(sides: number, r: number, rotation = 0, cx = 0, cy = 0): Point[] {
  return Array.from({ length: sides }, (_, i) => polar(cx, cy, r, rotation + (i * 360) / sides));
}

/** Area of a rectangle given in body fractions, mapped into a box. */
export function subBox(box: Box, a: { x: number; y: number; w: number; h: number }): Box {
  return { x: box.x + a.x * box.w, y: box.y + a.y * box.h, w: a.w * box.w, h: a.h * box.h };
}

export function hashString(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rotate a point around a pivot by degrees. */
export function rotate([x, y]: Point, [cx, cy]: Point, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

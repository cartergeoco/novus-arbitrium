import { resolveColor } from "./color";

/** A rectangle in fractions of the flag body (0..1 on both axes). */
export type Area = { x: number; y: number; w: number; h: number };
export type ParamValue = number | string | boolean | string[] | number[] | Area;
export type Params = Record<string, ParamValue>;

type Base<T extends string, V> = {
  key: string;
  type: T;
  default: V;
  label?: string;
  help?: string;
  /** Only relevant when another parameter has (or lacks) one of these values. */
  when?: { key: string; is?: string[]; not?: string[] };
  /** Editor grouping; parameters without a group are shown first. */
  group?: string;
};
export type ParamDef =
  | (Base<"number", number> & { min: number; max: number; step?: number })
  | (Base<"int", number> & { min: number; max: number })
  | (Base<"enum", string> & { options: readonly string[] })
  | Base<"bool", boolean>
  /** `optional` colors accept "none", which leaves the area underneath visible. */
  | (Base<"color", string> & { optional?: boolean })
  | (Base<"colors", string[]> & { min: number; max: number })
  | (Base<"numbers", number[]> & { min: number; max: number; maxItems: number })
  | (Base<"text", string> & { maxLength: number })
  | Base<"area", Area>
  | Base<"asset", string>;

export type ParamIssue = { key: string; message: string };

export const FULL_AREA: Area = { x: 0, y: 0, w: 1, h: 1 };

/** Named sub-rectangles of the flag body, usable anywhere an area is accepted. */
export const namedAreas: Record<string, Area> = {
  full: FULL_AREA,
  canton: { x: 0, y: 0, w: 0.5, h: 0.5 },
  upper_hoist: { x: 0, y: 0, w: 0.5, h: 0.5 },
  upper_fly: { x: 0.5, y: 0, w: 0.5, h: 0.5 },
  lower_hoist: { x: 0, y: 0.5, w: 0.5, h: 0.5 },
  lower_fly: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  hoist_half: { x: 0, y: 0, w: 0.5, h: 1 },
  fly_half: { x: 0.5, y: 0, w: 0.5, h: 1 },
  top_half: { x: 0, y: 0, w: 1, h: 0.5 },
  bottom_half: { x: 0, y: 0.5, w: 1, h: 0.5 },
  hoist_third: { x: 0, y: 0, w: 1 / 3, h: 1 },
  center_third: { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
  fly_third: { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  top_third: { x: 0, y: 0, w: 1, h: 1 / 3 },
  middle_third: { x: 0, y: 1 / 3, w: 1, h: 1 / 3 },
  bottom_third: { x: 0, y: 2 / 3, w: 1, h: 1 / 3 },
  us_canton: { x: 0, y: 0, w: 0.4, h: 7 / 13 },
  greek_canton: { x: 0, y: 0, w: 0.37, h: 5 / 9 },
  small_canton: { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
  large_canton: { x: 0, y: 0, w: 0.6, h: 0.6 },
};

const clampNum = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return undefined;
}

export function parseArea(value: unknown): Area | undefined {
  if (typeof value === "string") return namedAreas[value.trim().toLowerCase().replace(/[\s-]+/g, "_")];
  if (Array.isArray(value) && value.length === 4) {
    const [x, y, w, h] = value.map(toNumber);
    if ([x, y, w, h].every((n) => n !== undefined)) value = { x, y, w, h };
  }
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const x = toNumber(raw.x) ?? 0, y = toNumber(raw.y) ?? 0;
  const w = toNumber(raw.w ?? raw.width) ?? 1, h = toNumber(raw.h ?? raw.height) ?? 1;
  const cx = clampNum(x, -1, 2), cy = clampNum(y, -1, 2);
  return { x: cx, y: cy, w: clampNum(w, 0.01, 3), h: clampNum(h, 0.01, 3) };
}

/**
 * Coerce one raw value to its definition. Returns `undefined` (with an issue)
 * when the value cannot be interpreted, so callers can fall back to defaults.
 */
export function coerceParam(def: ParamDef, value: unknown, issues?: ParamIssue[]): ParamValue | undefined {
  const fail = (message: string) => { issues?.push({ key: def.key, message }); return undefined; };
  switch (def.type) {
    case "number": {
      const n = toNumber(value);
      return n === undefined ? fail("expected a number") : clampNum(n, def.min, def.max);
    }
    case "int": {
      const n = toNumber(value);
      return n === undefined ? fail("expected an integer") : clampNum(Math.round(n), def.min, def.max);
    }
    case "enum": {
      const s = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
      return def.options.includes(s) ? s : fail(`expected one of ${def.options.join(", ")}`);
    }
    case "bool":
      if (typeof value === "boolean") return value;
      if (value === "true" || value === 1 || value === "yes") return true;
      if (value === "false" || value === 0 || value === "no") return false;
      return fail("expected true or false");
    case "color": {
      if (def.optional && (value === "none" || value === null || value === "transparent")) return "none";
      const c = resolveColor(value);
      return c ?? fail("expected a hex color or color name");
    }
    case "colors": {
      const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;/]+/) : [value];
      const out: string[] = [];
      for (const item of list) {
        if (item === "none" || item === null) { out.push("none"); continue; }
        const c = resolveColor(item);
        if (!c) return fail(`invalid color ${JSON.stringify(item).slice(0, 40)}`);
        out.push(c);
      }
      if (out.length < def.min) return fail(`needs at least ${def.min} colors`);
      return out.slice(0, def.max);
    }
    case "numbers": {
      const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;:\s]+/).filter(Boolean) : [value];
      const out = list.map(toNumber);
      if (out.some((n) => n === undefined)) return fail("expected a list of numbers");
      return (out as number[]).slice(0, def.maxItems).map((n) => clampNum(n, def.min, def.max));
    }
    case "text":
      if (typeof value !== "string" && typeof value !== "number") return fail("expected text");
      return String(value).replace(/[\u0000-\u001f]/g, "").slice(0, def.maxLength);
    case "area":
      return parseArea(value) ?? fail("expected an area {x,y,w,h} or a named area");
    case "asset":
      return typeof value === "string" && /^[a-z0-9]+:[a-z0-9_-]+$/i.test(value.trim()) ? value.trim().toLowerCase() : fail("expected an asset id like gi:lion");
  }
}

/** Keep only known, valid keys. Values are coerced and clamped but defaults are not filled in. */
export function sanitizeParams(defs: readonly ParamDef[], raw: Record<string, unknown>, issues?: ParamIssue[]): Params {
  const out: Params = {};
  for (const def of defs) {
    if (!(def.key in raw) || raw[def.key] === undefined) continue;
    const value = coerceParam(def, raw[def.key], issues);
    if (value !== undefined) out[def.key] = value;
  }
  return out;
}

/** Every parameter filled in, in definition order. Used by the renderer and editor. */
export function resolveParams(defs: readonly ParamDef[], raw: Params, overrides: Params = {}): Params {
  const out: Params = {};
  for (const def of defs) {
    const value = raw[def.key] ?? overrides[def.key];
    out[def.key] = value === undefined ? structuredCloneParam(def.default) : value;
  }
  return out;
}

function structuredCloneParam(value: ParamValue): ParamValue {
  if (Array.isArray(value)) return [...value] as ParamValue;
  if (value && typeof value === "object") return { ...value };
  return value;
}

export function isParamVisible(def: ParamDef, p: Params) {
  if (!def.when) return true;
  const value = String(p[def.when.key]);
  if (def.when.is) return def.when.is.includes(value);
  if (def.when.not) return !def.when.not.includes(value);
  return true;
}

export const num = (p: Params, key: string) => p[key] as number;
export const str = (p: Params, key: string) => p[key] as string;
export const bool = (p: Params, key: string) => p[key] as boolean;
export const list = (p: Params, key: string) => p[key] as string[];
export const nums = (p: Params, key: string) => p[key] as number[];
export const area = (p: Params, key: string) => p[key] as Area;

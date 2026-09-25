import { resolveAssetId } from "./assets";
import { namedColors, resolveColor } from "./color";
import { divisionById, divisionCommon, divisionPresetById, divisionPresets, divisionDefs } from "./divisions";
import { emblemById, emblemCommon, emblemPresetById, emblemPresets, emblemDefs } from "./emblems";
import { sanitizeParams, type ParamDef, type ParamIssue, type Params } from "./params";
import { shapeById, shapePresetById, shapePresets, shapeDefs } from "./shapes";
import type { FlagDesign, FlagLayer, LayerKind } from "./types";

export const MAX_LAYERS = 48;

/** Named emblem positions (fractions of the flag body). */
export const anchors: Record<string, [number, number]> = {
  center: [0.5, 0.5], middle: [0.5, 0.5],
  hoist: [0.25, 0.5], left: [0.25, 0.5], fly: [0.75, 0.5], right: [0.75, 0.5],
  top: [0.5, 0.25], upper: [0.5, 0.25], bottom: [0.5, 0.75], lower: [0.5, 0.75],
  canton: [0.25, 0.25], upper_hoist: [0.25, 0.25], upper_left: [0.25, 0.25], top_left: [0.25, 0.25],
  upper_fly: [0.75, 0.25], upper_right: [0.75, 0.25], top_right: [0.75, 0.25],
  lower_hoist: [0.25, 0.75], lower_left: [0.25, 0.75], bottom_left: [0.25, 0.75],
  lower_fly: [0.75, 0.75], lower_right: [0.75, 0.75], bottom_right: [0.75, 0.75],
  nordic: [0.375, 0.5], offset_left: [0.375, 0.5], offset_hoist: [0.375, 0.5], offset_right: [0.625, 0.5], offset_fly: [0.625, 0.5],
  hoist_third: [1 / 6, 0.5], fly_third: [5 / 6, 0.5], us_canton: [0.2, 7 / 26], canton_center: [0.25, 0.25],
};

const keyAliases: Record<string, string> = {
  colour: "color", fill: "color", colours: "colors", palette: "colors",
  stripe_count: "count", stripes: "count", number: "count", n: "count", quantity: "count", star_count: "count", items: "count",
  star_points: "points", points_count: "points", tips: "points",
  size: "scale", emblem_scale: "scale", scale_factor: "scale",
  angle: "rotation", rotate: "rotation", emblem_rotation: "rotation",
  flip_horizontal: "mirror", mirrored: "mirror", flip_x: "mirror", flip_vertical: "flip", flip_y: "flip",
  emblem_color: "color", emblem_colour: "color", emblem_position: "position", pos: "position", placement: "position",
  layout: "arrangement", pattern_type: "motif", border_width: "width", band_width: "width",
  stroke: "outline", outline_color: "outline", outline_width: "outlineWidth",
  inner_ratio: "inner", inner_radius: "inner",
};
const secondChoice: Record<string, string[]> = {
  width: ["thickness", "depth"], thickness: ["width"], depth: ["width"], side: ["direction", "corner"], direction: ["side", "orientation"],
  orientation: ["direction"], corner: ["side"], count: ["rays", "rows", "lines", "peaks", "petals", "points", "teeth", "spokes", "rings", "leaves"],
  color: ["colors"], colors: ["color"],
};
const camel = (key: string) => key.replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase());
const snake = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[\s-]+/g, "_");
const norm = (text: string) => snake(String(text)).replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "");

type Catalog = { defs: Map<string, { params: ParamDef[] }>; presets: Map<string, { base: string; params: Params }>; common: ParamDef[] };
const catalogs: Record<LayerKind, Catalog> = {
  division: { defs: divisionById, presets: divisionPresetById, common: divisionCommon },
  emblem: { defs: emblemById, presets: emblemPresetById, common: emblemCommon },
};

const synonymsForType: Record<string, string> = {
  stripes: "horizontal_stripes", horizontal: "horizontal_stripes", bars: "vertical_stripes", vertical: "vertical_stripes",
  tricolor: "horizontal_tricolor", tricolour: "horizontal_tricolor", bicolor: "horizontal_bicolor", bicolour: "horizontal_bicolor",
  scandinavian_cross: "nordic_cross", offset_cross: "nordic_cross", skandinavian_cross: "nordic_cross",
  x: "saltire", x_cross: "saltire", st_andrews_cross: "st_andrew_saltire", union_flag: "union_jack",
  checkers: "checkered", checkerboard: "checkerboard", chequy: "checkered", quarters: "quartered", quarterly: "quartered",
  per_pale: "vertical_bicolor", per_fess: "horizontal_bicolor", fess: "center_band", pale: "center_pale", bend: "diagonal_left", bend_sinister: "diagonal_right",
  pall: "y_division", y: "y_division", bordure: "border", frame: "border", radial: "sunburst", rays: "sunburst", rising_sun_flag: "rising_sun_rays",
  diamond_field: "lozenge", patterned: "pattern", dots: "polka_dots", disc: "circle", dot: "circle", sun_disc: "circle", roundel: "roundel",
  moon: "crescent", crescent_moon: "crescent", star_crescent: "star_and_crescent", crescent_and_star: "star_and_crescent",
  double_cross: "double_cross", cross_emblem: "greek_cross", plus: "greek_cross", chakra: "ashoka_chakra", wheel: "wheel",
  stars: "star_row", ring_of_stars: "star_ring", circle_of_stars: "star_ring", stars_ring: "star_ring",
  motto: "text", words: "text", letters: "text", banner: "ribbon", scroll: "ribbon", laurel: "laurel_wreath",
};

type Resolved = { kind: LayerKind; type: string; params: Params } | { kind: "emblem"; type: "asset"; params: Params };

function resolveType(rawType: string, hint?: LayerKind, preferEmblem = false): Resolved | undefined {
  const id = norm(rawType);
  const order: LayerKind[] = hint ? [hint] : preferEmblem ? ["emblem", "division"] : ["division", "emblem"];
  const tryId = (candidate: string) => {
    for (const kind of order) {
      const cat = catalogs[kind];
      if (cat.defs.has(candidate)) return { kind, type: candidate, params: {} };
      const preset = cat.presets.get(candidate);
      if (preset) return { kind, type: preset.base, params: { ...preset.params } };
    }
    return undefined;
  };
  const direct = tryId(id) ?? tryId(synonymsForType[id] ?? "") ?? tryId(id.replace(/s$/, ""));
  if (direct) return direct;
  if (id.startsWith("gi_") || id.startsWith("nat_") || id.startsWith("mdi_") || id.startsWith("fa_") || /^[a-z]+:/.test(rawType)) {
    const asset = resolveAssetId(rawType.replace(/^([a-z]+)_/, "$1:"));
    if (asset && (!hint || hint === "emblem")) return { kind: "emblem", type: "asset", params: { asset } };
  }
  // Loose word match against ids and labels, e.g. "horizontal tricolor" or "nordic".
  const words = id.split("_").filter(Boolean);
  let best: { score: number; value: Resolved } | undefined;
  for (const kind of order) {
    const cat = catalogs[kind];
    const pool: [string, string, Params, string][] = [
      ...[...cat.defs.keys()].map((k) => [k, k, {}, k] as [string, string, Params, string]),
      ...[...cat.presets.entries()].map(([k, p]) => [k, p.base, p.params, k] as [string, string, Params, string]),
    ];
    for (const [key, base, params] of pool) {
      const kw = key.split("_");
      const hits = words.filter((w) => kw.includes(w) || kw.includes(w.replace(/s$/, ""))).length;
      if (!hits) continue;
      const score = hits * 10 - (kw.length - hits) * 3 - (words.length - hits) * 4;
      if (score > 0 && (!best || score > best.score)) best = { score, value: { kind, type: base, params: { ...params } } };
    }
  }
  if (best && best.score >= 6) return best.value;
  if (!hint || hint === "emblem") {
    const asset = resolveAssetId(rawType.replace(/_/g, " "));
    if (asset) return { kind: "emblem", type: "asset", params: { asset } };
  }
  return best?.value;
}

function parsePosition(value: unknown): [number, number] | undefined {
  if (Array.isArray(value) && value.length >= 2 && value.every((v) => typeof v === "number")) return [value[0], value[1]];
  if (value && typeof value === "object" && "x" in value && "y" in value) return [Number((value as { x: unknown }).x), Number((value as { y: unknown }).y)];
  if (typeof value !== "string") return undefined;
  const key = norm(value.replace(/[-\s]+/g, "_"));
  return anchors[key] ?? anchors[key.replace(/^(the_)?/, "").replace(/_(side|corner|quarter)$/, "")];
}

/** Interpret a phrase such as "uneven_cross, gold, thinner, offset left" or "8-point star upper-right". */
export function parseLayerPhrase(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let rest = ` ${text.toLowerCase().replace(/[,;]+/g, " , ")} `;
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = rest.match(re);
    if (m) { fn(m); rest = rest.replace(m[0], " "); }
  };
  take(/(\d+)[\s-]*(?:point(?:ed)?|pt)s?\b/, (m) => { out.points = Number(m[1]); });
  take(/\b(\d+)\s+(?:stars?|items?|copies)\b/, (m) => { out.count = Number(m[1]); if (!out.type) out.type = "star"; });
  take(/\b(?:scale|size)\s*([\d.]+)\b/, (m) => { out.scale = Number(m[1]); });
  take(/\brotat(?:ed|e|ion)\s*(-?\d+)/, (m) => { out.rotation = Number(m[1]); });
  const positions = Object.keys(anchors).sort((a, b) => b.length - a.length);
  for (const pos of positions) {
    const phrase = pos.replace(/_/g, "[\\s_-]+");
    const re = new RegExp(`\\b(?:in the |at the |on the )?${phrase}\\b`);
    if (re.test(rest)) { out.position = pos; rest = rest.replace(re, " "); break; }
  }
  const mods: string[] = [];
  take(/\b(thinner|thin|narrow)\b/, (m) => mods.push(m[1] === "thinner" ? "thinner" : "thin"));
  take(/\b(thicker|thick|wide|bold)\b/, (m) => mods.push(m[1] === "thicker" ? "thicker" : "thick"));
  take(/\b(smaller|small|tiny)\b/, () => mods.push("small"));
  take(/\b(larger|large|big|huge)\b/, () => mods.push("large"));
  take(/\b(mirrored|mirror)\b/, () => { out.mirror = true; });
  if (mods.length) out.modifiers = mods;
  const colors: string[] = [];
  const names = Object.keys(namedColors).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/_/g, "[\\s_-]+")}\\b`, "g");
    rest = rest.replace(re, (match) => { colors.push(name); return " ".repeat(match.length); });
  }
  rest = rest.replace(/#[0-9a-f]{3,6}\b/g, (hex) => { colors.push(hex); return " "; });
  if (colors.length === 1) out.color = colors[0];
  else if (colors.length > 1) { out.color = colors[0]; out.colors = colors.slice(1); }
  const typeText = rest.replace(/\b(with|and|a|an|the|in|at|on|of|emblem)\b/g, " ").replace(/[^a-z0-9_\s:-]/g, " ").trim().split(/\s*,\s*|\s{2,}/).filter(Boolean)[0];
  if (typeText && !out.type) out.type = typeText.trim();
  return out;
}

function applyModifiers(params: Params, mods: unknown, defs: ParamDef[]) {
  if (!Array.isArray(mods)) return;
  const has = (k: string) => defs.some((d) => d.key === k);
  const bump = (key: string, factor: number) => {
    const def = defs.find((d) => d.key === key);
    if (!def || def.type !== "number") return;
    const base = typeof params[key] === "number" ? (params[key] as number) : def.default;
    params[key] = Math.min(def.max, Math.max(def.min, base * factor));
  };
  for (const mod of mods) {
    const key = has("thickness") ? "thickness" : has("width") ? "width" : has("lineWidth") ? "lineWidth" : undefined;
    if (mod === "thinner" && key) bump(key, 0.55);
    if (mod === "thin" && key) bump(key, 0.7);
    if (mod === "thicker" && key) bump(key, 1.6);
    if (mod === "thick" && key) bump(key, 1.35);
    if (mod === "small") bump("scale", 0.65);
    if (mod === "large") bump("scale", 1.5);
  }
}

function mapKeys(raw: Record<string, unknown>, defs: ParamDef[]) {
  const known = new Set(defs.map((d) => d.key));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    const candidates = [key, camel(key), keyAliases[snake(key)], camel(snake(key).replace(/^(star|stripe|emblem|division|band|cross|layer)_/, ""))].filter(Boolean) as string[];
    let target = candidates.find((c) => known.has(c));
    if (!target) for (const c of candidates) { target = (secondChoice[c] || []).find((alt) => known.has(alt)); if (target) break; }
    if (target && !(target in out)) out[target] = value;
    else if (!target) out[key] = value;
  }
  return out;
}

export type LayerInput = string | Record<string, unknown>;

export function normalizeLayer(input: LayerInput, hint?: LayerKind, issues: string[] = []): FlagLayer | undefined {
  const raw: Record<string, unknown> = typeof input === "string" ? parseLayerPhrase(input) : { ...input };
  if (typeof raw.phrase === "string" || typeof raw.description === "string") Object.assign(raw, parseLayerPhrase(String(raw.phrase ?? raw.description)), raw);
  const kind = raw.kind === "division" || raw.kind === "emblem" ? raw.kind : hint;
  const typeValue = [raw.type, raw.id && !String(raw.id).match(/^l\d+$/) ? raw.id : undefined, raw.name, raw.preset, raw.emblem, raw.division, raw.shape_type].find((v) => typeof v === "string") as string | undefined;
  const assetValue = typeof raw.asset === "string" ? raw.asset : undefined;
  const preferEmblem = ["x", "y", "position", "scale", "arrangement", "rotation"].some((k) => k in raw);
  let resolved: Resolved | undefined;
  if (assetValue && (!typeValue || norm(typeValue) === "asset")) {
    const asset = resolveAssetId(assetValue);
    resolved = asset ? { kind: "emblem", type: "asset", params: { asset } } : undefined;
    if (!asset) issues.push(`Unknown library emblem "${assetValue}".`);
  } else if (typeValue) resolved = resolveType(typeValue, kind, preferEmblem);
  if (!resolved) {
    issues.push(`Unknown ${kind ?? "layer"} type "${typeValue ?? JSON.stringify(input).slice(0, 40)}".`);
    return undefined;
  }
  const cat = catalogs[resolved.kind];
  const def = cat.defs.get(resolved.type)!;
  const defs = [...def.params, ...cat.common];
  const mapped = mapKeys(raw, defs);
  if (resolved.kind === "emblem") {
    const pos = parsePosition(raw.position ?? raw.pos ?? raw.emblem_position ?? raw.anchor);
    if (pos) { mapped.x ??= pos[0]; mapped.y ??= pos[1]; }
    if (mapped.colors !== undefined && mapped.color === undefined && Array.isArray(mapped.colors) && !defs.some((d) => d.key === "colors" && d.type === "colors" && d.min > 0)) {
      const [first, ...others] = mapped.colors as unknown[];
      mapped.color = first;
      mapped.colors = others;
    }
  } else if (typeof mapped.color === "string" && !defs.some((d) => d.key === "color") && defs.some((d) => d.key === "colors")) {
    mapped.colors = [mapped.color];
    delete mapped.color;
  }
  const paramIssues: ParamIssue[] = [];
  const params = { ...resolved.params, ...sanitizeParams(defs, mapped, paramIssues) };
  for (const issue of paramIssues) issues.push(`${resolved.type}.${issue.key}: ${issue.message}`);
  applyModifiers(params, raw.modifiers, defs);
  const layer: FlagLayer = { kind: resolved.kind, type: resolved.type, ...params };
  if (typeof raw.id === "string" && /^[\w-]{1,40}$/.test(raw.id) && raw.id !== typeValue) layer.id = raw.id;
  if (raw.hidden === true) layer.hidden = true;
  return layer;
}

function parseRatio(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value > 2 ? 1 / value : value;
  if (typeof value !== "string") return undefined;
  const m = value.match(/^\s*([\d.]+)\s*[:x/]\s*([\d.]+)\s*$/);
  if (!m) return undefined;
  const a = Number(m[1]), b = Number(m[2]);
  return a && b ? Math.min(a, b) / Math.max(a, b) : undefined;
}

export function normalizeShape(input: unknown, issues: string[] = []): FlagDesign["shape"] {
  let raw: Record<string, unknown> = typeof input === "string" ? { type: input } : input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
  const typeValue = String(raw.type ?? raw.id ?? raw.name ?? raw.preset ?? "rectangle");
  let type = norm(typeValue);
  let params: Params = {};
  const preset = shapePresetById.get(type) ?? shapePresetById.get(`shape_${type}`);
  if (preset) { type = preset.base; params = { ...preset.params }; }
  if (!shapeById.has(type)) {
    const ratio = parseRatio(typeValue);
    const guess = shapePresets.find((s) => s.id.includes(type) || type.includes(s.id)) ?? shapeDefs.find((s) => type.includes(s.id));
    if (ratio) { type = "rectangle"; params = { ratio }; }
    else if (guess && "base" in guess) { type = guess.base; params = { ...guess.params }; }
    else if (guess) type = guess.id;
    else { issues.push(`Unknown shape "${typeValue}", using a 2:3 rectangle.`); type = "rectangle"; }
  }
  const def = shapeById.get(type)!;
  raw = mapKeys(raw, def.params);
  const r = parseRatio(raw.ratio ?? raw.proportion ?? raw.proportions ?? raw.aspect);
  if (r) raw.ratio = r;
  const paramIssues: ParamIssue[] = [];
  Object.assign(params, sanitizeParams(def.params, raw, paramIssues));
  for (const issue of paramIssues) issues.push(`shape.${issue.key}: ${issue.message}`);
  return { type, ...params };
}

const legacyLayouts = ["horizontal", "vertical", "cross", "nordic", "saltire", "diagonal", "canton", "triangle", "chevron", "border", "quarters", "pall", "band", "bars"];

export function isLegacyFlag(value: unknown): value is { layout: string; colors: string[]; emblem: string; stripes?: number; text?: string } {
  return !!value && typeof value === "object" && "layout" in value && "colors" in value && !("layers" in value);
}

/** Convert the original 14-layout flag format to layered designs. */
export function migrateLegacy(old: { layout: string; colors: string[]; emblem: string; stripes?: number; text?: string }): FlagDesign {
  const [a, b = a, c = b, d = a] = old.colors;
  const count = old.stripes || 3;
  const layers: Record<string, unknown>[] = [];
  switch (old.layout) {
    case "horizontal": layers.push({ type: "horizontal_stripes", count, colors: [a, b, c] }); break;
    case "vertical": layers.push({ type: "vertical_stripes", count, colors: [a, b, c] }); break;
    case "cross": layers.push({ type: "cross", colors: [b], thickness: 0.3 }); break;
    case "nordic": layers.push(c !== b ? { type: "cross", x: 31 / 90, thickness: 8 / 60, colors: [c], fimbriation: b, fimbriationWidth: 3 / 60 } : { type: "cross", x: 31 / 90, thickness: 14 / 60, colors: [b] }); break;
    case "saltire": layers.push({ type: "saltire", thickness: 14 / 60, colors: [b] }); if (c !== b) layers.push({ type: "saltire", thickness: 6 / 60, colors: [c] }); break;
    case "diagonal": layers.push({ type: "diagonal_band", direction: "up", width: 0.25, colors: [b] }); break;
    case "canton": layers.push({ type: "horizontal_stripes", count, colors: [a, b, c] }, { type: "canton", width: 38 / 90, height: 32 / 60, color: c }); break;
    case "triangle": layers.push({ type: "triangle", side: "hoist", depth: 40 / 90, color: c }); break;
    case "chevron": layers.push({ type: "chevron", depth: 48 / 90, width: 12 / 90, colors: [b] }); break;
    case "border": layers.push({ type: "solid", color: b }, { type: "border", width: 0.1, color: a }); break;
    case "quarters": layers.push({ type: "quartered", colors: [b, c, c, b] }); break;
    case "pall": layers.push({ type: "y_division", colors: [d], junction: 0.4, width: 0.2 }); break;
    case "bars": layers.push({ type: "band", orientation: "vertical", position: 11 / 90, width: 22 / 90, color: b }, { type: "band", orientation: "vertical", position: 79 / 90, width: 22 / 90, color: b }); break;
  }
  const inCanton = old.layout === "canton", atHoist = inCanton || old.layout === "triangle";
  const place = { x: atHoist ? 19 / 90 : 0.5, y: inCanton ? 16 / 60 : 0.5, color: inCanton ? b : old.colors.at(-1) || b, scale: 0.4 };
  const emblems: Record<string, Record<string, unknown>> = {
    star: { type: "star" }, stars: { type: "star", arrangement: "ring", count: 7, scale: 0.36 }, sun: { type: "sun", rays: 12 },
    diamond: { type: "diamond", aspect: 1 }, wreath: { type: "wreath" }, crescent: { type: "crescent" }, eagle: { type: "asset", asset: "gi:eagle-emblem" },
    lion: { type: "asset", asset: "gi:lion" }, cross: { type: "greek_cross" }, circle: { type: "circle", scale: 0.27 }, tree: { type: "asset", asset: "gi:pine-tree" },
    sword: { type: "asset", asset: "gi:broadsword" }, anchor: { type: "asset", asset: "gi:anchor" }, text: { type: "text", text: (old.text || "NEW").toUpperCase(), scale: 0.5 },
  };
  if (old.emblem !== "none" && emblems[old.emblem]) layers.push({ kind: "emblem", ...place, ...emblems[old.emblem] });
  return normalizeFlag({ shape: { type: "rectangle", ratio: 2 / 3 }, background: a, layers }).design;
}

export type NormalizeResult = { design: FlagDesign; issues: string[]; ok: boolean };

const emptyDesign = (): FlagDesign => ({ v: 2, shape: { type: "rectangle", ratio: 2 / 3 }, background: "#ffffff", layers: [] });

/**
 * Accept a strict FlagDesign, a legacy flag, or loose AI-style input and return a canonical design.
 * Loose input may use top-level shorthand: {shape, division, stripe_count, colors, emblem, star_count, emblem_color, emblem_position, emblem_scale, emblems:[…]}.
 */
export function normalizeFlag(input: unknown): NormalizeResult {
  const issues: string[] = [];
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return { design: emptyDesign(), issues: ["Flag must be a JSON object."], ok: false }; }
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return { design: emptyDesign(), issues: ["Flag must be an object."], ok: false };
  if (isLegacyFlag(input) && legacyLayouts.includes(String(input.layout)) && Array.isArray(input.colors)) {
    const colors = input.colors.map(resolveColor).filter(Boolean) as string[];
    if (colors.length) return { design: migrateLegacy({ ...input, colors }), issues, ok: true };
  }
  const raw = input as Record<string, unknown>;
  const shape = normalizeShape(raw.shape ?? (raw.ratio || raw.proportion ? { type: "rectangle", ratio: raw.ratio ?? raw.proportion } : undefined), issues);
  const layers: FlagLayer[] = [];
  const push = (value: unknown, hint?: LayerKind) => {
    if (layers.length >= MAX_LAYERS) return;
    if (typeof value !== "string" && (!value || typeof value !== "object")) return;
    const layer = normalizeLayer(value as LayerInput, hint, issues);
    if (layer) layers.push(layer);
  };
  const shorthand = (prefixes: string[], exclude: string[]) => {
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (exclude.includes(k)) continue;
      const key = snake(k);
      const prefix = prefixes.find((p) => key.startsWith(p + "_"));
      if (prefix) extra[key] = v;
    }
    return extra;
  };
  const top = ["shape", "background", "layers", "divisions", "emblems", "division", "emblem", "v", "ratio", "proportion", "name", "title"];
  if (Array.isArray(raw.layers)) raw.layers.forEach((l) => push(l));
  else {
    if (typeof raw.division === "string" || (raw.division && typeof raw.division === "object")) {
      const base = typeof raw.division === "string" ? { type: raw.division } : raw.division as Record<string, unknown>;
      const loose = Object.fromEntries(Object.entries(raw).filter(([k]) => !top.includes(k) && !snake(k).startsWith("emblem") && !snake(k).startsWith("star")));
      push({ ...loose, ...base }, "division");
    }
    if (Array.isArray(raw.divisions)) raw.divisions.forEach((d) => push(d, "division"));
    if (typeof raw.emblem === "string" || (raw.emblem && typeof raw.emblem === "object")) {
      const base = typeof raw.emblem === "string" ? { type: raw.emblem } : raw.emblem as Record<string, unknown>;
      push({ ...shorthand(["emblem", "star"], []), ...base }, "emblem");
    }
    if (Array.isArray(raw.emblems)) raw.emblems.forEach((e) => push(e, "emblem"));
  }
  let background = resolveColor(raw.background ?? raw.background_color ?? raw.field);
  if (!background) {
    const first = layers[0];
    background = (first && (typeof first.color === "string" ? first.color : Array.isArray(first.colors) ? (first.colors as string[])[0] : undefined)) || "#ffffff";
    if (raw.background !== undefined) issues.push(`Invalid background ${JSON.stringify(raw.background)}.`);
  }
  if (background === "none") background = "#ffffff";
  for (const layer of layers) if (layer.type === "solid" && layer.color === undefined) layer.color = background;
  const ok = layers.length > 0 || !!resolveColor(raw.background);
  return { design: { v: 2, shape, background, layers }, issues, ok };
}

const omit = (value: object, keys: string[]) => Object.fromEntries(Object.entries(value).filter(([k]) => !keys.includes(k)));

/** Structural check used when loading saved games: rejects anything that is not already clean. */
export function validateStoredFlag(value: unknown): string[] {
  if (isLegacyFlag(value)) {
    const v = value as { layout: unknown; colors: unknown; emblem: unknown; stripes?: unknown; text?: unknown };
    const errors: string[] = [];
    if (!legacyLayouts.includes(String(v.layout))) errors.push("unknown layout");
    if (!Array.isArray(v.colors) || v.colors.length < 2 || v.colors.length > 4 || !v.colors.every((c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))) errors.push("invalid colors");
    if (v.stripes !== undefined && (typeof v.stripes !== "number" || v.stripes < 2 || v.stripes > 13)) errors.push("invalid stripes");
    if (v.text !== undefined && (typeof v.text !== "string" || v.text.length > 16)) errors.push("invalid text");
    return errors;
  }
  if (!value || typeof value !== "object") return ["flag is not an object"];
  const d = value as Partial<FlagDesign>;
  const errors: string[] = [];
  if (d.v !== 2) errors.push("unsupported flag version");
  if (!d.shape || typeof d.shape !== "object" || !shapeById.has(String(d.shape.type))) errors.push("unknown shape");
  if (typeof d.background !== "string" || !/^#[0-9a-f]{6}$/i.test(d.background)) errors.push("invalid background");
  if (!Array.isArray(d.layers) || d.layers.length > MAX_LAYERS) return [...errors, "invalid layers"];
  if (d.shape && shapeById.has(String(d.shape.type))) {
    const issues: ParamIssue[] = [];
    const shapeParams = omit(d.shape, ["type"]);
    const clean = sanitizeParams(shapeById.get(String(d.shape.type))!.params, shapeParams, issues);
    if (issues.length || Object.keys(clean).length !== Object.keys(shapeParams).length) errors.push("invalid shape parameters");
  }
  for (const layer of d.layers) {
    if (!layer || typeof layer !== "object" || (layer.kind !== "division" && layer.kind !== "emblem")) { errors.push("invalid layer"); continue; }
    const cat = catalogs[layer.kind];
    const def = cat.defs.get(String(layer.type));
    if (!def) { errors.push(`unknown ${layer.kind} ${String(layer.type).slice(0, 30)}`); continue; }
    const { id, hidden } = layer;
    const params = omit(layer, ["kind", "type", "id", "hidden"]);
    if (id !== undefined && (typeof id !== "string" || id.length > 40)) errors.push("invalid layer id");
    if (hidden !== undefined && typeof hidden !== "boolean") errors.push("invalid hidden flag");
    const issues: ParamIssue[] = [];
    const clean = sanitizeParams([...def.params, ...cat.common], params, issues);
    if (issues.length || Object.keys(clean).length !== Object.keys(params).length) errors.push(`invalid parameters on ${layer.type}`);
  }
  return errors;
}

export const allDivisionIds = () => [...divisionDefs.map((d) => d.id), ...divisionPresets.map((p) => p.id)];
export const allEmblemIds = () => [...emblemDefs.map((d) => d.id), ...emblemPresets.map((p) => p.id)];

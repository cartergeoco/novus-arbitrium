import { luminance } from "./color";
import { assetIndex, type AssetMeta } from "./assets";
import { normalizeFlag } from "./normalize";
import { nationalFlag } from "./presets";
import { renderFlagSvg } from "./render";
import { remixFlag } from "./remix";
import { themedRemix } from "./themed";
import { hashString, random } from "./svg";
import type { FlagDesign, FlagLayer } from "./types";

const colorKeys = ["color", "colors", "fimbriation", "inner", "outline", "itemColors", "edgeColor"];
const isHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** Distinct colors of a design in painting order (background first). */
export function flagColors(design: FlagDesign): string[] {
  const out: string[] = [];
  const add = (value: unknown) => {
    for (const c of Array.isArray(value) ? value : [value]) if (isHex(c) && !out.includes(c.toLowerCase())) out.push(c.toLowerCase());
  };
  add(design.background);
  for (const layer of design.layers) {
    if (layer.hidden) continue;
    for (const key of colorKeys) add(layer[key]);
  }
  add(design.shape.edgeColor);
  return out;
}

/** Replace colors everywhere in a design, e.g. {"#ff0000": "#0055a4"}. */
export function recolorFlag(design: FlagDesign, mapping: Record<string, string>): FlagDesign {
  const map = Object.fromEntries(Object.entries(mapping).map(([a, b]) => [a.toLowerCase(), b.toLowerCase()]));
  const swap = (value: unknown): unknown => Array.isArray(value) ? value.map(swap) : isHex(value) ? map[value.toLowerCase()] ?? value : value;
  const next = structuredClone(design);
  next.background = swap(next.background) as string;
  for (const layer of next.layers) for (const key of colorKeys) if (key in layer) (layer as Record<string, unknown>)[key] = swap(layer[key]);
  if (next.shape.edgeColor) next.shape.edgeColor = swap(next.shape.edgeColor) as string;
  return next;
}

const palettes = [
  ["#0055a4", "#ffffff", "#ef4135"], ["#006233", "#ffffff", "#d21034"], ["#000000", "#dd0000", "#ffce00"],
  ["#003893", "#fcd116", "#ce1126"], ["#009739", "#fedd00", "#012169"], ["#8d1b3d", "#ffffff"], ["#0a3161", "#b31942", "#ffffff"],
  ["#006a4e", "#f42a41", "#ffffff"], ["#01411c", "#ffffff", "#f1bf00"], ["#5b92e5", "#ffffff", "#f1bf00"], ["#3f2a78", "#f1bf00", "#ffffff"],
  ["#007a78", "#ffffff", "#e35205"], ["#7b3f00", "#f3e9d2", "#006233"], ["#c8102e", "#ffffff", "#000000"], ["#002147", "#c9a227", "#9b1b30"],
  ["#169b62", "#ffffff", "#ff883e"], ["#e4002b", "#fcd116", "#009739"], ["#0072c6", "#ffffff", "#d52b1e", "#fcd116"], ["#4d4d4d", "#f1bf00", "#c8102e"],
];

/** Keep automatic flags in sync with every bundled library asset. */
export const libraryPool = assetIndex.map((asset) => asset.id);
const celestialAssets = assetIndex.filter((asset) => asset.category === "celestial");

const motifPalettes: Record<string, string[][]> = {
  nautical: [["#002147", "#ffffff", "#007a78"], ["#003893", "#ffffff", "#f1bf00"]],
  sea_life: [["#002147", "#ffffff", "#007a78"], ["#003893", "#ffffff", "#f1bf00"]],
  plants: [["#006233", "#ffffff", "#f1bf00"], ["#01411c", "#f3e9d2", "#c9a227"]],
  nature: [["#006233", "#ffffff", "#f1bf00"], ["#01411c", "#f3e9d2", "#c9a227"]],
  celestial: [["#0a3161", "#ffffff", "#f1bf00"], ["#000000", "#ffffff", "#fcd116"]],
  heraldic: [["#8d1b3d", "#ffffff", "#c9a227"], ["#002147", "#ffffff", "#c9a227"]],
  crowns_regalia: [["#8d1b3d", "#ffffff", "#c9a227"], ["#002147", "#ffffff", "#c9a227"]],
  industry_science: [["#000000", "#ffffff", "#ffce00"], ["#002147", "#ffffff", "#e35205"]],
  tools: [["#000000", "#ffffff", "#ffce00"], ["#002147", "#ffffff", "#e35205"]],
  national: [["#0a3161", "#ffffff", "#c8102e"], ["#006233", "#ffffff", "#c9a227"]],
};

const contrastRatio = (a: string, b: string) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * A plausible flag from a seed. A supplied palette anchors the design; a neutral
 * backing is added only when contrast or multicolor artwork needs it.
 */
export function generateFlag(seed: string, palette?: string[], shape?: FlagDesign["shape"]): FlagDesign {
  const rand = random(hashString(seed));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const layout = pick(["asset", "asset", "asset", "cross", "canton", "chevron", "arc"]);
  const chosenAsset = layout === "asset" ? pick(assetIndex) : layout === "arc" ? pick(celestialAssets) : undefined;
  const choices = chosenAsset ? motifPalettes[chosenAsset.category] ?? palettes : palettes;
  const colors = [...new Set((palette?.length ? palette : pick(choices)).filter(isHex).map((color) => color.toLowerCase()))].slice(0, 4);
  if (!colors.length) colors.push("#0a3161", "#ffffff");
  colors.sort((a, b) => luminance(a) - luminance(b));
  let dark = colors[0], light = colors.at(-1)!;
  if (contrastRatio(dark, light) < 3) {
    const neutral = luminance(dark) > 0.45 ? "#000000" : "#ffffff";
    if (neutral === "#000000") dark = neutral;
    else light = neutral;
  }
  const accent = colors.find((color) => color !== dark && color !== light) ?? dark;
  const inkOn = (field: string) => [dark, accent, light].sort((a, b) => contrastRatio(b, field) - contrastRatio(a, field))[0];
  const division = (type: string, params: Record<string, unknown>): FlagLayer => ({ kind: "division", type, ...params } as FlagLayer);
  const emblem = (type: string, params: Record<string, unknown>): FlagLayer => ({ kind: "emblem", type, ...params } as FlagLayer);
  const asset = (meta: AssetMeta, field: string, params: Record<string, unknown>): FlagLayer =>
    emblem("asset", { asset: meta.id, color: inkOn(field),
      ...(meta.multicolor ? { outline: light, outlineWidth: 0.018 } : {}), ...params });
  const stripe = (type: string, stripeColors: string[], count: number, extra: Record<string, unknown> = {}) =>
    division(type, { colors: stripeColors, count, ...extra });

  // A central charge determines the field around it. Maritime marks get waves;
  // plants get calm bands; other marks get a clear central panel.
  const assetComposition = (meta: AssetMeta): { background: string; layers: FlagLayer[] } => {
    const field = meta.multicolor ? dark : light;
    const surround = meta.multicolor ? light : dark;
    if (["nautical", "sea_life"].includes(meta.category)) {
      return { background: surround, layers: [
        stripe("wavy_stripes", [surround, field], 3, { amplitude: 0.018, waves: 2 }),
        division("solid", { color: field, area: { x: 0.34, y: 0.17, w: 0.32, h: 0.66 } }),
        asset(meta, field, { x: 0.5, y: 0.5, scale: 0.46 }),
      ] };
    }
    if (["plants", "nature", "mammals", "birds", "insects_reptiles"].includes(meta.category)) {
      return { background: surround, layers: [
        stripe("horizontal_stripes", [surround, field, surround], 3, { weights: [1, 2.2, 1] }),
        asset(meta, field, { x: 0.5, y: 0.5, scale: 0.42 }),
      ] };
    }
    return { background: surround, layers: [
      stripe("vertical_stripes", [surround, field, surround], 3, { weights: [1, 1.7, 1] }),
      asset(meta, field, { x: 0.5, y: 0.5, scale: meta.multicolor ? 0.43 : 0.47 }),
    ] };
  };
  const starArc = (meta: AssetMeta): { background: string; layers: FlagLayer[] } => {
    const field = meta.multicolor ? light : dark;
    const mark = inkOn(field);
    return { background: field, layers: [
      emblem("star", { color: mark, points: 5, arrangement: "arc", count: 5,
        x: 0.5, y: 0.54, scale: 0.68, startAngle: -70, endAngle: 70 }),
      asset(meta, field, { x: 0.5, y: 0.69, scale: 0.28 }),
    ] };
  };
  const nestedCross = (): { background: string; layers: FlagLayer[] } => {
    const inner = contrastRatio(accent, light) >= 3 ? accent : dark;
    const kind = pick(["cross", "cross", "saltire", "union"]);
    const x = kind === "union" ? 0.5 : pick([0.375, 0.5]);
    const cross = (type: string, color: string, thickness: number) =>
      division(type, { colors: [color], thickness, ...(type === "cross" ? { x, y: 0.5 } : {}) });
    return { background: dark, layers: kind === "union"
      ? [cross("saltire", light, 0.23), cross("saltire", inner, 0.11), cross("cross", light, 0.28), cross("cross", inner, 0.13)]
      : [cross(kind, light, 0.27), cross(kind, inner, 0.12)] };
  };
  const cantonStars = (): { background: string; layers: FlagLayer[] } => {
    const panel = contrastRatio(accent, light) >= 3 ? accent : dark;
    return { background: dark, layers: [
      stripe("horizontal_stripes", [dark, light], pick([5, 7, 9])),
      division("canton", { color: panel, width: 0.46, height: 0.56 }),
      emblem("star", { color: inkOn(panel), points: 5, arrangement: "grid", count: 9,
        rows: 3, cols: 3, x: 0.23, y: 0.28, width: 0.34, height: 0.4, scale: 0.5 }),
    ] };
  };
  const chevronStar = (): { background: string; layers: FlagLayer[] } => {
    const panel = contrastRatio(accent, light) >= 3 ? accent : dark;
    return { background: dark, layers: [
      stripe("horizontal_stripes", [dark, light, dark], 3),
      division("triangle", { side: "hoist", depth: 0.42, color: panel }),
      emblem("star", { color: inkOn(panel), points: 5, x: 0.13, y: 0.5, scale: 0.25 }),
    ] };
  };
  const composition = layout === "asset" ? assetComposition(chosenAsset!)
    : layout === "cross" ? nestedCross()
      : layout === "canton" ? cantonStars()
        : layout === "chevron" ? chevronStar()
          : starArc(chosenAsset!);
  return normalizeFlag({ shape: shape ?? pick(["rectangle_standard", "rectangle_standard", "rectangle_long", "rectangle_wide"]),
    background: composition.background, layers: composition.layers }).design;
}

/** Starting flag for a nation: the real flag when known, otherwise a seeded design. */
export function makeFlag(id: string): FlagDesign {
  return nationalFlag(id) ?? generateFlag("nation:" + id);
}

/** A readable design inspired by the flag's palette and defining motifs. */
export function deriveFlag(parent: FlagDesign, seed: string, options: { inspiration?: FlagDesign; nationId?: string } = {}): FlagDesign {
  const source = normalizeFlag(parent).design;
  if (!source.layers.some((l) => !l.hidden && l.opacity !== 0 && l.type !== "solid")) {
    return generateFlag(seed, flagColors(source), source.shape);
  }
  const original = renderFlagSvg(source, { idPrefix: "remix" });
  for (let attempt = 0; attempt < 8; attempt++) {
    const key = `${seed}:${attempt}`;
    const next = themedRemix(source, key, options.inspiration, options.nationId) ?? remixFlag(source, key);
    if (renderFlagSvg(next, { idPrefix: "remix" }) !== original) return next;
  }
  return remixFlag(source, seed + ":fallback");
}

export function isSameDesign(a: FlagDesign, b: FlagDesign) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function layerLabel(layer: FlagLayer) {
  return layer.type === "asset" ? String(layer.asset) : layer.type.replace(/_/g, " ");
}

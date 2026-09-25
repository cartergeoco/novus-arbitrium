import { arrange } from "./arrangements";
import { assetIndex, assetMeta } from "./assets";
import { luminance } from "./color";
import { normalizeFlag, validateStoredFlag } from "./normalize";
import { layerParams, shapeInfo } from "./render";
import { hashString, random } from "./svg";
import type { FlagDesign, FlagLayer } from "./types";

const stripeTypes = new Set(["horizontal_stripes", "vertical_stripes", "diagonal_stripes", "wavy_stripes"]);
const isColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const contrast = (a: string, b: string) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const unique = (values: string[]) => [...new Set(values.map((v) => v.toLowerCase()))];
const genericTags = new Set(["national", "arms", "emblem", "symbol", "flag", "heraldry", "escutcheon"]);
const neutralModifiers = new Set(["bordered", "checked", "round", "imperial", "queen", "jewel", "crenulated", "crenel", "winged", "sharp", "of", "the"]);
const tagFrequency = new Map<string, number>();
for (const asset of assetIndex.filter((item) => item.category !== "national")) {
  for (const tag of new Set(asset.tags)) tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
}

/** Search the complete library for a symbol that shares the source flag's vocabulary. */
function relatedAsset(source: FlagLayer | undefined, nationId: string | undefined, rand: () => number): string | undefined {
  const original = source?.type === "asset" ? String(source.asset) : undefined;
  const sourceMeta = original ? assetMeta(original) : undefined;
  const terms = new Set<string>(nationId === "USA"
    ? ["eagle", "liberty", "torch", "laurel", "dove", "olive", "oak", "justice", "bell", "capitol", "monument", "scale"]
    : []);
  if (sourceMeta) for (const tag of sourceMeta.tags) {
    if (tag.length > 3 && tag !== sourceMeta.category && !genericTags.has(tag) && tagFrequency.has(tag)) terms.add(tag);
  }
  if (!terms.size) return original;
  const choices = assetIndex.flatMap((asset) => {
    // A different country's complete coat of arms would change the flag's identity.
    if (asset.category === "national" && asset.id !== original) return [];
    if (sourceMeta?.category === "national" && asset.id !== original) {
      if (asset.category === "mythical") return [];
      const hasSpecificMatch = asset.tags.some((tag) => terms.has(tag) && (tagFrequency.get(tag) ?? 0) <= 3);
      const unrelatedName = asset.id.split(":")[1].split("-").some((word) => !terms.has(word) && !neutralModifiers.has(word));
      if (!hasSpecificMatch && unrelatedName) return [];
    }
    const score = asset.tags.reduce((sum, tag) => sum + (terms.has(tag) ? 1 / Math.sqrt(tagFrequency.get(tag) ?? 1) : 0), 0);
    const weight = asset.id === original ? 0.8 : score ** 2;
    return weight > 0 ? [{ id: asset.id, weight }] : [];
  });
  const total = choices.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of choices) if ((roll -= item.weight) < 0) return item.id;
  return original;
}

function palette(design: FlagDesign) {
  const colors: string[] = [design.background];
  for (const layer of design.layers) {
    if (layer.hidden || layer.opacity === 0) continue;
    for (const key of ["color", "colors", "fimbriation", "outline", "itemColors"]) {
      const value = layer[key];
      for (const c of Array.isArray(value) ? value : [value]) if (isColor(c)) colors.push(c);
    }
    if (layer.type === "star" && layer.color === undefined) colors.push(layerParams(layer).color as string);
  }
  return unique(colors.filter(isColor));
}

function bestAgainst(field: string, choices: string[]) {
  return [...choices].sort((a, b) => contrast(b, field) - contrast(a, field))[0];
}

type Region = { x: number; y: number; w: number; h: number };
const inRegion = (layer: FlagLayer, design: FlagDesign, region: Region) => {
  const { body } = shapeInfo(design);
  const instances = arrange(layerParams(layer), body, new Set(Object.keys(layer)));
  const margin = 0.012 * body.h;
  return instances.length > 0 && instances.every((instance) =>
    instance.x - instance.size / 2 >= body.x + region.x * body.w + margin
    && instance.x + instance.size / 2 <= body.x + (region.x + region.w) * body.w - margin
    && instance.y - instance.size / 2 >= body.y + region.y * body.h + margin
    && instance.y + instance.size / 2 <= body.y + (region.y + region.h) * body.h - margin);
};

/** Deliberately bounded arrangements: large enough to recognize, few enough to read. */
function starLayer(region: Region, color: string, rand: () => number): FlagLayer {
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const arrangement = pick(["single", "row", "column", "grid", "staggered", "rows", "ring", "arc", "semicircle", "quincunx", "pyramid", "diagonal", "cluster", "scatter"]);
  const counts: Record<string, number[]> = {
    row: [3, 5, 7], column: [3, 5], grid: [6, 9, 12], staggered: [8, 11],
    rows: [8, 11], ring: [5, 7, 9, 12, 13], arc: [5, 7, 9], semicircle: [5, 7],
    pyramid: [6, 10], diagonal: [3, 5], cluster: [5, 7], scatter: [7, 9],
  };
  const count = pick(counts[arrangement] ?? [1]);
  const size = Math.min(region.h, region.w * 2) * 0.64;
  return {
    kind: "emblem", type: "star", color, points: 5, arrangement, count,
    x: region.x + region.w / 2, y: region.y + region.h / 2,
    scale: arrangement === "single" ? size * 0.8 : size,
    width: region.w * 0.7, height: region.h * 0.7,
    ...(arrangement === "grid" ? { rows: count === 12 ? 3 : count === 9 ? 3 : 2, cols: count === 12 ? 4 : 3 } : {}),
    ...(arrangement === "staggered" ? { rows: 3, cols: count === 11 ? 4 : 3 } : {}),
    ...(arrangement === "rows" ? { pattern: count === 11 ? "4,3,4" : "3,2,3" } : {}),
    ...(arrangement === "scatter" ? { seed: Math.floor(rand() * 99999) } : {}),
  };
}

/** Simple emblem flags can vary their fields without losing the national mark. */
function emblemRemix(parent: FlagDesign, reference: FlagDesign, sourceLayers: FlagLayer[], seed: string, nationId?: string): FlagDesign | undefined {
  const motif = sourceLayers.filter((l) => l.kind === "emblem");
  if (motif.length !== 1 || sourceLayers.some((l) => l.kind === "division" && l.type !== "solid")) return;
  const original = motif[0], p = layerParams(original);
  if (!["circle", "sun", "star", "crescent", "star_and_crescent", "asset"].includes(original.type) || p.arrangement !== "single") return;
  const rand = random(hashString(seed));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const colors = unique([...palette(parent), ...palette(reference), p.color as string].filter(isColor));
  const emblemColor = isColor(original.color) ? original.color
    : colors.find((c) => c !== parent.background && contrast(c, parent.background) >= 3) ?? p.color as string;
  const field = contrast(emblemColor, parent.background) >= 3 ? parent.background
    : bestAgainst(emblemColor, colors.length > 1 ? colors.filter((c) => c !== emblemColor) : ["#ffffff", "#000000"]);
  if (!field || contrast(emblemColor, field) < 3) return;
  const layout = pick(original.type === "asset" ? ["horizontal", "vertical", "border"] : ["horizontal", "vertical", "border", "band"]);
  const layers: FlagLayer[] = [];
  const background = field;
  let ink = emblemColor, scale = 0.45;
  if (layout === "horizontal") {
    layers.push({ kind: "division", type: "horizontal_stripes", count: 3, colors: [emblemColor, field, emblemColor], weights: [1, pick([2.2, 2.7, 3.2]), 1] });
    scale = pick([0.34, 0.38, 0.42]);
  } else if (layout === "vertical") {
    layers.push({ kind: "division", type: "vertical_stripes", count: 3, colors: [emblemColor, field, emblemColor], weights: [1, pick([1.8, 2.3, 2.8]), 1] });
    scale = pick([0.44, 0.49, 0.54]);
  } else if (layout === "border") {
    layers.push({ kind: "division", type: "border", color: emblemColor, width: pick([0.055, 0.075, 0.095]) });
    scale = pick([0.44, 0.49, 0.54]);
  } else {
    layers.push({ kind: "division", type: "band", color: emblemColor, width: pick([0.45, 0.5, 0.55]) });
    ink = field;
    scale = pick([0.34, 0.38, 0.42]);
  }
  if (original.type === "star_and_crescent" || original.type === "crescent") scale = Math.min(0.68, scale * 1.25);
  // National artwork keeps its own pigments; simple shapes may reverse colors.
  layers.push({ ...original, hidden: false, ...(original.type === "asset" ? { asset: relatedAsset(original, nationId, rand) } : {}),
    color: ink, x: layout === "band" ? 0.5 : pick([0.43, 0.5, 0.57]), y: 0.5, scale });
  const design = normalizeFlag({ shape: parent.shape, background, layers }).design;
  return validateStoredFlag(design).length ? undefined : design;
}

/** Build one readable composition from a striped flag's visual vocabulary. */
export function themedRemix(parent: FlagDesign, seed: string, inspiration?: FlagDesign, nationId?: string): FlagDesign | undefined {
  const reference = inspiration ?? parent;
  if (parent.shape.type !== "rectangle") return;
  const sourceLayers = reference.layers.filter((l) => !l.hidden && l.opacity !== 0);
  const originalStripe = sourceLayers.find((l) => l.kind === "division" && stripeTypes.has(l.type));
  if (!originalStripe) return emblemRemix(parent, reference, sourceLayers, seed, nationId);
  if (sourceLayers.some((l) => l.kind === "division" && l !== originalStripe && l.type !== "canton")) return;
  const symbols = sourceLayers.filter((l) => l.kind === "emblem");
  if (symbols.length > 1) return;
  const motif = symbols[0];
  if (motif && motif.type !== "star" && motif.type !== "asset") return;

  const rand = random(hashString(seed));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const currentColors = palette(parent);
  const referenceColors = palette(reference);
  const colors = unique([...currentColors, ...referenceColors]).slice(0, 6);
  const sourceStripe = parent.layers.find((l) => l.kind === "division" && stripeTypes.has(l.type)) ?? originalStripe;
  const stripeColors = (layerParams(sourceStripe).colors as string[]).filter(isColor);
  let pair = unique(stripeColors).slice(0, 2);
  if (pair.length < 2 || contrast(pair[0], pair[1]) < 3) {
    pair = [colors[0], bestAgainst(colors[0], colors.slice(1))];
  }
  if (!pair[1] || contrast(pair[0], pair[1]) < 3) pair = [pair[0], luminance(pair[0]) > 0.4 ? "#000000" : "#ffffff"];
  const accent = colors.find((c) => !pair.includes(c) && contrast(c, pair[1]) >= 3)
    ?? colors.find((c) => !pair.includes(c)) ?? pair[0];
  const light = luminance(pair[0]) >= luminance(pair[1]) ? pair[0] : pair[1];
  const dark = light === pair[0] ? pair[1] : pair[0];
  const field = motif?.type === "asset" ? [...colors].sort((a, b) => luminance(b) - luminance(a))[0] : accent;
  const paletteInk = bestAgainst(field, unique([motif?.color as string, ...colors].filter(isColor)));
  const ink = paletteInk && contrast(paletteInk, field) >= 3 ? paletteInk : bestAgainst(field, ["#ffffff", "#000000"]);

  // These layouts use separate passes for background, panel and charge. Their
  // sizes and positions are calibrated together, rather than placed at random.
  const layout = motif?.type === "star"
    ? pick(nationId === "USA" ? ["canton", "panel", "band", "triangle", "stars", "stripes", "eagle"] : ["canton", "panel", "band", "triangle", "stars", "stripes"])
    : pick(motif ? ["canton", "panel", "panel", "canton"] : ["canton", "panel", "band", "stripes"]);
  const layers: FlagLayer[] = [];
  let background = pair[0];
  let symbolRegion: Region | undefined;
  let symbolField = field;
  const stripes = () => {
    const type = pick(motif?.type === "asset" ? ["horizontal_stripes", "vertical_stripes"]
      : ["horizontal_stripes", "vertical_stripes", "diagonal_stripes", "wavy_stripes"]);
    const tricolor = motif?.type === "asset" && unique(stripeColors).length >= 3;
    const count = tricolor ? 3 : pick(type === "horizontal_stripes" || type === "vertical_stripes" ? [3, 5, 7, 9, 13] : [3, 5, 7]);
    const layer: FlagLayer = { kind: "division", type, colors: tricolor ? unique(stripeColors).slice(0, 3) : pair, count };
    if (type === "diagonal_stripes") layer.direction = pick(["up", "down"]);
    if (type === "wavy_stripes") { layer.amplitude = 0.018; layer.waves = 2; }
    layers.push(layer);
    return layer;
  };
  const panel = (area: Region, color: string) => {
    layers.push({ kind: "division", type: "solid", color, area });
    symbolRegion = { x: area.x + area.w * 0.1, y: area.y + area.h * 0.1, w: area.w * 0.8, h: area.h * 0.8 };
    symbolField = color;
  };

  if (layout === "canton") {
    stripes();
    const area = pick<Region>([
      { x: 0, y: 0, w: 0.42, h: 0.55 }, { x: 0, y: 0.45, w: 0.42, h: 0.55 },
      { x: 0.58, y: 0, w: 0.42, h: 0.55 }, { x: 0.58, y: 0.45, w: 0.42, h: 0.55 },
    ]);
    panel(area, field);
  } else if (layout === "panel") {
    stripes();
    panel(pick<Region>([
      { x: 0, y: 0, w: 0.38, h: 1 }, { x: 0.62, y: 0, w: 0.38, h: 1 },
      { x: 0, y: 0.3, w: 1, h: 0.4 },
    ]), field);
  } else if (layout === "band") {
    stripes();
    panel(pick<Region>([
      { x: 0, y: 0.28, w: 1, h: 0.44 }, { x: 0.32, y: 0, w: 0.36, h: 1 },
    ]), field);
  } else if (layout === "triangle") {
    stripes();
    layers.push({ kind: "division", type: "triangle", side: "hoist", depth: 0.42, color: field });
    symbolRegion = { x: 0.04, y: 0.32, w: 0.2, h: 0.36 };
  } else if (layout === "stars") {
    background = field;
    layers.push({ kind: "division", type: "border", color: light, width: 0.09 });
    layers.push({ kind: "division", type: "border", color: dark, width: 0.04 });
    symbolRegion = { x: 0.19, y: 0.15, w: 0.62, h: 0.7 };
  } else if (layout === "eagle") {
    background = pair[0];
    layers.push({ kind: "division", type: "diagonal_split", colors: pair, direction: pick(["up", "down"]) });
    panel({ x: 0.32, y: 0, w: 0.36, h: 1 }, accent);
    layers.push({ kind: "emblem", type: "asset", asset: relatedAsset(motif, nationId, rand) ?? "gi:eagle-emblem",
      color: bestAgainst(accent, ["#ffffff", "#000000"]), x: 0.5, y: 0.5, scale: 0.55 });
  } else {
    stripes();
    // A quiet striped option gives repeated remixes a breather.
    if (motif?.type === "star") layers.push({ kind: "division", type: "triangle", side: "hoist", depth: 0.34, color: field });
  }

  const region = symbolRegion;
  if (region && motif && layout !== "eagle") {
    if (motif.type === "star") {
      const star = starLayer(region, contrast(ink, symbolField) >= 3 ? ink : bestAgainst(symbolField, ["#ffffff", "#000000"]), rand);
      if (layout === "triangle") Object.assign(star, { arrangement: "single", count: 1,
        scale: Math.min(region.h, region.w * 2) * 0.7 });
      // If an arrangement approaches the panel edge, use a simpler centered star.
      let candidate = normalizeFlag({ shape: parent.shape, background, layers: [...layers, star] }).design;
      const legible = () => {
        const layer = candidate.layers.at(-1)!;
        const { body } = shapeInfo(candidate);
        return inRegion(layer, candidate, region)
          && arrange(layerParams(layer), body, new Set(Object.keys(layer))).every((instance) => instance.size / body.h >= 0.05);
      };
      if (!legible()) {
        Object.assign(star, { arrangement: "single", count: 1, scale: Math.min(region.h, region.w * 2) * 0.45 });
        candidate = normalizeFlag({ shape: parent.shape, background, layers: [...layers, star] }).design;
      }
      if (!legible()) return;
      layers.push(star);
    } else {
      // Multicolor national artwork reads best on a light panel.
      const scale = Math.min(region.h, region.w * 2) * 0.76;
      layers.push({ kind: "emblem", type: "asset", asset: relatedAsset(motif, nationId, rand) ?? motif.asset!,
        color: contrast(ink, symbolField) >= 3 ? ink : bestAgainst(symbolField, ["#ffffff", "#000000"]),
        x: region.x + region.w / 2, y: region.y + region.h / 2, scale });
    }
  }

  const design = normalizeFlag({ shape: parent.shape, background, layers }).design;
  if (validateStoredFlag(design).length || design.layers.length > 4) return;
  if (contrast(pair[0], pair[1]) < 3) return;
  if (motif && layout !== "stripes" && layout !== "eagle" && !design.layers.some((l) => l.kind === "emblem")) return;
  return design;
}

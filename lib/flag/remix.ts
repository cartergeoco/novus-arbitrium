import { arrange } from "./arrangements";
import { emblemById } from "./emblems";
import { normalizeFlag } from "./normalize";
import { num, str, type Area } from "./params";
import { layerParams, shapeInfo } from "./render";
import { hashString, random, type Box } from "./svg";
import type { FlagDesign, FlagLayer } from "./types";

const stripes = new Set(["horizontal_stripes", "vertical_stripes", "diagonal_stripes"]);
const crosses = new Set(["cross", "full_cross", "saltire", "full_saltire"]);
const visible = (layer: FlagLayer) => !layer.hidden && layer.opacity !== 0;
const fullArea = (layer: FlagLayer) => {
  const a = layerParams(layer).area as Area;
  return a.x === 0 && a.y === 0 && a.w === 1 && a.h === 1;
};
const round = (value: number) => Math.round(value * 100000) / 100000;

function bounds(layers: FlagLayer[], body: Box): Box | undefined {
  const instances = layers.flatMap((layer) => arrange(layerParams(layer), body, new Set(Object.keys(layer))));
  if (!instances.length) return;
  const left = Math.min(...instances.map((i) => i.x - i.size / 2));
  const top = Math.min(...instances.map((i) => i.y - i.size / 2));
  return {
    x: left, y: top,
    w: Math.max(...instances.map((i) => i.x + i.size / 2)) - left,
    h: Math.max(...instances.map((i) => i.y + i.size / 2)) - top,
  };
}

/** Move a composite emblem together: crescents and stars, shields and backing discs, etc. */
function transformEmblems(layers: FlagLayer[], body: Box, scale: number, from: [number, number], to: [number, number]) {
  for (const layer of layers) {
    const p = layerParams(layer);
    const canton = p.arrangement === "canton";
    const x = canton && layer.x === undefined ? 0.2 : num(p, "x");
    const y = canton && layer.y === undefined ? 7 / 26 : num(p, "y");
    layer.x = round((body.x + x * body.w - from[0]) * scale / body.w + (to[0] - body.x) / body.w);
    layer.y = round((body.y + y * body.h - from[1]) * scale / body.h + (to[1] - body.y) / body.h);
    layer.scale = round(num(p, "scale") * scale);
    const width = canton && layer.width === undefined ? 0.4 : num(p, "width");
    const height = canton && layer.height === undefined ? 7 / 13 : num(p, "height");
    if (width > 0) layer.width = round(width * scale);
    if (height > 0) layer.height = round(height * scale);
  }
}

function fitEmblems(layers: FlagLayer[], body: Box, target: Area) {
  const box = bounds(layers, body);
  if (!box || !box.w || !box.h) return;
  const scale = Math.min(target.w * body.w / box.w, target.h * body.h / box.h) * 0.82;
  transformEmblems(layers, body, scale, [box.x + box.w / 2, box.y + box.h / 2],
    [body.x + (target.x + target.w / 2) * body.w, body.y + (target.y + target.h / 2) * body.h]);
}

/** Recompose inherited motifs instead of selecting unrelated symbols from the random catalog. */
export function remixFlag(parent: FlagDesign, seed: string): FlagDesign {
  const next = structuredClone(parent);
  next.layers = next.layers.filter(visible);
  const rand = random(hashString(seed));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const divisions = next.layers.filter((l) => l.kind === "division");
  const emblems = next.layers.filter((l) => l.kind === "emblem");
  const { body } = shapeInfo(next);
  const hasSpan = emblems.some((l) => emblemById.get(l.type)?.span);
  const stripe = divisions.find((l) => stripes.has(l.type) && fullArea(l));
  const canton = divisions.find((l) => l.type === "canton");
  const finish = () => normalizeFlag(next).design;

  // A star field (or crescent, cross, constellation...) stays on its own colored panel.
  // Repeated remixes recognize the panel's area as well as an original corner canton.
  if (canton && !hasSpan && divisions.every((l) => l === canton || l === stripe)) {
    const p = layerParams(canton), area = p.area as Area;
    const w = num(p, "width") * area.w, h = num(p, "height") * area.h;
    const x = area.x + (str(p, "corner").endsWith("fly") ? area.w - w : 0);
    const y = area.y + (str(p, "corner").startsWith("lower") ? area.h - h : 0);
    const group = bounds(emblems, body);
    const inCanton = !group || (group.x >= body.x + x * body.w - 1 && group.y >= body.y + y * body.h - 1
      && group.x + group.w <= body.x + (x + w) * body.w + 1 && group.y + group.h <= body.y + (y + h) * body.h + 1);
    if (inCanton) {
      const target = pick<Area>([
        { x: 0, y: 0, w: 0.34, h: 1 }, { x: 0.66, y: 0, w: 0.34, h: 1 },
        { x: 0, y: 0.28, w: 1, h: 0.44 }, { x: 0.3, y: 0, w: 0.4, h: 1 },
        { x: 0, y: 0, w: 0.48, h: 0.64 },
      ]);
      Object.assign(canton, { area: target, width: 1, height: 1, corner: "upper_hoist" });
      if (stripe) {
        stripe.type = pick([...stripes].filter((type) => type !== stripe.type));
        if (stripe.type === "diagonal_stripes") stripe.direction = pick(["up", "down"]);
      }
      fitEmblems(emblems, body, target);
      return finish();
    }
  }

  // Tricolors and tribands retain their color order. Move the emblem with its field.
  if (stripe && divisions.length === 1 && !hasSpan) {
    const p = layerParams(stripe), count = num(p, "count");
    const group = bounds(emblems, body);
    const vertical = stripe.type === "vertical_stripes";
    const center = group ? (vertical ? (group.x + group.w / 2 - body.x) / body.w : (group.y + group.h / 2 - body.y) / body.h) : 0.5;
    const oldWeights = p.weights as number[] | undefined;
    const weights = oldWeights?.length === count ? oldWeights : Array<number>(count).fill(1);
    const sum = weights.reduce((a, b) => a + b, 0);
    let field = 0, end = weights[0] / sum;
    while (field < count - 1 && center > end) end += weights[++field] / sum;
    stripe.type = pick((emblems.length ? ["horizontal_stripes", "vertical_stripes"] : [...stripes]).filter((type) => type !== stripe.type));
    if (stripe.type === "diagonal_stripes") stripe.direction = pick(["up", "down"]);
    const newWeights = Array<number>(count).fill(1);
    newWeights[field] = emblems.length ? pick([2, 2.5, 3]) : pick([1.5, 2, 2.5]);
    stripe.weights = newWeights;
    const total = newWeights.reduce((a, b) => a + b, 0);
    const start = field / total, size = newWeights[field] / total;
    fitEmblems(emblems, body, stripe.type === "vertical_stripes"
      ? { x: start, y: 0.06, w: size, h: 0.88 }
      : { x: 0.06, y: start, w: 0.88, h: size });
    return finish();
  }

  // Keep layered Nordic crosses aligned, including the outer contrasting cross.
  if (next.layers.length && next.layers.every((l) => crosses.has(l.type))) {
    const outer = Math.max(...next.layers.map((l) => num(layerParams(l), "thickness")));
    const factor = pick([0.14, 0.22, 0.3]) / outer;
    const x = pick([0.28, 0.36, 0.44]);
    for (const layer of next.layers) {
      const p = layerParams(layer);
      layer.thickness = round(num(p, "thickness") * factor);
      if (num(p, "verticalThickness") > 0) layer.verticalThickness = round(num(p, "verticalThickness") * factor);
      if (num(p, "fimbriationWidth") > 0) layer.fimbriationWidth = round(num(p, "fimbriationWidth") * factor);
      if (layer.type !== "saltire") { layer.x = x; layer.y = 0.5; }
    }
    return finish();
  }

  // A plain field gives a composite emblem room to change size and placement.
  if (!hasSpan && emblems.length && next.shape.type === "rectangle"
    && divisions.every((l) => l.type === "solid" && fullArea(l))) {
    fitEmblems(emblems, body, pick<Area>([
      { x: 0.06, y: 0.1, w: 0.45, h: 0.8 }, { x: 0.49, y: 0.1, w: 0.45, h: 0.8 },
      { x: 0.15, y: 0.15, w: 0.7, h: 0.7 }, { x: 0.2, y: 0.05, w: 0.6, h: 0.9 },
    ]));
    return finish();
  }

  // More intricate flags retain their composition and layer order. Adjust only
  // pattern geometry, so trigrams, ornaments, text and overlapping charges survive.
  let changed = false;
  for (const layer of divisions) {
    const p = layerParams(layer);
    const key = ["rayShare", "amplitude", "depth", "thickness", "width"].find((k) => typeof p[k] === "number" && num(p, k) > 0);
    if (layer.type === "pattern") {
      layer.rotation = pick([0, 30, 45, 60]);
      layer.size = pick([0.08, 0.14, 0.22]);
      changed = true;
    } else if (key) {
      // Stay in the original size band: fine separators must remain fine, and
      // repeated remixes must not continually multiply a width toward zero.
      const band = 2 ** Math.floor(Math.log2(num(p, key)));
      layer[key] = round(band * pick([1.1, 1.4, 1.7]));
      if (key === "depth" && p.equilateral) layer.equilateral = false;
      changed = true;
    }
  }
  const spans = emblems.filter((l) => emblemById.get(l.type)?.span);
  const outerThickness = Math.max(0, ...spans.map((l) => Number(layerParams(l).thickness) || 0));
  const thicknessFactor = outerThickness ? pick([0.1, 0.18, 0.26]) / outerThickness : 1;
  for (const layer of spans) {
    const p = layerParams(layer);
    if (num(p, "thickness") > 0) {
      layer.thickness = round(num(p, "thickness") * thicknessFactor);
      if (num(p, "verticalThickness") > 0) layer.verticalThickness = round(num(p, "verticalThickness") * thicknessFactor);
    } else if (num(p, "size") > 0) layer.size = pick([0.22, 0.36, 0.5]);
    changed = true;
  }
  if (!hasSpan && emblems.length) {
    const box = bounds(emblems, body);
    if (box) {
      const center: [number, number] = [box.x + box.w / 2, box.y + box.h / 2];
      // Choose an absolute extent so repeated remixes cannot shrink symbols away.
      const currentExtent = Math.max(box.w / body.w, box.h / body.h);
      const sizes = currentExtent < 0.3 ? [0.14, 0.2, 0.26]
        : currentExtent < 0.55 ? [0.34, 0.42, 0.5]
        : currentExtent < 0.85 ? [0.6, 0.7, 0.8] : [0.9, 1, 1.1];
      const extent = pick(sizes.filter((v) => Math.abs(v - currentExtent) > 0.02));
      transformEmblems(emblems, body, extent / currentExtent, center, center);
      changed = true;
    }
  }
  if (!changed) {
    // Fixed composites such as a Union Jack can become a broad band or inset panel.
    const inset = pick([0.06, 0.12, 0.18]);
    const areas = divisions.map((l) => layerParams(l).area as Area);
    const top = Math.min(...areas.map((a) => a.y));
    const height = Math.max(...areas.map((a) => a.y + a.h)) - top;
    for (const layer of divisions) {
      const area = layerParams(layer).area as Area;
      layer.area = { x: area.x, y: inset + (area.y - top) / height * (1 - 2 * inset), w: area.w, h: area.h / height * (1 - 2 * inset) };
    }
  }
  return finish();
}

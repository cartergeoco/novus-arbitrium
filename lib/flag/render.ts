import { arrange } from "./arrangements";
import { getAsset } from "./assets";
import { divisionById, divisionCommon } from "./divisions";
import { emblemById, emblemCommon, monochrome } from "./emblems";
import { FULL_AREA, list, num, resolveParams, str, type Area, type Params } from "./params";
import { bodyBox, shapeById } from "./shapes";
import { CANVAS, attrs, hashString, n, subBox, type Box } from "./svg";
import type { AssetBody, FlagDesign, FlagLayer } from "./types";

export type RenderOptions = {
  /** Prefix for internal ids; defaults to a hash of the design so output is stable. */
  idPrefix?: string;
  width?: number;
  height?: number;
  /** Fill for the canvas outside the flag body (default transparent). */
  canvas?: string;
  title?: string;
  /** Override asset lookup, e.g. for server-side rendering. */
  getAsset?: (id: string) => AssetBody | undefined;
};

const layerKeys = new Set(["kind", "type", "id", "hidden"]);

export function shapeInfo(design: Pick<FlagDesign, "shape">) {
  const def = shapeById.get(design.shape?.type) ?? shapeById.get("rectangle")!;
  const params = resolveParams(def.params, design.shape ?? {});
  const body = bodyBox(def.ratio(params));
  return { def, params, body, outline: def.outline(params, body) };
}

export function layerParams(layer: FlagLayer): Params {
  const def = layer.kind === "division" ? divisionById.get(layer.type) : emblemById.get(layer.type);
  if (!def) return {};
  const common = layer.kind === "division" ? divisionCommon : emblemCommon;
  return resolveParams([...def.params, ...common], layer, def.defaults);
}

/** Recolor markup to one color and namespace its ids, for outline silhouettes. */
function silhouette(markup: string, color: string, suffix: string) {
  return monochrome(markup)
    .replace(/currentColor/g, color)
    .replace(/\bid="([^"]+)"/g, `id="$1${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1${suffix})`)
    .replace(/href="#([^"]+)"/g, `href="#$1${suffix}"`);
}

function scopeIds(markup: string, prefix: string) {
  return markup
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

function renderDivision(layer: FlagLayer, body: Box, uid: string) {
  const def = divisionById.get(layer.type);
  if (!def) return "";
  const p = layerParams(layer);
  const a = p.area as Area;
  const frame = subBox(body, a);
  let out = def.render(p, { body, frame, uid } as never);
  const full = a.x === FULL_AREA.x && a.y === FULL_AREA.y && a.w === FULL_AREA.w && a.h === FULL_AREA.h;
  if (!full) out = `<clipPath id="${uid}-a"><rect${attrs({ x: frame.x, y: frame.y, width: frame.w, height: frame.h })}/></clipPath><g clip-path="url(#${uid}-a)">${out}</g>`;
  return num(p, "opacity") < 1 ? `<g opacity="${n(num(p, "opacity"))}">${out}</g>` : out;
}

function renderEmblem(layer: FlagLayer, body: Box, uid: string, lookup: (id: string) => AssetBody | undefined) {
  const def = emblemById.get(layer.type);
  if (!def) return "";
  const p = layerParams(layer);
  const explicit = new Set(Object.keys(layer).filter((k) => !layerKeys.has(k)));
  const instances = arrange(p, body, explicit);
  const cycle = list(p, "itemColors");
  const outline = str(p, "outline"), ow = num(p, "outlineWidth");
  const sx = p.mirror ? -1 : 1, sy = p.flip ? -1 : 1;
  let under = "", over = "", defs = "";

  const asset = layer.type === "asset" ? lookup(str(p, "asset")) : undefined;
  if (asset) {
    const [vx, vy, vw, vh] = asset.viewBox;
    const unit = Math.max(vw, vh);
    const body0 = scopeIds(asset.multicolor && str(p, "recolor") === "mono" ? monochrome(asset.body) : asset.body, `${uid}-`);
    defs += `<g id="${uid}-a">${body0}</g>`;
    if (outline !== "none") defs += `<g id="${uid}-s">${silhouette(body0, "currentColor", "-s")}</g>`;
    for (const inst of instances) {
      const s = inst.size / unit;
      const transform = `translate(${n(inst.x)} ${n(inst.y)}) rotate(${n(num(p, "rotation") + inst.rotation)}) scale(${n(s * sx)} ${n(s * sy)}) translate(${n(-vx - vw / 2)} ${n(-vy - vh / 2)})`;
      const color = cycle.length ? cycle[inst.index % cycle.length] : str(p, "color");
      if (outline !== "none") under += `<use${attrs({ href: `#${uid}-s`, transform, color: outline, stroke: outline, "stroke-width": ow * unit * 2, "stroke-linejoin": "round" })}/>`;
      over += `<use${attrs({ href: `#${uid}-a`, transform, color })}/>`;
    }
  } else {
    for (const inst of instances) {
      const color = cycle.length ? cycle[inst.index % cycle.length] : str(p, "color");
      const ip = { ...p, color };
      const ctx = { body, uid: `${uid}-${inst.index}`, unit: !def.span, cx: inst.x, cy: inst.y, size: inst.size, index: inst.index, getAsset: lookup, frame: body };
      const markup = def.render(ip, ctx as never);
      if (!markup) continue;
      if (def.span) {
        if (outline !== "none") under += `<g${attrs({ stroke: outline, "stroke-width": ow * body.h * 2, "stroke-linejoin": "round" })}>${silhouette(markup, outline, "-s")}</g>`;
        over += markup;
        continue;
      }
      const transform = `translate(${n(inst.x)} ${n(inst.y)}) rotate(${n(num(p, "rotation") + inst.rotation)}) scale(${n(inst.size * sx)} ${n(inst.size * sy)})`;
      if (outline !== "none") under += `<g${attrs({ transform, stroke: outline, "stroke-width": ow * 2, "stroke-linejoin": "round" })}>${silhouette(markup, outline, "-s")}</g>`;
      over += `<g transform="${transform}">${markup}</g>`;
    }
  }
  const out = (defs ? `<defs>${defs}</defs>` : "") + under + over;
  return num(p, "opacity") < 1 ? `<g opacity="${n(num(p, "opacity"))}">${out}</g>` : out;
}

/** Body markup of a flag (no <svg> wrapper), useful for embedding. */
export function renderFlagBody(design: FlagDesign, options: RenderOptions = {}) {
  const uid = options.idPrefix ?? "f" + hashString(JSON.stringify(design)).toString(36);
  const lookup = options.getAsset ?? getAsset;
  const { params, body, outline } = shapeInfo(design);
  let content = `<rect${attrs({ x: body.x, y: body.y, width: body.w, height: body.h, fill: design.background || "#ffffff" })}/>`;
  design.layers.forEach((layer, i) => {
    if (layer.hidden) return;
    content += layer.kind === "division" ? renderDivision(layer, body, `${uid}-${i}`) : renderEmblem(layer, body, `${uid}-${i}`, lookup);
  });
  const edge = str(params, "edgeColor"), edgeWidth = num(params, "edgeWidth");
  if (edge && edge !== "none" && edgeWidth > 0) content += `<path${attrs({ d: outline, fill: "none", stroke: edge, "stroke-width": edgeWidth * body.h * 2, "stroke-linejoin": "miter" })}/>`;
  const canvas = options.canvas ? `<rect width="${CANVAS.width}" height="${CANVAS.height}" fill="${options.canvas}"/>` : "";
  return `${canvas}<clipPath id="${uid}-body"><path d="${outline}"/></clipPath><g clip-path="url(#${uid}-body)">${content}</g>`;
}

/** Render a complete, self-contained SVG document on the 2:1 canvas. */
export function renderFlagSvg(design: FlagDesign, options: RenderOptions = {}) {
  const width = options.width ?? CANVAS.width * 3, height = options.height ?? (width * CANVAS.height) / CANVAS.width;
  const title = options.title ? `<title>${options.title.replace(/[<&]/g, "")}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" width="${n(width)}" height="${n(height)}">${title}${renderFlagBody(design, options)}</svg>`;
}

/** Library asset ids a design needs before it can render fully. */
export function designAssets(design: FlagDesign) {
  return [...new Set(design.layers.filter((l) => l.kind === "emblem" && l.type === "asset" && typeof l.asset === "string").map((l) => l.asset as string))];
}

export function svgDataUri(svg: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

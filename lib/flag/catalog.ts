import { arrangements, constellations } from "./arrangements";
import { assetCategories, assetCredits, assetIndex } from "./assets";
import { namedColors } from "./color";
import { divisionCommon, divisionDefs, divisionPresets } from "./divisions";
import { emblemCommon, emblemDefs, emblemPresets } from "./emblems";
import { anchors } from "./normalize";
import { namedAreas, type ParamDef } from "./params";
import { shapeDefs, shapePresets } from "./shapes";
import { CANVAS } from "./svg";

const describeParams = (params: ParamDef[]) => params.map(({ key, type, default: d, label, help, when, ...rest }) => ({ key, type, default: d, label, help, when, ...rest }));

/** Everything a tool or model needs to build flags, as plain JSON. */
export function flagCatalog() {
  return {
    canvas: { ...CANVAS, ratio: "2:1", note: "Every flag renders on this canvas; the shape sets the flag's own proportions inside it." },
    layerOrder: "layers[0] is painted first (bottom); each later layer is drawn above the previous ones.",
    shapes: shapeDefs.map(({ id, label, category, description, params }) => ({ id, label, category, description, params: describeParams(params) })),
    shapePresets,
    divisions: divisionDefs.map(({ id, label, category, description, params, defaults }) => ({ id, label, category, description, params: describeParams(params), defaults })),
    divisionPresets,
    divisionCommonParams: describeParams(divisionCommon),
    emblems: emblemDefs.map(({ id, label, category, description, params, defaults, span }) => ({ id, label, category, description, span: !!span, params: describeParams(params), defaults })),
    emblemPresets,
    emblemCommonParams: describeParams(emblemCommon),
    arrangements: [...arrangements],
    constellations: Object.keys(constellations),
    library: {
      total: assetIndex.length,
      categories: assetCategories.map((c) => ({ ...c, count: assetIndex.filter((a) => a.category === c.id).length })),
      assets: assetIndex.map(({ id, name, category, tags }) => ({ id, name, category, tags })),
    },
    colors: namedColors,
    positions: anchors,
    areas: namedAreas,
    credits: assetCredits,
  };
}

export function catalogStats() {
  return {
    shapes: shapeDefs.length + shapePresets.length,
    divisions: divisionDefs.length + divisionPresets.length,
    emblems: emblemDefs.length + emblemPresets.length,
    library: assetIndex.length,
  };
}

const paramList = (params: ParamDef[]) => params.map((p) => p.key).join(",");
const ids = (items: { id: string }[]) => items.map((i) => i.id).join(", ");

/**
 * Instructions for language models. "brief" fits in a larger prompt; "full" lists every component.
 */
export function flagPromptGuide(detail: "brief" | "full" = "full") {
  const format = `A flag is JSON: {"shape":"<shape id>","background":"<color>","layers":[...]} on a fixed 2:1 canvas. Layers paint in order: the first is the bottom, each later one covers it.
Division layer: {"kind":"division","type":"<id>",...params}; any division may take "area" ("full","canton","us_canton","hoist_half","fly_half","top_half","bottom_half","upper_fly","lower_fly","hoist_third" or {"x","y","w","h"} as 0..1 fractions) to fill only part of the flag.
Emblem layer: {"kind":"emblem","type":"<id or library keyword>","color":..,"position":"center|hoist|fly|canton|upper_fly|lower_hoist|lower_fly|top|bottom|nordic" or "x","y" (0..1),"scale" (fraction of flag height),"rotation","mirror","outline","outlineWidth"}. Emblems repeat with "arrangement": ${arrangements.join("|")} plus "count","rows","cols","width","height","startAngle","endAngle","itemScale".
Colors: #rrggbb or names such as ${Object.keys(namedColors).slice(0, 40).join(", ")}.`;
  if (detail === "brief") {
    return `${format}
Divisions: ${ids(divisionDefs)}; presets include nordic_cross, horizontal_tricolor, vertical_tricolor, hoist_triangle, diagonal_left, diagonal_right, double_chevron, center_band, us_canton, union_jack_canton.
Emblems: ${ids(emblemDefs.filter((e) => e.id !== "asset"))}; presets include star_ring, star_row, star_arc, star_canton, southern_cross, sun_of_may, nordic_cross, swiss_cross, ashoka_chakra, laurel_wreath. Any other emblem type is looked up in a ${assetIndex.length}-item library by keyword (lion, eagle, crossed swords, hammer sickle, castle, wheat, dove, trident, crown…).
Example: {"shape":"rectangle_standard","background":"#0a3161","layers":[{"kind":"division","type":"horizontal_stripes","count":3,"colors":["#0a3161","#ffffff","#0a3161"]},{"kind":"emblem","type":"star","arrangement":"ring","count":12,"color":"#f1bf00","scale":0.4}]}`;
  }
  const shapes = shapeDefs.map((s) => `${s.id}(${paramList(s.params.filter((p) => !p.key.startsWith("edge")))})`).join("; ");
  const divisions = divisionDefs.map((d) => `${d.id}(${paramList(d.params)})`).join("; ");
  const emblems = emblemDefs.map((e) => `${e.id}(${paramList(e.params)})`).join("; ");
  const library = assetCategories.map((c) => `${c.label}: ${assetIndex.filter((a) => a.category === c.id).slice(0, 10).map((a) => a.id).join(" ")}`).join("\n");
  return `${format}
SHAPES (type + params; ratio = height/width): ${shapes}. All shapes accept edgeColor, edgeWidth.
Shape presets: ${ids(shapePresets)}.
DIVISIONS (type(params)): ${divisions}.
Division presets: ${ids(divisionPresets)}.
EMBLEMS (type(params)): ${emblems}. Span emblems (full_cross, full_saltire, full_line, border_line, corner_square, corner_triangle) run edge to edge from their x/y.
Emblem presets: ${ids(emblemPresets)}.
LIBRARY: {"kind":"emblem","type":"asset","asset":"<id or keyword>"}; ids are prefix:name (gi, mdi, fa, nat). Monochrome icons take "color"; nat:<iso> national arms keep their own colors unless "recolor":"mono". Examples:
${library}
Tips: fimbriate a cross by stacking a thicker full_cross under a thinner one. Put stars in a canton by adding a canton division, then an emblem with arrangement "canton" (or x,y inside it). Use "mirror":true to face animals toward the hoist.`;
}

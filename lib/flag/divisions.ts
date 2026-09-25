import { FULL_AREA, bool, list, num, nums, str, type ParamDef, type Params } from "./params";
import { attrs, circle, n, path, poly, rect, starPoints, type Box, type Point } from "./svg";
import type { ComponentDef, DivisionContext, Preset } from "./types";

const C = {
  red: "#d52b1e", white: "#ffffff", blue: "#0039a6", navy: "#0a3161", green: "#009739",
  gold: "#f1bf00", yellow: "#fcd116", black: "#000000", darkGreen: "#006233",
};

/** Parameters every division accepts. */
export const divisionCommon: ParamDef[] = [
  { key: "area", type: "area", default: FULL_AREA, label: "Area", help: "Part of the flag the division fills: full, canton, hoist_half, {x,y,w,h}…" },
  { key: "opacity", type: "number", min: 0, max: 1, step: 0.05, default: 1, label: "Opacity" },
];

const colors = (def: string[], max = 12, min = 1, label = "Colors", help?: string): ParamDef => ({ key: "colors", type: "colors", min, max, default: def, label, help });
const color = (def: string, key = "color", label = "Color", optional = false): ParamDef => ({ key, type: "color", default: def, label, optional });
const count = (def: number, max = 25, min = 1, key = "count", label = "Count"): ParamDef => ({ key, type: "int", min, max, default: def, label });
const frac = (key: string, def: number, label: string, min = 0, max = 1, help?: string): ParamDef => ({ key, type: "number", min, max, step: 0.005, default: def, label, help });
const choice = (key: string, options: readonly string[], def: string, label: string): ParamDef => ({ key, type: "enum", options, default: def, label });
const fimbriation: ParamDef[] = [
  color("none", "fimbriation", "Fimbriation", true),
  frac("fimbriationWidth", 0.04, "Fimbriation width", 0, 0.3, "Outline band around the element, fraction of height."),
];

const cyc = (cs: string[], i: number) => cs[((i % cs.length) + cs.length) % cs.length] ?? "none";

/** Parallel stripes with optional relative weights ("1,2,1"). */
function stripes(p: Params, f: Box, horizontal: boolean) {
  const total = num(p, "count"), cs = list(p, "colors");
  const weights = nums(p, "weights");
  const w = weights.length === total ? weights : Array(total).fill(1);
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  let offset = 0, out = "";
  for (let i = 0; i < total; i++) {
    const size = (w[i] / sum) * (horizontal ? f.h : f.w);
    const bleed = i < total - 1 ? 0.05 : 0;
    const fill = cyc(cs, i);
    out += horizontal ? rect(f.x, f.y + offset, f.w, size + bleed, fill) : rect(f.x + offset, f.y, size + bleed, f.h, fill);
    offset += size;
  }
  return out;
}

const lineStroke = (d: string, stroke: string, width: number, cap = "butt", join = "miter") =>
  stroke === "none" || width <= 0 ? "" : `<path${attrs({ d, fill: "none", stroke, "stroke-width": width, "stroke-linecap": cap, "stroke-linejoin": join })}/>`;

/** A straight band along a segment, extended far past the frame so butt caps never show. */
function extendedLine(a: Point, b: Point, offset = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, ex = (dx / len) * 400, ey = (dy / len) * 400;
  return `M${n(a[0] - ex + nx * offset)} ${n(a[1] - ey + ny * offset)}L${n(b[0] + ex + nx * offset)} ${n(b[1] + ey + ny * offset)}`;
}

function bandWithFimbriation(d: string, fill: string, width: number, p: Params, h: number, join = "miter") {
  const fim = str(p, "fimbriation"), fw = num(p, "fimbriationWidth") * h;
  return (fim !== "none" && fw > 0 ? lineStroke(d, fim, width + fw * 2, "butt", join) : "") + lineStroke(d, fill, width, "butt", join);
}

const corner = (f: Box, u: number, v: number): Point => [f.x + u * f.w, f.y + v * f.h];
const polyIn = (f: Box, points: Point[]) => poly(points.map(([u, v]) => corner(f, u, v)));
const clipTo = (ctx: DivisionContext, key: string, shape: string, body: string) => {
  const id = `${ctx.uid}-${key}`;
  return `<clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})">${body}</g>`;
};
const frameRect = (f: Box) => `<rect${attrs({ x: f.x, y: f.y, width: f.w, height: f.h })}/>`;

/** Axis-aligned mapping so side-based divisions can be written once for the hoist. */
function sideMap(f: Box, side: string) {
  return (u: number, v: number): Point => {
    switch (side) {
      case "fly": return corner(f, 1 - u, v);
      case "top": return corner(f, v, u);
      case "bottom": return corner(f, v, 1 - u);
      default: return corner(f, u, v);
    }
  };
}

const sides = ["hoist", "fly", "top", "bottom"] as const;

function patternCell(motif: string, s: number, fg: string, t: number) {
  const stroke = (d: string, w: number) => `<path${attrs({ d, fill: "none", stroke: fg, "stroke-width": w, "stroke-linecap": "square" })}/>`;
  const h = s / 2;
  switch (motif) {
    case "dots": return circle(h, h, (t * s) / 2, fg);
    case "polka": return circle(h, h, (t * s) / 4, fg) + [[0, 0], [s, 0], [0, s], [s, s]].map(([x, y]) => circle(x, y, (t * s) / 4, fg)).join("");
    case "diamonds": return path(poly([[h, h - (t * s) / 2], [h + (t * s) / 2, h], [h, h + (t * s) / 2], [h - (t * s) / 2, h]]), fg);
    case "lozengy": return path(poly([[h, 0], [s, h], [h, s], [0, h]]), fg);
    case "checks": return rect(0, 0, h, h, fg) + rect(h, h, h, h, fg);
    case "grid": return rect(0, 0, s, (t * s) / 5, fg) + rect(0, 0, (t * s) / 5, s, fg);
    case "stripes": return rect(0, 0, s, (t * s) / 2, fg);
    case "zigzag": return stroke(`M0 ${n(s * 0.75)}L${n(h)} ${n(s * 0.25)}L${n(s)} ${n(s * 0.75)}`, (t * s) / 4);
    case "waves": return stroke(`M0 ${n(h)}Q${n(s / 4)} ${n(h - s / 3)} ${n(h)} ${n(h)}T${n(s)} ${n(h)}`, (t * s) / 5);
    case "scales": return stroke(`M0 ${n(h)}A${n(h)} ${n(h)} 0 0 0 ${n(s)} ${n(h)}M${n(-h)} ${n(s)}A${n(h)} ${n(h)} 0 0 0 ${n(h)} ${n(s)}A${n(h)} ${n(h)} 0 0 0 ${n(s + h)} ${n(s)}`, (t * s) / 8);
    case "triangles": return path(poly([[h - (t * s) / 2, h + (t * s) / 2], [h, h - (t * s) / 2], [h + (t * s) / 2, h + (t * s) / 2]]), fg);
    case "crosses": {
      const a = (t * s) / 2, b = a / 3;
      return path(poly([[h - b, h - a], [h + b, h - a], [h + b, h - b], [h + a, h - b], [h + a, h + b], [h + b, h + b], [h + b, h + a], [h - b, h + a], [h - b, h + b], [h - a, h + b], [h - a, h - b], [h - b, h - b]]), fg);
    }
    case "stars": return path(poly(starPoints(5, (t * s) / 2, (t * s) / 5.2, 0, h, h)), fg);
    case "bricks": return stroke(`M0 0H${n(s)}M0 ${n(h)}H${n(s)}M0 0V${n(h)}M${n(h)} ${n(h)}V${n(s)}`, (t * s) / 10);
    case "hexagons": {
      const r = s / 3, k = s * 0.866;
      return stroke(`M0 ${n(k / 2)}L${n(r / 2)} 0H${n(1.5 * r)}L${n(2 * r)} ${n(k / 2)}L${n(1.5 * r)} ${n(k)}H${n(r / 2)}ZM${n(2 * r)} ${n(k / 2)}H${n(s)}`, (t * s) / 12);
    }
    case "plaid": return `<g opacity="0.55">${rect(0, s * 0.2, s, (t * s) / 3, fg)}${rect(s * 0.2, 0, (t * s) / 3, s, fg)}</g>` + rect(0, s * 0.72, s, s / 30, fg) + rect(s * 0.72, 0, s / 30, s, fg);
    default: return "";
  }
}

const patternMotifs = ["dots", "polka", "diamonds", "lozengy", "checks", "grid", "stripes", "zigzag", "waves", "scales", "triangles", "crosses", "stars", "bricks", "hexagons", "plaid"] as const;

export const divisionDefs: ComponentDef[] = [
  {
    id: "solid", label: "Solid field", category: "Basic", description: "Fill the area with one color.",
    params: [color(C.red)],
    render: (p, { frame: f }) => rect(f.x, f.y, f.w, f.h, str(p, "color")),
  },
  {
    id: "horizontal_stripes", label: "Horizontal stripes", category: "Stripes",
    description: "Any number of horizontal stripes; colors repeat in order. Optional weights set relative heights, e.g. [1,2,1].",
    params: [count(3, 33), colors([C.red, C.white, C.blue]), { key: "weights", type: "numbers", min: 0.05, max: 20, maxItems: 33, default: [], label: "Weights", help: "Relative stripe sizes, one per stripe." }],
    render: (p, { frame }) => stripes(p, frame, true),
  },
  {
    id: "vertical_stripes", label: "Vertical stripes", category: "Stripes",
    description: "Any number of vertical stripes from hoist to fly; colors repeat. Optional weights.",
    params: [count(3, 33), colors([C.blue, C.white, C.red]), { key: "weights", type: "numbers", min: 0.05, max: 20, maxItems: 33, default: [], label: "Weights" }],
    render: (p, { frame }) => stripes(p, frame, false),
  },
  {
    id: "diagonal_stripes", label: "Diagonal stripes", category: "Diagonal",
    description: "Stripes parallel to a diagonal. direction down = from upper hoist to lower fly; up = from lower hoist to upper fly.",
    params: [count(5, 30), colors([C.red, C.white]), choice("direction", ["down", "up"], "up", "Direction")],
    render: (p, { frame: f }) => {
      const total = num(p, "count"), cs = list(p, "colors"), up = str(p, "direction") === "up";
      let out = "";
      for (let i = 0; i < total; i++) {
        const a = i / total, b = (i + 1) / total + (i < total - 1 ? 0.002 : 0);
        // Stripe between the two lines u = a and u = b in the unit square (u = x + y or x − y).
        const pts: Point[] = up
          ? bandUp(a * 2, b * 2)
          : bandDown(a * 2 - 1, b * 2 - 1);
        out += path(polyIn(f, pts), cyc(cs, i));
      }
      return out;
    },
  },
  {
    id: "diagonal_split", label: "Diagonal split", category: "Diagonal",
    description: "Two colored triangles divided by a diagonal. colors[0] is the upper field.",
    params: [colors([C.blue, C.gold], 2, 2), choice("direction", ["down", "up"], "up", "Diagonal"), frac("offset", 0, "Offset", -0.9, 0.9)],
    render: (p, { frame: f }) => {
      const [a, b] = list(p, "colors"), o = num(p, "offset");
      const up = str(p, "direction") === "up";
      const lower = up ? bandUp(1 + o, 3) : bandDown(-3, o);
      return rect(f.x, f.y, f.w, f.h, a) + path(polyIn(f, lower), b);
    },
  },
  {
    id: "diagonal_band", label: "Diagonal band", category: "Diagonal",
    description: "One or more bands along a diagonal (bend), optionally fimbriated. direction up rises from lower hoist to upper fly.",
    params: [
      colors([C.black], 6, 1, "Band colors"), choice("direction", ["down", "up"], "up", "Direction"),
      frac("width", 0.25, "Band width", 0.01, 1.2, "Perpendicular width, fraction of height."),
      count(1, 5, 1, "count", "Bands"), frac("gap", 0.08, "Gap", 0, 1), frac("offset", 0, "Offset", -1, 1),
      ...fimbriation,
    ],
    render: (p, { frame: f }) => {
      const up = str(p, "direction") === "up", total = num(p, "count");
      const a: Point = up ? [f.x, f.y + f.h] : [f.x, f.y], b: Point = up ? [f.x + f.w, f.y] : [f.x + f.w, f.y + f.h];
      const w = num(p, "width") * f.h, step = w + num(p, "gap") * f.h + num(p, "fimbriationWidth") * f.h * (str(p, "fimbriation") === "none" ? 0 : 2);
      let out = "";
      for (let i = 0; i < total; i++) {
        const offset = (i - (total - 1) / 2) * step + num(p, "offset") * f.h;
        out += bandWithFimbriation(extendedLine(a, b, offset), cyc(list(p, "colors"), i), w, p, f.h);
      }
      return out;
    },
  },
  {
    id: "four_way_split", label: "Four-way split (per saltire)", category: "Diagonal",
    description: "Four triangles meeting at a point: top, fly, bottom, hoist. Two colors alternate.",
    params: [colors([C.blue, C.gold], 4, 2, "Top, fly, bottom, hoist"), frac("cx", 0.5, "Center x"), frac("cy", 0.5, "Center y")],
    render: (p, { frame: f }) => {
      const cs = list(p, "colors"), c: Point = [num(p, "cx"), num(p, "cy")];
      const tris: Point[][] = [[[0, 0], [1, 0], c], [[1, 0], [1, 1], c], [[1, 1], [0, 1], c], [[0, 1], [0, 0], c]];
      return tris.map((t, i) => path(polyIn(f, t), cyc(cs, i), ` stroke="${cyc(cs, i)}" stroke-width="0.05"`)).join("");
    },
  },
  {
    id: "quartered", label: "Quartered", category: "Grid",
    description: "Four rectangles: upper hoist, upper fly, lower hoist, lower fly. Two colors alternate diagonally.",
    params: [colors([C.red, C.white], 4, 2, "Upper hoist, upper fly, lower hoist, lower fly"), frac("splitX", 0.5, "Vertical split"), frac("splitY", 0.5, "Horizontal split")],
    render: (p, { frame: f }) => {
      const cs = list(p, "colors"), sx = num(p, "splitX") * f.w, sy = num(p, "splitY") * f.h;
      const fills = cs.length >= 4 ? cs : [cs[0], cs[1], cs[1], cs[0]];
      return rect(f.x, f.y, sx + 0.05, sy + 0.05, fills[0]) + rect(f.x + sx, f.y, f.w - sx, sy + 0.05, fills[1])
        + rect(f.x, f.y + sy, sx + 0.05, f.h - sy, fills[2]) + rect(f.x + sx, f.y + sy, f.w - sx, f.h - sy, fills[3]);
    },
  },
  {
    id: "checkered", label: "Checkered", category: "Grid",
    description: "Chequy grid. With square on, columns are derived from rows to keep cells square.",
    params: [count(4, 40, 1, "rows", "Rows"), count(8, 60, 1, "cols", "Columns"), { key: "square", type: "bool", default: true, label: "Square cells" }, colors([C.red, C.white], 6, 2)],
    render: (p, { frame: f }) => {
      const rows = num(p, "rows"), cols = bool(p, "square") ? Math.max(1, Math.round((rows * f.w) / f.h)) : num(p, "cols"), cs = list(p, "colors");
      const cw = f.w / cols, ch = f.h / rows;
      let out = "";
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out += rect(f.x + c * cw, f.y + r * ch, cw + 0.03, ch + 0.03, cyc(cs, r + c));
      return out;
    },
  },
  {
    id: "cross", label: "Cross division", category: "Cross",
    description: "Full-length cross splitting the flag into four fields. colors[0] is the cross; optional colors[1..4] fill the quarters (upper hoist, upper fly, lower hoist, lower fly). x below 0.5 makes a Nordic cross.",
    params: [
      colors([C.white], 5, 1, "Cross, then quarters"), frac("x", 0.5, "Vertical arm position"), frac("y", 0.5, "Horizontal arm position"),
      frac("thickness", 0.2, "Thickness", 0.01, 0.9, "Fraction of height."), frac("verticalThickness", 0, "Vertical arm thickness", 0, 0.9, "0 uses the same thickness."),
      ...fimbriation,
    ],
    render: (p, { frame: f }) => {
      const cs = list(p, "colors"), cx = f.x + num(p, "x") * f.w, cy = f.y + num(p, "y") * f.h;
      const t = num(p, "thickness") * f.h, tv = (num(p, "verticalThickness") || num(p, "thickness")) * f.h;
      let out = "";
      const q = cs.slice(1);
      if (q.length) {
        const fills = q.length >= 4 ? q : [q[0], q[1] ?? q[0], q[1] ?? q[0], q[0]];
        out += rect(f.x, f.y, cx - f.x, cy - f.y, fills[0]) + rect(cx, f.y, f.x + f.w - cx, cy - f.y, fills[1])
          + rect(f.x, cy, cx - f.x, f.y + f.h - cy, fills[2]) + rect(cx, cy, f.x + f.w - cx, f.y + f.h - cy, fills[3]);
      }
      const fim = str(p, "fimbriation"), fw = num(p, "fimbriationWidth") * f.h;
      if (fim !== "none" && fw > 0) out += rect(cx - tv / 2 - fw, f.y, tv + fw * 2, f.h, fim) + rect(f.x, cy - t / 2 - fw, f.w, t + fw * 2, fim);
      return out + rect(cx - tv / 2, f.y, tv, f.h, cs[0]) + rect(f.x, cy - t / 2, f.w, t, cs[0]);
    },
  },
  {
    id: "saltire", label: "Saltire division", category: "Cross",
    description: "Diagonal X from corner to corner. colors[0] is the saltire; optional colors[1..4] fill top, fly, bottom and hoist.",
    params: [colors([C.white], 5, 1, "Saltire, then fields"), frac("thickness", 0.18, "Thickness", 0.01, 0.9), ...fimbriation],
    render: (p, ctx) => {
      const f = ctx.frame, cs = list(p, "colors"), t = num(p, "thickness") * f.h;
      let out = "";
      const q = cs.slice(1);
      if (q.length) {
        const c: Point = [0.5, 0.5];
        const tris: Point[][] = [[[0, 0], [1, 0], c], [[1, 0], [1, 1], c], [[1, 1], [0, 1], c], [[0, 1], [0, 0], c]];
        out += tris.map((tri, i) => path(polyIn(f, tri), cyc(q, i))).join("");
      }
      const d = extendedLine(corner(f, 0, 0), corner(f, 1, 1)) + extendedLine(corner(f, 1, 0), corner(f, 0, 1));
      return out + clipTo(ctx, "sx", frameRect(f), bandWithFimbriation(d, cs[0], t, p, f.h));
    },
  },
  {
    id: "union_jack", label: "Union Jack", category: "Cross",
    description: "Counterchanged saltires under a fimbriated cross, as on the UK flag. Place it in a canton with area.",
    params: [colors(["#012169", C.white, "#c8102e"], 3, 3, "Field, white, red")],
    render: (p, ctx) => {
      const f = ctx.frame, [field, white, red] = list(p, "colors");
      const id = `${ctx.uid}-uj`;
      const tf = `translate(${n(f.x)} ${n(f.y)}) scale(${n(f.w / 60)} ${n(f.h / 30)})`;
      return `<clipPath id="${id}s"><path d="M0 0v30h60V0z"/></clipPath><clipPath id="${id}t"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>`
        + `<g transform="${tf}" clip-path="url(#${id}s)"><path d="M0 0v30h60V0z" fill="${field}"/>`
        + `<path d="M0 0l60 30m0-30L0 30" stroke="${white}" stroke-width="6"/>`
        + `<path d="M0 0l60 30m0-30L0 30" clip-path="url(#${id}t)" stroke="${red}" stroke-width="4"/>`
        + `<path d="M30 0v30M0 15h60" stroke="${white}" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="${red}" stroke-width="6"/></g>`;
    },
  },
  {
    id: "triangle", label: "Triangle", category: "Triangle",
    description: "Isosceles triangle from one side (hoist, fly, top or bottom). depth is how far it reaches across; equilateral overrides depth.",
    params: [
      color(C.blue), choice("side", sides, "hoist", "Side"), frac("depth", 0.5, "Depth", 0.02, 1.5),
      frac("span", 1, "Base length", 0.05, 1), frac("position", 0.5, "Base center"), { key: "equilateral", type: "bool", default: false, label: "Equilateral" },
      ...fimbriation,
    ],
    render: (p, { frame: f }) => {
      const side = str(p, "side"), vertical = side === "top" || side === "bottom";
      const across = vertical ? f.h : f.w, along = vertical ? f.w : f.h;
      const span = num(p, "span"), pos = num(p, "position");
      const depth = bool(p, "equilateral") ? (span * along * Math.sqrt(3)) / 2 / across : num(p, "depth");
      const map = sideMap(f, side);
      const pts = (grow: number): Point[] => {
        const g = grow / across, gs = grow / along;
        return [map(-g, pos - span / 2 - gs * 2), map(depth + g * 2, pos), map(-g, pos + span / 2 + gs * 2)];
      };
      const fim = str(p, "fimbriation"), fw = num(p, "fimbriationWidth") * f.h;
      return (fim !== "none" && fw > 0 ? path(poly(pts(fw)), fim) : "") + path(poly(pts(0)), str(p, "color"));
    },
  },
  {
    id: "chevron", label: "Chevron", category: "Triangle",
    description: "V-shaped band(s) pointing away from a side. Use count 2 for double chevrons; width ≥ depth gives a solid triangle.",
    params: [
      colors([C.gold], 6, 1, "Chevron colors"), choice("side", sides, "hoist", "Side"), frac("depth", 0.45, "Depth", 0.05, 1.5),
      frac("width", 0.12, "Band width", 0.01, 1.5), count(1, 6, 1, "count", "Chevrons"), frac("gap", 0.06, "Gap", 0, 0.5),
    ],
    render: (p, { frame: f }) => {
      const map = sideMap(f, str(p, "side")), total = num(p, "count"), cs = list(p, "colors");
      const d = num(p, "depth"), w = num(p, "width"), g = num(p, "gap");
      let out = "";
      for (let i = 0; i < total; i++) {
        const shift = i * (w + g), tip = d - shift;
        if (tip <= 0) break;
        const inner = tip - w;
        const pts: Point[] = inner <= 0
          ? [map(-shift - 0.01, -0.01), map(tip, 0.5), map(-shift - 0.01, 1.01)]
          : [map(-shift - w, 0), map(-shift, 0), map(tip, 0.5), map(-shift, 1), map(-shift - w, 1), map(inner, 0.5)];
        out += path(poly(pts), cyc(cs, i));
      }
      return out;
    },
  },
  {
    id: "y_division", label: "Y division (pall)", category: "Triangle",
    description: "Y-shaped pall: two arms from the hoist corners joining a horizontal band to the fly. colors: pall, then optional upper, lower and hoist fields.",
    params: [
      colors([C.green, "#de3831", "#002395", C.black], 4, 1, "Pall, upper, lower, hoist"),
      frac("junction", 0.4, "Junction", 0.1, 0.9), frac("width", 0.2, "Width", 0.02, 0.6), ...fimbriation,
    ],
    render: (p, ctx) => {
      const f = ctx.frame, cs = list(p, "colors"), jx = num(p, "junction");
      const j = corner(f, jx, 0.5);
      let out = "";
      if (cs[1]) out += path(polyIn(f, [[0, 0], [1, 0], [1, 0.5], [jx, 0.5]]), cs[1]);
      if (cs[2]) out += path(polyIn(f, [[0, 1], [1, 1], [1, 0.5], [jx, 0.5]]), cs[2]);
      if (cs[3]) out += path(polyIn(f, [[0, 0], [jx, 0.5], [0, 1]]), cs[3]);
      const a = corner(f, 0, 0), b = corner(f, 0, 1), dx = j[0] - a[0], dy = j[1] - a[1];
      const d = `M${n(a[0] - dx)} ${n(a[1] - dy)}L${n(j[0])} ${n(j[1])}L${n(f.x + f.w + 10)} ${n(j[1])}M${n(b[0] - dx)} ${n(b[1] + dy)}L${n(j[0])} ${n(j[1])}`;
      return out + clipTo(ctx, "pall", frameRect(f), bandWithFimbriation(d, cs[0], num(p, "width") * f.h, p, f.h));
    },
  },
  {
    id: "border", label: "Border (bordure)", category: "Border",
    description: "Frame around the edge of the area. Optional inner color fills the middle.",
    params: [color(C.gold), frac("width", 0.1, "Width", 0.005, 0.5, "Fraction of height."), color("none", "inner", "Inner fill", true)],
    render: (p, { frame: f }) => {
      const w = num(p, "width") * f.h;
      const outer = `M${n(f.x)} ${n(f.y)}h${n(f.w)}v${n(f.h)}h${n(-f.w)}Z`;
      const inner = `M${n(f.x + w)} ${n(f.y + w)}v${n(f.h - w * 2)}h${n(f.w - w * 2)}v${n(-(f.h - w * 2))}Z`;
      return rect(f.x + w, f.y + w, f.w - w * 2, f.h - w * 2, str(p, "inner")) + path(outer + inner, str(p, "color"), ` fill-rule="evenodd"`);
    },
  },
  {
    id: "band", label: "Band", category: "Band",
    description: "A single straight band (horizontal fess or vertical pale) at any position and width, optionally fimbriated.",
    params: [color(C.white), choice("orientation", ["horizontal", "vertical"], "horizontal", "Orientation"), frac("position", 0.5, "Center position"), frac("width", 1 / 3, "Width", 0.005, 1), ...fimbriation],
    render: (p, { frame: f }) => {
      const hor = str(p, "orientation") === "horizontal", pos = num(p, "position"), w = num(p, "width") * (hor ? f.h : f.w);
      const fim = str(p, "fimbriation"), fw = num(p, "fimbriationWidth") * f.h;
      const band = (grow: number, fill: string) => hor
        ? rect(f.x, f.y + pos * f.h - w / 2 - grow, f.w, w + grow * 2, fill)
        : rect(f.x + pos * f.w - w / 2 - grow, f.y, w + grow * 2, f.h, fill);
      return (fim !== "none" && fw > 0 ? band(fw, fim) : "") + band(0, str(p, "color"));
    },
  },
  {
    id: "canton", label: "Canton", category: "Canton",
    description: "Rectangle in a corner of the area. Put stripes, crosses or stars inside by giving later layers the same area.",
    params: [color(C.navy), choice("corner", ["upper_hoist", "upper_fly", "lower_hoist", "lower_fly"], "upper_hoist", "Corner"), frac("width", 0.4, "Width", 0.02, 1), frac("height", 0.5, "Height", 0.02, 1), ...fimbriation],
    render: (p, { frame: f }) => {
      const c = str(p, "corner"), w = num(p, "width") * f.w, h = num(p, "height") * f.h;
      const x = c.endsWith("fly") ? f.x + f.w - w : f.x, y = c.startsWith("lower") ? f.y + f.h - h : f.y;
      const fim = str(p, "fimbriation"), fw = num(p, "fimbriationWidth") * f.h;
      return (fim !== "none" && fw > 0 ? rect(x - fw, y - fw, w + fw * 2, h + fw * 2, fim) : "") + rect(x, y, w, h, str(p, "color"));
    },
  },
  {
    id: "sunburst", label: "Sunburst (radial)", category: "Radial",
    description: "Rays radiating from a point. colors alternate between rays and gaps; sweep below 360 gives a fan (sunrise).",
    params: [
      count(16, 72, 2, "rays", "Rays"), colors([C.red, C.white], 6, 2, "Ray colors, then gap"), frac("cx", 0.5, "Center x", -0.5, 1.5), frac("cy", 0.5, "Center y", -0.5, 1.5),
      { key: "rotation", type: "number", min: -180, max: 180, step: 1, default: 0, label: "Rotation" },
      { key: "sweep", type: "number", min: 10, max: 360, step: 1, default: 360, label: "Sweep" },
      frac("rayShare", 0.5, "Ray share", 0.05, 0.95, "Fraction of each sector that is ray."),
    ],
    render: (p, { frame: f }) => {
      const rays = num(p, "rays"), cs = list(p, "colors"), cx = f.x + num(p, "cx") * f.w, cy = f.y + num(p, "cy") * f.h;
      const sweep = num(p, "sweep"), step = sweep / rays, share = num(p, "rayShare"), rot = num(p, "rotation") - (sweep < 360 ? sweep / 2 : 0);
      const r = Math.hypot(f.w, f.h) * 2;
      const gap = cs.length > 1 ? cs[cs.length - 1] : "none";
      const rayColors = cs.length > 1 ? cs.slice(0, -1) : cs;
      let out = sweep >= 360 ? rect(f.x, f.y, f.w, f.h, gap) : "";
      for (let i = 0; i < rays; i++) {
        const a = rot + i * step, b = a + step * share;
        const p1 = polarPoint(cx, cy, r, a), p2 = polarPoint(cx, cy, r, b);
        out += path(poly([[cx, cy], p1, p2]), cyc(rayColors, i));
        if (sweep < 360) out += path(poly([[cx, cy], p2, polarPoint(cx, cy, r, a + step)]), gap);
      }
      return out;
    },
  },
  {
    id: "lozenge", label: "Lozenge (diamond)", category: "Geometric",
    description: "Large diamond touching near the edges, as on Brazil's flag.",
    params: [color(C.yellow), frac("insetX", 0.085, "Horizontal margin", 0, 0.45), frac("insetY", 0.12, "Vertical margin", 0, 0.45), ...fimbriation],
    render: (p, { frame: f }) => {
      const ix = num(p, "insetX"), iy = num(p, "insetY");
      const fw = num(p, "fimbriationWidth"), fim = str(p, "fimbriation");
      const shape = (g: number) => polyIn(f, [[0.5, iy - g], [1 - ix + g, 0.5], [0.5, 1 - iy + g], [ix - g, 0.5]]);
      return (fim !== "none" && fw > 0 ? path(shape(fw), fim) : "") + path(shape(0), str(p, "color"));
    },
  },
  {
    id: "serrated", label: "Serrated edge", category: "Band",
    description: "Area along one side separated by a zigzag (like Qatar or Bahrain). color fills the side.",
    params: [color(C.white), choice("side", sides, "hoist", "Side"), count(9, 40, 1, "points", "Points"), frac("position", 0.3, "Edge position", 0.02, 0.98), frac("depth", 0.08, "Tooth depth", 0.005, 0.5)],
    render: (p, { frame: f }) => {
      const map = sideMap(f, str(p, "side")), k = num(p, "points"), pos = num(p, "position"), d = num(p, "depth");
      const pts: Point[] = [map(-0.01, -0.01), map(pos - d / 2, -0.01)];
      for (let i = 0; i < k; i++) { pts.push(map(pos + d / 2, (i + 0.5) / k)); pts.push(map(pos - d / 2, (i + 1) / k)); }
      pts.push(map(pos - d / 2, 1.01), map(-0.01, 1.01));
      return path(poly(pts), str(p, "color"));
    },
  },
  {
    id: "zigzag_split", label: "Zigzag split (dancetty)", category: "Triangle",
    description: "Two fields split by a zigzag line. depth 1 fills the flag with interlocking triangles.",
    params: [colors([C.red, C.white], 2, 2, "Upper, lower"), choice("orientation", ["horizontal", "vertical"], "horizontal", "Orientation"), count(6, 40, 1, "points", "Teeth"), frac("depth", 0.3, "Depth", 0.02, 1), frac("position", 0.5, "Position")],
    render: (p, { frame: f }) => {
      const [a, b] = list(p, "colors"), hor = str(p, "orientation") === "horizontal", k = num(p, "points"), d = num(p, "depth"), pos = num(p, "position");
      const map = (u: number, v: number): Point => (hor ? corner(f, u, v) : corner(f, v, u));
      const pts: Point[] = [map(-0.01, 1.01), map(-0.01, pos + d / 2)];
      for (let i = 0; i <= k * 2; i++) pts.push(map(i / (k * 2), pos + (i % 2 ? -d / 2 : d / 2)));
      pts.push(map(1.01, pos + d / 2), map(1.01, 1.01));
      return rect(f.x, f.y, f.w, f.h, a) + path(poly(pts), b);
    },
  },
  {
    id: "wavy_stripes", label: "Wavy stripes", category: "Stripes",
    description: "Stripes with sinuous edges, for seas and rivers.",
    params: [count(5, 30), colors([C.blue, C.white]), frac("amplitude", 0.04, "Amplitude", 0, 0.3), { key: "waves", type: "number", min: 0.5, max: 12, step: 0.5, default: 3, label: "Waves" }, choice("orientation", ["horizontal", "vertical"], "horizontal", "Orientation"), { key: "phase", type: "number", min: 0, max: 360, step: 5, default: 0, label: "Phase" }],
    render: (p, ctx) => {
      const f = ctx.frame, total = num(p, "count"), cs = list(p, "colors"), hor = str(p, "orientation") === "horizontal";
      const len = hor ? f.w : f.h, across = hor ? f.h : f.w, amp = num(p, "amplitude") * f.h, k = num(p, "waves"), ph = (num(p, "phase") * Math.PI) / 180;
      const line = (j: number) => {
        const base = j === 0 ? -amp - 2 : j === total ? across + amp + 2 : (j / total) * across;
        const out: Point[] = [];
        for (let i = 0; i <= 48; i++) {
          const t = (i / 48) * len, off = base + (j === 0 || j === total ? 0 : Math.sin((t / len) * k * Math.PI * 2 + ph) * amp);
          out.push(hor ? [f.x + t, f.y + off] : [f.x + off, f.y + t]);
        }
        return out;
      };
      let out = "";
      for (let j = 0; j < total; j++) out += path(poly([...line(j), ...line(j + 1).reverse()]), cyc(cs, j));
      return clipTo(ctx, "wv", frameRect(f), out);
    },
  },
  {
    id: "concentric", label: "Concentric", category: "Radial",
    description: "Nested circles, squares or diamonds around a center point.",
    params: [count(4, 30), colors([C.blue, C.white, C.red]), choice("shape", ["circle", "square", "diamond"], "circle", "Shape"), frac("cx", 0.5, "Center x"), frac("cy", 0.5, "Center y")],
    render: (p, ctx) => {
      const f = ctx.frame, total = num(p, "count"), cs = list(p, "colors"), shape = str(p, "shape");
      const cx = f.x + num(p, "cx") * f.w, cy = f.y + num(p, "cy") * f.h;
      const R = Math.max(Math.hypot(cx - f.x, cy - f.y), Math.hypot(f.x + f.w - cx, cy - f.y), Math.hypot(cx - f.x, f.y + f.h - cy), Math.hypot(f.x + f.w - cx, f.y + f.h - cy)) * (shape === "circle" ? 1 : 1.42);
      let out = "";
      for (let i = 0; i < total; i++) {
        const r = (R * (total - i)) / total, fill = cyc(cs, i);
        out += shape === "circle" ? circle(cx, cy, r, fill) : shape === "square" ? rect(cx - r, cy - r, r * 2, r * 2, fill) : path(poly([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]), fill);
      }
      return clipTo(ctx, "cc", frameRect(f), out);
    },
  },
  {
    id: "pattern", label: "Repeating pattern", category: "Pattern",
    description: "Tiled motif (dots, checks, zigzag, waves, scales, stars, hexagons, plaid…) with size and rotation. colors: background (or none), motif.",
    params: [
      choice("motif", patternMotifs, "dots", "Motif"), colors(["none", C.white], 2, 2, "Background, motif"),
      frac("size", 0.12, "Tile size", 0.02, 1, "Fraction of height."), frac("thickness", 0.5, "Motif weight", 0.05, 1),
      { key: "rotation", type: "number", min: -180, max: 180, step: 1, default: 0, label: "Rotation" },
      { key: "opacityMotif", type: "number", min: 0.05, max: 1, step: 0.05, default: 1, label: "Motif opacity" },
    ],
    render: (p, ctx) => {
      const f = ctx.frame, [bg, fg] = list(p, "colors"), s = num(p, "size") * f.h, id = `${ctx.uid}-pt`;
      const cell = patternCell(str(p, "motif"), s, fg, num(p, "thickness"));
      return rect(f.x, f.y, f.w, f.h, bg)
        + `<pattern${attrs({ id, width: s, height: s, patternUnits: "userSpaceOnUse", patternTransform: `translate(${n(f.x)} ${n(f.y)}) rotate(${n(num(p, "rotation"))})` })}>${cell}</pattern>`
        + `<rect${attrs({ x: f.x, y: f.y, width: f.w, height: f.h, fill: `url(#${id})`, opacity: num(p, "opacityMotif") < 1 ? num(p, "opacityMotif") : undefined })}/>`;
    },
  },
];

/** Point at an angle measured clockwise from the +x axis (SVG convention). */
function polarPoint(cx: number, cy: number, r: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Polygon of the unit square where lo ≤ x + y ≤ hi. */
function bandUp(lo: number, hi: number): Point[] {
  return clipUnit((x, y) => x + y, lo, hi);
}
/** Polygon of the unit square where lo ≤ x − y ≤ hi. */
function bandDown(lo: number, hi: number): Point[] {
  return clipUnit((x, y) => x - y, lo, hi);
}

function clipUnit(fn: (x: number, y: number) => number, lo: number, hi: number): Point[] {
  let pts: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const cut = (keep: (v: number) => boolean, edge: number) => {
    const out: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const va = fn(...a), vb = fn(...b), ka = keep(va), kb = keep(vb);
      if (ka) out.push(a);
      if (ka !== kb) {
        const t = (edge - va) / (vb - va);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    pts = out;
  };
  cut((v) => v >= lo, lo);
  cut((v) => v <= hi, hi);
  return pts;
}

const dp = (id: string, base: string, label: string, params: Params, category?: string, description?: string): Preset => ({ id, base, label, params, category, description });

/** Named variations of the procedural divisions. */
export const divisionPresets: Preset[] = [
  dp("horizontal_bicolor", "horizontal_stripes", "Horizontal bicolor", { count: 2, colors: [C.white, C.red] }, "Stripes"),
  dp("horizontal_tricolor", "horizontal_stripes", "Horizontal tricolor", { count: 3 }, "Stripes"),
  dp("vertical_bicolor", "vertical_stripes", "Vertical bicolor", { count: 2, colors: [C.green, C.red] }, "Stripes"),
  dp("vertical_tricolor", "vertical_stripes", "Vertical tricolor", { count: 3 }, "Stripes"),
  dp("spanish_fess", "horizontal_stripes", "Triband 1:2:1", { count: 3, colors: ["#aa151b", C.gold, "#aa151b"], weights: [1, 2, 1] }, "Stripes", "Wide central stripe, as on Spain's flag."),
  dp("triband_2_1_1", "horizontal_stripes", "Triband 2:1:1", { count: 3, colors: ["#fcd116", "#003893", "#ce1126"], weights: [2, 1, 1] }, "Stripes", "Colombia-style."),
  dp("pentaband_thai", "horizontal_stripes", "Five bands 1:1:2:1:1", { count: 5, colors: ["#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"], weights: [1, 1, 2, 1, 1] }, "Stripes"),
  dp("thirteen_stripes", "horizontal_stripes", "Thirteen stripes", { count: 13, colors: ["#b22234", C.white] }, "Stripes"),
  dp("nine_stripes", "horizontal_stripes", "Nine stripes", { count: 9, colors: ["#0d5eaf", C.white] }, "Stripes"),
  dp("fourteen_stripes", "horizontal_stripes", "Fourteen stripes", { count: 14, colors: ["#cc0001", C.white] }, "Stripes"),
  dp("pinstripe_vertical", "vertical_stripes", "Vertical pinstripes", { count: 21, colors: [C.navy, C.white] }, "Stripes"),
  dp("vertical_triband_1_2_1", "vertical_stripes", "Vertical 1:2:1", { count: 3, colors: [C.red, C.white, C.red], weights: [1, 2, 1] }, "Stripes", "Canadian pale."),
  dp("diagonal_left", "diagonal_band", "Diagonal left", { direction: "down" }, "Diagonal", "Band descending from upper hoist to lower fly."),
  dp("diagonal_right", "diagonal_band", "Diagonal right", { direction: "up" }, "Diagonal", "Band rising from lower hoist to upper fly."),
  dp("double_diagonal_left", "diagonal_band", "Double diagonal left", { direction: "down", count: 2, width: 0.14, gap: 0.1 }, "Diagonal"),
  dp("double_diagonal_right", "diagonal_band", "Double diagonal right", { direction: "up", count: 2, width: 0.14, gap: 0.1 }, "Diagonal"),
  dp("triple_diagonal", "diagonal_band", "Triple diagonal", { direction: "up", count: 3, width: 0.1, gap: 0.05, colors: [C.gold, C.red, C.gold] }, "Diagonal"),
  dp("fimbriated_diagonal", "diagonal_band", "Fimbriated diagonal", { direction: "up", width: 0.2, colors: [C.black], fimbriation: C.yellow, fimbriationWidth: 0.05 }, "Diagonal", "Tanzania-style."),
  dp("thin_diagonal", "diagonal_band", "Thin diagonal", { direction: "up", width: 0.07 }, "Diagonal"),
  dp("per_bend", "diagonal_split", "Per bend", { direction: "down" }, "Diagonal"),
  dp("per_bend_sinister", "diagonal_split", "Per bend sinister", { direction: "up" }, "Diagonal"),
  dp("diagonal_pinstripes", "diagonal_stripes", "Diagonal pinstripes", { count: 16, colors: [C.navy, C.white] }, "Diagonal"),
  dp("per_saltire", "four_way_split", "Per saltire", {}, "Diagonal"),
  dp("quartered_offset", "quartered", "Offset quarters", { splitX: 0.4, splitY: 0.5 }, "Grid"),
  dp("checkerboard", "checkered", "Checkerboard", { rows: 8 }, "Grid"),
  dp("chequy_large", "checkered", "Large chequy", { rows: 2 }, "Grid"),
  dp("croatian_checks", "checkered", "Fine chequy", { rows: 5, colors: ["#ff0000", C.white] }, "Grid"),
  dp("centered_cross", "cross", "Centered cross", { x: 0.5 }, "Cross"),
  dp("nordic_cross", "cross", "Nordic cross", { x: 0.375, thickness: 0.2 }, "Cross", "Off-center Scandinavian cross."),
  dp("nordic_cross_fimbriated", "cross", "Fimbriated Nordic cross", { x: 0.364, thickness: 0.125, colors: ["#00205b"], fimbriation: C.white, fimbriationWidth: 0.0625 }, "Cross", "Norway-style."),
  dp("thin_cross", "cross", "Thin cross", { thickness: 0.08 }, "Cross"),
  dp("thick_cross", "cross", "Thick cross", { thickness: 0.34 }, "Cross"),
  dp("st_george_cross", "cross", "St George's cross", { thickness: 0.2, colors: ["#ce1124"] }, "Cross"),
  dp("quartered_cross", "cross", "Cross with quarters", { thickness: 0.14, colors: [C.white, "#002d62", "#ce1126", "#ce1126", "#002d62"] }, "Cross", "Dominican-style."),
  dp("offset_cross_high", "cross", "Raised cross", { x: 0.5, y: 0.38 }, "Cross"),
  dp("st_andrew_saltire", "saltire", "St Andrew's saltire", { thickness: 0.2, colors: [C.white] }, "Cross"),
  dp("thin_saltire", "saltire", "Thin saltire", { thickness: 0.08 }, "Cross"),
  dp("thick_saltire", "saltire", "Thick saltire", { thickness: 0.3 }, "Cross"),
  dp("burgundy_saltire", "saltire", "Fimbriated saltire", { thickness: 0.14, colors: ["#c8102e"], fimbriation: C.white, fimbriationWidth: 0.04 }, "Cross"),
  dp("union_jack_canton", "union_jack", "Union Jack canton", { area: { x: 0, y: 0, w: 0.5, h: 0.5 } }, "Cross", "Union Jack in the upper hoist quarter."),
  dp("hoist_triangle", "triangle", "Hoist triangle", { side: "hoist", depth: 0.5 }, "Triangle"),
  dp("hoist_triangle_short", "triangle", "Short hoist triangle", { side: "hoist", depth: 0.33 }, "Triangle"),
  dp("equilateral_hoist_triangle", "triangle", "Equilateral hoist triangle", { side: "hoist", equilateral: true }, "Triangle"),
  dp("fly_triangle", "triangle", "Fly triangle", { side: "fly", depth: 0.5 }, "Triangle"),
  dp("top_triangle", "triangle", "Top triangle (pile)", { side: "top", depth: 0.7 }, "Triangle"),
  dp("bottom_triangle", "triangle", "Bottom triangle", { side: "bottom", depth: 0.7 }, "Triangle"),
  dp("hoist_wedge", "triangle", "Hoist wedge", { side: "hoist", depth: 1, span: 1 }, "Triangle"),
  dp("double_chevron", "chevron", "Double chevron", { count: 2, width: 0.1, gap: 0.04 }, "Triangle"),
  dp("triple_chevron", "chevron", "Triple chevron", { count: 3, width: 0.08, gap: 0.04 }, "Triangle"),
  dp("fly_chevron", "chevron", "Fly chevron", { side: "fly" }, "Triangle"),
  dp("heraldic_chevron", "chevron", "Heraldic chevron", { side: "bottom", depth: 0.75, width: 0.2 }, "Triangle", "Inverted V rising from the lower edge."),
  dp("inverted_chevron", "chevron", "Inverted chevron", { side: "top", depth: 0.7, width: 0.2 }, "Triangle"),
  dp("filled_chevron", "chevron", "Solid chevron", { depth: 0.4, width: 1.5 }, "Triangle"),
  dp("pall", "y_division", "Pall", { colors: [C.white] }, "Triangle"),
  dp("pall_tierced", "y_division", "Tierced in pall", { colors: [C.white, C.red, C.blue, C.gold] }, "Triangle", "Three fields around a Y."),
  dp("thin_border", "border", "Thin border", { width: 0.04 }, "Border"),
  dp("thick_border", "border", "Thick border", { width: 0.18 }, "Border"),
  dp("center_band", "band", "Center band", { position: 0.5, width: 1 / 3 }, "Band"),
  dp("center_stripe_thin", "band", "Thin center stripe", { position: 0.5, width: 0.1 }, "Band"),
  dp("center_pale", "band", "Center pale", { orientation: "vertical", position: 0.5, width: 0.5 }, "Band", "Wide vertical center band (Canada)."),
  dp("offset_band_high", "band", "Offset band (upper)", { position: 0.3, width: 0.2 }, "Band"),
  dp("offset_band_low", "band", "Offset band (lower)", { position: 0.7, width: 0.2 }, "Band"),
  dp("hoist_band", "band", "Hoist band", { orientation: "vertical", position: 0.125, width: 0.25, color: C.red }, "Band", "Vertical band at the hoist."),
  dp("fly_band", "band", "Fly band", { orientation: "vertical", position: 0.875, width: 0.25 }, "Band"),
  dp("top_band", "band", "Top band", { position: 0.1, width: 0.2 }, "Band"),
  dp("bottom_band", "band", "Bottom band", { position: 0.9, width: 0.2 }, "Band"),
  dp("fimbriated_band", "band", "Fimbriated band", { position: 0.5, width: 0.2, color: C.red, fimbriation: C.white, fimbriationWidth: 0.04 }, "Band"),
  dp("us_canton", "canton", "US canton", { width: 0.4, height: 7 / 13, color: "#3c3b6e" }, "Canton"),
  dp("quarter_canton", "canton", "Quarter canton", { width: 0.5, height: 0.5 }, "Canton"),
  dp("small_canton", "canton", "Small canton", { width: 1 / 3, height: 1 / 3 }, "Canton"),
  dp("tall_canton", "canton", "Full-height hoist panel", { width: 1 / 3, height: 1 }, "Canton"),
  dp("fly_canton", "canton", "Fly canton", { corner: "upper_fly" }, "Canton"),
  dp("rising_sun_rays", "sunburst", "Rising sun rays", { rays: 16, cx: 0.45, cy: 0.5, colors: ["#bc002d", C.white] }, "Radial"),
  dp("sunrise_fan", "sunburst", "Sunrise fan", { rays: 13, cy: 1, sweep: 180, colors: [C.gold, "#bf0a30"] }, "Radial", "Half fan of rays from the lower edge."),
  dp("gyronny", "sunburst", "Gyronny of eight", { rays: 8, rayShare: 0.5, rotation: 22.5 }, "Radial"),
  dp("gyronny_twelve", "sunburst", "Gyronny of twelve", { rays: 12 }, "Radial"),
  dp("eight_rays", "sunburst", "Eight broad rays", { rays: 8, rayShare: 0.28, colors: [C.yellow, "#d20000"] }, "Radial"),
  dp("brazil_lozenge", "lozenge", "Brazilian lozenge", {}, "Geometric"),
  dp("qatar_serration", "serrated", "Nine-point serration", { points: 9, position: 0.33, color: C.white }, "Band"),
  dp("bahrain_serration", "serrated", "Five-point serration", { points: 5, position: 0.25, depth: 0.1, color: C.white }, "Band"),
  dp("serrated_border_top", "serrated", "Serrated top", { side: "top", points: 14, position: 0.12, depth: 0.1 }, "Band"),
  dp("interlocking_triangles", "zigzag_split", "Interlocking triangles", { depth: 1, points: 5 }, "Triangle"),
  dp("dancetty_vertical", "zigzag_split", "Vertical dancetty", { orientation: "vertical", points: 5 }, "Triangle"),
  dp("sea_waves", "wavy_stripes", "Sea waves", { count: 7, colors: [C.blue, C.white], amplitude: 0.03, waves: 4 }, "Stripes"),
  dp("river_band", "wavy_stripes", "Wavy tricolor", { count: 3, colors: [C.green, C.blue, C.green], amplitude: 0.06, waves: 1.5 }, "Stripes"),
  dp("roundel_field", "concentric", "Concentric rings", { count: 3 }, "Radial"),
  dp("concentric_squares", "concentric", "Concentric squares", { shape: "square", count: 5, colors: [C.black, C.white] }, "Radial"),
  dp("concentric_diamonds", "concentric", "Concentric diamonds", { shape: "diamond", count: 5, colors: [C.gold, C.red] }, "Radial"),
  dp("polka_dots", "pattern", "Polka dots", { motif: "polka", colors: ["none", C.white] }, "Pattern"),
  dp("pinstripes", "pattern", "Pinstripes", { motif: "stripes", thickness: 0.2, size: 0.06 }, "Pattern"),
  dp("diagonal_hatching", "pattern", "Diagonal hatching", { motif: "stripes", rotation: 45, thickness: 0.4, size: 0.08 }, "Pattern"),
  dp("lozengy", "pattern", "Lozengy", { motif: "lozengy", size: 0.2 }, "Pattern"),
  dp("diagonal_checks", "pattern", "Diagonal checks", { motif: "checks", rotation: 45, size: 0.18 }, "Pattern"),
  dp("zigzag_pattern", "pattern", "Zigzag", { motif: "zigzag", size: 0.12 }, "Pattern"),
  dp("wave_pattern", "pattern", "Waves", { motif: "waves", size: 0.14 }, "Pattern"),
  dp("scales_pattern", "pattern", "Scales", { motif: "scales", size: 0.12 }, "Pattern"),
  dp("starfield", "pattern", "Starfield", { motif: "stars", size: 0.14, thickness: 0.6 }, "Pattern"),
  dp("honeycomb", "pattern", "Honeycomb", { motif: "hexagons", size: 0.16 }, "Pattern"),
  dp("brickwork", "pattern", "Brickwork", { motif: "bricks", size: 0.12 }, "Pattern"),
  dp("tartan", "pattern", "Tartan", { motif: "plaid", size: 0.3, thickness: 0.7, colors: ["#0b3d2e", "#9b1b30"] }, "Pattern"),
  dp("crosses_field", "pattern", "Field of crosses", { motif: "crosses", size: 0.14, thickness: 0.6 }, "Pattern"),
  dp("triangles_pattern", "pattern", "Triangles", { motif: "triangles", size: 0.14, thickness: 0.8 }, "Pattern"),
  dp("grid_pattern", "pattern", "Grid", { motif: "grid", size: 0.15, thickness: 0.3 }, "Pattern"),
];

export const divisionById = new Map(divisionDefs.map((d) => [d.id, d]));
export const divisionPresetById = new Map(divisionPresets.map((d) => [d.id, d]));

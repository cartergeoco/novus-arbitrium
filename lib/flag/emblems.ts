import { arrangements, constellations } from "./arrangements";
import { bool, list, num, str, type ParamDef, type Params } from "./params";
import { attrs, circle, n, path, poly, polar, rect, regularPolygon, starPoints, type Point } from "./svg";
import type { ComponentDef, EmblemContext, Preset } from "./types";

const W = "#ffffff", GOLD = "#f1bf00", RED = "#d52b1e";

const arrangementOnly = { key: "arrangement", not: ["single"] };
const g = "Arrangement";

/** Parameters every emblem accepts: placement, transform, outline and repetition. */
export const emblemCommon: ParamDef[] = [
  { key: "color", type: "color", default: W, label: "Color" },
  { key: "colors", type: "colors", min: 0, max: 8, default: [], label: "Secondary colors", help: "Extra colors for multi-part emblems." },
  { key: "x", type: "number", min: -0.5, max: 1.5, step: 0.005, default: 0.5, label: "X", help: "Center, as a fraction of flag width from the hoist." },
  { key: "y", type: "number", min: -0.5, max: 1.5, step: 0.005, default: 0.5, label: "Y", help: "Center, as a fraction of flag height from the top." },
  { key: "scale", type: "number", min: 0.01, max: 3, step: 0.005, default: 0.4, label: "Scale", help: "Size as a fraction of flag height (the whole group for arrangements)." },
  { key: "rotation", type: "number", min: -360, max: 360, step: 1, default: 0, label: "Rotation" },
  { key: "mirror", type: "bool", default: false, label: "Mirror" },
  { key: "flip", type: "bool", default: false, label: "Flip vertically" },
  { key: "opacity", type: "number", min: 0, max: 1, step: 0.05, default: 1, label: "Opacity" },
  { key: "outline", type: "color", optional: true, default: "none", label: "Outline", group: "Outline" },
  { key: "outlineWidth", type: "number", min: 0, max: 0.3, step: 0.005, default: 0.05, label: "Outline width", group: "Outline", when: { key: "outline", not: ["none"] } },
  { key: "arrangement", type: "enum", options: arrangements, default: "single", label: "Arrangement", group: g },
  { key: "count", type: "int", min: 1, max: 200, default: 5, label: "Count", group: g, when: { key: "arrangement", not: ["single", "staggered", "canton", "quincunx", "constellation", "custom", "rows"] } },
  { key: "rows", type: "int", min: 0, max: 40, default: 0, label: "Rows", group: g, when: { key: "arrangement", is: ["grid", "staggered", "canton"] }, help: "0 picks automatically." },
  { key: "cols", type: "int", min: 0, max: 60, default: 0, label: "Columns", group: g, when: { key: "arrangement", is: ["grid", "staggered", "canton"] } },
  { key: "pattern", type: "text", maxLength: 60, default: "", label: "Row counts", group: g, when: { key: "arrangement", is: ["rows", "rings"] }, help: "Items per row or ring, e.g. 6,5,6,5." },
  { key: "width", type: "number", min: 0, max: 1.5, step: 0.005, default: 0, label: "Box width", group: g, when: arrangementOnly, help: "Fraction of flag width; 0 derives it from scale." },
  { key: "height", type: "number", min: 0, max: 1.5, step: 0.005, default: 0, label: "Box height", group: g, when: arrangementOnly, help: "Fraction of flag height; 0 uses scale." },
  { key: "itemScale", type: "number", min: 0, max: 2, step: 0.005, default: 0, label: "Item size", group: g, when: arrangementOnly, help: "Each item relative to scale; 0 fits automatically." },
  { key: "startAngle", type: "number", min: -360, max: 360, step: 1, default: 0, label: "Start angle", group: g, when: { key: "arrangement", is: ["ring", "arc", "semicircle", "rings"] } },
  { key: "endAngle", type: "number", min: -360, max: 360, step: 1, default: 0, label: "End angle", group: g, when: { key: "arrangement", is: ["arc", "semicircle"] } },
  { key: "groupRotation", type: "number", min: -360, max: 360, step: 1, default: 0, label: "Group rotation", group: g, when: arrangementOnly },
  { key: "orient", type: "enum", options: ["upright", "outward", "inward", "tangent", "random"], default: "upright", label: "Item orientation", group: g, when: arrangementOnly },
  { key: "constellation", type: "enum", options: Object.keys(constellations), default: "southern_cross", label: "Constellation", group: g, when: { key: "arrangement", is: ["constellation"] } },
  { key: "positions", type: "text", maxLength: 2000, default: "", label: "Custom positions", group: g, when: { key: "arrangement", is: ["custom"] }, help: "x,y[,size];… in 0..1 of the box." },
  { key: "seed", type: "int", min: 0, max: 99999, default: 1, label: "Seed", group: g, when: { key: "arrangement", is: ["scatter"] } },
  { key: "itemColors", type: "colors", min: 0, max: 12, default: [], label: "Cycle colors", group: g, when: arrangementOnly, help: "Items cycle through these main colors." },
];

const int = (key: string, def: number, min: number, max: number, label: string, help?: string): ParamDef => ({ key, type: "int", default: def, min, max, label, help });
const frac = (key: string, def: number, label: string, min = 0, max = 1, help?: string): ParamDef => ({ key, type: "number", min, max, step: 0.005, default: def, label, help });
const choice = (key: string, options: readonly string[], def: string, label: string): ParamDef => ({ key, type: "enum", options, default: def, label });

const second = (p: Params, i = 0, fallback?: string) => list(p, "colors")[i] ?? fallback ?? str(p, "color");
const stroke = (d: string, color: string, width: number, extra: Record<string, string | number> = {}) =>
  color === "none" ? "" : `<path${attrs({ d, fill: "none", stroke: color, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round", ...extra })}/>`;
const d = (points: Point[]) => poly(points);
/** Four copies of a shape drawn for the upward arm, rotated around the center. */
const fourArms = (points: Point[], fill: string) => [0, 90, 180, 270].map((a) => path(d(points), fill, a ? ` transform="rotate(${a})"` : "")).join("");

function autoInner(points: number) {
  return points <= 3 ? 0.3 : points === 4 ? 0.38 : points === 5 ? 0.382 : points === 6 ? 0.5 : 0.45;
}

function polygram(nPoints: number, skip: number, r: number) {
  const k = Math.max(1, Math.min(Math.floor((nPoints - 1) / 2), skip));
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const loops = gcd(nPoints, k);
  let out = "";
  for (let s = 0; s < loops; s++) {
    const verts: Point[] = [];
    for (let i = 0; i < nPoints / loops; i++) verts.push(polar(0, 0, r, ((s + i * k) * 360) / nPoints));
    out += d(verts);
  }
  return out;
}

function crescentPath(R: number, r: number, o: number, cx = 0) {
  const x = (R * R - r * r + o * o) / (2 * o);
  if (Math.abs(x) >= R) {
    return `M${n(cx - R)} 0a${n(R)} ${n(R)} 0 1 0 ${n(R * 2)} 0a${n(R)} ${n(R)} 0 1 0 ${n(-R * 2)} 0ZM${n(cx + o - r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
  }
  const y = Math.sqrt(R * R - x * x);
  return `M${n(cx + x)} ${n(-y)}A${n(R)} ${n(R)} 0 ${x > 0 ? 1 : 0} 0 ${n(cx + x)} ${n(y)}A${n(r)} ${n(r)} 0 ${x > o ? 1 : 0} 1 ${n(cx + x)} ${n(-y)}Z`;
}

const shieldPaths: Record<string, string> = {
  heater: "M-.42 -.5H.42V0C.42 .28 .2 .42 0 .5C-.2 .42 -.42 .28 -.42 0Z",
  french: "M-.42 -.5H.42V.3Q.42 .4 .3 .4H.1Q0 .4 0 .5Q0 .4 -.1 .4H-.3Q-.42 .4 -.42 .3Z",
  iberian: "M-.42 -.5H.42V.08A.42 .42 0 0 1 -.42 .08Z",
  kite: "M0 -.5C.35 -.45 .4 -.2 .36 0C.3 .25 .1 .42 0 .5C-.1 .42 -.3 .25 -.36 0C-.4 -.2 -.35 -.45 0 -.5Z",
  swiss: "M-.42 -.5Q0 -.4 .42 -.5V.05C.42 .3 .2 .44 0 .5C-.2 .44 -.42 .3 -.42 .05Z",
  round: "M-.5 0A.5 .5 0 1 0 .5 0A.5 .5 0 1 0 -.5 0Z",
  oval: "M-.36 0A.36 .5 0 1 0 .36 0A.36 .5 0 1 0 -.36 0Z",
  square: "M-.45 -.5H.45V.5H-.45Z",
};

const shieldSplits: Record<string, string> = {
  pale: "M0 -1H1V1H0Z",
  fess: "M-1 0H1V1H-1Z",
  bend: "M-1 -1L1 1H-1Z",
  bend_sinister: "M1 -1L-1 1H1Z",
  quarterly: "M0 -1H1V0H0ZM-1 0H0V1H-1Z",
  chief: "M-1 -1H1V-.18H-1Z",
  saltire: "M-1 -1L0 0L1 -1ZM-1 1L0 0L1 1Z",
};

function sunRays(p: Params, rin: number, from = 0, sweep = 360, cy = 0) {
  const rays = num(p, "rays"), style = str(p, "style"), fill = second(p, 0), share = num(p, "rayWidth");
  const outer = 0.5, step = sweep / rays;
  let out = "";
  for (let i = 0; i < rays; i++) {
    const a = from + step * (i + (sweep < 360 ? 0.5 : 0)), hw = (step * share) / 2;
    const wavy = style === "wavy" || (style === "alternating" && i % 2 === 1);
    if (style === "straight" || style === "lines") {
      const w = style === "lines" ? 0.012 : ((rin * Math.PI * 2) / rays) * share * 0.55;
      const [x1, y1] = polar(0, cy, rin, a), [x2, y2] = polar(0, cy, outer, a);
      out += stroke(`M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`, fill, w, { "stroke-linecap": "butt" });
    } else if (wavy) {
      const left: Point[] = [], right: Point[] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14, r = rin + (outer - rin) * t, sway = Math.sin(t * Math.PI * 3) * step * 0.28, width = hw * 0.9 * (1 - t * 0.85);
        left.push(polar(0, cy, r, a + sway - width));
        right.unshift(polar(0, cy, r, a + sway + width));
      }
      out += path(d([...left, ...right]), fill);
    } else if (style === "flame") {
      const [ax, ay] = polar(0, cy, rin, a - hw), [bx, by] = polar(0, cy, rin, a + hw), [tx, ty] = polar(0, cy, outer, a + step * 0.45);
      const [c1x, c1y] = polar(0, cy, (rin + outer) / 2, a - hw * 0.2), [c2x, c2y] = polar(0, cy, (rin + outer) / 2, a + hw * 1.4);
      out += path(`M${n(ax)} ${n(ay)}Q${n(c1x)} ${n(c1y)} ${n(tx)} ${n(ty)}Q${n(c2x)} ${n(c2y)} ${n(bx)} ${n(by)}Z`, fill);
    } else {
      out += path(d([polar(0, cy, rin * 0.98, a - hw), polar(0, cy, outer, a), polar(0, cy, rin * 0.98, a + hw)]), fill);
    }
  }
  return out;
}

const sunParams: ParamDef[] = [
  int("rays", 12, 3, 72, "Rays"), choice("style", ["triangle", "straight", "wavy", "alternating", "flame", "lines"], "triangle", "Ray style"),
  frac("disc", 0.55, "Disc size", 0, 0.95), frac("rayWidth", 0.7, "Ray width", 0.05, 1), frac("ring", 0, "Ring gap", 0, 0.2, "Gap between disc and rays; the second secondary color fills it."),
];

export const emblemDefs: ComponentDef[] = [
  // Stars and celestial
  {
    id: "star", label: "Star", category: "Stars",
    description: "Star with any number of points. inner 0 picks a classic ratio; style polygram draws interlaced lines (e.g. Star of David).",
    params: [int("points", 5, 3, 32, "Points"), frac("inner", 0, "Inner radius", 0, 0.95, "0 = automatic."), choice("style", ["solid", "outline", "polygram"], "solid", "Style"), { ...int("skip", 2, 1, 15, "Polygram skip"), when: { key: "style", is: ["polygram"] } }, { ...frac("lineWidth", 0.07, "Line width", 0.01, 0.3), when: { key: "style", not: ["solid"] } }],
    defaults: { scale: 0.3 },
    render: (p) => {
      const k = num(p, "points"), inner = num(p, "inner") || autoInner(k), style = str(p, "style"), c = str(p, "color");
      if (style === "polygram") return stroke(polygram(k, num(p, "skip"), 0.5 - num(p, "lineWidth") / 2), c, num(p, "lineWidth"), { "stroke-linejoin": "miter" });
      const shape = d(starPoints(k, 0.5, 0.5 * inner));
      return style === "outline" ? stroke(shape, c, num(p, "lineWidth"), { "stroke-linejoin": "miter" }) : path(shape, c);
    },
  },
  {
    id: "compass_rose", label: "Compass rose", category: "Stars",
    description: "Layered long and short points, as on nautical charts and NATO's emblem.",
    params: [choice("points", ["4", "8", "16"], "8", "Points")],
    defaults: { scale: 0.4 },
    render: (p) => {
      const k = Number(str(p, "points")), c = str(p, "color"), c2 = second(p, 0);
      let out = "";
      if (k >= 16) out += path(d(starPoints(8, 0.26, 0.07, 22.5)), c2);
      if (k >= 8) out += path(d(starPoints(4, 0.34, 0.09, 45)), c2);
      return out + path(d(starPoints(4, 0.5, 0.1)), c);
    },
  },
  {
    id: "sun", label: "Sun", category: "Celestial",
    description: "Disc with rays: triangle, straight, wavy, alternating (Sun of May), flame or thin lines. First secondary color colors the rays.",
    params: sunParams, defaults: { scale: 0.45, color: GOLD },
    render: (p) => {
      const disc = num(p, "disc") * 0.5, ring = num(p, "ring") * 0.5;
      const ringColor = list(p, "colors")[1];
      return sunRays(p, disc + ring) + (ring > 0 && ringColor ? circle(0, 0, disc + ring, ringColor) : "") + circle(0, 0, disc, str(p, "color"));
    },
  },
  {
    id: "rising_sun", label: "Rising sun", category: "Celestial",
    description: "Half sun on the horizon with a fan of rays (Malawi, Kiribati, Arizona).",
    params: sunParams.filter((d) => d.key !== "ring"), defaults: { scale: 0.45, color: RED, rays: 15, disc: 0.5 },
    render: (p) => {
      const disc = num(p, "disc") * 0.5;
      return sunRays(p, disc, -90, 180, 0.25) + path(`M${n(-disc)} .25A${n(disc)} ${n(disc)} 0 0 1 ${n(disc)} .25Z`, str(p, "color"));
    },
  },
  {
    id: "crescent", label: "Crescent", category: "Celestial",
    description: "Crescent opening toward the fly at rotation 0. inner and offset control thickness.",
    params: [frac("inner", 0.8, "Inner circle", 0.3, 0.99), frac("offset", 0.25, "Offset", 0.02, 0.9)],
    defaults: { scale: 0.4 },
    render: (p) => path(crescentPath(0.5, 0.5 * num(p, "inner"), 0.5 * num(p, "offset")), str(p, "color"), ` fill-rule="evenodd"`),
  },
  {
    id: "moon", label: "Moon phase", category: "Celestial",
    description: "Moon lit from the fly side. phase 0.5 is a half moon and 1 is full; the first secondary color paints the dark side.",
    params: [frac("phase", 0.3, "Illuminated", 0, 1)],
    defaults: { scale: 0.4 },
    render: (p) => {
      const ph = num(p, "phase"), rx = 0.5 * Math.abs(1 - ph * 2), dark = list(p, "colors")[0];
      const lit = ph >= 0.999 ? circle(0, 0, 0.5, str(p, "color")) : ph <= 0.001 ? "" : path(`M0 -.5A.5 .5 0 0 1 0 .5A${n(rx)} .5 0 0 ${ph < 0.5 ? 0 : 1} 0 -.5Z`, str(p, "color"));
      return (dark ? circle(0, 0, 0.5, dark) : "") + lit;
    },
  },
  {
    id: "star_and_crescent", label: "Star and crescent", category: "Celestial",
    description: "Crescent with a star in its opening, in Turkish proportions. First secondary color recolors the star.",
    params: [int("points", 5, 3, 16, "Star points"), frac("starSize", 1, "Star size", 0.3, 2), frac("inner", 0.8, "Inner circle", 0.3, 0.99), frac("offset", 0.25, "Offset", 0.02, 0.9)],
    defaults: { scale: 0.45 },
    render: (p) => {
      const R = 0.3, s = 0.15 * num(p, "starSize");
      return path(crescentPath(R, R * num(p, "inner"), R * num(p, "offset"), -0.2), str(p, "color"), ` fill-rule="evenodd"`)
        + path(d(starPoints(num(p, "points"), s, s * autoInner(num(p, "points")), -90, 0.35, 0)), second(p, 0));
    },
  },
  // Geometric
  {
    id: "circle", label: "Circle (disc)", category: "Geometric", description: "Solid disc (Japan, Bangladesh, Palau).",
    params: [], defaults: { scale: 0.6, color: "#bc002d" },
    render: (p) => circle(0, 0, 0.5, str(p, "color")),
  },
  {
    id: "ring", label: "Ring", category: "Geometric", description: "Circle outline with adjustable thickness.",
    params: [frac("thickness", 0.12, "Thickness", 0.01, 0.5)], defaults: { scale: 0.5 },
    render: (p) => {
      const r = 0.5 - num(p, "thickness") / 2;
      return `<circle${attrs({ r, fill: "none", stroke: str(p, "color"), "stroke-width": num(p, "thickness") })}/>`;
    },
  },
  {
    id: "roundel", label: "Roundel", category: "Geometric", description: "Concentric rings cycling through color and secondary colors, like aircraft roundels.",
    params: [int("rings", 3, 2, 12, "Rings")], defaults: { scale: 0.5, colors: ["#0039a6", RED] },
    render: (p) => {
      const k = num(p, "rings"), cs = [str(p, "color"), ...list(p, "colors")];
      return Array.from({ length: k }, (_, i) => circle(0, 0, (0.5 * (k - i)) / k, cs[i % cs.length])).join("");
    },
  },
  {
    id: "polygon", label: "Polygon", category: "Geometric", description: "Regular polygon with 3–12 sides, solid or outlined.",
    params: [int("sides", 6, 3, 12, "Sides"), choice("style", ["solid", "outline"], "solid", "Style"), { ...frac("lineWidth", 0.08, "Line width", 0.01, 0.4), when: { key: "style", is: ["outline"] } }],
    render: (p) => {
      const shape = d(regularPolygon(num(p, "sides"), str(p, "style") === "outline" ? 0.5 - num(p, "lineWidth") / 2 : 0.5));
      return str(p, "style") === "outline" ? stroke(shape, str(p, "color"), num(p, "lineWidth"), { "stroke-linejoin": "miter" }) : path(shape, str(p, "color"));
    },
  },
  {
    id: "triangle", label: "Triangle", category: "Geometric", description: "Isosceles triangle pointing up; rotate it to point elsewhere.",
    params: [frac("aspect", 0.866, "Height ÷ width", 0.2, 3)],
    render: (p) => {
      const a = num(p, "aspect"), w = a >= 1 ? 1 / a : 1, h = a >= 1 ? 1 : a;
      return path(d([[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]), str(p, "color"));
    },
  },
  {
    id: "diamond", label: "Diamond", category: "Geometric", description: "Lozenge; aspect is width ÷ height.",
    params: [frac("aspect", 0.62, "Width ÷ height", 0.1, 3)],
    render: (p) => {
      const a = num(p, "aspect"), w = a >= 1 ? 0.5 : a / 2, h = a >= 1 ? 0.5 / a : 0.5;
      return path(d([[0, -h], [w, 0], [0, h], [-w, 0]]), str(p, "color"));
    },
  },
  {
    id: "rectangle", label: "Rectangle", category: "Geometric", description: "Square or rectangle with optional rounded corners.",
    params: [frac("aspect", 1, "Width ÷ height", 0.05, 20), frac("cornerRadius", 0, "Corner radius", 0, 0.5)],
    render: (p) => {
      const a = num(p, "aspect"), w = a >= 1 ? 1 : a, h = a >= 1 ? 1 / a : 1, r = num(p, "cornerRadius") * Math.min(w, h);
      return rect(-w / 2, -h / 2, w, h, str(p, "color"), r ? attrs({ rx: r }) : "");
    },
  },
  {
    id: "heart", label: "Heart", category: "Geometric", description: "Heart shape.",
    params: [],
    render: (p) => path("M0 .42C-.62 .02 -.52 -.5 -.24 -.46C-.1 -.44 0 -.34 0 -.22C0 -.34 .1 -.44 .24 -.46C.52 -.5 .62 .02 0 .42Z", str(p, "color")),
  },
  {
    id: "shield", label: "Shield", category: "Heraldic",
    description: "Heraldic escutcheon in several styles, optionally divided (pale, fess, bend, quarterly, chief, saltire) with the first secondary color.",
    params: [choice("style", Object.keys(shieldPaths), "heater", "Style"), choice("split", ["none", ...Object.keys(shieldSplits)], "none", "Division")],
    defaults: { scale: 0.55, color: RED, colors: [W] },
    render: (p, ctx) => {
      const shape = shieldPaths[str(p, "style")], split = str(p, "split"), id = `${ctx.uid}-sh${ctx.index}`;
      if (split === "none") return path(shape, str(p, "color"));
      return `<clipPath id="${id}"><path d="${shape}"/></clipPath>` + path(shape, str(p, "color")) + `<g clip-path="url(#${id})">${path(shieldSplits[split], second(p, 0))}</g>`;
    },
  },
  {
    id: "arrow", label: "Arrow", category: "Geometric", description: "Arrow pointing up at rotation 0.",
    params: [choice("style", ["simple", "block", "double", "chevron"], "simple", "Style"), frac("thickness", 0.14, "Shaft", 0.03, 0.5)],
    render: (p) => {
      const t = num(p, "thickness") / 2, c = str(p, "color"), style = str(p, "style");
      if (style === "chevron") return stroke("M-.4 .15L0 -.3L.4 .15", c, t * 2.4, { "stroke-linejoin": "miter", "stroke-linecap": "butt" });
      const head = style === "block" ? 0.5 : 0.36;
      const body: Point[] = style === "double"
        ? [[0, -0.5], [0.3, -0.5 + 0.3], [t, -0.2], [t, 0.2], [0.3, 0.2], [0, 0.5], [-0.3, 0.2], [-t, 0.2], [-t, -0.2], [-0.3, -0.2]]
        : [[0, -0.5], [head / 1.2, -0.5 + head], [t * (style === "block" ? 1.8 : 1), -0.5 + head], [t * (style === "block" ? 1.8 : 1), 0.5], [-t * (style === "block" ? 1.8 : 1), 0.5], [-t * (style === "block" ? 1.8 : 1), -0.5 + head], [-head / 1.2, -0.5 + head]];
      return path(d(body), c);
    },
  },
  {
    id: "chevron_mark", label: "Chevron mark", category: "Geometric", description: "Stand-alone V or chevron stripe.",
    params: [frac("thickness", 0.18, "Thickness", 0.02, 0.5), frac("angle", 0.55, "Height", 0.1, 1)],
    render: (p) => stroke(`M-.45 ${n(num(p, "angle") / 2)}L0 ${n(-num(p, "angle") / 2)}L.45 ${n(num(p, "angle") / 2)}`, str(p, "color"), num(p, "thickness"), { "stroke-linejoin": "miter", "stroke-linecap": "butt" }),
  },
  {
    id: "bar", label: "Bar", category: "Lines", description: "Straight bar (horizontal at rotation 0).",
    params: [frac("thickness", 0.15, "Thickness", 0.005, 1)], defaults: { scale: 0.6 },
    render: (p) => rect(-0.5, -num(p, "thickness") / 2, 1, num(p, "thickness"), str(p, "color")),
  },
  {
    id: "lines", label: "Parallel lines", category: "Lines", description: "Several parallel bars, e.g. stripes on a canton or a badge.",
    params: [int("lines", 3, 1, 20, "Lines"), frac("thickness", 0.12, "Thickness", 0.01, 1), frac("gap", 0.1, "Gap", 0, 1)], defaults: { scale: 0.5 },
    render: (p) => {
      const k = num(p, "lines"), t = num(p, "thickness"), gap = num(p, "gap"), total = k * t + (k - 1) * gap;
      return Array.from({ length: k }, (_, i) => rect(-0.5, -total / 2 + i * (t + gap), 1, t, i % 2 && list(p, "colors")[0] ? list(p, "colors")[0] : str(p, "color"))).join("");
    },
  },
  // Crosses
  {
    id: "greek_cross", label: "Greek cross", category: "Crosses", description: "Equal-armed cross (Swiss cross with thickness 0.3).",
    params: [frac("thickness", 0.3, "Arm width", 0.03, 0.9)], defaults: { scale: 0.5 },
    render: (p) => { const t = num(p, "thickness"); return rect(-t / 2, -0.5, t, 1, str(p, "color")) + rect(-0.5, -t / 2, 1, t, str(p, "color")); },
  },
  {
    id: "latin_cross", label: "Latin cross", category: "Crosses", description: "Christian cross with a raised crossbar.",
    params: [frac("thickness", 0.16, "Arm width", 0.03, 0.5), frac("barPosition", 0.3, "Crossbar", 0.1, 0.6), frac("span", 0.66, "Crossbar length", 0.2, 1)], defaults: { scale: 0.55 },
    render: (p) => { const t = num(p, "thickness"), y = -0.5 + num(p, "barPosition"), s = num(p, "span"); return rect(-t / 2, -0.5, t, 1, str(p, "color")) + rect(-s / 2, y - t / 2, s, t, str(p, "color")); },
  },
  {
    id: "patriarchal_cross", label: "Double cross", category: "Crosses", description: "Patriarchal (double) cross with a short upper bar, as on Slovakia's and Hungary's arms. style lorraine lowers the second bar.",
    params: [frac("thickness", 0.12, "Arm width", 0.03, 0.4), choice("style", ["patriarchal", "lorraine"], "patriarchal", "Style")], defaults: { scale: 0.55 },
    render: (p) => {
      const t = num(p, "thickness"), c = str(p, "color"), lorraine = str(p, "style") === "lorraine";
      return rect(-t / 2, -0.5, t, 1, c) + rect(-0.22, (lorraine ? -0.3 : -0.28) - t / 2, 0.44, t, c) + rect(lorraine ? -0.3 : -0.34, (lorraine ? 0.12 : -0.02) - t / 2, lorraine ? 0.6 : 0.68, t, c);
    },
  },
  {
    id: "orthodox_cross", label: "Orthodox cross", category: "Crosses", description: "Three-barred cross with a slanted foot bar.",
    params: [frac("thickness", 0.1, "Arm width", 0.03, 0.3)], defaults: { scale: 0.55 },
    render: (p) => {
      const t = num(p, "thickness"), c = str(p, "color");
      return rect(-t / 2, -0.5, t, 1, c) + rect(-0.16, -0.36 - t / 2, 0.32, t, c) + rect(-0.34, -0.16 - t / 2, 0.68, t, c) + path(d([[-0.24, 0.22], [0.24, 0.1], [0.24, 0.1 + t], [-0.24, 0.22 + t]]), c);
    },
  },
  {
    id: "tau_cross", label: "Tau cross", category: "Crosses", description: "T-shaped cross.",
    params: [frac("thickness", 0.2, "Arm width", 0.03, 0.5)], defaults: { scale: 0.5 },
    render: (p) => { const t = num(p, "thickness"); return rect(-0.5, -0.5, 1, t, str(p, "color")) + rect(-t / 2, -0.5, t, 1, str(p, "color")); },
  },
  {
    id: "cross_pattee", label: "Cross pattée", category: "Crosses", description: "Cross with arms flaring toward the ends. notch cuts a V into each arm (Maltese cross).",
    params: [frac("waist", 0.08, "Waist", 0.01, 0.3), frac("flare", 0.3, "Flare", 0.1, 0.5), frac("notch", 0, "Notch", 0, 0.3)], defaults: { scale: 0.5 },
    render: (p) => {
      const a = num(p, "waist"), b = num(p, "flare"), k = num(p, "notch");
      return fourArms([[-a, -a], [-b, -0.5], ...(k ? [[0, -0.5 + k] as Point] : []), [b, -0.5], [a, -a]], str(p, "color")) + rect(-a - 0.001, -a - 0.001, a * 2 + 0.002, a * 2 + 0.002, str(p, "color"));
    },
  },
  {
    id: "cross_potent", label: "Cross potent", category: "Crosses", description: "Cross with T-shaped crossbars at each end. With jerusalem on, four small crosses fill the quarters.",
    params: [frac("thickness", 0.12, "Arm width", 0.03, 0.3), { key: "jerusalem", type: "bool", default: false, label: "Jerusalem cross" }], defaults: { scale: 0.5 },
    render: (p) => {
      const t = num(p, "thickness"), c = str(p, "color");
      let out = rect(-t / 2, -0.5, t, 1, c) + rect(-0.5, -t / 2, 1, t, c);
      out += fourArms([[-0.2, -0.5], [0.2, -0.5], [0.2, -0.5 + t], [-0.2, -0.5 + t]], c);
      if (bool(p, "jerusalem")) {
        const small = second(p, 0), s = 0.09, st = t * 0.7;
        for (const [x, y] of [[-0.29, -0.29], [0.29, -0.29], [-0.29, 0.29], [0.29, 0.29]]) out += rect(x - st / 2, y - s, st, s * 2, small) + rect(x - s, y - st / 2, s * 2, st, small);
      }
      return out;
    },
  },
  {
    id: "celtic_cross", label: "Celtic cross", category: "Crosses", description: "Latin cross with a ring around the intersection.",
    params: [frac("thickness", 0.12, "Arm width", 0.03, 0.3)], defaults: { scale: 0.6 },
    render: (p) => {
      const t = num(p, "thickness"), c = str(p, "color");
      return `<circle${attrs({ cy: -0.15, r: 0.2, fill: "none", stroke: c, "stroke-width": t * 0.6 })}/>` + rect(-t / 2, -0.5, t, 1, c) + rect(-0.36, -0.15 - t / 2, 0.72, t, c);
    },
  },
  {
    id: "cross_crosslet", label: "Cross crosslet", category: "Crosses", description: "Each arm of the cross is itself crossed.",
    params: [frac("thickness", 0.1, "Arm width", 0.03, 0.25)], defaults: { scale: 0.5 },
    render: (p) => { const t = num(p, "thickness"), c = str(p, "color"); return rect(-t / 2, -0.5, t, 1, c) + rect(-0.5, -t / 2, 1, t, c) + fourArms([[-0.14, -0.34], [0.14, -0.34], [0.14, -0.34 + t], [-0.14, -0.34 + t]], c); },
  },
  {
    id: "cross_bottony", label: "Cross bottony", category: "Crosses", description: "Cross with trefoil (three-lobed) ends.",
    params: [frac("thickness", 0.12, "Arm width", 0.03, 0.3)], defaults: { scale: 0.5 },
    render: (p) => {
      const t = num(p, "thickness"), c = str(p, "color"), r = t * 0.75;
      let out = rect(-t / 2, -0.5 + r, t, 1 - r * 2, c) + rect(-0.5 + r, -t / 2, 1 - r * 2, t, c);
      for (const a of [0, 90, 180, 270]) out += `<g transform="rotate(${a})">${circle(0, -0.5 + r, r, c)}${circle(-r * 1.1, -0.5 + r * 2.1, r * 0.85, c)}${circle(r * 1.1, -0.5 + r * 2.1, r * 0.85, c)}</g>`;
      return out;
    },
  },
  {
    id: "saltire_mark", label: "Saltire mark", category: "Crosses", description: "Small X-shaped cross (a saltire as an emblem).",
    params: [frac("thickness", 0.2, "Arm width", 0.03, 0.6)], defaults: { scale: 0.45 },
    render: (p) => { const t = num(p, "thickness"); return rect(-t / 2, -0.7, t, 1.4, str(p, "color"), ` transform="rotate(45)"`) + rect(-t / 2, -0.7, t, 1.4, str(p, "color"), ` transform="rotate(-45)"`); },
  },
  {
    id: "full_cross", label: "Full cross", category: "Crosses", span: true,
    description: "Cross extending to the flag edges, centered on x,y. x 0.375 gives an off-center Nordic cross. Stack a thinner copy on top for fimbriation.",
    params: [frac("thickness", 0.2, "Thickness", 0.005, 0.9, "Fraction of height."), frac("verticalThickness", 0, "Vertical thickness", 0, 0.9, "0 uses thickness.")],
    defaults: { x: 0.5, y: 0.5 },
    render: (p, ctx) => {
      const b = ctx.body, t = num(p, "thickness") * b.h, tv = (num(p, "verticalThickness") || num(p, "thickness")) * b.h;
      return rect(ctx.cx - tv / 2, b.y - 1, tv, b.h + 2, str(p, "color")) + rect(b.x - 1, ctx.cy - t / 2, b.w + 2, t, str(p, "color"));
    },
  },
  {
    id: "full_saltire", label: "Full saltire", category: "Crosses", span: true,
    description: "X from corner to corner across the whole flag, passing through x,y.",
    params: [frac("thickness", 0.16, "Thickness", 0.005, 0.9)],
    render: (p, ctx) => {
      const b = ctx.body, t = num(p, "thickness") * b.h, dx = b.w * 2, dy = b.h * 2;
      return stroke(`M${n(ctx.cx - dx)} ${n(ctx.cy - dy)}L${n(ctx.cx + dx)} ${n(ctx.cy + dy)}M${n(ctx.cx - dx)} ${n(ctx.cy + dy)}L${n(ctx.cx + dx)} ${n(ctx.cy - dy)}`, str(p, "color"), t, { "stroke-linecap": "butt" });
    },
  },
  {
    id: "full_line", label: "Full-width line", category: "Lines", span: true,
    description: "Horizontal or vertical line across the whole flag through y (or x).",
    params: [choice("orientation", ["horizontal", "vertical"], "horizontal", "Orientation"), frac("thickness", 0.04, "Thickness", 0.002, 0.9)],
    render: (p, ctx) => {
      const b = ctx.body, t = num(p, "thickness") * b.h;
      return str(p, "orientation") === "vertical" ? rect(ctx.cx - t / 2, b.y - 1, t, b.h + 2, str(p, "color")) : rect(b.x - 1, ctx.cy - t / 2, b.w + 2, t, str(p, "color"));
    },
  },
  {
    id: "border_line", label: "Inset border line", category: "Lines", span: true,
    description: "Thin frame inset from the flag edge.",
    params: [frac("inset", 0.06, "Inset", 0, 0.45), frac("thickness", 0.025, "Thickness", 0.002, 0.3)],
    render: (p, ctx) => {
      const b = ctx.body, i = num(p, "inset") * b.h, t = num(p, "thickness") * b.h;
      return `<rect${attrs({ x: b.x + i + t / 2, y: b.y + i + t / 2, width: b.w - i * 2 - t, height: b.h - i * 2 - t, fill: "none", stroke: str(p, "color"), "stroke-width": t })}/>`;
    },
  },
  {
    id: "corner_square", label: "Corner square", category: "Geometric", span: true,
    description: "Square tucked into a corner of the flag.",
    params: [choice("corner", ["upper_hoist", "upper_fly", "lower_hoist", "lower_fly"], "upper_hoist", "Corner"), frac("size", 0.3, "Size", 0.02, 1, "Fraction of height."), frac("inset", 0, "Inset", 0, 0.4)],
    render: (p, ctx) => {
      const b = ctx.body, s = num(p, "size") * b.h, i = num(p, "inset") * b.h, c = str(p, "corner");
      return rect(c.endsWith("fly") ? b.x + b.w - s - i : b.x + i, c.startsWith("lower") ? b.y + b.h - s - i : b.y + i, s, s, str(p, "color"));
    },
  },
  {
    id: "corner_triangle", label: "Corner triangle", category: "Geometric", span: true,
    description: "Right triangle filling a corner of the flag.",
    params: [choice("corner", ["upper_hoist", "upper_fly", "lower_hoist", "lower_fly"], "upper_hoist", "Corner"), frac("size", 0.5, "Size", 0.02, 2, "Fraction of height.")],
    render: (p, ctx) => {
      const b = ctx.body, s = num(p, "size") * b.h, c = str(p, "corner");
      const x = c.endsWith("fly") ? b.x + b.w : b.x, y = c.startsWith("lower") ? b.y + b.h : b.y;
      const sx = c.endsWith("fly") ? -s : s, sy = c.startsWith("lower") ? -s : s;
      return path(d([[x, y], [x + sx, y], [x, y + sy]]), str(p, "color"));
    },
  },
  // Symbols
  {
    id: "wreath", label: "Wreath", category: "Heraldic", description: "Laurel or olive wreath of two branches, open at the top. First secondary color draws a ribbon.",
    params: [int("leaves", 9, 3, 20, "Leaves per side"), { key: "gap", type: "number", min: 0, max: 200, step: 1, default: 60, label: "Opening (degrees)" }, frac("leafSize", 0.5, "Leaf size", 0.2, 1)],
    defaults: { scale: 0.6, color: "#3e7d32" },
    render: (p) => {
      const k = num(p, "leaves"), gap = num(p, "gap"), c = str(p, "color"), ls = num(p, "leafSize"), ribbon = list(p, "colors")[0];
      let out = "";
      for (const side of [1, -1]) {
        const from = 180 - 12, to = gap / 2;
        out += stroke(arcPath(0.38, side * from, side * to), c, 0.025);
        for (let i = 0; i < k; i++) {
          const a = side * (from + ((to - from) * (i + 0.5)) / k);
          for (const [dr, tilt] of [[0.06, 35], [-0.06, -35]] as const) {
            const [x, y] = polar(0, 0, 0.38 + dr, a);
            out += `<ellipse${attrs({ cx: x, cy: y, rx: 0.035 * ls * 2, ry: 0.075 * ls * 2, fill: c, transform: `rotate(${n(a - side * 90 + side * tilt)} ${n(x)} ${n(y)})` })}/>`;
          }
        }
      }
      if (ribbon) out += path("M-.12 .36L0 .44L.12 .36L.16 .5L.06 .46L0 .5L-.06 .46L-.16 .5Z", ribbon);
      return out;
    },
  },
  {
    id: "gear", label: "Gear", category: "Symbols", description: "Cogwheel with adjustable teeth and hole (industry, labor).",
    params: [int("teeth", 12, 5, 48, "Teeth"), frac("toothDepth", 0.12, "Tooth depth", 0.02, 0.3), frac("hole", 0.35, "Hole", 0, 0.8)],
    defaults: { scale: 0.5, color: GOLD },
    render: (p) => {
      const k = num(p, "teeth"), outer = 0.5, root = 0.5 - num(p, "toothDepth"), step = 360 / k;
      const pts: Point[] = [];
      for (let i = 0; i < k; i++) {
        const a = i * step;
        pts.push(polar(0, 0, root, a), polar(0, 0, root, a + step * 0.2), polar(0, 0, outer, a + step * 0.32), polar(0, 0, outer, a + step * 0.68), polar(0, 0, root, a + step * 0.8));
      }
      const h = num(p, "hole") * root;
      return path(d(pts) + (h > 0 ? `M${n(-h)} 0a${n(h)} ${n(h)} 0 1 0 ${n(h * 2)} 0a${n(h)} ${n(h)} 0 1 0 ${n(-h * 2)} 0Z` : ""), str(p, "color"), ` fill-rule="evenodd"`);
    },
  },
  {
    id: "wheel", label: "Wheel (chakra)", category: "Symbols", description: "Spoked wheel such as the Ashoka Chakra (24 spokes) or dharma wheel (8).",
    params: [int("spokes", 24, 3, 48, "Spokes"), frac("rim", 0.06, "Rim", 0.01, 0.2), frac("hub", 0.1, "Hub", 0.02, 0.3), frac("spokeWidth", 0.025, "Spoke width", 0.005, 0.1)],
    defaults: { scale: 0.45, color: "#000080" },
    render: (p) => {
      const c = str(p, "color"), rim = num(p, "rim"), k = num(p, "spokes");
      let spokes = "";
      for (let i = 0; i < k; i++) { const [x, y] = polar(0, 0, 0.5 - rim / 2, (i * 360) / k); spokes += `M0 0L${n(x)} ${n(y)}`; }
      return `<circle${attrs({ r: 0.5 - rim / 2, fill: "none", stroke: c, "stroke-width": rim })}/>` + stroke(spokes, c, num(p, "spokeWidth")) + circle(0, 0, num(p, "hub"), c);
    },
  },
  {
    id: "yin_yang", label: "Yin-yang / taegeuk", category: "Symbols", description: "Taijitu with dots, or the Korean taegeuk (style taegeuk). Uses color and the first secondary color.",
    params: [choice("style", ["taijitu", "taegeuk"], "taijitu", "Style")],
    defaults: { scale: 0.5, color: "#000000", colors: [W] },
    render: (p) => {
      const a = str(p, "color"), b = second(p, 0, W);
      if (str(p, "style") === "taegeuk") return circle(0, 0, 0.5, b) + path("M-.5 0A.5 .5 0 0 1 .5 0A.25 .25 0 0 1 0 0A.25 .25 0 0 0 -.5 0Z", a);
      return circle(0, 0, 0.5, b) + path("M0 -.5A.5 .5 0 0 1 0 .5A.25 .25 0 0 1 0 0A.25 .25 0 0 0 0 -.5Z", a) + circle(0, -0.25, 0.08, a) + circle(0, 0.25, 0.08, b);
    },
  },
  {
    id: "trigram", label: "Trigram", category: "Symbols", description: "I Ching bars: pattern of 1 (solid) and 0 (broken), top to bottom, e.g. 111 heaven or 010 water.",
    params: [{ key: "pattern", type: "text", maxLength: 6, default: "101", label: "Pattern" }],
    defaults: { scale: 0.3, color: "#000000" },
    render: (p) => {
      const bits = String(p.pattern || "101").replace(/[^01]/g, "").slice(0, 6) || "1";
      const k = bits.length, t = 1 / (k * 2 - 1);
      return [...bits].map((bit, i) => {
        const y = -0.5 + i * t * 2;
        return bit === "1" ? rect(-0.5, y, 1, t, str(p, "color")) : rect(-0.5, y, 0.44, t, str(p, "color")) + rect(0.06, y, 0.44, t, str(p, "color"));
      }).join("");
    },
  },
  {
    id: "flower", label: "Flower / rosette", category: "Plants", description: "Rosette of petals around a center disc (first secondary color).",
    params: [int("petals", 5, 3, 24, "Petals"), frac("petalWidth", 0.22, "Petal width", 0.05, 0.5), frac("center", 0.14, "Center", 0, 0.4)],
    defaults: { scale: 0.45, colors: [GOLD] },
    render: (p) => {
      const k = num(p, "petals"), w = num(p, "petalWidth");
      let out = "";
      for (let i = 0; i < k; i++) out += `<ellipse${attrs({ cy: -0.25, rx: w / 2, ry: 0.25, fill: str(p, "color"), transform: `rotate(${n((i * 360) / k)})` })}/>`;
      return out + circle(0, 0, num(p, "center"), second(p, 0));
    },
  },
  {
    id: "leaf", label: "Leaf", category: "Plants", description: "Simple pointed leaf with an optional midrib (first secondary color).",
    params: [frac("width", 0.35, "Width", 0.1, 0.9)],
    defaults: { scale: 0.45, color: "#009739" },
    render: (p) => {
      const w = num(p, "width"), rib = list(p, "colors")[0];
      return path(`M0 -.5Q${n(w)} 0 0 .5Q${n(-w)} 0 0 -.5Z`, str(p, "color")) + (rib ? stroke("M0 -.42V.5", rib, 0.03) : "");
    },
  },
  {
    id: "mountains", label: "Mountains", category: "Landscape", description: "Row of peaks; first secondary color adds snowcaps.",
    params: [int("peaks", 3, 1, 7, "Peaks")],
    defaults: { scale: 0.4, color: "#5b4636" },
    render: (p) => {
      const k = num(p, "peaks"), snow = list(p, "colors")[0], w = 1 / (k * 0.7 + 0.3);
      let out = "";
      const order = Array.from({ length: k }, (_, i) => i).sort((a, b) => Math.abs(a - (k - 1) / 2) > Math.abs(b - (k - 1) / 2) ? -1 : 1);
      for (const i of order) {
        const cx = -0.5 + w / 2 + i * w * 0.7, h = 0.6 + 0.4 * (1 - Math.abs(i - (k - 1) / 2) / Math.max(1, k / 2)), top = 0.5 - h;
        out += path(d([[cx - w / 2, 0.5], [cx, top], [cx + w / 2, 0.5]]), str(p, "color"));
        if (snow) out += path(d([[cx - w * 0.14, top + h * 0.28], [cx, top], [cx + w * 0.14, top + h * 0.28], [cx + w * 0.05, top + h * 0.22], [cx - w * 0.04, top + h * 0.3]]), snow);
      }
      return out;
    },
  },
  {
    id: "waves", label: "Waves", category: "Landscape", description: "Stacked wavy lines for sea and water.",
    params: [int("lines", 3, 1, 8, "Lines"), frac("amplitude", 0.08, "Amplitude", 0, 0.25), frac("thickness", 0.07, "Thickness", 0.01, 0.2)],
    defaults: { scale: 0.4, color: "#0072c6" },
    render: (p) => {
      const k = num(p, "lines"), a = num(p, "amplitude");
      let out = "";
      for (let i = 0; i < k; i++) {
        const y = k === 1 ? 0 : -0.35 + (0.7 * i) / (k - 1);
        out += stroke(`M-.5 ${n(y)}q.125 ${n(-a * 2)} .25 0t.25 0t.25 0t.25 0`, str(p, "color"), num(p, "thickness"));
      }
      return out;
    },
  },
  {
    id: "crown", label: "Crown", category: "Heraldic", description: "Simple procedural crown with points and optional jewels (first secondary color).",
    params: [int("points", 5, 3, 9, "Points"), { key: "orbs", type: "bool", default: true, label: "Orbs on points" }],
    defaults: { scale: 0.4, color: GOLD },
    render: (p) => {
      const k = num(p, "points"), c = str(p, "color"), jewel = list(p, "colors")[0];
      const pts: Point[] = [[-0.45, 0.3], [-0.45, -0.3]];
      for (let i = 0; i < k; i++) {
        const x = -0.45 + (0.9 * i) / (k - 1);
        if (i > 0) pts.push([x - 0.45 / (k - 1), 0]);
        pts.push([x, -0.3]);
      }
      pts.push([0.45, 0.3]);
      let out = path(d(pts), c) + rect(-0.45, 0.3, 0.9, 0.14, c);
      if (bool(p, "orbs")) for (let i = 0; i < k; i++) out += circle(-0.45 + (0.9 * i) / (k - 1), -0.36, 0.06, c);
      if (jewel) for (let i = 0; i < 3; i++) out += circle(-0.25 + i * 0.25, 0.37, 0.04, jewel);
      return out;
    },
  },
  {
    id: "lightning", label: "Lightning bolt", category: "Symbols", description: "Zigzag lightning bolt.",
    params: [], defaults: { scale: 0.45, color: GOLD },
    render: (p) => path(d([[0.12, -0.5], [-0.26, 0.06], [0, 0.06], [-0.12, 0.5], [0.26, -0.1], [0, -0.1]]), str(p, "color")),
  },
  {
    id: "drop", label: "Drop", category: "Symbols", description: "Teardrop.",
    params: [], defaults: { scale: 0.35, color: "#0072c6" },
    render: (p) => path("M0 -.5C.2 -.2 .34 -.02 .34 .16A.34 .34 0 0 1 -.34 .16C-.34 -.02 -.2 -.2 0 -.5Z", str(p, "color")),
  },
  {
    id: "text", label: "Text / motto", category: "Text", description: "Motto or monogram, stretched to the emblem width so layout does not depend on fonts.",
    params: [{ key: "text", type: "text", maxLength: 40, default: "LIBERTAS", label: "Text" }, choice("font", ["serif", "sans", "mono", "display"], "serif", "Font"), choice("weight", ["normal", "bold"], "bold", "Weight"), frac("fontSize", 0.3, "Font size", 0.05, 1), { key: "fit", type: "bool", default: true, label: "Stretch to width" }],
    defaults: { scale: 0.6 },
    render: (p) => {
      const fonts: Record<string, string> = { serif: "Georgia, 'Times New Roman', serif", sans: "Helvetica, Arial, sans-serif", mono: "'IBM Plex Mono', monospace", display: "Impact, 'Arial Black', sans-serif" };
      const text = String(p.text || "").trim();
      if (!text) return "";
      const fs = num(p, "fontSize") * 100;
      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      // Text is laid out at 100× and scaled down: some browsers mishandle sub-pixel font sizes.
      return `<g transform="scale(.01)"><text${attrs({ y: fs * 0.35, "text-anchor": "middle", "font-family": fonts[str(p, "font")], "font-weight": str(p, "weight"), "font-size": fs, fill: str(p, "color"), textLength: bool(p, "fit") ? 100 : undefined, lengthAdjust: bool(p, "fit") ? "spacingAndGlyphs" : undefined })}>${escaped}</text></g>`;
    },
  },
  {
    id: "ribbon", label: "Ribbon scroll", category: "Text", description: "Motto scroll with folded ends; optional text drawn in the first secondary color.",
    params: [{ key: "text", type: "text", maxLength: 40, default: "", label: "Text" }],
    defaults: { scale: 0.6, color: W, colors: ["#000000"] },
    render: (p) => {
      const c = str(p, "color"), text = String(p.text || "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const shade = `<g opacity=".75">${path("M-.5 -.04H-.3V.2H-.5L-.42 .08Z", c)}${path("M.5 -.04H.3V.2H.5L.42 .08Z", c)}</g>`;
      return shade + rect(-0.4, -0.12, 0.8, 0.24, c) + (text ? `<g transform="scale(.01)"><text${attrs({ y: 4.5, "text-anchor": "middle", "font-family": "Georgia, serif", "font-size": 13, "font-weight": "bold", fill: second(p, 0, "#000000"), textLength: 70, lengthAdjust: "spacingAndGlyphs" })}>${text}</text></g>` : "");
    },
  },
  {
    id: "asset", label: "Library emblem", category: "Library",
    description: "Artwork from the emblem library (animals, weapons, crowns, national arms…). Monochrome icons take color; full-color arms keep their colors unless recolor is mono.",
    params: [{ key: "asset", type: "asset", default: "gi:lion", label: "Emblem" }, choice("recolor", ["original", "mono"], "original", "Coloring")],
    defaults: { scale: 0.5 },
    render: (p, ctx: EmblemContext) => {
      const asset = ctx.getAsset(str(p, "asset"));
      if (!asset) return `<circle r=".42" fill="none" stroke="${str(p, "color")}" stroke-width=".04" stroke-dasharray=".08 .06" opacity=".5"/>`;
      const [vx, vy, vw, vh] = asset.viewBox, s = 1 / Math.max(vw, vh);
      let body = asset.body;
      if (asset.multicolor && str(p, "recolor") === "mono") body = monochrome(body);
      return `<g${attrs({ color: str(p, "color"), transform: `scale(${n(s)}) translate(${n(-vx - vw / 2)} ${n(-vy - vh / 2)})` })}>${body}</g>`;
    },
  },
];

function arcPath(r: number, fromDeg: number, toDeg: number) {
  const [x1, y1] = polar(0, 0, r, fromDeg), [x2, y2] = polar(0, 0, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0, sweep = toDeg > fromDeg ? 1 : 0;
  return `M${n(x1)} ${n(y1)}A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(x2)} ${n(y2)}`;
}

/** Force every painted color in a full-color artwork to the current color. */
export function monochrome(markup: string) {
  return markup
    .replace(/\b(fill|stroke)="(?!none)[^"]*"/g, '$1="currentColor"')
    .replace(/\b(fill|stroke):\s*(?!none)[^;"]+/g, "$1:currentColor")
    .replace(/\bstop-color="[^"]*"/g, 'stop-color="currentColor"');
}

const ep = (id: string, base: string, label: string, params: Params, category?: string, description?: string, tags?: string[]): Preset => ({ id, base, label, params, category, description, tags });

/** Named emblem variations, including star arrangements. */
export const emblemPresets: Preset[] = [
  ...[3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24].map((k) => ep(`star_${k}`, "star", `${k}-point star`, { points: k }, "Stars")),
  ep("star_outline", "star", "Outlined star", { style: "outline" }, "Stars"),
  ep("pentagram", "star", "Pentagram", { style: "polygram", points: 5, skip: 2 }, "Stars"),
  ep("star_of_david", "star", "Star of David", { style: "polygram", points: 6, skip: 2, lineWidth: 0.08, color: "#0038b8" }, "Stars"),
  ep("hexagram", "star", "Hexagram", { points: 6 }, "Stars"),
  ep("octagram", "star", "Octagram (star of Lakshmi)", { style: "polygram", points: 8, skip: 3 }, "Stars"),
  ep("commonwealth_star", "star", "Commonwealth star", { points: 7, inner: 0.44 }, "Stars"),
  ep("sharp_star", "star", "Sharp star", { points: 5, inner: 0.25 }, "Stars"),
  ep("fat_star", "star", "Fat star", { points: 5, inner: 0.55 }, "Stars"),
  ep("four_point_sparkle", "star", "Sparkle", { points: 4, inner: 0.18 }, "Stars"),
  ep("sunburst_star", "star", "Sunburst star", { points: 16, inner: 0.6 }, "Stars"),
  ep("compass_rose_4", "compass_rose", "Four-point compass rose", { points: "4" }, "Stars"),
  ep("compass_rose_16", "compass_rose", "Sixteen-point compass rose", { points: "16" }, "Stars"),
  ep("star_row", "star", "Row of stars", { arrangement: "row", count: 5, scale: 0.18 }, "Star arrangements"),
  ep("star_column", "star", "Column of stars", { arrangement: "column", count: 3, scale: 0.2 }, "Star arrangements"),
  ep("star_grid", "star", "Grid of stars", { arrangement: "grid", rows: 3, cols: 4, count: 12, scale: 0.5 }, "Star arrangements"),
  ep("star_ring", "star", "Ring of stars", { arrangement: "ring", count: 12, scale: 0.6, color: GOLD }, "Star arrangements"),
  ep("eu_stars", "star", "European ring", { arrangement: "ring", count: 12, scale: 2 / 3, itemScale: 1 / 6, color: "#ffcc00" }, "Star arrangements", "Twelve gold stars, as on the flag of Europe."),
  ep("star_arc", "star", "Arc of stars", { arrangement: "arc", count: 7, scale: 0.6, startAngle: -60, endAngle: 60 }, "Star arrangements"),
  ep("star_semicircle", "star", "Semicircle of stars", { arrangement: "semicircle", count: 8, scale: 0.6 }, "Star arrangements"),
  ep("star_scatter", "star", "Scattered stars", { arrangement: "scatter", count: 12, width: 0.9, height: 0.8 }, "Star arrangements"),
  ep("star_cluster", "star", "Star cluster", { arrangement: "cluster", count: 13, scale: 0.5 }, "Star arrangements"),
  ep("star_canton", "star", "Canton stars (50)", { arrangement: "canton", rows: 9, cols: 6, scale: 0.5 }, "Star arrangements", "Staggered 9×6 grid filling a US-style canton."),
  ep("star_rows", "star", "Rows of stars", { arrangement: "rows", pattern: "3,2", scale: 0.35 }, "Star arrangements"),
  ep("southern_cross", "star", "Southern Cross", { arrangement: "constellation", constellation: "southern_cross", points: 7, inner: 0.44, scale: 0.7, x: 0.75 }, "Star arrangements"),
  ep("big_dipper", "star", "Big Dipper", { arrangement: "constellation", constellation: "big_dipper", scale: 0.6, color: GOLD }, "Star arrangements"),
  ep("orion_belt", "star", "Orion's belt", { arrangement: "constellation", constellation: "orion_belt", scale: 0.5 }, "Star arrangements"),
  ep("cassiopeia", "star", "Cassiopeia", { arrangement: "constellation", constellation: "cassiopeia", scale: 0.5 }, "Star arrangements"),
  ep("star_quincunx", "star", "Five stars (quincunx)", { arrangement: "quincunx", scale: 0.45 }, "Star arrangements"),
  ep("star_pyramid", "star", "Pyramid of stars", { arrangement: "pyramid", count: 6, scale: 0.45 }, "Star arrangements"),
  ep("stars_diagonal", "star", "Diagonal stars", { arrangement: "diagonal", count: 3, scale: 0.6, width: 0.4 }, "Star arrangements"),
  ep("star_rings", "star", "Concentric star rings", { arrangement: "rings", pattern: "1,6,12", scale: 0.7 }, "Star arrangements"),
  ep("sun_straight", "sun", "Sun with straight rays", { style: "straight", rays: 16 }, "Celestial"),
  ep("sun_of_may", "sun", "Sun of May", { style: "alternating", rays: 32, disc: 0.45, rayWidth: 0.6, color: "#f6b40e" }, "Celestial", "Alternating straight and wavy rays (Argentina, Uruguay)."),
  ep("sun_wavy", "sun", "Wavy sun", { style: "wavy", rays: 12 }, "Celestial"),
  ep("sun_flame", "sun", "Flaming sun", { style: "flame", rays: 20, disc: 0.5 }, "Celestial"),
  ep("sun_lines", "sun", "Radiant sun", { style: "lines", rays: 40, disc: 0.4 }, "Celestial"),
  ep("white_sun", "sun", "White sun", { style: "triangle", rays: 12, disc: 0.53, ring: 0.07, rayWidth: 0.85, color: W, colors: [W, "#000095"] }, "Celestial", "Twelve-rayed sun with a ring, as on Taiwan's flag."),
  ep("kyrgyz_sun", "sun", "Forty-ray sun", { style: "flame", rays: 40, disc: 0.6, color: "#ffef00" }, "Celestial"),
  ep("crescent_thin", "crescent", "Thin crescent", { inner: 0.9, offset: 0.2 }, "Celestial"),
  ep("crescent_thick", "crescent", "Thick crescent", { inner: 0.7, offset: 0.35 }, "Celestial"),
  ep("crescent_upturned", "crescent", "Upturned crescent", { rotation: -90 }, "Celestial"),
  ep("half_moon", "moon", "Half moon", { phase: 0.5 }, "Celestial"),
  ep("full_moon", "moon", "Full moon", { phase: 1 }, "Celestial"),
  ep("turkish_crescent", "star_and_crescent", "Turkish star and crescent", {}, "Celestial"),
  ep("disc_large", "circle", "Large disc", { scale: 0.6 }, "Geometric"),
  ep("ring_thin", "ring", "Thin ring", { thickness: 0.05 }, "Geometric"),
  ep("ring_thick", "ring", "Thick ring", { thickness: 0.25 }, "Geometric"),
  ep("target", "roundel", "Target", { rings: 5, colors: [RED] }, "Geometric"),
  ep("pentagon", "polygon", "Pentagon", { sides: 5 }, "Geometric"),
  ep("hexagon", "polygon", "Hexagon", { sides: 6 }, "Geometric"),
  ep("octagon", "polygon", "Octagon", { sides: 8, rotation: 22.5 }, "Geometric"),
  ep("square", "rectangle", "Square", {}, "Geometric"),
  ep("rounded_square", "rectangle", "Rounded square", { cornerRadius: 0.2 }, "Geometric"),
  ep("triangle_down", "triangle", "Downward triangle", { rotation: 180 }, "Geometric"),
  ep("arrow_right", "arrow", "Arrow toward fly", { rotation: 90 }, "Geometric"),
  ep("double_arrow", "arrow", "Double arrow", { style: "double" }, "Geometric"),
  ep("swiss_cross", "greek_cross", "Swiss cross", { thickness: 0.3, scale: 0.6 }, "Crosses"),
  ep("thin_greek_cross", "greek_cross", "Thin cross", { thickness: 0.12 }, "Crosses"),
  ep("thick_greek_cross", "greek_cross", "Thick cross", { thickness: 0.45 }, "Crosses"),
  ep("double_cross", "patriarchal_cross", "Double cross", {}, "Crosses"),
  ep("cross_of_lorraine", "patriarchal_cross", "Cross of Lorraine", { style: "lorraine" }, "Crosses"),
  ep("maltese_cross", "cross_pattee", "Maltese cross", { waist: 0.04, flare: 0.3, notch: 0.18 }, "Crosses"),
  ep("iron_cross", "cross_pattee", "Iron cross", { waist: 0.12, flare: 0.3, color: "#000000", outline: W, outlineWidth: 0.05 }, "Crosses"),
  ep("jerusalem_cross", "cross_potent", "Jerusalem cross", { jerusalem: true }, "Crosses"),
  ep("nordic_cross", "full_cross", "Nordic cross", { x: 0.375, thickness: 0.2 }, "Crosses", "Off-center Scandinavian cross spanning the flag."),
  ep("uneven_cross", "full_cross", "Uneven cross", { x: 0.36, thickness: 0.2 }, "Crosses"),
  ep("nordic_cross_thin", "full_cross", "Thin Nordic cross", { x: 0.36, thickness: 0.1 }, "Crosses"),
  ep("centered_full_cross", "full_cross", "Centered cross", { thickness: 0.2 }, "Crosses"),
  ep("thin_full_cross", "full_cross", "Thin full cross", { thickness: 0.06 }, "Crosses"),
  ep("thick_full_cross", "full_cross", "Thick full cross", { thickness: 0.36 }, "Crosses"),
  ep("st_andrew", "full_saltire", "St Andrew's cross", { thickness: 0.2 }, "Crosses"),
  ep("thin_full_saltire", "full_saltire", "Thin saltire", { thickness: 0.06 }, "Crosses"),
  ep("ashoka_chakra", "wheel", "Ashoka Chakra", { spokes: 24, color: "#000080", scale: 0.3 }, "Symbols"),
  ep("dharma_wheel", "wheel", "Dharma wheel", { spokes: 8, rim: 0.1, hub: 0.14, spokeWidth: 0.06, color: GOLD }, "Symbols"),
  ep("cogwheel", "gear", "Cogwheel", { teeth: 10, toothDepth: 0.15, hole: 0.4 }, "Symbols"),
  ep("taegeuk", "yin_yang", "Taegeuk", { style: "taegeuk", color: "#cd2e3a", colors: ["#0047a0"], rotation: 33.7 }, "Symbols"),
  ep("trigram_heaven", "trigram", "Heaven trigram ☰", { pattern: "111" }, "Symbols"),
  ep("trigram_earth", "trigram", "Earth trigram ☷", { pattern: "000" }, "Symbols"),
  ep("trigram_water", "trigram", "Water trigram ☵", { pattern: "010" }, "Symbols"),
  ep("trigram_fire", "trigram", "Fire trigram ☲", { pattern: "101" }, "Symbols"),
  ep("laurel_wreath", "wreath", "Laurel wreath", {}, "Heraldic"),
  ep("olive_wreath", "wreath", "Olive wreath", { leaves: 12, gap: 90, leafSize: 0.4, color: "#6b8e23" }, "Heraldic"),
  ep("wreath_with_ribbon", "wreath", "Wreath with ribbon", { colors: [RED] }, "Heraldic"),
  ep("heater_shield", "shield", "Heater shield", {}, "Heraldic"),
  ep("shield_per_pale", "shield", "Shield per pale", { split: "pale" }, "Heraldic"),
  ep("shield_quarterly", "shield", "Quartered shield", { split: "quarterly" }, "Heraldic"),
  ep("shield_with_chief", "shield", "Shield with chief", { split: "chief", colors: [GOLD] }, "Heraldic"),
  ep("iberian_shield", "shield", "Iberian shield", { style: "iberian" }, "Heraldic"),
  ep("round_shield", "shield", "Round shield", { style: "round" }, "Heraldic"),
  ep("royal_crown", "crown", "Royal crown", { points: 5, colors: [RED] }, "Heraldic"),
  ep("rosette_eight", "flower", "Eight-petal rosette", { petals: 8 }, "Plants"),
  ep("lotus_rosette", "flower", "Lotus rosette", { petals: 12, petalWidth: 0.14, color: "#f4a6c0" }, "Plants"),
  ep("snowy_peaks", "mountains", "Snowy peaks", { colors: [W] }, "Landscape"),
  ep("single_peak", "mountains", "Single mountain", { peaks: 1 }, "Landscape"),
  ep("motto_ribbon", "ribbon", "Motto ribbon", { text: "UNITY" }, "Text"),
  ep("monogram", "text", "Monogram", { text: "N", fontSize: 0.9, fit: false }, "Text"),
  ep("inset_frame", "border_line", "Inset frame", {}, "Lines"),
  ep("center_line", "full_line", "Center line", {}, "Lines"),
  ep("hoist_corner_square", "corner_square", "Hoist corner square", {}, "Geometric"),
  ep("fly_corner_triangle", "corner_triangle", "Fly corner triangle", { corner: "lower_fly" }, "Geometric"),
];

export const emblemById = new Map(emblemDefs.map((e) => [e.id, e]));
export const emblemPresetById = new Map(emblemPresets.map((e) => [e.id, e]));

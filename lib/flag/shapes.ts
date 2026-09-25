import type { ParamDef } from "./params";
import { num } from "./params";
import { CANVAS, n, poly, type Box, type Point } from "./svg";
import type { Preset, ShapeDef } from "./types";

const ratio = (value: number, label = "Height ÷ width"): ParamDef => ({
  key: "ratio", type: "number", min: 0.25, max: 2, step: 0.005, default: value, label,
  help: "Proportion of the flag body. 0.5 fills the 2:1 canvas; 1 is square; above 1 is a vertical banner.",
});
const edge: ParamDef[] = [
  { key: "edgeColor", type: "color", optional: true, default: "none", label: "Edge color", help: "Border that follows the outline." },
  { key: "edgeWidth", type: "number", min: 0, max: 0.2, step: 0.005, default: 0, label: "Edge width", help: "Fraction of the body height." },
];

const pts = (b: Box, list: Point[]) => poly(list.map(([x, y]) => [b.x + x * b.w, b.y + y * b.h]));

export const shapeDefs: ShapeDef[] = [
  {
    id: "rectangle", label: "Rectangle", category: "Rectangular",
    description: "Standard rectangular flag with any proportion and optional rounded corners.",
    params: [ratio(2 / 3), { key: "cornerRadius", type: "number", min: 0, max: 0.5, step: 0.01, default: 0, label: "Corner radius" }, ...edge],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const r = Math.min(num(p, "cornerRadius") * b.h, b.w / 2, b.h / 2);
      if (!r) return `M${n(b.x)} ${n(b.y)}H${n(b.x + b.w)}V${n(b.y + b.h)}H${n(b.x)}Z`;
      const { x, y, w, h } = b;
      return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;
    },
  },
  {
    id: "tailed", label: "Swallowtail / tailed", category: "Swallowtail",
    description: "Fly edge cut into two or more pointed tails. Two tails is the classic swallowtail.",
    params: [
      ratio(2 / 3),
      { key: "tails", type: "int", min: 2, max: 7, default: 2, label: "Tails" },
      { key: "depth", type: "number", min: 0.02, max: 0.7, step: 0.01, default: 0.25, label: "Cut depth", help: "Fraction of the width." },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const tails = num(p, "tails"), d = num(p, "depth");
      const list: Point[] = [[0, 0]];
      for (let i = 0; i < tails; i++) {
        list.push([1, i / (tails - 1)]);
        if (i < tails - 1) list.push([1 - d, (i + 0.5) / (tails - 1)]);
      }
      list.push([0, 1]);
      return pts(b, list);
    },
  },
  {
    id: "swallowtail_tongue", label: "Swallowtail with tongue", category: "Swallowtail",
    description: "Scandinavian split flag (orlogsflag): a swallowtail with a central tongue.",
    params: [
      ratio(56 / 107),
      { key: "depth", type: "number", min: 0.05, max: 0.6, step: 0.01, default: 0.3, label: "Cut depth" },
      { key: "tongue", type: "number", min: 0.04, max: 0.5, step: 0.01, default: 0.143, label: "Tongue height" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const d = num(p, "depth"), t = num(p, "tongue") / 2;
      return pts(b, [[0, 0], [1, 0], [1 - d, 0.5 - t], [1, 0.5 - t], [1, 0.5 + t], [1 - d, 0.5 + t], [1, 1], [0, 1]]);
    },
  },
  {
    id: "pennant", label: "Pennant", category: "Pennant",
    description: "Triangular or tapering flag narrowing to the fly. A blunt tip gives a truncated pennant.",
    params: [
      ratio(0.5),
      { key: "tip", type: "number", min: 0, max: 0.9, step: 0.01, default: 0, label: "Tip height", help: "Height of the fly end; 0 is a sharp point." },
      { key: "tipY", type: "number", min: 0, max: 1, step: 0.01, default: 0.5, label: "Tip position" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const t = num(p, "tip") / 2, y = num(p, "tipY");
      return t ? pts(b, [[0, 0], [1, Math.max(0, y - t)], [1, Math.min(1, y + t)], [0, 1]]) : pts(b, [[0, 0], [1, y], [0, 1]]);
    },
  },
  {
    id: "burgee", label: "Burgee", category: "Pennant",
    description: "Tapering flag with a swallowtail notch at the fly, like yacht burgees and the flag of Ohio.",
    params: [
      ratio(8 / 13),
      { key: "flyHeight", type: "number", min: 0, max: 1, step: 0.01, default: 0.5, label: "Fly height", help: "Height of the fly edge relative to the hoist." },
      { key: "depth", type: "number", min: 0.02, max: 0.6, step: 0.01, default: 0.22, label: "Notch depth" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const f = num(p, "flyHeight") / 2, d = num(p, "depth");
      return pts(b, [[0, 0], [1, 0.5 - f], [1 - d, 0.5], [1, 0.5 + f], [0, 1]]);
    },
  },
  {
    id: "tapered", label: "Tapered", category: "Pennant",
    description: "Trapezoid narrowing toward the fly, used for streamers and some historical banners.",
    params: [ratio(0.5), { key: "flyHeight", type: "number", min: 0.05, max: 1, step: 0.01, default: 0.55, label: "Fly height" }, ...edge],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const f = num(p, "flyHeight") / 2;
      return pts(b, [[0, 0], [1, 0.5 - f], [1, 0.5 + f], [0, 1]]);
    },
  },
  {
    id: "rounded_fly", label: "Rounded fly", category: "Guidon",
    description: "Rectangle whose fly end is rounded, like some military guidons.",
    params: [ratio(0.6), { key: "roundness", type: "number", min: 0.1, max: 1, step: 0.01, default: 1, label: "Roundness" }, ...edge],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const rx = Math.min(b.w, (b.h / 2) * num(p, "roundness")), ry = b.h / 2;
      return `M${n(b.x)} ${n(b.y)}H${n(b.x + b.w - rx)}A${n(rx)} ${n(ry)} 0 0 1 ${n(b.x + b.w - rx)} ${n(b.y + b.h)}H${n(b.x)}Z`;
    },
  },
  {
    id: "schwenkel", label: "Schwenkel", category: "Historical",
    description: "Medieval war flag with a tapering streamer (Schwenkel) extending from the top of the fly.",
    params: [
      ratio(0.5),
      { key: "tail", type: "number", min: 0.1, max: 0.7, step: 0.01, default: 0.35, label: "Streamer length" },
      { key: "tailHeight", type: "number", min: 0.05, max: 0.6, step: 0.01, default: 0.25, label: "Streamer height" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const m = 1 - num(p, "tail"), th = num(p, "tailHeight");
      return pts(b, [[0, 0], [1, 0], [m, th], [m, 1], [0, 1]]);
    },
  },
  {
    id: "double_pennon", label: "Double pennon (Nepal)", category: "Pennant",
    description: "Two stacked pennants, the only non-rectangular national flag shape (Nepal).",
    params: [ratio(4 / 3), { key: "overlap", type: "number", min: 0.3, max: 0.6, step: 0.005, default: 0.47, label: "Upper pennant base" }, ...edge],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const y = num(p, "overlap"), lower = 0.25;
      const x = Math.max(0, (y - lower) / (1 - lower));
      return pts(b, [[0, 0], [1, y], [x, y], [1, 1], [0, 1]]);
    },
  },
  {
    id: "gonfalon", label: "Gonfalon", category: "Vertical",
    description: "Vertical banner hung from a crossbar, its lower edge cut into tails.",
    params: [
      ratio(1.5),
      { key: "tails", type: "int", min: 1, max: 7, default: 3, label: "Tails" },
      { key: "depth", type: "number", min: 0, max: 0.5, step: 0.01, default: 0.18, label: "Cut depth" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const tails = num(p, "tails"), d = num(p, "depth");
      const list: Point[] = [[0, 0], [1, 0], [1, 1 - d]];
      for (let i = tails; i >= 1; i--) {
        list.push([(i - 0.5) / tails, 1]);
        if (i > 1) list.push([(i - 1) / tails, 1 - d]);
      }
      list.push([0, 1 - d]);
      return pts(b, list);
    },
  },
  {
    id: "waving", label: "Waving", category: "Stylized",
    description: "Rectangle with gently rippled edges, as if flying in wind.",
    params: [
      ratio(2 / 3),
      { key: "amplitude", type: "number", min: 0, max: 0.12, step: 0.005, default: 0.04, label: "Ripple" },
      { key: "waves", type: "number", min: 0.5, max: 4, step: 0.25, default: 1.5, label: "Waves" },
      ...edge,
    ],
    ratio: (p) => num(p, "ratio"),
    outline: (p, b) => {
      const a = num(p, "amplitude") * b.h, k = num(p, "waves");
      const steps = 32, top: string[] = [], bottom: string[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, dy = Math.sin(t * k * Math.PI * 2) * a * t;
        top.push(`${n(b.x + t * b.w)} ${n(b.y + a + dy)}`);
        bottom.unshift(`${n(b.x + t * b.w)} ${n(b.y + b.h - a + dy)}`);
      }
      return `M${top.join("L")}L${bottom.join("L")}Z`;
    },
  },
];

const rect = (id: string, label: string, r: number, description: string, tags: string[] = []): Preset => ({
  id, base: "rectangle", label, category: "Proportions", description, params: { ratio: r }, tags,
});

/** Named shapes and real-world proportions. Ratios are height ÷ width. */
export const shapePresets: Preset[] = [
  rect("rectangle_standard", "Standard 2:3", 2 / 3, "The most common national proportion."),
  rect("rectangle_long", "Long 1:2", 1 / 2, "Fills the whole 2:1 canvas."),
  rect("rectangle_square", "Square 1:1", 1, "Square flag."),
  rect("rectangle_wide", "Wide 3:5", 3 / 5, "Common civil proportion."),
  rect("rectangle_4_5", "Near-square 4:5", 4 / 5, "Nearly square."),
  rect("rectangle_3_4", "3:4", 3 / 4, "Squat rectangle."),
  rect("rectangle_7_10", "7:10", 7 / 10, "Slightly squat."),
  rect("rectangle_5_8", "5:8", 5 / 8, "Nordic civil proportion."),
  rect("rectangle_extra_long", "Extra long 11:28", 11 / 28, "Very elongated."),
  rect("vertical_banner", "Vertical banner 3:2", 3 / 2, "Hanging vertical banner."),
  rect("shape_usa", "United States 10:19", 10 / 19, "USA", ["country"]),
  rect("shape_uk", "United Kingdom 1:2", 1 / 2, "UK", ["country"]),
  rect("shape_europe", "European 2:3", 2 / 3, "EU and most of Europe", ["country"]),
  rect("shape_japan", "Japan 2:3", 2 / 3, "Japan", ["country"]),
  rect("shape_germany", "Germany 3:5", 3 / 5, "Germany", ["country"]),
  rect("shape_france", "France 2:3", 2 / 3, "France", ["country"]),
  rect("shape_belgium", "Belgium 13:15", 13 / 15, "Belgium", ["country"]),
  rect("shape_denmark", "Denmark 28:37", 28 / 37, "Denmark", ["country"]),
  rect("shape_norway", "Norway 8:11", 8 / 11, "Norway", ["country"]),
  rect("shape_sweden", "Sweden 5:8", 5 / 8, "Sweden", ["country"]),
  rect("shape_finland", "Finland 11:18", 11 / 18, "Finland", ["country"]),
  rect("shape_iceland", "Iceland 18:25", 18 / 25, "Iceland", ["country"]),
  rect("shape_switzerland", "Switzerland 1:1", 1, "Switzerland", ["country"]),
  rect("shape_vatican", "Vatican 1:1", 1, "Vatican City", ["country"]),
  rect("shape_qatar", "Qatar 11:28", 11 / 28, "Qatar", ["country"]),
  rect("shape_poland", "Poland 5:8", 5 / 8, "Poland", ["country"]),
  rect("shape_russia", "Russia 2:3", 2 / 3, "Russia", ["country"]),
  rect("shape_india", "India 2:3", 2 / 3, "India", ["country"]),
  rect("shape_china", "China 2:3", 2 / 3, "China", ["country"]),
  rect("shape_canada", "Canada 1:2", 1 / 2, "Canada", ["country"]),
  rect("shape_brazil", "Brazil 7:10", 7 / 10, "Brazil", ["country"]),
  rect("shape_mexico", "Mexico 4:7", 4 / 7, "Mexico", ["country"]),
  rect("shape_iran", "Iran 4:7", 4 / 7, "Iran", ["country"]),
  rect("shape_argentina", "Argentina 9:14", 9 / 14, "Argentina", ["country"]),
  rect("shape_australia", "Australia 1:2", 1 / 2, "Australia and New Zealand", ["country"]),
  rect("shape_israel", "Israel 8:11", 8 / 11, "Israel", ["country"]),
  rect("shape_south_korea", "South Korea 2:3", 2 / 3, "South Korea", ["country"]),
  rect("shape_north_korea", "North Korea 1:2", 1 / 2, "North Korea", ["country"]),
  rect("shape_nigeria", "Nigeria 1:2", 1 / 2, "Nigeria", ["country"]),
  rect("shape_monaco", "Monaco 4:5", 4 / 5, "Monaco", ["country"]),
  rect("shape_luxembourg", "Luxembourg 3:5", 3 / 5, "Luxembourg", ["country"]),
  rect("shape_bolivia", "Bolivia 15:22", 15 / 22, "Bolivia", ["country"]),
  rect("shape_paraguay", "Paraguay 3:5", 3 / 5, "Paraguay", ["country"]),
  rect("shape_togo", "Togo golden ratio", 1 / 1.618, "Togo", ["country"]),
  rect("shape_niger", "Niger 6:7", 6 / 7, "Niger", ["country"]),
  rect("shape_papua_new_guinea", "Papua New Guinea 3:4", 3 / 4, "Papua New Guinea", ["country"]),
  rect("shape_albania", "Albania 5:7", 5 / 7, "Albania", ["country"]),
  rect("shape_hungary", "Hungary 1:2", 1 / 2, "Hungary", ["country"]),
  rect("shape_kazakhstan", "Kazakhstan 1:2", 1 / 2, "Kazakhstan", ["country"]),
  rect("shape_sri_lanka", "Sri Lanka 1:2", 1 / 2, "Sri Lanka", ["country"]),
  rect("shape_liechtenstein", "Liechtenstein 3:5", 3 / 5, "Liechtenstein", ["country"]),
  rect("shape_malaysia", "Malaysia 1:2", 1 / 2, "Malaysia", ["country"]),
  rect("shape_ecuador", "Ecuador 1:2", 1 / 2, "Ecuador", ["country"]),
  { id: "rounded", base: "rectangle", label: "Rounded corners", category: "Stylized", params: { ratio: 2 / 3, cornerRadius: 0.08 } },
  { id: "rounded_square", base: "rectangle", label: "Rounded square", category: "Stylized", params: { ratio: 1, cornerRadius: 0.12 } },
  { id: "swallowtail", base: "tailed", label: "Swallowtail", category: "Swallowtail", params: { ratio: 2 / 3, tails: 2, depth: 0.25 } },
  { id: "swallowtail_deep", base: "tailed", label: "Deep swallowtail", category: "Swallowtail", params: { ratio: 2 / 3, tails: 2, depth: 0.42 } },
  { id: "swallowtail_long", base: "tailed", label: "Long swallowtail", category: "Swallowtail", params: { ratio: 0.5, tails: 2, depth: 0.2 } },
  { id: "three_tailed", base: "tailed", label: "Three tails", category: "Swallowtail", params: { ratio: 2 / 3, tails: 3, depth: 0.2 } },
  { id: "multi_tailed", base: "tailed", label: "Many tails", category: "Swallowtail", params: { ratio: 0.55, tails: 5, depth: 0.15 } },
  { id: "danish_split_flag", base: "swallowtail_tongue", label: "Danish split flag", category: "Swallowtail", params: { ratio: 56 / 107, depth: 0.32, tongue: 4 / 28 } },
  { id: "swedish_split_flag", base: "swallowtail_tongue", label: "Swedish three-tailed", category: "Swallowtail", params: { ratio: 0.5, depth: 0.3, tongue: 0.2 } },
  { id: "cavalry_guidon", base: "tailed", label: "Cavalry guidon", category: "Guidon", params: { ratio: 0.65, tails: 2, depth: 0.33 } },
  { id: "guidon_rounded", base: "rounded_fly", label: "Rounded guidon", category: "Guidon", params: { ratio: 0.6, roundness: 1 } },
  { id: "triangular", base: "pennant", label: "Triangular", category: "Pennant", params: { ratio: 0.85 } },
  { id: "pennant_long", base: "pennant", label: "Long pennant", category: "Pennant", params: { ratio: 0.3 } },
  { id: "pennant_truncated", base: "pennant", label: "Truncated pennant", category: "Pennant", params: { ratio: 0.5, tip: 0.2 } },
  { id: "pennant_asymmetric", base: "pennant", label: "Asymmetric pennant", category: "Pennant", params: { ratio: 0.5, tipY: 0.15 } },
  { id: "ohio", base: "burgee", label: "Ohio burgee", category: "Pennant", params: { ratio: 8 / 13, flyHeight: 0.5, depth: 0.23 } },
  { id: "yacht_burgee", base: "pennant", label: "Yacht burgee", category: "Pennant", params: { ratio: 2 / 3 } },
  { id: "swallowtail_burgee", base: "burgee", label: "Swallowtail burgee", category: "Pennant", params: { ratio: 2 / 3, flyHeight: 0.75, depth: 0.3 } },
  { id: "streamer", base: "burgee", label: "Streamer", category: "Pennant", params: { ratio: 0.28, flyHeight: 0.35, depth: 0.12 } },
  { id: "medieval_pennon", base: "burgee", label: "Medieval pennon", category: "Historical", params: { ratio: 0.33, flyHeight: 0.4, depth: 0.2 } },
  { id: "war_schwenkel", base: "schwenkel", label: "Schwenkel war flag", category: "Historical", params: { ratio: 0.5, tail: 0.4, tailHeight: 0.3 } },
  { id: "nepal", base: "double_pennon", label: "Nepal", category: "Pennant", params: { ratio: 4 / 3 }, tags: ["country"] },
  { id: "gonfalon_three", base: "gonfalon", label: "Three-tailed gonfalon", category: "Vertical", params: { ratio: 1.5, tails: 3 } },
  { id: "gonfalon_pointed", base: "gonfalon", label: "Pointed banner", category: "Vertical", params: { ratio: 1.5, tails: 1, depth: 0.2 } },
  { id: "vexillum", base: "gonfalon", label: "Vexillum", category: "Historical", params: { ratio: 1.15, tails: 5, depth: 0.06 } },
  { id: "waving_flag", base: "waving", label: "Waving flag", category: "Stylized", params: { ratio: 2 / 3, amplitude: 0.05 } },
];

export const shapeById = new Map(shapeDefs.map((s) => [s.id, s]));
export const shapePresetById = new Map(shapePresets.map((s) => [s.id, s]));

/** Largest box of the shape's proportion that fits the 2:1 canvas, centered. */
export function bodyBox(r: number): Box {
  const { width: W, height: H } = CANVAS;
  const ratio = Math.min(2, Math.max(0.25, r || 2 / 3));
  let w = W, h = W * ratio;
  if (h > H) { h = H; w = H / ratio; }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

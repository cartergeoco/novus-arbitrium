import { namedColors, resolveColor } from "./color";
import { normalizeFlag, parseLayerPhrase } from "./normalize";
import type { FlagDesign } from "./types";

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, twenty: 20, fifty: 50, single: 1, double: 2, triple: 3,
};

const divisionRules: [RegExp, (count?: number) => Record<string, unknown>][] = [
  [/union jack|union flag/, () => ({ type: "union_jack", area: "canton" })],
  [/(nordic|scandinavian|offset) cross/, () => ({ type: "nordic_cross" })],
  [/saltire|diagonal cross|x[- ]shaped cross|st\.? andrew/, () => ({ type: "saltire" })],
  [/checker|chequ|checkerboard/, () => ({ type: "checkered" })],
  [/quarter(ed|ly)?/, () => ({ type: "quartered" })],
  [/four[- ]way|per saltire/, () => ({ type: "four_way_split" })],
  [/y[- ]shaped|\bpall\b/, () => ({ type: "y_division" })],
  [/double chevron/, () => ({ type: "double_chevron" })],
  [/chevron/, () => ({ type: "chevron" })],
  [/(hoist|left)[- ]?(side )?triangle|triangle (at|on) the (hoist|left)/, () => ({ type: "hoist_triangle" })],
  [/(fly|right)[- ]?(side )?triangle/, () => ({ type: "fly_triangle" })],
  [/triangle/, () => ({ type: "hoist_triangle" })],
  [/double diagonal/, () => ({ type: "double_diagonal_right" })],
  [/diagonal(ly)? (split|divided)|divided diagonally|split diagonally|per bend/, () => ({ type: "diagonal_split" })],
  [/diagonal|sash|\bbend\b/, () => ({ type: "diagonal_right" })],
  [/sunburst|rays|rising sun/, () => ({ type: "rising_sun_rays" })],
  [/serrat|saw[- ]?tooth/, () => ({ type: "serrated" })],
  [/wav(y|es)/, (n) => ({ type: "wavy_stripes", count: n ?? 5 })],
  [/diamond|lozenge|rhombus/, () => ({ type: "lozenge" })],
  [/border|bordure|frame/, () => ({ type: "border" })],
  [/canton/, () => ({ type: "canton" })],
  [/(centre|center|central) (band|stripe)/, () => ({ type: "center_band" })],
  [/vertical (stripes|bands|bars|tricolou?r|bicolou?r)|vertical/, (n) => ({ type: "vertical_stripes", count: n ?? 3 })],
  [/tricolou?r/, () => ({ type: "horizontal_stripes", count: 3 })],
  [/bicolou?r/, () => ({ type: "horizontal_stripes", count: 2 })],
  [/stripes|bands|bars|striped/, (n) => ({ type: "horizontal_stripes", count: n ?? 3 })],
  [/\bcross\b/, () => ({ type: "centered_cross" })],
  [/checks|polka|pattern/, () => ({ type: "polka_dots" })],
];

const shapeRules: [RegExp, string][] = [
  [/nepal|double pennant/, "nepal"], [/swallow ?tail|forked/, "swallowtail"], [/burgee|ohio/, "ohio"], [/pennant|triangular flag/, "pennant"],
  [/square/, "rectangle_square"], [/vertical banner|hanging banner|gonfalon/, "gonfalon_three"], [/long|wide|1:2/, "rectangle_long"], [/waving/, "waving_flag"],
];

function colorsIn(text: string) {
  const found: [number, string][] = [];
  for (const name of Object.keys(namedColors).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${name.replace(/_/g, "[\\s_-]+")}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) if (!found.some(([i]) => Math.abs(i - m!.index) < 2)) found.push([m.index, name]);
  }
  for (const m of text.matchAll(/#[0-9a-f]{6}\b/g)) found.push([m.index ?? 0, m[0]]);
  return found.sort((a, b) => a[0] - b[0]).map(([, c]) => resolveColor(c)!);
}

/**
 * Offline, rule-based reading of a plain-language description. The AI route produces richer results;
 * this keeps the creator useful without a model.
 */
export function describeFlag(description: string): FlagDesign {
  let text = ` ${description.toLowerCase()} `;
  for (const [word, value] of Object.entries(numberWords)) text = text.replace(new RegExp(`\\b${word}\\b`, "g"), String(value));
  const shape = shapeRules.find(([re]) => re.test(text))?.[1] ?? "rectangle_standard";
  const clauses = text.split(/\bwith\b|;|\bfeaturing\b|\bbearing\b|\bcharged with\b|\bon top\b|(?:,\s*|\s)and(?=\s+(?:an?|\d+)\s)|,(?=\s*(?:an?|\d+)\s)/).map((c) => c.trim()).filter(Boolean);
  const layers: Record<string, unknown>[] = [];
  let divisionColors: string[] = [];
  let divisionFound = false;
  for (const clause of clauses) {
    const rule = !divisionFound || /canton|border|band|cross|triangle|chevron|diagonal/.test(clause) ? divisionRules.find(([re]) => re.test(clause)) : undefined;
    const isEmblemClause = /\bstars?\b|\bsun\b|crescent|moon|disc|circle|emblem|eagle|lion|coat of arms|shield|crown|sword|wreath|wheel|\b(of|an?)\b [a-z]+$/.test(clause) && !/stripes|bands|tricolou?r|cross|canton|triangle|border/.test(clause);
    if (rule && !isEmblemClause) {
      const count = Number(clause.match(/\b(\d+)\b/)?.[1]) || undefined;
      const layer = { kind: "division", ...rule[1](count) } as Record<string, unknown>;
      const colors = colorsIn(clause);
      if (colors.length) {
        if (["canton", "border", "center_band", "hoist_triangle", "fly_triangle", "lozenge", "serrated"].includes(String(layer.type))) layer.color = colors[0];
        else layer.colors = colors;
        if (!divisionFound) divisionColors = colors;
      }
      layers.push(layer);
      divisionFound = true;
      continue;
    }
    const phrase = parseLayerPhrase(clause);
    if (typeof phrase.type === "string" && phrase.type.length > 1) {
      if (/\bstars\b/.test(clause) && !phrase.count) phrase.count = 5;
      if (phrase.count && /stars?/.test(String(phrase.type))) {
        phrase.type = "star";
        phrase.arrangement ??= /ring|circle/.test(clause) ? "ring" : /arc/.test(clause) ? "arc" : /grid/.test(clause) ? "grid" : /canton/.test(clause) ? "canton" : /scatter/.test(clause) ? "scatter" : "row";
        if (phrase.arrangement !== "row") phrase.scale ??= 0.5;
      }
      if (/ring|circle of/.test(clause) && phrase.type === "star") phrase.arrangement = "ring";
      layers.push({ kind: "emblem", ...phrase, type: String(phrase.type).replace(/\b(a|an|the|of|ring|circle|row|arc)\b/g, " ").trim() || "star" });
    }
  }
  const colors = colorsIn(text);
  const background = divisionColors[0] ?? colors[0] ?? "#ffffff";
  for (const layer of layers) {
    if (layer.kind === "emblem" && !layer.color) {
      const others = colors.filter((c) => c !== background);
      layer.color = others.at(-1) ?? (background === "#ffffff" ? "#d52b1e" : "#ffffff");
    }
    if (layer.kind === "division" && !layer.colors && !layer.color && colors.length) layer.colors = colors.slice(0, 3);
  }
  return normalizeFlag({ shape, background, layers }).design;
}

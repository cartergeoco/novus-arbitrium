/** Vexillological color names. Values follow common national flag specifications. */
export const namedColors: Record<string, string> = {
  white: "#ffffff",
  off_white: "#f4f1ea",
  cream: "#f3e9d2",
  ivory: "#fffff0",
  silver: "#c0c0c0",
  light_gray: "#d0d3d4",
  gray: "#8a8d8f",
  dark_gray: "#4d4d4d",
  charcoal: "#2b2b2b",
  black: "#000000",

  red: "#d52b1e",
  bright_red: "#ff0000",
  scarlet: "#e4002b",
  crimson: "#c8102e",
  cardinal: "#bc002d",
  dark_red: "#9b1b30",
  maroon: "#8d1b3d",
  burgundy: "#6d0f23",
  rose: "#e8698b",
  pink: "#f4a6c0",
  magenta: "#c2185b",

  orange: "#ff8200",
  saffron: "#ff9933",
  dark_orange: "#e35205",
  amber: "#ffbf00",
  yellow: "#fcd116",
  bright_yellow: "#ffec00",
  lemon: "#fff44f",
  gold: "#f1bf00",
  golden: "#ffc72c",
  metallic_gold: "#c9a227",
  ochre: "#cc8f1c",

  green: "#009739",
  bright_green: "#00b140",
  lime: "#8dc63f",
  kelly_green: "#169b62",
  emerald: "#009b3a",
  dark_green: "#006233",
  forest_green: "#00563f",
  islamic_green: "#006c35",
  pakistan_green: "#01411c",
  olive: "#6b7d2a",
  sage: "#8f9e76",
  teal: "#007a78",
  turquoise: "#00a5b5",
  aqua: "#40c4d0",

  blue: "#0039a6",
  royal_blue: "#0055a4",
  navy: "#0a3161",
  dark_blue: "#00247d",
  midnight_blue: "#002147",
  cobalt: "#0047ab",
  azure: "#0072c6",
  cerulean: "#009fe3",
  sky_blue: "#75aadb",
  light_blue: "#74acdf",
  pale_blue: "#a7c6ed",
  steel_blue: "#476b8f",
  un_blue: "#5b92e5",
  eu_blue: "#003399",

  purple: "#6a1b9a",
  violet: "#7f3fbf",
  indigo: "#3f2a78",
  lavender: "#b7a3d9",

  brown: "#7b3f00",
  chestnut: "#954535",
  tan: "#d2b48c",
  sand: "#e0c68f",
  khaki: "#b5a26b",
};

const aliases: Record<string, string> = {
  grey: "gray", light_grey: "light_gray", dark_grey: "dark_gray",
  golden_yellow: "golden", dark_yellow: "gold", navy_blue: "navy",
  deep_blue: "dark_blue", light_green: "lime", dark_purple: "indigo",
  wine: "burgundy", claret: "burgundy", vermilion: "scarlet", ruby: "crimson",
  argent: "white", or: "gold", gules: "red", azure_heraldic: "azure", azure_tincture: "azure",
  vert: "green", sable: "black", purpure: "purple", tenne: "orange", sanguine: "dark_red",
};

export function colorKey(name: string) {
  return name.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Returns a lowercase #rrggbb color, or null when the input is not a color. */
export function resolveColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/.test(raw)) return "#" + [...raw.slice(1)].map((c) => c + c).join("");
  if (/^[0-9a-f]{6}$/.test(raw)) return "#" + raw;
  const key = colorKey(raw);
  const named = namedColors[key] ?? namedColors[aliases[key] ?? ""];
  return named ?? null;
}

export function colorName(hex: string) {
  const found = Object.entries(namedColors).find(([, value]) => value === hex.toLowerCase());
  return found?.[0];
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance, used to pick legible contrast colors. */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastColor(hex: string) {
  return luminance(hex) > 0.45 ? "#000000" : "#ffffff";
}

/** Palette offered in the editor color pickers. */
export const flagPalette = [
  "#ffffff", "#000000", "#d52b1e", "#c8102e", "#8d1b3d", "#ff8200",
  "#ff9933", "#fcd116", "#f1bf00", "#009739", "#006233", "#01411c",
  "#0039a6", "#0055a4", "#0a3161", "#00247d", "#009fe3", "#75aadb",
  "#007a78", "#6a1b9a", "#7b3f00", "#8a8d8f", "#c0c0c0", "#f3e9d2",
];

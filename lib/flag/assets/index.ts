import type { AssetBody } from "../types";
import { assetIndex, chunkLoaders, type AssetMeta } from "./generated";

export type { AssetMeta };
export { assetIndex };

export const assetCategories: { id: string; label: string }[] = [
  { id: "mammals", label: "Animals" },
  { id: "birds", label: "Birds" },
  { id: "sea_life", label: "Sea life" },
  { id: "insects_reptiles", label: "Insects & reptiles" },
  { id: "mythical", label: "Mythical" },
  { id: "plants", label: "Plants" },
  { id: "weapons", label: "Weapons" },
  { id: "tools", label: "Tools" },
  { id: "industry_science", label: "Industry & science" },
  { id: "nautical", label: "Nautical" },
  { id: "crowns_regalia", label: "Crowns & regalia" },
  { id: "heraldic", label: "Heraldic" },
  { id: "buildings", label: "Buildings" },
  { id: "celestial", label: "Celestial" },
  { id: "nature", label: "Nature" },
  { id: "political", label: "Political" },
  { id: "religious", label: "Religious" },
  { id: "national", label: "National arms" },
  { id: "misc", label: "Other" },
];

/** Attribution required by the licenses of the bundled artwork. */
export const assetCredits = [
  { source: "gi", name: "Game-icons.net", authors: "Lorc, Delapouite, Skoll, sbed, Carl Olsen, John Colburn, Faithtoken and contributors", license: "CC BY 3.0", url: "https://game-icons.net" },
  { source: "mdi", name: "Material Design Icons", authors: "Pictogrammers", license: "Apache 2.0", url: "https://pictogrammers.com/library/mdi/" },
  { source: "fa", name: "Font Awesome Free", authors: "Fonticons, Inc.", license: "CC BY 4.0", url: "https://fontawesome.com" },
  { source: "flag-icons", name: "flag-icons", authors: "Panayiotis Lipiridis and contributors (national arms are public-domain state symbols)", license: "MIT", url: "https://github.com/lipis/flag-icons" },
];

const byId = new Map(assetIndex.map((a) => [a.id, a]));
const cache = new Map<string, AssetBody>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

export const assetMeta = (id: string) => byId.get(id);
export const getAsset = (id: string) => cache.get(id);
export const assetVersion = () => version;

export function subscribeAssets(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function loadAssetChunk(chunk: string): Promise<void> {
  const loader = chunkLoaders[chunk];
  if (!loader) return Promise.resolve();
  let job = pending.get(chunk);
  if (!job) {
    job = loader().then((mod) => {
      for (const [id, body] of Object.entries(mod.default)) cache.set(id, body);
      version++;
      listeners.forEach((listener) => listener());
    });
    pending.set(chunk, job);
  }
  return job;
}

export async function loadAssets(ids: Iterable<string>) {
  const chunks = new Set<string>();
  for (const id of ids) {
    const meta = byId.get(id);
    if (meta && !cache.has(id)) chunks.add(meta.chunk);
  }
  await Promise.all([...chunks].map(loadAssetChunk));
}

export const missingAssets = (ids: Iterable<string>) => [...ids].filter((id) => byId.has(id) && !cache.has(id));

const words = (text: string) => text.toLowerCase().replace(/^[a-z]+:/, "").split(/[^a-z0-9]+/).filter(Boolean);
const sourceRank: Record<string, number> = { gi: 0, "flag-icons": 1, mdi: 2, fa: 3 };

/** Ranked search over names, ids and tags. Deterministic for a given query. */
export function searchAssets(query: string, options: { category?: string; limit?: number } = {}) {
  const terms = words(query);
  const pool = options.category ? assetIndex.filter((a) => a.category === options.category) : assetIndex;
  if (!terms.length) return pool.slice(0, options.limit ?? pool.length);
  const scored: { meta: AssetMeta; score: number; order: number }[] = [];
  pool.forEach((meta, order) => {
    const name = words(meta.id);
    const tags = new Set(meta.tags);
    let score = 0;
    if (name.join(" ") === terms.join(" ")) score += 100;
    for (const term of terms) {
      if (name.includes(term)) score += 20;
      else if (tags.has(term)) score += 8;
      else if (name.some((w) => w.startsWith(term) || term.startsWith(w) && w.length > 3)) score += 5;
      else if ([...tags].some((t) => t.startsWith(term))) score += 2;
      else score -= 6;
    }
    score -= name.length;
    if (meta.category === "national" && !terms.some((t) => tags.has(t) && t.length > 3 && !["eagle", "sun", "lion", "shield", "star"].includes(t))) score -= 12;
    if (score > 0) scored.push({ meta, score: score - (sourceRank[meta.source] ?? 4) * 0.5, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, options.limit ?? 50).map((s) => s.meta);
}

/** Map an id, name or loose keyword ("lion", "crossed swords", "mexico") to a library id. */
export function resolveAssetId(query: string): string | undefined {
  const raw = query.trim().toLowerCase();
  if (byId.has(raw)) return raw;
  const bare = raw.replace(/\s+/g, "-");
  for (const prefix of ["gi", "nat", "mdi", "fa"]) if (byId.has(`${prefix}:${bare}`)) return `${prefix}:${bare}`;
  const nat = raw.match(/^(?:nat|national|arms|coat of arms)[:\s_-]+(.+)$/);
  const hit = searchAssets(nat ? `${nat[1]} national` : raw, { limit: 1 })[0];
  return hit?.id;
}

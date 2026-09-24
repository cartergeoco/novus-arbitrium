import { area, bbox, difference, feature, featureCollection, intersect, union } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { Campaign, Land, Nation } from "./game";

export type RegionFeature = Feature<Polygon | MultiPolygon, {
  id: string;
  name: string;
  country: string;
  type: string;
  population: number | null;
}>;
export type RegionAtlas = FeatureCollection<Polygon | MultiPolygon, RegionFeature["properties"]>;
export type RegionState = {
  owner: string;
  controller: string;
  damage: number;
  unrest: number;
  /** Only split pieces need geometry; untouched regions use the static 2026 atlas. */
  geometry?: Land["geometry"];
  name?: string;
  origin?: string;
};
export type RegionView = RegionFeature & { state: RegionState };

export function regionViews(c: Campaign, atlas: RegionAtlas): RegionView[] {
  const removed = new Set(c.removedRegions || []);
  const views = atlas.features
    .filter((f) => !removed.has(f.properties.id))
    .map((f) => ({
      ...f,
      state: c.regions?.[f.properties.id] || {
        owner: f.properties.country,
        controller: f.properties.country,
        damage: 0,
        unrest: 0,
      },
    }));
  for (const [id, state] of Object.entries(c.regions || {})) {
    if (!state.geometry || removed.has(id)) continue;
    views.push({
      type: "Feature",
      properties: {
        id,
        name: state.name || "New district",
        country: state.origin || state.owner,
        type: "Territory",
        population: null,
      },
      geometry: state.geometry,
      state,
    });
  }
  return views;
}

function existingRegion(c: Campaign, atlas: RegionAtlas, id: string): RegionView {
  const region = regionViews(c, atlas).find((f) => f.properties.id === id);
  if (!region) throw Error(`Region ${id} does not exist in this timeline.`);
  return region;
}

function moveGeometry(nations: Record<string, Nation>, source: string, target: string, geometry: Land["geometry"]) {
  if (!nations[source] || !nations[target] || source === target)
    throw Error("Territory needs two active, different nations.");
  const next = structuredClone(nations);
  const piece = feature(geometry);
  const sourceLand = feature(next[source].geometry);
  const cut = intersect(featureCollection([sourceLand, piece]));
  if (!cut || area(cut) < 10000) throw Error("This region no longer overlaps its legal owner.");
  const remainder = difference(featureCollection([sourceLand, cut]));
  const merged = union(featureCollection([feature(next[target].geometry), cut]));
  if (!merged) throw Error("The new border could not be drawn.");
  const share = Math.max(0, Math.min(1, area(cut) / area(sourceLand)));
  const people = Math.round(next[source].population * share);
  const gdp = next[source].gdp * share;
  next[target].geometry = merged.geometry;
  next[target].population += people;
  next[target].gdp += gdp;
  if (remainder) {
    next[source].geometry = remainder.geometry;
    next[source].population -= people;
    next[source].gdp -= gdp;
  } else delete next[source];
  return next;
}

/** Legal ownership and wartime control are deliberately separate. */
export function changeRegion(
  c: Campaign,
  atlas: RegionAtlas,
  id: string,
  mode: "occupy" | "liberate" | "cede",
  actor: string,
): Campaign {
  const region = existingRegion(c, atlas, id);
  const state = region.state;
  if (!c.nations[actor]) throw Error("The acting nation does not exist.");
  if (mode === "occupy" && actor === state.owner)
    throw Error("A nation cannot occupy its own region.");
  if (mode === "liberate" && actor !== state.owner)
    throw Error("Only the legal owner can liberate this region.");
  if (mode === "cede" && actor === state.owner)
    throw Error("The recipient already owns this region.");
  const next = { ...c, regions: { ...(c.regions || {}) } };
  if (mode === "cede") {
    next.nations = moveGeometry(c.nations, state.owner, actor, region.geometry);
    next.regions[id] = { ...state, owner: actor, controller: actor, unrest: Math.min(100, state.unrest + 8) };
  } else {
    next.regions[id] = {
      ...state,
      controller: mode === "liberate" ? state.owner : actor,
      damage: Math.min(100, state.damage + (mode === "occupy" ? 12 : 4)),
      unrest: Math.min(100, state.unrest + (mode === "occupy" ? 10 : 0)),
    };
  }
  return next;
}

/** Persist every affected province when a treaty cuts across existing boundaries. */
export function recordTerritorySplit(
  c: Campaign,
  atlas: RegionAtlas,
  source: string,
  target: string,
  ring: number[][],
): Pick<Campaign, "regions" | "removedRegions"> {
  const closed = ring[0]?.[0] === ring.at(-1)?.[0] && ring[0]?.[1] === ring.at(-1)?.[1]
    ? ring : [...ring, ring[0]];
  const mask = feature({ type: "Polygon", coordinates: [closed] }) as Land;
  const bounds = bbox(mask);
  const regions = { ...(c.regions || {}) };
  const removed = new Set(c.removedRegions || []);
  for (const region of regionViews(c, atlas)) {
    if (region.state.owner !== source) continue;
    const box = bbox(region);
    if (box[0] > bounds[2] || box[2] < bounds[0] || box[1] > bounds[3] || box[3] < bounds[1]) continue;
    let cut;
    try { cut = intersect(featureCollection([feature(region.geometry), mask])); }
    catch { continue; }
    if (!cut || area(cut) < 10000) continue;
    const share = area(cut) / area(region);
    if (share > 0.999) {
      regions[region.properties.id] = { ...region.state, owner: target, controller: target };
      continue;
    }
    const remainder = difference(featureCollection([feature(region.geometry), cut]));
    if (!remainder) continue;
    removed.add(region.properties.id);
    const base = region.properties.id + "~" + crypto.randomUUID().slice(0, 6);
    const parent = region.state.origin || region.properties.country;
    regions[base + "a"] = { ...region.state, geometry: remainder.geometry, name: `${region.properties.name} (remainder)`, origin: parent };
    regions[base + "b"] = { ...region.state, owner: target, controller: target, geometry: cut.geometry, name: `${region.properties.name} (settlement)`, origin: parent };
  }
  return { regions, removedRegions: [...removed] };
}

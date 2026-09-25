import { area, bbox, booleanPointInPolygon, difference, feature, featureCollection, intersect, pointOnFeature, union } from "@turf/turf";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { Campaign, FlagSpec, Land, Nation } from "./game";
import { deriveFlag, derivePolity, heritageFlag } from "./flags";

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
  identity?: string;
  politicalClimate?: string;
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
  const forces = Math.round((next[source].military || 0) * share);
  next[target].geometry = merged.geometry;
  next[target].population += people;
  next[target].gdp += gdp;
  next[target].military = Math.min(100, (next[target].military || 0) + forces);
  if (remainder) {
    next[source].geometry = remainder.geometry;
    next[source].population -= people;
    next[source].gdp -= gdp;
    next[source].military = Math.max(0, (next[source].military || 0) - forces);
  } else delete next[source];
  for (const id of [source, target]) {
    const nation = next[id];
    if (nation && !booleanPointInPolygon([nation.center[1], nation.center[0]], feature(nation.geometry))) {
      const position = pointOnFeature(feature(nation.geometry)).geometry.coordinates;
      nation.center = [position[1], position[0]];
    }
  }
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

export function changeRegionProfile(
  c: Campaign,
  atlas: RegionAtlas,
  id: string,
  delta: { unrest: number; damage: number; identity?: string; politicalClimate?: string },
): Campaign {
  const region = existingRegion(c, atlas, id);
  return {
    ...c,
    regions: {
      ...(c.regions || {}),
      [id]: {
        ...region.state,
        unrest: Math.max(0, Math.min(100, region.state.unrest + delta.unrest)),
        damage: Math.max(0, Math.min(100, region.state.damage + delta.damage)),
        identity: delta.identity || region.state.identity,
        politicalClimate: delta.politicalClimate || region.state.politicalClimate,
      },
    },
  };
}

/** A successor inherits its source society and acquires actual regional land. */
export function foundNation(
  c: Campaign,
  atlas: RegionAtlas,
  options: {
    parent: string;
    name: string;
    regionIds: string[];
    ideology?: string;
    government?: string;
    leader?: string;
    goal?: string;
    flag?: FlagSpec;
    civilWar?: boolean;
  },
): Campaign {
  const parent = c.nations[options.parent];
  if (!parent) throw Error("The parent nation no longer exists.");
  if (!options.regionIds.length || new Set(options.regionIds).size !== options.regionIds.length)
    throw Error("A new nation needs distinct source regions.");
  const selected = options.regionIds.map((id) => existingRegion(c, atlas, id));
  if (selected.some((region) => region.state.owner !== options.parent))
    throw Error("A successor may only inherit regions its parent owns.");
  const raw = selected.length === 1
    ? feature(selected[0].geometry)
    : union(featureCollection(selected.map((region) => feature(region.geometry))));
  if (!raw) throw Error("The successor territory could not be assembled.");
  const sourceLand = feature(parent.geometry);
  const cut = intersect(featureCollection([sourceLand, raw]));
  if (!cut || area(cut) < 10000) throw Error("The successor regions do not overlap their parent.");
  const remainder = difference(featureCollection([sourceLand, cut]));
  const share = Math.max(0, Math.min(1, area(cut) / area(sourceLand)));
  const people = Math.round(parent.population * share);
  const gdp = parent.gdp * share;
  const id = "NEW-" + crypto.randomUUID().slice(0, 8);
  const bounds = bbox(cut);
  const nations = structuredClone(c.nations);
  const polity = derivePolity(parent, options);
  const parentFlag = heritageFlag(parent.id) || parent.flag;
  nations[id] = {
    ...parent,
    id,
    iso: "",
    name: options.name.trim(),
    original: false,
    color: parent.color,
    center: [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2],
    geometry: cut.geometry,
    population: people,
    gdp,
    flag: options.flag ?? deriveFlag(parentFlag, options.name + id),
    ideology: polity.ideology,
    government: polity.government,
    leader: options.leader || "Unspecified",
    goal: options.goal || (options.civilWar ? "Secure independence" : "Build a new state"),
    allies: [],
    rivals: options.civilWar ? [options.parent] : [],
    relationships: { [options.parent]: options.civilWar ? -65 : -10 },
    history: [...(parent.history || []).slice(-6), `Founded from ${parent.name} on ${c.date}`],
    stability: Math.max(25, Math.min(70, parent.stability - (options.civilWar ? 18 : 5))),
    influence: Math.max(5, Math.round(parent.influence * share)),
    military: Math.max(5, Math.round((parent.military || 35) * share)),
    publicSupport: options.civilWar ? 55 : 65,
  };
  if (remainder) {
    nations[options.parent].geometry = remainder.geometry;
    nations[options.parent].population -= people;
    nations[options.parent].gdp -= gdp;
    nations[options.parent].military = Math.max(0, (parent.military || 0) - (nations[id].military || 0));
    nations[options.parent].stability = Math.max(0, parent.stability - (options.civilWar ? 12 : 4));
    if (options.civilWar) {
      nations[options.parent].rivals = [...new Set([...(parent.rivals || []), id])];
      nations[options.parent].relationships = { ...(parent.relationships || {}), [id]: -65 };
    }
  } else delete nations[options.parent];
  for (const nation of [nations[id], nations[options.parent]]) {
    if (nation && !booleanPointInPolygon([nation.center[1], nation.center[0]], feature(nation.geometry))) {
      const position = pointOnFeature(feature(nation.geometry)).geometry.coordinates;
      nation.center = [position[1], position[0]];
    }
  }
  const regions = { ...(c.regions || {}) };
  for (const region of selected)
    regions[region.properties.id] = { ...region.state, owner: id, controller: id, unrest: Math.min(100, region.state.unrest + (options.civilWar ? 20 : 3)) };
  const wars = [...(c.wars || [])];
  if (options.civilWar && nations[options.parent])
    wars.push({ id: crypto.randomUUID(), attackers: [id], defenders: [options.parent], goal: "Determine the successor state's independence", started: c.date, status: "active" });
  return { ...c, nations, regions, wars };
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

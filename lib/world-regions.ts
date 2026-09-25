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

function existingRegion(c: Campaign, atlas: RegionAtlas, id: string): RegionView | undefined {
  return regionViews(c, atlas).find((f) => f.properties.id === id);
}

function moveGeometry(nations: Record<string, Nation>, source: string, target: string, geometry: Land["geometry"]) {
  if (!nations[source] || !nations[target] || source === target) return null;
  const next = structuredClone(nations);
  const piece = feature(geometry);
  const sourceLand = feature(next[source].geometry);
  const cut = intersect(featureCollection([sourceLand, piece]));
  if (!cut || area(cut) < 10000) return null;
  const remainder = difference(featureCollection([sourceLand, cut]));
  const merged = union(featureCollection([feature(next[target].geometry), cut]));
  if (!merged) return null;
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
  if (!region || !c.nations[actor]) return c;
  const state = region.state;
  if (mode === "occupy" && actor === state.owner) return c;
  if (mode === "cede" && actor === state.owner) return c;
  const next = { ...c, regions: { ...(c.regions || {}) } };
  if (mode === "cede") {
    const moved = moveGeometry(c.nations, state.owner, actor, region.geometry);
    if (!moved) return c;
    next.nations = moved;
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
  if (!region) return c;
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
  if (!parent || !options.regionIds.length || new Set(options.regionIds).size !== options.regionIds.length) return c;
  const selected = options.regionIds.map((id) => existingRegion(c, atlas, id)).filter((region) => region !== undefined);
  if (!selected.length) return c;
  const raw = selected.length === 1
    ? feature(selected[0].geometry)
    : union(featureCollection(selected.map((region) => feature(region.geometry))));
  if (!raw) return c;
  const donors = [...new Set(selected.map((region) => region.state.owner))].filter((id) => c.nations[id]);
  let cut = null as ReturnType<typeof intersect>;
  const remainders = new Map<string, Land["geometry"] | null>();
  const shares = new Map<string, number>();
  for (const donorId of donors) {
    const donorLand = feature(c.nations[donorId].geometry);
    const piece = intersect(featureCollection([donorLand, raw]));
    if (!piece || area(piece) < 10000) continue;
    cut = cut ? union(featureCollection([cut, piece])) : piece;
    const left = difference(featureCollection([donorLand, piece]));
    remainders.set(donorId, left ? left.geometry : null);
    shares.set(donorId, Math.max(0, Math.min(1, area(piece) / area(donorLand))));
  }
  if (!cut || area(cut) < 10000) return c;
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
    population: 0,
    gdp: 0,
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
    influence: Math.max(5, Math.round(parent.influence * Math.max(...shares.values(), 0))),
    military: 0,
    publicSupport: options.civilWar ? 55 : 65,
  };
  for (const [donorId, share] of shares) {
    const donor = nations[donorId];
    const people = Math.round(donor.population * share);
    const gdp = donor.gdp * share;
    const forces = Math.max(1, Math.round((donor.military || 35) * share));
    nations[id].population += people;
    nations[id].gdp += gdp;
    nations[id].military = Math.min(100, (nations[id].military || 0) + forces);
    const left = remainders.get(donorId);
    if (left === null) delete nations[donorId];
    else if (left && nations[donorId]) {
      nations[donorId].geometry = left;
      nations[donorId].population -= people;
      nations[donorId].gdp -= gdp;
      nations[donorId].military = Math.max(0, (donor.military || 0) - forces);
      if (donorId === options.parent)
        nations[donorId].stability = Math.max(0, donor.stability - (options.civilWar ? 12 : 4));
    }
  }
  if (options.civilWar && nations[options.parent]) {
    nations[options.parent].rivals = [...new Set([...(nations[options.parent].rivals || []), id])];
    nations[options.parent].relationships = { ...(nations[options.parent].relationships || {}), [id]: -65 };
  }
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

import type { Settings } from "./settings";
import { z } from "zod";
import { applyAlignments } from "@/lib/alignments";
import { countryProfile } from "@/lib/profiles";
import {
  area,
  bbox,
  feature,
  featureCollection,
  intersect,
  difference,
  union,
  booleanValid,
  booleanPointInPolygon,
  kinks,
  pointOnFeature,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "geojson";
import { sealBorder, simplifyRing } from "./geometry";
import { changeRegion, changeRegionProfile, foundNation, recordTerritorySplit, regionViews, type RegionAtlas, type RegionState, type RegionView } from "./world-regions";
import { deriveFlag, derivePolity, flagInputSchema, heritageFlag, makeFlag, type FlagSpec } from "./flags";
import { flagColors } from "./flag";
import { DEPENDENCIES } from "./dependencies";
export type { FlagSpec } from "./flags";
export { flagSchema, makeFlag } from "./flags";
export type Land = Feature<Polygon | MultiPolygon>;
export type Nation = {
  id: string;
  name: string;
  iso: string;
  continent: string;
  population: number;
  populationYear: number;
  gdp: number;
  gdpYear: number;
  center: [number, number];
  color: string;
  flag: FlagSpec;
  stability: number;
  economy: number;
  influence: number;
  relations: number;
  military?: number;
  technology?: number;
  publicSupport?: number;
  relationships?: Record<string, number>;
  ideology: string;
  goal: string;
  government?: string;
  leader?: string;
  culture?: string;
  allies?: string[];
  rivals?: string[];
  claims?: string[];
  history?: string[];
  dossier?: string;
  geometry: Land["geometry"];
  original: boolean;
  suzerain?: string;
};
export type War = {
  id: string;
  attackers: string[];
  defenders: string[];
  goal: string;
  started: string;
  status: "active" | "ended";
  ended?: string;
  outcome?: "restored" | "occupied" | "ceded";
};
export type Event = {
  id: string;
  turn: number;
  date: string;
  category: string;
  title: string;
  body: string;
  action?: string;
  changes?: string[];
};
export type Campaign = {
  version: 1;
  id: string;
  name: string;
  player: string;
  date: string;
  turn: number;
  nations: Record<string, Nation>;
  history: Event[];
  createdAt: string;
  updatedAt: string;
  status: "active" | "defeat" | "victory";
  tokens: number;
  regions?: Record<string, RegionState>;
  removedRegions?: string[];
  wars?: War[];
  firestorm?: true;
};
export { defaults, type Settings } from "./settings";
const palette = [
  "#536c75",
  "#6e6850",
  "#526b61",
  "#66607c",
  "#805c5b",
  "#496779",
  "#717555",
  "#65777c",
  "#795e6c",
  "#607866",
];
export function hash(s: string) {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}
export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
export function createCampaign(
  world: FeatureCollection,
  name: string,
  player: string,
): Campaign {
  const nations: Record<string, Nation> = {};
  const maxGdp = Math.max(...world.features.map((f) => Math.max(0, Number(f.properties?.gdp) || 0)));
  const maxPopulation = Math.max(...world.features.map((f) => Math.max(0, Number(f.properties?.population) || 0)));
  for (const f of world.features) {
    const p = f.properties!;
    const h = hash(p.id);
    const profile = countryProfile(p.id);
    nations[p.id] = {
      id: p.id,
      name: p.name,
      iso: p.iso,
      continent: p.continent,
      population: p.population,
      populationYear: p.populationYear,
      gdp: Math.max(0, p.gdp),
      gdpYear: Math.max(0, p.gdpYear),
      center: p.center,
      color: palette[h % palette.length],
      flag: makeFlag(p.id),
      stability: 55 + (h % 30),
      economy: 45 + (h % 40),
      influence: 35 + (h % 50),
      relations: 0,
      military: clamp(Math.round(12 + 60 * Math.sqrt(Math.max(0, p.gdp) / maxGdp) + 25 * Math.sqrt(Math.max(0, p.population) / maxPopulation))),
      technology: clamp(Math.round(15 + Math.log10(Math.max(100, p.gdp * 1000000 / Math.max(1, p.population))) * 15)),
      publicSupport: 50 + (h % 31),
      relationships: {},
      ideology: profile.principle,
      government: "Unspecified",
      leader: "Unspecified",
      culture: "Unspecified",
      allies: [],
      rivals: [],
      claims: [],
      history: [],
      dossier: profile.dossier,
      goal: profile.priority,
      geometry: f.geometry,
      original: true,
    } as Nation;
  }
  applyAlignments(nations);
  const now = new Date().toISOString();
  return absorbDependencies({
    version: 1,
    id: crypto.randomUUID(),
    name: name.trim() || "A new world order",
    player,
    date: "2026-01-01",
    turn: 1,
    nations,
    history: [
      {
        id: crypto.randomUUID(),
        turn: 1,
        date: "2026-01-01",
        category: "Briefing",
        title: "Your administration begins",
        body: `You now lead ${nations[player].name}. Your first decision will set the direction of this timeline.`,
        changes: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
    status: "active",
    tokens: 0,
    regions: {},
    removedRegions: [],
    wars: [],
  });
}

/** One-way, in-memory upgrade of old saves. Region IDs and the version-1 save contract survive. */
export function absorbDependencies(c: Campaign): Campaign {
  if (c.firestorm) return c;
  const nations = structuredClone(c.nations);
  const regions = structuredClone(c.regions || {});
  for (const [id, parentId] of Object.entries(DEPENDENCIES)) {
    const holding = nations[id], parent = nations[parentId];
    if (!holding || !parent || c.player === id || holding.suzerain) continue;
    try {
      const land = union(featureCollection([feature(parent.geometry), feature(holding.geometry)]));
      if (!land) continue;
      parent.geometry = sealBorder(land.geometry);
      parent.population += holding.population;
      parent.gdp += holding.gdp;
      delete nations[id];
      for (const state of Object.values(regions)) {
        if (state.owner === id) state.owner = parentId;
        if (state.controller === id) state.controller = parentId;
      }
    } catch { /* Keep unusual user-edited geometry intact. */ }
  }
  return { ...c, nations, regions, firestorm: true };
}
const point = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
export const turnSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(2400),
  category: z.enum(["Domestic", "Diplomacy", "Economy", "Military", "World"]),
  effects: z
    .array(
      z.object({
        id: z.string().max(40),
        stability: z.number().min(-20).max(20).default(0),
        economy: z.number().min(-20).max(20).default(0),
        influence: z.number().min(-20).max(20).default(0),
        relations: z.number().min(-30).max(30).default(0),
        military: z.number().min(-20).max(20).optional(),
        publicSupport: z.number().min(-20).max(20).optional(),
        relationsWith: z.array(z.object({ id: z.string().max(40), delta: z.number().min(-30).max(30) })).max(8).optional(),
        name: z.string().min(2).max(80).optional(),
        ideology: z.string().max(100).optional(),
        government: z.string().max(100).optional(),
        leader: z.string().max(100).optional(),
        culture: z.string().max(100).optional(),
        goal: z.string().max(200).optional(),
        alliesAdd: z.array(z.string().max(40)).max(8).optional(),
        alliesRemove: z.array(z.string().max(40)).max(8).optional(),
        rivalsAdd: z.array(z.string().max(40)).max(8).optional(),
        rivalsRemove: z.array(z.string().max(40)).max(8).optional(),
        claimsAdd: z.array(z.string().max(80)).max(8).optional(),
        claimsRemove: z.array(z.string().max(80)).max(8).optional(),
        flag: flagInputSchema.optional(),
        suzerain: z.string().max(40).nullable().optional(),
      }),
    )
    .max(12),
  headlines: z
    .array(z.object({ title: z.string().max(140), body: z.string().max(500) }))
    .max(4)
    .default([]),
  territories: z
    .array(
      z.object({
        source: z.string().max(40),
        target: z.string().max(40).optional(),
        name: z.string().min(2).max(80).optional(),
        cause: z.string().max(500).optional(),
        ring: z.array(point).min(4).max(100),
        flag: flagInputSchema.optional(),
      }),
    )
    .max(3)
    .default([]),
  regionActions: z.array(z.object({
    region: z.string().max(80),
    mode: z.enum(["occupy", "liberate", "cede", "abandon"]),
    actor: z.string().max(40),
    reason: z.string().max(240),
    type: z.enum(["State", "Province", "Territory", "Commonwealth"]).optional(),
  })).max(8).default([]),
  regionEffects: z.array(z.object({
    region: z.string().max(80),
    unrest: z.number().min(-20).max(20).default(0),
    damage: z.number().min(-20).max(20).default(0),
    identity: z.string().max(100).optional(),
    politicalClimate: z.string().max(100).optional(),
    type: z.enum(["State", "Province", "Territory", "Commonwealth"]).optional(),
    cause: z.string().max(240),
  })).max(12).default([]),
  conflicts: z.array(z.object({
    action: z.enum(["start", "end"]),
    attacker: z.string().max(40),
    defender: z.string().max(40),
    goal: z.string().max(240),
  })).max(3).default([]),
  newNations: z.array(z.object({
    parent: z.string().max(40),
    name: z.string().min(2).max(80),
    regions: z.array(z.string().max(80)).min(1).max(12),
    ideology: z.string().max(100).optional(),
    government: z.string().max(100).optional(),
    leader: z.string().max(100).optional(),
    goal: z.string().max(200).optional(),
    flag: flagInputSchema.optional(),
    cause: z.string().max(500).optional(),
    civilWar: z.boolean().default(false),
    suzerain: z.string().max(40).optional(),
  })).max(2).default([]),
});
export type TurnResult = z.infer<typeof turnSchema>;
export function transferTerritory(
  nations: Record<string, Nation>,
  sourceId: string,
  ring: number[][],
  targetId?: string,
  newName?: string,
  flag?: FlagSpec,
): Record<string, Nation> {
  const source = nations[sourceId];
  if (!source) throw Error("That cannot happen. The selected country is not on the map.");
  const closed = simplifyRing(ring).map((p) => [...p]);
  if (JSON.stringify(closed[0]) !== JSON.stringify(closed.at(-1)))
    closed.push([...closed[0]]);
  const mask = feature({ type: "Polygon", coordinates: [closed] }) as Land;
  if (!booleanValid(mask) || kinks(mask).features.length)
    throw Error("That cannot happen. The drawn border crosses itself.");
  const land = feature(source.geometry);
  const cut = intersect(featureCollection([land, mask]));
  if (!cut || area(cut) < 10000)
    throw Error("That cannot happen. The drawn border does not touch the selected country.");
  if (targetId === sourceId)
    throw Error("That cannot happen. A country cannot receive its own land in this drawing.");
  if (targetId && !nations[targetId])
    throw Error("That cannot happen. The receiving country is not on the map.");
  const piece = feature(sealBorder(cut.geometry));
  const remainder = difference(featureCollection([land, piece]));
  const share = clamp(area(piece) / area(land), 0, 1),
    pop = Math.round(source.population * share),
    gdp = source.gdp * share,
    forces = Math.round((source.military || 0) * share);
  const next = structuredClone(nations);
  if (remainder)
    next[sourceId] = {
      ...source,
      geometry: sealBorder(remainder.geometry),
      population: source.population - pop,
      gdp: source.gdp - gdp,
      military: Math.max(0, (source.military || 0) - forces),
    };
  else delete next[sourceId];
  if (targetId) {
    const target = next[targetId];
    const merged = union(featureCollection([feature(target.geometry), piece]));
    if (!merged) throw Error("That cannot happen. Those two territories cannot be joined.");
    next[targetId] = {
      ...target,
      geometry: sealBorder(merged.geometry),
      population: target.population + pop,
      gdp: target.gdp + gdp,
      military: Math.min(100, (target.military || 0) + forces),
    };
  } else {
    const id = "NEW-" + crypto.randomUUID().slice(0, 8);
    const b = bbox(cut);
    next[id] = {
      ...source,
      id,
      name: newName?.trim() || `${source.name} Republic`,
      iso: "",
      original: false,
      flag: flag || deriveFlag(heritageFlag(source.id) || source.flag, id),
      color: source.color,
      geometry: piece.geometry,
      population: pop,
      gdp,
      military: forces,
      center: [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2],
      stability: 45,
      ideology: derivePolity(source).ideology,
      government: derivePolity(source).government,
      goal: "Secure recognition",
    };
  }
  for (const id of [sourceId, targetId || Object.keys(next).find((candidate) => !nations[candidate]) || ""]) {
    const nation = next[id];
    if (nation && !booleanPointInPolygon([nation.center[1], nation.center[0]], feature(nation.geometry))) {
      const point = pointOnFeature(feature(nation.geometry)).geometry.coordinates;
      nation.center = [point[1], point[0]];
    }
  }
  return next;
}
export function resolveStatus(c: Campaign): Campaign["status"] {
  if (!c.nations[c.player]) return "defeat";
  if (Object.keys(c.nations).length === 1) return "victory";
  return "active";
}
export function applyTurn(
  c: Campaign,
  raw: unknown,
  action: string,
  settings: Settings,
  tokens = 0,
  atlas?: RegionAtlas | null,
): Campaign {
  const result = turnSchema.parse(raw);
  let nations = structuredClone(c.nations);
  let regional: Campaign = { ...c, nations, regions: { ...(c.regions || {}) }, removedRegions: [...(c.removedRegions || [])] };
  const changes: string[] = [];
  const touched = new Set<string>();
  for (const effect of result.effects) {
    const n = nations[effect.id];
    if (!n) continue;
    touched.add(effect.id);
    for (const key of [
      "stability",
      "economy",
      "influence",
      "relations",
      "military",
      "publicSupport",
    ] as const) {
      const delta = effect[key] ?? 0;
      if (delta) {
        n[key] = clamp((n[key] ?? 50) + delta, key === "relations" ? -100 : 0);
        changes.push(
          `${n.name}: ${key} ${delta > 0 ? "+" : ""}${delta}`,
        );
      }
    }
    for (const relationship of effect.relationsWith || []) {
      if (!nations[relationship.id] || relationship.id === effect.id) continue;
      n.relationships ||= {};
      n.relationships[relationship.id] = clamp((n.relationships[relationship.id] || 0) + relationship.delta, -100, 100);
    }
    if (effect.alliesAdd) {
      for (const id of effect.alliesAdd.filter((id) => !!nations[id] && id !== n.id)) {
        n.allies = [...new Set([...(n.allies || []), id])];
        nations[id].allies = [...new Set([...(nations[id].allies || []), n.id])];
      }
    }
    if (effect.alliesRemove) {
      n.allies = (n.allies || []).filter((id) => !effect.alliesRemove?.includes(id));
      for (const id of effect.alliesRemove) if (nations[id]) nations[id].allies = (nations[id].allies || []).filter((other) => other !== n.id);
    }
    if (effect.rivalsAdd) n.rivals = [...new Set([...(n.rivals || []), ...effect.rivalsAdd.filter((id) => !!nations[id] && id !== n.id)])];
    if (effect.rivalsRemove) n.rivals = (n.rivals || []).filter((id) => !effect.rivalsRemove?.includes(id));
    if (effect.claimsAdd) n.claims = [...new Set([...(n.claims || []), ...effect.claimsAdd])];
    if (effect.claimsRemove) n.claims = (n.claims || []).filter((id) => !effect.claimsRemove?.includes(id));
    if (effect.id !== c.player) {
      if (effect.name) n.name = effect.name;
      if (effect.ideology) n.ideology = effect.ideology;
      if (effect.government) n.government = effect.government;
      if (effect.leader) n.leader = effect.leader;
      if (effect.culture) n.culture = effect.culture;
      if (effect.goal) n.goal = effect.goal;
      if (effect.flag) {
        n.flag = effect.flag;
        n.original = false;
      }
    }
    if (effect.suzerain !== undefined && (!effect.suzerain || (nations[effect.suzerain] && effect.suzerain !== n.id))) {
      if (effect.suzerain) n.suzerain = effect.suzerain;
      else delete n.suzerain;
      changes.push(`${n.name}: ${effect.suzerain ? `subsidiary of ${nations[effect.suzerain].name}` : "independent"}`);
    }
  }
  const politicalEvents: { title: string; body: string }[] = [];
  for (const op of result.territories) {
    const createsState = !op.target;
    if (createsState && (op.cause?.trim().length || 0) < 40) continue;
    const before = nations;
    nations = transferTerritory(
      nations,
      op.source,
      op.ring,
      op.target,
      op.name,
      op.flag,
    );
    touched.add(op.source);
    touched.add(op.target || Object.keys(nations).find((id) => !before[id]) || "");
    if (atlas) {
      const recipient = op.target || Object.keys(nations).find((id) => !before[id]);
      if (recipient) {
        regional = { ...regional, nations, ...recordTerritorySplit(regional, atlas, op.source, recipient, op.ring, !nations[op.source]) };
      }
    }
    changes.push(
      `${op.name || nations[op.target || ""]?.name || "New state"}: ${op.cause?.trim() || "territory changed"}`,
    );
    if (createsState && op.cause) politicalEvents.push({ title: `${op.name || "A new authority"} is organized`, body: op.cause.trim() });
  }
  regional.nations = nations;
  for (const effect of result.regionEffects) {
    if (!atlas) throw Error("That cannot happen. The regional map is still loading.");
    regional = changeRegionProfile(regional, atlas, effect.region, effect);
    changes.push(`${effect.region}: ${effect.cause}`);
  }
  for (const founding of result.newNations) {
    if ((founding.cause?.trim().length || 0) < 40) continue;
    if (!atlas) throw Error("That cannot happen. The regional map is still loading.");
    const before = regional.nations;
    regional = foundNation(regional, atlas, { ...founding, regionIds: founding.regions });
    touched.add(founding.parent);
    touched.add(Object.keys(regional.nations).find((id) => !before[id]) || "");
    changes.push(`${founding.name}: ${founding.cause?.trim()}`);
    if (founding.cause) politicalEvents.push({ title: `${founding.name} breaks from ${nations[founding.parent]?.name || "its parent"}`, body: founding.cause.trim() });
  }
  nations = regional.nations;
  const wars = structuredClone(regional.wars || []);
  for (const conflict of result.conflicts) {
    if (!nations[conflict.attacker] || !nations[conflict.defender] || conflict.attacker === conflict.defender)
      continue;
    touched.add(conflict.attacker);
    touched.add(conflict.defender);
    const existing = wars.find((w) => w.status === "active" && (
      (w.attackers.includes(conflict.attacker) && w.defenders.includes(conflict.defender)) ||
      (w.attackers.includes(conflict.defender) && w.defenders.includes(conflict.attacker))
    ));
    if (conflict.action === "start" && !existing && !nations[conflict.attacker].suzerain) {
      const suzerain = nations[conflict.defender].suzerain;
      wars.push({ id: crypto.randomUUID(), attackers: [conflict.attacker], defenders: [conflict.defender, ...(suzerain && nations[suzerain] ? [suzerain] : [])], goal: conflict.goal, started: c.date, status: "active" });
      changes.push(`${nations[conflict.attacker].name} and ${nations[conflict.defender].name}: war began`);
    }
  }
  for (const op of result.regionActions) {
    if (!atlas) throw Error("That cannot happen. The regional map is still loading.");
    const region = atlas.features.find((f) => f.properties.id === op.region);
    const owner = regional.regions?.[op.region]?.owner || region?.properties.country;
    if (owner) touched.add(owner);
    touched.add(op.actor);
    regional = changeRegion(regional, atlas, op.region, op.mode, op.actor, op.type);
    changes.push(`${op.region}: ${op.mode} by ${regional.nations[op.actor]?.name || op.actor}`);
  }
  nations = regional.nations;
  const date = new Date(c.date + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + settings.turnDays);
  const day = date.toISOString().slice(0, 10),
    turn = c.turn + 1;
  for (const conflict of result.conflicts.filter((item) => item.action === "end")) {
    const existing = wars.find((w) => w.status === "active" && (c.wars || []).some((prior) => prior.id === w.id && prior.status === "active") && (
      (w.attackers.includes(conflict.attacker) && w.defenders.includes(conflict.defender)) ||
      (w.attackers.includes(conflict.defender) && w.defenders.includes(conflict.attacker))
    ));
    if (!existing) continue;
    const sides = new Set([...existing.attackers, ...existing.defenders]);
    const disputed = atlas ? regionViews(regional, atlas).filter((r) => sides.has(r.state.owner) || sides.has(r.state.controller) || sides.has(r.properties.country)) : [];
    const ceded = disputed.some((r) => sides.has(r.properties.country) && sides.has(r.state.owner) && r.state.owner !== r.properties.country);
    const occupied = disputed.some((r) => r.state.owner && r.state.controller && r.state.owner !== r.state.controller);
    existing.status = "ended";
    existing.ended = day;
    existing.outcome = ceded ? "ceded" : occupied ? "occupied" : "restored";
    for (const region of disputed.filter((r) => r.state.politicalClimate === "Civil war")) {
      const stillFighting = wars.some((w) => w.status === "active" && [...w.attackers, ...w.defenders].includes(region.state.controller));
      if (!stillFighting) regional.regions = { ...(regional.regions || {}), [region.properties.id]: { ...region.state, politicalClimate: "Postwar recovery" } };
    }
    changes.push(`${nations[conflict.attacker]?.name || conflict.attacker} and ${nations[conflict.defender]?.name || conflict.defender}: war ended; ${existing.outcome}`);
  }
  if (atlas) {
    const pressure = new Map<string, number>();
    const states = new Map<string, number>();
    for (const region of regionViews(regional, atlas)) {
      const previous = c.regions?.[region.properties.id];
      if (!previous || !previous.owner || !previous.controller || (previous.owner === previous.controller && previous.politicalClimate !== "Civil war")) continue;
      const active = wars.some((w) => w.status === "active" && [...w.attackers, ...w.defenders].includes(previous.controller));
      if (!active) continue;
      const step = Math.max(1, Math.min(4, Math.ceil(settings.turnDays / 14)));
      regional.regions = { ...(regional.regions || {}), [region.properties.id]: {
        ...region.state,
        unrest: clamp(region.state.unrest + step * 2),
        damage: clamp(region.state.damage + step),
        politicalClimate: previous.politicalClimate === "Civil war" ? "Civil war" : "Occupation",
      } };
      pressure.set(previous.controller, (pressure.get(previous.controller) || 0) + 1);
      if (region.properties.type.toLowerCase().includes("state")) states.set(previous.owner, (states.get(previous.owner) || 0) + 1);
    }
    for (const [id, count] of pressure) if (nations[id]) {
      nations[id].economy = clamp(nations[id].economy - Math.min(5, Math.ceil(count / 4)));
      nations[id].stability = clamp(nations[id].stability - Math.min(4, Math.ceil(count / 6)));
      changes.push(`${nations[id].name}: occupation strains economy and stability`);
    }
    for (const [id, count] of states) if (nations[id]) nations[id].stability = clamp(nations[id].stability - Math.min(4, count));
  }
  if (settings.turnDays >= 7) {
    for (const war of wars.filter((w) => w.status === "active")) {
      for (const id of [...war.attackers, ...war.defenders]) {
        const belligerent = nations[id];
        if (!belligerent) continue;
        belligerent.economy = clamp(belligerent.economy - (settings.turnDays >= 30 ? 2 : 1));
        belligerent.publicSupport = clamp((belligerent.publicSupport ?? 50) - 1);
      }
    }
  }
  const headlines = result.headlines.length ? result.headlines : (() => {
    const unsettled = Object.values(nations).filter((n) => n.id !== c.player)
      .sort((a, b) => a.stability - b.stability || a.id.localeCompare(b.id));
    const subject = unsettled[(turn - 2) % Math.min(5, unsettled.length)];
    if (!subject) return [];
    touched.add(subject.id);
    subject.stability = clamp(subject.stability - 1);
    return [{ title: `${subject.name} faces domestic pressure`, body: `Officials contend with strains on stability while pursuing ${subject.goal.toLowerCase()}. The situation remains unresolved.` }];
  })();
  headlines.push(...politicalEvents);
  for (const id of touched) {
    const nation = nations[id];
    if (nation) nation.history = [...(nation.history || []).slice(-11), `${day}: ${result.title}`].slice(-12);
  }
  const event: Event = {
    id: crypto.randomUUID(),
    turn,
    date: day,
    category: result.category,
    title: result.title,
    body: result.summary,
    action,
    changes,
  };
  const next: Campaign = {
    ...c,
    nations,
    regions: regional.regions,
    removedRegions: regional.removedRegions,
    wars,
    date: day,
    turn,
    tokens: c.tokens + tokens,
    updatedAt: new Date().toISOString(),
    history: [
      event,
      ...headlines.map((h) => ({
        ...h,
        id: crypto.randomUUID(),
        turn,
        date: day,
        category: "World",
      })),
      ...c.history,
    ],
  };
  if (atlas) {
    const strained = Object.values(nations).filter((n) => n.stability <= 25 || n.economy <= 10 || (n.publicSupport ?? 50) <= 15);
    for (const nation of strained) {
      const pressure = Math.max(0, 25 - nation.stability) + (nation.economy <= 10 ? 8 : 0) + ((nation.publicSupport ?? 50) <= 15 ? 8 : 0);
      for (const region of regionViews(next, atlas)) {
        if (region.state.owner !== nation.id && region.state.controller !== nation.id) continue;
        next.regions = {
          ...(next.regions || {}),
          [region.properties.id]: {
            ...region.state,
            unrest: Math.min(100, region.state.unrest + pressure),
            damage: Math.min(100, region.state.damage + (nation.stability <= 10 ? 6 : 0)),
            politicalClimate: nation.stability <= 10 ? "Civil war" : region.state.politicalClimate,
          },
        };
      }
      if (nation.stability <= 10)
        next.history = [{
          id: crypto.randomUUID(), turn, date: day, category: "World",
          title: `${nation.name} is tearing itself apart`,
          body: `${nation.name} remains on the map, but a score this low means mutiny, separatist governments, and fighting inside its own borders.`,
        }, ...next.history];
    }
  }
  next.status = resolveStatus(next);
  return next;
}
export function expectsForeignResponse(action: string) {
  return /\b(faction|alliance|coalition|bloc|pact|league|recognize|recognition|invite|treaty|other nations|other countries|other powers)\b/i.test(action);
}
export function demoTurn(
  c: Campaign,
  action: string,
  settings: Settings,
): TurnResult {
  const a = action.toLowerCase(),
    n = c.nations[c.player],
    hard = settings.difficulty === "Challenging" ? 2 : 0,
    foreign = expectsForeignResponse(action);
  let title = "Your proposal enters public debate",
    summary =
      "Your cabinet begins a feasibility review. Public expectations rise while the details are debated. This local demo recognizes broad policy themes; connect an AI provider for nuanced decisions.",
    category: TurnResult["category"] = "Domestic",
    stability = 1,
    economy = 0,
    influence = 0;
  if (/school|education|research|universit/.test(a)) {
    title = "A new investment in the next generation";
    summary =
      "Education funding is approved. Communities welcome the investment, while the treasury absorbs the initial cost. Productivity gains will take time to develop.";
    stability = 4;
    economy = -2;
    influence = 1;
  } else if (/trade|treaty|diploma|peace|alliance|faction|coalition|bloc|pact|league|recognize|invite/.test(a)) {
    title = foreign ? "The offer is answered this turn" : "Diplomatic channels open";
    summary = foreign
      ? "The governments you asked do not wait. Each one accepts, refuses, or counters now, and the arrangement is already in force."
      : "Your diplomatic initiative wins a cautious welcome abroad. Negotiators begin discussing practical terms. Commercial confidence improves as the prospect of closer cooperation grows.";
    category = "Diplomacy";
    stability = 1;
    economy = 3;
    influence = 4;
  } else if (/invad|war|attack|military|army/.test(a)) {
    title = "Mobilization changes the regional balance";
    summary =
      "Your forces raise their readiness. Mobilization puts pressure on public finances and unsettles neighboring governments. No territory changes hands without a resolved campaign.";
    category = "Military";
    stability = -4;
    economy = -5;
    influence = 3;
  } else if (/tax|econom|industry|infrastr|energy|invest/.test(a)) {
    title = "An economic program takes shape";
    summary =
      "Your government begins implementing its economic package. Businesses respond to the new incentives, but transition costs and public scrutiny put pressure on the administration.";
    category = "Economy";
    stability = -1;
    economy = 4;
    influence = 1;
  } else if (/elect|rights|reform|law|health/.test(a)) {
    title = "Reform reaches the national agenda";
    summary =
      "Your reform package enters implementation. Civil society welcomes the initiative while established interests push for amendments. The administration commits resources to the transition.";
    stability = 5;
    economy = -2;
    influence = 2;
  }
  const others = Object.values(c.nations)
    .filter((x) => x.id !== c.player)
    .sort(
      (a, b) =>
        Math.abs(a.center[0] - n.center[0]) +
        Math.abs(a.center[1] - n.center[1]) -
        Math.abs(b.center[0] - n.center[0]) -
        Math.abs(b.center[1] - n.center[1]),
    )
    .slice(0, foreign ? 3 : 2);
  const responders = others.slice(0, foreign ? 3 : 1);
  return {
    title,
    summary,
    category,
    effects: [
      {
        id: c.player,
        stability: stability - hard,
        economy: economy - hard,
        influence,
        relations: 0,
        ...(foreign && category !== "Military" ? { alliesAdd: responders.map((x) => x.id) } : {}),
      },
      ...others.map((x) => ({
        id: x.id,
        stability: 0,
        economy: 0,
        influence: 0,
        relations:
          category === "Military" ? -8 : category === "Diplomacy" ? 6 : 1,
        ...(foreign && category === "Military" ? { rivalsAdd: [c.player] } : {}),
        ...(foreign && category !== "Military" ? { alliesAdd: [c.player] } : {}),
      })),
    ],
    headlines: responders
      .map((x) => ({
        title: foreign ? `${x.name} answers` : `${x.name} responds to your policy`,
        body: foreign
          ? category === "Military"
            ? `${x.name} rejects the move and opposes it now.`
            : `${x.name} accepts the offer. The decision is settled this turn.`
          : category === "Military"
            ? "Officials call for restraint and review their security posture."
            : "Officials acknowledge the announcement and begin reviewing its regional implications.",
      })),
    territories: [],
    regionActions: [],
    regionEffects: [],
    conflicts: [],
    newNations: [],
  };
}
export function compactContext(
  c: Campaign,
  action: string,
  settings: Settings,
  regions: RegionView[] | null,
) {
  const player = c.nations[c.player];
  const request = action.toLowerCase();
  const mentioned = Object.values(c.nations).filter(
    (n) =>
      n.id !== c.player && request.includes(n.name.toLowerCase()),
  );
  const neighbors = Object.values(c.nations)
    .filter((n) => n.id !== c.player)
    .sort(
      (a, b) =>
        Math.hypot(
          a.center[0] - player.center[0],
          a.center[1] - player.center[1],
        ) -
        Math.hypot(
          b.center[0] - player.center[0],
          b.center[1] - player.center[1],
        ),
    );
  const foreign = expectsForeignResponse(action);
  const partners = foreign
    ? Object.values(c.nations).filter((n) => n.id !== c.player && ((player.allies || []).includes(n.id) || (player.rivals || []).includes(n.id)))
    : [];
  const powers = foreign
    ? Object.values(c.nations).filter((n) => n.id !== c.player).sort((a, b) => b.influence - a.influence).slice(0, 4)
    : [];
  const selected = [player, ...mentioned, ...partners, ...powers, ...neighbors]
    .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
    .slice(0, Math.min(16, settings.contextNations + (foreign ? 4 : 0)));
  const allRegions = regions || [];
  const namedRegions = allRegions.filter((r) => r.properties.name.length > 3 && request.includes(r.properties.name.toLowerCase()));
  const relevant = [
    ...namedRegions,
    ...allRegions.filter((r) => mentioned.some((n) => n.id === r.state.owner)),
    ...allRegions.filter((r) => r.state.owner === c.player),
    ...allRegions.filter((r) => r.state.controller !== r.state.owner),
    ...allRegions.filter((r) => neighbors.slice(0, 2).some((n) => n.id === r.state.owner)),
  ].filter((r, i, arr) => arr.findIndex((x) => x.properties.id === r.properties.id) === i).slice(0, 90);
  const recalled = c.history.filter((e) =>
    mentioned.some((n) => `${e.title} ${e.body}`.toLowerCase().includes(n.name.toLowerCase())) ||
    namedRegions.some((r) => `${e.title} ${e.body}`.toLowerCase().includes(r.properties.name.toLowerCase()))
  ).slice(0, 6);
  return {
    date: c.date,
    turn: c.turn,
    player: c.player,
    responseExpected: foreign,
    difficulty: settings.difficulty,
    daysPerTurn: settings.turnDays,
    nations: selected.map(({ geometry, flag, ...n }) => ({
      ...n,
      flagColors: flagColors(flag).slice(0, 5),
      bounds: bbox(feature(geometry)),
    })),
    regions: relevant.map((r) => ({ id: r.properties.id, name: r.properties.name, type: r.state.owner || r.state.controller ? r.state.type || r.properties.type : "Unheld", owner: r.state.owner, controller: r.state.controller, ...(r.state.owner || r.state.controller ? { unrest: r.state.unrest, damage: r.state.damage, identity: r.state.identity, politicalClimate: r.state.politicalClimate } : {}) })),
    activeWars: (c.wars || []).filter((w) => w.status === "active"),
    recent: [...c.history.slice(0, 5), ...recalled].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i).slice(0, 10)
      .map((e) => ({ date: e.date, title: e.title, body: e.body.slice(0, 600) })),
    action,
  };
}
export function formatDate(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function number(n: number) {
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

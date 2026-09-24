import { z } from "zod";
import {
  area,
  bbox,
  feature,
  featureCollection,
  intersect,
  difference,
  union,
  booleanValid,
  kinks,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "geojson";
export type Land = Feature<Polygon | MultiPolygon>;
export type FlagSpec = {
  layout: "horizontal" | "vertical" | "cross" | "diagonal" | "canton";
  colors: string[];
  emblem: "none" | "star" | "sun" | "diamond" | "wreath";
};
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
  ideology: string;
  goal: string;
  geometry: Land["geometry"];
  original: boolean;
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
};
export type Settings = {
  difficulty: string;
  turnDays: number;
  provider: "ollama" | "openai" | "openrouter";
  model: string;
  temperature: number;
  maxTokens: number;
  tokenBudget: number;
  contextNations: number;
  prompt: string;
  contrast: boolean;
  motion: boolean;
  transparency: boolean;
  fontSize: number;
  sound: boolean;
  volume: number;
  labels: boolean;
  texture: boolean;
  highlights: boolean;
};
export const defaults: Settings = {
  difficulty: "Standard",
  turnDays: 7,
  provider: "ollama",
  model: "llama3.2",
  temperature: 0.7,
  maxTokens: 1600,
  tokenBudget: 100000,
  contextNations: 8,
  prompt: "",
  contrast: false,
  motion: false,
  transparency: true,
  fontSize: 16,
  sound: false,
  volume: 30,
  labels: true,
  texture: true,
  highlights: true,
};
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
export function makeFlag(id: string): FlagSpec {
  const n = hash(id);
  return {
    layout: ["horizontal", "vertical", "cross", "diagonal", "canton"][
      n % 5
    ] as FlagSpec["layout"],
    colors: [
      palette[n % palette.length],
      "#e0e1dd",
      palette[(n + 3) % palette.length],
    ],
    emblem: ["none", "star", "sun", "diamond", "wreath"][
      n % 5
    ] as FlagSpec["emblem"],
  };
}
export function createCampaign(
  world: FeatureCollection,
  name: string,
  player: string,
): Campaign {
  const nations: Record<string, Nation> = {};
  for (const f of world.features) {
    const p = f.properties!;
    const h = hash(p.id);
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
      ideology: "Status quo",
      goal: [
        "Regional security",
        "Economic development",
        "Diplomatic cooperation",
        "Domestic stability",
      ][h % 4],
      geometry: f.geometry,
      original: true,
    } as Nation;
  }
  const now = new Date().toISOString();
  return {
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
  };
}
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const flagSchema = z.object({
  layout: z.enum(["horizontal", "vertical", "cross", "diagonal", "canton"]),
  colors: z.array(color).min(2).max(3),
  emblem: z.enum(["none", "star", "sun", "diamond", "wreath"]),
});
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
        name: z.string().min(2).max(80).optional(),
        ideology: z.string().max(100).optional(),
        flag: flagSchema.optional(),
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
        ring: z.array(point).min(4).max(100),
        flag: flagSchema.optional(),
      }),
    )
    .max(3)
    .default([]),
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
  if (!source) throw Error("Source nation no longer exists.");
  const closed = ring.map((p) => [...p]);
  if (JSON.stringify(closed[0]) !== JSON.stringify(closed.at(-1)))
    closed.push([...closed[0]]);
  const mask = feature({ type: "Polygon", coordinates: [closed] }) as Land;
  if (!booleanValid(mask) || kinks(mask).features.length)
    throw Error("Draw a valid polygon without crossing edges.");
  const land = feature(source.geometry);
  const cut = intersect(featureCollection([land, mask]));
  if (!cut || area(cut) < 10000)
    throw Error("The shape must overlap the selected nation.");
  if (targetId === sourceId)
    throw Error("Choose a different receiving nation.");
  if (targetId && !nations[targetId])
    throw Error("Receiving nation does not exist.");
  const remainder = difference(featureCollection([land, cut]));
  const share = clamp(area(cut) / area(land), 0, 1),
    pop = Math.round(source.population * share),
    gdp = source.gdp * share;
  const next = structuredClone(nations);
  if (remainder)
    next[sourceId] = {
      ...source,
      geometry: remainder.geometry,
      population: source.population - pop,
      gdp: source.gdp - gdp,
    };
  else delete next[sourceId];
  if (targetId) {
    const target = next[targetId];
    const merged = union(featureCollection([feature(target.geometry), cut]));
    if (!merged) throw Error("Could not combine these territories.");
    next[targetId] = {
      ...target,
      geometry: merged.geometry,
      population: target.population + pop,
      gdp: target.gdp + gdp,
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
      flag: flag || makeFlag(id),
      color: palette[hash(id) % palette.length],
      geometry: cut.geometry,
      population: pop,
      gdp,
      center: [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2],
      stability: 45,
      ideology: "Self-determination",
      goal: "Secure recognition",
    };
  }
  return next;
}
export function resolveStatus(c: Campaign): Campaign["status"] {
  if (!c.nations[c.player] || c.nations[c.player].stability <= 0)
    return "defeat";
  if (Object.keys(c.nations).length === 1) return "victory";
  return "active";
}
export function applyTurn(
  c: Campaign,
  raw: unknown,
  action: string,
  settings: Settings,
  tokens = 0,
): Campaign {
  const result = turnSchema.parse(raw);
  let nations = structuredClone(c.nations);
  const changes: string[] = [];
  for (const effect of result.effects) {
    const n = nations[effect.id];
    if (!n) throw Error("The simulation referenced an unknown nation.");
    for (const key of [
      "stability",
      "economy",
      "influence",
      "relations",
    ] as const) {
      if (effect[key]) {
        n[key] = clamp(n[key] + effect[key], key === "relations" ? -100 : 0);
        changes.push(
          `${n.name}: ${key} ${effect[key] > 0 ? "+" : ""}${effect[key]}`,
        );
      }
    }
    if (effect.id !== c.player) {
      if (effect.name) n.name = effect.name;
      if (effect.ideology) n.ideology = effect.ideology;
      if (effect.flag) {
        n.flag = effect.flag;
        n.original = false;
      }
    }
  }
  for (const op of result.territories) {
    nations = transferTerritory(
      nations,
      op.source,
      op.ring,
      op.target,
      op.name,
      op.flag,
    );
    changes.push(
      `${op.name || nations[op.target || ""]?.name || "New state"}: territory changed`,
    );
  }
  const date = new Date(c.date + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + settings.turnDays);
  const day = date.toISOString().slice(0, 10),
    turn = c.turn + 1;
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
    date: day,
    turn,
    tokens: c.tokens + tokens,
    updatedAt: new Date().toISOString(),
    history: [
      event,
      ...result.headlines.map((h) => ({
        ...h,
        id: crypto.randomUUID(),
        turn,
        date: day,
        category: "World",
      })),
      ...c.history,
    ],
  };
  next.status = resolveStatus(next);
  return next;
}
export function demoTurn(
  c: Campaign,
  action: string,
  settings: Settings,
): TurnResult {
  const a = action.toLowerCase(),
    n = c.nations[c.player],
    hard = settings.difficulty === "Challenging" ? 2 : 0;
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
  } else if (/trade|treaty|diploma|peace|alliance/.test(a)) {
    title = "Diplomatic channels open";
    summary =
      "Your diplomatic initiative wins a cautious welcome abroad. Negotiators begin discussing practical terms. Commercial confidence improves as the prospect of closer cooperation grows.";
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
    .slice(0, 2);
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
      },
      ...others.map((x) => ({
        id: x.id,
        stability: 0,
        economy: 0,
        influence: 0,
        relations:
          category === "Military" ? -8 : category === "Diplomacy" ? 6 : 1,
      })),
    ],
    headlines: others
      .slice(0, 1)
      .map((x) => ({
        title: `${x.name} responds to your policy`,
        body:
          category === "Military"
            ? "Officials call for restraint and review their security posture."
            : "Officials acknowledge the announcement and begin reviewing its regional implications.",
      })),
    territories: [],
  };
}
export function compactContext(
  c: Campaign,
  action: string,
  settings: Settings,
  regions: FeatureCollection | null,
) {
  const player = c.nations[c.player];
  const mentioned = Object.values(c.nations).filter(
    (n) =>
      n.id !== c.player && action.toLowerCase().includes(n.name.toLowerCase()),
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
  const selected = [player, ...mentioned, ...neighbors]
    .filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i)
    .slice(0, settings.contextNations);
  return {
    date: c.date,
    turn: c.turn,
    player: c.player,
    difficulty: settings.difficulty,
    daysPerTurn: settings.turnDays,
    nations: selected.map(({ geometry, original, ...n }) => ({
      ...n,
      bounds: bbox(feature(geometry)),
    })),
    regions: (regions?.features || [])
      .filter(
        (f) =>
          f.properties?.country === c.player ||
          action
            .toLowerCase()
            .includes(String(f.properties?.name).toLowerCase()),
      )
      .slice(0, 60)
      .map((f) => f.properties),
    recent: c.history
      .slice(0, 4)
      .map((e) => ({ title: e.title, body: e.body.slice(0, 600) })),
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

import { z } from "zod";
import { absorbDependencies, flagSchema, type Campaign } from "./game";
const finite = z.number().finite();
const point = z.tuple([finite.min(-180).max(180), finite.min(-90).max(90)]);
const ring = z.array(point).min(4).max(100000);
const polygon = z.array(ring).min(1).max(10000);
const geometry = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: polygon }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygon).min(1).max(10000),
  }),
]);
const nation = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  iso: z.string().max(10),
  continent: z.string().max(60),
  population: finite.min(0),
  populationYear: finite,
  gdp: finite.min(-99).transform((n) => Math.max(0, n)),
  gdpYear: finite.transform((n) => Math.max(0, n)),
  center: z.tuple([finite.min(-90).max(90), finite.min(-180).max(180)]),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  flag: flagSchema,
  stability: finite.min(0).max(100),
  economy: finite.min(0).max(100),
  influence: finite.min(0).max(100),
  relations: finite.min(-100).max(100),
  military: finite.min(0).max(100).optional(),
  technology: finite.min(0).max(100).optional(),
  publicSupport: finite.min(0).max(100).optional(),
  relationships: z.record(finite.min(-100).max(100)).optional(),
  ideology: z.string().max(100),
  goal: z.string().max(200),
  government: z.string().max(100).optional(),
  leader: z.string().max(100).optional(),
  culture: z.string().max(100).optional(),
  allies: z.array(z.string().max(40)).max(100).optional(),
  rivals: z.array(z.string().max(40)).max(100).optional(),
  claims: z.array(z.string().max(80)).max(100).optional(),
  history: z.array(z.string().max(240)).max(100).optional(),
  dossier: z.string().max(400).optional(),
  geometry,
  original: z.boolean(),
  suzerain: z.string().max(40).optional(),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => Number.isFinite(Date.parse(s)));
export const campaignSchema = z
  .object({
    version: z.literal(1),
    id: z.string().max(80),
    name: z.string().min(1).max(100),
    player: z.string().max(40),
    date,
    turn: z.number().int().min(1),
    nations: z
      .record(nation)
      .refine(
        (n) =>
          Object.keys(n).length > 0 &&
          Object.keys(n).length <= 1000 &&
          Object.entries(n).every(([id, value]) => id === value.id),
      ),
    history: z
      .array(
        z.object({
          id: z.string().max(80),
          turn: z.number().int().min(1),
          date,
          category: z.string().max(80),
          title: z.string().max(150),
          body: z.string().max(3000),
          action: z.string().max(4000).optional(),
          changes: z.array(z.string().max(200)).max(60).optional(),
        }),
      )
      .max(10000),
    createdAt: z.string().max(50),
    updatedAt: z.string().max(50),
    status: z.enum(["active", "defeat", "victory"]),
    tokens: finite.min(0),
    regions: z.record(z.object({
      owner: z.string().max(40),
      controller: z.string().max(40),
      damage: finite.min(0).max(100),
      unrest: finite.min(0).max(100),
      identity: z.string().max(100).optional(),
      politicalClimate: z.string().max(100).optional(),
      geometry: geometry.optional(),
      name: z.string().max(100).optional(),
      origin: z.string().max(40).optional(),
      type: z.enum(["State", "Province", "Territory", "Commonwealth"]).optional(),
    })).optional(),
    removedRegions: z.array(z.string().max(100)).max(20000).optional(),
    wars: z.array(z.object({
      id: z.string().max(80),
      attackers: z.array(z.string().max(40)).min(1).max(20),
      defenders: z.array(z.string().max(40)).min(1).max(20),
      goal: z.string().max(240),
      started: date,
      status: z.enum(["active", "ended"]),
      ended: date.optional(),
      outcome: z.enum(["restored", "occupied", "ceded"]).optional(),
    })).max(1000).optional(),
    firestorm: z.literal(true).optional(),
  })
  .refine((c) => c.status === "defeat" || !!c.nations[c.player]);
export function parseCampaign(raw: unknown): Campaign {
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success)
    throw Error("This is not a valid Novus Arbitrium alpha save.");
  return absorbDependencies(parsed.data as Campaign);
}
export { parseSettings } from "./settings";

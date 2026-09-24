import { z } from "zod";
import { flagSchema, type Campaign, defaults } from "./game";
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
  ideology: z.string().max(100),
  goal: z.string().max(200),
  geometry,
  original: z.boolean(),
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
  })
  .refine((c) => c.status === "defeat" || !!c.nations[c.player]);
export function parseCampaign(raw: unknown): Campaign {
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success)
    throw Error("This is not a valid Novus Arbitrium alpha save.");
  return parsed.data as Campaign;
}
export function parseSettings(raw: unknown) {
  const stored = raw && typeof raw === "object" && "provider" in raw && raw.provider === "demo" ? { ...raw, provider: "ollama" } : raw;
  const schema = z.object({
    difficulty: z.enum(["Standard", "Challenging"]),
    turnDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
    provider: z.enum(["ollama", "openai", "openrouter"]),
    model: z.string().max(120),
    temperature: finite.min(0).max(1.5),
    maxTokens: z.number().int().min(512).max(8192),
    tokenBudget: finite.min(2000).max(10000000),
    contextNations: z.number().int().min(3).max(16),
    prompt: z.string().max(1500),
    contrast: z.boolean(),
    motion: z.boolean(),
    transparency: z.boolean(),
    fontSize: z.number().int().min(16).max(20),
    sound: z.boolean(),
    volume: finite.min(0).max(100),
    labels: z.boolean(),
    texture: z.boolean().default(true),
    highlights: z.boolean().default(true),
  });
  const parsed = schema.safeParse(stored);
  return parsed.success ? parsed.data : defaults;
}

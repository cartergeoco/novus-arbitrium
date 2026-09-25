import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { turnSchema } from "./game";

/** Derive the native Ollama format from the same contract used to validate turns. */
export function turnOutputSchema(context: Record<string, unknown>) {
  const ids = (entries: unknown) => Array.isArray(entries)
    ? entries.flatMap((entry) => entry && typeof entry.id === "string" ? [entry.id as string] : []) : [];
  const nations = ids(context.nations);
  const regions = ids(context.regions);
  const nationId = nations.length ? z.enum(nations as [string, ...string[]]) : z.string().max(40);
  const regionId = regions.length ? z.enum(regions as [string, ...string[]]) : z.string().max(80);
  // Ollama's JSON grammar enforces integer ranges; floating-point min/max are
  // not constrained during decoding. Whole-point deltas are valid game values.
  const delta = z.number().int().min(-20).max(20);
  const relationDelta = z.number().int().min(-30).max(30);
  const regionActions = turnSchema.shape.regionActions.removeDefault().element.extend({ region: regionId, actor: nationId });
  const regionEffects = turnSchema.shape.regionEffects.removeDefault().element.extend({
    region: regionId, unrest: delta.default(0), damage: delta.default(0),
  });
  return zodToJsonSchema(turnSchema.extend({
    effects: turnSchema.shape.effects.element.extend({
      id: nationId, stability: delta.default(0), economy: delta.default(0),
      influence: delta.default(0), relations: relationDelta.default(0),
      military: delta.optional(), publicSupport: delta.optional(),
      relationsWith: z.object({ id: nationId, delta: relationDelta }).array().max(8).optional(),
    }).array().max(12),
    regionActions: regionActions.array().max(regions.length ? 8 : 0).default([]),
    regionEffects: regionEffects.array().max(regions.length ? 12 : 0).default([]),
    newNations: turnSchema.shape.newNations.removeDefault().element.extend({
      parent: nationId, regions: regionId.array().min(1).max(12),
    }).array().max(regions.length ? 2 : 0).default([]),
  }), { $refStrategy: "none" });
}

/**
 * Modular flag engine.
 *
 *   const { design } = normalizeFlag({ shape: "rectangle_standard", division: "horizontal_stripes",
 *     stripe_count: 3, colors: ["red", "white", "blue"], emblem: "star_ring", star_count: 12,
 *     emblem_color: "gold", emblem_scale: 0.25 });
 *   await loadAssets(designAssets(design));
 *   const svg = renderFlagSvg(design);
 *
 * Designs are plain JSON (see FlagDesign), render deterministically to a 2:1 SVG canvas,
 * and are built from shapes, divisions and emblems described in flagCatalog().
 */
import { z } from "zod";
import { normalizeFlag, validateStoredFlag } from "./normalize";
import type { FlagDesign } from "./types";

export * from "./types";
export { CANVAS } from "./svg";
export { namedColors, resolveColor, flagPalette, contrastColor } from "./color";
export { namedAreas, isParamVisible, resolveParams, type ParamDef, type Params, type Area } from "./params";
export { shapeDefs, shapePresets, shapeById, shapePresetById, bodyBox } from "./shapes";
export { divisionDefs, divisionPresets, divisionById, divisionPresetById, divisionCommon } from "./divisions";
export { emblemDefs, emblemPresets, emblemById, emblemPresetById, emblemCommon } from "./emblems";
export { arrangements, constellations } from "./arrangements";
export {
  assetIndex, assetCategories, assetCredits, assetMeta, getAsset, loadAssets, loadAssetChunk,
  missingAssets, searchAssets, resolveAssetId, subscribeAssets, assetVersion, type AssetMeta,
} from "./assets";
export { renderFlagSvg, renderFlagBody, designAssets, svgDataUri, shapeInfo, layerParams, type RenderOptions } from "./render";
export { normalizeFlag, normalizeLayer, normalizeShape, parseLayerPhrase, migrateLegacy, validateStoredFlag, anchors, MAX_LAYERS } from "./normalize";
export { flagColors, recolorFlag, generateFlag, makeFlag, deriveFlag, layerLabel } from "./derive";
export { nationalFlag, nationalFlagIds } from "./presets";
export { flagCatalog, flagPromptGuide, catalogStats } from "./catalog";
export { describeFlag } from "./describe";

/** Saved flags: legacy or v2 designs that are already clean; anything else is rejected. */
export const flagSchema = z.unknown().superRefine((value, ctx) => {
  const errors = validateStoredFlag(value);
  if (errors.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid flag: ${errors[0]}` });
}).transform((value) => normalizeFlag(value).design as FlagDesign);

const looseLayer = z.object({
  kind: z.enum(["division", "emblem"]).optional(),
  type: z.string().max(80),
  colors: z.array(z.string().max(30)).max(12).optional(),
  color: z.string().max(30).optional(),
  count: z.number().optional(),
  points: z.number().optional(),
  arrangement: z.string().max(20).optional(),
  position: z.string().max(30).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  scale: z.number().optional(),
  rotation: z.number().optional(),
  thickness: z.number().optional(),
  width: z.number().optional(),
  direction: z.string().max(20).optional(),
  side: z.string().max(20).optional(),
  area: z.string().max(30).optional(),
  asset: z.string().max(80).optional(),
  text: z.string().max(40).optional(),
}).passthrough();

/** AI-produced flags: permissive, normalized, and dropped (undefined) when unusable. */
export const flagInputSchema = z.object({
  shape: z.string().max(60).optional(),
  background: z.string().max(30).optional(),
  layers: z.array(looseLayer).max(24).optional(),
}).passthrough().transform((value) => {
  const result = normalizeFlag(value);
  return result.ok ? result.design : undefined;
});

import type { ParamDef, Params, ParamValue } from "./params";
import type { Box } from "./svg";

export type LayerKind = "division" | "emblem";

/**
 * A stored flag. Layers are painted in array order: index 0 is the bottom,
 * the last layer is drawn on top of everything else.
 */
export type FlagDesign = {
  v: 2;
  shape: FlagShapeSpec;
  background: string;
  layers: FlagLayer[];
};
export type FlagShapeSpec = { type: string } & Params;
export type FlagLayer = {
  kind: LayerKind;
  type: string;
  /** Optional stable handle so tools can refer to a layer. */
  id?: string;
  hidden?: boolean;
} & Params;

export type RenderContext = {
  /** Flag body inside the 2:1 canvas. */
  body: Box;
  /** Unique id prefix for defs (clip paths, patterns). */
  uid: string;
};

export type ComponentDef<P = Params> = {
  id: string;
  label: string;
  category: string;
  description: string;
  params: ParamDef[];
  /** Overrides for shared parameter defaults (e.g. a star's default scale). */
  defaults?: Params;
  tags?: string[];
  /** Span emblems draw across the whole flag in canvas coordinates instead of a unit box. */
  span?: boolean;
  render: (p: P, ctx: DivisionContext & EmblemContext) => string;
};

export type AssetBody = { body: string; viewBox: [number, number, number, number]; multicolor: boolean };

export type DivisionContext = RenderContext & {
  /** Box the division lays itself out in (the full body or its `area`). */
  frame: Box;
};

export type EmblemContext = RenderContext & {
  /** When set, the emblem is drawn in unit space centered on the origin with size 1. */
  unit: boolean;
  /** Center of this emblem instance in canvas coordinates. */
  cx: number;
  cy: number;
  /** Instance size in canvas units. */
  size: number;
  /** Index of the instance within an arrangement. */
  index: number;
  getAsset: (id: string) => AssetBody | undefined;
};

export type Preset = {
  id: string;
  base: string;
  label: string;
  category?: string;
  description?: string;
  params: Record<string, ParamValue>;
  tags?: string[];
};

export type ShapeDef = {
  id: string;
  label: string;
  category: string;
  description: string;
  params: ParamDef[];
  /** Height divided by width of the flag body. */
  ratio: (p: Params) => number;
  outline: (p: Params, body: Box) => string;
};

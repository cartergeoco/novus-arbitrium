import { area, cleanCoords, feature, polygon, truncate } from "@turf/turf";
import type { MultiPolygon, Polygon, Position } from "geojson";

/** Parts and holes smaller than this are boolean-operation slivers, not territory. */
const SLIVER_M2 = 2_000_000;

/**
 * Normalizes a border after a cut or merge. Rounding to about one metre makes
 * shared edges produced by separate operations coincide, so neighbours meet
 * without hairline gaps, and removes the duplicate and collinear vertices that
 * the boolean operations leave behind.
 */
export function tidy<G extends Polygon | MultiPolygon>(geometry: G): Polygon | MultiPolygon | null {
  let clean: Polygon | MultiPolygon;
  try {
    clean = cleanCoords(truncate(feature(geometry), { precision: 5, coordinates: 2 })).geometry as Polygon | MultiPolygon;
  } catch {
    return geometry;
  }
  const parts = (clean.type === "Polygon" ? [clean.coordinates] : clean.coordinates)
    .map(keepRings)
    .filter((rings): rings is Position[][] => !!rings);
  if (!parts.length) return null;
  return parts.length === 1 ? { type: "Polygon", coordinates: parts[0] } : { type: "MultiPolygon", coordinates: parts };
}

function keepRings(rings: Position[][]): Position[][] | null {
  const [outer, ...holes] = rings.filter((ring) => ring.length >= 4);
  if (!outer || ringArea(outer) < SLIVER_M2) return null;
  return [outer, ...holes.filter((hole) => ringArea(hole) >= SLIVER_M2)];
}

function ringArea(ring: Position[]) {
  try { return area(polygon([ring])); }
  catch { return 0; }
}

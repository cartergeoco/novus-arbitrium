import { area, cleanCoords, feature, polygon } from "@turf/turf";
import type { MultiPolygon, Polygon, Position } from "geojson";

/** Parts and holes smaller than this are boolean-operation slivers, not territory. */
const SLIVER_M2 = 2_000_000;

/**
 * Drops duplicate and collinear vertices and boolean-operation slivers.
 * Coordinates stay where they are: rounding both sides of a cut independently
 * makes the shared edge cross itself and leaves a wedge of overlap.
 */
export function tidy<G extends Polygon | MultiPolygon>(geometry: G): Polygon | MultiPolygon | null {
  let clean: Polygon | MultiPolygon;
  try {
    clean = cleanCoords(feature(geometry)).geometry as Polygon | MultiPolygon;
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

const PRECISION = 5;
const COLLINEAR_DEGREES = 0.01;

function round(value: number) {
  return Math.round(value * 10 ** PRECISION) / 10 ** PRECISION;
}

/** Drop duplicate and near-collinear vertices from an AI border ring. */
export function simplifyRing(ring: number[][]): number[][] {
  const snapped = ring.map((point) => [round(point[0] || 0), round(point[1] || 0)]);
  const unique: number[][] = [];
  for (const point of snapped) {
    const previous = unique.at(-1);
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) unique.push(point);
  }
  if (unique.length > 1) {
    const first = unique[0];
    const last = unique.at(-1)!;
    if (first[0] === last[0] && first[1] === last[1]) unique.pop();
  }
  const kept: number[][] = [];
  for (let index = 0; index < unique.length; index++) {
    const previous = unique[(index + unique.length - 1) % unique.length];
    const current = unique[index];
    const next = unique[(index + 1) % unique.length];
    const span = Math.hypot(next[0] - previous[0], next[1] - previous[1]) || 1;
    const deviation = Math.abs(
      (current[0] - previous[0]) * (next[1] - previous[1]) -
      (current[1] - previous[1]) * (next[0] - previous[0]),
    ) / span;
    if (deviation > COLLINEAR_DEGREES) kept.push(current);
  }
  if (kept.length < 3) return ring.map((point) => [...point]);
  return [...kept, [...kept[0]]];
}

/** Round a boolean-operation result and drop slivers so shared borders meet. */
export function sealBorder<G extends Polygon | MultiPolygon>(geometry: G): G {
  return (tidy(geometry) || geometry) as G;
}

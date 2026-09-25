import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { booleanPointInPolygon, point } from "@turf/turf";
import { labelVisible, MAP_MAX_ZOOM, MAP_MIN_ZOOM, waterLabels, waterLines } from "../lib/waters";

const world = JSON.parse(readFileSync(new URL("../public/data/world.json", import.meta.url), "utf8"));

test("water labels sit on open water and fade with zoom like country titles", () => {
  for (const water of waterLabels) {
    const spot = point([water.lng, water.lat]);
    const covered = world.features.some((feature: { geometry: GeoJSON.Geometry }) => booleanPointInPolygon(spot, feature as never));
    assert.equal(covered, false, water.name);
  }
  assert.equal(labelVisible(MAP_MIN_ZOOM, 1_000_000_000), true);
  assert.equal(labelVisible(MAP_MIN_ZOOM, 13_000), false);
  assert.equal(labelVisible(MAP_MAX_ZOOM, 13_000), true);
  assert.deepEqual(waterLines("North Pacific Ocean"), ["NORTH PACIFIC", "OCEAN"]);
  assert.deepEqual(waterLines("Gulf of Mexico"), ["GULF OF", "MEXICO"]);
  assert.deepEqual(waterLines("Caspian Sea"), ["CASPIAN", "SEA"]);
});

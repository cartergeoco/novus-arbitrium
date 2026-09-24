import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCampaign, defaults, transferTerritory } from "../lib/game";
import { parseCampaign, parseSettings } from "../lib/validation";
const world = JSON.parse(
  readFileSync(new URL("../public/data/world.json", import.meta.url), "utf8"),
);
test("an exported campaign round-trips through validation", () => {
  const c = createCampaign(world, "Export test", "USA");
  assert.deepEqual(parseCampaign(JSON.parse(JSON.stringify(c))), c);
});
test("corrupt flags, missing identities and invalid settings are rejected", () => {
  const c = createCampaign(world, "Corrupt test", "USA");
  c.nations.USA.flag.colors = ["https://example.com"];
  assert.throws(() => parseCampaign(c));
  assert.deepEqual(
    parseSettings({ fontSize: 999, provider: "untrusted" }),
    defaults,
  );
});
test("self-intersecting territory masks are rejected", () => {
  const c = createCampaign(world, "Crossing test", "USA");
  assert.throws(
    () =>
      transferTerritory(c.nations, "USA", [
        [-125, 32],
        [-115, 42],
        [-115, 32],
        [-125, 42],
        [-125, 32],
      ]),
    /crossing/,
  );
});

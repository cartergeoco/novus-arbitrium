import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { area, feature } from "@turf/turf";
import { applyTurn, compactContext, createCampaign, defaults, demoTurn } from "../lib/game";
import { regionViews, type RegionAtlas } from "../lib/world-regions";
import { flagColors } from "../lib/flag";

const world = JSON.parse(readFileSync(new URL("../public/data/world.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/data/region-atlas.json", import.meta.url), "utf8")) as RegionAtlas;
const make = () => createCampaign(world, "Regional history", "USA");

test("the 2026 regional atlas covers each starting country with stable IDs", () => {
  const c = make();
  const regions = regionViews(c, atlas);
  assert.equal(regions.length, 4578);
  assert.equal(new Set(regions.map((r) => r.properties.id)).size, regions.length);
  assert.ok(regions.some((r) => r.properties.id === "USA-3520" && r.properties.name === "Arizona"));
  assert.ok(Object.keys(c.nations).every((id) => regions.some((r) => r.state.owner === id)));
});

test("occupation leaves legal borders intact, while a later treaty transfers Arizona", () => {
  const c = make();
  const beforeUSA = area(feature(c.nations.USA.geometry));
  const war = demoTurn(c, "Mexico attacks Arizona", defaults);
  war.conflicts = [{ action: "start", attacker: "MEX", defender: "USA", goal: "Secure Arizona" }];
  war.regionActions = [{ region: "USA-3520", mode: "occupy", actor: "MEX", reason: "A successful border offensive" }];
  const occupied = applyTurn(c, war, "Mexico attacks Arizona", defaults, 0, atlas);
  assert.equal(occupied.regions?.["USA-3520"].owner, "USA");
  assert.equal(occupied.regions?.["USA-3520"].controller, "MEX");
  assert.equal(area(feature(occupied.nations.USA.geometry)), beforeUSA);
  assert.equal(occupied.wars?.[0].status, "active");
  const peace = demoTurn(occupied, "Cede Arizona in peace talks", defaults);
  peace.conflicts = [{ action: "end", attacker: "MEX", defender: "USA", goal: "Peace agreement" }];
  peace.regionActions = [{ region: "USA-3520", mode: "cede", actor: "MEX", reason: "Peace settlement" }];
  const settled = applyTurn(occupied, peace, "Cede Arizona", defaults, 0, atlas);
  assert.equal(settled.regions?.["USA-3520"].owner, "MEX");
  assert.equal(settled.regions?.["USA-3520"].controller, "MEX");
  assert.ok(area(feature(settled.nations.USA.geometry)) < beforeUSA);
  assert.equal(settled.wars?.[0].status, "ended");
  assert.equal(occupied.wars?.[0].status, "active");
  assert.ok(regionViews(settled, atlas).some((r) => r.properties.id === "USA-3520" && r.state.owner === "MEX"));
  assert.equal(c.regions?.["USA-3520"], undefined);
});

test("occupation without war is rejected atomically", () => {
  const c = make();
  const turn = demoTurn(c, "Occupy Arizona", defaults);
  turn.regionActions = [{ region: "USA-3520", mode: "occupy", actor: "MEX", reason: "Unexplained" }];
  const snapshot = JSON.stringify(c);
  assert.throws(() => applyTurn(c, turn, "Occupy Arizona", defaults, 0, atlas), /active conflict/);
  assert.equal(JSON.stringify(c), snapshot);
});

test("diplomatic ties, rivalries, and claims persist between turns", () => {
  const c = make();
  const turn = demoTurn(c, "Mexico builds an alliance", defaults);
  turn.effects = [{
    id: "MEX", stability: 0, economy: 0, influence: 0, relations: 0,
    relationsWith: [{ id: "USA", delta: 12 }], alliesAdd: ["CAN"],
    rivalsAdd: ["USA"], claimsAdd: ["USA-3520"],
  }];
  const next = applyTurn(c, turn, "Mexico builds an alliance", defaults, 0, atlas);
  assert.equal(next.nations.MEX.relationships?.USA, 12);
  assert.ok(next.nations.MEX.allies?.includes("CAN"));
  assert.ok(next.nations.CAN.allies?.includes("MEX"));
  assert.ok(next.nations.MEX.rivals?.includes("USA"));
  assert.ok(next.nations.MEX.claims?.includes("USA-3520"));
  assert.deepEqual(c.nations.MEX.allies, []);
});

test("a border cut persists as two independently owned Arizona pieces", () => {
  const c = make();
  const turn = demoTurn(c, "Treaty divides Arizona", defaults);
  turn.territories = [{
    source: "USA", target: "MEX",
    ring: [[-114.9, 31.2], [-111.8, 31.2], [-111.8, 37.1], [-114.9, 37.1], [-114.9, 31.2]],
  }];
  const next = applyTurn(c, turn, "Treaty divides Arizona", defaults, 0, atlas);
  const pieces = regionViews(next, atlas).filter((r) => r.properties.name.startsWith("Arizona"));
  assert.equal(pieces.length, 2);
  assert.deepEqual(new Set(pieces.map((r) => r.state.owner)), new Set(["USA", "MEX"]));
  assert.ok(next.removedRegions?.includes("USA-3520"));
});

test("a province-backed rebellion forms a persistent successor and civil war", () => {
  const c = make();
  const pressure = demoTurn(c, "Protests grow in the Southwest", defaults);
  pressure.regionEffects = ["USA-3520", "USA-3521"].map((region) => ({ region, unrest: 20, damage: 0, cause: "Protests follow an unpopular law" }));
  const tense = applyTurn(c, pressure, "Protests grow", defaults, 0, atlas);
  const turn = demoTurn(tense, "A southwestern rebellion declares independence", defaults);
  turn.regionEffects = ["USA-3520", "USA-3521"].map((region) => ({ region, unrest: 20, damage: 0, cause: "Negotiations break down" }));
  turn.newNations = [{
    parent: "USA", name: "Southwestern Republic", regions: ["USA-3520", "USA-3521"],
    ideology: "Federal reform", government: "Provisional council", civilWar: true,
    cause: "After talks collapsed, provincial officials in the Southwest organized a provisional government and broke from Washington.",
  }];
  const next = applyTurn(tense, turn, "A southwestern rebellion", defaults, 0, atlas);
  const successor = Object.values(next.nations).find((n) => n.name === "Southwestern Republic");
  assert.ok(successor);
  assert.equal(successor?.original, false);
  assert.equal(successor?.government, "Provisional council");
  assert.equal(next.regions?.["USA-3520"].owner, successor?.id);
  assert.equal(next.regions?.["USA-3521"].owner, successor?.id);
  assert.ok(next.wars?.some((war) => war.status === "active" && war.attackers.includes(successor!.id) && war.defenders.includes("USA")));
  assert.equal(next.nations.USA.population + successor!.population, c.nations.USA.population);
  assert.ok(area(feature(next.nations.USA.geometry)) < area(feature(c.nations.USA.geometry)));
});

test("a civil war proceeds from calm provinces and keeps the parent constitutional family", () => {
  const c = make();
  const turn = demoTurn(c, "Rebellion", defaults);
  turn.newNations = [{ parent: "USA", name: "Sudden State", regions: ["USA-3520"], ideology: "Absolute monarchy", government: "Kingdom", civilWar: true, cause: "Local officials, ordered to break away, set up a provisional authority in the province after the capital refused to govern it." }];
  const next = applyTurn(c, turn, "Rebellion", defaults, 0, atlas);
  const successor = Object.values(next.nations).find((n) => n.name === "Sudden State");
  assert.ok(successor);
  assert.equal(successor?.ideology, c.nations.USA.ideology);
  assert.equal(successor?.government, c.nations.USA.government);
  assert.ok(flagColors(successor!.flag).every((color) => ["#b22234", "#ffffff", "#3c3b6e"].includes(color)));
  assert.notDeepEqual(successor?.flag.layers.map((l) => l.type), c.nations.USA.flag.layers.map((l) => l.type));
});

test("an unexplained new state is not founded", () => {
  const c = make();
  const turn = demoTurn(c, "War continues", defaults);
  turn.newNations = [{ parent: "USA", name: "New Mexico Territory", regions: ["USA-3520"], civilWar: false }];
  const next = applyTurn(c, turn, "War continues", defaults, 0, atlas);
  assert.equal(Object.values(next.nations).some((n) => n.name === "New Mexico Territory"), false);
  assert.equal(next.regions?.["USA-3520"]?.owner ?? "USA", "USA");
  assert.equal(next.history.some((event) => event.title.includes("New Mexico Territory")), false);
});

test("AI context lists relevant regions, wars, and earlier history without geometry", () => {
  const c = make();
  const context = compactContext(c, "Discuss Arizona with Mexico", defaults, regionViews(c, atlas));
  assert.ok(context.regions.some((r) => r.id === "USA-3520"));
  assert.ok(context.nations.some((n) => n.id === "MEX"));
  assert.ok(context.regions.length <= 90);
  assert.ok(context.regions.every((r) => !("geometry" in r)));
});

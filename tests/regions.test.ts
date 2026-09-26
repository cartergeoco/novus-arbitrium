import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { area, feature } from "@turf/turf";
import { applyTurn, compactContext, createCampaign, defaults, demoTurn } from "../lib/game";
import { changeRegion, regionType, regionViews, type RegionAtlas } from "../lib/world-regions";
import { parseCampaign } from "../lib/validation";
import { flagColors } from "../lib/flag";

const world = JSON.parse(readFileSync(new URL("../public/data/world.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/data/region-atlas.json", import.meta.url), "utf8")) as RegionAtlas;
const regionalFlags = JSON.parse(readFileSync(new URL("../public/data/region-flags.json", import.meta.url), "utf8")) as { flags: Record<string, string> };
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

test("occupation without a prior war still changes control", () => {
  const c = make();
  const turn = demoTurn(c, "Occupy Arizona", defaults);
  turn.regionActions = [{ region: "USA-3520", mode: "occupy", actor: "MEX", reason: "Mexican forces cross the border and hold the province." }];
  const next = applyTurn(c, turn, "Occupy Arizona", defaults, 0, atlas);
  assert.equal(next.regions?.["USA-3520"].controller, "MEX");
  assert.equal(next.regions?.["USA-3520"].owner, "USA");
  assert.equal(next.status, "active");
});

test("a score of zero raises civil-war pressure and does not end the campaign", () => {
  const c = make();
  c.nations.USA.stability = 0;
  const turn = demoTurn(c, "Hold the government together", defaults);
  const next = applyTurn(c, turn, "Hold the government together", defaults, 0, atlas);
  assert.equal(next.status, "active");
  assert.ok((next.regions?.["USA-3520"].unrest || 0) > 0);
  assert.ok(next.history.some((event) => event.title.includes("tearing itself apart")));
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

test("dependent holdings belong to their suzerain and old version-one saves still parse", () => {
  const c = make();
  assert.equal(c.nations.PRI, undefined);
  assert.equal(c.nations.GRL, undefined);
  assert.equal(regionViews(c, atlas).find((r) => r.properties.id === "PRI-5260")?.state.owner, "USA");
  const greenland = regionViews(c, atlas).find((r) => r.properties.country === "GRL");
  assert.equal(greenland?.state.owner, "DNK");
  assert.equal(regionType(greenland!), "Territory");
  assert.equal(parseCampaign({ ...c, firestorm: undefined }).version, 1);
  assert.equal(regionalFlags.flags["USA-3520"], "/flags/regions/US-AZ.webp");
  assert.equal(regionalFlags.flags["PRI-5260"], "/flags/regions/US-PR.webp");
  assert.equal(regionalFlags.flags["GUM+00?"], "/flags/regions/US-GU.webp");
  assert.equal(regionalFlags.flags["ASM-5002"], "/flags/regions/US-AS.webp");
});

test("ISO 3166-2 region flags are served from bundled local assets", () => {
  const paths = new Set(Object.values(regionalFlags.flags));
  assert.ok(paths.size > 2000);
  for (const path of paths) {
    assert.match(path, /^\/flags\/regions\/[A-Z]{2}-[A-Z0-9]+\.webp$/);
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${path} is missing`);
  }
});

test("occupation keeps draining the holder until peace records the land outcome", () => {
  const c = make();
  const invasion = demoTurn(c, "Mexico attacks Arizona", defaults);
  invasion.conflicts = [{ action: "start", attacker: "MEX", defender: "USA", goal: "Control Arizona" }];
  invasion.regionActions = [{ region: "USA-3520", mode: "occupy", actor: "MEX", reason: "The army holds Arizona" }];
  const first = applyTurn(c, invasion, "Attack", defaults, 0, atlas);
  const second = applyTurn(first, demoTurn(first, "War continues", defaults), "Wait", defaults, 0, atlas);
  assert.ok(second.regions!["USA-3520"].damage > first.regions!["USA-3520"].damage);
  assert.ok(second.regions!["USA-3520"].unrest > first.regions!["USA-3520"].unrest);
  assert.ok(second.nations.MEX.stability < first.nations.MEX.stability);
  const peace = demoTurn(second, "An armistice", defaults);
  peace.conflicts = [{ action: "end", attacker: "MEX", defender: "USA", goal: "Armistice" }];
  const ended = applyTurn(second, peace, "Peace", defaults, 0, atlas);
  assert.equal(ended.wars![0].outcome, "occupied");
  assert.equal(ended.wars![0].ended, ended.date);
  assert.equal(ended.regions!["USA-3520"].owner, "USA");
  assert.equal(ended.regions!["USA-3520"].controller, "MEX");
});

test("a declaration cannot close a war in its own turn, and subsidiary attacks bring in the suzerain", () => {
  const c = make();
  c.nations.CAN.suzerain = "GBR";
  const turn = demoTurn(c, "Mexico declares war on Canada", defaults);
  turn.conflicts = [
    { action: "start", attacker: "MEX", defender: "CAN", goal: "Border dispute" },
    { action: "end", attacker: "MEX", defender: "CAN", goal: "Immediate peace" },
  ];
  const next = applyTurn(c, turn, "Declaration", defaults, 0, atlas);
  assert.equal(next.wars?.[0].status, "active");
  assert.ok(next.wars?.[0].defenders.includes("GBR"));
  const subsidiaryAttack = demoTurn(c, "Canada attacks Mexico", defaults);
  subsidiaryAttack.conflicts = [{ action: "start", attacker: "CAN", defender: "MEX", goal: "Conquest" }];
  assert.equal(applyTurn(c, subsidiaryAttack, "Attack", defaults, 0, atlas).wars?.length, 0);
});

test("abandoned land is empty until it is occupied or legally incorporated", () => {
  const c = make();
  const empty = changeRegion(c, atlas, "USA-3520", "abandon", "USA");
  const region = regionViews(empty, atlas).find((r) => r.properties.id === "USA-3520")!;
  assert.equal(region.state.owner, "");
  assert.equal(region.state.controller, "");
  assert.equal(region.state.unrest, 0);
  assert.ok(area(feature(empty.nations.USA.geometry)) < area(feature(c.nations.USA.geometry)));
  const occupied = changeRegion(empty, atlas, "USA-3520", "occupy", "MEX");
  assert.equal(occupied.regions!["USA-3520"].owner, "");
  assert.equal(occupied.regions!["USA-3520"].controller, "MEX");
  const incorporated = changeRegion(occupied, atlas, "USA-3520", "cede", "MEX");
  assert.equal(incorporated.regions!["USA-3520"].owner, "MEX");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { area, feature, featureCollection, intersect } from "@turf/turf";
import {
  createCampaign,
  applyTurn,
  demoTurn,
  defaults,
  transferTerritory,
  compactContext,
  turnSchema,
  resolveStatus,
} from "../lib/game";
const world = JSON.parse(
  readFileSync(new URL("../public/data/world.json", import.meta.url), "utf8"),
);
const make = () => createCampaign(world, "Test timeline", "USA");
test("all starting countries have valid identities and geometry", () => {
  const c = make();
  assert.equal(Object.keys(c.nations).length, 241);
  assert.equal(c.turn, 1);
  assert.equal(c.status, "active");
  for (const n of Object.values(c.nations)) {
    assert.ok(n.name);
    assert.ok(n.ideology && n.goal && n.dossier);
    assert.equal(n.government, "Unspecified");
    assert.ok(area(feature(n.geometry)) > 0);
    assert.ok(Number.isFinite(n.stability));
  }
  assert.equal(c.nations.USA.ideology, "Presidential republic");
  assert.equal(c.nations.USA.goal, "Alliance leadership");
  assert.equal(c.nations.CHE.goal, "Armed neutrality");
  assert.equal(c.nations.BEL.ideology, "Constitutional monarchy");
  assert.match(c.nations.GUM.dossier || "", /United States/);
});
test("a decision advances the calendar and updates stats without mutating previous state", () => {
  const c = make(),
    before = structuredClone(c);
  const r = demoTurn(c, "Invest in education", defaults);
  const next = applyTurn(c, r, "Invest in education", defaults);
  assert.equal(next.date, "2026-01-08");
  assert.equal(next.turn, 2);
  assert.equal(next.nations.USA.stability, c.nations.USA.stability + 4);
  assert.deepEqual(c, before);
  assert.equal(next.history[0].action, "Invest in education");
});
test("AI cannot change the player identity but may change other nations", () => {
  const c = make(),
    r = demoTurn(c, "hello", defaults);
  r.effects = [
    {
      id: "USA",
      name: "Forbidden rename",
      ideology: "Forbidden ideology",
      stability: 0,
      economy: 0,
      influence: 0,
      relations: 0,
    },
    {
      id: "CAN",
      name: "New Canada",
      stability: 0,
      economy: 0,
      influence: 0,
      relations: 0,
    },
  ];
  const next = applyTurn(c, r, "hello", defaults);
  assert.equal(next.nations.USA.name, c.nations.USA.name);
  assert.equal(next.nations.CAN.name, "New Canada");
});
test("freeform secession conserves area and population and leaves no overlap", () => {
  const c = make();
  const ring = [
    [-126, 31],
    [-116, 31],
    [-116, 43],
    [-126, 43],
    [-126, 31],
  ];
  const next = transferTerritory(
    c.nations,
    "USA",
    ring,
    undefined,
    "Pacific Republic",
  );
  const id = Object.keys(next).find((id) => id.startsWith("NEW-"))!;
  assert.ok(id);
  const total =
    area(feature(next.USA.geometry)) + area(feature(next[id].geometry));
  assert.ok(
    Math.abs(total - area(feature(c.nations.USA.geometry))) / total < 0.00001,
  );
  assert.equal(
    next.USA.population + next[id].population,
    c.nations.USA.population,
  );
  assert.equal(
    intersect(
      featureCollection([
        feature(next.USA.geometry),
        feature(next[id].geometry),
      ]),
    ),
    null,
  );
  assert.equal(next[id].name, "Pacific Republic");
  assert.equal(next[id].original, false);
});
test("transfer to an existing nation merges geometry and conserves population", () => {
  const c = make();
  const next = transferTerritory(
    c.nations,
    "USA",
    [
      [-126, 45],
      [-116, 45],
      [-116, 51],
      [-126, 51],
      [-126, 45],
    ],
    "CAN",
  );
  assert.equal(
    next.USA.population + next.CAN.population,
    c.nations.USA.population + c.nations.CAN.population,
  );
  assert.ok(next.CAN.population > c.nations.CAN.population);
  assert.equal(Object.keys(next).length, 241);
});
test("failed territorial operations are atomic", () => {
  const c = make(),
    before = JSON.stringify(c);
  assert.throws(() =>
    transferTerritory(c.nations, "USA", [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]),
  );
  const r = demoTurn(c, "hello", defaults);
  r.territories = [
    {
      source: "USA",
      target: "MISSING",
      ring: [
        [-125, 32],
        [-115, 32],
        [-115, 42],
        [-125, 32],
      ],
    },
  ];
  assert.throws(() => applyTurn(c, r, "hello", defaults));
  assert.equal(JSON.stringify(c), before);
});
test("world context stays bounded and omits detailed border coordinates", () => {
  const c = make(),
    context = compactContext(c, "Open talks with France", defaults, null);
  assert.equal(context.nations.length, 8);
  assert.ok(context.nations.some((n) => n.id === "FRA"));
  assert.ok(context.nations.every((n) => !("geometry" in n) && n.dossier));
  assert.ok(JSON.stringify(context).length < 15000);
});
test("invalid AI output is rejected and stability zero ends an administration", () => {
  assert.equal(turnSchema.safeParse({ title: "bad" }).success, false);
  const c = make();
  c.nations.USA.stability = 0;
  assert.equal(resolveStatus(c), "defeat");
  delete c.nations.USA;
  assert.equal(resolveStatus(c), "defeat");
});

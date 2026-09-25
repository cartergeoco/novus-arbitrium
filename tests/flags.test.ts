import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assetIndex, assetMeta, catalogStats, deriveFlag, describeFlag, designAssets, divisionDefs, divisionPresets, emblemDefs, emblemPresets,
  flagCatalog, flagColors, flagInputSchema, flagPromptGuide, flagSchema, loadAssets, makeFlag, migrateLegacy, nationalFlag,
  nationalFlagIds, normalizeFlag, renderFlagSvg, resolveAssetId, shapeDefs, shapePresets, validateStoredFlag, layerParams,
} from "../lib/flag";
import { generateFlag, libraryPool } from "../lib/flag/derive";
import { arrange } from "../lib/flag/arrangements";
import { luminance } from "../lib/flag/color";
import { shapeInfo } from "../lib/flag/render";

const first = {
  shape: "rectangle_standard", division: "horizontal_stripes", stripe_count: 3, colors: ["red", "white", "blue"],
  emblem: "star_ring", star_count: 12, star_points: 5, emblem_color: "gold", emblem_position: "center", emblem_scale: 0.25,
};
const second = {
  shape: "rectangle_long", division: "solid", background: "dark_green",
  emblems: ["uneven_cross, white, offset left", "uneven_cross, gold, thinner, offset left", "star, 8 points, upper-right"],
};

test("shorthand specs from the request build the intended layers", () => {
  const a = normalizeFlag(first).design;
  assert.equal(a.shape.type, "rectangle");
  assert.deepEqual(a.layers.map((l) => [l.kind, l.type]), [["division", "horizontal_stripes"], ["emblem", "star"]]);
  assert.equal(a.layers[0].count, 3);
  assert.deepEqual(a.layers[0].colors, ["#d52b1e", "#ffffff", "#0039a6"]);
  assert.equal(a.layers[1].arrangement, "ring");
  assert.equal(a.layers[1].count, 12);
  assert.equal(a.layers[1].points, 5);
  assert.equal(a.layers[1].color, "#f1bf00");
  assert.equal(a.layers[1].scale, 0.25);

  const b = normalizeFlag(second).design;
  assert.equal(b.shape.ratio, 0.5);
  assert.equal(b.background, "#006233");
  assert.equal(b.layers[0].color, "#006233");
  const [white, gold, star] = b.layers.slice(1);
  assert.equal(white.type, "full_cross");
  assert.equal(white.color, "#ffffff");
  assert.equal(white.x, 0.375);
  assert.equal(gold.color, "#f1bf00");
  assert.ok((gold.thickness as number) < (white.thickness as number));
  assert.equal(star.type, "star");
  assert.equal(star.points, 8);
  assert.deepEqual([star.x, star.y], [0.75, 0.25]);
});

test("rendering is deterministic and always on a 2:1 canvas", () => {
  for (const spec of [first, second, { shape: "nepal", background: "crimson" }, { shape: "vertical_banner" }, { shape: "pennant_long" }]) {
    const design = normalizeFlag(spec).design;
    const svg = renderFlagSvg(design);
    assert.equal(svg, renderFlagSvg(structuredClone(design)));
    assert.match(svg, /viewBox="0 0 200 100"/);
  }
});

test("normalization is idempotent and saved designs validate", () => {
  for (const spec of [first, second]) {
    const once = normalizeFlag(spec).design;
    assert.deepEqual(normalizeFlag(once).design, once);
    assert.deepEqual(validateStoredFlag(once), []);
    assert.deepEqual(flagSchema.parse(once), once);
  }
});

test("layers paint in array order", () => {
  const design = normalizeFlag({ layers: [{ type: "solid", color: "#111111" }, { type: "circle", color: "#222222" }, { type: "star", color: "#333333" }] }).design;
  const svg = renderFlagSvg(design);
  assert.ok(svg.indexOf("#111111") < svg.indexOf("#222222"));
  assert.ok(svg.indexOf("#222222") < svg.indexOf("#333333"));
});

test("every shape, division and emblem (with presets) renders", () => {
  for (const s of [...shapeDefs.map((d) => d.id), ...shapePresets.map((p) => p.id)]) assert.match(renderFlagSvg(normalizeFlag({ shape: s, division: "horizontal_tricolor" }).design), /<path/);
  for (const d of [...divisionDefs.map((x) => x.id), ...divisionPresets.map((p) => p.id)]) {
    const result = normalizeFlag({ layers: [{ kind: "division", type: d }] });
    assert.equal(result.design.layers.length, 1, d);
    assert.doesNotMatch(renderFlagSvg(result.design), /NaN|undefined/, d);
  }
  for (const e of [...emblemDefs.map((x) => x.id), ...emblemPresets.map((p) => p.id)]) {
    const result = normalizeFlag({ layers: [{ kind: "emblem", type: e, outline: "black" }] });
    assert.equal(result.design.layers.length, 1, e);
    assert.doesNotMatch(renderFlagSvg(result.design), /NaN|undefined/, e);
  }
  const stats = catalogStats();
  assert.ok(stats.shapes + stats.divisions + stats.emblems + stats.library > 800);
});

test("library emblems resolve by keyword and embed their artwork", async () => {
  assert.equal(resolveAssetId("lion"), "gi:lion");
  assert.equal(resolveAssetId("crossed swords"), "gi:crossed-swords");
  assert.equal(resolveAssetId("national mexico"), "nat:mx");
  const design = normalizeFlag({ background: "red", emblems: [{ type: "eagle", color: "gold" }, "mexico coat of arms"] }).design;
  assert.equal(design.layers[0].type, "asset");
  await loadAssets(designAssets(design));
  const svg = renderFlagSvg(design);
  assert.match(svg, /<use/);
  assert.doesNotMatch(svg, /stroke-dasharray/);
});

test("national presets are valid and reference existing artwork", () => {
  const ids = new Set(assetIndex.map((a) => a.id));
  assert.ok(nationalFlagIds().length > 140);
  for (const id of nationalFlagIds()) {
    const design = nationalFlag(id)!;
    assert.deepEqual(validateStoredFlag(design), [], id);
    for (const asset of designAssets(design)) assert.ok(ids.has(asset), `${id} uses ${asset}`);
  }
  assert.deepEqual(libraryPool, assetIndex.map((a) => a.id), "automatic flags can select every bundled asset");
});

test("automatic flags draw from the full library rather than a fixed handful", () => {
  const selected = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    for (const asset of designAssets(generateFlag(`catalog:${i}`))) selected.add(asset);
  }
  assert.ok(selected.size > 200, `${selected.size} distinct assets`);
  assert.deepEqual(new Set([...selected].map((id) => id.split(":")[0])), new Set(["gi", "mdi", "fa", "nat"]));
});

test("random layouts fit their symbols to panels, arcs and nested crosses", () => {
  let arcs = 0, crosses = 0, maritime = 0;
  for (let i = 0; i < 700; i++) {
    const design = generateFlag(`composition:${i}`);
    assert.deepEqual(validateStoredFlag(design), [], `composition:${i}`);
    assert.ok(design.layers.length <= 4);
    const { body } = shapeInfo(design);
    const arc = design.layers.find((layer) => layer.type === "star" && layer.arrangement === "arc");
    if (arc) {
      arcs++;
      const mark = design.layers.find((layer) => layer.type === "asset")!;
      const stars = arrange(layerParams(arc), body, new Set(Object.keys(arc)));
      const [center] = arrange(layerParams(mark), body, new Set(Object.keys(mark)));
      assert.equal(stars.length, 5);
      assert.ok(stars.every((star) => star.y + star.size / 2 < center.y - center.size / 2), "arc clears its central mark");
      assert.ok(Math.abs(stars[0].x + stars.at(-1)!.x - 2 * center.x) < 0.01, "arc is centered on its mark");
    }
    for (const type of ["cross", "saltire"]) {
      const pair = design.layers.filter((layer) => layer.kind === "division" && layer.type === type);
      if (!pair.length) continue;
      crosses++;
      assert.equal(pair.length, 2, "crosses are deliberately nested");
      assert.ok(Number(pair[0].thickness) > Number(pair[1].thickness));
      assert.equal(pair[0].x ?? 0.5, pair[1].x ?? 0.5);
      assert.equal(pair[0].y ?? 0.5, pair[1].y ?? 0.5);
    }
    const asset = design.layers.find((layer) => layer.type === "asset");
    if (asset) {
      const meta = assetMeta(String(asset.asset))!;
      if (["nautical", "sea_life"].includes(meta.category)) {
        maritime++;
        assert.ok(design.layers.some((layer) => layer.type === "wavy_stripes"), "maritime emblems get a water motif");
      }
      if (meta.multicolor) {
        const stripes = design.layers.find((layer) => layer.type.endsWith("_stripes"));
        const field = (stripes?.colors as string[])[1];
        assert.ok(luminance(field) < 0.3, "full-color artwork sits on a dark field");
        assert.ok(typeof asset.outline === "string" && luminance(asset.outline) > 0.5, "fine artwork gets a light silhouette");
      }
    }
  }
  assert.ok(arcs > 20 && crosses > 50 && maritime > 0);
});

test("country remixes choose varied catalog symbols from their visual themes", () => {
  const known = new Set(assetIndex.map((a) => a.id));
  const samples = (id: string) => {
    const original = makeFlag(id), used = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const design = deriveFlag(original, `theme:${id}:${i}`, { inspiration: original, nationId: id });
      for (const asset of designAssets(design)) {
        assert.ok(known.has(asset), asset);
        assert.ok(!asset.startsWith("nat:") || original.layers.some((layer) => layer.asset === asset), `${id}: unrelated national arms`);
        used.add(asset);
      }
    }
    return used;
  };
  const usa = samples("USA"), canada = samples("CAN"), mexico = samples("MEX");
  assert.ok(usa.size >= 4 && usa.has("gi:eagle-emblem") && usa.has("gi:torch"));
  assert.ok(canada.has("gi:maple-leaf") && canada.has("mdi:leaf-maple"));
  assert.ok(mexico.has("gi:cactus") && mexico.has("gi:eagle-emblem"));
  assert.ok(!mexico.has("gi:sea-serpent"));
});

test("American remixes combine independent stripe and star arrangements, with symbolic alternatives", () => {
  const usa = makeFlag("USA");
  const layouts = new Set<string>(), stripeStyles = new Set<string>(), starPatterns = new Set<string>(), combinations = new Set<string>();
  let withoutStars = 0, withoutStripes = 0, eagle = 0;
  for (let i = 0; i < 160; i++) {
    const seed = `USA:${i}`;
    const child = deriveFlag(usa, seed, { inspiration: usa, nationId: "USA" });
    const stripe = child.layers.find((l) => l.type.endsWith("_stripes"));
    const star = child.layers.find((l) => l.type === "star");
    if (stripe) stripeStyles.add(stripe.type);
    if (star) starPatterns.add(String(star.arrangement));
    if (star && stripe) combinations.add(`${stripe.type}:${star.arrangement}`);
    if (!star) withoutStars++;
    if (!stripe) withoutStripes++;
    if (child.layers.some((l) => l.asset === "gi:eagle-emblem")) eagle++;
    assert.ok(child.layers.length <= 4, seed);
    assert.deepEqual(validateStoredFlag(child), [], seed);
    assert.notEqual(renderFlagSvg(child), renderFlagSvg(usa));
    assert.deepEqual(child, deriveFlag(usa, seed, { inspiration: usa, nationId: "USA" }));
    layouts.add(JSON.stringify(child));
  }
  assert.ok(layouts.size > 80);
  assert.ok(stripeStyles.size >= 4);
  assert.ok(starPatterns.size >= 8);
  assert.ok(combinations.size >= 12);
  assert.ok(withoutStars > 0 && withoutStripes > 0 && eagle > 0);
  assert.deepEqual(makeFlag("ZZZ"), makeFlag("ZZZ"));
});

test("themed remixes keep their marks readable and their layer count restrained", () => {
  const readability = (a: string, b: string) => {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  for (const id of ["USA", "CAN", "MEX", "ESP", "JPN", "TUR"]) {
    const original = makeFlag(id);
    const designs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const child = deriveFlag(original, `visual:${id}:${i}`, { inspiration: original, nationId: id });
      designs.add(JSON.stringify(child));
      assert.ok(child.layers.length <= 4, `${id}: uncluttered layers`);
      assert.deepEqual(validateStoredFlag(child), [], id);
      const { body } = shapeInfo(child);
      for (const layer of child.layers.filter((l) => l.kind === "emblem")) {
        const instances = arrange(layerParams(layer), body, new Set(Object.keys(layer)));
        assert.ok(instances.length <= 15, `${id}: no crowded symbol field`);
        assert.ok(instances.every((instance) => instance.size / body.h >= 0.045), `${id}: visible emblem`);
        assert.ok(instances.every((instance) => instance.x > body.x && instance.x < body.x + body.w && instance.y > body.y && instance.y < body.y + body.h), `${id}: on canvas`);
        if (layer.type === "star") {
          const panel = [...child.layers].reverse().find((l) => l.kind === "division" && (l.type === "solid" || l.type === "triangle"));
          const field = typeof panel?.color === "string" ? panel.color : child.background;
          assert.ok(readability(String(layer.color), field) >= 3, `${id}: contrast`);
        }
      }
    }
    assert.ok(designs.size > 10, `${id}: genuinely varied`);
  }
});

test("every national remix stays valid, distinct and grounded in its country's motif", () => {
  for (const id of nationalFlagIds()) {
    const parent = makeFlag(id), snapshot = structuredClone(parent);
    let child = parent;
    for (let i = 0; i < 8; i++) {
      const previous = child;
      child = deriveFlag(previous, `${id}:${i}`, { inspiration: parent, nationId: id });
      assert.deepEqual(child.shape, parent.shape, `${id}: shape`);
      assert.ok(flagColors(child).some((c) => flagColors(parent).includes(c)), `${id}: palette`);
      assert.deepEqual(validateStoredFlag(child), [], `${id}: valid save`);
      assert.ok(child.layers.length <= Math.max(4, parent.layers.length), `${id}: bounded layers`);
      const svg = renderFlagSvg(child, { idPrefix: "test" });
      assert.doesNotMatch(svg, /NaN|undefined/, id);
      assert.notEqual(svg, renderFlagSvg(previous, { idPrefix: "test" }), `${id}: changed layout at remix ${i}`);
    }
    assert.deepEqual(parent, snapshot, `${id}: input unchanged`);
  }
});

test("custom patterns and composite emblems survive without reviving hidden layers", () => {
  const parent = normalizeFlag({ background: "navy", layers: [
    { type: "pattern", motif: "waves", colors: ["navy", "blue"] },
    { type: "circle", color: "white", scale: 0.5 },
    { type: "asset", asset: "gi:anchor", color: "navy", scale: 0.3 },
    { type: "asset", asset: "gi:lion", hidden: true },
    { type: "star", opacity: 0 },
  ] }).design;
  const child = deriveFlag(parent, "custom");
  assert.deepEqual(child.layers.map((l) => l.type), ["pattern", "circle", "asset"]);
  assert.equal(child.layers[0].motif, "waves");
  assert.equal(child.layers[2].asset, "gi:anchor");
  const backing = layerParams(child.layers[1]), emblem = layerParams(child.layers[2]);
  assert.equal(backing.x, emblem.x);
  assert.equal(backing.y, emblem.y);
  assert.ok(Math.abs(Number(emblem.scale) / Number(backing.scale) - 0.6) < 0.0001);
});

test("layered Nordic crosses stay aligned and preserve their colored outlines", () => {
  const parent = makeFlag("NOR");
  const child = deriveFlag(parent, "nordic");
  const [outer, inner] = child.layers;
  assert.equal(outer.type, "full_cross");
  assert.equal(inner.type, "full_cross");
  assert.equal(outer.x, inner.x);
  assert.equal(outer.y, inner.y);
  assert.equal(Number(outer.thickness) / Number(inner.thickness), 2);
  assert.equal(outer.color, parent.layers[0].color);
  assert.equal(inner.color, parent.layers[1].color);
});

test("flags with no visible motifs still have a deterministic remix fallback", () => {
  const blank = normalizeFlag({ background: "navy", layers: [{ type: "star", hidden: true }] }).design;
  const child = deriveFlag(blank, "blank");
  assert.deepEqual(child, deriveFlag(blank, "blank"));
  assert.deepEqual(validateStoredFlag(child), []);
  assert.ok(child.layers.length > 0);
});

test("repeated remixes keep fixed patterns legible and support full-width custom emblems", () => {
  let flag = makeFlag("GBR");
  for (let i = 0; i < 30; i++) {
    flag = deriveFlag(flag, `repeat:${i}`);
    const area = layerParams(flag.layers[0]).area as { h: number };
    assert.ok(area.h >= 0.6, "the Union Jack must not shrink away");
  }
  for (const type of ["full_line", "border_line", "corner_square", "corner_triangle"]) {
    const parent = normalizeFlag({ background: "navy", layers: [{ type, color: "gold" }] }).design;
    const child = deriveFlag(parent, type);
    assert.equal(child.layers[0].type, type);
    assert.notEqual(renderFlagSvg(child, { idPrefix: "test" }), renderFlagSvg(parent, { idPrefix: "test" }));
    assert.deepEqual(validateStoredFlag(child), []);
  }
});

test("intricate flags keep fine separators and full-height ornaments at useful sizes", () => {
  let uzbekistan = makeFlag("UZB"), belarus = makeFlag("BLR"), cuba = makeFlag("CUB");
  for (let i = 0; i < 30; i++) {
    uzbekistan = deriveFlag(uzbekistan, `details:${i}`);
    belarus = deriveFlag(belarus, `details:${i}`);
    cuba = deriveFlag(cuba, `details:${i}`);
    for (const band of uzbekistan.layers.filter((l) => l.type === "band")) assert.ok(Number(band.width) < 0.04);
    assert.ok(Number(belarus.layers.find((l) => l.asset === "nat:by")?.scale) >= 0.85);
    assert.ok(Number(cuba.layers.find((l) => l.type === "star")?.scale) <= 0.3);
  }
});

test("legacy saves migrate and corrupt flags are rejected", () => {
  const legacy = { layout: "canton", colors: ["#b22234", "#ffffff", "#3c3b6e"], emblem: "stars", stripes: 13 };
  const migrated = flagSchema.parse(legacy);
  assert.equal(migrated.v, 2);
  assert.deepEqual(migrated.layers.map((l) => l.type), ["horizontal_stripes", "canton", "star"]);
  assert.deepEqual(migrateLegacy({ layout: "nordic", colors: ["#c60c30", "#ffffff"], emblem: "none" }).layers[0].type, "cross");
  assert.throws(() => flagSchema.parse({ ...legacy, colors: ["javascript:alert(1)"] }));
  assert.throws(() => flagSchema.parse({ v: 2, shape: { type: "rectangle" }, background: "#fff", layers: [] }));
  assert.throws(() => flagSchema.parse({ v: 2, shape: { type: "rectangle" }, background: "#ffffff", layers: [{ kind: "emblem", type: "star", color: "<script>" }] }));
});

test("AI output is normalized leniently and unusable flags are dropped", () => {
  const parsed = flagInputSchema.parse({ shape: "swallowtail", background: "navy", layers: [{ type: "nordic cross", color: "gold" }, { type: "not a real thing" }] });
  assert.equal(parsed?.shape.type, "tailed");
  assert.equal(parsed?.layers.length, 1);
  assert.equal(flagInputSchema.parse({ layers: [{ type: "zzzz" }] }), undefined);
});

test("offline descriptions and model guides cover the catalog", () => {
  const d = describeFlag("A vertical tricolor of green, white and red with a gold star in the center");
  assert.equal(d.layers[0].type, "vertical_stripes");
  assert.deepEqual(d.layers[0].colors, ["#009739", "#ffffff", "#d52b1e"]);
  assert.equal(d.layers[1].type, "star");
  assert.equal(d.layers[1].color, "#f1bf00");
  const guide = flagPromptGuide("full");
  for (const def of divisionDefs) assert.ok(guide.includes(def.id), def.id);
  assert.ok(flagPromptGuide("brief").length < 4000);
  assert.ok(JSON.stringify(flagCatalog()).length > 10000);
});

import fs from "node:fs/promises";
import { simplify, bbox } from "@turf/turf";
const base =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/";
await fs.mkdir("public/data/regions", { recursive: true });
async function source(name) {
  const response = await fetch(base + name + ".geojson");
  if (!response.ok) throw new Error(`Map download failed: ${response.status}`);
  return response.json();
}
const [world, regions] = await Promise.all([
  source("ne_50m_admin_0_countries"),
  source("ne_10m_admin_1_states_provinces"),
]);
const countries = world.features
  .filter((f) => f.properties.ADM0_A3 !== "ATA")
  .map((f) => {
    const p = f.properties;
    const simple = simplify(f, { tolerance: 0.035, highQuality: true });
    return {
      ...simple,
      id: p.ADM0_A3,
      properties: {
        id: p.ADM0_A3,
        name: p.ADMIN,
        short: p.NAME,
        iso:
          p.ADM0_A3 === "TWN"
            ? "TW"
            : p.ISO_A2 === "-99"
              ? p.ISO_A2_EH
              : p.ISO_A2,
        continent: p.CONTINENT,
        population: p.POP_EST,
        populationYear: p.POP_YEAR,
        gdp: p.GDP_MD,
        gdpYear: p.GDP_YEAR,
        center: [p.LABEL_Y, p.LABEL_X],
        bounds: bbox(simple),
      },
    };
  });
await fs.writeFile(
  "public/data/world.json",
  JSON.stringify({ type: "FeatureCollection", features: countries }),
);
const grouped = {};
for (const f of regions.features) {
  const p = f.properties,
    id = p.adm0_a3;
  if (!countries.some((c) => c.id === id)) continue;
  const simple = simplify(f, { tolerance: 0.025, highQuality: true });
  simple.properties = {
    id: p.adm1_code,
    name: p.name_en || p.name || p.name_local || p.adm1_code,
    country: id,
    type: p.type_en || "Region",
    population: null,
  };
  (grouped[id] ??= []).push(simple);
}
for (const [id, features] of Object.entries(grouped))
  await fs.writeFile(
    `public/data/regions/${id}.json`,
    JSON.stringify({ type: "FeatureCollection", features }),
  );
await fs.writeFile(
  "public/data/provenance.json",
  JSON.stringify(
    {
      source: base,
      version: "5.1.2",
      license: "Public domain",
      countries: countries.length,
      regions: regions.features.length,
      notes:
        "Generalized geographic baseline, not an authoritative 2026 border dataset. Population and GDP retain source reference years. Province demographic and ideological research is not included.",
    },
    null,
    2,
  ),
);
console.log(
  `Prepared ${countries.length} countries and regional maps for ${Object.keys(grouped).length} countries.`,
);

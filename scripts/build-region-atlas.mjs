import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../public/data/regions/", import.meta.url);
const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
const features = [];
for (const file of files) {
  const data = JSON.parse(await readFile(new URL(file, directory), "utf8"));
  features.push(...data.features);
}
const atlas = { type: "FeatureCollection", features };
await writeFile(new URL("../public/data/region-atlas.json", import.meta.url), JSON.stringify(atlas));
console.log(`Built region atlas: ${files.length} countries, ${features.length} regions.`);

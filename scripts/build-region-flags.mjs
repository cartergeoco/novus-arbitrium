import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = new URL("../public/", import.meta.url);
const atlas = JSON.parse(await readFile(new URL("data/region-atlas.json", root), "utf8"));

async function json(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Novus-Arbitrium-region-flags" } });
  if (!response.ok) throw Error(`${url}: ${response.status}`);
  return response.json();
}

const [source, commit] = await Promise.all([
  json("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson"),
  json("https://api.github.com/repos/amckenna41/iso3166-flags/commits/main"),
]);
const tree = await json(`https://api.github.com/repos/amckenna41/iso3166-flags/git/trees/${commit.sha}?recursive=1`);
if (!Array.isArray(tree.tree) || tree.truncated) throw Error("Flag repository tree is incomplete.");

const available = new Map(tree.tree
  .filter((item) => /^iso3166-2-flags\/[A-Z]{2}\/[A-Z]{2}-[A-Z0-9]+\.(svg|png|jpg|jpeg)$/i.test(item.path))
  .map((item) => [item.path.match(/([A-Z]{2}-[A-Z0-9]+)\./i)[1].toUpperCase(), item.path]));
const byId = new Map(source.features.map((feature) => [feature.properties.adm1_code, feature.properties.iso_3166_2]));
// Natural Earth leaves the subdivision code blank for several overseas holdings.
// Use the matching ISO 3166-2 code where the flag repository provides one.
const dependencyCodes = {
  PRI: "US-PR", GUM: "US-GU", ASM: "US-AS", MNP: "US-MP", VIR: "US-VI",
  NCL: "FR-NC", PYF: "FR-PF", SPM: "FR-PM", WLF: "FR-WF", MAF: "FR-MF",
  BLM: "FR-BL", ATF: "FR-TF", REU: "FR-974", MYT: "FR-976",
  GLP: "FR-971", MTQ: "FR-972",
  ABW: "NL-AW", CUW: "NL-CW", SXM: "NL-SX",
  HKG: "CN-HK", MAC: "CN-MO",
};
const flags = {};
const codes = {};
const assets = new Map();
for (const feature of atlas.features) {
  const id = feature.properties.id;
  const naturalCode = byId.get(id);
  if (naturalCode && /^[A-Z]{2}-[A-Z0-9]+$/.test(naturalCode)) codes[id] = naturalCode;
  const fallback = dependencyCodes[feature.properties.country];
  const code = available.has(naturalCode) ? naturalCode : fallback;
  const sourcePath = available.get(code);
  if (!sourcePath) continue;
  codes[id] = code;
  flags[id] = `/flags/regions/${code}.webp`;
  assets.set(code, sourcePath);
}

const destination = new URL("flags/regions/", root);
await mkdir(destination, { recursive: true });
const queue = [...assets];
let completed = 0;
let failures = [];
async function fetchFlag(sourcePath) {
  const url = `https://raw.githubusercontent.com/amckenna41/iso3166-flags/${commit.sha}/${sourcePath}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 2) throw Error(`${sourcePath}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }
}
async function resizeFlag(input, sourcePath) {
  const render = (buffer) => sharp(buffer, { density: 144 })
    .resize({ width: 120, height: 80, fit: "inside" })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
  try {
    return await render(input);
  } catch (error) {
    if (!sourcePath.endsWith(".svg") || !/pixel limit/.test(error.message)) throw error;
    const svg = input.toString("utf8");
    const viewBox = svg.match(/\bviewBox="[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/);
    if (!viewBox) throw error;
    const ratio = Number(viewBox[1]) / Number(viewBox[2]);
    const width = ratio >= 1 ? 120 : Math.round(120 * ratio);
    const height = ratio >= 1 ? Math.round(120 / ratio) : 120;
    const compact = svg.replace(/(<svg\b[^>]*?)\bwidth="[^"]+"/, `$1width="${width}px"`)
      .replace(/(<svg\b[^>]*?)\bheight="[^"]+"/, `$1height="${height}px"`);
    return render(Buffer.from(compact));
  }
}
async function worker() {
  while (queue.length) {
    const [code, sourcePath] = queue.pop();
    const file = new URL(`${code}.webp`, destination);
    try {
      const existing = await stat(file).catch(() => null);
      if (!existing?.size) {
        const input = await fetchFlag(sourcePath);
        const output = await resizeFlag(input, sourcePath);
        await writeFile(file, output);
      }
    } catch (error) {
      failures.push(`${code}: ${error.message}`);
    }
    completed++;
    if (completed % 200 === 0) console.log(`Prepared ${completed}/${assets.size} ISO 3166-2 flags`);
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
if (failures.length) throw Error(`${failures.length} flags could not be prepared:\n${failures.slice(0, 20).join("\n")}`);
await writeFile(new URL("data/region-flags.json", root), JSON.stringify({ flags, codes }));
await writeFile(new URL("flags/regions/README.md", root), `Display-size derivatives of ISO 3166-2 flags from https://github.com/amckenna41/iso3166-flags at commit ${commit.sha}. Regenerate with npm run flag:regions.\n`);
console.log(`Mapped ${Object.keys(codes).length} ISO 3166-2 codes; prepared ${assets.size} local flags.`);

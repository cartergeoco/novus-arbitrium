// Flag engine command line.
//
//   npx tsx scripts/flag.ts render design.json [out.svg]   render a design (loose or strict JSON) to SVG
//   npx tsx scripts/flag.ts render '{"division":"nordic_cross"}' out.svg
//   npx tsx scripts/flag.ts describe "green flag with a white crescent" out.svg
//   npx tsx scripts/flag.ts normalize design.json            print the canonical design and any issues
//   npx tsx scripts/flag.ts catalog > catalog.json           machine-readable component catalog
//   npx tsx scripts/flag.ts guide [brief|full]              instructions for language models
//   npx tsx scripts/flag.ts sheet out.html [national|divisions|emblems|shapes|library]  visual contact sheet
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  assetIndex, describeFlag, designAssets, divisionDefs, divisionPresets, emblemDefs, emblemPresets, flagCatalog,
  flagPromptGuide, loadAssets, nationalFlag, nationalFlagIds, normalizeFlag, renderFlagSvg, shapeDefs, shapePresets,
  type FlagDesign,
} from "../lib/flag";

const [command, arg, out, extra] = process.argv.slice(2);
const read = (value: string) => (existsSync(value) ? readFileSync(value, "utf8") : value);
const emit = (text: string, file?: string) => (file ? writeFileSync(file, text) : process.stdout.write(text + "\n"));

async function svgOf(design: FlagDesign, title?: string) {
  await loadAssets(designAssets(design));
  return renderFlagSvg(design, { width: 240, title });
}

function sample(kind: "division" | "emblem", type: string, params: Record<string, unknown> = {}): FlagDesign {
  const layers = kind === "division"
    ? [{ kind, type, colors: ["#0055a4", "#ffffff", "#d52b1e", "#f1bf00", "#009739"], color: "#0a3161", ...params }]
    : [{ kind, type, color: "#f1bf00", colors: ["#d52b1e", "#ffffff"], ...params }];
  return normalizeFlag({ shape: "rectangle_standard", background: kind === "division" ? "#f1bf00" : "#0a3161", layers }).design;
}

async function sheet(section = "national") {
  const items: [string, FlagDesign][] = [];
  if (section === "national") for (const id of nationalFlagIds()) items.push([id, nationalFlag(id)!]);
  if (section === "divisions") {
    for (const d of divisionDefs) items.push([d.id, sample("division", d.id)]);
    for (const p of divisionPresets) items.push([p.id, sample("division", p.id)]);
  }
  if (section === "emblems") {
    for (const e of emblemDefs) items.push([e.id, sample("emblem", e.id)]);
    for (const p of emblemPresets) items.push([p.id, sample("emblem", p.id)]);
  }
  if (section === "shapes") {
    for (const s of shapeDefs) items.push([s.id, normalizeFlag({ shape: s.id, division: "horizontal_tricolor" }).design]);
    for (const s of shapePresets) items.push([s.id, normalizeFlag({ shape: s.id, division: "horizontal_tricolor" }).design]);
  }
  if (section === "library") for (const a of assetIndex) items.push([a.id, normalizeFlag({ background: "#1d3a5f", layers: [{ kind: "emblem", type: "asset", asset: a.id, color: "#f1bf00", scale: 0.8 }] }).design]);
  const cells = await Promise.all(items.map(async ([label, design]) => `<figure>${await svgOf(design, label)}<figcaption>${label}</figcaption></figure>`));
  return `<!doctype html><meta charset="utf-8"><title>${section}</title><style>body{background:#222;color:#ddd;font:11px sans-serif;display:flex;flex-wrap:wrap;gap:10px;padding:10px}figure{margin:0;width:240px}svg{display:block;background:repeating-conic-gradient(#333 0 25%,#2a2a2a 0 50%) 0 0/12px 12px}figcaption{padding:3px 0}</style>${cells.join("")}`;
}

async function main() {
  switch (command) {
    case "render": {
      const result = normalizeFlag(JSON.parse(read(arg)));
      if (result.issues.length) console.error(result.issues.join("\n"));
      return emit(await svgOf(result.design), out);
    }
    case "describe": return emit(await svgOf(describeFlag(arg)), out);
    case "normalize": {
      const result = normalizeFlag(JSON.parse(read(arg)));
      return emit(JSON.stringify(result, null, 2));
    }
    case "catalog": return emit(JSON.stringify(flagCatalog(), null, 2), arg);
    case "guide": return emit(flagPromptGuide(arg === "brief" ? "brief" : "full"));
    case "sheet": return emit(await sheet(out ?? extra), arg);
    default:
      console.error("Commands: render, describe, normalize, catalog, guide, sheet");
      process.exitCode = 1;
  }
}

main();

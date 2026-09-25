"use client";
/* eslint-disable @next/next/no-img-element -- previews are generated SVG data URIs */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useFlagImage } from "../Flag";
import {
  assetCategories, assetCredits, assetIndex, assetVersion, divisionDefs, divisionPresets, emblemDefs, emblemPresets, getAsset,
  loadAssetChunk, nationalFlag, nationalFlagIds, normalizeFlag, searchAssets, shapeDefs, shapePresets, subscribeAssets,
  type FlagDesign, type LayerKind,
} from "@/lib/flag";

export type PickItem = { id: string; label: string; category: string; description?: string };

function Thumb({ design }: { design: FlagDesign }) {
  return <img src={useFlagImage(design)} alt="" draggable={false} />;
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="fc-search">
      <MagnifyingGlass />
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
    </label>
  );
}

function Chips({ options, value, onChange }: { options: { id: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fc-chips" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={value === o.id ? "active" : ""} onClick={() => onChange(o.id)}>
          {o.label}{o.count !== undefined && <small>{o.count}</small>}
        </button>
      ))}
    </div>
  );
}

const matches = (item: PickItem, q: string) => !q || `${item.id} ${item.label} ${item.category} ${item.description ?? ""}`.toLowerCase().includes(q.toLowerCase());

/** Grid of divisions or emblems (base types and presets) previewed in the flag's own colors. */
export function ComponentPicker({ kind, palette, onPick }: { kind: LayerKind; palette: string[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const items: PickItem[] = useMemo(() => kind === "division"
    ? [...divisionDefs.map((d) => ({ id: d.id, label: d.label, category: d.category, description: d.description })), ...divisionPresets.map((p) => ({ id: p.id, label: p.label, category: p.category ?? "Presets" }))]
    : [...emblemDefs.filter((e) => e.id !== "asset").map((e) => ({ id: e.id, label: e.label, category: e.category, description: e.description })), ...emblemPresets.map((p) => ({ id: p.id, label: p.label, category: p.category ?? "Presets" }))], [kind]);
  const categories = useMemo(() => ["All", ...new Set(items.map((i) => i.category))].map((c) => ({ id: c, label: c })), [items]);
  const [a = "#0055a4", b = "#ffffff", c = "#d52b1e", d = "#f1bf00"] = palette;
  const shown = items.filter((i) => (category === "All" || i.category === category) && matches(i, query));
  const sample = (id: string) => kind === "division"
    ? normalizeFlag({ background: d === a ? b : d, layers: [{ kind, type: id, colors: [a, b, c, d], color: a }] }).design
    : normalizeFlag({ background: a, layers: [{ kind, type: id, color: b === a ? d : b, colors: [c, d] }] }).design;
  return (
    <div className="fc-picker">
      <SearchBar value={query} onChange={setQuery} placeholder={`Search ${items.length} ${kind === "division" ? "divisions" : "emblems"}`} />
      <Chips options={categories} value={category} onChange={setCategory} />
      <div className="fc-grid">
        {shown.map((item) => (
          <button key={item.id} type="button" className="fc-tile" title={item.description ?? item.id} onClick={() => onPick(item.id)}>
            <Thumb design={sample(item.id)} />
            <span>{item.label}</span>
          </button>
        ))}
        {!shown.length && <p className="fc-empty">No matches. Library emblems are under Library.</p>}
      </div>
    </div>
  );
}

export function ShapePicker({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const items: PickItem[] = [
    ...shapeDefs.map((s) => ({ id: s.id, label: s.label, category: s.category, description: s.description })),
    ...shapePresets.map((p) => ({ id: p.id, label: p.label, category: p.category ?? "Presets", description: p.description })),
  ];
  const shown = items.filter((i) => matches(i, query));
  return (
    <div className="fc-picker">
      <SearchBar value={query} onChange={setQuery} placeholder={`Search ${items.length} shapes and proportions`} />
      <div className="fc-grid compact">
        {shown.map((item) => (
          <button key={item.id} type="button" className={`fc-tile ${current === item.id ? "active" : ""}`} title={item.description} onClick={() => onPick(item.id)}>
            <Thumb design={normalizeFlag({ shape: item.id, background: "#c9c4b6" }).design} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function iconUri(id: string) {
  const asset = getAsset(id);
  if (!asset) return undefined;
  const [x, y, w, h] = asset.viewBox;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"><g color="#e8e4d8">${asset.body}</g></svg>`);
}

/** Browse and search the SVG emblem library by category. */
export function LibraryPicker({ onPick }: { onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(assetCategories[0].id);
  useSyncExternalStore(subscribeAssets, assetVersion, assetVersion);
  const shown = query.trim() ? searchAssets(query, { limit: assetIndex.length }) : assetIndex.filter((a) => a.category === category);
  const chunkKey = [...new Set(shown.map((a) => a.chunk))].join(",");
  useEffect(() => { chunkKey.split(",").filter(Boolean).forEach((c) => void loadAssetChunk(c)); }, [chunkKey]);
  const categories = assetCategories.map((c) => ({ ...c, count: assetIndex.filter((a) => a.category === c.id).length })).filter((c) => c.count);
  return (
    <div className="fc-picker">
      <SearchBar value={query} onChange={setQuery} placeholder={`Search ${assetIndex.length} library emblems (lion, crown, wheat, Mexico…)`} />
      {!query.trim() && <Chips options={categories} value={category} onChange={setCategory} />}
      <div className="fc-grid icons">
        {shown.map((a) => {
          const uri = iconUri(a.id);
          return (
            <button key={a.id} type="button" className="fc-tile" title={`${a.name} (${a.id})`} onClick={() => onPick(a.id)}>
              {uri ? <img src={uri} alt="" draggable={false} /> : <span className="fc-loading" />}
              <span>{a.name}</span>
            </button>
          );
        })}
        {!shown.length && <p className="fc-empty">No library emblems match “{query}”.</p>}
      </div>
      <p className="fc-credits">
        Artwork: {assetCredits.map((c, i) => <span key={c.source}>{i > 0 && " · "}<a href={c.url} target="_blank" rel="noreferrer">{c.name}</a> ({c.authors}, {c.license})</span>)}
      </p>
    </div>
  );
}

export function TemplatePicker({ onPick }: { onPick: (design: FlagDesign) => void }) {
  const [query, setQuery] = useState("");
  const ids = nationalFlagIds().filter((id) => id.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="fc-picker">
      <SearchBar value={query} onChange={setQuery} placeholder={`Start from one of ${nationalFlagIds().length} national designs (code, e.g. JPN)`} />
      <div className="fc-grid compact">
        {ids.map((id) => {
          const design = nationalFlag(id)!;
          return (
            <button key={id} type="button" className="fc-tile" onClick={() => onPick(design)}>
              <Thumb design={design} />
              <span>{id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

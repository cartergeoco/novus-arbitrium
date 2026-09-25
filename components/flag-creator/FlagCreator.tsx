"use client";
/* eslint-disable @next/next/no-img-element -- previews are generated SVG data URIs */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise, ArrowCounterClockwise, BookOpen, CaretDown, CaretUp, Code, Copy, DownloadSimple, Eye, EyeSlash,
  FlagBanner, Palette, Plus, Shapes, Shuffle, Sparkle, Star, Trash, Globe, Stack,
} from "@phosphor-icons/react";
import { useFlagImage } from "../Flag";
import { ColorPicker } from "../ColorPicker";
import { ParamSection } from "./ParamFields";
import { ComponentPicker, LibraryPicker, ShapePicker, TemplatePicker } from "./Pickers";
import {
  assetMeta, catalogStats, deriveFlag, describeFlag, designAssets, divisionById, divisionCommon, emblemById, emblemCommon,
  flagColors, flagPalette, generateFlag, layerLabel, layerParams, loadAssets, MAX_LAYERS, normalizeFlag, normalizeLayer,
  normalizeShape, renderFlagSvg, resolveParams, shapeById, shapeInfo, shapePresetById,
  type FlagDesign, type FlagLayer, type LayerKind, type ParamDef,
} from "@/lib/flag";

export type FlagAI = { provider: string; key?: string; model: string; temperature: number; maxTokens: number };

type Panel =
  | { kind: "layer"; index: number }
  | { kind: "shape" }
  | { kind: "add"; layer: LayerKind; replace?: number }
  | { kind: "library"; replace?: number }
  | { kind: "templates" }
  | { kind: "code" }
  | { kind: "describe" };

const placement = ["x", "y", "scale", "rotation", "mirror", "flip", "opacity"];
const pick = (defs: ParamDef[], keys: string[]) => keys.map((k) => defs.find((d) => d.key === k)).filter(Boolean) as ParamDef[];

function LayerThumb({ layer, design }: { layer: FlagLayer; design: FlagDesign }) {
  const solo = useMemo<FlagDesign>(() => ({ ...design, background: layer.kind === "emblem" ? "#3a3a3a" : "#ffffff", layers: [{ ...layer, hidden: false }] }), [layer, design]);
  return <img src={useFlagImage(solo)} alt="" draggable={false} />;
}

export default function FlagCreator({ value, onChange, ai, inspiration, nationId }: { value: FlagDesign; onChange: (design: FlagDesign) => void; ai?: FlagAI; inspiration?: FlagDesign; nationId?: string }) {
  const [panel, setPanel] = useState<Panel>(value.layers.length ? { kind: "layer", index: value.layers.length - 1 } : { kind: "add", layer: "division" });
  const [past, setPast] = useState<FlagDesign[]>([]);
  const [future, setFuture] = useState<FlagDesign[]>([]);
  const lastMerge = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const src = useFlagImage(value);
  const recent = useMemo(() => flagColors(value), [value]);
  const stats = useMemo(() => catalogStats(), []);

  const commit = useCallback((next: FlagDesign, mergeKey?: string) => {
    const now = Date.now();
    const merge = mergeKey && lastMerge.current.key === mergeKey && now - lastMerge.current.at < 900;
    lastMerge.current = { key: mergeKey ?? "", at: now };
    if (!merge) setPast((p) => [...p.slice(-80), value]);
    setFuture([]);
    onChange(next);
  }, [onChange, value]);
  const undo = () => { const prev = past.at(-1); if (!prev) return; setPast(past.slice(0, -1)); setFuture([value, ...future]); onChange(prev); };
  const redo = () => { const next = future[0]; if (!next) return; setFuture(future.slice(1)); setPast([...past, value]); onChange(next); };

  const setLayers = (layers: FlagLayer[], mergeKey?: string) => commit({ ...value, layers }, mergeKey);
  const updateLayer = (index: number, key: string, v: unknown) =>
    setLayers(value.layers.map((l, i) => (i === index ? { ...l, [key]: v } as FlagLayer : l)), `${index}:${key}`);
  const addLayer = (layer: FlagLayer | undefined, replace?: number) => {
    if (!layer) return;
    if (replace !== undefined) {
      const old = value.layers[replace];
      const keep = Object.fromEntries(Object.entries(old).filter(([k]) => ["x", "y", "scale", "color", "colors", "area", "rotation", "mirror", "id"].includes(k)));
      const merged = normalizeLayer({ ...keep, ...layer, kind: layer.kind }) ?? layer;
      setLayers(value.layers.map((l, i) => (i === replace ? merged : l)));
      setPanel({ kind: "layer", index: replace });
      return;
    }
    if (value.layers.length >= MAX_LAYERS) return;
    setLayers([...value.layers, layer]);
    setPanel({ kind: "layer", index: value.layers.length });
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.layers.length) return;
    const layers = [...value.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    setLayers(layers);
    setPanel({ kind: "layer", index: target });
  };
  const remove = (index: number) => {
    setLayers(value.layers.filter((_, i) => i !== index));
    setPanel(value.layers.length > 1 ? { kind: "layer", index: Math.max(0, index - 1) } : { kind: "add", layer: "division" });
  };

  const selected = panel.kind === "layer" ? value.layers[panel.index] : undefined;
  const movable = selected?.kind === "emblem";
  const dragging = useRef(false);
  const placeAt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!movable || panel.kind !== "layer") return;
    const img = e.currentTarget.querySelector("img")!.getBoundingClientRect();
    const { body } = shapeInfo(value);
    const cx = ((e.clientX - img.left) / img.width) * 200, cy = ((e.clientY - img.top) / img.height) * 100;
    const x = Math.round(((cx - body.x) / body.w) * 1000) / 1000, y = Math.round(((cy - body.y) / body.h) * 1000) / 1000;
    setLayers(value.layers.map((l, i) => (i === panel.index ? { ...l, x, y } : l)), `${panel.index}:drag`);
  };

  const exportSvg = async () => {
    await loadAssets(designAssets(value));
    const blob = new Blob([renderFlagSvg(value, { width: 1200 })], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "flag.svg" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flag-creator">
      <div className="fc-stage-wrap">
        <div
          className={`fc-stage ${movable ? "placing" : ""}`}
          onPointerDown={(e) => { if (!movable) return; dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); placeAt(e); }}
          onPointerMove={(e) => dragging.current && placeAt(e)}
          onPointerUp={() => { dragging.current = false; }}
        >
          <img src={src} alt="Flag preview" draggable={false} />
        </div>
        <div className="fc-toolbar">
          <button type="button" className="icon-button" onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo"><ArrowCounterClockwise /></button>
          <button type="button" className="icon-button" onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo"><ArrowClockwise /></button>
          <span className="fc-sep" />
          <button type="button" className="subtle-button" onClick={() => { const next = deriveFlag(value, crypto.randomUUID(), { inspiration, nationId }); commit(next); setPanel(next.layers.length ? { kind: "layer", index: next.layers.length - 1 } : { kind: "shape" }); }} title="Reimagine this country's colors, symbols and patterns"><Shuffle /> Remix</button>
          <button type="button" className="subtle-button" onClick={() => commit(generateFlag(crypto.randomUUID()))} title="Create a flag with coordinated symbols and layout"><Palette /> Random</button>
          <button type="button" className="subtle-button" onClick={() => setPanel({ kind: "describe" })}><Sparkle /> Describe</button>
          <button type="button" className="subtle-button" onClick={() => setPanel({ kind: "templates" })}><Globe /> Templates</button>
          <button type="button" className="subtle-button" onClick={() => setPanel({ kind: "code" })}><Code /> Code</button>
          <button type="button" className="subtle-button" onClick={exportSvg}><DownloadSimple /> SVG</button>
        </div>
        <p className="fc-hint">Remix draws on this nation’s colors and symbols. Patterns and emblems can change.</p>
        {movable && <p className="fc-hint">Click or drag on the flag to move the selected emblem.</p>}
      </div>

      <div className="fc-body">
        <aside className="fc-layers" aria-label="Layers">
          <div className="fc-add">
            <button type="button" className="outline-button" onClick={() => setPanel({ kind: "add", layer: "division" })}><Stack /> Division</button>
            <button type="button" className="outline-button" onClick={() => setPanel({ kind: "add", layer: "emblem" })}><Star /> Emblem</button>
            <button type="button" className="outline-button" onClick={() => setPanel({ kind: "library" })}><BookOpen /> Library</button>
          </div>
          <p className="fc-order">Top of the list is drawn on top</p>
          <ol>
            {value.layers.map((layer, index) => ({ layer, index })).reverse().map(({ layer, index }) => (
              <li key={index} className={panel.kind === "layer" && panel.index === index ? "active" : ""}>
                <button type="button" className="fc-layer-main" onClick={() => setPanel({ kind: "layer", index })}>
                  <LayerThumb layer={layer} design={value} />
                  <span><strong>{layer.type === "asset" ? assetMeta(String(layer.asset))?.name ?? layerLabel(layer) : (layer.kind === "division" ? divisionById : emblemById).get(layer.type)?.label ?? layerLabel(layer)}</strong><small>{layer.kind}</small></span>
                </button>
                <div className="fc-layer-actions">
                  <button type="button" className="icon-button" aria-label={layer.hidden ? "Show layer" : "Hide layer"} onClick={() => setLayers(value.layers.map((l, i) => {
                    if (i !== index) return l;
                    const { hidden, ...rest } = l;
                    return (hidden ? rest : { ...rest, hidden: true }) as FlagLayer;
                  }))}>{layer.hidden ? <EyeSlash /> : <Eye />}</button>
                  <button type="button" className="icon-button" aria-label="Move up" disabled={index === value.layers.length - 1} onClick={() => move(index, 1)}><CaretUp /></button>
                  <button type="button" className="icon-button" aria-label="Move down" disabled={index === 0} onClick={() => move(index, -1)}><CaretDown /></button>
                  <button type="button" className="icon-button" aria-label="Duplicate layer" disabled={value.layers.length >= MAX_LAYERS} onClick={() => { const layers = [...value.layers]; layers.splice(index + 1, 0, structuredClone(layer)); setLayers(layers); setPanel({ kind: "layer", index: index + 1 }); }}><Copy /></button>
                  <button type="button" className="icon-button" aria-label="Delete layer" onClick={() => remove(index)}><Trash /></button>
                </div>
              </li>
            ))}
          </ol>
          <div className="fc-base">
            <div className="fc-base-row"><span>Background</span><ColorPicker label="Background" value={value.background} palette={flagPalette} recent={recent} onChange={(c) => commit({ ...value, background: c }, "background")} /></div>
            <button type="button" className={`fc-base-row fc-shape-button ${panel.kind === "shape" ? "active" : ""}`} onClick={() => setPanel({ kind: "shape" })}>
              <span><Shapes /> Shape</span><strong>{shapeById.get(value.shape.type)?.label}</strong>
            </button>
          </div>
        </aside>

        <section className="fc-panel">
          {panel.kind === "layer" && !selected && <p className="fc-empty">Select a layer, or add a division or emblem.</p>}
          {panel.kind === "layer" && selected && <LayerInspector layer={selected} index={panel.index} recent={recent}
            onChange={(k, v) => updateLayer(panel.index, k, v)}
            onReplace={() => setPanel(selected.type === "asset" ? { kind: "library", replace: panel.index } : { kind: "add", layer: selected.kind, replace: panel.index })} />}
          {panel.kind === "shape" && <ShapePanel design={value} recent={recent} onChange={(shape, key) => commit({ ...value, shape }, key)} />}
          {panel.kind === "add" && (
            <>
              <h3>{panel.replace !== undefined ? "Change type" : `Add ${panel.layer}`} <small>{panel.layer === "division" ? stats.divisions : stats.emblems} options</small></h3>
              <ComponentPicker kind={panel.layer} palette={recent} onPick={(id) => addLayer(normalizeLayer({ kind: panel.layer, type: id, ...(panel.layer === "emblem" && panel.replace === undefined ? { color: recent.find((c) => c !== value.background) ?? "#ffffff" } : {}) }), panel.replace)} />
            </>
          )}
          {panel.kind === "library" && (
            <>
              <h3>{panel.replace !== undefined ? "Choose library emblem" : "Add from library"} <small>{stats.library} SVG emblems</small></h3>
              <LibraryPicker onPick={(asset) => addLayer(normalizeLayer({ kind: "emblem", type: "asset", asset, scale: 0.5, color: recent.find((c) => c !== value.background) ?? "#ffffff" }), panel.replace)} />
            </>
          )}
          {panel.kind === "templates" && (<><h3>Templates</h3><TemplatePicker onPick={(d) => { commit(d); setPanel({ kind: "layer", index: d.layers.length - 1 }); }} /></>)}
          {panel.kind === "code" && <CodePanel design={value} onApply={(d) => commit(d)} />}
          {panel.kind === "describe" && <DescribePanel design={value} ai={ai} onApply={(d) => { commit(d); setPanel(d.layers.length ? { kind: "layer", index: d.layers.length - 1 } : { kind: "shape" }); }} />}
        </section>
      </div>
    </div>
  );
}

function LayerInspector({ layer, index, recent, onChange, onReplace }: { layer: FlagLayer; index: number; recent: string[]; onChange: (key: string, value: unknown) => void; onReplace: () => void }) {
  const def = layer.kind === "division" ? divisionById.get(layer.type) : emblemById.get(layer.type);
  if (!def) return <p className="fc-empty">Unknown layer type {layer.type}.</p>;
  const p = layerParams(layer);
  const meta = layer.type === "asset" ? assetMeta(String(layer.asset)) : undefined;
  const common = layer.kind === "division" ? divisionCommon : emblemCommon;
  const sections: [string, ParamDef[]][] = layer.kind === "division"
    ? [[def.label, def.params], ["Area", common]]
    : [
      ["Colors", pick(common, ["color", "colors"])],
      [def.label, def.params.filter((d) => d.type !== "asset")],
      ["Placement", pick(common, def.span ? ["x", "y", "opacity"] : placement)],
      ["Outline", pick(common, ["outline", "outlineWidth"])],
      ["Arrangement", def.span ? [] : common.filter((d) => d.group === "Arrangement")],
    ];
  return (
    <div className="fc-inspector" key={index}>
      <header>
        <div>
          <h3>{meta?.name ?? def.label}</h3>
          <p>{meta ? `${meta.category.replace(/_/g, " ")} · ${meta.id}` : def.description}</p>
        </div>
        <button type="button" className="outline-button" onClick={onReplace}>{layer.type === "asset" ? "Choose emblem" : "Change type"}</button>
      </header>
      {sections.map(([title, defs]) => <ParamSection key={title} title={title} defs={defs} params={p} recent={recent} onChange={onChange} onPickAsset={onReplace} assetName={meta?.name} />)}
      <label className="fc-field">
        <span className="fc-field-label">Layer id</span>
        <input value={String(layer.id ?? "")} maxLength={40} placeholder="optional handle for tools" onChange={(e) => onChange("id", e.target.value.replace(/[^\w-]/g, "") || undefined)} />
      </label>
    </div>
  );
}

function ShapePanel({ design, recent, onChange }: { design: FlagDesign; recent: string[]; onChange: (shape: FlagDesign["shape"], key?: string) => void }) {
  const def = shapeById.get(design.shape.type)!;
  const params = resolveParams(def.params, design.shape);
  const current = [...shapePresetById.values()].find((p) => p.base === def.id && Object.entries(p.params).every(([k, v]) => design.shape[k] === v))?.id ?? def.id;
  return (
    <div className="fc-inspector">
      <header><div><h3>Shape · {def.label}</h3><p>{def.description} The exported canvas stays 2:1.</p></div></header>
      <ParamSection title="Proportions" defs={def.params} params={params} recent={recent} onChange={(k, v) => onChange({ ...design.shape, [k]: v } as FlagDesign["shape"], `shape:${k}`)} />
      <ShapePicker current={current} onPick={(id) => onChange(normalizeShape(id))} />
    </div>
  );
}

function CodePanel({ design, onApply }: { design: FlagDesign; onApply: (d: FlagDesign) => void }) {
  const [text, setText] = useState(() => JSON.stringify(design, null, 2));
  const [issues, setIssues] = useState<string[]>([]);
  return (
    <div className="fc-inspector">
      <header><div><h3>Design code</h3><p>Plain JSON, the same format the AI uses. Loose input such as {`{"division":"nordic_cross","emblem":"lion"}`} is accepted.</p></div></header>
      <textarea className="fc-code" value={text} spellCheck={false} onChange={(e) => setText(e.target.value)} />
      <div className="fc-row">
        <button type="button" className="primary-button" onClick={() => {
          try {
            const result = normalizeFlag(JSON.parse(text));
            setIssues(result.issues);
            if (result.ok) { onApply(result.design); setText(JSON.stringify(result.design, null, 2)); }
          } catch { setIssues(["That is not valid JSON."]); }
        }}>Apply</button>
        <button type="button" className="outline-button" onClick={() => setText(JSON.stringify(design, null, 2))}>Reload current</button>
        <button type="button" className="outline-button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(design))}><Copy /> Copy</button>
      </div>
      {issues.length > 0 && <ul className="fc-issues">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
    </div>
  );
}

function DescribePanel({ design, ai, onApply }: { design: FlagDesign; ai?: FlagAI; onApply: (d: FlagDesign) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [modify, setModify] = useState(false);
  const run = async () => {
    if (!ai) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/flag", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ai, description: text, current: modify ? design : undefined }),
      });
      const data = await response.json() as { design?: FlagDesign; issues?: string[]; error?: string };
      if (!response.ok || !data.design) throw Error(data.error || "The model did not return a flag.");
      await loadAssets(designAssets(data.design));
      onApply(data.design);
      setMessage(data.issues?.length ? `Applied with adjustments: ${data.issues.slice(0, 3).join(" ")}` : "Applied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fc-inspector">
      <header><div><h3>Describe a flag</h3><p>The AI picks shapes, divisions and emblems from the library and configures them. Quick build uses built-in rules and works offline.</p></div></header>
      <textarea className="fc-describe" value={text} maxLength={800} placeholder="e.g. A dark green swallowtail with an off-center white Nordic cross fimbriated in gold, and an eight-pointed gold star in the upper fly" onChange={(e) => setText(e.target.value)} />
      <label className="fc-check"><input type="checkbox" checked={modify} onChange={(e) => setModify(e.target.checked)} /> Modify the current design instead of starting over</label>
      <div className="fc-row">
        <button type="button" className="primary-button" disabled={!ai || busy || !text.trim()} onClick={run} title={ai ? undefined : "Add an API key and model in Settings → API"}>
          <Sparkle /> {busy ? "Designing…" : "Generate with AI"}
        </button>
        <button type="button" className="outline-button" disabled={!text.trim()} onClick={() => { onApply(describeFlag(text)); setMessage("Built from keywords."); }}><FlagBanner /> Quick build</button>
      </div>
      {!ai && <p className="fc-hint">Connect a model in Settings → API to use AI generation.</p>}
      {message && <p className="fc-hint" role="status">{message}</p>}
      <p className="fc-hint"><Plus weight="bold" /> Tip: name library emblems directly (“a gold lion rampant”, “crossed swords”, “Albanian eagle”).</p>
    </div>
  );
}

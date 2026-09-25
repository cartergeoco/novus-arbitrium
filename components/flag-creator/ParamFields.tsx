"use client";
import { Minus, Plus } from "@phosphor-icons/react";
import { Choice } from "../Settings";
import { ColorPicker } from "../ColorPicker";
import { flagPalette, isParamVisible, namedAreas, type Area, type ParamDef, type Params } from "@/lib/flag";

const pretty = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const round = (n: number) => Math.round(n * 1000) / 1000;

function NumberField({ def, value, onChange }: { def: Extract<ParamDef, { type: "number" | "int" }>; value: number; onChange: (v: number) => void }) {
  const step = def.type === "int" ? 1 : "step" in def && def.step ? def.step : 0.01;
  const rangeMax = def.type === "int" ? Math.min(def.max, 60) : def.max;
  return (
    <div className="fc-number">
      <input type="range" min={def.min} max={rangeMax} step={step} value={Math.min(value, rangeMax)} aria-label={def.label ?? def.key} onChange={(e) => onChange(Number(e.target.value))} />
      <input type="number" min={def.min} max={def.max} step={step} value={round(value)} aria-label={`${def.label ?? def.key} value`}
        onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) onChange(Math.min(def.max, Math.max(def.min, n))); }} />
    </div>
  );
}

function AreaField({ value, onChange }: { value: Area; onChange: (v: Area) => void }) {
  const match = Object.entries(namedAreas).find(([, a]) => Math.abs(a.x - value.x) + Math.abs(a.y - value.y) + Math.abs(a.w - value.w) + Math.abs(a.h - value.h) < 0.002)?.[0];
  return (
    <div className="fc-area">
      <Choice label="Area" value={match ?? "custom"} options={[...Object.keys(namedAreas).map((k) => ({ value: k, label: pretty(k) })), { value: "custom", label: "Custom" }]}
        onChange={(v) => v !== "custom" && onChange({ ...namedAreas[v] })} />
      <div className="fc-area-grid">
        {(["x", "y", "w", "h"] as const).map((k) => (
          <label key={k}>{k}<input type="number" step={0.01} min={k === "w" || k === "h" ? 0.01 : -1} max={k === "w" || k === "h" ? 3 : 2} value={round(value[k])}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange({ ...value, [k]: n }); }} /></label>
        ))}
      </div>
    </div>
  );
}

export function ParamField({ def, value, onChange, recent, onPickAsset, assetName }: {
  def: ParamDef;
  value: unknown;
  onChange: (value: unknown) => void;
  recent: string[];
  onPickAsset?: () => void;
  assetName?: string;
}) {
  const label = def.label ?? pretty(def.key);
  let control: React.ReactNode;
  switch (def.type) {
    case "number":
    case "int": control = <NumberField def={def} value={Number(value)} onChange={onChange} />; break;
    case "enum": control = <Choice label={label} value={String(value)} options={def.options.map((o) => ({ value: o, label: pretty(o) }))} onChange={onChange} />; break;
    case "bool": control = <button type="button" role="switch" aria-checked={!!value} aria-label={label} className={`fc-switch ${value ? "on" : ""}`} onClick={() => onChange(!value)}><span /></button>; break;
    case "color": control = <ColorPicker label={label} value={String(value)} onChange={onChange} palette={flagPalette} recent={recent} allowNone={def.optional} />; break;
    case "colors": {
      const list = (value as string[]) ?? [];
      control = (
        <div className="fc-colors">
          {list.map((c, i) => (
            <div key={i} className="fc-color-item">
              <ColorPicker label={`${label} ${i + 1}`} value={c} palette={flagPalette} recent={recent} allowNone onChange={(next) => onChange(list.map((x, j) => (j === i ? next : x)))} />
              {list.length > def.min && <button type="button" className="icon-button" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}><Minus /></button>}
            </div>
          ))}
          {list.length < def.max && <button type="button" className="subtle-button" onClick={() => onChange([...list, recent[list.length % Math.max(1, recent.length)] ?? "#ffffff"])}><Plus /> Add color</button>}
        </div>
      );
      break;
    }
    case "numbers": control = <input value={((value as number[]) ?? []).join(", ")} placeholder="e.g. 1, 2, 1" aria-label={label} onChange={(e) => onChange(e.target.value.split(/[,\s]+/).filter(Boolean).map(Number).filter(Number.isFinite))} />; break;
    case "text": control = <input value={String(value ?? "")} maxLength={def.maxLength} aria-label={label} onChange={(e) => onChange(e.target.value)} />; break;
    case "area": control = <AreaField value={value as Area} onChange={onChange} />; break;
    case "asset": control = <button type="button" className="outline-button fc-asset-button" onClick={onPickAsset}>{assetName ?? String(value)}</button>; break;
  }
  return (
    <div className={`fc-field fc-field-${def.type}`} title={def.help}>
      <span className="fc-field-label">{label}</span>
      {control}
    </div>
  );
}

export function ParamSection({ title, defs, params, onChange, recent, onPickAsset, assetName }: {
  title: string;
  defs: ParamDef[];
  params: Params;
  onChange: (key: string, value: unknown) => void;
  recent: string[];
  onPickAsset?: () => void;
  assetName?: string;
}) {
  const visible = defs.filter((d) => isParamVisible(d, params));
  if (!visible.length) return null;
  return (
    <section className="fc-section">
      <h4>{title}</h4>
      <div className="fc-fields">
        {visible.map((def) => <ParamField key={def.key} def={def} value={params[def.key]} recent={recent} onChange={(v) => onChange(def.key, v)} onPickAsset={onPickAsset} assetName={assetName} />)}
      </div>
    </section>
  );
}

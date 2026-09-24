"use client";

import { useId, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PALETTE = ["#f1efe8", "#ffdd00", "#d88b32", "#c94c48", "#743b49", "#73577e", "#476b8f", "#458d88", "#507258", "#8e9368", "#777777", "#171717"];

export function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const valid = /^#[0-9a-f]{6}$/i.test(draft);
  return (
    <Popover onOpenChange={(open) => { if (open) setDraft(value); }}>
      <PopoverTrigger asChild><button className="color-trigger" type="button" aria-label={label}><span style={{ backgroundColor: value }} /><span>{value.toUpperCase()}</span></button></PopoverTrigger>
      <PopoverContent className="color-picker" sideOffset={8} collisionPadding={16} aria-labelledby={id}>
        <h3 id={id}>{label}</h3>
        <div className="color-palette">
          {PALETTE.map((color) => <button key={color} type="button" aria-label={`${label}: ${color}`} aria-pressed={value.toLowerCase() === color} style={{ backgroundColor: color }} onClick={() => { setDraft(color); onChange(color); }}>{value.toLowerCase() === color && <Check weight="bold" />}</button>)}
        </div>
        <label htmlFor={`${id}-hex`}>Hex color</label>
        <input id={`${id}-hex`} value={draft} spellCheck={false} autoComplete="off" maxLength={7} aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} onChange={(event) => { const next = event.target.value; setDraft(next); if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next); }} onKeyDown={(event) => { if (event.key === "Enter" && valid) onChange(draft); }} />
        {!valid && <p id={`${id}-error`} className="color-error">Use six hex digits, like #FFDD00.</p>}
      </PopoverContent>
    </Popover>
  );
}

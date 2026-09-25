"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Flag from "./Flag";
import FlagCreator, { type FlagAI } from "./flag-creator/FlagCreator";
import { ColorPicker } from "./ColorPicker";
import { makeFlag, nationalFlag, type FlagDesign } from "@/lib/flag";
import type { Nation } from "@/lib/game";
import { ArrowUUpLeft, Check } from "@phosphor-icons/react";

export default function IdentityEditor({
  nation,
  onSave,
  onClose,
  ai,
}: {
  nation: Nation;
  onSave: (n: Nation) => void;
  onClose: () => void;
  ai?: FlagAI;
}) {
  const hasOfficial = !!nation.iso && nation.iso !== "-99";
  const [custom, setCustom] = useState(!nation.original || !hasOfficial);
  const [name, setName] = useState(nation.name),
    [ideology, setIdeology] = useState(nation.ideology),
    [flag, setFlag] = useState<FlagDesign>(nation.flag),
    [color, setColor] = useState(nation.color);
  const dirty = name !== nation.name || ideology !== nation.ideology || color !== nation.color || custom !== (!nation.original || !hasOfficial)
    || JSON.stringify(flag) !== JSON.stringify(nation.flag);
  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes to this national identity?")) return;
    onClose();
  };
  return (
    <Dialog open onOpenChange={(b) => !b && close()}>
      <DialogContent className="identity-dialog flag-creator-dialog">
        <DialogTitle>National identity</DialogTitle>
        <DialogDescription>Your name, your principles, your colors. Build the flag from shapes, divisions and emblems.</DialogDescription>
        <div className="identity-fields">
          <label>
            Nation name
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Ideology
            <input value={ideology} maxLength={100} onChange={(e) => setIdeology(e.target.value)} />
          </label>
          <div className="color-field">
            <span>Map color</span>
            <ColorPicker label="Map color" value={color} onChange={setColor} />
          </div>
        </div>
        {!custom ? (
          <div className="official-flag">
            <Flag spec={flag} iso={nation.iso} id={nation.id} original large />
            <p>This nation flies its official flag. Editing starts a custom design from a reconstruction of it.</p>
            <button type="button" className="primary-button" onClick={() => setCustom(true)}>Customize flag</button>
          </div>
        ) : (
          <FlagCreator value={flag} onChange={setFlag} ai={ai} inspiration={nationalFlag(nation.id) ?? nation.flag} nationId={nation.id} />
        )}
        <div className="identity-actions">
          {custom && hasOfficial && (
            <button type="button" className="outline-button" onClick={() => { setFlag(makeFlag(nation.id)); setCustom(false); }}>
              <ArrowUUpLeft /> Restore official flag
            </button>
          )}
          <button
            className="primary-button"
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                ...nation,
                name: name.trim(),
                ideology,
                flag,
                color,
                original: !custom,
              })
            }
          >
            <Check />
            Save identity
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Choice } from "./Settings";
import Flag from "./Flag";
import { ColorPicker } from "./ColorPicker";
import { makeFlag, type Nation, type FlagSpec } from "@/lib/game";
import { Shuffle, Check } from "@phosphor-icons/react";
export default function IdentityEditor({
  nation,
  onSave,
  onClose,
}: {
  nation: Nation;
  onSave: (n: Nation) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState(!nation.original);
  const [name, setName] = useState(nation.name),
    [ideology, setIdeology] = useState(nation.ideology),
    [flag, setFlag] = useState<FlagSpec>(nation.flag),
    [color, setColor] = useState(nation.color);
  return (
    <Dialog open onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="identity-dialog">
        <DialogTitle>National identity</DialogTitle>
        <DialogDescription>
          Your name, your principles, your colors.
        </DialogDescription>
        <div className="flag-preview">
          <Flag spec={flag} iso={nation.iso} original={!custom} large />
          <button
            className="subtle-button"
            onClick={() => {
              setFlag(makeFlag(crypto.randomUUID()));
              setCustom(true);
            }}
          >
            <Shuffle />
            Generate composition
          </button>
        </div>
        <label>
          Nation name
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Ideology
          <input
            value={ideology}
            maxLength={100}
            onChange={(e) => setIdeology(e.target.value)}
          />
        </label>
        <div className="two-cols">
          <label>
            Flag layout
            <Choice
              value={flag.layout}
              onChange={(v) => {
                setFlag({ ...flag, layout: v as FlagSpec["layout"] });
                setCustom(true);
              }}
              options={[
                "horizontal",
                "vertical",
                "cross",
                "diagonal",
                "canton",
              ]}
              label="Flag layout"
            />
          </label>
          <label>
            Emblem
            <Choice
              value={flag.emblem}
              onChange={(v) => {
                setFlag({ ...flag, emblem: v as FlagSpec["emblem"] });
                setCustom(true);
              }}
              options={["none", "star", "sun", "diamond", "wreath"]}
              label="Emblem"
            />
          </label>
        </div>
        <div className="color-row">
          {flag.colors.map((c, i) => (
            <div className="color-field" key={i}>
              <span>Color {i + 1}</span>
              <ColorPicker
                label={`Flag color ${i + 1}`}
                value={c}
                onChange={(next) => {
                  setFlag({
                    ...flag,
                    colors: flag.colors.map((x, j) =>
                      i === j ? next : x,
                    ),
                  });
                  setCustom(true);
                }}
              />
            </div>
          ))}
          <div className="color-field">
            <span>Map color</span>
            <ColorPicker
              label="Map color"
              value={color}
              onChange={setColor}
            />
          </div>
        </div>
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
      </DialogContent>
    </Dialog>
  );
}

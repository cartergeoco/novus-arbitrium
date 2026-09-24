"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KeyHint } from "./KeyHint";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  GameController,
  SlidersHorizontal,
  Key,
  Palette,
  SpeakerHigh,
  Question,
  ArrowSquareOut,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import type { Settings as SettingsType } from "@/lib/game";
export function Choice({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: string;
  onChange: (s: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={`choice ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" sideOffset={6} collisionPadding={16}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return (
            <SelectItem key={v} value={v}>
              {typeof o === "string" ? o : o.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export default function Settings({
  open,
  onOpenChange,
  settings,
  onChange,
  apiKey,
  setApiKey,
  tokens,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  settings: SettingsType;
  onChange: (s: SettingsType) => void;
  apiKey: string;
  setApiKey: (s: string) => void;
  tokens: number;
}) {
  const [tab, setTab] = useState("Game");
  const [showKey, setShowKey] = useState(false);
  const set = <K extends keyof SettingsType>(key: K, v: SettingsType[K]) =>
    onChange({ ...settings, [key]: v });
  const toggle = (
    key: "contrast" | "motion" | "transparency" | "sound" | "labels" | "texture" | "highlights",
    title: string,
    description: string,
  ) => (
    <div className="setting-row">
      <div>
        <h4><label htmlFor={`setting-${key}`}>{title}</label></h4>
        <p id={`setting-${key}-description`}>{description}</p>
      </div>
      <Switch
        id={`setting-${key}`}
        aria-describedby={`setting-${key}-description`}
        aria-label={title}
        checked={settings[key]}
        onCheckedChange={(b) => set(key, b)}
      />
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={(value) => { setShowKey(false); onOpenChange(value); }}>
      <DialogContent className="settings-dialog">
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription className="sr-only">Game, appearance, and provider preferences.</DialogDescription>
        <span className="brand-watermark" aria-hidden="true" />
        <Tabs value={tab} onValueChange={setTab} className="settings-tabs" orientation="vertical">
          <TabsList className="settings-nav">
            {[
              ["Game", GameController],
              ["Generation", SlidersHorizontal],
              ["API", Key],
              ["Appearance", Palette],
              ["Audio", SpeakerHigh],
              ["Help", Question],
            ].map(([name, Icon]) => (
              <TabsTrigger key={String(name)} value={String(name)}>
                <Icon size={19} weight="fill" />
                {String(name)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="settings-body">
            <TabsContent value="Game">
              <h3>Simulation</h3>
              <label>
                Difficulty
                <Choice
                  value={settings.difficulty}
                  onChange={(v) => set("difficulty", v)}
                  options={["Standard", "Challenging"]}
                  label="Difficulty"
                />
              </label>
              <p className="hint">
                Challenging adds pressure to your economy and domestic
                stability.
              </p>
              <label>
                Time per decision
                <Choice
                  value={String(settings.turnDays)}
                  onChange={(v) => set("turnDays", Number(v))}
                  options={[
                    { value: "1", label: "1 day" },
                    { value: "7", label: "1 week" },
                    { value: "30", label: "1 month" },
                  ]}
                  label="Time per decision"
                />
              </label>
              <div className="info-note">
                Campaigns are saved automatically in this browser. Use Export in
                a campaign to keep a portable backup.
              </div>
            </TabsContent>
            <TabsContent value="Generation">
              <h3>World engine</h3>
              <label>
                Response token limit
                <input
                  type="number"
                  min="512"
                  max="8192"
                  step="128"
                  value={settings.maxTokens}
                  onChange={(e) =>
                    set(
                      "maxTokens",
                      Math.max(512, Math.min(8192, Number(e.target.value))),
                    )
                  }
                />
              </label>
              <label>
                Context: {settings.contextNations} nations
                <Slider
                  aria-label="Nations in context"
                  min={3}
                  max={16}
                  step={1}
                  value={[settings.contextNations]}
                  onValueChange={(v) => set("contextNations", v[0])}
                />
              </label>
              <p className="hint">
                Includes your nation, named countries, nearby nations and recent
                events. Border coordinates stay out of routine prompts.
              </p>
              <label>
                Temperature: {settings.temperature.toFixed(1)}
                <Slider
                  aria-label="Temperature"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={[settings.temperature]}
                  onValueChange={(v) => set("temperature", v[0])}
                />
              </label>
              <p className="hint">
                Some reasoning models use their own sampling settings.
              </p>
              <label>
                Scenario instructions
                <textarea
                  value={settings.prompt}
                  maxLength={1500}
                  rows={3}
                  placeholder="e.g. Favor slow, realistic political change."
                  onChange={(e) => set("prompt", e.target.value)}
                />
                <span className="field-count">{settings.prompt.length.toLocaleString()} / 1,500</span>
              </label>
            </TabsContent>
            <TabsContent value="API">
              <h3>Intelligence provider</h3>
              <label>
                Provider
                <Choice
                  value={settings.provider}
                  onChange={(v) =>
                    set("provider", v as SettingsType["provider"])
                  }
                  options={[
                    { value: "ollama", label: "Ollama" },
                    { value: "openrouter", label: "OpenRouter" },
                    { value: "openai", label: "OpenAI" },
                  ]}
                  label="Provider"
                />
              </label>
              <label>
                Model ID
                <input
                  value={settings.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder={
                    settings.provider === "ollama"
                      ? "llama3.2"
                      : settings.provider === "openrouter"
                        ? "provider/model-name"
                        : "Your model ID"
                  }
                  maxLength={120}
                />
              </label>
              {settings.provider !== "ollama" && (
              <label>
                API key
                <span className="secret-field">
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your provider key"
                />
                <button type="button" aria-label={showKey ? "Hide API key" : "Show API key"} aria-pressed={showKey} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeSlash /> : <Eye />}</button>
                </span>
              </label>
              )}
              <p className="hint">
                {settings.provider === "ollama"
                  ? "Ollama runs on this computer at 127.0.0.1:11434. The model name must already be pulled. No API key is sent."
                  : "Held in memory for this tab only. Sent through this site&apos;s server to your selected provider when you submit a decision. Never included in saves or exports. Provider charges apply."}
              </p>
                  <label>
                    Campaign token budget
                    <input
                      type="number"
                      min="2000"
                      max="10000000"
                      step="1000"
                      value={settings.tokenBudget}
                      onChange={(e) =>
                        set(
                          "tokenBudget",
                          Math.max(2000, Number(e.target.value)),
                        )
                      }
                    />
                  </label>
                  <p className="hint">
                    {tokens.toLocaleString()} reported tokens used. The next
                    turn is blocked when its estimated cost exceeds the
                    remaining budget.
                  </p>
            </TabsContent>
            <TabsContent value="Appearance">
              <h3>Display</h3>
              {toggle(
                "contrast",
                "High contrast",
                "Stronger text and panel borders.",
              )}
              {toggle(
                "motion",
                "Reduced motion",
                "Disable interface and map animations.",
              )}
              {toggle(
                "transparency",
                "Panel transparency",
                "Frosted glass with a soft view of the world behind it.",
              )}
              {toggle("texture", "Film grain", "A fine, still texture across the interface.")}
              {toggle("highlights", "Interactive lighting", "A soft highlight follows your pointer along edges.")}
              {toggle(
                "labels",
                "Country labels",
                "Show labels on the world map.",
              )}
              <label>
                Text size: {settings.fontSize}px
                <Slider
                  aria-label="Text size"
                  min={16}
                  max={20}
                  step={1}
                  value={[settings.fontSize]}
                  onValueChange={(v) => set("fontSize", v[0])}
                />
              </label>
              <p className="hint">
                This alpha uses a 2D map. Globe mode is planned.
              </p>
            </TabsContent>
            <TabsContent value="Audio">
              <h3>Audio</h3>
              {toggle(
                "sound",
                "Turn sound",
                "Play a short tone when a decision resolves.",
              )}
              <label>
                Volume: {settings.volume}%
                <Slider
                  aria-label="Volume"
                  min={0}
                  max={100}
                  step={1}
                  value={[settings.volume]}
                  onValueChange={(v) => set("volume", v[0])}
                />
              </label>
            </TabsContent>
            <TabsContent value="Help">
              <h3>
                Novus Arbitrium <span className="tag">ALPHA 0.1</span>
              </h3>
              <p>
                Choose a nation, describe a decision, and advance your timeline.
                Click countries to inspect them. Your administration ends if
                your nation dissolves or stability reaches zero.
              </p>
              <div className="help-keys">
                <span>Quick navigation</span>
                <span className="key-chord"><kbd>Ctrl</kbd><kbd>Space</kbd></span>
                <span>Search your library</span>
                <KeyHint name="slash" label="slash" />
                <span>Submit a decision</span>
                <span className="key-chord"><kbd>Ctrl</kbd><KeyHint name="meta" label="Command" /><KeyHint name="enter" label="Enter" /></span>
                <span>Close a dialog</span>
                <KeyHint name="esc" label="Escape" />
                <span>Move the map</span>
                <span className="key-chord"><KeyHint name="mouse" label="Middle mouse" /><span>drag</span></span>
              </div>
              <h4>World laboratory</h4>
              <p>
                Draw any polygon across a selected nation&apos;s land to create a
                breakaway state or transfer territory. Changes are clipped to
                land and can be undone until the next turn. Population and GDP
                are apportioned by area in this alpha.
              </p>
              <h4>About this world</h4>
              <p>
                Natural Earth 5.1.2 supplies generalized borders and source-year
                national statistics. The scenario begins in 2026; it is not a
                verified 2026 geopolitical dataset. Stability, economy and
                influence are fictional simulation scores. Province population
                and political profiles are not yet researched.
              </p>
              <h4>Credits & licensing</h4>
              <p>
                Created for Carter Geoco. Game source: GPL-3.0-only. Map:
                Natural Earth (public domain). Leaflet, Geoman, Turf, Phosphor
                and flag-icons provide maps, geometry, icons and vector flags;
                fonts are Poppins and IBM Plex Mono.
              </p>
              <a
                href="https://github.com/cartergeoco/novus-arbitrium"
                target="_blank"
                rel="noreferrer"
              >
                Project repository <ArrowSquareOut />
              </a>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

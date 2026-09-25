"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useApiKey } from "@/hooks/use-api-key";
import { useProviderConnection } from "@/hooks/use-provider-connection";
import { IconButton } from "@/components/IconButton";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import {
  GlobeHemisphereWest,
  GearSix,
  UserCircle,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Flag as FlagIcon,
  ChartLineUp,
  ShieldCheck,
  Scroll,
  UsersThree,
  Compass,
  FloppyDisk,
  DownloadSimple,
  UploadSimple,
  Trash,
  Check,
  MagnifyingGlass,
  Polygon,
  ArrowCounterClockwise,
  X,
  Warning,
  SpinnerGap,
  Lightning,
  PencilSimple,
  Eye,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast, Toaster } from "sonner";
import Settings, { Choice } from "./Settings";
import { KeyHint } from "./KeyHint";
import Flag from "./Flag";
import IdentityEditor from "./IdentityEditor";
import { Starfield } from "./Starfield";
import {
  createCampaign,
  applyTurn,
  compactContext,
  transferTerritory,
  resolveStatus,
  formatDate,
  number,
  type Campaign,
} from "@/lib/game";
import { recordTerritorySplit, regionViews, type RegionAtlas } from "@/lib/world-regions";
import { campaigns, saveCampaign, deleteCampaign } from "@/lib/storage";
import { factions } from "@/lib/alignments";
import { parseCampaign } from "@/lib/validation";
const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Charting the world…</div>,
});
function ChronicleTurn({ group, latest }: { group: { turn: number; date: string; events: Campaign["history"] }; latest: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (latest && details.current) details.current.open = true;
  }, [latest, group.turn]);
  return (
    <details className={`chronicle-event chronicle-turn ${latest ? "latest" : ""}`} ref={details}>
      <summary>Turn {group.turn}</summary>
      {group.events.map((event) => (
        <article key={event.id}>
          <div className="event-meta"><span>{event.category}</span></div>
          <h3>{event.title}</h3>
          <p>{event.body}</p>
          {event.action && <p><b>Your decision. </b>{event.action}</p>}
          {!!event.changes?.length && (
            <div className="event-changes">
              {event.changes.map((change, index) => <span key={index}>{change}</span>)}
            </div>
          )}
        </article>
      ))}
    </details>
  );
}

export type GameLaunchMode = "new" | "recent" | "library";

type GameProps = {
  launchMode?: GameLaunchMode;
  onExit?: () => void;
  initialCampaign?: Campaign;
  embedded?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  onCampaignOpen?: (campaign: Campaign) => void;
};

export default function Game({
  launchMode = "library",
  onExit,
  initialCampaign,
  embedded = false,
  onPlayingChange,
  onCampaignOpen,
}: GameProps = {}) {
  const [settings, setSettings] = useSettings();
  const [apiKey, setApiKey] = useApiKey(settings.provider);
  const [world, setWorld] = useState<FeatureCollection | null>(null),
    [atlas, setAtlas] = useState<RegionAtlas | null>(null),
    [worldError, setWorldError] = useState(""),
    [saves, setSaves] = useState<Campaign[]>([]),
    [loading, setLoading] = useState(true),
    [campaign, setCampaign] = useState<Campaign | null>(initialCampaign || null),
    [creating, setCreating] = useState(launchMode === "new"),
    [selected, setSelected] = useState("USA"),
    [selectedRegion, setSelectedRegion] = useState<string | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [profileOpen, setProfileOpen] = useState(false),
    [query, setQuery] = useState(""),
    [focus, setFocus] = useState(0),
    [action, setAction] = useState(""),
    [busy, setBusy] = useState(false),
    [saveState, setSaveState] = useState("Saved on this device"),
    [identity, setIdentity] = useState(false),
    [lab, setLab] = useState(false),
    [drawing, setDrawing] = useState(false),
    [ring, setRing] = useState<number[][] | null>(null),
    [territoryTarget, setTerritoryTarget] = useState("new"),
    [territoryName, setTerritoryName] = useState("New Republic"),
    [undo, setUndo] = useState<Campaign | null>(null),
    [deleteId, setDeleteId] = useState(""),
    [sideView, setSideView] = useState<"chronicle" | "factions" | "nations">("chronicle"),
    [nationSort, setNationSort] = useState("strength"),
    [mobilePanel, setMobilePanel] = useState<"nation" | "chronicle" | null>(
      null,
    );
  const panelRef = useRef<HTMLElement>(null);
  const connection = useProviderConnection(settings, apiKey, !settingsOpen);
  const link = connection.state;
  const actionInput = useRef<HTMLTextAreaElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    requestRef = useRef<AbortController | null>(null),
    turnLock = useRef(false);
  useEffect(() => {
    let live = true;
    Promise.allSettled([
      fetch("/data/world.json").then((r) => {
        if (!r.ok)
          throw Error("The world atlas could not load. Reload to try again.");
        return r.json() as Promise<FeatureCollection>;
      }),
      campaigns(),
      fetch("/data/region-atlas.json").then((r) => {
        if (!r.ok) throw Error("The regional atlas could not load.");
        return r.json() as Promise<RegionAtlas>;
      }),
    ]).then((results) => {
      if (!live) return;
      if (results[0].status === "fulfilled") setWorld(results[0].value);
      else setWorldError(results[0].reason.message);
      if (results[1].status === "fulfilled") setSaves(results[1].value);
      else
        toast.error(
          "Device storage is unavailable. Export your campaign to keep it.",
        );
      if (results[2].status === "fulfilled") setAtlas(results[2].value);
      else toast.error("Regional atlas unavailable. Reload to play with dynamic borders.");
      setLoading(false);
    });
    return () => {
      live = false;
      requestRef.current?.abort();
    };
  }, []);
  const preview = useMemo(
    () => (world ? createCampaign(world, "Preview", "USA") : null),
    [world],
  );
  const current = campaign || preview;
  const nations = useMemo(() => current?.nations || {}, [current?.nations]);
  const nation = nations[selected] || nations[current?.player || "USA"];
  const player = campaign?.nations[campaign.player];
  const stance = !campaign || !nation
    ? ""
    : campaign.player === nation.id
    ? "YOU"
    : (campaign.wars || []).some((war) => war.status === "active" && ((war.attackers.includes(campaign.player) && war.defenders.includes(nation.id)) || (war.defenders.includes(campaign.player) && war.attackers.includes(nation.id)))) || player?.rivals?.includes(nation.id) || nation?.rivals?.includes(campaign.player)
      ? "FOE"
      : player?.allies?.includes(nation.id) || nation?.allies?.includes(campaign.player)
        ? "ALLY"
        : "";
  const relationToPlayer = nation?.relationships?.[campaign?.player || ""] ?? nation?.relations ?? 0;
  const chronicleTurns = useMemo(() => {
    const groups: { turn: number; date: string; events: Campaign["history"] }[] = [];
    for (const event of campaign?.history || []) {
      const last = groups.at(-1);
      if (last?.turn === event.turn) last.events.push(event);
      else groups.push({ turn: event.turn, date: event.date, events: [event] });
    }
    return groups;
  }, [campaign]);
  const allRegions = useMemo(() => current && atlas ? regionViews(current, atlas) : [], [current, atlas]);
  const rankedNations = useMemo(() => {
    const list = Object.values(nations);
    const maxPop = Math.max(1, ...list.map((n) => Math.log10(Math.max(1, n.population))));
    const maxGdp = Math.max(1, ...list.map((n) => Math.log10(Math.max(1, n.gdp))));
    const strength = (n: typeof list[number]) => ((n.military || 0) + (Math.log10(Math.max(1, n.population)) / maxPop) * 100 + (Math.log10(Math.max(1, n.gdp)) / maxGdp) * 100) / 3;
    const distance = (n: typeof list[number]) => {
      if (!player) return 0;
      const dLat = (n.center[0] - player.center[0]) * Math.PI / 180;
      const dLon = (n.center[1] - player.center[1]) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(player.center[0] * Math.PI / 180) * Math.cos(n.center[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
    };
    const relation = (n: typeof list[number]) => n.id === player?.id ? 100 : n.relationships?.[player?.id || ""] ?? 0;
    return list.map((nation) => ({ nation, strength: strength(nation), distance: distance(nation), relation: relation(nation) })).sort((a, b) => {
      if (nationSort === "name") return a.nation.name.localeCompare(b.nation.name);
      if (nationSort === "population") return b.nation.population - a.nation.population;
      if (nationSort === "military") return (b.nation.military || 0) - (a.nation.military || 0);
      if (nationSort === "gdp") return b.nation.gdp - a.nation.gdp;
      if (nationSort === "relations") return b.relation - a.relation;
      if (nationSort === "government") return (a.nation.government || "").localeCompare(b.nation.government || "") || a.nation.name.localeCompare(b.nation.name);
      if (nationSort === "distance") return a.distance - b.distance;
      return b.strength - a.strength;
    });
  }, [nations, nationSort, player]);
  const visibleFactions = useMemo(() => factions.map((faction) => ({
    ...faction,
    present: faction.members.filter((id) => nations[id]).map((id) => nations[id]),
  })).filter((faction) => faction.present.length > 1), [nations]);
  const ownedRegions = useMemo(() => allRegions.filter((r) => r.state.owner === selected), [allRegions, selected]);
  const inspectedRegionFeatures = useMemo<FeatureCollection>(() => ({
    type: "FeatureCollection", features: ownedRegions.map((r) => ({
      type: "Feature" as const, geometry: r.geometry,
      properties: { ...r.properties, country: r.state.owner, controller: r.state.controller, unrest: r.state.unrest, damage: r.state.damage },
    })),
  }), [ownedRegions]);
  useEffect(() => {
    onPlayingChange?.(!creating);
    return () => onPlayingChange?.(false);
  }, [creating, onPlayingChange]);
  useEffect(() => {
    if (campaign && !creating) onCampaignOpen?.(campaign);
  }, [campaign, creating, onCampaignOpen]);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [creating, selected, campaign?.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('[role="dialog"], [role="alertdialog"], .landing-page[data-menu-open="true"]')) return;
      if (
        e.key === "/" &&
        !(e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")
      ) {
        e.preventDefault();
        setMobilePanel("nation");
        requestAnimationFrame(() =>
          document
            .querySelector<HTMLInputElement>('[aria-label="Search nations"]')
            ?.focus(),
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const choices = useMemo(
    () =>
      Object.values(nations)
        .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [nations, query],
  );
  const persist = useCallback(async (next: Campaign) => {
    setCampaign(next);
    setSaveState("Saving…");
    try {
      await saveCampaign(next);
      setSaves((prev) => [next, ...prev.filter((c) => c.id !== next.id)]);
      setSaveState("saved");
    } catch {
      setSaveState("Save failed · export a backup");
      toast.error(
        "Unable to save on this device. Use Export to keep this campaign.",
      );
    }
  }, []);
  const choose = (id: string) => {
    if (busy || drawing || ring) return;
    setSelected(id);
    setSelectedRegion(null);
  };
  const start = () => {
    if (!world || !atlas) return;
    const title =
      nation?.name === "United States of America"
        ? "United States"
        : nation?.name || "Campaign";
    const next = createCampaign(world, title, selected);
    persist(next);
    setCreating(false);
    setQuery("");
    setFocus(0);
    toast.success(
      `Your administration of ${next.nations[selected].name} begins.`,
    );
  };
  const goHome = () => {
    if (busy) return;
    if (onExit) {
      onExit();
      return;
    }
    setCampaign(null);
    setCreating(false);
    setLab(false);
    setDrawing(false);
    setRing(null);
    setUndo(null);
    setQuery("");
    setMobilePanel(null);
  };
  function sound() {
    if (!settings.sound) return;
    try {
      const ctx = new AudioContext(),
        osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime((settings.volume / 100) * 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch {}
  }
  async function submit(overrideAction?: string) {
    const submitted = (overrideAction ?? action).trim();
    if (
      !campaign ||
      !submitted ||
      turnLock.current ||
      campaign.status !== "active"
    )
      return;
    turnLock.current = true;
    setBusy(true);
    let receivedTokens = 0;
    try {
      if (settings.provider !== "ollama" && !apiKey)
        throw Error("Add an API key and model in Settings → API first.");
      if (!settings.model.trim())
        throw Error("Add a model in Settings → API first.");
      const context = compactContext(campaign, submitted, settings, allRegions);
      const controller = new AbortController();
      requestRef.current = controller;
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          key: settings.provider === "ollama" ? undefined : apiKey,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          prompt: settings.prompt,
          context,
        }),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        result: unknown;
        tokens: number;
        error?: string;
      };
      if (!response.ok) {
        if (data.tokens)
          await persist({
            ...campaign,
            tokens: campaign.tokens + data.tokens,
          });
        throw Error(data.error || "The world engine could not resolve this turn.");
      }
      const result = data.result;
      const tokens = data.tokens;
      receivedTokens = tokens;
      const next = applyTurn(campaign, result, submitted, settings, tokens, atlas);
      setUndo(null);
      await persist(next);
      setAction("");
      sound();
      toast.success(`Turn ${next.turn} · ${formatDate(next.date)}`);
    } catch (e) {
      if (receivedTokens)
        await persist({
          ...campaign,
          tokens: campaign.tokens + receivedTokens,
        });
      toast.error(
        e instanceof Error ? e.message : "Unable to resolve this turn.",
      );
    } finally {
      setBusy(false);
      turnLock.current = false;
      requestRef.current = null;
    }
  }
  function exportCampaign() {
    if (!campaign) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(campaign)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `novus-${campaign.name.replace(/[^a-z0-9]/gi, "-").slice(0, 50)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Campaign exported.");
  }
  async function importCampaign(file: File) {
    try {
      if (file.size > 30000000)
        throw Error("Campaign files must be under 30 MB.");
      const c = parseCampaign(JSON.parse(await file.text()));
      c.id = crypto.randomUUID();
      c.name = String(c.name).slice(0, 100);
      c.tokens = Number.isFinite(c.tokens) ? c.tokens : 0;
      c.updatedAt = new Date().toISOString();
      await persist(c);
      setSelected(c.player in c.nations ? c.player : Object.keys(c.nations)[0]);
      setCreating(false);
      toast.success("Campaign imported as a new save.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not import this campaign.",
      );
    }
  }
  function applyTerritory() {
    if (!campaign || !ring) return;
    try {
      const ns = transferTerritory(
        campaign.nations,
        selected,
        ring,
        territoryTarget === "new" ? undefined : territoryTarget,
        territoryName,
      );
      const recipient = territoryTarget === "new"
        ? Object.keys(ns).find((id) => !campaign.nations[id])
        : territoryTarget;
      const regional = atlas && recipient
        ? recordTerritorySplit(campaign, atlas, selected, recipient, ring)
        : {};
      const next = {
        ...campaign,
        nations: ns,
        ...regional,
        updatedAt: new Date().toISOString(),
        history: [
          {
            id: crypto.randomUUID(),
            date: campaign.date,
            turn: campaign.turn,
            category: "World laboratory",
            title:
              territoryTarget === "new"
                ? `${territoryName} is established`
                : "A new territorial settlement",
            body: `Territory was reassigned from ${nation.name} in the world laboratory. Population and GDP were apportioned by area. This is a sandbox edit.`,
          },
          ...campaign.history,
        ],
      };
      next.status = resolveStatus(next);
      setUndo(campaign);
      persist(next);
      setRing(null);
      setDrawing(false);
      if (!ns[selected])
        setSelected(next.player in ns ? next.player : Object.keys(ns)[0]);
      toast.success("Borders updated. You can undo this edit.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "The territory could not be changed.",
      );
    }
  }
  const isMap = creating || !!campaign;
  const displayedSaves =
    launchMode === "recent" ? saves.slice(0, 3) : saves;
  return (
    <main className={`${isMap ? "app-shell in-game" : "app-shell"}${embedded ? " embedded-game" : ""}`}>
      {!embedded && <Toaster theme="dark" position="top-center" />}
      <header className="topbar">
        <button
          className="wordmark"
          disabled={busy}
          onClick={goHome}
          aria-label="Novus Arbitrium home"
        >
          <span className="brand-symbol">
            <GlobeHemisphereWest weight="duotone" />
          </span>
          <span>
            NOVUS <b>ARBITRIUM</b>
          </span>
        </button>
        <span className="alpha-badge">
          ALPHA <span>0.1</span>
        </span>
        <div className="topbar-center">
          {campaign ? (
            <>
              <span className="campaign-name">{campaign.name}</span>
              <span className="topbar-divider" />
              <Clock size={15} />
              <span className="mono">{formatDate(campaign.date)}</span>
              <span className="turn-chip">
                TURN {String(campaign.turn).padStart(2, "0")}
              </span>
            </>
          ) : creating ? (
            <span className="mono">
              NEW CAMPAIGN <span className="muted">/</span> CHOOSE YOUR NATION
            </span>
          ) : null}
        </div>
        <div className="topbar-actions">
          {campaign && (
            <IconButton
              className="icon-button export-top"
              aria-label="Export campaign"
              onClick={exportCampaign}
            >
              <DownloadSimple />
            </IconButton>
          )}
          <IconButton
            className="icon-button"
            aria-label="Settings"
            onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
          >
            <GearSix />
          </IconButton>
          <button
            className="icon-button profile-button"
            aria-label="Player profile"
            onClick={() => setProfileOpen(true)}
          >
            <UserCircle weight="duotone" />
          </button>
        </div>
      </header>
      {loading ? (
        <div className="loading-screen">
          <SpinnerGap className="spin" />
          <p>Preparing the atlas…</p>
        </div>
      ) : worldError ? (
        <div className="loading-screen">
          <Warning />
          <p>{worldError}</p>
          <button className="primary-button" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      ) : !isMap ? (
        <div className="dashboard">
          <Starfield />
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">THE WORLD AWAITS</p>
              <h1>
                {launchMode === "recent"
                  ? "Recent campaigns"
                  : "Your campaigns"}
                <span>.</span>
              </h1>
              <p>Every decision begins a different history.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setSelected("USA");
                setCreating(true);
              }}
            >
              <Plus weight="bold" />
              New campaign
            </button>
          </div>
          <div className="campaign-grid">
            {displayedSaves.map((c) => {
              const n = c.nations[c.player];
              return (
                <article className="campaign-card" key={c.id}>
                  <div className="campaign-card-top">
                    <Flag
                      spec={n?.flag || preview!.nations.USA.flag}
                      iso={n?.iso}
                      original={n?.original}
                    />
                    <span className="mono">
                      TURN {String(c.turn).padStart(2, "0")}
                    </span>
                    <button
                      aria-label={`Delete ${c.name}`}
                      className="icon-button"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash />
                    </button>
                  </div>
                  <h2>{c.name}</h2>
                  <p>
                    {n?.name || "Dissolved nation"} <span>·</span>{" "}
                    {formatDate(c.date)}
                  </p>
                  <div className="campaign-card-bottom">
                    <span className="status-caption">
                      {c.status === "active"
                        ? "In progress"
                        : c.status === "victory"
                          ? "World united"
                          : "Administration ended"}
                    </span>
                    <button
                      className="subtle-button"
                      onClick={() => {
                        setCampaign(c);
                        setSelected(
                          c.player in c.nations
                            ? c.player
                            : Object.keys(c.nations)[0],
                        );
                        setQuery("");
                        setFocus((f) => f + 1);
                      }}
                    >
                      Continue
                      <ArrowRight />
                    </button>
                  </div>
                </article>
              );
            })}
            <button
              className={`new-campaign-card ${saves.length ? "compact" : ""}`}
              onClick={() => {
                setSelected("USA");
                setCreating(true);
              }}
            >
              {preview && (
                <WorldMap
                  nations={preview.nations}
                  selected=""
                  onSelect={() => {}}
                  labels={false}
                  drawing={false}
                  onDraw={() => {}}
                  regions={null}
                  focus={0}
                  motion
                  decorative
                />
              )}
              <div className="new-campaign-content">
                <span className="new-plus">
                  <Plus />
                </span>
                <h2>
                  {saves.length
                    ? "Begin another timeline"
                    : "Your first chapter starts here"}
                </h2>
                <p>Choose a nation. Shape its future.</p>
                <span className="gold-text">
                  Create a campaign <ArrowUpRight />
                </span>
              </div>
              <span className="new-card-bottom mono">
                EARTH / 2026 <span>OPEN WORLD STRATEGY</span>
              </span>
            </button>
          </div>
          <div className="dashboard-bottom">
            <span>
              <FloppyDisk />
              Campaigns are stored on this device.
            </span>
            <button
              className="subtle-button"
              onClick={() => importInput.current?.click()}
            >
              <UploadSimple />
              Import campaign
            </button>
          </div>
          <footer>
            <span>NOVUS ARBITRIUM</span>
            <span>A world of consequence.</span>
            <button onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}>
              Alpha 0.1 · Help & credits <ArrowUpRight />
            </button>
          </footer>
        </div>
      ) : (
        <section className="world-workspace">
          <WorldMap
            nations={nations}
            selected={selected}
            onSelect={choose}
            labels={settings.labels}
            drawing={drawing}
            previewRing={ring}
            onDraw={(r) => {
              setRing(r);
              setDrawing(false);
            }}
            regions={inspectedRegionFeatures}
            occupations={allRegions.filter((r) => r.state.controller !== r.state.owner)}
            selectedRegion={selectedRegion}
            focusRegion={allRegions.find((r) => r.properties.id === selectedRegion) || null}
            onSelectRegion={(id) => {
              const region = allRegions.find((item) => item.properties.id === id);
              if (region) setSelected(region.state.owner);
              setSelectedRegion(id);
            }}
            focus={focus}
            motion={settings.motion}
          />
          <aside
            ref={panelRef}
            className={`nation-panel floating-panel ${mobilePanel === "nation" ? "mobile-open" : ""}`}
          >
            {creating && (
              <>
                <div className="panel-eyebrow">
                  <span>SELECT A NATION</span>
                  <button
                    className="mobile-close icon-button"
                    aria-label="Close nation panel"
                    onClick={() => setMobilePanel(null)}
                  >
                    <X />
                  </button>
                </div>
                <div className="search-field">
                  <MagnifyingGlass />
                  <input
                    aria-label="Search nations"
                    placeholder="Find a nation…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={busy || drawing || !!ring}
                  />
                  <KeyHint name="slash" label="slash" />
                </div>
              </>
            )}
            {(query || creating) && (
              <div
                className={`nation-results ${creating ? "creation-results" : ""}`}
              >
                {choices.length ? (
                  choices.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={selected === n.id ? "active" : ""}
                      aria-pressed={selected === n.id}
                      onClick={() => {
                        choose(n.id);
                        if (!creating) setQuery("");
                        setFocus((f) => f + 1);
                      }}
                      disabled={busy || drawing || !!ring}
                    >
                      <Flag spec={n.flag} iso={n.iso} original={n.original} />
                      <span>{n.name}</span>
                      {selected === n.id && <Check weight="bold" />}
                    </button>
                  ))
                ) : (
                  <p className="hint">No nations match “{query}”.</p>
                )}
              </div>
            )}
            {nation && !creating && (
              <div className="nation-details">
                <div className="nation-title docked">
                  <Flag
                    spec={nation.flag}
                    iso={nation.iso}
                    original={nation.original}
                    large
                  />
                  <div>
                    <h2>{nation.name}</h2>
                    <span>
                      {nation.continent}
                      {stance && <span className={`you-label${stance === "ALLY" ? " ally" : stance === "FOE" ? " foe" : ""}`}>{stance}</span>}
                    </span>
                  </div>
                  <button
                    className="mobile-close icon-button"
                    aria-label="Close nation panel"
                    onClick={() => setMobilePanel(null)}
                  >
                    <X />
                  </button>
                </div>
                {!creating && (
                  <Tabs defaultValue="overview" className="nation-tabs">
                    <TabsList variant="line">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="regions">Regions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                      <div className="national-identity">
                        <span className="eyebrow">GOVERNING PRINCIPLE</span>
                        <p>{nation.ideology}</p>
                        <span className="eyebrow">NATIONAL PRIORITY</span>
                        <p>{nation.goal}</p>
                        {nation.government && nation.government !== "Unspecified" && <><span className="eyebrow">GOVERNMENT</span><p>{nation.government}</p></>}
                        {nation.leader && nation.leader !== "Unspecified" && <><span className="eyebrow">LEADERSHIP</span><p>{nation.leader}</p></>}
                      </div>
                      {(campaign?.wars || []).filter((w) => w.status === "active" && (w.attackers.includes(selected) || w.defenders.includes(selected))).map((w) => (
                        <div className="conflict-card" key={w.id}>
                          <span>ACTIVE CONFLICT</span>
                          <strong>{[...w.attackers, ...w.defenders].filter((id) => id !== selected).map((id) => nations[id]?.name || id).join(", ")}</strong>
                          <small>{w.goal}</small>
                        </div>
                      ))}
                      <div className="metrics">
                        {[
                          { key: "stability", icon: ShieldCheck, label: "Stability", value: nation.stability },
                          { key: "economy", icon: ChartLineUp, label: "Economy", value: nation.economy },
                          { key: "influence", icon: Compass, label: "Influence", value: nation.influence },
                        ].map(({ key, icon: Icon, label, value }) => {
                          const delta = (campaign?.history || []).reduce((sum, event) => {
                            if (event.turn !== campaign?.turn) return sum;
                            for (const line of event.changes || []) {
                              const match = line.match(new RegExp(`^${nation.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: ${key} ([+-]?\\d+)$`));
                              if (match) sum += Number(match[1]);
                            }
                            return sum;
                          }, 0);
                          return (
                            <div className="metric" key={key}>
                              <div>
                                <Icon size={17} />
                                <span>{label}</span>
                                <b>{value}%</b>
                                <small className={`stat-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}`}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </small>
                              </div>
                              <Progress aria-label={label} value={value} className={`metric-bar metric-${key}`} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="nation-stats">
                        {[
                          { key: "population", label: "Population", value: number(nation.population) },
                          ...(nation.military != null ? [{ key: "military", label: "Military Rating", value: nation.military }] : []),
                          { key: "gdp", label: "GDP", value: `$${number(nation.gdp > 0 ? nation.gdp * 1000000 : 0)}` },
                          ...(selected !== campaign?.player ? [{ key: "relations", label: "Relations", value: relationToPlayer }] : []),
                        ].map((stat) => {
                          const delta = (campaign?.history || []).reduce((sum, event) => {
                            if (event.turn !== campaign?.turn) return sum;
                            for (const line of event.changes || []) {
                              const match = line.match(new RegExp(`^${nation.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: ${stat.key} ([+-]?\\d+)$`));
                              if (match) sum += Number(match[1]);
                            }
                            return sum;
                          }, 0);
                          return (
                            <div className="nation-stat" key={stat.key}>
                              <span>{stat.label}</span>
                              <b>{stat.value}</b>
                              <small className={`stat-delta ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}`}>
                                {delta > 0 ? `+${delta}` : delta}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                      {selected === campaign?.player && (
                        <button className="outline-button collection-import" type="button" disabled={busy || lab} onClick={() => setIdentity(true)}>
                          <PencilSimple /> Edit national identity
                        </button>
                      )}
                    </TabsContent>
                    <TabsContent value="regions">
                      <div className="regions-heading">
                        <span>
                          {ownedRegions.length} regions in this timeline
                        </span>
                        <button
                          className="subtle-button"
                          onClick={() => setFocus((f) => f + 1)}
                        >
                          <Eye />
                          Show
                        </button>
                      </div>
                      <div className="nation-results region-list">
                        {ownedRegions.map((r) => (
                          <button key={r.properties.id} type="button" className={selectedRegion === r.properties.id ? "active" : ""} aria-pressed={selectedRegion === r.properties.id} onClick={() => setSelectedRegion(r.properties.id)}>
                            <span>{r.properties.name}</span>
                            <small>{r.state.controller !== r.state.owner ? `Occupied by ${nations[r.state.controller]?.name || r.state.controller}` : r.properties.type}</small>
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            )}
            {creating && (
              <div className="create-controls">
                {nation && (
                  <div className="picked-nation">
                    <Flag spec={nation.flag} iso={nation.iso} original={nation.original} large />
                    <div>
                      <strong>{nation.name}</strong>
                      <span>{nation.continent}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="outline-button begin-button"
                  onClick={start}
                  disabled={!atlas || !nation}
                >
                  <span>
                    Load{" "}
                    {nation?.name === "United States of America"
                      ? "the United States"
                      : nation?.name}
                  </span>
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            )}
          </aside>
          {campaign && (
            <>
              <aside
                className={`chronicle-panel floating-panel ${mobilePanel === "chronicle" ? "mobile-open" : ""}`}
              >
                <div className="panel-eyebrow">
                  <div className="side-nav" role="tablist" aria-label="World records">
                    {([
                      ["chronicle", "World chronicle", Scroll],
                      ["factions", "Factions", UsersThree],
                      ["nations", "Nations", FlagIcon],
                    ] as const).map(([id, label, Icon]) => (
                      <button key={id} type="button" role="tab" aria-label={label} aria-selected={sideView === id} className={sideView === id ? "active" : ""} onClick={() => setSideView(id)}>
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                  <span>{sideView === "chronicle" ? "CHRONICLE" : sideView === "factions" ? "FACTIONS" : "NATIONS"}</span>
                  <button className="mobile-close icon-button" aria-label="Close world records" onClick={() => setMobilePanel(null)}><X /></button>
                  <span className="entry-count">{sideView === "chronicle" ? chronicleTurns.length : sideView === "factions" ? visibleFactions.length : rankedNations.length}</span>
                </div>
                <div className="chronicle-scroll">
                  {sideView === "nations" && (
                    <label className="nation-sort">
                      <span className="sr-only">Sort nations</span>
                      <Choice label="Sort nations" value={nationSort} onChange={setNationSort} options={[
                        { value: "strength", label: "Strength" },
                        { value: "relations", label: "Relations" },
                        { value: "government", label: "Government" },
                        { value: "distance", label: "Distance" },
                        { value: "gdp", label: "GDP" },
                        { value: "name", label: "A–Z" },
                        { value: "population", label: "Population" },
                        { value: "military", label: "Military" },
                      ]} />
                    </label>
                  )}
                  {sideView === "chronicle" && busy && (
                    <div className="pending-event">
                      <SpinnerGap className="spin" />
                      <span>The world is responding…</span>
                    </div>
                  )}
                  {sideView === "chronicle" && chronicleTurns.map((group, i) => (
                    <ChronicleTurn key={group.turn} group={group} latest={i === 0} />
                  ))}
                  {sideView === "factions" && visibleFactions.map((faction) => (
                    <article className="chronicle-event" key={faction.id}>
                      <div className="event-meta">
                        <span>{faction.kind}</span>
                        <time>{faction.present.length}</time>
                      </div>
                      <h3>{faction.name}</h3>
                      <p>{faction.present.slice(0, 8).map((member) => member.name).join(", ")}{faction.present.length > 8 ? ` +${faction.present.length - 8}` : ""}</p>
                    </article>
                  ))}
                  {sideView === "nations" && rankedNations.map(({ nation: entry, strength, distance, relation }) => (
                    <button type="button" className={`chronicle-event nation-row ${entry.id === selected ? "latest" : ""}`} key={entry.id} onClick={() => { setSelected(entry.id); setFocus((focus) => focus + 1); }}>
                      <Flag spec={entry.flag} iso={entry.iso} original={entry.original} />
                      <span>
                        <strong>{entry.name}</strong>
                        <small>
                          {nationSort === "population" ? number(entry.population)
                            : nationSort === "military" ? `Military ${entry.military || 0}`
                            : nationSort === "gdp" ? `GDP ${number(entry.gdp)}`
                            : nationSort === "government" ? (entry.government || entry.ideology)
                            : nationSort === "relations" ? (entry.id === player?.id ? "You" : `Relations ${relation}`)
                            : nationSort === "distance" ? (entry.id === player?.id ? "You" : `${Math.round(distance).toLocaleString()} km`)
                            : nationSort === "name" ? entry.continent
                            : `Strength ${Math.round(strength)}`}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="chronicle-foot">
                  <span className="status-dot" />
                  TIMELINE {campaign.id.slice(0, 6).toUpperCase()}
                </div>
              </aside>
              <div className="map-bottom-left">
                <span className="save-caption">
                  <FloppyDisk />
                  {saveState === "Saving…" || saveState.startsWith("Save failed")
                    ? saveState
                    : `Last saved at ${new Date(campaign.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                </span>
              </div>
              {lab ? (
                <div className="lab-panel floating-panel">
                  <div className="lab-title">
                    <span>
                      <Polygon />
                      World laboratory
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Close laboratory"
                      onClick={() => {
                        setLab(false);
                        setDrawing(false);
                        setRing(null);
                      }}
                    >
                      <X />
                    </button>
                  </div>
                  <p>
                    {ring
                      ? "The selected area is ready. Choose who will control it."
                      : drawing
                        ? "Click to place boundary points. Click the first point again to finish."
                        : "Select a nation, then draw a boundary across its land. The shape is clipped to the existing coastline."}
                  </p>
                  <div className="lab-source">
                    SOURCE <b>{nation?.name}</b>
                  </div>
                  {ring ? (
                    <>
                      <div className="two-cols">
                        <label>
                          Recipient
                          <Choice
                            label="Territory recipient"
                            value={territoryTarget}
                            onChange={setTerritoryTarget}
                            options={[
                              { value: "new", label: "Create a new nation" },
                              ...Object.values(nations)
                                .filter((n) => n.id !== selected)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((n) => ({ value: n.id, label: n.name })),
                            ]}
                          />
                        </label>
                        {territoryTarget === "new" && (
                          <label>
                            New nation name
                            <input
                              aria-label="New nation name"
                              value={territoryName}
                              maxLength={80}
                              onChange={(e) => setTerritoryName(e.target.value)}
                            />
                          </label>
                        )}
                      </div>
                      <div className="button-row">
                        <button
                          className="outline-button"
                          onClick={() => setRing(null)}
                        >
                          Discard shape
                        </button>
                        <button
                          className="primary-button"
                          disabled={
                            territoryTarget === "new" && !territoryName.trim()
                          }
                          onClick={applyTerritory}
                        >
                          Apply territory
                          <Check />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="button-row">
                      <button
                        className="primary-button"
                        onClick={() => setDrawing(!drawing)}
                      >
                        <Polygon />
                        {drawing ? "Cancel drawing" : "Draw territory"}
                      </button>
                      {undo && (
                        <button
                          className="outline-button"
                          onClick={() => {
                            persist(undo);
                            setSelected(undo.player);
                            setUndo(null);
                            toast.success("Territory edit undone.");
                          }}
                        >
                          <ArrowCounterClockwise />
                          Undo edit
                        </button>
                      )}
                    </div>
                  )}
                  <span className="hint">
                    Sandbox changes affect this saved campaign.
                  </span>
                </div>
              ) : (
                <div className="decision-dock">
                  <div className="decision-context">
                    <span className="decision-provider" data-link={link} title={connection.message}>
                      <Lightning weight="fill" />
                      {settings.provider === "openai" ? "OpenAI" : settings.provider === "openrouter" ? "OpenRouter" : "Ollama"}
                    </span>
                    <span className="decision-turn">Turn {campaign.turn}</span>
                    <span className="decision-date">{formatDate(campaign.date)}</span>
                  </div>
                  {campaign.status === "active" ? (
                    <>
                      <textarea
                        ref={actionInput}
                        aria-label="Your decision"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        placeholder={`What will you do as ${player?.name || "your nation"}?`}
                        value={action}
                        disabled={busy}
                        maxLength={4000}
                        onChange={(e) => setAction(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            submit();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="outline-button begin-button"
                        disabled={!action.trim() || busy}
                        onClick={() => submit()}
                      >
                        <span>{busy ? "Resolving…" : "Submit decision"}</span>
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <div className="end-state">
                      <FlagIcon />
                      <h3>
                        {campaign.status === "defeat"
                          ? "A chapter closes."
                          : "A world under one flag."}
                      </h3>
                      <p>
                        {campaign.status === "defeat"
                          ? "Your country is no longer on the map. Your chronicle remains available."
                          : "Every remaining territory is united under your administration."}
                      </p>
                      <button className="primary-button" onClick={goHome}>
                        Return to campaigns
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="mobile-map-nav">
                <button onClick={() => setMobilePanel("nation")}>
                  <FlagIcon />
                  Nation
                </button>
                <button onClick={() => setMobilePanel("chronicle")}>
                  <Scroll />
                  Chronicle
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCampaign(f);
          e.currentTarget.value = "";
        }}
      />
      <Settings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
      {identity && player && (
        <IdentityEditor
          nation={player}
          ai={settings.model.trim() && (settings.provider === "ollama" || apiKey) ? {
            provider: settings.provider,
            key: settings.provider === "ollama" ? undefined : apiKey,
            model: settings.model,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
          } : undefined}
          onClose={() => setIdentity(false)}
          onSave={(n) => {
            if (!campaign) return;
            setUndo(null);
            persist({
              ...campaign,
              nations: { ...campaign.nations, [n.id]: n },
              updatedAt: new Date().toISOString(),
            });
            setIdentity(false);
            toast.success("National identity updated.");
          }}
        />
      )}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="profile-dialog">
          <UserCircle size={45} weight="duotone" />
          <DialogTitle>Local player</DialogTitle>
          <DialogDescription>
            Your timelines live on this device.
          </DialogDescription>
          <p>
            {saves.length} saved {saves.length === 1 ? "campaign" : "campaigns"}
            . No separate game account is needed for this alpha. Cloud
            synchronization and multiplayer are not available.
          </p>
          <button
            className="outline-button"
            onClick={() => {
              setProfileOpen(false);
              importInput.current?.click();
            }}
          >
            <UploadSimple />
            Import a campaign
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(b) => !b && setDeleteId("")}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the save from this device. Export it first if you
              want to keep the timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteCampaign(deleteId);
                  setSaves((s) => s.filter((c) => c.id !== deleteId));
                  setDeleteId("");
                  toast.success("Campaign deleted.");
                } catch {
                  toast.error("Unable to delete this save.");
                }
              }}
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

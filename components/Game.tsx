"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import {
  GlobeHemisphereWest,
  GearSix,
  UserCircle,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  Flag as FlagIcon,
  ChartLineUp,
  ShieldCheck,
  Users,
  Handshake,
  Scroll,
  Compass,
  FloppyDisk,
  DownloadSimple,
  UploadSimple,
  Trash,
  Check,
  MapTrifold,
  MagnifyingGlass,
  Polygon,
  ArrowCounterClockwise,
  X,
  Warning,
  SpinnerGap,
  Lightning,
  Buildings,
  PencilSimple,
  CaretRight,
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
import Flag from "./Flag";
import IdentityEditor from "./IdentityEditor";
import {
  defaults,
  createCampaign,
  applyTurn,
  demoTurn,
  compactContext,
  transferTerritory,
  resolveStatus,
  formatDate,
  number,
  type Campaign,
  type Settings as SettingsType,
} from "@/lib/game";
import { campaigns, saveCampaign, deleteCampaign } from "@/lib/storage";
import { parseCampaign, parseSettings } from "@/lib/validation";
const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Charting the world…</div>,
});
const SUGGESTIONS = [
  {
    icon: Buildings,
    text: "Invest in education",
    action:
      "Invest in public schools and teacher training, with a phased budget over the next year.",
  },
  {
    icon: Handshake,
    text: "Open trade talks",
    action:
      "Open diplomatic talks with neighboring countries to negotiate a mutually beneficial trade agreement.",
  },
  {
    icon: ShieldCheck,
    text: "Reform public services",
    action:
      "Introduce a transparent public service reform to improve healthcare access and reduce corruption.",
  },
];
function useRegions(id: string) {
  const [regions, setRegions] = useState<FeatureCollection | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setRegions(null);
    setFailed(false);
    if (!id || id.startsWith("NEW-")) return;
    const controller = new AbortController();
    fetch(`/data/regions/${id}.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<FeatureCollection>;
      })
      .then(setRegions)
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [id]);
  return { regions, failed };
}
export default function Game() {
  const [world, setWorld] = useState<FeatureCollection | null>(null),
    [worldError, setWorldError] = useState(""),
    [saves, setSaves] = useState<Campaign[]>([]),
    [loading, setLoading] = useState(true),
    [campaign, setCampaign] = useState<Campaign | null>(null),
    [creating, setCreating] = useState(false),
    [selected, setSelected] = useState("USA"),
    [settings, setSettings] = useState<SettingsType>(defaults),
    [settingsOpen, setSettingsOpen] = useState(false),
    [apiKey, setApiKey] = useState(""),
    [profileOpen, setProfileOpen] = useState(false),
    [name, setName] = useState("A new world order"),
    [query, setQuery] = useState(""),
    [layer, setLayer] = useState("Political"),
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
    [mobilePanel, setMobilePanel] = useState<"nation" | "chronicle" | null>(
      null,
    );
  const panelRef = useRef<HTMLElement>(null);
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
    ]).then((results) => {
      if (!live) return;
      if (results[0].status === "fulfilled") setWorld(results[0].value);
      else setWorldError(results[0].reason.message);
      if (results[1].status === "fulfilled") setSaves(results[1].value);
      else
        toast.error(
          "Device storage is unavailable. Export your campaign to keep it.",
        );
      setLoading(false);
    });
    try {
      const saved = JSON.parse(
        localStorage.getItem("novus-settings") || "null",
      );
      if (saved) setSettings(parseSettings(saved));
    } catch {}
    return () => {
      live = false;
      requestRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = settings.fontSize + "px";
    document.documentElement.dataset.contrast = String(settings.contrast);
    document.documentElement.dataset.motion = String(settings.motion);
    document.documentElement.dataset.transparency = String(
      settings.transparency,
    );
    try {
      localStorage.setItem("novus-settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);
  const preview = useMemo(
    () => (world ? createCampaign(world, "Preview", "USA") : null),
    [world],
  );
  const current = campaign || preview;
  const nations = current?.nations || {};
  const nation = nations[selected] || nations[current?.player || "USA"];
  const player = campaign?.nations[campaign.player];
  const playerRegions = useRegions(campaign?.player || "");
  const inspectedRegions = useRegions(creating || campaign ? selected : "");
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [creating, selected, campaign?.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
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
      setSaveState("Saved on this device");
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
  };
  const start = () => {
    if (!world) return;
    const next = createCampaign(world, name, selected);
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
  async function submit() {
    if (
      !campaign ||
      !action.trim() ||
      turnLock.current ||
      campaign.status !== "active"
    )
      return;
    turnLock.current = true;
    setBusy(true);
    const submitted = action.trim();
    let receivedTokens = 0;
    try {
      let result,
        tokens = 0;
      if (settings.provider === "demo") {
        await new Promise((r) => setTimeout(r, 650));
        result = demoTurn(campaign, submitted, settings);
      } else {
        if (!apiKey || !settings.model.trim())
          throw Error("Add an API key and model in Settings → API first.");
        const context = compactContext(
          campaign,
          submitted,
          settings,
          playerRegions.regions,
        );
        const estimate =
          Math.ceil(JSON.stringify(context).length / 3) +
          settings.maxTokens +
          1100;
        if (campaign.tokens + estimate > settings.tokenBudget)
          throw Error(
            "This turn could exceed your campaign token budget. Increase it in API settings.",
          );
        const controller = new AbortController();
        requestRef.current = controller;
        const response = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: settings.provider,
            key: apiKey,
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
          throw Error(
            data.error || "The world engine could not resolve this turn.",
          );
        }
        result = data.result;
        tokens = data.tokens;
        receivedTokens = tokens;
      }
      const next = applyTurn(campaign, result, submitted, settings, tokens);
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
      const next = {
        ...campaign,
        nations: ns,
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
  return (
    <main className={isMap ? "app-shell in-game" : "app-shell"}>
      <Toaster theme="dark" richColors position="top-center" />
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
            <button
              className="icon-button export-top"
              title="Export campaign"
              aria-label="Export campaign"
              onClick={exportCampaign}
            >
              <DownloadSimple />
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <GearSix />
          </button>
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
          <div className="dashboard-heading">
            <div>
              <p className="eyebrow">THE WORLD AWAITS</p>
              <h1>
                Your campaigns<span>.</span>
              </h1>
              <p>Every decision begins a different history.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setSelected("USA");
                setCreating(true);
                setName("A new world order");
              }}
            >
              <Plus weight="bold" />
              New campaign
            </button>
          </div>
          <div className="campaign-grid">
            {saves.map((c) => {
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
                setName("A new world order");
              }}
            >
              {preview && (
                <WorldMap
                  nations={preview.nations}
                  selected=""
                  onSelect={() => {}}
                  labels={false}
                  layer="Political"
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
            <button onClick={() => setSettingsOpen(true)}>
              Alpha 0.1 · Help & credits <ArrowUpRight />
            </button>
          </footer>
        </div>
      ) : (
        <section className="world-workspace">
          <WorldMap
            nations={nations}
            selected={selected}
            player={campaign?.player}
            onSelect={choose}
            labels={settings.labels}
            layer={layer}
            drawing={drawing}
            previewRing={ring}
            onDraw={(r) => {
              setRing(r);
              setDrawing(false);
            }}
            regions={inspectedRegions.regions}
            focus={focus}
            motion={settings.motion}
          />
          <div className="world-toolbar">
            <button className="subtle-button" onClick={goHome} disabled={busy}>
              <ArrowLeft />
              {creating ? "Campaigns" : "Exit to campaigns"}
            </button>
            <div className="map-layer-switch">
              <MapTrifold />
              <Choice
                value={layer}
                onChange={setLayer}
                options={["Political", "Stability", "Relations", "Regions"]}
                label="Map layer"
              />
            </div>
          </div>
          <aside
            ref={panelRef}
            className={`nation-panel floating-panel ${mobilePanel === "nation" ? "mobile-open" : ""}`}
          >
            <div className="panel-eyebrow">
              <span>
                {creating
                  ? "SELECT A NATION"
                  : selected === campaign?.player
                    ? "YOUR NATION"
                    : "NATION OVERVIEW"}
              </span>
              <button
                className="mobile-close icon-button"
                aria-label="Close nation panel"
                onClick={() => setMobilePanel(null)}
              >
                <X />
              </button>
              {!creating && <span className="mono">{nation?.id}</span>}
            </div>
            {creating ? (
              <>
                <h2>
                  Where does your
                  <br />
                  story begin?
                </h2>
                <p className="muted panel-intro">
                  Lead any nation into an unwritten future.
                </p>
              </>
            ) : null}
            <div className="search-field">
              <MagnifyingGlass />
              <input
                aria-label="Search nations"
                placeholder="Find a nation…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy || drawing || !!ring}
              />
              <kbd>/</kbd>
            </div>
            {(query || creating) && (
              <div
                className={`nation-results ${creating ? "creation-results" : ""}`}
              >
                {choices.length ? (
                  choices.map((n) => (
                    <button
                      key={n.id}
                      className={selected === n.id ? "active" : ""}
                      onClick={() => {
                        choose(n.id);
                        if (!creating) setQuery("");
                        setFocus((f) => f + 1);
                      }}
                      disabled={busy || drawing || !!ring}
                    >
                      <Flag spec={n.flag} iso={n.iso} original={n.original} />
                      <span>{n.name}</span>
                      {selected === n.id ? <Check /> : <CaretRight />}
                    </button>
                  ))
                ) : (
                  <p className="hint">No nations match “{query}”.</p>
                )}
              </div>
            )}
            {nation && (!creating || !query) && (
              <div className="nation-details">
                <div className="nation-title">
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
                      {campaign?.player === nation.id && (
                        <span className="you-label">YOU</span>
                      )}
                    </span>
                  </div>
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
                      </div>
                      <div className="metrics">
                        {[
                          {
                            icon: ShieldCheck,
                            label: "Stability",
                            value: nation.stability,
                          },
                          {
                            icon: ChartLineUp,
                            label: "Economy",
                            value: nation.economy,
                          },
                          {
                            icon: Compass,
                            label: "Influence",
                            value: nation.influence,
                          },
                        ].map(({ icon: Icon, label, value }) => (
                          <div className="metric" key={label}>
                            <div>
                              <Icon size={17} />
                              <span>{label}</span>
                              <b>
                                {value}
                                <small>/100</small>
                              </b>
                            </div>
                            <Progress
                              aria-label={label}
                              value={value}
                              className={`metric-bar metric-${label.toLowerCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="nation-stat">
                        <Users />
                        <span>
                          Population{" "}
                          <small>{nation.populationYear} baseline</small>
                        </span>
                        <b>{number(nation.population)}</b>
                      </div>
                      <div className="nation-stat">
                        <ChartLineUp />
                        <span>
                          GDP{" "}
                          <small>
                            {nation.gdpYear > 0
                              ? `${nation.gdpYear} baseline`
                              : "Source unavailable"}
                          </small>
                        </span>
                        <b>
                          {nation.gdp > 0
                            ? "$" + number(nation.gdp * 1000000)
                            : "Unknown"}
                        </b>
                      </div>
                      {selected !== campaign?.player && (
                        <div className="nation-stat">
                          <Handshake />
                          <span>Relations</span>
                          <b
                            className={
                              nation.relations > 0
                                ? "positive"
                                : nation.relations < 0
                                  ? "negative"
                                  : ""
                            }
                          >
                            {nation.relations > 0 ? "+" : ""}
                            {nation.relations}
                          </b>
                        </div>
                      )}
                      <p className="metrics-caption">
                        Ratings are simulation scores.
                      </p>
                      {selected === campaign?.player && (
                        <button
                          className="outline-button full-width"
                          onClick={() => setIdentity(true)}
                          disabled={busy || lab}
                        >
                          <PencilSimple />
                          Edit national identity
                        </button>
                      )}
                    </TabsContent>
                    <TabsContent value="regions">
                      <div className="regions-heading">
                        <span>
                          {inspectedRegions.regions?.features.length || 0}{" "}
                          administrative regions
                        </span>
                        <button
                          className="subtle-button"
                          onClick={() => {
                            setLayer("Regions");
                            setFocus((f) => f + 1);
                          }}
                        >
                          <Eye />
                          Show
                        </button>
                      </div>
                      <div className="region-list">
                        {inspectedRegions.regions?.features.map((f) => (
                          <div key={f.properties?.id}>
                            <span>{f.properties?.name}</span>
                            <small>{f.properties?.type}</small>
                          </div>
                        ))}
                      </div>
                      <p className="hint">
                        {inspectedRegions.failed
                          ? "Regional data could not load. Select this nation again to retry."
                          : nation.id.startsWith("NEW-")
                            ? "Regional boundaries for new nations are not yet assigned."
                            : "Geographic regions are available. Population, beliefs and regional flag profiles are planned."}
                      </p>
                    </TabsContent>
                  </Tabs>
                )}
                {creating && (
                  <div className="selection-stats">
                    <span>
                      <Users />
                      {number(nation.population)} people
                    </span>
                    <span>
                      <GlobeHemisphereWest />
                      {nation.continent}
                    </span>
                  </div>
                )}
              </div>
            )}
            {creating && (
              <div className="create-controls">
                <label>
                  Campaign name
                  <input
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name this timeline"
                  />
                </label>
                <button className="primary-button full-width" onClick={start}>
                  Lead{" "}
                  {nation?.name === "United States of America"
                    ? "the United States"
                    : nation?.name}
                  <ArrowRight />
                </button>
                <p className="hint">
                  01 Jan 2026 ·{" "}
                  {settings.provider === "demo" ? "Local demo" : "AI engine"} ·{" "}
                  {settings.difficulty}
                </p>
              </div>
            )}
          </aside>
          {campaign && (
            <>
              <aside
                className={`chronicle-panel floating-panel ${mobilePanel === "chronicle" ? "mobile-open" : ""}`}
              >
                <div className="panel-eyebrow">
                  <span>
                    <Scroll size={16} />
                    WORLD CHRONICLE
                  </span>
                  <button
                    className="mobile-close icon-button"
                    aria-label="Close chronicle"
                    onClick={() => setMobilePanel(null)}
                  >
                    <X />
                  </button>
                  <span className="entry-count">{campaign.history.length}</span>
                </div>
                <div className="chronicle-scroll">
                  {busy && (
                    <div className="pending-event">
                      <SpinnerGap className="spin" />
                      <span>The world is responding…</span>
                    </div>
                  )}
                  {campaign.history.map((e, i) => (
                    <article
                      className={`chronicle-event ${i === 0 ? "latest" : ""}`}
                      key={e.id}
                    >
                      <div className="event-meta">
                        <span>{e.category}</span>
                        <time>{formatDate(e.date).slice(0, 6)}</time>
                      </div>
                      <h3>{e.title}</h3>
                      <p>{e.body}</p>
                      {e.action && (
                        <details>
                          <summary>Your decision</summary>
                          <p>{e.action}</p>
                        </details>
                      )}
                      {!!e.changes?.length && (
                        <div className="event-changes">
                          {e.changes.slice(0, 4).map((c, j) => (
                            <span key={j}>{c}</span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                <div className="chronicle-foot">
                  <span className="status-dot" />
                  TIMELINE {campaign.id.slice(0, 6).toUpperCase()}
                </div>
              </aside>
              <div className="map-bottom-left">
                <button
                  className={lab ? "lab-button active" : "lab-button"}
                  disabled={busy || campaign.status !== "active"}
                  onClick={() => {
                    setLab(!lab);
                    setDrawing(false);
                    setRing(null);
                  }}
                >
                  <Polygon />
                  World laboratory
                </button>
                <span className="save-caption">
                  <FloppyDisk />
                  {saveState}
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
                    <span>
                      <Lightning weight="fill" />
                      {settings.provider === "demo"
                        ? "LOCAL DEMO"
                        : "AI ENGINE"}
                    </span>
                    <span>
                      {campaign.status === "active"
                        ? `NEXT TURN · +${settings.turnDays} DAYS`
                        : campaign.status === "defeat"
                          ? "ADMINISTRATION ENDED"
                          : "WORLD UNITED"}
                    </span>
                  </div>
                  {campaign.status === "active" ? (
                    <>
                      <textarea
                        ref={actionInput}
                        aria-label="Your decision"
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
                      <div className="decision-bottom">
                        <span>
                          {action
                            ? `${action.length} / 4000`
                            : "Your choices will shape the world."}
                        </span>
                        <button
                          className="primary-button"
                          disabled={!action.trim() || busy}
                          onClick={submit}
                        >
                          {busy ? <SpinnerGap className="spin" /> : <ArrowUp />}
                          {busy ? "Resolving…" : "Submit decision"}
                          <kbd>Ctrl ↵</kbd>
                        </button>
                      </div>
                      {campaign.turn === 1 && !action && (
                        <div className="suggestions">
                          {SUGGESTIONS.map(
                            ({ icon: Icon, text, action: a }) => (
                              <button
                                key={text}
                                onClick={() => {
                                  setAction(a);
                                  actionInput.current?.focus();
                                }}
                              >
                                <Icon />
                                {text}
                              </button>
                            ),
                          )}
                        </div>
                      )}
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
                          ? "Your nation has dissolved or lost domestic stability. Your chronicle remains available."
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
          {creating && (
            <div className="scenario-caption">
              <span className="eyebrow">THE CONTEMPORARY WORLD</span>
              <p>01 January 2026</p>
              <span>
                {Object.keys(nations).length} playable countries & territories
              </span>
            </div>
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
        tokens={campaign?.tokens || 0}
      />
      {identity && player && (
        <IdentityEditor
          nation={player}
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

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  BookOpenText,
  Stack,
  ArrowRight,
  DownloadSimple,
  GearSix,
  GlobeHemisphereWest,
  House,
  Info,
  PencilSimple,
  Plus,
  Trash,
  UploadSimple,
  UserCircle,
  MagnifyingGlass,
  X,
  ArrowUp,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Flag from "@/components/Flag";
import { AsciiBackground } from "@/components/AsciiBackground";
import SettingsPanel, { Choice } from "@/components/Settings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconButton } from "@/components/IconButton";
import { SurfaceDetails } from "@/components/SurfaceDetails";
import { GlowWordmark } from "@/components/GlowWordmark";
import { KeyHint } from "@/components/KeyHint";
import { useSettings } from "@/hooks/use-settings";
import { useApiKey } from "@/hooks/use-api-key";
import { useAmbientState } from "@/hooks/use-ambient-state";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDate,
  type Campaign,
} from "@/lib/game";
import AccountMenu from "@/components/AccountMenu";
import { CAMPAIGN_SLOTS } from "@/lib/accounts";
import { campaigns, currentAccount, deleteCampaign, saveCampaign } from "@/lib/saves";
import { parseCampaign } from "@/lib/validation";
import { toast, Toaster } from "sonner";

const Game = dynamic(() => import("@/components/Game"), { ssr: false });

function campaignHash(id: string) {
  return `#campaign/${encodeURIComponent(id)}`;
}

function campaignIdFromHash(hash: string) {
  const match = /^#campaign\/([^/]+)$/.exec(hash);
  return match ? decodeURIComponent(match[1]) : "";
}

const GREETINGS = [
  "Hello",
  "Bonjour",
  "Hola",
  "Ciao",
  "Olá",
  "Hallo",
  "Hej",
  "Ahoj",
  "Salve",
  "Kia ora",
];

type MenuItem = {
  label: string;
  href: string;
  icon: typeof House;
  disabled?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Home", href: "#home", icon: House },
  { label: "New", href: "#new", icon: Plus },
  {
    label: "Campaigns",
    href: "#campaigns",
    icon: Stack,
  },
  {
    label: "Library",
    href: "#library",
    icon: BookOpenText,
    disabled: true,
  },
  {
    label: "Explore",
    href: "#explore",
    icon: GlobeHemisphereWest,
    disabled: true,
  },
  {
    label: "Create",
    href: "#create",
    icon: PencilSimple,
    disabled: true,
  },
  { label: "About", href: "#about", icon: Info },
];

type LandingPageProps = {
  wordmarkFontClassName: string;
  greetingFontClassName: string;
};

export default function LandingPage({ wordmarkFontClassName, greetingFontClassName }: LandingPageProps) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const [openCampaign, setOpenCampaign] = useState<Campaign | null>(null);
  const [playing, setPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [savedCampaigns, setSavedCampaigns] = useState<Campaign[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useSettings();
  const [apiKey, setApiKey] = useApiKey(settings.provider);
  const { hidden, reducedMotion } = useAmbientState();
  const [sort, setSort] = useState("recent");
  const [importing, setImporting] = useState(false);
  const [renameId, setRenameId] = useState("");
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (reducedMotion || settings.motion) {
      const reducedMotionTimer = window.setTimeout(
        () => setVisibleText(GREETINGS[0]),
        0,
      );
      return () => window.clearTimeout(reducedMotionTimer);
    }
    if (hidden || menuOpen || settingsOpen || profileOpen || commandsOpen || activeSection !== "#home" || openCampaign) return;

    const greeting = GREETINGS[greetingIndex];
    let delay = deleting ? 65 : 110;

    if (!deleting && visibleText === greeting) {
      delay = 1500;
    } else if (deleting && visibleText === "") {
      delay = 450;
    }

    const timer = window.setTimeout(() => {
      if (!deleting && visibleText === greeting) {
        setDeleting(true);
        return;
      }

      if (deleting && visibleText === "") {
        setDeleting(false);
        setGreetingIndex((current) => (current + 1) % GREETINGS.length);
        return;
      }

      setVisibleText(
        deleting
          ? greeting.slice(0, Math.max(0, visibleText.length - 1))
          : greeting.slice(0, visibleText.length + 1),
      );
    }, delay);

    return () => window.clearTimeout(timer);
  }, [deleting, greetingIndex, visibleText, settings.motion, menuOpen, settingsOpen, profileOpen, commandsOpen, hidden, reducedMotion, activeSection, openCampaign]);

  const refreshCampaigns = useCallback(async () => {
    try {
      setSavedCampaigns(await campaigns());
      setSaveError("");
    } catch {
      setSaveError("Saved campaigns are unavailable in this browser.");
    } finally {
      setSavesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const updateSection = () => {
      const campaignId = campaignIdFromHash(window.location.hash);
      if (campaignId) {
        setActiveSection("#play");
        void campaigns().then((list) => {
          if (cancelled) return;
          setSavedCampaigns(list);
          setSavesLoading(false);
          const found = list.find((campaign) => campaign.id === campaignId) || null;
          setOpenCampaign(found);
          if (!found) {
            window.history.replaceState(null, "", "#campaigns");
            setActiveSection("#campaigns");
          }
        }).catch(() => {
          if (cancelled) return;
          setSaveError("Saved campaigns are unavailable in this browser.");
          setSavesLoading(false);
          setOpenCampaign(null);
          setActiveSection("#campaigns");
        });
        return;
      }
      const hash = window.location.hash === "#recent" || window.location.hash === "#library" ? "#campaigns" : window.location.hash;
      setActiveSection(MENU_ITEMS.some((item) => item.href === hash && !item.disabled) ? hash : "#home");
      setOpenCampaign(null);
      void refreshCampaigns();
    };
    updateSection();
    window.addEventListener("popstate", updateSection);
    window.addEventListener("hashchange", updateSection);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", updateSection);
      window.removeEventListener("hashchange", updateSection);
    };
  }, [refreshCampaigns]);

  const showCampaign = useCallback((campaign: Campaign) => {
    const hash = campaignHash(campaign.id);
    if (window.location.hash === "#new") window.history.replaceState(null, "", hash);
    else if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setOpenCampaign((current) => current?.id === campaign.id ? current : campaign);
    setActiveSection("#play");
    setMenuOpen(false);
    setCommandsOpen(false);
  }, []);

  const navigate = useCallback((section: string) => {
    if (section === "#new" && currentAccount() && savedCampaigns.length >= CAMPAIGN_SLOTS) {
      toast.error("You already have 5 campaigns. Delete one to free a slot.");
      return;
    }
    window.history.pushState(null, "", section);
    setActiveSection(section);
    setOpenCampaign(null);
    setMenuOpen(false);
    setCommandsOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".page-content")?.focus({ preventScroll: true }));
    if (section === "#campaigns" || section === "#recent" || section === "#library") {
      setSavesLoading(true);
      void refreshCampaigns();
    }
  }, [refreshCampaigns, savedCampaigns.length]);

  async function importCampaign(file: File) {
    setImporting(true);
    try {
      if (file.size > 30000000) throw Error("Campaign files must be under 30 MB.");
      const imported = parseCampaign(JSON.parse(await file.text()));
      const copy: Campaign = {
        ...imported,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      await saveCampaign(copy);
      await refreshCampaigns();
      toast.success(`Imported “${copy.name}” into your campaigns.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this campaign.");
    } finally {
      setImporting(false);
    }
  }

  async function renameCampaign(campaign: Campaign) {
    const nextName = renameValue.trim();
    setRenameId("");
    if (!nextName || nextName === campaign.name || nextName.length > 80) return;
    await saveCampaign({ ...campaign, name: nextName, updatedAt: new Date().toISOString() });
    await refreshCampaigns();
    toast.success(`Renamed the campaign to “${nextName}”.`);
  }

  function exportCampaign(campaign: Campaign) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(campaign)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `novus-${campaign.name.replace(/[^a-z0-9]/gi, "-").slice(0, 50)}.json`;
    link.click();
    toast.success(`Exported “${campaign.name}”. Keep the file somewhere safe.`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const toggleButton = menuToggle.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Tab") {
        const links = Array.from(document.querySelectorAll<HTMLElement>("#site-menu a:not(.disabled), #site-menu button"));
        const first = links[0];
        const last = links.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); menuToggle.current?.focus(); }
        else if (event.shiftKey && document.activeElement === menuToggle.current) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); menuToggle.current?.focus(); }
        else if (!event.shiftKey && document.activeElement === menuToggle.current) { event.preventDefault(); first?.focus(); }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>("#site-menu a[aria-current=page]")?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      cancelAnimationFrame(frame);
      toggleButton?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault(); setMenuOpen(false); setCommandsOpen(true);
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !menuOpen && activeSection === "#campaigns" && !openCampaign && !(event.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) {
        event.preventDefault(); searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [activeSection, menuOpen, openCampaign]);

  const showingGame = activeSection === "#new" || !!openCampaign;
  const isCollection = activeSection === "#campaigns";
  const visibleCampaigns = savedCampaigns.filter((campaign) => {
    const nation = campaign.nations[campaign.player]?.name || "";
    return `${campaign.name} ${nation}`.toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "turns" ? b.turn - a.turn : b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main
      className={`landing-page ${activeSection === "#about" ? "landing-page-about" : ""} ${showingGame ? "landing-page-game" : ""} ${playing ? "landing-page-playing" : ""} ${isCollection ? "landing-page-collection" : ""}`}
      data-menu-open={menuOpen}
      data-ambient-paused={hidden || menuOpen || settingsOpen || profileOpen || commandsOpen}
    >
      <Toaster theme="dark" position="top-center" />
      <SurfaceDetails disabled={!settings.highlights || settings.motion || settings.contrast} />
      <div className="film-grain" aria-hidden="true" />
      <a className="skip-link" href="#page-content" onClick={(event) => { event.preventDefault(); document.getElementById("page-content")?.focus(); }}>Skip to content</a>
      <AsciiBackground
        section={activeSection}
        reading={activeSection === "#about" || isCollection}
        disabled={!settings.transparency || settings.contrast}
        paused={showingGame || menuOpen || settingsOpen || profileOpen || commandsOpen}
        reduceMotion={settings.motion}
      />
      <header className="landing-header">
        <div className="landing-header-side landing-header-left">
          <IconButton
            ref={menuToggle}
            className={`landing-icon-button landing-menu-toggle ${menuOpen ? "menu-toggle-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-toggle-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </IconButton>
        </div>

        <h1 className={`${wordmarkFontClassName} landing-wordmark`} inert={menuOpen}><GlowWordmark onHome={() => navigate("#home")} disabled={settings.motion || settings.contrast || reducedMotion || menuOpen} /></h1>

        <div className="landing-header-side landing-header-actions" inert={menuOpen}>
          <Popover open={profileOpen} onOpenChange={(open) => { setProfileOpen(open); if (open) void refreshCampaigns(); }}>
            <PopoverTrigger asChild>
              <button className="landing-icon-button" type="button" aria-label="Account"><UserCircle weight="fill" /></button>
            </PopoverTrigger>
            <PopoverContent className="account-menu" align="end" sideOffset={12} collisionPadding={16}>
              <AccountMenu campaignCount={savedCampaigns.length} onChange={() => void refreshCampaigns()} />
            </PopoverContent>
          </Popover>
          <IconButton
            className="landing-icon-button"
            type="button"
            aria-label="Open settings"
            onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
          >
            <GearSix weight="fill" />
          </IconButton>
        </div>
      </header>

      <button
        className="menu-backdrop"
        type="button"
        aria-label="Close menu"
        aria-hidden={!menuOpen}
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="site-menu"
        className="site-menu"
        aria-label="Page menu"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <Image
          className="site-menu-logo"
          src="/novus-logo.svg"
          width={54}
          height={54}
          alt="Novus Arbitrium logo"
        />
        <nav>
          {MENU_ITEMS.map(
            ({ label, href, icon: Icon, disabled }) => {
              const isActive = activeSection === href;

              return (
                <a
                  href={href}
                  key={label}
                  className={[
                    isActive ? "active" : "",
                    disabled ? "disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  aria-disabled={disabled || undefined}
                  tabIndex={menuOpen && !disabled ? 0 : -1}
                  onClick={(event) => {
                    if (disabled) {
                      event.preventDefault();
                      return;
                    }

                    event.preventDefault();
                    navigate(href);
                  }}
                >
                  <Icon weight="fill" />
                  <span>{label}</span>
                  {disabled && <small>SOON</small>}
                </a>
              );
            },
          )}
        </nav>
        <div className="menu-footer"><button type="button" onClick={() => { setMenuOpen(false); setCommandsOpen(true); }}><MagnifyingGlass /> Quick navigation <span className="key-chord"><kbd>Ctrl</kbd><kbd>Space</kbd></span></button></div>
      </aside>

      <div id="page-content" className="page-content" key={openCampaign?.id || activeSection} tabIndex={-1} inert={menuOpen}>
      {showingGame ? (
        <div className="landing-game-surface">
          <Game
            key={openCampaign?.id || "new"}
            launchMode={openCampaign ? "library" : "new"}
            initialCampaign={openCampaign || undefined}
            embedded
            onPlayingChange={setPlaying}
            onCampaignOpen={showCampaign}
            onExit={() => navigate("#campaigns")}
          />
        </div>
      ) : isCollection ? (
        <section className="collection-page" aria-labelledby="collection-title" data-ascii-content>
          <div className="collection-heading">
            <div>
              <h2 id="collection-title" className={greetingFontClassName}>Campaigns</h2>
              <p className="collection-slots">{currentAccount() ? `${savedCampaigns.length} of ${CAMPAIGN_SLOTS} account slots` : "On this device until you sign in"}</p>
            </div>
          </div>

          <div className="collection-tools">
              <label className="collection-search">
                <MagnifyingGlass aria-hidden="true" />
                <span className="sr-only">Search campaigns</span>
                <input
                  ref={searchInput}
                  aria-label="Search campaigns"
                  type="search"
                  placeholder="Search campaigns or nations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query ? <button type="button" aria-label="Clear campaign search" onClick={() => { setQuery(""); searchInput.current?.focus(); }}><X /></button> : <kbd aria-label="slash">/</kbd>}
              </label>
              <Choice className="collection-sort" label="Sort campaigns" value={sort} onChange={setSort} options={[{ value: "recent", label: "Last played" }, { value: "name", label: "Name A–Z" }, { value: "turns", label: "Most turns" }]} />
              <button className="outline-button collection-import" type="button" disabled={importing} onClick={() => importInput.current?.click()}>
                <UploadSimple /> {importing ? "Importing…" : "Import save"}
              </button>
            </div>

          {saveError && <p className="collection-notice collection-error" role="alert">{saveError}</p>}
          <div className="collection-list" aria-live="polite">
            {savesLoading ? (
              <div className="collection-skeleton" role="status" aria-label="Loading saved campaigns"><span /><span /><span /></div>
            ) : visibleCampaigns.length ? (
              visibleCampaigns.map((campaign, index) => {
                const nation = campaign.nations[campaign.player];
                return (
                  <article className="collection-card" key={campaign.id} style={{ "--item-index": Math.min(index, 6) } as CSSProperties}>
                    <span className="collection-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="collection-flag">
                      {nation?.flag && <Flag spec={nation.flag} iso={nation.iso} original={nation.original} />}
                    </span>
                    <div className="collection-card-main">
                      {renameId === campaign.id ? (
                        <input
                          className="collection-rename"
                          aria-label="Campaign name"
                          value={renameValue}
                          maxLength={80}
                          autoFocus
                          onChange={(event) => setRenameValue(event.target.value)}
                          onBlur={() => void renameCampaign(campaign)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") setRenameId("");
                          }}
                        />
                      ) : (
                        <h3>{campaign.name}</h3>
                      )}
                      <p>{nation?.name || "Dissolved nation"} <span>·</span> Turn {campaign.turn}</p>
                      <small>{formatDate(campaign.date)} <span aria-hidden="true">·</span> Played {new Date(campaign.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</small>
                    </div>
                    <div className="collection-card-actions">
                      <button className="collection-continue" type="button" onClick={() => showCampaign(campaign)}>
                        Continue <ArrowRight aria-hidden="true" />
                      </button>
                      <IconButton className="collection-icon" type="button" aria-label={`Rename ${campaign.name}`} onClick={() => { setRenameId(campaign.id); setRenameValue(campaign.name); }}><PencilSimple /></IconButton>
                      <IconButton className="collection-icon" type="button" aria-label={`Export ${campaign.name}`} onClick={() => exportCampaign(campaign)}><DownloadSimple /></IconButton>
                      <IconButton className="collection-icon" type="button" aria-label={`Delete ${campaign.name}`} onClick={() => setDeleteId(campaign.id)}><Trash /></IconButton>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="collection-empty">
                <Stack aria-hidden="true" />
                <h3>{query ? "No matching campaigns" : "No saved campaigns yet"}</h3>
                <p>{query ? "Try another name or nation." : "Your next timeline starts here."}</p>
                {!!query && <button type="button" onClick={() => { setQuery(""); searchInput.current?.focus(); }}>Clear search <X /></button>}
              </div>
            )}
          </div>
        </section>
      ) : activeSection === "#about" ? (
        <section id="about" className="about-page" aria-labelledby="about-title" data-ascii-content>
          <h2 id="about-title" className={greetingFontClassName}>A world shaped by every decision.</h2>
          <p className="about-intro">
            Novus Arbitrium is an alternate-history strategy experience created
            by Carter Geoco. Lead a nation, make consequential choices, and
            watch an unwritten timeline take shape.
          </p>

          <div className="about-grid">
            <article>
              <span>01</span>
              <h3>The creator</h3>
              <p>
                Designed and developed by Carter Geoco as an experiment in
                open-ended strategy, cartography, and interactive storytelling.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>How it was made</h3>
              <p>
                Built with Next.js, React, TypeScript, Leaflet, and a
                configurable world engine. Sign in to keep five campaigns on
                your account.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Getting started</h3>
              <p>
                Choose New to select a nation and begin a timeline. Use Campaigns
                to browse every saved world.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>Help & privacy</h3>
              <p>
                Settings controls simulation, appearance, audio, and AI
                providers. Account campaigns stay with your username. Without
                an account, saves stay in this browser until you export them.
              </p>
            </article>
          </div>
          <button className="back-to-top" type="button" onClick={() => { document.querySelector<HTMLElement>(".page-content")?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: settings.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}>Back to top <ArrowUp /></button>
        </section>
      ) : (
        <section id="home" className="greeting-stage" aria-label="Greetings">
          <p className={`${greetingFontClassName} greeting-text`} aria-hidden="true" data-ascii-content>
            {visibleText}
            <span className="typing-cursor" />
          </p>
          <span className="sr-only">Hello. Welcome to Novus Arbitrium.</span>
          <div className="home-invitation">
            <span>A world of consequence</span>
            <button
              type="button"
              className="outline-button begin-button"
              onClick={() => savedCampaigns[0] ? showCampaign(savedCampaigns[0]) : navigate("#new")}
            >
              <span>{savedCampaigns[0] ? "Continue your timeline" : "Begin a timeline"}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
      </div>
      {!showingGame && (
        <footer className="home-footer">
          <i className="tiny-seal" aria-hidden="true" />
        </footer>
      )}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={(open) => { setSettingsOpen(open); if (open) setProfileOpen(false); }}
        settings={settings}
        onChange={setSettings}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />

      <Dialog open={commandsOpen} onOpenChange={setCommandsOpen}>
        <DialogContent className="quick-nav-dialog">
          <DialogTitle className="sr-only">Quick navigation</DialogTitle>
          <DialogDescription className="sr-only">Search pages and saved campaigns. Press Ctrl and Space to open, use arrow keys to choose, and Enter to open.</DialogDescription>
          <Command>
            <CommandInput placeholder="Where would you like to go?" aria-label="Search pages and campaigns" />
            <CommandList>
              <CommandEmpty>No matches. Try a page or campaign name.</CommandEmpty>
              <CommandGroup heading="PAGES">
                {MENU_ITEMS.filter((item) => !item.disabled).map(({ label, href, icon: Icon }) => <CommandItem key={href} value={label} onSelect={() => navigate(href)}><Icon />{label}<ArrowRight className="command-arrow" /></CommandItem>)}
                <CommandItem onSelect={() => { setCommandsOpen(false); setProfileOpen(false); requestAnimationFrame(() => setSettingsOpen(true)); }}><GearSix />Settings</CommandItem>
                <CommandItem onSelect={() => { setCommandsOpen(false); requestAnimationFrame(() => setProfileOpen(true)); }}><UserCircle />Account</CommandItem>
              </CommandGroup>
              {!!savedCampaigns.length && <CommandGroup heading="YOUR TIMELINES">{savedCampaigns.slice(0, 8).map((campaign) => <CommandItem key={campaign.id} value={`${campaign.id} ${campaign.name} ${campaign.nations[campaign.player]?.name || ""}`} onSelect={() => showCampaign(campaign)}><BookOpenText /><span>{campaign.name}</span><small>Turn {campaign.turn}</small></CommandItem>)}</CommandGroup>}
            </CommandList>
          </Command>
          <div className="command-footer"><span><KeyHint name="up" label="Up" /><KeyHint name="down" label="Down" /> to move</span><span><KeyHint name="enter" label="Enter" /> to open</span><span><KeyHint name="esc" label="Escape" /> to close</span></div>
        </DialogContent>
      </Dialog>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importCampaign(file);
          event.currentTarget.value = "";
        }}
      />
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId("")}>
        <AlertDialogContent className="collection-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>{currentAccount() ? "This frees one of your five account slots." : "This removes the save from this device. Export it first if you want to keep the timeline."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await deleteCampaign(deleteId);
                setSavedCampaigns((current) => current.filter((campaign) => campaign.id !== deleteId));
                toast.success("Campaign deleted.");
              } catch {
                toast.error("Could not delete this campaign.");
              } finally {
                setDeleteId("");
              }
            }}>Delete campaign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

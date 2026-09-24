"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  BookOpenText,
  ClockCounterClockwise,
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
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Flag from "@/components/Flag";
import SettingsPanel from "@/components/Settings";
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
  defaults,
  formatDate,
  type Campaign,
  type Settings as SettingsType,
} from "@/lib/game";
import { campaigns, deleteCampaign, saveCampaign } from "@/lib/storage";
import { parseCampaign, parseSettings } from "@/lib/validation";

const Game = dynamic(() => import("@/components/Game"), { ssr: false });

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
    label: "Recent",
    href: "#recent",
    icon: ClockCounterClockwise,
  },
  {
    label: "Library",
    href: "#library",
    icon: BookOpenText,
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
  fontClassName: string;
};

export default function LandingPage({ fontClassName }: LandingPageProps) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const [openCampaign, setOpenCampaign] = useState<Campaign | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savedCampaigns, setSavedCampaigns] = useState<Campaign[]>([]);
  const [savesLoading, setSavesLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<SettingsType>(() => {
    if (typeof window === "undefined") return defaults;

    try {
      const saved = JSON.parse(
        window.localStorage.getItem("novus-settings") || "null",
      );
      return saved ? parseSettings(saved) : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      const reducedMotionTimer = window.setTimeout(
        () => setVisibleText(GREETINGS[0]),
        0,
      );
      return () => window.clearTimeout(reducedMotionTimer);
    }

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
  }, [deleting, greetingIndex, visibleText]);

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
    const updateSection = () => {
      const hash = window.location.hash;
      setActiveSection(MENU_ITEMS.some((item) => item.href === hash && !item.disabled) ? hash : "#home");
      setOpenCampaign(null);
      void refreshCampaigns();
    };
    updateSection();
    window.addEventListener("popstate", updateSection);
    window.addEventListener("hashchange", updateSection);
    return () => {
      window.removeEventListener("popstate", updateSection);
      window.removeEventListener("hashchange", updateSection);
    };
  }, [refreshCampaigns]);

  const navigate = (section: string) => {
    window.history.pushState(null, "", section);
    setActiveSection(section);
    setOpenCampaign(null);
    setMenuOpen(false);
    setNotice("");
    if (section === "#recent" || section === "#library") {
      setSavesLoading(true);
      void refreshCampaigns();
    }
  };

  async function importCampaign(file: File) {
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
      setNotice(`Imported “${copy.name}” into your library.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import this campaign.");
    }
  }

  function exportCampaign(campaign: Campaign) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(campaign)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `novus-${campaign.name.replace(/[^a-z0-9]/gi, "-").slice(0, 50)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
    document.documentElement.dataset.contrast = String(settings.contrast);
    document.documentElement.dataset.motion = String(settings.motion);
    document.documentElement.dataset.transparency = String(
      settings.transparency,
    );
    try {
      window.localStorage.setItem(
        "novus-settings",
        JSON.stringify(settings),
      );
    } catch {}
  }, [settings]);

  const showingGame = activeSection === "#new" || !!openCampaign;
  const isCollection = activeSection === "#recent" || activeSection === "#library";
  const visibleCampaigns = activeSection === "#recent"
    ? savedCampaigns.slice(0, 5)
    : savedCampaigns.filter((campaign) => {
        const nation = campaign.nations[campaign.player]?.name || "";
        return `${campaign.name} ${nation}`.toLowerCase().includes(query.trim().toLowerCase());
      });

  return (
    <main
      className={`${fontClassName} landing-page ${activeSection === "#about" ? "landing-page-about" : ""} ${showingGame ? "landing-page-game" : ""} ${isCollection ? "landing-page-collection" : ""}`}
      data-menu-open={menuOpen}
    >
      <header className="landing-header">
        <div className="landing-header-side landing-header-left">
          <button
            className={`landing-icon-button landing-menu-toggle ${menuOpen ? "menu-toggle-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            title="Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-toggle-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        <h1 className="landing-wordmark">Novus Arbitrium</h1>

        <div className="landing-header-side landing-header-actions">
          <button
            className="landing-icon-button"
            type="button"
            aria-label="Open user profile"
            title="User profile"
            onClick={() => setProfileOpen(true)}
          >
            <UserCircle weight="fill" />
          </button>
          <button
            className="landing-icon-button"
            type="button"
            aria-label="Open settings"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <GearSix weight="fill" />
          </button>
        </div>
      </header>

      <button
        className="menu-backdrop"
        type="button"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="site-menu"
        className="site-menu"
        aria-label="Page menu"
        aria-hidden={!menuOpen}
      >
        <Image
          className="site-menu-logo"
          src="/novus-logo.png"
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
      </aside>

      {showingGame ? (
        <div className="landing-game-surface">
          <Game
            key={openCampaign?.id || "new"}
            launchMode={openCampaign ? "library" : "new"}
            initialCampaign={openCampaign || undefined}
            embedded
            onExit={() => {
              if (activeSection === "#new") navigate("#library");
              else {
                setOpenCampaign(null);
                void refreshCampaigns();
              }
            }}
          />
        </div>
      ) : isCollection ? (
        <section className="collection-page" aria-labelledby="collection-title">
          <div className="collection-heading">
            <div>
              <p className="about-eyebrow">YOUR WORLDS / {activeSection === "#recent" ? "RECENT" : "LIBRARY"}</p>
              <h2 id="collection-title">{activeSection === "#recent" ? "Recent timelines." : "Your library."}</h2>
              <p className="collection-intro">
                {activeSection === "#recent"
                  ? "Pick up where you left off. Your latest five campaigns appear here."
                  : "Every saved world, ready when you are."}
              </p>
            </div>
            <button className="collection-primary" type="button" onClick={() => navigate("#new")}>
              <Plus weight="bold" /> New campaign
            </button>
          </div>

          {activeSection === "#library" && (
            <div className="collection-tools">
              <label className="collection-search">
                <span className="sr-only">Search campaigns</span>
                <input
                  type="search"
                  placeholder="Search campaigns or nations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => importInput.current?.click()}>
                <UploadSimple /> Import save
              </button>
            </div>
          )}

          {notice && <p className="collection-notice" role="status">{notice}</p>}
          {saveError && <p className="collection-notice collection-error" role="alert">{saveError}</p>}
          <div className="collection-list" aria-live="polite">
            {savesLoading ? (
              <p className="collection-empty">Loading saved campaigns…</p>
            ) : visibleCampaigns.length ? (
              visibleCampaigns.map((campaign, index) => {
                const nation = campaign.nations[campaign.player];
                return (
                  <article className="collection-card" key={campaign.id}>
                    <span className="collection-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="collection-flag">
                      {nation?.flag && <Flag spec={nation.flag} iso={nation.iso} original={nation.original} />}
                    </span>
                    <div className="collection-card-main">
                      <h3>{campaign.name}</h3>
                      <p>{nation?.name || "Dissolved nation"} <span>·</span> {formatDate(campaign.date)} <span>·</span> Turn {campaign.turn}</p>
                      <small>LAST PLAYED {new Date(campaign.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }).toUpperCase()}</small>
                    </div>
                    <div className="collection-card-actions">
                      <button className="collection-continue" type="button" onClick={() => setOpenCampaign(campaign)}>
                        Continue <ArrowRight />
                      </button>
                      <button className="collection-icon" type="button" aria-label={`Export ${campaign.name}`} title="Export campaign" onClick={() => exportCampaign(campaign)}><DownloadSimple /></button>
                      <button className="collection-icon" type="button" aria-label={`Delete ${campaign.name}`} title="Delete campaign" onClick={() => setDeleteId(campaign.id)}><Trash /></button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="collection-empty">
                <BookOpenText aria-hidden="true" />
                <h3>{query && activeSection === "#library" ? "No matching campaigns" : "No saved campaigns yet"}</h3>
                <p>{query && activeSection === "#library" ? "Try another name or nation." : "Begin a new timeline and it will appear here automatically."}</p>
                {!query && <button type="button" onClick={() => navigate("#new")}>Create a campaign <ArrowRight /></button>}
              </div>
            )}
          </div>
          {activeSection === "#recent" && savedCampaigns.length > 5 && (
            <button className="collection-view-all" type="button" onClick={() => navigate("#library")}>View all {savedCampaigns.length} campaigns <ArrowRight /></button>
          )}
          <p className="collection-footnote">Campaigns are stored on this device.</p>
        </section>
      ) : activeSection === "#about" ? (
        <section id="about" className="about-page" aria-labelledby="about-title">
          <p className="about-eyebrow">ABOUT THE PROJECT</p>
          <h2 id="about-title">A world shaped by every decision.</h2>
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
                configurable world engine. Campaigns remain stored locally on
                your device.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Getting started</h3>
              <p>
                Choose New to select a nation and begin a timeline. Use Recent
                for your latest campaigns or Library to browse every saved
                world.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>Help & privacy</h3>
              <p>
                Settings controls simulation, appearance, audio, and AI
                providers. Saves stay in this browser unless you explicitly
                export them.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <section id="home" className="greeting-stage" aria-label="Greetings">
          <p className="greeting-text" aria-hidden="true">
            {visibleText}
            <span className="typing-cursor" />
          </p>
          <span className="sr-only">{GREETINGS[greetingIndex]}</span>
        </section>
      )}

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={setSettings}
        apiKey={apiKey}
        setApiKey={setApiKey}
        tokens={0}
      />

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="landing-account-dialog">
          <div className="account-logo">
            <Image
              src="/novus-logo.png"
              width={64}
              height={64}
              alt=""
              aria-hidden="true"
            />
          </div>
          <DialogTitle>Local player</DialogTitle>
          <DialogDescription>
            Your timelines live on this device.
          </DialogDescription>
          <p className="account-summary">
            {savedCampaigns.length} saved{" "}
            {savedCampaigns.length === 1 ? "campaign" : "campaigns"}. No separate
            account is needed.
          </p>
          <button
            className="account-close-button"
            type="button"
            onClick={() => setProfileOpen(false)}
          >
            Done
          </button>
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
            <AlertDialogDescription>This removes the save from this device. Export it first if you want to keep the timeline.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await deleteCampaign(deleteId);
                setSavedCampaigns((current) => current.filter((campaign) => campaign.id !== deleteId));
                setNotice("Campaign deleted.");
              } catch {
                setNotice("Could not delete this campaign.");
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

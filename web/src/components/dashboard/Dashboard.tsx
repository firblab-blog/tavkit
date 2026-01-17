import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { useUISettingsStore } from "../../store/uiSettingsStore";
import { useQuickPanelStore } from "../../store/quickPanelStore";
import MinimalHeader from "../common/MinimalHeader";
import QuickPanel from "../common/QuickPanel";

// Landing (eager load - first page)
import WelcomeLanding from "../landing/WelcomeLanding";

// Home (eager load - common entry points)
import GMCharacterView from "../home/GMCharacterView";
import PlayerHome from "../player/PlayerHome";
import SandboxHome from "../sandbox/SandboxHome";

// Lazy load all other components
const CampaignToolkit = lazy(() => import("../campaign/CampaignToolkit"));
// Note: AdventurersRoster routes now redirect to Library tab with characters subtab
const ItemManager = lazy(() => import("../items/ItemManager"));
const ChaseManager = lazy(() => import("../chase/ChaseManager"));
const SessionChat = lazy(() => import("../chat/SessionChat"));

// Generators
const NPCGenerator = lazy(() => import("../generators/NPCGenerator"));
const MonsterGenerator = lazy(() => import("../generators/MonsterGenerator"));
const EncounterBuilder = lazy(() => import("../generators/EncounterBuilder"));
const DialogueBuilder = lazy(() => import("../generators/DialogueBuilder"));
const LocationGenerator = lazy(() => import("../generators/LocationGenerator"));
const QuestGenerator = lazy(() => import("../generators/QuestGenerator"));
const ItemGenerator = lazy(() => import("../generators/ItemGenerator"));
const RumorGenerator = lazy(() => import("../generators/RumorGenerator"));
const TavernGenerator = lazy(() => import("../generators/TavernGenerator"));
const MerchantGenerator = lazy(() => import("../generators/MerchantGenerator"));
const TrapGenerator = lazy(() => import("../generators/TrapGenerator"));
const CritterGenerator = lazy(() => import("../generators/CritterGenerator"));
const ChaseGenerator = lazy(() => import("../generators/ChaseGenerator"));

// Play Tools
const CombatTracker = lazy(() => import("../combat/CombatTracker"));
const SocialEncounters = lazy(() => import("../social/SocialEncounters"));
const TavernSession = lazy(() => import("../tavern-session/TavernSession"));
const ShoppingSession = lazy(() => import("../shopping/ShoppingSession"));

// Settings & Admin
const Settings = lazy(() => import("../settings/Settings"));
const AdminUserManagement = lazy(() => import("../admin/AdminUserManagement"));

// Tools
const ToolsPage = lazy(() => import("../tools/ToolsPage"));

// Loading fallback for lazy routes
function RouteLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-text-muted">Loading...</div>
    </div>
  );
}

/**
 * HomeWrapper - Renders the appropriate home component based on context mode.
 *
 * - GM context: GMCharacterView with tabbed interface
 * - Player context: PlayerHome with character-centric view
 */
function HomeWrapper({ contextMode }: { contextMode: "gm" | "player" }) {
  return contextMode === "gm" ? <GMCharacterView /> : <PlayerHome />;
}

/**
 * Dashboard - Route-based shell for TavKit.
 *
 * Structure:
 * 1. WelcomeLanding at /dashboard (role selection)
 * 2. GM routes at /dashboard/gm/*
 * 3. Player routes at /dashboard/player/*
 * 4. Sandbox routes at /dashboard/sandbox/*
 * 5. QuickPanel (Cmd+K)
 */
export default function Dashboard() {
  const toggleQuickPanel = useQuickPanelStore((state) => state.toggle);
  const loadFromBackend = useUISettingsStore((state) => state.loadFromBackend);
  const location = useLocation();

  // Check if we're on the landing page (exact /dashboard path)
  const isLandingPage =
    location.pathname === "/dashboard" || location.pathname === "/dashboard/";

  // Check if we're on the tools page (full-screen, no header)
  const isToolsPage = location.pathname.includes("/tools");

  useEffect(() => {
    // Load UI settings from backend on mount
    loadFromBackend();
  }, [loadFromBackend]);

  // Cmd+K / Ctrl+K keyboard shortcut for Quick Panel (only when not on landing)
  useEffect(() => {
    if (isLandingPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleQuickPanel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleQuickPanel, isLandingPage]);

  // Landing page has no header - full screen experience
  if (isLandingPage) {
    return (
      <div className="h-screen bg-background">
        <WelcomeLanding />
      </div>
    );
  }

  // Tools page has its own full-screen layout
  if (isToolsPage) {
    return (
      <>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="gm/tools" element={<ToolsPage />} />
            <Route path="player/tools" element={<ToolsPage />} />
            <Route path="sandbox/tools" element={<ToolsPage />} />
          </Routes>
        </Suspense>
        <QuickPanel />
      </>
    );
  }

  // All other pages have header + content
  return (
    <>
      <div className="h-screen bg-background">
        <MinimalHeader />
        <main className="h-full overflow-auto pt-14">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Landing - Role Selection */}
              <Route index element={<WelcomeLanding />} />

              {/* GM Mode */}
              <Route path="gm" element={<HomeWrapper contextMode="gm" />} />
              <Route path="gm/campaign" element={<CampaignToolkit />} />
              {/* Redirect legacy characters route to Library tab */}
              <Route
                path="gm/characters"
                element={
                  <Navigate
                    to="/dashboard/gm?tab=library&subtab=characters"
                    replace
                  />
                }
              />
              <Route path="gm/items" element={<ItemManager />} />
              {/* Redirect legacy saved content route to Library tab */}
              <Route
                path="gm/saved"
                element={<Navigate to="/dashboard/gm?tab=library" replace />}
              />
              <Route path="gm/chase" element={<ChaseManager />} />
              <Route path="gm/chat" element={<SessionChat />} />

              {/* GM Generators */}
              <Route path="gm/generator/npc" element={<NPCGenerator />} />
              <Route
                path="gm/generator/monster"
                element={<MonsterGenerator />}
              />
              <Route
                path="gm/generator/encounter"
                element={<EncounterBuilder />}
              />
              <Route
                path="gm/generator/dialogue"
                element={<DialogueBuilder />}
              />
              <Route
                path="gm/generator/location"
                element={<LocationGenerator />}
              />
              <Route path="gm/generator/quest" element={<QuestGenerator />} />
              <Route path="gm/generator/item" element={<ItemGenerator />} />
              <Route path="gm/generator/rumor" element={<RumorGenerator />} />
              <Route path="gm/generator/tavern" element={<TavernGenerator />} />
              <Route
                path="gm/generator/merchant"
                element={<MerchantGenerator />}
              />
              <Route path="gm/generator/trap" element={<TrapGenerator />} />
              <Route
                path="gm/generator/critter"
                element={<CritterGenerator />}
              />
              <Route path="gm/generator/chase" element={<ChaseGenerator />} />

              {/* GM Play Tools */}
              <Route path="gm/combat" element={<CombatTracker />} />
              <Route path="gm/social" element={<SocialEncounters />} />
              <Route path="gm/tavern-session" element={<TavernSession />} />
              <Route path="gm/shopping" element={<ShoppingSession />} />

              {/* Settings (context-neutral) */}
              <Route path="settings" element={<Settings />} />
              <Route path="settings/users" element={<AdminUserManagement />} />

              {/* Player Mode */}
              <Route
                path="player"
                element={<HomeWrapper contextMode="player" />}
              />
              {/* Redirect legacy characters route to Library tab */}
              <Route
                path="player/characters"
                element={
                  <Navigate
                    to="/dashboard/player?tab=library&subtab=characters"
                    replace
                  />
                }
              />
              {/* Redirect legacy saved content route to Player home */}
              <Route
                path="player/saved"
                element={<Navigate to="/dashboard/player" replace />}
              />
              <Route path="player/chat" element={<SessionChat />} />

              {/* Player Generators */}
              <Route path="player/generator/npc" element={<NPCGenerator />} />
              <Route
                path="player/generator/location"
                element={<LocationGenerator />}
              />
              <Route path="player/generator/item" element={<ItemGenerator />} />
              <Route
                path="player/generator/quest"
                element={<QuestGenerator />}
              />

              {/* Sandbox Mode - Personal Library */}
              <Route path="sandbox" element={<SandboxHome />} />
              {/* Redirect legacy characters route to Library tab */}
              <Route
                path="sandbox/characters"
                element={
                  <Navigate
                    to="/dashboard/sandbox?tab=library&subtab=characters"
                    replace
                  />
                }
              />
              {/* Redirect legacy saved content route to Sandbox home */}
              <Route
                path="sandbox/saved"
                element={<Navigate to="/dashboard/sandbox" replace />}
              />

              {/* Sandbox Generators */}
              <Route path="sandbox/generator/npc" element={<NPCGenerator />} />
              <Route
                path="sandbox/generator/monster"
                element={<MonsterGenerator />}
              />
              <Route
                path="sandbox/generator/encounter"
                element={<EncounterBuilder />}
              />
              <Route
                path="sandbox/generator/dialogue"
                element={<DialogueBuilder />}
              />
              <Route
                path="sandbox/generator/location"
                element={<LocationGenerator />}
              />
              <Route
                path="sandbox/generator/quest"
                element={<QuestGenerator />}
              />
              <Route
                path="sandbox/generator/item"
                element={<ItemGenerator />}
              />
              <Route
                path="sandbox/generator/rumor"
                element={<RumorGenerator />}
              />
              <Route
                path="sandbox/generator/tavern"
                element={<TavernGenerator />}
              />
              <Route
                path="sandbox/generator/merchant"
                element={<MerchantGenerator />}
              />
              <Route
                path="sandbox/generator/trap"
                element={<TrapGenerator />}
              />
              <Route
                path="sandbox/generator/critter"
                element={<CritterGenerator />}
              />
              <Route
                path="sandbox/generator/chase"
                element={<ChaseGenerator />}
              />

              {/* Fallback - go to landing */}
              <Route path="*" element={<WelcomeLanding />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      {/* Quick Panel - Command Palette accessible via Cmd+K */}
      <QuickPanel />
    </>
  );
}

import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useUISettingsStore } from '../../store/uiSettingsStore'
import { useQuickPanelStore } from '../../store/quickPanelStore'
import MinimalHeader from '../common/MinimalHeader'
import QuickPanel from '../common/QuickPanel'

// Landing
import WelcomeLanding from '../landing/WelcomeLanding'

// Home
import GMCharacterView from '../home/GMCharacterView'

// Player & Sandbox
import PlayerHome from '../player/PlayerHome'
import SandboxHome from '../sandbox/SandboxHome'

/**
 * HomeWrapper - Renders the appropriate home component based on context mode.
 *
 * - GM context: GMCharacterView with tabbed interface
 * - Player context: PlayerHome with character-centric view
 */
function HomeWrapper({ contextMode }: { contextMode: 'gm' | 'player' }) {
  return contextMode === 'gm' ? <GMCharacterView /> : <PlayerHome />
}

// Campaign Tools
import CampaignToolkit from '../campaign/CampaignToolkit'
import AdventurersRoster from '../character/AdventurersRoster'
import ItemManager from '../items/ItemManager'
import ChaseManager from '../chase/ChaseManager'
import SessionChat from '../chat/SessionChat'

// Note: SavedContent route now redirects to Library tab
// import SavedContent from '../SavedContent' // DEPRECATED - use Library tab

// Generators
import NPCGenerator from '../generators/NPCGenerator'
import MonsterGenerator from '../generators/MonsterGenerator'
import EncounterBuilder from '../generators/EncounterBuilder'
import DialogueBuilder from '../generators/DialogueBuilder'
import LocationGenerator from '../generators/LocationGenerator'
import QuestGenerator from '../generators/QuestGenerator'
import ItemGenerator from '../generators/ItemGenerator'
import RumorGenerator from '../generators/RumorGenerator'
import TavernGenerator from '../generators/TavernGenerator'
import MerchantGenerator from '../generators/MerchantGenerator'
import TrapGenerator from '../generators/TrapGenerator'
import CritterGenerator from '../generators/CritterGenerator'
import ChaseGenerator from '../generators/ChaseGenerator'

// Play Tools
import CombatTracker from '../combat/CombatTracker'
import SocialEncounters from '../social/SocialEncounters'
import TavernSession from '../tavern-session/TavernSession'
import ShoppingSession from '../shopping/ShoppingSession'

// Settings & Admin
import Settings from '../settings/Settings'
import AdminUserManagement from '../admin/AdminUserManagement'

// Tools
import ToolsPage from '../tools/ToolsPage'

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
  const toggleQuickPanel = useQuickPanelStore((state) => state.toggle)
  const loadFromBackend = useUISettingsStore((state) => state.loadFromBackend)
  const location = useLocation()

  // Check if we're on the landing page (exact /dashboard path)
  const isLandingPage = location.pathname === '/dashboard' || location.pathname === '/dashboard/'

  // Check if we're on the tools page (full-screen, no header)
  const isToolsPage = location.pathname.includes('/tools')

  useEffect(() => {
    // Load UI settings from backend on mount
    loadFromBackend()
  }, [loadFromBackend])

  // Cmd+K / Ctrl+K keyboard shortcut for Quick Panel (only when not on landing)
  useEffect(() => {
    if (isLandingPage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleQuickPanel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleQuickPanel, isLandingPage])

  // Landing page has no header - full screen experience
  if (isLandingPage) {
    return (
      <div className="h-screen bg-background">
        <WelcomeLanding />
      </div>
    )
  }

  // Tools page has its own full-screen layout
  if (isToolsPage) {
    return (
      <>
        <Routes>
          <Route path="gm/tools" element={<ToolsPage />} />
          <Route path="player/tools" element={<ToolsPage />} />
          <Route path="sandbox/tools" element={<ToolsPage />} />
        </Routes>
        <QuickPanel />
      </>
    )
  }

  // All other pages have header + content
  return (
    <>
      <div className="h-screen bg-background">
        <MinimalHeader />
        <main className="h-full overflow-auto pt-14">
          <Routes>
            {/* Landing - Role Selection */}
            <Route index element={<WelcomeLanding />} />

            {/* GM Mode */}
            <Route path="gm" element={<HomeWrapper contextMode="gm" />} />
            <Route path="gm/campaign" element={<CampaignToolkit />} />
            <Route path="gm/characters" element={<AdventurersRoster />} />
            <Route path="gm/items" element={<ItemManager />} />
            {/* Redirect legacy saved content route to Library tab */}
            <Route path="gm/saved" element={<Navigate to="/dashboard/gm?tab=library" replace />} />
            <Route path="gm/chase" element={<ChaseManager />} />
            <Route path="gm/chat" element={<SessionChat />} />

            {/* GM Generators */}
            <Route path="gm/generator/npc" element={<NPCGenerator />} />
            <Route path="gm/generator/monster" element={<MonsterGenerator />} />
            <Route path="gm/generator/encounter" element={<EncounterBuilder />} />
            <Route path="gm/generator/dialogue" element={<DialogueBuilder />} />
            <Route path="gm/generator/location" element={<LocationGenerator />} />
            <Route path="gm/generator/quest" element={<QuestGenerator />} />
            <Route path="gm/generator/item" element={<ItemGenerator />} />
            <Route path="gm/generator/rumor" element={<RumorGenerator />} />
            <Route path="gm/generator/tavern" element={<TavernGenerator />} />
            <Route path="gm/generator/merchant" element={<MerchantGenerator />} />
            <Route path="gm/generator/trap" element={<TrapGenerator />} />
            <Route path="gm/generator/critter" element={<CritterGenerator />} />
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
            <Route path="player" element={<HomeWrapper contextMode="player" />} />
            <Route path="player/characters" element={<AdventurersRoster />} />
            {/* Redirect legacy saved content route to Player home */}
            <Route path="player/saved" element={<Navigate to="/dashboard/player" replace />} />
            <Route path="player/chat" element={<SessionChat />} />

            {/* Player Generators */}
            <Route path="player/generator/npc" element={<NPCGenerator />} />
            <Route path="player/generator/location" element={<LocationGenerator />} />
            <Route path="player/generator/item" element={<ItemGenerator />} />
            <Route path="player/generator/quest" element={<QuestGenerator />} />

            {/* Sandbox Mode - Personal Library */}
            <Route path="sandbox" element={<SandboxHome />} />
            {/* Redirect legacy saved content route to Sandbox home */}
            <Route path="sandbox/saved" element={<Navigate to="/dashboard/sandbox" replace />} />

            {/* Sandbox Generators */}
            <Route path="sandbox/generator/npc" element={<NPCGenerator />} />
            <Route path="sandbox/generator/monster" element={<MonsterGenerator />} />
            <Route path="sandbox/generator/encounter" element={<EncounterBuilder />} />
            <Route path="sandbox/generator/dialogue" element={<DialogueBuilder />} />
            <Route path="sandbox/generator/location" element={<LocationGenerator />} />
            <Route path="sandbox/generator/quest" element={<QuestGenerator />} />
            <Route path="sandbox/generator/item" element={<ItemGenerator />} />
            <Route path="sandbox/generator/rumor" element={<RumorGenerator />} />
            <Route path="sandbox/generator/tavern" element={<TavernGenerator />} />
            <Route path="sandbox/generator/merchant" element={<MerchantGenerator />} />
            <Route path="sandbox/generator/trap" element={<TrapGenerator />} />
            <Route path="sandbox/generator/critter" element={<CritterGenerator />} />
            <Route path="sandbox/generator/chase" element={<ChaseGenerator />} />

            {/* Fallback - go to landing */}
            <Route path="*" element={<WelcomeLanding />} />
          </Routes>
        </main>
      </div>
      {/* Quick Panel - Command Palette accessible via Cmd+K */}
      <QuickPanel />
    </>
  )
}

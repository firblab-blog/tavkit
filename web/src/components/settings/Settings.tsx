import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../common/Icon";
import type { IconName } from "../common/Icon";
import AppearanceSettings from "./AppearanceSettings";
import GeneratorSettings from "./GeneratorSettings";
import ToolSettings from "./ToolSettings";
import AISettings from "./AISettings";
import CampaignSettings from "./CampaignSettings";
import GMSettings from "./GMSettings";
import PlayerModeSettings from "./PlayerModeSettings";
import LibrarySettings from "./LibrarySettings";
import AdminSettings from "./AdminSettings";
import { useAuthStore } from "../../store/authStore";

interface SettingsTab {
  id: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

const TABS: SettingsTab[] = [
  { id: "appearance", label: "Appearance", icon: "Palette" },
  { id: "gm-mode", label: "GM Mode", icon: "Crown" },
  { id: "player-mode", label: "Player Mode", icon: "User" },
  { id: "library", label: "Library", icon: "Library" },
  { id: "generators", label: "Generators", icon: "Sparkles" },
  { id: "tools", label: "Tools", icon: "Wrench" },
  { id: "ai", label: "AI", icon: "Sparkles" },
  { id: "campaign", label: "Campaign", icon: "BookMarked" },
  { id: "admin", label: "Admin", icon: "Settings", adminOnly: true },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("appearance");

  const isAdmin = user?.is_admin ?? false;
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  const renderTabContent = () => {
    switch (activeTab) {
      case "appearance":
        return <AppearanceSettings />;
      case "gm-mode":
        return <GMSettings />;
      case "player-mode":
        return <PlayerModeSettings />;
      case "library":
        return <LibrarySettings />;
      case "generators":
        return <GeneratorSettings />;
      case "tools":
        return <ToolSettings />;
      case "ai":
        return <AISettings />;
      case "campaign":
        return <CampaignSettings />;
      case "admin":
        return isAdmin ? <AdminSettings /> : null;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background-panel px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
          >
            <Icon name="ArrowLeft" className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">Settings</h1>
            <p className="text-sm text-text-muted">
              Manage your preferences and configuration
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Navigation */}
        <nav className="w-48 flex-shrink-0 border-r border-border bg-background-panel p-3 overflow-y-auto hidden md:block">
          <div className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text hover:bg-background"
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile Tab Bar */}
        <div className="md:hidden border-b border-border bg-background-panel px-4 py-2 overflow-x-auto flex-shrink-0">
          <div className="flex gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-background"
                    : "text-text-muted hover:text-text bg-background"
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}

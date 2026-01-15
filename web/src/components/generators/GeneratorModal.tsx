/**
 * GeneratorModal - Modal wrapper for AI generators.
 *
 * This component allows generators to be opened as modals from anywhere in the app
 * (Library tab, CategoryModal, etc.) without requiring navigation.
 */
import { useEffect } from "react";
import {
  useGeneratorModalStore,
  GeneratorType,
} from "../../store/generatorModalStore";
import Icon, { IconName } from "../common/Icon";

// Lazy import generators to avoid circular dependencies
import NPCGenerator from "./NPCGenerator";
import MonsterGenerator from "./MonsterGenerator";
import EncounterBuilder from "./EncounterBuilder";
import DialogueBuilder from "./DialogueBuilder";
import LocationGenerator from "./LocationGenerator";
import QuestGenerator from "./QuestGenerator";
import ItemGenerator from "./ItemGenerator";
import RumorGenerator from "./RumorGenerator";
import TavernGenerator from "./TavernGenerator";
import MerchantGenerator from "./MerchantGenerator";
import TrapGenerator from "./TrapGenerator";
import CritterGenerator from "./CritterGenerator";
import ChaseGenerator from "./ChaseGenerator";

interface GeneratorConfig {
  component: React.ComponentType;
  title: string;
  icon: IconName;
}

const GENERATOR_CONFIGS: Record<GeneratorType, GeneratorConfig> = {
  npc: { component: NPCGenerator, title: "NPC Generator", icon: "Users" },
  monster: {
    component: MonsterGenerator,
    title: "Monster Generator",
    icon: "Skull",
  },
  encounter: {
    component: EncounterBuilder,
    title: "Encounter Builder",
    icon: "Swords",
  },
  dialogue: {
    component: DialogueBuilder,
    title: "Dialogue Builder",
    icon: "MessageSquare",
  },
  location: {
    component: LocationGenerator,
    title: "Location Generator",
    icon: "MapPin",
  },
  quest: {
    component: QuestGenerator,
    title: "Quest Generator",
    icon: "Scroll",
  },
  item: { component: ItemGenerator, title: "Item Generator", icon: "Package" },
  rumor: {
    component: RumorGenerator,
    title: "Rumor Generator",
    icon: "MessageCircle",
  },
  tavern: {
    component: TavernGenerator,
    title: "Tavern Generator",
    icon: "Beer",
  },
  merchant: {
    component: MerchantGenerator,
    title: "Merchant Generator",
    icon: "Store",
  },
  trap: {
    component: TrapGenerator,
    title: "Trap Generator",
    icon: "AlertTriangle",
  },
  critter: {
    component: CritterGenerator,
    title: "Critter Generator",
    icon: "PawPrint",
  },
  chase: { component: ChaseGenerator, title: "Chase Generator", icon: "Route" },
};

export default function GeneratorModal() {
  const { isOpen, generatorType, closeGenerator } = useGeneratorModalStore();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeGenerator();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeGenerator]);

  if (!isOpen || !generatorType) {
    return null;
  }

  const config = GENERATOR_CONFIGS[generatorType];
  const GeneratorComponent = config.component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={closeGenerator}
      />

      {/* Modal Container */}
      <div className="relative w-full h-full max-w-7xl max-h-[95vh] m-4 bg-background rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background-panel">
          <div className="flex items-center gap-3">
            <Icon name={config.icon} className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-text">{config.title}</h2>
          </div>
          <button
            onClick={closeGenerator}
            className="p-2 hover:bg-background rounded-lg transition-colors text-text-muted hover:text-text"
            title="Close (Esc)"
          >
            <Icon name="X" className="w-5 h-5" />
          </button>
        </div>

        {/* Generator Content */}
        <div className="flex-1 overflow-hidden">
          <GeneratorComponent />
        </div>
      </div>
    </div>
  );
}

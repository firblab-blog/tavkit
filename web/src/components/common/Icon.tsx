import { useUISettingsStore } from "../../store/uiSettingsStore";
import * as LucideIcons from "lucide-react";
import * as HeroIcons from "@heroicons/react/24/outline";
import * as ReactIcons from "react-icons/gi"; // Game Icons for D&D
import * as TablerIcons from "tabler-icons-react";
import * as PhosphorIcons from "phosphor-react";
import { logger } from "@/utils/logger";

// Map common icon names to their equivalents in each library
const iconMap = {
  // Navigation & UI
  Settings: {
    lucide: "Settings",
    hero: "Cog6ToothIcon",
    reactIcons: "GiGearHammer",
    tabler: "Settings",
    phosphor: "GearSix",
  },
  Palette: {
    lucide: "Palette",
    hero: "PaintBrushIcon",
    reactIcons: "GiPalette",
    tabler: "Palette",
    phosphor: "Palette",
  },
  Monitor: {
    lucide: "Monitor",
    hero: "ComputerDesktopIcon",
    reactIcons: "GiComputing",
    tabler: "DeviceDesktop",
    phosphor: "Monitor",
  },
  Wrench: {
    lucide: "Wrench",
    hero: "WrenchIcon",
    reactIcons: "GiWrench",
    tabler: "Tool",
    phosphor: "Wrench",
  },
  Check: {
    lucide: "Check",
    hero: "CheckIcon",
    reactIcons: "GiCheckMark",
    tabler: "Check",
    phosphor: "Check",
  },
  Sun: {
    lucide: "Sun",
    hero: "SunIcon",
    reactIcons: "GiSun",
    tabler: "Sun",
    phosphor: "Sun",
  },
  Moon: {
    lucide: "Moon",
    hero: "MoonIcon",
    reactIcons: "GiMoon",
    tabler: "Moon",
    phosphor: "Moon",
  },
  X: {
    lucide: "X",
    hero: "XMarkIcon",
    reactIcons: "GiCrossMark",
    tabler: "X",
    phosphor: "X",
  },
  DoorExit: {
    lucide: "DoorOpen",
    hero: "ArrowRightOnRectangleIcon",
    reactIcons: "GiExitDoor",
    tabler: "DoorExit",
    phosphor: "SignOut",
  },
  ExternalLink: {
    lucide: "ExternalLink",
    hero: "ArrowTopRightOnSquareIcon",
    reactIcons: "GiExternalLink",
    tabler: "ExternalLink",
    phosphor: "ArrowSquareOut",
  },
  Trash2: {
    lucide: "Trash2",
    hero: "TrashIcon",
    reactIcons: "GiTrashCan",
    tabler: "Trash",
    phosphor: "Trash",
  },
  ArrowLeft: {
    lucide: "ArrowLeft",
    hero: "ArrowLeftIcon",
    reactIcons: "GiBackwardTime",
    tabler: "ArrowLeft",
    phosphor: "ArrowLeft",
  },
  ArrowRight: {
    lucide: "ArrowRight",
    hero: "ArrowRightIcon",
    reactIcons: "GiForwardField",
    tabler: "ArrowRight",
    phosphor: "ArrowRight",
  },
  Copy: {
    lucide: "Copy",
    hero: "DocumentDuplicateIcon",
    reactIcons: "GiDualityMask",
    tabler: "Copy",
    phosphor: "Copy",
  },
  RefreshCw: {
    lucide: "RefreshCw",
    hero: "ArrowPathIcon",
    reactIcons: "GiRecycle",
    tabler: "RefreshCw",
    phosphor: "ArrowsClockwise",
  },
  // D&D/Gaming
  Users: {
    lucide: "Users",
    hero: "UsersIcon",
    reactIcons: "GiThreeFriends",
    tabler: "Users",
    phosphor: "Users",
  },
  User: {
    lucide: "User",
    hero: "UserIcon",
    reactIcons: "GiPerson",
    tabler: "User",
    phosphor: "User",
  },
  UserCircle: {
    lucide: "UserCircle",
    hero: "UserCircleIcon",
    reactIcons: "GiBodyHeight",
    tabler: "UserCircle",
    phosphor: "UserCircle",
  },
  UserPlus: {
    lucide: "UserPlus",
    hero: "UserPlusIcon",
    reactIcons: "GiPerson",
    tabler: "UserPlus",
    phosphor: "UserPlus",
  },
  Shield: {
    lucide: "Shield",
    hero: "ShieldCheckIcon",
    reactIcons: "GiShield",
    tabler: "Shield",
    phosphor: "Shield",
  },
  Swords: {
    lucide: "Swords",
    hero: "BoltIcon",
    reactIcons: "GiCrossedSwords",
    tabler: "Swords",
    phosphor: "Sword",
  },
  MessageSquare: {
    lucide: "MessageSquare",
    hero: "ChatBubbleLeftRightIcon",
    reactIcons: "GiSpeaker",
    tabler: "MessageSquare",
    phosphor: "ChatCircle",
  },
  MessageCircle: {
    lucide: "MessageCircle",
    hero: "ChatBubbleOvalLeftIcon",
    reactIcons: "GiConversation",
    tabler: "MessageCircle",
    phosphor: "ChatCircle",
  },
  BookOpen: {
    lucide: "BookOpen",
    hero: "BookOpenIcon",
    reactIcons: "GiSpellBook",
    tabler: "BookOpen",
    phosphor: "BookOpen",
  },
  Book: {
    lucide: "Book",
    hero: "BookmarkIcon",
    reactIcons: "GiBookCover",
    tabler: "Book",
    phosphor: "Book",
  },
  BookMarked: {
    lucide: "BookMarked",
    hero: "BookmarkIcon",
    reactIcons: "GiBookmark",
    tabler: "Bookmark",
    phosphor: "BookmarkSimple",
  },
  Dices: {
    lucide: "Dices",
    hero: "CubeIcon",
    reactIcons: "GiRollingDices",
    tabler: "Dice",
    phosphor: "DiceFive",
  },
  Dice5: {
    lucide: "Dice5",
    hero: "CubeIcon",
    reactIcons: "GiPerspectiveDiceSixFacesRandom",
    tabler: "Dice5",
    phosphor: "DiceFive",
  },
  Skull: {
    lucide: "Skull",
    hero: "ExclamationTriangleIcon",
    reactIcons: "GiDeathSkull",
    tabler: "Skull",
    phosphor: "Skull",
  },
  Sparkles: {
    lucide: "Sparkles",
    hero: "SparklesIcon",
    reactIcons: "GiSparkles",
    tabler: "Stars",
    phosphor: "Sparkle",
  },
  Smile: {
    lucide: "Smile",
    hero: "FaceSmileIcon",
    reactIcons: "GiHappySkull",
    tabler: "Mood",
    phosphor: "SmileyHappy",
  },
  Meh: {
    lucide: "Meh",
    hero: "FaceFrownIcon",
    reactIcons: "GiNeutralTanks",
    tabler: "MoodNeutral",
    phosphor: "SmileyMeh",
  },
  Frown: {
    lucide: "Frown",
    hero: "FaceFrownIcon",
    reactIcons: "GiSadCrab",
    tabler: "MoodSad",
    phosphor: "SmileySad",
  },

  // Actions
  Globe: {
    lucide: "Globe",
    hero: "GlobeAltIcon",
    reactIcons: "GiWorld",
    tabler: "World",
    phosphor: "Globe",
  },
  Link: {
    lucide: "Link",
    hero: "LinkIcon",
    reactIcons: "GiChainedHeart",
    tabler: "Link",
    phosphor: "Link",
  },
  Calendar: {
    lucide: "Calendar",
    hero: "CalendarIcon",
    reactIcons: "GiCalendar",
    tabler: "Calendar",
    phosphor: "Calendar",
  },
  Beer: {
    lucide: "Beer",
    hero: "BeakerIcon",
    reactIcons: "GiBeerStein",
    tabler: "Beer",
    phosphor: "BeerBottle",
  },
  Folder: {
    lucide: "Folder",
    hero: "FolderIcon",
    reactIcons: "GiFolder",
    tabler: "Folder",
    phosphor: "Folder",
  },
  FolderOpen: {
    lucide: "FolderOpen",
    hero: "FolderOpenIcon",
    reactIcons: "GiOpenFolder",
    tabler: "FolderOpen",
    phosphor: "FolderOpen",
  },
  FolderTree: {
    lucide: "FolderTree",
    hero: "FolderIcon",
    reactIcons: "GiArchiveRegister",
    tabler: "Folders",
    phosphor: "FolderSimple",
  },
  FolderInput: {
    lucide: "FolderInput",
    hero: "FolderArrowDownIcon",
    reactIcons: "GiFolder",
    tabler: "FolderPlus",
    phosphor: "FolderSimplePlus",
  },
  Library: {
    lucide: "Library",
    hero: "BuildingLibraryIcon",
    reactIcons: "GiBookshelf",
    tabler: "Library",
    phosphor: "Books",
  },
  Package: {
    lucide: "Package",
    hero: "CubeIcon",
    reactIcons: "GiCardboardBox",
    tabler: "Package",
    phosphor: "Package",
  },
  Map: {
    lucide: "Map",
    hero: "MapIcon",
    reactIcons: "GiTreasureMap",
    tabler: "Map",
    phosphor: "Map",
  },
  MapPin: {
    lucide: "MapPin",
    hero: "MapPinIcon",
    reactIcons: "GiPositionMarker",
    tabler: "MapPin",
    phosphor: "MapPin",
  },
  Scroll: {
    lucide: "ScrollText",
    hero: "DocumentTextIcon",
    reactIcons: "GiScrollQuill",
    tabler: "Scroll",
    phosphor: "Scroll",
  },
  Quote: {
    lucide: "Quote",
    hero: "ChatBubbleLeftIcon",
    reactIcons: "GiQuill",
    tabler: "Quotes",
    phosphor: "Quotes",
  },
  Loader2: {
    lucide: "Loader2",
    hero: "ArrowPathIcon",
    reactIcons: "GiArrowScope",
    tabler: "Loader",
    phosphor: "CircleNotch",
  },
  Save: {
    lucide: "Save",
    hero: "ArrowDownTrayIcon",
    reactIcons: "GiSave",
    tabler: "DeviceFloppy",
    phosphor: "FloppyDisk",
  },
  AlertCircle: {
    lucide: "AlertCircle",
    hero: "ExclamationCircleIcon",
    reactIcons: "GiMineExplosion",
    tabler: "AlertCircle",
    phosphor: "WarningCircle",
  },
  FileText: {
    lucide: "FileText",
    hero: "DocumentTextIcon",
    reactIcons: "GiScrollUnfurled",
    tabler: "FileText",
    phosphor: "FileText",
  },
  FileEdit: {
    lucide: "FileEdit",
    hero: "PencilSquareIcon",
    reactIcons: "GiQuillInk",
    tabler: "FileEdit",
    phosphor: "NotePencil",
  },
  Image: {
    lucide: "Image",
    hero: "PhotoIcon",
    reactIcons: "GiPaintedPottery",
    tabler: "Photo",
    phosphor: "Image",
  },
  Music: {
    lucide: "Music",
    hero: "MusicalNoteIcon",
    reactIcons: "GiMusicalNotes",
    tabler: "Music",
    phosphor: "MusicNote",
  },
  Box: {
    lucide: "Box",
    hero: "ArchiveBoxIcon",
    reactIcons: "GiCardboardBoxClosed",
    tabler: "Box",
    phosphor: "Package",
  },
  ListChecks: {
    lucide: "ListChecks",
    hero: "ListBulletIcon",
    reactIcons: "GiChecklist",
    tabler: "ListCheck",
    phosphor: "ListChecks",
  },
  Upload: {
    lucide: "Upload",
    hero: "ArrowUpTrayIcon",
    reactIcons: "GiUpgrade",
    tabler: "Upload",
    phosphor: "Upload",
  },
  Edit: {
    lucide: "Edit",
    hero: "PencilIcon",
    reactIcons: "GiFeatherWound",
    tabler: "Edit",
    phosphor: "PencilSimple",
  },
  Plus: {
    lucide: "Plus",
    hero: "PlusIcon",
    reactIcons: "GiCrossMark",
    tabler: "Plus",
    phosphor: "Plus",
  },
  ChevronRight: {
    lucide: "ChevronRight",
    hero: "ChevronRightIcon",
    reactIcons: "GiForwardField",
    tabler: "ChevronRight",
    phosphor: "CaretRight",
  },
  ChevronLeft: {
    lucide: "ChevronLeft",
    hero: "ChevronLeftIcon",
    reactIcons: "GiArrowLeft",
    tabler: "ChevronLeft",
    phosphor: "CaretLeft",
  },
  ChevronDown: {
    lucide: "ChevronDown",
    hero: "ChevronDownIcon",
    reactIcons: "GiArrowDown",
    tabler: "ChevronDown",
    phosphor: "CaretDown",
  },
  ChevronUp: {
    lucide: "ChevronUp",
    hero: "ChevronUpIcon",
    reactIcons: "GiArrowUp",
    tabler: "ChevronUp",
    phosphor: "CaretUp",
  },
  DotsThree: {
    lucide: "MoreHorizontal",
    hero: "EllipsisHorizontalIcon",
    reactIcons: "GiHamburgerMenu",
    tabler: "Dots",
    phosphor: "DotsThree",
  },
  Clock: {
    lucide: "Clock",
    hero: "ClockIcon",
    reactIcons: "GiClockwork",
    tabler: "Clock",
    phosphor: "Clock",
  },
  BarChart3: {
    lucide: "BarChart3",
    hero: "ChartBarIcon",
    reactIcons: "GiBarChart",
    tabler: "ChartBar",
    phosphor: "ChartBar",
  },
  Store: {
    lucide: "Store",
    hero: "BuildingStorefrontIcon",
    reactIcons: "GiShop",
    tabler: "BuildingStore",
    phosphor: "Storefront",
  },
  Eye: {
    lucide: "Eye",
    hero: "EyeIcon",
    reactIcons: "GiEyeball",
    tabler: "Eye",
    phosphor: "Eye",
  },
  EyeOff: {
    lucide: "EyeOff",
    hero: "EyeSlashIcon",
    reactIcons: "GiClosedEye",
    tabler: "EyeOff",
    phosphor: "EyeClosed",
  },
  // Chase Manager icons
  Play: {
    lucide: "Play",
    hero: "PlayIcon",
    reactIcons: "GiPlayButton",
    tabler: "PlayerPlay",
    phosphor: "Play",
  },
  Square: {
    lucide: "Square",
    hero: "StopIcon",
    reactIcons: "GiSquare",
    tabler: "Square",
    phosphor: "Square",
  },
  Flag: {
    lucide: "Flag",
    hero: "FlagIcon",
    reactIcons: "GiBanner",
    tabler: "Flag",
    phosphor: "Flag",
  },
  AlertTriangle: {
    lucide: "AlertTriangle",
    hero: "ExclamationTriangleIcon",
    reactIcons: "GiWarning",
    tabler: "AlertTriangle",
    phosphor: "Warning",
  },
  Zap: {
    lucide: "Zap",
    hero: "BoltIcon",
    reactIcons: "GiLightningBolt",
    tabler: "Bolt",
    phosphor: "Lightning",
  },
  Route: {
    lucide: "Route",
    hero: "MapIcon",
    reactIcons: "GiPathDistance",
    tabler: "Route",
    phosphor: "Path",
  },
  ListOrdered: {
    lucide: "ListOrdered",
    hero: "ListBulletIcon",
    reactIcons: "GiChecklist",
    tabler: "List",
    phosphor: "ListNumbers",
  },
  Cloud: {
    lucide: "Cloud",
    hero: "CloudIcon",
    reactIcons: "GiCloud",
    tabler: "Cloud",
    phosphor: "Cloud",
  },
  Target: {
    lucide: "Target",
    hero: "AdjustmentsVerticalIcon",
    reactIcons: "GiArcheryTarget",
    tabler: "Target",
    phosphor: "Crosshair",
  },
  Gift: {
    lucide: "Gift",
    hero: "GiftIcon",
    reactIcons: "GiGiftOfKnowledge",
    tabler: "Gift",
    phosphor: "Gift",
  },
  Info: {
    lucide: "Info",
    hero: "InformationCircleIcon",
    reactIcons: "GiInfo",
    tabler: "InfoCircle",
    phosphor: "Info",
  },
  ScrollText: {
    lucide: "ScrollText",
    hero: "DocumentTextIcon",
    reactIcons: "GiScrollQuill",
    tabler: "Scroll",
    phosphor: "Scroll",
  },
  RotateCcw: {
    lucide: "RotateCcw",
    hero: "ArrowPathIcon",
    reactIcons: "GiAnticlockwiseRotation",
    tabler: "Refresh",
    phosphor: "ArrowCounterClockwise",
  },
  PawPrint: {
    lucide: "PawPrint",
    hero: "HeartIcon",
    reactIcons: "GiPawPrint",
    tabler: "Paw",
    phosphor: "PawPrint",
  },
  Database: {
    lucide: "Database",
    hero: "CircleStackIcon",
    reactIcons: "GiDatabase",
    tabler: "Database",
    phosphor: "Database",
  },
  MoreVertical: {
    lucide: "MoreVertical",
    hero: "EllipsisVerticalIcon",
    reactIcons: "GiHamburgerMenu",
    tabler: "DotsVertical",
    phosphor: "DotsThreeVertical",
  },
  Pencil: {
    lucide: "Pencil",
    hero: "PencilIcon",
    reactIcons: "GiPencil",
    tabler: "Pencil",
    phosphor: "Pencil",
  },
  History: {
    lucide: "History",
    hero: "ClockIcon",
    reactIcons: "GiBackwardTime",
    tabler: "History",
    phosphor: "ClockCounterClockwise",
  },
  // Items & Search
  Gem: {
    lucide: "Gem",
    hero: "SparklesIcon",
    reactIcons: "GiGems",
    tabler: "Diamond",
    phosphor: "Diamond",
  },
  Search: {
    lucide: "Search",
    hero: "MagnifyingGlassIcon",
    reactIcons: "GiMagnifyingGlass",
    tabler: "Search",
    phosphor: "MagnifyingGlass",
  },
  Filter: {
    lucide: "Filter",
    hero: "FunnelIcon",
    reactIcons: "GiSettingsKnobs",
    tabler: "Filter",
    phosphor: "Funnel",
  },
  LinkSlash: {
    lucide: "Unlink",
    hero: "XMarkIcon",
    reactIcons: "GiBrokenChain",
    tabler: "Unlink",
    phosphor: "LinkBreak",
  },
  Sword: {
    lucide: "Sword",
    hero: "BoltIcon",
    reactIcons: "GiBroadsword",
    tabler: "Sword",
    phosphor: "Sword",
  },
  FlaskConical: {
    lucide: "FlaskConical",
    hero: "BeakerIcon",
    reactIcons: "GiPotionBall",
    tabler: "Flask",
    phosphor: "Flask",
  },
  Crown: {
    lucide: "Crown",
    hero: "StarIcon",
    reactIcons: "GiCrown",
    tabler: "Crown",
    phosphor: "Crown",
  },
} as const;

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export default function Icon({ name, className = "", size }: IconProps) {
  const iconSet = useUISettingsStore((state) => state.iconSet);

  const mapping = iconMap[name];
  if (!mapping) {
    logger.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  // Always use Lucide's X icon for consistency across all icon packs
  if (name === "X") {
    const LucideX = LucideIcons.X;
    return <LucideX className={className} size={size} />;
  }

  // Lucide Icons
  if (iconSet === "lucide") {
    const LucideIcon = LucideIcons[
      mapping.lucide as keyof typeof LucideIcons
    ] as any;
    if (!LucideIcon) {
      logger.warn(`Lucide icon "${mapping.lucide}" not found`);
      return null;
    }
    return <LucideIcon className={className} size={size} />;
  }

  // Heroicons
  if (iconSet === "heroicons") {
    const HeroIcon = HeroIcons[mapping.hero as keyof typeof HeroIcons] as any;
    if (!HeroIcon) {
      logger.warn(`Heroicon "${mapping.hero}" not found`);
      return null;
    }
    return (
      <HeroIcon
        className={className}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  // React Icons (Game Icons)
  if (iconSet === "react-icons") {
    const GameIcon = ReactIcons[
      mapping.reactIcons as keyof typeof ReactIcons
    ] as any;
    if (!GameIcon) {
      logger.warn(`React icon "${mapping.reactIcons}" not found`);
      return null;
    }
    return <GameIcon className={className} size={size} />;
  }

  // Tabler Icons
  if (iconSet === "tabler") {
    const TablerIcon = TablerIcons[
      mapping.tabler as keyof typeof TablerIcons
    ] as any;
    if (!TablerIcon) {
      logger.warn(`Tabler icon "${mapping.tabler}" not found`);
      return null;
    }
    return <TablerIcon className={className} size={size} />;
  }

  // Phosphor Icons
  if (iconSet === "phosphor") {
    const PhosphorIcon = PhosphorIcons[
      mapping.phosphor as keyof typeof PhosphorIcons
    ] as any;
    if (!PhosphorIcon) {
      logger.warn(`Phosphor icon "${mapping.phosphor}" not found`);
      return null;
    }
    return <PhosphorIcon className={className} size={size} weight="regular" />;
  }

  return null;
}

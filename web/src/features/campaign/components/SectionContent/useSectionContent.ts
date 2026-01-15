// Hook for SectionContent state and operations

import { useState, useEffect, useCallback, useRef } from "react";
import { useCampaignStore } from "@/store/campaignStore";
import { useAuthStore } from "@/store/authStore";
import { getApiUrl } from "@/config/api";
import { authFetch } from "@/utils/authFetch";
import { logger } from "@/utils/logger";
import { loadContent } from "../../loaders";
import type { CampaignContent, ContentType } from "../../types";

interface UseSectionContentProps {
  campaignId: string;
  sectionId: string;
  subsection: string | null;
  onEntriesLoad: (entries: CampaignContent[]) => void;
}

// Content types that have dedicated API endpoints
const DEDICATED_CONTENT_TYPES: ContentType[] = [
  "npcs",
  "items",
  "monsters",
  "encounters",
  "dialogues",
  "rumors",
  "locations",
  "quests",
  "taverns",
  "merchants",
  "traps",
  "critters",
  "chases",
];

export function useSectionContent({
  campaignId,
  sectionId,
  subsection,
  onEntriesLoad,
}: UseSectionContentProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    fetchCampaignContent,
    createCampaignContent,
    updateCampaignContent,
    deleteCampaignContent,
    unlinkCharacterFromCampaign,
  } = useCampaignStore();

  const [entries, setEntries] = useState<CampaignContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CampaignContent | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get effective section (handle Artificer's Toolkit subsections)
  const effectiveSection = (
    sectionId === "artificers-toolkit" && subsection ? subsection : sectionId
  ) as ContentType;

  // Check if this is a dedicated content type
  const isDedicatedType = DEDICATED_CONTENT_TYPES.includes(effectiveSection);

  // Load content
  const loadContentData = useCallback(async () => {
    try {
      setLoading(true);
      setEntries([]);
      onEntriesLoad([]);

      let content: CampaignContent[];

      if (isDedicatedType || effectiveSection === "pcs") {
        content = await loadContent(campaignId, effectiveSection);
      } else {
        // Fall back to generic campaign_content
        content = await fetchCampaignContent(campaignId, sectionId, subsection);
      }

      // Normalize newlines
      const normalized = content.map((e) => ({
        ...e,
        content:
          typeof e.content === "string"
            ? e.content.replace(/\\n/g, "\n")
            : e.content,
      }));

      setEntries(normalized);
      onEntriesLoad(normalized);
    } catch (error) {
      logger.error("Failed to load content:", error);
      setEntries([]);
      onEntriesLoad([]);
    } finally {
      setLoading(false);
    }
  }, [
    campaignId,
    sectionId,
    subsection,
    effectiveSection,
    isDedicatedType,
    fetchCampaignContent,
    onEntriesLoad,
  ]);

  // Load on mount and section change
  useEffect(() => {
    loadContentData();
    setSearchQuery("");
  }, [loadContentData]);

  // Create new entry
  const handleCreateNew = useCallback(() => {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setShowEditor(true);
  }, []);

  // Edit entry
  const handleEditEntry = useCallback((entry: CampaignContent) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setShowEditor(true);
  }, []);

  // Save entry
  const handleSaveEntry = useCallback(async () => {
    if (!title.trim() || !isAuthenticated) return;

    try {
      if (isDedicatedType) {
        if (editingEntry) {
          // TODO: Implement update for dedicated types
          alert(
            "Editing not yet supported for this content type. Please delete and recreate.",
          );
          return;
        }

        // Create new in dedicated table
        const endpoint = getApiUrl(`/${effectiveSection}`);
        const body = buildCreateBody(
          effectiveSection,
          title,
          content,
          campaignId,
        );

        const response = await authFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ${effectiveSection}`);
        }
      } else {
        // Generic campaign_content
        if (editingEntry) {
          await updateCampaignContent(campaignId, editingEntry.id, {
            title,
            content,
          });
        } else {
          await createCampaignContent(campaignId, {
            section: sectionId,
            subsection,
            title,
            content,
            type: "manual",
          });
        }
      }

      await loadContentData();
      setShowEditor(false);
      setTitle("");
      setContent("");
      setEditingEntry(null);
    } catch (error) {
      logger.error("Failed to save entry:", error);
      alert("Failed to save entry");
    }
  }, [
    title,
    content,
    isAuthenticated,
    isDedicatedType,
    editingEntry,
    effectiveSection,
    campaignId,
    sectionId,
    subsection,
    updateCampaignContent,
    createCampaignContent,
    loadContentData,
  ]);

  // Delete entry
  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      // Special handling for PCs
      if (effectiveSection === "pcs") {
        const entry = entries.find((e) => e.id === entryId);
        if (entry?.characterData) {
          if (!confirm("Remove this character from the campaign?")) return;
          try {
            await unlinkCharacterFromCampaign(campaignId, entryId);
            await loadContentData();
          } catch (error) {
            logger.error("Failed to unlink character:", error);
            alert("Failed to remove character from campaign");
          }
          return;
        }
      }

      if (!confirm("Are you sure you want to delete this entry?")) return;

      try {
        if (isDedicatedType) {
          const endpoint = getApiUrl(`/${effectiveSection}/${entryId}`);
          const response = await authFetch(endpoint, { method: "DELETE" });
          if (!response.ok) {
            throw new Error(`Failed to delete ${effectiveSection}`);
          }
        } else {
          await deleteCampaignContent(campaignId, entryId);
        }
        await loadContentData();
      } catch (error) {
        logger.error("Failed to delete entry:", error);
        alert("Failed to delete entry");
      }
    },
    [
      effectiveSection,
      entries,
      isDedicatedType,
      campaignId,
      unlinkCharacterFromCampaign,
      deleteCampaignContent,
      loadContentData,
    ],
  );

  // File upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !isAuthenticated) return;

      setUploading(true);
      try {
        let fileContent = "";
        const fileType = file.type;

        // Read file content
        if (fileType.startsWith("image/") || fileType.startsWith("audio/")) {
          const reader = new FileReader();
          fileContent = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          fileContent = await file.text();
          // Remove null bytes
          // eslint-disable-next-line no-control-regex
          fileContent = fileContent.replace(/\x00/g, "");
        }

        const fileName = file.name.replace(/\.[^/.]+$/, "");

        if (isDedicatedType) {
          const endpoint = getApiUrl(`/${effectiveSection}`);
          const body = buildCreateBody(
            effectiveSection,
            fileName,
            fileContent,
            campaignId,
          );

          const response = await authFetch(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Failed to import ${effectiveSection}`);
          }
        } else {
          await createCampaignContent(campaignId, {
            section: sectionId,
            subsection,
            title: fileName,
            content: fileContent,
            type: "manual",
            file_name: file.name,
          });
        }

        await loadContentData();
      } catch (error) {
        logger.error("File upload failed:", error);
      } finally {
        setUploading(false);
        if (event.target) event.target.value = "";
      }
    },
    [
      isAuthenticated,
      isDedicatedType,
      effectiveSection,
      campaignId,
      sectionId,
      subsection,
      createCampaignContent,
      loadContentData,
    ],
  );

  // Close editor
  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setTitle("");
    setContent("");
    setEditingEntry(null);
  }, []);

  return {
    entries,
    loading,
    uploading,
    searchQuery,
    setSearchQuery,
    showEditor,
    editingEntry,
    title,
    setTitle,
    content,
    setContent,
    fileInputRef,
    effectiveSection,
    handleCreateNew,
    handleEditEntry,
    handleSaveEntry,
    handleDeleteEntry,
    handleFileUpload,
    handleCloseEditor,
    loadContentData,
  };
}

// Helper to build create body for dedicated types
function buildCreateBody(
  type: ContentType,
  title: string,
  content: string,
  campaignId: string,
): Record<string, any> {
  const base = {
    name: title,
    campaign_id: campaignId,
    ai_generated: false,
  };

  switch (type) {
    case "npcs":
      return {
        ...base,
        race: "",
        class: "",
        personality: "",
        backstory: content,
      };
    case "items":
      return { ...base, description: content, type: "Other", rarity: "Common" };
    case "monsters":
      return { ...base, lore: content, cr: 1, stats: {} };
    case "encounters":
      return {
        ...base,
        description: content,
        difficulty: "Medium",
        party_level: 1,
        party_size: 4,
        creatures: [],
      };
    case "dialogues":
      return {
        ...base,
        character_name: title,
        scene_setting: "",
        mood: "",
        dialogue_tree: [{ text: content }],
      };
    case "rumors":
      return { ...base, text: content, source: "", veracity: "true" };
    case "locations":
      return { ...base, description: content, type: "Other" };
    case "quests":
      return {
        ...base,
        title,
        type: "side",
        description: content,
        status: "available",
      };
    case "taverns":
      return { ...base, atmosphere: content };
    case "merchants":
      return { ...base, shop_type: "general", atmosphere: content };
    case "traps":
      return {
        ...base,
        description: content,
        trap_type: "mechanical",
        difficulty: "medium",
      };
    case "critters":
      return {
        ...base,
        description: content,
        critter_type: "beast",
        size: "medium",
      };
    case "chases":
      return {
        ...base,
        description: content,
        chase_type: "pursuit",
        terrain: "urban",
        difficulty: "medium",
      };
    default:
      return base;
  }
}

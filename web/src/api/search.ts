import { apiClient } from "./client";

// Search result from the API
export interface SearchResult {
  id: string;
  type: "npc" | "item" | "location" | "quest" | "character";
  name: string;
  preview?: string;
  campaign_id?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export interface SearchParams {
  query: string;
  types?: string[]; // 'npcs', 'items', 'locations', 'quests', 'characters'
  campaignId?: string;
  limit?: number;
}

/**
 * Search across multiple content types
 */
export async function search(params: SearchParams): Promise<SearchResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.query);

  if (params.types && params.types.length > 0) {
    searchParams.set("types", params.types.join(","));
  }

  if (params.campaignId) {
    searchParams.set("campaign_id", params.campaignId);
  }

  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  const response = await apiClient.get<SearchResponse>(
    `/search?${searchParams.toString()}`,
  );
  return response.data?.results || [];
}

/**
 * Get icon name for search result type
 */
export function getResultTypeIcon(
  type: SearchResult["type"],
): "User" | "Gem" | "MapPin" | "Scroll" | "Users" {
  switch (type) {
    case "npc":
      return "User";
    case "item":
      return "Gem";
    case "location":
      return "MapPin";
    case "quest":
      return "Scroll";
    case "character":
      return "Users";
    default:
      return "User";
  }
}

/**
 * Get label for search result type
 */
export function getResultTypeLabel(type: SearchResult["type"]): string {
  switch (type) {
    case "npc":
      return "NPC";
    case "item":
      return "Item";
    case "location":
      return "Location";
    case "quest":
      return "Quest";
    case "character":
      return "Character";
    default:
      return type;
  }
}

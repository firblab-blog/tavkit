import { apiClient } from "./client";

// Item type matching backend model
export interface Item {
  id: string;
  user_id: string;
  campaign_id?: string;
  name: string;
  type: string; // 'weapon', 'armor', 'consumable', 'treasure', 'tool', 'quest_item', 'relic', 'wondrous', 'other'
  rarity?: string; // 'common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'
  description?: string;
  properties?: Record<string, unknown>;
  origin?: string;
  previous_owner?: string;
  complication?: string;
  value?: number;
  weight?: number;
  attunement?: boolean;
  location_found?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

// Item with campaign link data
export interface ItemWithCampaignLink extends Item {
  link_id: string;
  quantity: number;
  notes?: string;
  added_at: string;
}

// Filter options for listing items
export interface ItemFilters {
  campaignId?: string;
  type?: string;
  rarity?: string;
}

// Request types
export interface CreateItemRequest {
  name: string;
  type: string;
  rarity?: string;
  description?: string;
  properties?: Record<string, unknown>;
  origin?: string;
  previous_owner?: string;
  complication?: string;
  value?: number;
  weight?: number;
  attunement?: boolean;
  location_found?: string;
  campaign_id?: string;
}

export interface UpdateItemRequest {
  name?: string;
  type?: string;
  rarity?: string;
  description?: string;
  properties?: Record<string, unknown>;
  origin?: string;
  previous_owner?: string;
  complication?: string;
  value?: number;
  weight?: number;
  attunement?: boolean;
  location_found?: string;
}

export interface LinkItemRequest {
  quantity?: number;
  notes?: string;
}

// CRUD operations
export async function getItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters?.campaignId) params.append("campaign_id", filters.campaignId);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.rarity) params.append("rarity", filters.rarity);

  const queryString = params.toString();
  const url = queryString ? `/items?${queryString}` : "/items";
  const response = await apiClient.get(url);
  return response.data || [];
}

export async function getItem(id: string): Promise<Item> {
  const response = await apiClient.get(`/items/${id}`);
  return response.data;
}

export async function createItem(item: CreateItemRequest): Promise<Item> {
  const response = await apiClient.post("/items", item);
  return response.data;
}

export async function updateItem(
  id: string,
  item: UpdateItemRequest,
): Promise<Item> {
  const response = await apiClient.put(`/items/${id}`, item);
  return response.data;
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete(`/items/${id}`);
}

// Campaign linking operations
export async function getCampaignItems(
  campaignId: string,
): Promise<ItemWithCampaignLink[]> {
  const response = await apiClient.get(`/campaigns/${campaignId}/items`);
  return response.data?.items || [];
}

export async function linkItemToCampaign(
  campaignId: string,
  itemId: string,
  options?: LinkItemRequest,
): Promise<void> {
  await apiClient.post(
    `/campaigns/${campaignId}/items/${itemId}`,
    options || {},
  );
}

export async function unlinkItemFromCampaign(
  campaignId: string,
  itemId: string,
): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}/items/${itemId}`);
}

export async function updateCampaignItemLink(
  campaignId: string,
  itemId: string,
  options: LinkItemRequest,
): Promise<void> {
  await apiClient.put(`/campaigns/${campaignId}/items/${itemId}`, options);
}

// Helper constants
export const ITEM_TYPES = [
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "consumable", label: "Consumable" },
  { value: "treasure", label: "Treasure" },
  { value: "tool", label: "Tool" },
  { value: "quest_item", label: "Quest Item" },
  { value: "relic", label: "Relic" },
  { value: "wondrous", label: "Wondrous Item" },
  { value: "other", label: "Other" },
];

export const ITEM_RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "very_rare", label: "Very Rare" },
  { value: "legendary", label: "Legendary" },
  { value: "artifact", label: "Artifact" },
];

// Get rarity color for styling
export function getRarityColor(rarity?: string): string {
  switch (rarity?.toLowerCase()) {
    case "common":
      return "text-gray-400";
    case "uncommon":
      return "text-green-400";
    case "rare":
      return "text-blue-400";
    case "very_rare":
      return "text-purple-400";
    case "legendary":
      return "text-orange-400";
    case "artifact":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

import { apiClient } from "./client";

export interface Monster {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  lore?: string;
  stats?: any;
  abilities?: string;
  tactics?: string;
  lair_description?: string;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateMonsterRequest {
  name?: string;
  lore?: string;
  stats?: any;
  abilities?: string;
  tactics?: string;
  lair_description?: string;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateMonster(
  id: string,
  updates: UpdateMonsterRequest,
): Promise<Monster> {
  const response = await apiClient.put(`/monsters/${id}`, updates);
  return response.data;
}

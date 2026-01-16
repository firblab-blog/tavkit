import { apiClient } from "./client";

export interface Critter {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  description?: string;
  behavior?: string;
  habitat?: string;
  stats?: any;
  special_abilities?: string;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateCritterRequest {
  name?: string;
  description?: string;
  behavior?: string;
  habitat?: string;
  stats?: any;
  special_abilities?: string;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateCritter(
  id: string,
  updates: UpdateCritterRequest,
): Promise<Critter> {
  const response = await apiClient.put(`/critters/${id}`, updates);
  return response.data;
}

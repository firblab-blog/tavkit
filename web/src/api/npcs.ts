import { apiClient } from "./client";

export interface NPC {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  race?: string;
  class?: string;
  background?: string;
  alignment?: string;
  personality_traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  appearance?: string;
  voice?: string;
  mannerisms?: string;
  goals?: string;
  secrets?: string;
  inventory?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateNPCRequest {
  name?: string;
  race?: string;
  class?: string;
  background?: string;
  alignment?: string;
  personality_traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  appearance?: string;
  voice?: string;
  mannerisms?: string;
  goals?: string;
  secrets?: string;
  inventory?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateNPC(
  id: string,
  updates: UpdateNPCRequest,
): Promise<NPC> {
  const response = await apiClient.put(`/npcs/${id}`, updates);
  return response.data;
}

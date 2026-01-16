import { apiClient } from "./client";

export interface Quest {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  title: string;
  quest_type?: string;
  description?: string;
  hook?: string;
  objectives?: any;
  rewards?: any;
  complications?: any;
  npcs_involved?: any;
  locations_involved?: any;
  faction_alignment?: string;
  moral_ambiguity?: string;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateQuestRequest {
  title?: string;
  quest_type?: string;
  description?: string;
  hook?: string;
  objectives?: any;
  rewards?: any;
  complications?: any;
  npcs_involved?: any;
  locations_involved?: any;
  faction_alignment?: string;
  moral_ambiguity?: string;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateQuest(
  id: string,
  updates: UpdateQuestRequest,
): Promise<Quest> {
  const response = await apiClient.put(`/quests/${id}`, updates);
  return response.data;
}

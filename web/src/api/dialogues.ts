import { apiClient } from "./client";

export interface Dialogue {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  npc_name: string;
  context?: string;
  emotional_state?: string;
  dialogue_tree?: any;
  information_revealed?: string;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateDialogueRequest {
  npc_name?: string;
  context?: string;
  emotional_state?: string;
  dialogue_tree?: any;
  information_revealed?: string;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateDialogue(
  id: string,
  updates: UpdateDialogueRequest,
): Promise<Dialogue> {
  const response = await apiClient.put(`/dialogues/${id}`, updates);
  return response.data;
}

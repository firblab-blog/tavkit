import { apiClient } from "./client";

export interface Rumor {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  rumor_text: string;
  truth_level?: string;
  source?: string;
  related_id?: string;
  tags?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateRumorRequest {
  rumor_text?: string;
  truth_level?: string;
  source?: string;
  related_id?: string;
  tags?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateRumor(
  id: string,
  updates: UpdateRumorRequest,
): Promise<Rumor> {
  const response = await apiClient.put(`/rumors/${id}`, updates);
  return response.data;
}

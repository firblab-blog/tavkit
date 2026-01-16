import { apiClient } from "./client";

export interface Chase {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  chase_type?: string;
  description?: string;
  starting_distance?: number;
  participants?: any;
  chase_phases?: any;
  ending_conditions?: any;
  rewards?: any;
  environmental_factors?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateChaseRequest {
  name?: string;
  chase_type?: string;
  description?: string;
  starting_distance?: number;
  participants?: any;
  chase_phases?: any;
  ending_conditions?: any;
  rewards?: any;
  environmental_factors?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateChase(
  id: string,
  updates: UpdateChaseRequest,
): Promise<Chase> {
  const response = await apiClient.put(`/chases/${id}`, updates);
  return response.data;
}

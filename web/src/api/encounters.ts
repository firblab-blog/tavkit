import { apiClient } from "./client";

export interface Encounter {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  encounter_type?: string;
  difficulty?: string;
  environment?: string;
  description?: string;
  creatures?: any;
  treasure?: any;
  special_conditions?: string;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateEncounterRequest {
  name?: string;
  encounter_type?: string;
  difficulty?: string;
  environment?: string;
  description?: string;
  creatures?: any;
  treasure?: any;
  special_conditions?: string;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateEncounter(
  id: string,
  updates: UpdateEncounterRequest,
): Promise<Encounter> {
  const response = await apiClient.put(`/encounters/${id}`, updates);
  return response.data;
}

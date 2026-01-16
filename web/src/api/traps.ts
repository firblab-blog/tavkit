import { apiClient } from "./client";

export interface Trap {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  trap_type: string;
  difficulty?: string;
  party_level?: number;
  environment?: string;
  description?: string;
  trigger?: string;
  effect?: string;
  damage?: string;
  detection?: any;
  solution_paths?: any;
  complications?: any;
  rewards?: any;
  scaling?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTrapRequest {
  name?: string;
  trap_type?: string;
  difficulty?: string;
  party_level?: number;
  environment?: string;
  description?: string;
  trigger?: string;
  effect?: string;
  damage?: string;
  detection?: any;
  solution_paths?: any;
  complications?: any;
  rewards?: any;
  scaling?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateTrap(
  id: string,
  updates: UpdateTrapRequest,
): Promise<Trap> {
  const response = await apiClient.put(`/traps/${id}`, updates);
  return response.data;
}

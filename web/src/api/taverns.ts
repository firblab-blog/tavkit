import { apiClient } from "./client";

export interface Tavern {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  quality?: string;
  size?: string;
  description?: string;
  menu_food?: any;
  menu_drinks?: any;
  rooms?: any;
  patrons?: any;
  events?: any;
  rumors?: any;
  keeper?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTavernRequest {
  name?: string;
  quality?: string;
  size?: string;
  description?: string;
  menu_food?: any;
  menu_drinks?: any;
  rooms?: any;
  patrons?: any;
  events?: any;
  rumors?: any;
  keeper?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateTavern(
  id: string,
  updates: UpdateTavernRequest,
): Promise<Tavern> {
  const response = await apiClient.put(`/taverns/${id}`, updates);
  return response.data;
}

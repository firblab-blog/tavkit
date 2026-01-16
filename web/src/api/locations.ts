import { apiClient } from "./client";

export interface Location {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  location_type?: string;
  description?: string;
  features?: any;
  secrets?: any;
  factions?: any;
  npcs?: any;
  encounters?: any;
  treasure?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateLocationRequest {
  name?: string;
  location_type?: string;
  description?: string;
  features?: any;
  secrets?: any;
  factions?: any;
  npcs?: any;
  encounters?: any;
  treasure?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateLocation(
  id: string,
  updates: UpdateLocationRequest,
): Promise<Location> {
  const response = await apiClient.put(`/locations/${id}`, updates);
  return response.data;
}

import { apiClient } from "./client";

export interface Merchant {
  id: string;
  user_id: string;
  campaign_id?: string | null;
  name: string;
  shop_name?: string;
  shop_type?: string;
  description?: string;
  owner_description?: string;
  inventory?: any;
  services?: any;
  special_items?: any;
  rumors?: any;
  haggle_willingness?: string;
  recently_sold?: any;
  dm_notes?: string;
  ai_generated: boolean;
  ai_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateMerchantRequest {
  name?: string;
  shop_name?: string;
  shop_type?: string;
  description?: string;
  owner_description?: string;
  inventory?: any;
  services?: any;
  special_items?: any;
  rumors?: any;
  haggle_willingness?: string;
  recently_sold?: any;
  dm_notes?: string;
  campaign_id?: string | null;
}

export async function updateMerchant(
  id: string,
  updates: UpdateMerchantRequest,
): Promise<Merchant> {
  const response = await apiClient.put(`/merchants/${id}`, updates);
  return response.data;
}

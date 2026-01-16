import { apiClient } from "./client";

export interface CampaignContent {
  id: string;
  campaign_id: string;
  section: string;
  subsection?: string | null;
  title: string;
  content?: string;
  type?: string;
  file_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateCampaignContentRequest {
  title?: string;
  content?: string;
  subsection?: string | null;
}

export async function updateCampaignContent(
  campaignId: string,
  contentId: string,
  updates: UpdateCampaignContentRequest,
): Promise<CampaignContent> {
  const response = await apiClient.put(
    `/campaigns/${campaignId}/content/${contentId}`,
    updates,
  );
  return response.data;
}

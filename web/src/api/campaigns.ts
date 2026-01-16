import { apiClient } from "./client";

/**
 * Get the visible content types for a campaign's tabs
 */
export async function getContentTypeVisibility(
  campaignId: string,
): Promise<string[]> {
  const response = await apiClient.get(
    `/campaigns/${campaignId}/content-visibility`,
  );
  return response.data.visible_content_types;
}

/**
 * Update the visible content types for a campaign's tabs
 */
export async function updateContentTypeVisibility(
  campaignId: string,
  types: string[],
): Promise<string[]> {
  const response = await apiClient.put(
    `/campaigns/${campaignId}/content-visibility`,
    { types },
  );
  return response.data.visible_content_types;
}

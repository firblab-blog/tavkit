// Shared utilities for content loaders

import { getApiUrl } from "@/config/api";
import { authFetch } from "@/utils/authFetch";

/**
 * Fetch data from an API endpoint with error handling
 */
export async function fetchContentData<T>(
  endpoint: string,
  campaignId: string,
  dataKey?: string,
): Promise<T[]> {
  const response = await authFetch(
    getApiUrl(`/${endpoint}?campaign_id=${campaignId}`),
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  const data = await response.json();
  if (dataKey) {
    return Array.isArray(data) ? data : data?.[dataKey] || [];
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Safely parse a JSON field that might be a string or already parsed
 */
export function parseJSONField<T>(
  value: string | T | undefined | null,
): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Format an array field for markdown display
 */
export function formatArrayField(field: any): string {
  if (!field) return "";
  const parsed = parseJSONField<any[]>(field);
  if (Array.isArray(parsed)) {
    return parsed.map((item: string) => `- ${item}`).join("\n");
  }
  return String(field);
}

/**
 * Format an object or array field for markdown display
 */
export function formatObjectField(field: any): string {
  if (!field) return "";
  const parsed = parseJSONField<any>(field);
  if (Array.isArray(parsed)) {
    return parsed.map((item: string) => `- ${item}`).join("\n");
  } else if (typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, value]) => `- **${key}:** ${value}`)
      .join("\n");
  }
  return String(field);
}

/**
 * Calculate ability modifier from score
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Format modifier with sign
 */
export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/**
 * Format ability scores block for display
 */
export function formatAbilityScores(abilities: Record<string, number>): string {
  const mod = getAbilityModifier;
  const sign = formatModifier;
  let display = "";
  display += `STR ${abilities.STR || 10} (${sign(mod(abilities.STR || 10))}) | `;
  display += `DEX ${abilities.DEX || 10} (${sign(mod(abilities.DEX || 10))}) | `;
  display += `CON ${abilities.CON || 10} (${sign(mod(abilities.CON || 10))})\n`;
  display += `INT ${abilities.INT || 10} (${sign(mod(abilities.INT || 10))}) | `;
  display += `WIS ${abilities.WIS || 10} (${sign(mod(abilities.WIS || 10))}) | `;
  display += `CHA ${abilities.CHA || 10} (${sign(mod(abilities.CHA || 10))})`;
  return display;
}

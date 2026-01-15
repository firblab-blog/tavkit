// Trap content loader

import type { CampaignContent } from "../types";
import { fetchContentData, parseJSONField } from "./utils";

interface Detection {
  passive_perception_dc?: number;
  investigation_dc?: number;
  clues?: string[];
}

interface SolutionPath {
  approach: string;
  skill: string;
  dc: number;
  description: string;
  time?: string;
  failure?: string;
}

interface Scaling {
  easier?: string;
  harder?: string;
}

export async function loadTraps(
  campaignId: string,
): Promise<CampaignContent[]> {
  const traps = await fetchContentData<any>("traps", campaignId, "traps");

  return traps.map((trap: any) => {
    // Format detection
    let detectionDisplay = "";
    const detection = parseJSONField<Detection>(trap.detection);
    if (
      detection &&
      (detection.passive_perception_dc || detection.investigation_dc)
    ) {
      detectionDisplay = `\n\n**Detection:**\n`;
      if (detection.passive_perception_dc) {
        detectionDisplay += `- Passive Perception DC: ${detection.passive_perception_dc}\n`;
      }
      if (detection.investigation_dc) {
        detectionDisplay += `- Investigation DC: ${detection.investigation_dc}\n`;
      }
      if (detection.clues?.length) {
        detectionDisplay += `**Clues:**\n${detection.clues.map((clue) => `- ${clue}`).join("\n")}`;
      }
    }

    // Format solution paths
    let solutionPathsDisplay = "";
    const paths = parseJSONField<SolutionPath[]>(trap.solution_paths);
    if (Array.isArray(paths)) {
      solutionPathsDisplay = paths
        .map(
          (path) =>
            `- **${path.approach}** (${path.skill} DC ${path.dc}): ${path.description}${path.time ? `\n  Time: ${path.time}` : ""}${path.failure ? `\n  On Failure: ${path.failure}` : ""}`,
        )
        .join("\n");
    }

    // Format complications
    let complicationsDisplay = "";
    const complications = parseJSONField<string[]>(trap.complications);
    if (Array.isArray(complications)) {
      complicationsDisplay = complications
        .map((comp) => `- ${comp}`)
        .join("\n");
    }

    // Format rewards
    let rewardsDisplay = "";
    const rewards = parseJSONField<string[]>(trap.rewards);
    if (Array.isArray(rewards)) {
      rewardsDisplay = rewards.map((reward) => `- ${reward}`).join("\n");
    }

    // Format scaling
    let scalingDisplay = "";
    const scaling = parseJSONField<Scaling>(trap.scaling);
    if (scaling && (scaling.easier || scaling.harder)) {
      scalingDisplay = `\n\n**Scaling:**${scaling.easier ? `\n- Easier: ${scaling.easier}` : ""}${scaling.harder ? `\n- Harder: ${scaling.harder}` : ""}`;
    }

    return {
      id: trap.id,
      campaign_id: campaignId,
      user_id: trap.user_id || "",
      section: "traps",
      subsection: null,
      title: trap.name,
      content: [
        `**Type:** ${trap.trap_type || "N/A"}`,
        trap.difficulty ? ` | **Difficulty:** ${trap.difficulty}` : "",
        trap.environment ? ` | **Environment:** ${trap.environment}` : "",
        "\n",
        trap.description ? `**Description:**\n${trap.description}\n\n` : "",
        trap.trigger ? `**Trigger:**\n${trap.trigger}\n\n` : "",
        trap.effect ? `**Effect:** ${trap.effect}` : "",
        trap.damage ? ` | **Damage:** ${trap.damage}` : "",
        detectionDisplay,
        solutionPathsDisplay
          ? `\n\n**Solution Paths:**\n${solutionPathsDisplay}`
          : "",
        complicationsDisplay
          ? `\n\n**Complications:**\n${complicationsDisplay}`
          : "",
        rewardsDisplay ? `\n\n**Rewards:**\n${rewardsDisplay}` : "",
        scalingDisplay,
        trap.dm_notes ? `\n\n**DM Notes:**\n${trap.dm_notes}` : "",
      ].join(""),
      type: (trap.ai_generated ? "imported" : "manual") as
        | "manual"
        | "imported",
      created_at: trap.created_at,
      updated_at: trap.created_at,
    };
  });
}

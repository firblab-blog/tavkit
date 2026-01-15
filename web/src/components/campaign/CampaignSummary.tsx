import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Icon from "../common/Icon";
import { authFetch } from "@/utils/authFetch";
import SummaryContentSettings from "./SummaryContentSettings";
import { logger } from "@/utils/logger";

interface SummaryJob {
  job_id: string;
  campaign_id: string;
  status: "pending" | "extracting" | "synthesizing" | "completed" | "failed";
  current_stage?: string;
  current_batch: number;
  total_batches: number;
  progress_percent: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

interface CampaignSummaryProps {
  campaignContext: any;
  loadingSummary: boolean;
  onRegenerate: () => void;
  campaignId?: string;
}

// Helper to check if we should skip polling after completion
const COMPLETION_COOLDOWN_MS = 5000;

const STAGE_LABELS: Record<string, string> = {
  npcs: "NPCs",
  locations: "Locations",
  quests: "Quests",
  monsters: "Monsters",
  items: "Items",
  encounters: "Encounters",
  rumors: "Rumors",
  dialogues: "Dialogues",
  taverns: "Taverns",
  merchants: "Merchants",
  traps: "Traps",
  critters: "Critters",
  chases: "Chases",
  campaign_content: "Campaign Content",
  overview: "Overview",
  setting: "Setting",
  characters: "Characters",
  plot: "Plot",
  tone: "Tone",
};

export default function CampaignSummary({
  campaignContext,
  loadingSummary,
  onRegenerate,
  campaignId,
}: CampaignSummaryProps) {
  const hasSummary = campaignContext?.summary_available === true;
  const [activeJob, setActiveJob] = useState<SummaryJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showContentSettings, setShowContentSettings] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCompletionRef = useRef<number>(0); // Track when job last completed
  const onRegenerateRef = useRef(onRegenerate); // Stable ref to avoid effect re-runs

  // Keep the ref updated
  useEffect(() => {
    onRegenerateRef.current = onRegenerate;
  }, [onRegenerate]);

  // Poll for active job status - uses ref for onRegenerate to avoid dependency changes
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (!campaignId) return;

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job/${jobId}`,
        );
        if (response.ok) {
          const job: SummaryJob = await response.json();
          setActiveJob(job);

          if (job.status === "completed" || job.status === "failed") {
            // Stop polling
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsGenerating(false);
            lastCompletionRef.current = Date.now();

            // Refresh the campaign context if completed (use ref to avoid stale closure)
            if (job.status === "completed") {
              onRegenerateRef.current();
            }
          }
        }
      } catch (err) {
        logger.error("Failed to poll job status:", err);
      }
    },
    [campaignId], // Removed onRegenerate - using ref instead
  );

  // Check for active job on mount - only runs when campaignId changes
  useEffect(() => {
    const checkActiveJob = async () => {
      if (!campaignId) return;

      // Don't check for jobs if we just completed one (prevents re-polling loop)
      if (Date.now() - lastCompletionRef.current < COMPLETION_COOLDOWN_MS) {
        return;
      }

      try {
        const response = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.active_job) {
            setActiveJob(data.active_job);
            setIsGenerating(true);
            // Start polling
            pollingRef.current = setInterval(() => {
              pollJobStatus(data.active_job.job_id);
            }, 2000);
          }
        }
      } catch (err) {
        logger.error("Failed to check active job:", err);
      }
    };

    checkActiveJob();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [campaignId, pollJobStatus]);

  // Start chunked generation
  const startChunkedGeneration = async () => {
    if (!campaignId) {
      // Fall back to legacy regeneration
      onRegenerate();
      return;
    }

    setIsGenerating(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/generate`,
        { method: "POST" },
      );

      if (response.ok) {
        const data = await response.json();
        setActiveJob({
          job_id: data.job_id,
          campaign_id: data.campaign_id,
          status: "pending",
          current_batch: 0,
          total_batches: 0,
          progress_percent: 0,
        });

        // Start polling
        pollingRef.current = setInterval(() => {
          pollJobStatus(data.job_id);
        }, 2000);
      } else if (response.status === 409) {
        // Job already in progress - try to get its status
        const activeResponse = await authFetch(
          `${import.meta.env.VITE_API_URL}/api/v1/campaigns/${campaignId}/summary/job`,
        );
        if (activeResponse.ok) {
          const data = await activeResponse.json();
          if (data.active_job) {
            setActiveJob(data.active_job);
            pollingRef.current = setInterval(() => {
              pollJobStatus(data.active_job.job_id);
            }, 2000);
          }
        }
      } else {
        // Fall back to legacy regeneration
        setIsGenerating(false);
        onRegenerate();
      }
    } catch (err) {
      logger.error("Failed to start chunked generation:", err);
      setIsGenerating(false);
      // Fall back to legacy regeneration
      onRegenerate();
    }
  };

  const showProgress =
    isGenerating &&
    activeJob &&
    activeJob.status !== "completed" &&
    activeJob.status !== "failed";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon name="Sparkles" className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-text">Campaign Summary</h2>
            <p className="text-sm text-tavern-mauve mt-1">
              AI-generated overview of your campaign
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Content Settings Button */}
          <button
            onClick={() => setShowContentSettings(true)}
            disabled={loadingSummary || isGenerating}
            className="p-2 hover:bg-tavern-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Configure summary content"
          >
            <Icon
              name="Settings"
              className="w-5 h-5 text-tavern-mauve hover:text-primary"
            />
          </button>

          {/* Generate/Regenerate Button */}
          <button
            onClick={startChunkedGeneration}
            disabled={loadingSummary || isGenerating}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingSummary || isGenerating ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : hasSummary ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4" />
                Regenerate
              </>
            ) : (
              <>
                <Icon name="Sparkles" className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {showProgress ? (
        <div className="bg-background-panel border border-border rounded-lg p-6">
          <div className="text-center mb-4">
            <Icon
              name="Loader2"
              className="w-8 h-8 text-primary animate-spin mx-auto mb-3"
            />
            <p className="text-text font-medium">
              {activeJob.status === "extracting"
                ? "Extracting facts..."
                : activeJob.status === "synthesizing"
                  ? "Synthesizing summary..."
                  : "Preparing..."}
            </p>
            {activeJob.current_stage && (
              <p className="text-sm text-tavern-mauve mt-1">
                Processing:{" "}
                {STAGE_LABELS[activeJob.current_stage] ||
                  activeJob.current_stage}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-background rounded-full h-2.5 mb-2">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${activeJob.progress_percent}%` }}
            />
          </div>
          <p className="text-sm text-tavern-mauve text-center">
            {activeJob.progress_percent}% complete
            {activeJob.total_batches > 0 && (
              <span className="ml-2">
                ({activeJob.current_batch} / {activeJob.total_batches} batches)
              </span>
            )}
          </p>
        </div>
      ) : activeJob?.status === "failed" ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <Icon
            name="AlertCircle"
            className="w-8 h-8 text-red-500 mx-auto mb-3"
          />
          <p className="text-red-400 font-medium">Summary generation failed</p>
          {activeJob.error_message && (
            <p className="text-sm text-red-400/70 mt-2">
              {activeJob.error_message}
            </p>
          )}
          <button
            onClick={() => {
              setActiveJob(null);
              startChunkedGeneration();
            }}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : loadingSummary ? (
        <div className="flex items-center justify-center py-12 bg-background-panel border border-border rounded-lg">
          <div className="text-center">
            <Icon
              name="Loader2"
              className="w-8 h-8 text-primary animate-spin mx-auto mb-3"
            />
            <p className="text-tavern-mauve">Generating campaign summary...</p>
            <p className="text-sm text-tavern-mauve mt-2">
              This may take a minute
            </p>
          </div>
        </div>
      ) : campaignContext?.summary ? (
        <div className="space-y-6">
          {campaignContext.summary.overview && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="BookOpen" className="w-5 h-5 text-primary" />
                Campaign Overview
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.overview}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {campaignContext.summary.setting_summary && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="Map" className="w-5 h-5 text-primary" />
                World & Setting
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.setting_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {campaignContext.summary.characters_summary && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="Users" className="w-5 h-5 text-primary" />
                Characters & Factions
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.characters_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {campaignContext.summary.plot_summary && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="Scroll" className="w-5 h-5 text-primary" />
                Plot & Quests
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.plot_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {campaignContext.summary.recent_events && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="Calendar" className="w-5 h-5 text-primary" />
                Recent Events
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.recent_events}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {campaignContext.summary.next_steps && (
            <div className="bg-background-panel border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                <Icon name="Scroll" className="w-5 h-5 text-primary" />
                Next Steps
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-tavern-cream">
                <ReactMarkdown>
                  {campaignContext.summary.next_steps}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-background-panel border border-dashed border-border rounded-lg">
          <Icon
            name="Sparkles"
            className="w-16 h-16 text-tavern-mauve mx-auto mb-3 opacity-50"
          />
          <p className="text-tavern-mauve mb-4">
            No campaign summary generated yet
          </p>
          <p className="text-sm text-tavern-mauve mb-4">
            Click "Generate" to create an AI-powered summary of your campaign
          </p>
        </div>
      )}

      {/* Summary Content Settings Modal */}
      {campaignId && (
        <SummaryContentSettings
          campaignId={campaignId}
          isOpen={showContentSettings}
          onClose={() => setShowContentSettings(false)}
          onSave={() => {
            // Optionally trigger a regeneration after saving
            // For now, just close the modal - user can manually regenerate
          }}
        />
      )}
    </div>
  );
}

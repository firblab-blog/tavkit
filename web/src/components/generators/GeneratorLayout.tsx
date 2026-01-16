import { useState, useRef, useEffect } from "react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ResultsSkeleton } from "@/components/ui/SkeletonLoader";
import Icon, { type IconName } from "../common/Icon";
import { useIsInGeneratorModal } from "./GeneratorModal";

interface GeneratorLayoutProps {
  title: string;
  description: string;
  icon: IconName;
  formTitle?: string;
  formIcon?: IconName;
  resultsTitle?: string;
  formContent: React.ReactNode;
  generatedContent: React.ReactNode | null;
  isGenerating: boolean;
  onGenerate: () => void;
  generateButtonText?: string;
  generateButtonIcon?: IconName;
  error?: string;
  className?: string;
  showActionsInResults?: boolean;
  hideGenerateButton?: boolean;
  /** Hide the header (used when rendered inside GeneratorModal which provides its own header) */
  hideHeader?: boolean;
}

export const GeneratorLayout = ({
  title,
  description,
  icon,
  formTitle = "Input Parameters",
  formIcon = "Settings",
  resultsTitle = "Generated Results",
  formContent,
  generatedContent,
  isGenerating,
  onGenerate,
  generateButtonText = "Generate",
  generateButtonIcon = "Sparkles",
  error,
  className = "",
  hideGenerateButton = false,
  hideHeader = false,
}: GeneratorLayoutProps) => {
  const isInModal = useIsInGeneratorModal();
  const [isMobile, setIsMobile] = useState(false);
  const [formExpanded, setFormExpanded] = useState(true);
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Hide header if explicitly set OR if inside a modal
  const shouldHideHeader = hideHeader || isInModal;

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // When generation completes, collapse form and expand results on mobile
  useEffect(() => {
    if (generatedContent && !isGenerating && isMobile) {
      // Collapse form
      setFormExpanded(false);

      // Expand results
      setResultsExpanded(true);

      // Scroll to results after a brief delay (for animation)
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 350);
    }
  }, [generatedContent, isGenerating, isMobile]);

  // Reset when starting new generation
  const handleGenerate = () => {
    if (isMobile) {
      setFormExpanded(true);
      setResultsExpanded(false);
    }
    onGenerate();
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Header - hidden when rendered inside GeneratorModal */}
      {!shouldHideHeader && (
        <div className="flex-shrink-0 border-b border-border bg-background-panel px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Icon name={icon} className="w-8 h-8 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold text-text">
              {title}
            </h1>
          </div>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
      )}

      {/* Content - Two Column on Desktop, Stacked on Mobile */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Form Section */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <CollapsibleSection
              title={formTitle}
              icon={formIcon}
              isExpanded={formExpanded}
              onToggle={setFormExpanded}
              forceExpanded={!isMobile} // Always expanded on desktop
            >
              <div className="space-y-4">
                {formContent}

                {/* Generate Button */}
                {!hideGenerateButton && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="
                      w-full py-3 px-6 rounded-lg font-semibold
                      bg-primary hover:bg-primary/90
                      disabled:bg-primary/50 disabled:cursor-not-allowed
                      text-white transition-colors
                      flex items-center justify-center gap-2
                      shadow-md hover:shadow-lg
                    "
                  >
                    {isGenerating ? (
                      <>
                        <Icon name="Loader2" className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Icon name={generateButtonIcon} className="w-5 h-5" />
                        {generateButtonText}
                      </>
                    )}
                  </button>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Results Section */}
          <div ref={resultsRef}>
            <CollapsibleSection
              title={resultsTitle}
              isExpanded={resultsExpanded}
              onToggle={setResultsExpanded}
              forceExpanded={!isMobile} // Always expanded on desktop
            >
              {isGenerating ? (
                <ResultsSkeleton />
              ) : generatedContent ? (
                <div className="animate-fadeIn">{generatedContent}</div>
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <Icon
                    name="Sparkles"
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                  />
                  <p>No results yet. Fill out the form and click generate!</p>
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
};

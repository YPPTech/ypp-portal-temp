"use client";

import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// Lesson Design Studio — Step-by-step onboarding tour
// Shows for first-time visitors. Stored in localStorage.
// ═══════════════════════════════════════════════════════════════

const ONBOARDING_KEY = "lds_onboarding_done";

interface OnboardingStep {
  title: string;
  body: string;
  icon: string;
  /** CSS selector or area to highlight */
  highlight: string;
  /** Position of tooltip relative to highlight */
  position: "center" | "top" | "bottom" | "left" | "right";
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to the Lesson Design Studio",
    body: "This is where you'll build your complete curriculum — week by week, activity by activity. Let's take a quick tour of what you can do here.",
    icon: "🎨",
    highlight: "center",
    position: "center",
  },
  {
    title: "Learn from Example Curricula",
    body: "On the left panel, browse real example curricula from different interest areas. Study how experienced instructors structure their weeks, then click \"Import this week\" to use one as a starting point.",
    icon: "📖",
    highlight: ".cbs-split-left",
    position: "right",
  },
  {
    title: "Build Your Curriculum",
    body: "The right panel is your workspace. Start by giving your curriculum a name, a description, and at least two learning outcomes. The progress bar at the top tracks your completeness.",
    icon: "🏗",
    highlight: ".cbs-builder-header",
    position: "bottom",
  },
  {
    title: "Add Activities to Each Week",
    body: "Click any activity type chip (Warm Up, Instruction, Practice...) to add an activity. Then click the ▶ arrow on any activity to expand it and add detailed descriptions, materials, energy levels, and more.",
    icon: "📋",
    highlight: ".cbs-add-activity-row",
    position: "top",
  },
  {
    title: "Week Details: Objectives & Homework",
    body: "Click \"▶ Details\" on each week header to set a learning objective, teacher prep notes, a materials checklist, and even an at-home assignment for students.",
    icon: "📝",
    highlight: ".cbs-week-detail-toggle",
    position: "bottom",
  },
  {
    title: "Navigate with the Sidebar",
    body: "The numbered pills on the left (W1, W2, W3...) let you jump to any week instantly. Click one to scroll right to it.",
    icon: "🧭",
    highlight: ".cbs-week-sidebar",
    position: "right",
  },
  {
    title: "Duplicate & Reorder",
    body: "Click \"⧉ Duplicate\" on any week to make a copy. Drag the ⠿ handle on activities to reorder them, or use \"Move to Week\" in the expanded view to shift activities between weeks.",
    icon: "📦",
    highlight: ".cbs-week-dup-btn",
    position: "bottom",
  },
  {
    title: "Version History",
    body: "Your work is auto-saved every few seconds. Click \"History\" in the top menu bar to browse and restore previous versions — so you can experiment freely.",
    icon: "🕐",
    highlight: ".cbs-menubar-status",
    position: "bottom",
  },
  {
    title: "Export & Submit",
    body: "When you're ready, use \"Export PDF\" to download a Student View or full Instructor Guide. Then click \"Submit Curriculum\" — a pre-submit checklist will verify everything is complete.",
    icon: "🚀",
    highlight: ".cbs-builder-footer",
    position: "top",
  },
  {
    title: "You're All Set!",
    body: "Start building your curriculum now. Remember: you can always click \"?\" icons next to any field for help, browse examples on the left for inspiration, and your work saves automatically. This is the final step of your Instructor Training — submit your curriculum when it's ready!",
    icon: "🎉",
    highlight: "center",
    position: "center",
  },
];

interface OnboardingTourProps {
  /** If true, tour starts automatically for first-time users */
  enabled?: boolean;
}

export function OnboardingTour({ enabled = true }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        // Small delay to let the page render
        const timer = setTimeout(() => setCurrentStep(0), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // SSR or blocked localStorage
    }
  }, [enabled]);

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next >= STEPS.length) {
        try {
          localStorage.setItem(ONBOARDING_KEY, "1");
        } catch {}
        return null;
      }
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {}
    setCurrentStep(null);
  }, []);

  const restart = useCallback(() => {
    setCurrentStep(0);
  }, []);

  if (currentStep === null) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div
      className="lds-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Studio onboarding tour"
    >
      {/* Dim backdrop */}
      <div className="lds-tour-backdrop" onClick={advance} />

      {/* Tooltip card */}
      <div className="lds-tour-card" aria-live="polite">
        {/* Progress bar */}
        <div
          className="lds-tour-progress"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${currentStep + 1} of ${STEPS.length}`}
        >
          <div
            className="lds-tour-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="lds-tour-icon" aria-hidden="true">
          {step.icon}
        </div>
        <h3 className="lds-tour-title">{step.title}</h3>
        <p className="lds-tour-body">{step.body}</p>

        <div className="lds-tour-actions">
          <button
            className="lds-tour-skip"
            onClick={skip}
            type="button"
            aria-label="Skip the tour"
          >
            Skip tour
          </button>
          <button
            className="lds-tour-next"
            onClick={advance}
            type="button"
            aria-label={
              isLast
                ? "Start building your curriculum"
                : `Next: step ${currentStep + 2}`
            }
          >
            {isLast ? "Start Building!" : "Next"}
          </button>
        </div>

        {/* Step dots */}
        <div className="lds-tour-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`lds-tour-dot${i === currentStep ? " lds-tour-dot-active" : ""}${i < currentStep ? " lds-tour-dot-done" : ""}`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="lds-tour-counter">
          {currentStep + 1} / {STEPS.length}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to expose restart functionality to parent.
 * The parent can render a "Restart Tour" button in the menu bar.
 */
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const restartTour = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {}
    setShowTour(true);
  }, []);

  const hasCompletedTour = (() => {
    if (typeof window === "undefined") return false;
    try {
      return !!localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  })();

  return { showTour, setShowTour, restartTour, hasCompletedTour };
}

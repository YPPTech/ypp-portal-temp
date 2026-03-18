"use client";

import { ExampleCurriculumPanel } from "./example-curriculum-panel";
import type { ExampleWeek } from "../examples-data";

interface ExamplesLibraryProps {
  open: boolean;
  activeTab: number;
  interestArea: string;
  targetLabel?: string | null;
  onClose: () => void;
  onTabChange: (index: number) => void;
  onImportWeek: (week: ExampleWeek) => void;
}

export function ExamplesLibrary({
  open,
  activeTab,
  interestArea,
  targetLabel,
  onClose,
  onTabChange,
  onImportWeek,
}: ExamplesLibraryProps) {
  if (!open) return null;

  return (
    <div className="lds-library-overlay" onClick={onClose}>
      <div
        className="lds-library-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lds-library-header">
          <div>
            <p className="lds-library-eyebrow">Examples Library</p>
            <h2 className="lds-library-title">Learn the move, then adapt it</h2>
            <p className="lds-library-copy">
              These examples are here to help you see pacing, arc, and student
              experience choices that make a session teachable.
            </p>
            {targetLabel ? (
              <p className="lds-library-target">
                Import target: <strong>{targetLabel}</strong>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="lds-library-close"
            onClick={onClose}
            aria-label="Close examples library"
          >
            ×
          </button>
        </div>

        <div className="lds-library-body">
          <ExampleCurriculumPanel
            activeTab={activeTab}
            interestArea={interestArea}
            onTabChange={onTabChange}
            onImportWeek={onImportWeek}
          />
        </div>
      </div>
    </div>
  );
}

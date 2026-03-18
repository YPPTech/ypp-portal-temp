import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExampleCurriculumPanel } from "@/app/(app)/instructor/lesson-design-studio/components/example-curriculum-panel";

describe("ExampleCurriculumPanel", () => {
  it("auto-selects a recommended example only when auto recommendation is enabled", async () => {
    const onTabChange = vi.fn();

    const { rerender } = render(
      <ExampleCurriculumPanel
        activeTab={0}
        interestArea="Technology"
        autoRecommendEnabled
        onTabChange={onTabChange}
        onImportWeek={() => true}
      />
    );

    await waitFor(() => {
      expect(onTabChange).toHaveBeenCalledWith(expect.any(Number), "auto");
    });

    onTabChange.mockClear();

    rerender(
      <ExampleCurriculumPanel
        activeTab={1}
        interestArea="Finance"
        autoRecommendEnabled={false}
        onTabChange={onTabChange}
        onImportWeek={() => true}
      />
    );

    await waitFor(() => {
      expect(onTabChange).not.toHaveBeenCalled();
    });
  });
});

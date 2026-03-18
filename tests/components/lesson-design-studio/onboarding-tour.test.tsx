import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { OnboardingTour } from "@/app/(app)/instructor/lesson-design-studio/components/onboarding-tour";

describe("OnboardingTour", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scopes completion state by the provided storage key", async () => {
    localStorage.setItem("tour-a", "completed");

    const { rerender } = render(
      <OnboardingTour storageKey="tour-a" onComplete={vi.fn()} />
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(
      screen.queryByRole("dialog", { name: "Studio onboarding tour" })
    ).not.toBeInTheDocument();

    rerender(<OnboardingTour storageKey="tour-b" onComplete={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(
      screen.getByRole("dialog", { name: "Studio onboarding tour" })
    ).toBeInTheDocument();
  });

  it("stores completion using the scoped key and calls completion handlers", async () => {
    const onComplete = vi.fn();
    const onSeedHeader = vi.fn();
    const onSeedWeeks = vi.fn();

    render(
      <OnboardingTour
        storageKey="tour-complete"
        onSeedHeader={onSeedHeader}
        onSeedWeeks={onSeedWeeks}
        onComplete={onComplete}
      />
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: /technology/i }));

    expect(onSeedHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        durationWeeks: expect.any(Number),
        classDurationMin: expect.any(Number),
      })
    );

    for (let step = 0; step < 10; step += 1) {
      fireEvent.click(
        screen.getByRole("button", { name: /next|start customizing!/i })
      );
    }

    expect(onComplete).toHaveBeenCalledTimes(1);

    expect(localStorage.getItem("tour-complete")).toBe("completed");
    expect(onSeedWeeks).toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";

import {
  buildAdminPortalAnalyticsFilters,
  buildAnalyticsBreakdownRows,
  summarizeApplicationAnalytics,
  UNMAPPED_INTEREST_AREA,
} from "@/lib/admin-portal-analytics";

describe("admin-portal-analytics helpers", () => {
  describe("buildAdminPortalAnalyticsFilters", () => {
    it("defaults invalid inputs and computes the default 30-day window", () => {
      const now = new Date("2026-03-18T12:00:00.000Z");
      const filters = buildAdminPortalAnalyticsFilters(
        {
          dateRange: "not-real",
          chapterId: "   ",
          interestArea: "",
        },
        now
      );

      expect(filters.dateRange).toBe("30d");
      expect(filters.chapterId).toBeNull();
      expect(filters.interestArea).toBeNull();
      expect(filters.dateFrom?.toISOString()).toBe("2026-02-16T12:00:00.000Z");
    });

    it("normalizes the interest area filter into the shared unmapped bucket", () => {
      const now = new Date("2026-03-18T12:00:00.000Z");
      const filters = buildAdminPortalAnalyticsFilters(
        {
          dateRange: "7d",
          chapterId: "chapter-1",
          interestArea: "   ",
        },
        now
      );

      expect(filters.dateRange).toBe("7d");
      expect(filters.chapterId).toBe("chapter-1");
      expect(filters.interestArea).toBeNull();
    });
  });

  describe("buildAnalyticsBreakdownRows", () => {
    it("groups duplicate chapter and interest-area rows together", () => {
      const rows = buildAnalyticsBreakdownRows([
        { chapterName: "Boston", interestArea: "Music" },
        { chapterName: "Boston", interestArea: "Music", count: 2 },
        { chapterName: null, interestArea: "", count: 1 },
      ]);

      expect(rows).toEqual([
        { chapterName: "Boston", interestArea: "Music", count: 3 },
        {
          chapterName: "Unmapped",
          interestArea: UNMAPPED_INTEREST_AREA,
          count: 1,
        },
      ]);
    });
  });

  describe("summarizeApplicationAnalytics", () => {
    it("calculates conversion and average days to decision", () => {
      const summary = summarizeApplicationAnalytics([
        {
          status: "ACCEPTED",
          submittedAt: new Date("2026-03-01T00:00:00.000Z"),
          interviewRequired: true,
          interviewCompleted: true,
          decisionApprovedAt: new Date("2026-03-04T00:00:00.000Z"),
        },
        {
          status: "INTERVIEW_SCHEDULED",
          submittedAt: new Date("2026-03-02T00:00:00.000Z"),
          interviewRequired: true,
          interviewCompleted: false,
          decisionApprovedAt: null,
        },
        {
          status: "UNDER_REVIEW",
          submittedAt: new Date("2026-03-03T00:00:00.000Z"),
          interviewRequired: false,
          interviewCompleted: false,
          decisionApprovedAt: null,
        },
      ]);

      expect(summary.submitted).toBe(3);
      expect(summary.interviewRequiredCount).toBe(2);
      expect(summary.interviewCompletedCount).toBe(1);
      expect(summary.interviewConversionPct).toBe(50);
      expect(summary.approvedDecisionCount).toBe(1);
      expect(summary.averageDaysToDecision).toBe(3);
    });
  });
});

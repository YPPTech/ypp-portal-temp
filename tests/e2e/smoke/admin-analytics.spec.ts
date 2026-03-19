import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";

test("@smoke admin can open the portal reliability dashboard", async ({
  page,
}) => {
  await loginAs(page, "admin");
  await page.goto("/admin/analytics");

  await expect(
    page.getByRole("heading", { name: "Portal Reliability Dashboard" })
  ).toBeVisible();
  await expect(
    page.getByText("Applications And Readiness", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Training And Curriculum Launch Funnel", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Registrations And Enrollments By Chapter And Subject", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByText("Mentorship And Goal-Review Health", { exact: true })
  ).toBeVisible();
});

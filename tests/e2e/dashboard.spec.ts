// SPDX-FileCopyrightText: 2026 Tanvi Reddy <tanvireddy@example.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { test, expect, BrowserContext } from "@playwright/test";

const EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "admin@demo.example";
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "admin-changeme";

let sharedContext: BrowserContext;

// Login once for the whole suite using a shared browser context
test.beforeAll(async ({ browser }) => {
  sharedContext = await browser.newContext();
  const page = await sharedContext.newPage();
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  await page.close();
});

test.afterAll(async () => {
  await sharedContext?.close();
});

test.describe("Dashboard", () => {
  let page: Awaited<ReturnType<BrowserContext["newPage"]>>;

  test.beforeEach(async () => {
    page = await sharedContext.newPage();
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * P1: Stat cards render with numbers (not loading forever)
   * Issue #955 — Dashboard stat cards render
   */
  test("stat cards show numbers and are not loading", async () => {
    // Skeletons should clear
    await expect(page.locator(".animate-pulse").first()).not.toBeVisible({ timeout: 10_000 });

    // All four stat labels are visible
    for (const label of ["Agents", "Downloads", "Users", "Components"]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 10_000 });
    }

    // Stat values are numeric
    const statValues = page.locator(".tabular-nums.font-semibold");
    const count = await statValues.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await statValues.nth(i).textContent();
      expect(text?.trim()).toMatch(/^\d[\d,]*$/);
    }
  });

  /**
   * P1: Agent Scores section renders (heading visible, no crash)
   * Issue #955 — Trend chart renders with data points
   */
  test("agent scores section renders without error", async () => {
    await expect(page.locator("text=AGENT SCORES")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Something went wrong")).not.toBeVisible();
  });

  /**
   * P2: Top Downloads card shows top agents/MCPs by downloads
   * Issue #955 — Top items card
   */
  test("top downloads card renders items or empty state", async () => {
    await expect(page.locator("text=TOP DOWNLOADS")).toBeVisible({ timeout: 10_000 });

    const hasBar = await page.locator(".space-y-1\\.5").count();
    const hasEmpty = await page.locator("text=No download data").count();
    expect(hasBar + hasEmpty).toBeGreaterThan(0);
  });

  /**
   * P2: Recent Agents table renders
   */
  test("recent agents table renders", async () => {
    await expect(page.locator("text=RECENT AGENTS")).toBeVisible({ timeout: 10_000 });

    const hasTable = await page.locator("table").count();
    const hasEmpty = await page.locator("text=No agents deployed").count();
    expect(hasTable + hasEmpty).toBeGreaterThan(0);
  });
});

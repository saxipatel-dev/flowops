import { test, expect } from '@playwright/test';

// Regenerates the README screenshots from the freshly seeded flowops_test database.
// Skipped in normal test runs; use `npm run screenshots`.
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 (npm run screenshots) to regenerate the README images.');

const PASSWORD = 'Password123!';
const OUT = '../screenshots';
const desktop = { width: 1280, height: 800 };
const phone = { width: 390, height: 844 };

test.use({ deviceScaleFactor: 2 });

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// Waits for data and for the draw-in animations to finish before capturing.
async function capture(page, name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test('README screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(desktop);
  await page.goto('/login');
  await capture(page, 'sign-in');

  await login(page, 'priya@flowops.test');
  await capture(page, 'mission-control');

  await page.goto('/tasks?scope=all');
  await capture(page, 'task-atlas-board');

  await page.goto('/tasks?scope=all&view=timeline&range=month');
  await capture(page, 'task-atlas-timeline');

  await page.goto('/requests?scope=team');
  await page.getByRole('link', { name: 'Diagram software license renewal' }).click();
  await expect(page.getByRole('list', { name: /Request journey/ })).toBeVisible();
  await capture(page, 'decision-journey');

  await page.goto('/approvals');
  await capture(page, 'approval-desk');

  await page.goto('/activity');
  await capture(page, 'history');

  await page.setViewportSize(phone);
  await page.goto('/dashboard');
  await capture(page, 'phone-mission-control');

  await page.goto('/requests?scope=team');
  await page.getByRole('link', { name: 'Diagram software license renewal' }).click();
  await page.getByRole('list', { name: /Request journey/ }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  await capture(page, 'phone-flowmap');
});

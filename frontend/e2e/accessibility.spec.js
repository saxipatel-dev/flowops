import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PASSWORD = 'Password123!';
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// Runs axe on the page as it is now and fails on any WCAG 2.2 AA violation.
async function expectAccessible(page, label) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = violations.map((v) => `${label}: [${v.impact}] ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
}

const pagesByRole = {
  'maya@flowops.test': ['/dashboard', '/tasks', '/tasks?view=list', '/tasks?view=timeline', '/requests', '/requests/new', '/activity', '/notifications', '/profile'],
  'priya@flowops.test': ['/dashboard', '/tasks?scope=all', '/approvals', '/requests?scope=team'],
  'admin@flowops.test': ['/users', '/activity'],
};

test('the sign-in page meets WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/login');
  await expectAccessible(page, '/login');
});

for (const [email, paths] of Object.entries(pagesByRole)) {
  test(`pages for ${email} meet WCAG 2.2 AA`, async ({ page }) => {
    await login(page, email);
    for (const path of paths) {
      await page.goto(path);
      await expectAccessible(page, `${email} ${path}`);
    }
  });
}

test('detail pages, panels and the command palette meet WCAG 2.2 AA', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.goto('/requests');
  await page.getByRole('link', { name: 'Office supplies restock' }).click();
  await expectAccessible(page, 'request detail');

  await page.goto('/tasks');
  await page.locator('article a[href^="/tasks/"]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectAccessible(page, 'task panel');
  await page.keyboard.press('Escape');

  await page.locator('article a[href^="/tasks/"]').first().click({ modifiers: ['ControlOrMeta'] }).catch(() => {});
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Search or jump to' }).click();
  await page.getByRole('combobox', { name: 'Search' }).fill('re');
  await page.waitForTimeout(500);
  await expectAccessible(page, 'command palette');
});

test('phone layouts meet WCAG 2.2 AA', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, 'priya@flowops.test');
  for (const path of ['/dashboard', '/tasks', '/approvals', '/activity']) {
    await page.goto(path);
    await expectAccessible(page, `phone ${path}`);
  }
  await page.getByRole('button', { name: 'More' }).click();
  await expectAccessible(page, 'phone more menu');
});

test('reduced motion turns animation off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(await page.locator('animateMotion').count()).toBe(0);
  await login(page, 'priya@flowops.test');
  await expect(page.getByRole('heading', { name: 'Operations Pulse' })).toBeVisible();
  // Every running CSS animation is cut to an instant.
  const slowest = await page.evaluate(() =>
    Math.max(0, ...document.getAnimations().map((animation) => animation.effect?.getTiming().duration || 0).filter(Number.isFinite)),
  );
  expect(slowest).toBeLessThan(1);
});

test('keyboard users can skip straight to the page content', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  // The URL changes before the dashboard finishes rendering; on a slow CI runner an
  // early Tab lands on the page before the skip link exists. Start from a settled page.
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

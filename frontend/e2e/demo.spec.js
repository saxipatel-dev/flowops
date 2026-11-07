import fs from 'node:fs';
import { test, expect } from '@playwright/test';

// Records the README walkthrough against the freshly seeded flowops_test database.
// Skipped in normal test runs; use `npm run demo`. The video and storyboard stills
// are written to docs/demo/.
test.skip(!process.env.DEMO, 'Set DEMO=1 (npm run demo) to record the walkthrough.');

const PASSWORD = 'Password123!';
const OUT = '../docs/demo';
const size = { width: 1280, height: 800 };

test.use({ viewport: size, video: { mode: 'on', size } });

// Playwright videos have no mouse pointer, so the recording draws one. Demo only.
const pointer = `
  window.addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;z-index:99999;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
      'background:rgba(232,234,244,.85);box-shadow:0 0 0 3px rgba(157,140,255,.6);pointer-events:none;transition:transform .08s;left:-40px;top:-40px';
    document.body.appendChild(dot);
    addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { dot.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { dot.style.transform = 'none'; }, true);
  });`;

let still = 0;
async function frame(page, name) {
  still += 1;
  await page.screenshot({ path: `${OUT}/stills/${String(still).padStart(2, '0')}-${name}.png` });
}

// Moves the visible pointer to an element before clicking it, so viewers can follow.
async function point(page, locator) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await page.waitForTimeout(250);
}

async function click(page, locator) {
  await point(page, locator);
  await locator.click();
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').pressSequentially(email, { delay: 25 });
  await page.getByLabel('Password').fill(PASSWORD);
  await click(page, page.getByRole('button', { name: 'Sign in' }));
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole('heading', { name: 'Operations Pulse' }).waitFor();
}

async function logout(page) {
  await click(page, page.getByRole('button', { name: 'Log out' }));
  await expect(page).toHaveURL(/\/login/);
}

test('README walkthrough', async ({ page }) => {
  test.setTimeout(180_000);
  fs.mkdirSync(`${OUT}/stills`, { recursive: true });
  await page.addInitScript(pointer);

  // 1. Mission Control, as a manager.
  await login(page, 'daniel@flowops.test');
  await page.waitForTimeout(1800);
  await frame(page, 'mission-control');
  const stop = page.getByRole('list', { name: 'Tasks by person' }).getByRole('button').first();
  if (await stop.isVisible()) {
    await click(page, stop);
    await page.waitForTimeout(1400);
  }

  // 2. Task Atlas: drag a card from To Do to In Progress.
  await click(page, page.getByRole('link', { name: 'Tasks', exact: true }));
  await click(page, page.getByRole('tab', { name: 'Team tasks' }));
  await page.waitForTimeout(900);
  const column = (name) => page.locator('section').filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) });
  const handle = column('To Do').getByRole('button', { name: /^Drag “/ }).first();
  const from = await handle.boundingBox();
  const to = await column('In Progress').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2, { steps: 15 });
  await page.mouse.down();
  await page.mouse.move(from.x + 60, from.y + 10, { steps: 8 });
  await page.mouse.move(to.x + to.width / 2, to.y + 90, { steps: 30 });
  await frame(page, 'task-board-drag');
  await page.mouse.up();
  await expect(page.getByText(/^Moved “.*” to In Progress\.$/)).toBeVisible();
  await page.waitForTimeout(1600);
  await logout(page);

  // 3. An employee submits a request.
  await login(page, 'maya@flowops.test');
  await click(page, page.getByRole('link', { name: 'Requests', exact: true }));
  await click(page, page.getByRole('link', { name: 'New request' }));
  await page.getByLabel('Category').selectOption('EQUIPMENT');
  await page.getByLabel('Title').pressSequentially('Ergonomic keyboard', { delay: 30 });
  await page.getByLabel('Description').pressSequentially('My wrists hurt after long typing sessions on the current keyboard.', { delay: 12 });
  await page.getByLabel('Estimated cost (USD)').pressSequentially('80', { delay: 60 });
  await frame(page, 'new-request');
  await click(page, page.getByRole('button', { name: 'Submit request' }));
  await expect(page.getByText('Request submitted. Your manager has been notified.')).toBeVisible();
  await page.waitForTimeout(1800);
  await logout(page);

  // 4. The manager reviews it on the Approval Desk.
  await login(page, 'daniel@flowops.test');
  await click(page, page.getByRole('link', { name: 'Approvals' }));
  const queue = page.getByRole('list', { name: 'Requests waiting for your decision' });
  await click(page, queue.getByRole('listitem').filter({ hasText: 'Ergonomic keyboard' }).getByRole('button'));
  const pane = page.getByRole('region', { name: 'Review' });
  await page.waitForTimeout(1500);
  await frame(page, 'approval-desk');

  // 5. Approve, assigning the follow-up task back to the requester.
  await pane.getByLabel('Comment or rejection reason').pressSequentially('Approved. Please order the standard model.', { delay: 18 });
  await pane.getByLabel('Assign task to').selectOption({ label: 'Maya Chen' });
  await page.waitForTimeout(900);
  await click(page, pane.getByRole('button', { name: 'Approve', exact: true }));
  await click(page, page.getByRole('dialog').getByRole('button', { name: 'Approve' }));
  await expect(pane.getByText('Request approved.')).toBeVisible();
  await page.waitForTimeout(2000);
  await frame(page, 'approved');

  // 6. The Decision Journey on the request's own page.
  await click(page, pane.getByRole('link', { name: 'Open full page' }));
  const stops = page.getByRole('list', { name: /Request journey/ }).getByRole('button');
  await stops.first().waitFor();
  await page.waitForTimeout(1200);
  for (const index of [0, 2, 3]) {
    await click(page, stops.nth(index));
    await page.waitForTimeout(1300);
  }
  await frame(page, 'decision-journey');

  // 7. Everything is in History.
  await click(page, page.getByRole('link', { name: 'Activity', exact: true }));
  await page.getByText(/events you can see/).waitFor();
  await page.waitForTimeout(2500);
  await frame(page, 'history');

  const video = page.video();
  await page.context().close();
  fs.copyFileSync(await video.path(), `${OUT}/flowops-walkthrough.webm`);
});

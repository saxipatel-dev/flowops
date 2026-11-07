import { test, expect } from '@playwright/test';

const PASSWORD = 'Password123!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('rejects wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('maya@flowops.test');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
});

test('employees cannot open manager or admin pages', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await expect(page.getByRole('link', { name: 'Approvals' })).toHaveCount(0);

  await page.goto('/approvals');
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('request is submitted, approved, and its follow-up task is completed', async ({ page }) => {
  // Employee submits a request
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Requests', exact: true }).click();
  await page.getByRole('link', { name: 'New request' }).click();
  await page.getByLabel('Category').selectOption('EQUIPMENT');
  await page.getByLabel('Title').fill('Ergonomic keyboard');
  await page.getByLabel('Description').fill('Wrist pain when typing for long periods on the current keyboard.');
  await page.getByLabel('Estimated cost (USD)').fill('80');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByText('Request submitted. Your manager has been notified.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ergonomic keyboard' })).toBeVisible();
  await logout(page);

  // Manager approves it and assigns the follow-up task back to Maya
  await login(page, 'daniel@flowops.test');
  await page.getByRole('link', { name: 'Approvals' }).click();
  await expect(page).toHaveURL(/\/approvals/);
  // The approval desk opens the request in its review pane, next to the queue.
  const queue = page.getByRole('list', { name: 'Requests waiting for your decision' });
  const row = queue.getByRole('listitem').filter({ hasText: 'Ergonomic keyboard' });
  await row.getByRole('button').click();
  const pane = page.getByRole('region', { name: 'Review' });

  await pane.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(pane.getByText('Please give a reason for the rejection')).toBeVisible();

  await pane.getByLabel('Comment or rejection reason').fill('Approved, please order the standard model.');
  await pane.getByLabel('Assign task to').selectOption({ label: 'Maya Chen' });
  await pane.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await expect(pane.getByText('Request approved.')).toBeVisible();
  // The journey now runs on to the follow-up task, which the manager can open.
  await expect(pane.getByRole('link', { name: 'Fulfil request: Ergonomic keyboard' }).first()).toBeVisible();
  await expect(pane.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
  await logout(page);

  // Employee sees the notification and completes the task
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Notifications', exact: true }).click();
  await expect(page.getByText('Your request "Ergonomic keyboard" was approved')).toBeVisible();

  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  // On the board a task opens in a side panel first; the full page is one click away.
  await page.getByRole('link', { name: 'Fulfil request: Ergonomic keyboard' }).click();
  const panel = page.getByRole('dialog', { name: 'Fulfil request: Ergonomic keyboard' });
  await expect(panel).toBeVisible();
  await panel.getByRole('link', { name: 'Open full page' }).click();
  await page.getByLabel('Update status').selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Status updated to Completed.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('To Do → Completed')).toBeVisible();
});

test('changing a password signs out other browsers', async ({ page, browser }) => {
  const otherDevice = await browser.newPage();
  await login(otherDevice, 'jordan@flowops.test');
  await login(page, 'jordan@flowops.test');

  await page.goto('/profile');
  await page.getByLabel('Current password').fill(PASSWORD);
  await page.getByLabel('New password', { exact: true }).fill('Changed123!');
  await page.getByLabel('Confirm new password').fill('Changed123!');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed.')).toBeVisible();

  // This browser stays signed in; the other one is sent back to the login page.
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await expect(page).toHaveURL(/\/tasks/);
  await otherDevice.goto('/tasks');
  await expect(otherDevice).toHaveURL(/\/login/);
  await otherDevice.close();
});

test('navigation works on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, 'priya@flowops.test');

  // Pages that are not in the tab bar live in the More menu.
  const moreButton = page.getByRole('button', { name: 'More' });
  await moreButton.click();
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(moreButton).toBeFocused();

  await moreButton.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Approvals' }).click();
  await expect(page).toHaveURL(/\/approvals/);

  await page.getByRole('link', { name: 'Requests', exact: true }).click();
  await expect(page).toHaveURL(/\/requests/);
  await page.getByRole('tab', { name: 'Team requests' }).click();
  // Lists switch to cards instead of a squeezed table.
  await expect(page.getByRole('table')).toBeHidden();
  await expect(page.getByRole('list', { name: 'Requests' })).toBeVisible();
});

test('the command palette finds only records the user can open', async ({ page }) => {
  await login(page, 'priya@flowops.test');
  await page.getByRole('button', { name: 'Search or jump to' }).waitFor();
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.getByRole('combobox', { name: 'Search' });
  await expect(search).toBeFocused();
  await search.fill('laptops');
  await page.getByRole('option', { name: /Set up laptops for new hires/ }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Set up laptops for new hires' })).toBeVisible();

  // An employee in another department gets no result for the same search.
  await logout(page);
  await login(page, 'maya@flowops.test');
  await page.getByRole('button', { name: 'Search or jump to' }).click();
  await page.getByRole('combobox', { name: 'Search' }).fill('laptops');
  await expect(page.getByText('No tasks or requests match “laptops”.')).toBeVisible();
});

test('mission control moves a task from the week map', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening), Maya$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operations Pulse' })).toBeVisible();

  // Seed due dates are relative to today, so look ahead week by week for one of Maya's open tasks.
  const openStop = page.getByRole('button', { name: /\s*, you, To do\s*,/ }).first();
  const appears = () => openStop.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false);
  for (let week = 0; week < 4 && !(await appears()); week++) {
    // Wait for that week's tasks to arrive before looking again.
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/dashboard/timeline')),
      page.getByRole('button', { name: 'Next week' }).click(),
    ]);
  }
  // The stop's visible title is its first line.
  const title = (await openStop.locator('.line-clamp-2').innerText()).trim();
  await openStop.click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText(`Moved “${title}” to In Progress.`)).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*, you, In progress`) })).toBeVisible();

  // The change is saved, not just drawn.
  await page.getByRole('link', { name: 'Open task' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('In Progress').first()).toBeVisible();
});

test('task board: drag with the mouse or keyboard, and a refused move snaps back', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  const column = (name) => page.locator('section').filter({ has: page.getByRole('heading', { name: new RegExp(`^${name}`) }) });
  const todo = column('To Do');
  const inProgress = column('In Progress');
  await expect(todo.getByRole('button', { name: /^Drag “/ }).first()).toBeVisible();

  // Mouse: drag the first movable card into In Progress.
  const handle = todo.getByRole('button', { name: /^Drag “/ }).first();
  const title = (await handle.getAttribute('aria-label')).slice(6, -1);
  const from = await handle.boundingBox();
  const to = await inProgress.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText(`Moved “${title}” to In Progress.`)).toBeVisible();
  await expect(inProgress.getByRole('link', { name: title })).toBeVisible();

  // Refused by the server: the card snaps back and the reason is shown.
  await page.route('**/api/tasks/*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'You can only update the status of tasks assigned to you.' }) })
      : route.continue(),
  );
  const back = inProgress.getByRole('button', { name: `Drag “${title}”` });
  const backFrom = await back.boundingBox();
  const target = await column('Completed').boundingBox();
  await page.mouse.move(backFrom.x + backFrom.width / 2, backFrom.y + backFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(backFrom.x + 40, backFrom.y + 10, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 80, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText('You can only update the status of tasks assigned to you.')).toBeVisible();
  await expect(inProgress.getByRole('link', { name: title })).toBeVisible();
  await page.unroute('**/api/tasks/*');

  // Keyboard: Space picks the card up, the right arrow moves it a column, Space drops it.
  await inProgress.getByRole('button', { name: `Drag “${title}”` }).focus();
  // Each step is announced to screen readers; wait for it like a person would.
  await page.keyboard.press('Space');
  await expect(page.getByText('Over In Progress.')).toBeAttached();
  // dnd-kit starts listening for arrow keys a moment after the pick-up; a person never types faster.
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Over Completed.')).toBeAttached();
  await page.keyboard.press('Space');
  await expect(page.getByText(`Moved “${title}” to Completed.`)).toBeVisible();
  await expect(column('Completed').getByRole('link', { name: title })).toBeVisible();

  // The board's choice is saved: the list view agrees after a reload.
  await page.getByRole('button', { name: 'List' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row.getByText('Completed')).toBeVisible();
});

test('task panel opens from the timeline, survives a reload, and Back closes it', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.goto('/tasks?view=timeline&range=month');
  const link = page.getByRole('list', { name: 'Tasks by due date' }).getByRole('link').first();
  const title = await link.innerText();
  await link.click();
  await expect(page.getByRole('dialog', { name: title })).toBeVisible();
  await expect(page).toHaveURL(/task=\d+/);
  await page.reload();
  await expect(page.getByRole('dialog', { name: title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/task=/);

  await link.click();
  await expect(page.getByRole('dialog', { name: title })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('decision journey shows recorded stages, works by keyboard, and turns vertical on phones', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.goto('/requests');
  await page.getByRole('link', { name: 'Office supplies restock' }).click();
  const journey = page.getByRole('list', { name: /Request journey/ });
  const stops = journey.getByRole('button');
  await expect(stops).toHaveCount(5);

  // A finished request opens on its last stage, with the recorded completion time.
  await expect(stops.nth(4)).toHaveAttribute('aria-pressed', 'true');
  await expect(stops.nth(4)).toHaveAccessibleName(/^Completed\b[\s\S]*\. Done\. Completed · /);

  // Arrow keys move along the line; the follow-up stage links to Maya's own task.
  await stops.nth(4).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(stops.nth(3)).toBeFocused();
  await expect(stops.nth(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Fulfil request: Office supplies restock' }).last()).toBeVisible();

  // On a phone the stops stack into a vertical journey.
  await page.setViewportSize({ width: 375, height: 812 });
  const first = await stops.nth(0).boundingBox();
  const last = await stops.nth(4).boundingBox();
  expect(Math.abs(first.x - last.x)).toBeLessThan(2);
  expect(last.y).toBeGreaterThan(first.y + 150);
});

test('the sign-in page loads no operational data', async ({ page }) => {
  const apiCalls = [];
  page.on('request', (request) => request.url().includes('/api/') && apiCalls.push(new URL(request.url()).pathname));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect([...new Set(apiCalls)]).toEqual(['/api/auth/me']);
});

test('history filters by the day picked on the pulse and keeps it after a reload', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Activity', exact: true }).click();
  const busyDay = page.getByRole('button', { name: /: [1-9]\d* events?$/ }).last();
  const label = await busyDay.getAttribute('aria-label');
  const count = Number(label.match(/: (\d+) event/)[1]);
  await busyDay.click();
  await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByText(new RegExp(`^${count} events? on `))).toBeVisible();
  await page.reload();
  await expect(page.getByText(new RegExp(`^${count} events? on `))).toBeVisible();
  await page.getByRole('button', { name: /All days/ }).click();
  await expect(page).not.toHaveURL(/date=/);
});

test('inbox marks an update as read and it stays read', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Notifications', exact: true }).click();
  await expect(page.getByText(/not pushed live/)).toBeVisible();
  const lane = page.locator('section', { has: page.getByRole('heading', { name: /^Unread/ }) });
  await expect(lane.getByRole('listitem').first()).toBeVisible();
  const before = await lane.getByRole('listitem').count();
  expect(before).toBeGreaterThan(0);
  await lane.getByRole('button', { name: /Mark as read/ }).first().click();
  await expect(lane.getByRole('listitem')).toHaveCount(before - 1);
  await page.reload();
  if (before > 1) await expect(lane.getByRole('listitem')).toHaveCount(before - 1);
  else await expect(page.getByRole('heading', { name: /^Unread/ })).toHaveCount(0);
});

test('admins edit people in the side panel', async ({ page }) => {
  await login(page, 'admin@flowops.test');
  await page.goto('/users');
  await page.getByRole('button', { name: 'Edit Sam Okafor' }).click();
  const panel = page.getByRole('dialog', { name: 'Edit Sam Okafor' });
  await panel.getByLabel('Job title').fill('Senior Systems Administrator');
  await panel.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Sam Okafor was updated.')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Senior Systems Administrator')).toBeVisible();
});

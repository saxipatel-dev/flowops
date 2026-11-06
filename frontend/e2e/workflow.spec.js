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
  const row = page.getByRole('listitem').filter({ hasText: 'Ergonomic keyboard' });
  await row.getByRole('link', { name: 'Review' }).click();

  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Please give a reason for the rejection')).toBeVisible();

  await page.getByLabel('Comment or rejection reason').fill('Approved, please order the standard model.');
  await page.getByLabel('Assign task to').selectOption({ label: 'Maya Chen' });
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Request approved.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fulfil request: Ergonomic keyboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  await logout(page);

  // Employee sees the notification and completes the task
  await login(page, 'maya@flowops.test');
  await page.getByRole('link', { name: 'Notifications', exact: true }).click();
  await expect(page.getByText('Your request "Ergonomic keyboard" was approved')).toBeVisible();

  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('link', { name: 'Fulfil request: Ergonomic keyboard' }).click();
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
  await page.getByRole('button', { name: 'Search and jump to' }).waitFor();
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
  await page.getByRole('button', { name: 'Search and jump to' }).click();
  await page.getByRole('combobox', { name: 'Search' }).fill('laptops');
  await expect(page.getByText('No tasks or requests match “laptops”.')).toBeVisible();
});

test('mission control moves a task from the week map', async ({ page }) => {
  await login(page, 'maya@flowops.test');
  await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening), Maya$/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operations Pulse' })).toBeVisible();

  // Seed due dates are relative to today, so look ahead week by week for one of Maya's open tasks.
  const openStop = page.getByRole('button', { name: /, you, To do,/ }).first();
  for (let week = 0; week < 4 && !(await openStop.isVisible()); week++) {
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.waitForLoadState('networkidle');
  }
  const label = await openStop.getAttribute('aria-label');
  const title = label.split(', you,')[0];
  await openStop.click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText(`Moved “${title}” to In Progress.`)).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, you, In progress`) })).toBeVisible();

  // The change is saved, not just drawn.
  await page.getByRole('link', { name: 'Open task' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('In Progress').first()).toBeVisible();
});

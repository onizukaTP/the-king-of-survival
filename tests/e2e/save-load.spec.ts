import { expect, test } from '@playwright/test';

test('travel to a known place, save, reload and continue restores identical state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 06:00');
  await expect(page.getByTestId('status')).toHaveText('At: Home');

  // D-017: nearby places are known from the start; far ones are not.
  await expect(page.getByRole('button', { name: 'Srivilliputhur town ruins' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Madurai city ruins' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Srivilliputhur town ruins' }).click();
  await expect(page.locator('.panel h2')).toHaveText('Srivilliputhur town ruins');
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  await expect(page.getByTestId('status')).toHaveText('On the road');
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins', { timeout: 15_000 });
  await expect(page.getByTestId('clock')).not.toHaveText('Day 1 · 06:00');

  const state = page.getByTestId('game-state');
  const before = await state.textContent();

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Game saved.');

  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins');
  await expect(state).toHaveText(before ?? '');
});

test('clicking unmarked ground offers a cross-country trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.locator('.map').click({ position: { x: 60, y: 60 } });
  await expect(page.locator('.panel h2')).toHaveText('Unmarked ground');
  await expect(page.getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.panel')).toContainText('Select a place');
});

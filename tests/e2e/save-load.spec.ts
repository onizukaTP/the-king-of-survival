import { expect, test } from '@playwright/test';

test('New Game → Save → refresh → Continue restores identical state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByRole('heading', { name: 'Prabu' })).toBeVisible();
  const state = page.getByTestId('game-state');
  const before = await state.textContent();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toHaveText('Game saved.');

  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(state).toHaveText(before ?? '');
});

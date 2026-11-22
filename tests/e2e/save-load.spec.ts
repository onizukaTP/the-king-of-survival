import { expect, test } from '@playwright/test';

test('travel to a known place, reload and continue restores identical state (autosave, D-038)', async ({ page }) => {
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
  // The walk drained the meters a little (D-035).
  await expect(page.getByTestId('meter-water')).toHaveAttribute('aria-valuenow', '95');

  const state = page.getByTestId('game-state');
  const before = await state.textContent();

  // No save button: the game saved itself after every leg.
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins');
  await expect(state).toHaveText(before ?? '');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Save and quit' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(state).toHaveText(before ?? '');
});

test('clicking unmarked ground offers a cross-country trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.locator('.map').click({ position: { x: 60, y: 60 } });
  await expect(page.locator('.panel h2')).toHaveText('Unmarked ground');
  await expect(page.getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  // With nothing selected the panel shows where Prabu stands.
  await expect(page.locator('.panel h2')).toHaveText('Home');
});

test('double-clicking a place or open ground starts the trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Sanctuary forest' }).dblclick();
  // A short trip can finish before we look, so check the arrival rather than the road.
  await expect(page.getByTestId('status')).toHaveText('At: Sanctuary forest', { timeout: 15_000 });
  await expect(page.getByTestId('clock')).not.toHaveText('Day 1 · 06:00');

  await page.locator('.map').dblclick({ position: { x: 60, y: 60 } });
  await expect(page.getByTestId('status')).toHaveText('On the road');
});

test('resting after a trip only passes time; Prabu stays put', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Sanctuary forest' }).dblclick();
  await expect(page.getByTestId('status')).toHaveText('At: Sanctuary forest', { timeout: 15_000 });
  await page.waitForTimeout(800);
  const marker = page.locator('.prabu-marker');
  const before = await marker.boundingBox();

  await page.getByRole('button', { name: 'Rest', exact: true }).click();
  await page.getByRole('button', { name: '1 hour' }).click();
  // The old bug replayed the last leg over ~600 ms; sample across that window.
  for (const wait of [50, 200, 400]) {
    await page.waitForTimeout(wait);
    expect(await marker.boundingBox()).toEqual(before);
  }
  await expect(page.getByTestId('status')).toHaveText('At: Sanctuary forest');
});

test('the pack shows the starting kit and equips, and rest passes time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();

  await page.getByRole('button', { name: /^Pack/ }).click();
  await expect(page.locator('.panel h2')).toHaveText('Pack');
  await expect(page.locator('.slot')).toContainText('Hunting knife');
  await expect(page.locator('.panel')).toContainText('Lighter · 10/20');
  await expect(page.locator('.panel')).toContainText('Torch · 50%');

  await page.getByRole('button', { name: 'Unequip' }).click();
  await expect(page.locator('.panel')).toContainText('Nothing equipped.');
  await page.getByRole('button', { name: /Hunting knife/ }).click();
  await page.getByTestId('item-card').getByRole('button', { name: 'Equip' }).click();
  await expect(page.locator('.slot')).toContainText('Hunting knife');

  await page.getByRole('button', { name: 'Rest', exact: true }).click();
  await page.getByRole('button', { name: '4 hours' }).click();
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 10:00');
  await expect(page.getByTestId('meter-water')).toHaveAttribute('aria-valuenow', '88');
});

test('dying ends the run and deletes its save (D-038)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Rest', exact: true }).click();
  // Water runs out after ~33 h, then Health falls 5 an hour: dead within about 53 h of sleep.
  for (let i = 0; i < 20 && (await page.getByRole('button', { name: '4 hours' }).count()); i++) {
    await page.getByRole('button', { name: '4 hours' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Prabu has died' })).toBeVisible();
  await expect(page.getByText('He died of thirst.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to title' }).click();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('enter the town, walk to a building, search it; drops stay on its floor; leave (M4, P-014)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Srivilliputhur town ruins' }).dblclick();
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins', { timeout: 15_000 });
  const panel = page.getByTestId('here-panel');
  await panel.getByRole('button', { name: 'Enter town' }).click();
  await expect(page.getByTestId('status')).toHaveText('In Srivilliputhur town ruins');

  // Click a building to see it, click it again to walk there (D-022 on the town map).
  const garage = page.getByRole('button', { name: 'Garage', exact: true });
  await garage.click();
  await expect(page.getByTestId('spot-panel')).toContainText('Left to find100%');
  await garage.click();
  await expect(page.getByTestId('status')).toHaveText('In Srivilliputhur town ruins: Garage');
  await expect(page.getByTestId('clock')).not.toHaveText(/06:|07:[0-4]/);

  // Being in a town survives saving and loading. (Save and quit waits for the write; a bare
  // reload right after a walk can beat the autosave on a slow machine.)
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Save and quit' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('status')).toHaveText('In Srivilliputhur town ruins: Garage');

  // Finds are random per run; a few searches always turn something up.
  for (let i = 0; i < 6 && !(await panel.getByText('On the ground').count()); i++) {
    await panel.getByRole('button', { name: 'Search (45 min)' }).click();
  }
  await expect(panel.getByText('On the ground')).toBeVisible();
  await panel.getByRole('button', { name: 'Take all' }).click();
  await expect(panel.getByText('On the ground')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Pack/ })).not.toHaveText('Pack 0.65 kg');

  // Drop the torch: it waits on the garage floor and can be taken back.
  await page.getByRole('button', { name: /^Pack/ }).click();
  await page.getByRole('button', { name: /^Torch/ }).click();
  await page.getByTestId('item-card').getByRole('button', { name: 'Drop 1' }).click();
  await garage.click();
  await expect(panel).toContainText('Torch');
  await panel.getByRole('checkbox').last().check();
  await panel.getByRole('button', { name: 'Take selected' }).click();
  await page.getByRole('button', { name: /^Pack/ }).click();
  await expect(page.locator('.panel')).toContainText('Torch · 50%');

  // Leave only from the edge of town (D-053): walk back to it, then leave to the world map.
  await page.getByRole('button', { name: /^Pack/ }).click();
  await garage.click();
  await expect(panel).toContainText('Walk to the edge of town or one of its ends to leave.');
  await expect(panel.getByRole('button', { name: 'Leave town' })).toHaveCount(0);
  const edge = page.getByRole('button', { name: 'Edge of town', exact: true });
  await edge.click();
  await edge.click();
  await expect(page.getByTestId('status')).toHaveText('In Srivilliputhur town ruins');
  await panel.getByRole('button', { name: 'Leave town' }).click();
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins');
});

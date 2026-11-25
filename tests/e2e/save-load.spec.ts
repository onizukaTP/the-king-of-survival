import { expect, test } from '@playwright/test';

// Seed 2 meets no random event (D-059) on the trips these tests make, so they run the same every time.

/** New Game, then Skip the intro (D-076). */
async function newGame(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
}

test('travel to a known place, reload and continue restores identical state (autosave, D-038)', async ({ page }) => {
  await page.goto('/?seed=2');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();

  await page.getByRole('button', { name: 'New Game' }).click();
  // D-076: a new run opens on the intro; Skip goes straight to the map at midday.
  await expect(page.getByTestId('intro')).toContainText('I was born on the day the bombs fell.');
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('status')).toHaveText('Day 1, midday. The eclipse is passing.');
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 12:00');
  await expect(page.getByTestId('status')).toHaveText('At: Kottai Nagar');

  // D-017: nearby places are known from the start; far ones are not.
  await expect(page.getByRole('button', { name: 'Srivilliputhur town ruins' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Madurai city ruins' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Srivilliputhur town ruins' }).click();
  await expect(page.locator('.panel h2')).toHaveText('Srivilliputhur town ruins');
  await page.getByRole('button', { name: 'Travel', exact: true }).click();
  await expect(page.getByTestId('status')).toHaveText('On the road');
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins', { timeout: 15_000 });
  await expect(page.getByTestId('clock')).not.toHaveText('Day 1 · 12:00');
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
  await page.goto('/?seed=2');
  await newGame(page);
  await page.locator('.map').click({ position: { x: 60, y: 60 } });
  await expect(page.locator('.panel h2')).toHaveText('Unmarked ground');
  await expect(page.getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  // With nothing selected the panel shows where Prabu stands.
  await expect(page.locator('.panel h2')).toHaveText('Kottai Nagar');
});

test('double-clicking a place or open ground starts the trip', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  await page.getByRole('button', { name: 'Sanctuary forest' }).dblclick();
  // A short trip can finish before we look, so check the arrival rather than the road.
  await expect(page.getByTestId('status')).toHaveText('At: Sanctuary forest', { timeout: 15_000 });
  await expect(page.getByTestId('clock')).not.toHaveText('Day 1 · 12:00');

  await page.locator('.map').dblclick({ position: { x: 60, y: 60 } });
  await expect(page.getByTestId('status')).toHaveText('On the road');
});

test('resting after a trip only passes time; Prabu stays put', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
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
  await page.goto('/?seed=2');
  await newGame(page);

  await page.getByRole('button', { name: /^Pack/ }).click();
  await expect(page.locator('.panel h2')).toHaveText('Pack');
  await expect(page.locator('.slot')).toContainText('Hunting knife');
  await expect(page.locator('.panel')).toContainText('Lighter · 10/20');
  await expect(page.locator('.panel')).toContainText('Torch · 50%');
  // Item tooltips come from the item's data.
  await expect(page.locator('.slot .item-name')).toHaveAttribute('title', /Damage 4–7 · SPD \+1, Crit \+5%\nAbilities: Stab, Open a vein/);
  await expect(page.getByRole('button', { name: /^Lighter/ })).toHaveAttribute('title', /Up to 20 uses/);

  await page.getByRole('button', { name: 'Unequip' }).click();
  await expect(page.locator('.panel')).toContainText('Nothing equipped.');
  await page.getByRole('button', { name: /Hunting knife/ }).click();
  await page.getByTestId('item-card').getByRole('button', { name: 'Equip' }).click();
  await expect(page.locator('.slot')).toContainText('Hunting knife');

  await page.getByRole('button', { name: 'Rest', exact: true }).click();
  await page.getByRole('button', { name: '4 hours' }).click();
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 16:00');
  await expect(page.getByTestId('meter-water')).toHaveAttribute('aria-valuenow', '88');
});

test('dying ends the run and deletes its save (D-038)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
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
  await page.goto('/?seed=2');
  await newGame(page);
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

test('the Craft panel lists recipes and blocks what is missing (M5)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  await page.getByRole('button', { name: 'Craft' }).click();
  const cards = page.getByTestId('recipe-card');
  await expect(cards).toHaveCount(7);
  await expect(cards.first()).toContainText('Cloth rags 0/2');
  await expect(cards.first()).toContainText('Needs 2 more cloth rags');
  await expect(cards.first().getByRole('button', { name: 'Craft' })).toBeDisabled();
  await expect(page.getByTestId('craft-panel')).toContainText('Tool: hunting knife ✓');
});

/** Starts a new game, then rewrites its save so this event's card is open, and continues it. */
async function facingEvent(page: import('@playwright/test').Page, eventId: string, clockMinutes = 360) {
  await page.goto('/?seed=2');
  await newGame(page);
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 12:00');
  const state = JSON.parse((await page.getByTestId('game-state').textContent()) ?? '{}');
  const gameState = { ...state, clockMinutes, event: { id: eventId, result: null } };
  await page.evaluate((gs) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('king-of-survival', 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ saveVersion: 10, createdAt: 'e2e', gameState: gs }, 'manual');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), gameState);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
}

test('a fight from the wild dogs card: attack until they are dead, take the meat (M7)', async ({ page }) => {
  await facingEvent(page, 'event.wild_dogs');
  await page.getByRole('dialog', { name: 'Wild dogs' }).getByRole('button', { name: 'Fight' }).click();
  const combat = page.getByTestId('combat');
  await expect(combat).toBeVisible();
  await expect(combat).toContainText('Round 1');
  await expect(combat.getByTestId('stats')).toContainText('ATK');
  const result = page.getByRole('dialog', { name: 'He won the fight' });
  for (let i = 0; i < 40 && !(await result.count()); i++) {
    // D-069: pick an ability, then one of the highlighted targets; pass when nothing is in reach.
    const stab = combat.getByRole('button', { name: /^Stab/ });
    if (await stab.isEnabled()) {
      await stab.click();
      await combat.locator('.figure.targetable').first().click();
    } else {
      await combat.getByRole('button', { name: 'Pass' }).click();
    }
  }
  await expect(result).toContainText('Found: raw meat');
  await result.getByRole('button', { name: 'Continue' }).click();
  await expect(combat).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Pack/ })).not.toHaveText('Pack 0.65 kg');
  // D-076: the win gave XP and left a note in the journal.
  await page.getByRole('button', { name: 'Journal' }).click();
  await expect(page.getByTestId('level')).toContainText('Level 1 · ');
  await expect(page.getByTestId('level')).not.toContainText('Level 1 · 0 /');
  await expect(page.getByTestId('journal-panel')).toContainText('Won a fight: wild dog');
});

test('an event card must be answered, shows what happened, and leaves a condition (M6, D-059, D-061)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  // Wait for the autosave, then rewrite the save with wild dogs met at 22:00 on Day 1.
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 12:00');
  const state = JSON.parse((await page.getByTestId('game-state').textContent()) ?? '{}');
  const gameState = { ...state, clockMinutes: 1320, event: { id: 'event.wild_dogs', result: null } };
  await page.evaluate((gs) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('king-of-survival', 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ saveVersion: 10, createdAt: 'e2e', gameState: gs }, 'manual');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), gameState);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();

  const card = page.getByRole('dialog', { name: 'Wild dogs' });
  await expect(card).toBeVisible();
  await expect(page.getByTestId('moon')).toHaveText('● Dark night');
  await expect(card.getByRole('button', { name: '[Meat] Throw them the meat' })).toBeDisabled();
  await expect(card).toContainText('Needs raw meat or cooked meat');
  // Nothing else works while the card is open.
  await expect(card.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Back away slowly' }).click();
  await expect(card).toContainText('Shaken');
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Shaken' })).toBeVisible();
});

test('the Test button shows only with ?debug=1 and opens events and fights (D-068)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  await expect(page.getByRole('button', { name: 'Test' })).toHaveCount(0);

  await page.goto('/?seed=2&debug=1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Test' }).click();
  const panel = page.getByTestId('test-panel');
  await panel.getByLabel('Event').selectOption({ label: 'Snake in the path' });
  await panel.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('dialog', { name: 'Snake in the path' })).toBeVisible();
  await page.getByRole('button', { name: 'Step around it' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Test' }).click();
  await panel.getByRole('button', { name: 'Start an ambush' }).click();
  const combat = page.getByTestId('combat');
  await expect(combat).toBeVisible();
  // D-069: both formations on one battlefield, Prabu in his rank 1 and the raiders in theirs.
  const field = combat.getByRole('group', { name: 'Battlefield' });
  await expect(field.locator('.figure.ally')).toContainText('Prabu');
  await expect(field.locator('.figure.enemy').first()).toContainText('Raider with a blade');
  await expect(field.locator('.rank-slot')).toHaveCount(8);
});

test('a four-rank fight with mixed roles plays to the end through the screen (D-069)', async ({ page }) => {
  await page.goto('/?seed=2&debug=1');
  await newGame(page);
  await page.getByRole('button', { name: 'Test' }).click();
  const panel = page.getByTestId('test-panel');
  await panel.getByLabel('Wild dog count').fill('1');
  await panel.getByLabel('Raider with a blade count').fill('1');
  await panel.getByLabel('Raider with a bow count').fill('1');
  await panel.getByRole('button', { name: 'Start fight' }).click();
  const combat = page.getByTestId('combat');
  await expect(combat.getByRole('list', { name: 'Turn order' })).toBeVisible();
  // The bow raider stands in rank 3: Stab (ranks 1–2) can't pick it.
  await combat.getByRole('button', { name: /^Stab/ }).click();
  await expect(combat.locator('.figure.targetable')).toHaveCount(2);
  await expect(combat.locator('button.figure', { hasText: 'Raider with a bow' })).toBeDisabled();
  await combat.locator('.figure.targetable').first().click();
  const over = page.getByRole('dialog', { name: /He won the fight|He got away/ }).or(page.getByRole('heading', { name: 'Prabu has died' }));
  for (let i = 0; i < 60 && !(await over.count()); i++) {
    const stab = combat.getByRole('button', { name: /^Stab/ });
    if (await stab.isEnabled()) {
      await stab.click();
      await combat.locator('.figure.targetable').first().click();
    } else {
      await combat.getByRole('button', { name: 'Pass' }).click();
    }
  }
  await expect(over).toBeVisible();
});

test('the intro reads through to the map once, and the Journal opens on the sister entry (D-076)', async ({ page }) => {
  await page.goto('/?seed=2');
  await page.getByRole('button', { name: 'New Game' }).click();
  const intro = page.getByTestId('intro');
  for (let i = 0; i < 4; i++) await intro.getByRole('button', { name: 'Next' }).click();
  await expect(intro).toContainText('For you, Mother.');
  await expect(intro).toContainText('Vaikuntha');
  await intro.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByTestId('clock')).toHaveText('Day 1 · 12:00');

  await page.getByRole('button', { name: 'Journal' }).click();
  const journal = page.getByTestId('journal-panel');
  await expect(journal).toContainText('Find my sister');
  await expect(journal).toContainText('Level 1 · 0 / 100 XP');
  await expect(journal).toContainText("My mother's wish");

  // Reloading goes back to the map, not the intro.
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('clock')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
});

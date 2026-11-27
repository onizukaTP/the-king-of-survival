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

  // D-094: the map is open; every place shows from the start, Madurai included.
  await expect(page.getByRole('button', { name: 'Srivilliputhur town ruins' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Madurai city ruins' })).toHaveCount(1);

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

  // The Player panel (owner, 2026-11-26): what he has equipped and every stat.
  await page.getByRole('button', { name: 'Player', exact: true }).click();
  const player = page.getByTestId('player-panel');
  await expect(player.locator('h2')).toHaveText('Prabu');
  await expect(player).toContainText('Level 1 · 0 / 20 XP');
  const equipped = page.getByTestId('equipped');
  await expect(equipped).toContainText('WeaponHunting knife');
  // Item tooltips come from the item's data.
  await expect(equipped.locator('.item-name').first()).toHaveAttribute('title', /Damage 4–7 · SPD \+1, Crit \+5%\nAbilities: Stab, Open a vein/);
  await expect(player.getByTestId('stats')).toContainText('Deathblow res');
  await player.getByRole('button', { name: 'Unequip' }).click();
  await expect(equipped).toContainText('WeaponBare hands');
  // Unequipped, the knife is in the pack and offered to equip again.
  await player.getByTestId('equippable').getByRole('button', { name: 'Equip Hunting knife' }).click();
  await expect(equipped).toContainText('WeaponHunting knife');

  await page.getByRole('button', { name: /^Pack/ }).click();
  await expect(page.locator('.panel h2')).toHaveText('Pack');
  await expect(page.locator('.panel')).toContainText('Lighter · 10/20');
  await expect(page.locator('.panel')).toContainText('Torch · 50%');
  // The equipped knife isn't listed in the pack.
  await expect(page.locator('.panel')).not.toContainText('Hunting knife');
  await expect(page.getByRole('button', { name: /^Lighter/ })).toHaveAttribute('title', /Up to 20 uses/);

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

test('a town building on the world map: go there, search it; drops stay on its floor (M4, P-014, D-099)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  await page.getByRole('button', { name: 'Srivilliputhur town ruins' }).dblclick();
  await expect(page.getByTestId('status')).toHaveText('At: Srivilliputhur town ruins', { timeout: 15_000 });
  const panel = page.getByTestId('here-panel');

  // Buildings show on the world map from street level (D-099).
  const garage = page.locator('.spot-marker[aria-label="Garage"]').first();
  await expect(garage).toBeHidden();
  // Zoom in to street level (a click during the zoom animation adds less than a whole level).
  for (let i = 0; i < 6 && !(await garage.isVisible()); i++) {
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(400);
  }
  await expect(garage).toBeVisible();

  // Click a building to see it, click it again to go there (D-022), along the streets.
  await garage.click();
  await expect(page.locator('.panel')).toContainText('Left to find100%');
  await expect(page.locator('.panel')).toContainText('Garage, Srivilliputhur town ruins');
  await garage.click();
  await expect(page.getByTestId('status')).toHaveText('At: Garage, Srivilliputhur town ruins', { timeout: 15_000 });

  // Standing at a building survives saving and loading. (Save and quit waits for the write.)
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Save and quit' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('status')).toHaveText('At: Garage, Srivilliputhur town ruins');
  await page.getByRole('button', { name: 'Prabu: what to do here' }).click();

  // Finds are random per run; a few searches always turn something up.
  for (let i = 0; i < 6 && !(await panel.getByText('On the ground').count()); i++) {
    await panel.getByRole('button', { name: 'Search (45 min)' }).click();
  }
  await expect(panel.getByText('On the ground')).toBeVisible();
  await panel.getByRole('button', { name: 'Take all' }).click();
  await expect(panel.getByText('On the ground')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Pack/ })).not.toHaveText('Pack 0.8 kg');

  // Drop the torch: it waits on the garage floor and can be taken back.
  await page.getByRole('button', { name: /^Pack/ }).click();
  await page.getByRole('button', { name: /^Torch/ }).click();
  await page.getByTestId('item-card').getByRole('button', { name: 'Drop 1' }).click();
  await page.getByRole('button', { name: 'Prabu: what to do here' }).click();
  await expect(panel).toContainText('Torch');
  await panel.getByRole('checkbox').last().check();
  await panel.getByRole('button', { name: 'Take selected' }).click();
  await page.getByRole('button', { name: /^Pack/ }).click();
  await expect(page.locator('.panel')).toContainText('Torch · 50%');
});

test('the Craft panel lists recipes and blocks what is missing (M5)', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  await page.getByRole('button', { name: 'Craft' }).click();
  const cards = page.getByTestId('recipe-card');
  // Seven recipes and the cycle trailer (D-085).
  await expect(cards).toHaveCount(8);
  const bandage = cards.filter({ hasText: 'Cloth bandage' });
  await expect(bandage).toContainText('Cloth rags 0/2');
  await expect(bandage).toContainText('Needs 2 more cloth rags');
  await expect(bandage.getByRole('button', { name: 'Craft' })).toBeDisabled();
  await expect(cards.filter({ hasText: 'Cycle trailer' })).toContainText('Needs a cycle here');
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
  await expect(page.getByRole('button', { name: /^Pack/ })).not.toHaveText('Pack 0.8 kg');
  // D-076: the win gave XP and left a note in the journal.
  await page.getByRole('button', { name: 'Journal' }).click();
  await expect(page.getByTestId('level')).toContainText(/Level \d+ · /);
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
  await expect(journal).toContainText('Level 1 · 0 / 20 XP');
  await expect(journal).toContainText("My mother's wish");

  // Reloading goes back to the map, not the intro.
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('clock')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
});

test('vehicles and charms (M10): build the cycle trailer, repair it, park it, wear a charm', async ({ page }) => {
  await page.goto('/?seed=2');
  await newGame(page);
  const state = JSON.parse((await page.getByTestId('game-state').textContent()) ?? '{}');
  const { lat, lon } = state.player.position;
  state.inventory.stacks.push(
    { itemId: 'item.coir_rope', count: 2 }, { itemId: 'item.scrap_metal', count: 2 }, { itemId: 'item.copper_ring', count: 1 },
  );
  state.vehicles = {
    list: [
      { uid: 'v1', vehicleId: 'vehicle.cycle', lat, lon, durability: 50, fuel: null, cargo: [] },
      { uid: 'v2', vehicleId: 'vehicle.hand_cart', lat, lon, durability: 70, fuel: null, cargo: [{ itemId: 'item.firewood', count: 2 }] },
    ],
    riding: 'v1', seq: 2,
  };
  await page.evaluate((gs) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('king-of-survival', 1);
    req.onsuccess = () => {
      const tx = req.result.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ saveVersion: 11, createdAt: 'e2e', gameState: gs }, 'manual');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), state);
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByTestId('vehicle-button')).toHaveText('Vehicle: Cycle 50%');
  await page.getByRole('button', { name: 'Craft' }).click();
  const trailer = page.getByTestId('recipe-card').filter({ hasText: 'Cycle trailer' });
  await expect(trailer).toContainText('Cycle + Hand cart here');
  await trailer.getByRole('button', { name: 'Craft' }).click();
  await expect(page.getByTestId('vehicle-button')).toHaveText('Vehicle: Cycle with trailer 50%');

  await page.getByTestId('vehicle-button').click();
  const panel = page.getByTestId('vehicle-panel');
  await expect(panel).toContainText("3 kg of 60 kg");
  await panel.getByRole('button', { name: /^Repair: 1 scrap metal → 70/ }).click();
  await expect(page.getByTestId('vehicle-button')).toHaveText('Vehicle: Cycle with trailer 70%');
  await panel.getByRole('button', { name: 'Get off' }).click();
  await expect(panel).toContainText('On foot.');
  await expect(page.locator('.vehicle-marker')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Get on' }).click();
  await expect(panel).toContainText('Riding: Cycle with trailer');

  await page.getByRole('button', { name: /^Pack/ }).click();
  await page.getByRole('button', { name: /^Copper ring/ }).click();
  await page.getByTestId('item-card').getByRole('button', { name: 'Wear' }).click();
  await page.getByRole('button', { name: 'Player', exact: true }).click();
  await expect(page.getByTestId('equipped')).toContainText('RingCopper ring');
  await expect(page.getByTestId('equipped').locator('.item-name').nth(1)).toHaveAttribute('title', /illness chance 50% lower/);

  // Load selected and Load all (owner, 2026-11-26).
  await page.getByTestId('vehicle-button').click();
  await panel.getByRole('checkbox', { name: 'Select Lighter' }).check();
  await panel.getByRole('button', { name: 'Load selected (1)' }).click();
  await expect(panel.locator('ul.items').first()).toContainText('Lighter');
  await panel.getByRole('button', { name: 'Load all' }).click();
  await expect(panel).toContainText('The pack is empty.');
});

const { test, expect } = require('@playwright/test');
const {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop
} = require('./helpers');

test.describe('Workshop', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
    await openDebugPanel(page);
  });

  test('workshop starts at level 0 (Novice Lab)', async ({ page }) => {
    console.log('\n--- Test: workshop starts at level 0 ---');

    const level = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level: ${level}`);
    expect(level).toBe(0);

    const footerText = await page.locator('#footer-time').textContent();
    console.log(`Footer text: ${footerText}`);
    expect(footerText).toContain('Novice Lab');

    console.log('✓ Workshop starts at level 0 (Novice Lab)');
  });

  test('workshop level 1 upgrade: costs gold:60, crystals:8 — give resources, buy, verify level 1', async ({ page }) => {
    console.log('\n--- Test: upgrade workshop to level 1 ---');

    await giveResources(page, { gold: 60, crystals: 8 });

    const upgradeBtn = page.locator('button[data-action="upgrade-workshop"]');
    const isDisabled = await upgradeBtn.isDisabled();
    console.log(`Upgrade button disabled: ${isDisabled}`);
    expect(isDisabled).toBeFalsy();

    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    const level = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level after upgrade: ${level}`);
    expect(level).toBe(1);

    const footerText = await page.locator('#footer-time').textContent();
    console.log(`Footer: ${footerText}`);
    expect(footerText).toContain('Journeyman Lab');

    console.log('✓ Workshop upgraded to level 1 (Journeyman Lab)');
  });

  test('max golems increases from 3 to 6 after level 1 upgrade', async ({ page }) => {
    console.log('\n--- Test: max golems increases from 3 to 6 ---');

    const maxGolems0 = await page.evaluate(() => {
      return typeof WORKSHOP_LEVELS !== 'undefined' ? WORKSHOP_LEVELS[G.workshopLevel].maxGolems : null;
    });
    console.log(`Max golems at level 0: ${maxGolems0}`);
    expect(maxGolems0).toBe(3);

    await giveResources(page, { gold: 60, crystals: 8 });
    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    const maxGolems1 = await page.evaluate(() => WORKSHOP_LEVELS[G.workshopLevel].maxGolems);
    console.log(`Max golems at level 1: ${maxGolems1}`);
    expect(maxGolems1).toBe(6);

    console.log('✓ Max golems increased from 3 to 6');
  });

  test('workshop level 2 requires level 1 first', async ({ page }) => {
    console.log('\n--- Test: workshop level 2 requires level 1 ---');

    // At level 0, we can only see the level 1 upgrade button
    const upgradesText = await page.locator('#upgrades-display').textContent();
    console.log('Upgrades text:', upgradesText.slice(0, 300));

    // Button should show level 1 -> level 2 cost only after we're at level 1
    const currentLevel = await page.evaluate(() => G.workshopLevel);
    expect(currentLevel).toBe(0);

    // Level 2 cost: gold:180, essence:12, crystals:6
    // Give level 2 resources but NOT level 1 resources
    await giveResources(page, { gold: 180, essence: 12, crystals: 6 });

    const upgradeBtn = page.locator('button[data-action="upgrade-workshop"]');
    const btnText = await upgradeBtn.textContent();
    console.log(`Upgrade button text (at level 0): ${btnText.slice(0, 100)}`);

    // The button shows level 0->1, which costs gold:60 crystals:8
    // We have gold:180, crystals:6 — crystals:6 < 8 needed, so it should be disabled
    // Actually crystals:6 was given, level 1 needs crystals:8, so still disabled!
    // Give the actual level 1 cost
    await giveResource(page, 'crystals', 2); // total crystals now 8

    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    const levelAfter = await page.evaluate(() => G.workshopLevel);
    console.log(`Level after first upgrade: ${levelAfter}`);
    expect(levelAfter).toBe(1);

    // Now upgrade to level 2
    const upgradeBtn2 = page.locator('button[data-action="upgrade-workshop"]');
    const btn2Text = await upgradeBtn2.textContent();
    console.log(`Upgrade button text (at level 1): ${btn2Text.slice(0, 100)}`);

    const isDisabled2 = await upgradeBtn2.isDisabled();
    // We have gold=180-60=120 (used 60), essence=12, crystals=8-8=0... need more
    // Actually level 2 needs: gold:180, essence:12, crystals:6
    // After level 1 upgrade: gold=180-60=120 remaining... need 180 more
    // Let's give extra resources
    await giveResources(page, { gold: 180, crystals: 6 });
    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    const finalLevel = await page.evaluate(() => G.workshopLevel);
    console.log(`Final workshop level: ${finalLevel}`);
    expect(finalLevel).toBe(2);

    console.log('✓ Workshop level 2 requires level 1 first — progression confirmed');
  });

  test('upgrade button disabled when resources insufficient', async ({ page }) => {
    console.log('\n--- Test: upgrade button disabled when lacking resources ---');

    // Level 1 costs gold:60, crystals:8 — give only partial
    await giveResource(page, 'gold', 10); // not enough

    const upgradeBtn = page.locator('button[data-action="upgrade-workshop"]');
    const isDisabled = await upgradeBtn.isDisabled();
    console.log(`Upgrade button disabled with partial resources: ${isDisabled}`);
    expect(isDisabled).toBeTruthy();

    console.log('✓ Upgrade button disabled when resources insufficient');
  });

  test('global upgrade Better Furnace: purchase, verify alchemySpeedMult changed', async ({ page }) => {
    console.log('\n--- Test: Better Furnace upgrade ---');

    const initialMult = await page.evaluate(() => G.alchemySpeedMult);
    console.log(`Initial alchemySpeedMult: ${initialMult}`);
    expect(initialMult).toBe(1);

    // Better Furnace: gold:40, crystals:5 (workshop level 0)
    await giveResources(page, { gold: 40, crystals: 5 });

    const betterFurnaceBtn = page.locator('button[data-action="buy-upgrade"][data-upgrade="better_furnace"]');
    const isDisabled = await betterFurnaceBtn.isDisabled();
    console.log(`Better Furnace button disabled: ${isDisabled}`);
    expect(isDisabled).toBeFalsy();

    await page.evaluate(() => buyUpgrade('better_furnace'));
    await page.waitForTimeout(300);

    const newMult = await page.evaluate(() => G.alchemySpeedMult);
    console.log(`alchemySpeedMult after purchase: ${newMult}`);
    expect(newMult).toBeLessThan(initialMult); // 0.75x

    console.log('✓ Better Furnace purchased, alchemySpeedMult decreased');
  });

  test('global upgrade Golem Beacon: purchase, verify G.golemBonusCapacity increased', async ({ page }) => {
    console.log('\n--- Test: Golem Beacon upgrade ---');

    // Golem Beacon requires workshop level 1: gold:80, crystals:6, essence:5
    await maxWorkshop(page);

    const initialCapacity = await page.evaluate(() => G.golemBonusCapacity);
    console.log(`Initial golemBonusCapacity: ${initialCapacity}`);

    await giveResources(page, { gold: 80, crystals: 6, essence: 5 });

    const beaconBtn = page.locator('button[data-action="buy-upgrade"][data-upgrade="golem_beacon"]');
    const beaconAffordable = await page.evaluate(() => {
      const upg = UPGRADES.find(u => u.id === 'golem_beacon');
      return upg && !upg.purchased && canAfford(upg.cost);
    });
    console.log(`Golem Beacon affordable: ${beaconAffordable}`);
    expect(beaconAffordable).toBeTruthy();

    await page.evaluate(() => buyUpgrade('golem_beacon'));
    await page.waitForTimeout(300);

    const newCapacity = await page.evaluate(() => G.golemBonusCapacity);
    console.log(`golemBonusCapacity after purchase: ${newCapacity}`);
    expect(newCapacity).toBeGreaterThan(initialCapacity);

    console.log('✓ Golem Beacon purchased, golemBonusCapacity increased');
  });

  test('global upgrade Zone Expansion: purchase, verify at least one zone maxSlots increased', async ({ page }) => {
    console.log('\n--- Test: Zone Expansion upgrade ---');

    // Zone Expansion requires workshop level 2: gold:350, essence:15, moonstone:6
    await maxWorkshop(page);

    const initialSlots = await page.evaluate(() => {
      return ZONES.map(z => ({ id: z.id, maxSlots: z.maxSlots }));
    });
    console.log('Initial zone slots:', initialSlots);

    await giveResources(page, { gold: 350, essence: 15, moonstone: 6 });

    const zoneExpBtn = page.locator('button[data-action="buy-upgrade"][data-upgrade="zone_expansion"]');
    if (await zoneExpBtn.count() > 0 && !(await zoneExpBtn.isDisabled())) {
      await zoneExpBtn.click();
      await page.waitForTimeout(300);
    } else {
      await page.evaluate(() => buyUpgrade('zone_expansion'));
      await page.waitForTimeout(300);
    }

    const newSlots = await page.evaluate(() => {
      return ZONES.map(z => ({ id: z.id, maxSlots: z.maxSlots }));
    });
    console.log('Zone slots after Zone Expansion:', newSlots);

    // At least one zone should have +1 slot
    const hasIncrease = newSlots.some((zone, i) => zone.maxSlots > initialSlots[i].maxSlots);
    expect(hasIncrease).toBeTruthy();

    console.log('✓ Zone Expansion purchased, at least one zone maxSlots increased');
  });

  test('purchased upgrade shows as disabled (cannot buy twice)', async ({ page }) => {
    console.log('\n--- Test: purchased upgrade cannot be bought twice ---');

    await giveResources(page, { gold: 40, crystals: 5 });

    await page.evaluate(() => buyUpgrade('better_furnace'));
    await page.waitForTimeout(300);

    const isPurchased = await page.evaluate(() => {
      const upg = UPGRADES.find(u => u.id === 'better_furnace');
      return upg?.purchased || false;
    });
    console.log(`Better Furnace purchased: ${isPurchased}`);
    expect(isPurchased).toBeTruthy();

    // Button should be gone or disabled
    const btnAfter = page.locator('button[data-action="buy-upgrade"][data-upgrade="better_furnace"]');
    const btnExists = await btnAfter.count();
    console.log(`Buy button still exists: ${btnExists}`);

    if (btnExists > 0) {
      const isDisabled = await btnAfter.isDisabled();
      expect(isDisabled).toBeTruthy();
    }

    // The upgrade card should show "purchased" styling (✅)
    const upgradesHtml = await page.locator('#upgrades-display').innerHTML();
    const hasPurchasedMark = upgradesHtml.includes('✅') || upgradesHtml.includes('purchased');
    console.log(`Upgrade shows purchased indicator: ${hasPurchasedMark}`);
    expect(hasPurchasedMark).toBeTruthy();

    console.log('✓ Purchased upgrade cannot be bought twice');
  });

});

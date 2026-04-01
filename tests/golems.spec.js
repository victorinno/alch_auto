const { test, expect } = require('@playwright/test');
const {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop,
  getResources,
  getGolem
} = require('./helpers');

test.describe('Golems', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
    await openDebugPanel(page);
  });

  test('can craft Clay Golem when resources available (exact cost)', async ({ page }) => {
    console.log('\n--- Test: craft Clay Golem with exact cost ---');

    // Clay Golem cost: clay:5, herbs:3
    await giveResource(page, 'clay', 5);
    await giveResource(page, 'herbs', 3);

    const beforeCount = await page.evaluate(() => G.golems.length);
    console.log(`Golems before: ${beforeCount}`);

    const craftBtn = page.locator('button[data-action="craft"][data-type="clay"]');
    await expect(craftBtn).not.toBeDisabled();
    await craftBtn.click();
    await page.waitForTimeout(300);

    const afterCount = await page.evaluate(() => G.golems.length);
    console.log(`Golems after: ${afterCount}`);

    expect(afterCount).toBe(beforeCount + 1);
    console.log('✓ Clay Golem crafted successfully');
  });

  test('crafted golem appears in #golem-roster', async ({ page }) => {
    console.log('\n--- Test: crafted golem appears in #golem-roster ---');

    await giveResources(page, { clay: 5, herbs: 3 });

    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const rosterText = await page.locator('#golem-roster').textContent();
    console.log('Roster text:', rosterText.slice(0, 200));

    expect(rosterText).toContain('Clay Golem');
    console.log('✓ Clay Golem appears in golem roster');
  });

  test("can't craft Iron Golem without workshop level 1 — button disabled", async ({ page }) => {
    console.log('\n--- Test: Iron Golem blocked without workshop level 1 ---');

    // Give plenty of resources
    await giveResources(page, { iron: 10, crystals: 10, gold: 100 });

    const workshopLevel = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level: ${workshopLevel}`);
    expect(workshopLevel).toBe(0);

    const ironBtn = page.locator('button[data-action="craft"][data-type="iron"]');
    const isDisabled = await ironBtn.isDisabled();
    console.log(`Iron Golem button disabled: ${isDisabled}`);

    // Should be disabled OR the button text should indicate locked
    const btnText = await ironBtn.textContent();
    console.log(`Iron Golem button text: "${btnText}"`);

    const isBlocked = isDisabled || btnText.includes('Lock') || btnText.includes('Locked');
    expect(isBlocked, 'Iron Golem craft should be blocked without workshop level 1').toBeTruthy();

    console.log('✓ Iron Golem is blocked without workshop level 1');
  });

  test('can craft Iron Golem after workshop level 1 upgrade', async ({ page }) => {
    console.log('\n--- Test: craft Iron Golem after workshop level 1 ---');

    // Upgrade to workshop level 1 — use evaluate to avoid viewport scroll issues
    await giveResources(page, { gold: 200, crystals: 20 });
    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    const level = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level after upgrade: ${level}`);
    expect(level).toBeGreaterThanOrEqual(1);

    // Give Iron Golem resources: iron:6, crystals:4, gold:30
    await giveResources(page, { iron: 6, crystals: 4, gold: 30 });

    const ironBtn = page.locator('button[data-action="craft"][data-type="iron"]');
    const isDisabled = await ironBtn.isDisabled();
    console.log(`Iron Golem button disabled after workshop upgrade: ${isDisabled}`);
    expect(isDisabled).toBeFalsy();

    const beforeCount = await page.evaluate(() => G.golems.length);
    await ironBtn.click();
    await page.waitForTimeout(300);

    const afterCount = await page.evaluate(() => G.golems.length);
    expect(afterCount).toBe(beforeCount + 1);

    const lastGolem = await page.evaluate(() => G.golems[G.golems.length - 1]);
    console.log(`Crafted golem type: ${lastGolem.typeId}`);
    expect(lastGolem.typeId).toBe('iron');

    console.log('✓ Iron Golem crafted successfully after workshop level 1');
  });

  test("can't craft when golem slots full (workshop level 3 = 25 slots)", async ({ page }) => {
    console.log('\n--- Test: cannot craft when slots full ---');

    // Max workshop gives 25 golem slots
    await maxWorkshop(page);

    // Give tons of resources
    await giveResources(page, { clay: 500, herbs: 300 });

    // Craft 25 clay golems to fill all slots
    for (let i = 0; i < 25; i++) {
      const craftBtn = page.locator('button[data-action="craft"][data-type="clay"]');
      if (await craftBtn.isDisabled()) break;
      await craftBtn.click();
      await page.waitForTimeout(50);
    }

    const golemCount = await page.evaluate(() => G.golems.length);
    console.log(`Golem count: ${golemCount}`);

    // Now the craft button should be disabled
    const craftBtn = page.locator('button[data-action="craft"][data-type="clay"]');
    const isDisabled = await craftBtn.isDisabled();
    const btnText = await craftBtn.textContent();
    console.log(`Craft button text after filling slots: "${btnText}", disabled: ${isDisabled}`);

    expect(isDisabled || btnText.includes('No Slots'), 'Craft should be blocked when slots full').toBeTruthy();
    console.log('✓ Crafting blocked when golem slots full');
  });

  test('missing resources highlighted in red on recipe card', async ({ page }) => {
    console.log('\n--- Test: missing resources highlighted in red ---');

    // Give no resources — iron golem requirements can't be met
    const rosterHtml = await page.locator('#golem-recipes').innerHTML();
    console.log('Recipe HTML snippet:', rosterHtml.slice(0, 400));

    // There should be red-colored cost elements for resources we don't have
    const hasRed = rosterHtml.includes('var(--red)') || rosterHtml.includes('#ff4444') || rosterHtml.includes('color:var(--red)');
    expect(hasRed, 'Missing resources should be highlighted in red').toBeTruthy();

    console.log('✓ Missing resources are highlighted in red');
  });

  test('golem assignment: assign clay golem to forest zone', async ({ page }) => {
    console.log('\n--- Test: assign clay golem to forest zone ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);
    console.log(`Clay golem id: ${golemId}`);

    // Assign directly via JS to avoid zone panel scroll issues
    await page.evaluate((id) => assignGolemToZone(id, 'forest'), golemId);
    await page.waitForTimeout(300);

    const golem = await getGolem(page, golemId);
    console.log(`Golem state after assignment: ${golem?.state}, zoneId: ${golem?.zoneId}`);

    expect(golem?.state).not.toBe('idle');
    expect(golem?.zoneId).toBe('forest');

    console.log('✓ Clay golem assigned to forest zone');
  });

  test('assigned golem enters traveling/gathering state', async ({ page }) => {
    console.log('\n--- Test: golem enters non-idle state after assignment ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const initialState = await page.evaluate(() => G.golems[0]?.state);
    console.log(`Initial state: ${initialState}`);
    expect(initialState).toBe('idle');

    // Assign directly via JS to avoid zone panel scroll issues
    await page.evaluate(() => assignGolemToZone(G.golems[0].id, 'forest'));
    await page.waitForTimeout(300);

    const newState = await page.evaluate(() => G.golems[0]?.state);
    console.log(`State after assignment: ${newState}`);
    expect(newState).not.toBe('idle');

    console.log('✓ Golem entered non-idle state after assignment');
  });

  test('recall golem — state returns to idle', async ({ page }) => {
    console.log('\n--- Test: recall golem returns to idle ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);

    // Assign directly via JS
    await page.evaluate(() => assignGolemToZone(G.golems[0].id, 'forest'));
    await page.waitForTimeout(300);

    const stateBeforeRecall = await page.evaluate(() => G.golems[0]?.state);
    console.log(`State before recall: ${stateBeforeRecall}`);

    // Recall directly via JS
    await page.evaluate((id) => recallGolem(id), golemId);
    await page.waitForTimeout(300);

    const stateAfterRecall = await page.evaluate(() => G.golems[0]?.state);
    console.log(`State after recall: ${stateAfterRecall}`);
    expect(stateAfterRecall).toBe('idle');

    console.log('✓ Golem returned to idle after recall');
  });

  test('dismantle golem — golem removed from roster', async ({ page }) => {
    console.log('\n--- Test: dismantle golem ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const countBefore = await page.evaluate(() => G.golems.length);
    console.log(`Golems before dismantle: ${countBefore}`);
    expect(countBefore).toBe(1);

    const golemId = await page.evaluate(() => G.golems[0]?.id);

    // Click destroy button
    const destroyBtn = page.locator(`button[data-action="destroy-golem"][data-golem="${golemId}"]`);
    if (await destroyBtn.count() > 0) {
      await destroyBtn.click();
      await page.waitForTimeout(300);
    } else {
      await page.evaluate((id) => destroyGolem(id), golemId);
      await page.waitForTimeout(300);
    }

    const countAfter = await page.evaluate(() => G.golems.length);
    console.log(`Golems after dismantle: ${countAfter}`);
    expect(countAfter).toBe(0);

    const rosterText = await page.locator('#golem-roster').textContent();
    expect(rosterText).not.toContain('Clay Golem');

    console.log('✓ Golem removed from roster after dismantle');
  });

  test('clay golem blocked from danger zone (mine = danger 1, clay resist = 0)', async ({ page }) => {
    console.log('\n--- Test: clay golem blocked from mine zone ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golem = await page.evaluate(() => G.golems[0]);
    console.log(`Clay golem danger_resist: ${golem?.danger_resist}`);
    expect(golem?.danger_resist).toBe(0);

    // Mine zone has danger=1, clay golem has resist=0
    // Try to assign via JS - should fail
    const golemId = golem.id;
    const beforeState = await page.evaluate(() => G.golems[0]?.state);

    await page.evaluate((id) => assignGolemToZone(id, 'mine'), golemId);
    await page.waitForTimeout(300);

    const afterState = await page.evaluate(() => G.golems[0]?.state);
    const afterZone = await page.evaluate(() => G.golems[0]?.zoneId);
    console.log(`State after trying to assign to mine: ${afterState}, zoneId: ${afterZone}`);

    expect(afterState).toBe('idle');
    expect(afterZone).toBeNull();

    console.log('✓ Clay golem blocked from mine zone');
  });

  test('upgrade: buy Satchel upgrade on idle golem — capacity increases by 3', async ({ page }) => {
    console.log('\n--- Test: Satchel upgrade increases capacity by 3 ---');

    await giveResources(page, { clay: 5, herbs: 30, gold: 100 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);
    const initialCapacity = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    console.log(`Initial bonus_capacity: ${initialCapacity}`);

    // Buy Satchel upgrade (+3 capacity, costs herbs:8, gold:20)
    const upgradeBtn = page.locator(`button[data-action="upgrade-golem"][data-golem="${golemId}"][data-upgrade="satchel"]`);
    if (await upgradeBtn.count() > 0 && !(await upgradeBtn.isDisabled())) {
      await upgradeBtn.click();
      await page.waitForTimeout(300);
    } else {
      await page.evaluate((id) => upgradeGolem(id, 'satchel'), golemId);
      await page.waitForTimeout(300);
    }

    const newCapacity = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    console.log(`New bonus_capacity: ${newCapacity}`);

    expect(newCapacity).toBe(initialCapacity + 3);
    console.log('✓ Satchel upgrade increased capacity by 3');
  });

  test("upgrade: can't upgrade golem that is not idle", async ({ page }) => {
    console.log('\n--- Test: cannot upgrade busy golem ---');

    await giveResources(page, { clay: 5, herbs: 30, gold: 100 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);

    // Assign golem to forest directly via JS
    await page.evaluate((id) => assignGolemToZone(id, 'forest'), golemId);
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => G.golems[0]?.state);
    console.log(`Golem state (should not be idle): ${state}`);

    // Try upgrade via JS — should fail
    const beforeCapacity = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    await page.evaluate((id) => upgradeGolem(id, 'satchel'), golemId);
    await page.waitForTimeout(300);

    const afterCapacity = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    console.log(`Capacity before: ${beforeCapacity}, after: ${afterCapacity}`);

    // Should NOT have changed since golem is busy
    expect(afterCapacity).toBe(beforeCapacity);
    console.log('✓ Upgrade blocked for busy golem');
  });

  test('upgrade: Satchel max level 3 — 4th purchase disabled', async ({ page }) => {
    console.log('\n--- Test: Satchel max level is 3 ---');

    await giveResources(page, { clay: 5, herbs: 200, gold: 500 });
    await page.click('button[data-action="craft"][data-type="clay"]');
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);

    // Buy Satchel 3 times (max level)
    for (let i = 0; i < 3; i++) {
      await page.evaluate((id) => upgradeGolem(id, 'satchel'), golemId);
      await page.waitForTimeout(200);
    }

    const upgrades = await page.evaluate(() => G.golems[0]?.upgrades || []);
    const satchelCount = upgrades.filter(u => u === 'satchel').length;
    console.log(`Satchel upgrades applied: ${satchelCount}`);
    expect(satchelCount).toBe(3);

    // 4th purchase should fail (at max)
    const bonusCapBefore = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    await page.evaluate((id) => upgradeGolem(id, 'satchel'), golemId);
    await page.waitForTimeout(200);

    const bonusCapAfter = await page.evaluate(() => G.golems[0]?.bonus_capacity || 0);
    console.log(`Bonus capacity unchanged after 4th attempt: ${bonusCapBefore} -> ${bonusCapAfter}`);
    expect(bonusCapAfter).toBe(bonusCapBefore);

    // Check the button shows "Max" or is disabled
    const upgradeBtn = page.locator(`button[data-action="upgrade-golem"][data-golem="${golemId}"][data-upgrade="satchel"]`);
    if (await upgradeBtn.count() > 0) {
      const isDisabled = await upgradeBtn.isDisabled();
      const btnText = await upgradeBtn.textContent();
      console.log(`Satchel button: disabled=${isDisabled}, text="${btnText}"`);
      expect(isDisabled || btnText.includes('Max')).toBeTruthy();
    }

    console.log('✓ Satchel capped at max level 3');
  });

  test('craft Feeder Golem requires intelligentGolemsUnlocked (blocked before divination research)', async ({ page }) => {
    console.log('\n--- Test: Feeder Golem blocked before divination research ---');

    const intelligentUnlocked = await page.evaluate(() => G.intelligentGolemsUnlocked);
    console.log(`intelligentGolemsUnlocked: ${intelligentUnlocked}`);
    expect(intelligentUnlocked).toBeFalsy();

    // Feeder Golem should not appear in the recipe list at all
    const recipeHtml = await page.locator('#golem-recipes').innerHTML();
    const hasFeeder = recipeHtml.includes('Feeder Golem');
    console.log(`Feeder Golem visible in recipes: ${hasFeeder}`);

    expect(hasFeeder, 'Feeder Golem should be hidden before Divination research').toBeFalsy();

    console.log('✓ Feeder Golem blocked before divination research');
  });

});

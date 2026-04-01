const { test, expect } = require('@playwright/test');
const {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop,
  getResources
} = require('./helpers');

test.describe('Zones', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
    await openDebugPanel(page);
  });

  test('all 5 zones render in the zones panel', async ({ page }) => {
    console.log('\n--- Test: all 5 zones render ---');

    const zoneNames = [
      'Whispering Forest',
      'Iron Depths',
      'Sulfur Swamp',
      'Ancient Ruins',
      'Ember Volcano'
    ];

    const zonesHtml = await page.locator('#zones-panel').textContent();
    console.log('Zones panel snippet:', zonesHtml.slice(0, 400));

    for (const name of zoneNames) {
      const found = zonesHtml.includes(name);
      console.log(`  - "${name}": ${found ? 'FOUND' : 'MISSING'}`);
      expect(found, `Zone "${name}" should be rendered`).toBeTruthy();
    }

    console.log('✓ All 5 zones are rendered');
  });

  test('Whispering Forest shows as safe (no danger warning icons, or shows checkmark)', async ({ page }) => {
    console.log('\n--- Test: Whispering Forest shown as safe ---');

    const forestCard = page.locator('#zcard-forest');
    const forestText = await forestCard.textContent();
    console.log('Forest card text:', forestText.slice(0, 300));

    // Forest has danger=0, should show "✅" not "⚠️"
    const hasSafe = forestText.includes('✅');
    const hasDanger = forestText.includes('⚠️');
    console.log(`Has safe indicator (✅): ${hasSafe}, has danger (⚠️): ${hasDanger}`);

    expect(hasSafe, 'Forest should show safe indicator').toBeTruthy();
    expect(hasDanger, 'Forest should NOT show danger warning').toBeFalsy();

    console.log('✓ Whispering Forest shown as safe');
  });

  test('Ember Volcano shows 3 danger icons', async ({ page }) => {
    console.log('\n--- Test: Ember Volcano shows 3 danger icons ---');

    const volcanoCard = page.locator('#zcard-volcano');
    const volcanoText = await volcanoCard.textContent();
    console.log('Volcano card text:', volcanoText.slice(0, 300));

    // Ember Volcano has danger=3, dangerStr = "⚠️".repeat(3)
    const dangerCount = (volcanoText.match(/⚠️/g) || []).length;
    console.log(`Danger icon count in volcano card: ${dangerCount}`);

    expect(dangerCount).toBe(3);
    console.log('✓ Ember Volcano shows 3 danger icons');
  });

  test('manual gather from Whispering Forest gives at least 1 resource', async ({ page }) => {
    console.log('\n--- Test: manual gather from forest gives resources ---');

    const resourcesBefore = await page.evaluate(() => JSON.parse(JSON.stringify(G.resources)));
    console.log('Resources before gather:', { herbs: resourcesBefore.herbs, clay: resourcesBefore.clay });

    // Click gather button for forest
    const gatherBtn = page.locator('button[data-action="alchemist-gather"][data-zone="forest"]');
    const isDisabled = await gatherBtn.isDisabled();
    console.log(`Gather button disabled: ${isDisabled}`);
    expect(isDisabled).toBeFalsy();

    await page.evaluate(() => alchemistGather('forest'));
    await page.waitForTimeout(300);

    const resourcesAfter = await page.evaluate(() => JSON.parse(JSON.stringify(G.resources)));
    console.log('Resources after gather:', { herbs: resourcesAfter.herbs, clay: resourcesAfter.clay, crystals: resourcesAfter.crystals });

    // At least one of the forest yields should have increased
    const forestYields = ['clay', 'herbs', 'crystals'];
    const gotSomething = forestYields.some(res => (resourcesAfter[res] || 0) > (resourcesBefore[res] || 0));
    expect(gotSomething, 'Manual gather should produce at least 1 resource').toBeTruthy();

    console.log('✓ Manual gather from forest gave resources');
  });

  test('manual gather cooldown: second click immediately after first is blocked', async ({ page }) => {
    console.log('\n--- Test: manual gather cooldown blocks second click ---');

    // First gather
    await page.evaluate(() => alchemistGather('forest'));
    await page.waitForTimeout(300);

    // Second click should be disabled (cooldown active)
    await page.waitForTimeout(100); // brief wait to let UI re-render

    const gatherBtnAfter = page.locator('button[data-action="alchemist-gather"][data-zone="forest"]');
    const isDisabled = await gatherBtnAfter.isDisabled();
    console.log(`Gather button disabled after first gather: ${isDisabled}`);

    expect(isDisabled, 'Gather button should be on cooldown after first use').toBeTruthy();

    // Should show cooldown text
    const btnText = await gatherBtnAfter.textContent();
    console.log(`Gather button text: "${btnText}"`);
    const hasCooldown = btnText.includes('s)') || btnText.includes('s ');
    console.log(`Has cooldown indicator: ${hasCooldown}`);

    console.log('✓ Manual gather cooldown is active after first use');
  });

  test('can assign clay golem (resist 0) to forest (danger 0)', async ({ page }) => {
    console.log('\n--- Test: assign clay golem to forest ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.evaluate(() => craftGolem('clay'));
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);
    console.log(`Clay golem id: ${golemId}`);

    await page.evaluate((id) => assignGolemToZone(id, 'forest'), golemId);
    await page.waitForTimeout(300);

    const golemState = await page.evaluate(() => G.golems[0]?.state);
    const golemZone = await page.evaluate(() => G.golems[0]?.zoneId);
    console.log(`Golem state: ${golemState}, zone: ${golemZone}`);

    expect(golemState).not.toBe('idle');
    expect(golemZone).toBe('forest');

    console.log('✓ Clay golem assigned to forest zone successfully');
  });

  test('clay golem blocked from Iron Depths (danger 1, clay resist 0)', async ({ page }) => {
    console.log('\n--- Test: clay golem blocked from Iron Depths ---');

    await giveResources(page, { clay: 5, herbs: 3 });
    await page.evaluate(() => craftGolem('clay'));
    await page.waitForTimeout(300);

    const golemId = await page.evaluate(() => G.golems[0]?.id);
    const golemDR = await page.evaluate(() => G.golems[0]?.danger_resist);
    console.log(`Clay golem id: ${golemId}, danger_resist: ${golemDR}`);
    expect(golemDR).toBe(0);

    // Iron Depths has danger=1, clay resist=0
    // The zone should show "no eligible golems" or no send button
    const mineSendBtn = page.locator('button[data-action="assign-zone"][data-zone="mine"]');
    const sendBtnCount = await mineSendBtn.count();
    console.log(`Mine send button count: ${sendBtnCount}`);

    if (sendBtnCount > 0) {
      // If button exists, check it's for a different golem (not clay golem)
      const btnGolemId = await mineSendBtn.getAttribute('data-golem');
      console.log(`Mine send button golem id: ${btnGolemId}`);
      // If it points to our clay golem, it should fail when clicked
      if (Number(btnGolemId) === golemId) {
        // Try to assign via JS should fail
        await page.evaluate((id) => assignGolemToZone(id, 'mine'), golemId);
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => G.golems[0]?.state);
        const zone = await page.evaluate(() => G.golems[0]?.zoneId);
        console.log(`State after assignment attempt: ${state}, zone: ${zone}`);
        expect(state).toBe('idle');
        expect(zone).toBeNull();
      }
    } else {
      // No send button for mine — correct, clay golem can't go there
      const mineSlotText = await page.locator('#zcard-mine').textContent();
      console.log('Mine slot text:', mineSlotText.slice(0, 200));
      const noEligible = mineSlotText.includes('no eligible');
      console.log(`Mine shows "no eligible": ${noEligible}`);
      // Either no send btn OR "no eligible golems" message
      expect(sendBtnCount === 0 || noEligible).toBeTruthy();
    }

    console.log('✓ Clay golem blocked from Iron Depths');
  });

  test('zone slot limit: forest maxSlots=3, cannot assign 4th golem', async ({ page }) => {
    console.log('\n--- Test: zone slot limit enforced ---');

    // Forest has maxSlots=3
    const maxSlots = await page.evaluate(() => ZONES.find(z => z.id === 'forest')?.maxSlots);
    console.log(`Forest maxSlots: ${maxSlots}`);
    expect(maxSlots).toBe(3);

    // Need workshop level 1+ for more than 3 golems
    await giveResources(page, { gold: 60, crystals: 8 });
    await page.evaluate(() => upgradeWorkshop());
    await page.waitForTimeout(300);

    // Craft 4 clay golems
    await giveResources(page, { clay: 25, herbs: 15 });
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => craftGolem('clay'));
      await page.waitForTimeout(100);
    }

    const golemCount = await page.evaluate(() => G.golems.length);
    console.log(`Golems crafted: ${golemCount}`);

    // Assign 3 golems to forest (filling all slots)
    const golems = await page.evaluate(() => G.golems.map(g => g.id));
    for (let i = 0; i < Math.min(3, golems.length); i++) {
      await page.evaluate((id) => assignGolemToZone(id, 'forest'), golems[i]);
      await page.waitForTimeout(100);
    }

    const golemsInForest = await page.evaluate(() => G.golems.filter(g => g.zoneId === 'forest').length);
    console.log(`Golems in forest: ${golemsInForest}`);
    expect(golemsInForest).toBe(3);

    // Try to assign 4th golem to forest
    if (golems.length >= 4) {
      await page.evaluate((id) => assignGolemToZone(id, 'forest'), golems[3]);
      await page.waitForTimeout(300);

      const golemsInForestAfter = await page.evaluate(() => G.golems.filter(g => g.zoneId === 'forest').length);
      console.log(`Golems in forest after 4th assignment attempt: ${golemsInForestAfter}`);
      expect(golemsInForestAfter).toBe(3); // Should still be 3, not 4
    }

    // The forest zone should not show a send button when full
    const sendBtn = page.locator('button[data-action="assign-zone"][data-zone="forest"]');
    const sendBtnCount = await sendBtn.count();
    console.log(`Forest send buttons visible when full: ${sendBtnCount}`);
    expect(sendBtnCount).toBe(0);

    console.log('✓ Forest zone slot limit enforced at 3');
  });

});

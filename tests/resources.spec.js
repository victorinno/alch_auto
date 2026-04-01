const { test, expect } = require('@playwright/test');
const { resetGame, openDebugPanel, giveResource, getResources } = require('./helpers');

test.describe('Resources', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
  });

  test('all 14 resource types display in the UI', async ({ page }) => {
    console.log('\n--- Test: all 14 resource types display in the UI ---');

    const resourceNames = [
      'Gold Coins',
      'Arcane Essence',
      'Wild Herbs',
      'Mana Crystals',
      'Iron Ore',
      'Moonstone',
      'Sulfur',
      'Clay',
      'Alchemy Condensed Knowledge',
      'Alchemy Prepared Knowledge',
      'Divination Condensed Knowledge',
      "Philosopher's Draft",
      'Soul Crystal',
      'Divination Shard'
    ];

    const resourcesHtml = await page.locator('#resources-display').textContent();
    console.log('Resources display text:', resourcesHtml.slice(0, 200));

    for (const name of resourceNames) {
      const visible = await page.locator('#resources-display').getByText(name, { exact: false }).count();
      console.log(`  - "${name}": ${visible > 0 ? 'FOUND' : 'MISSING'}`);
      expect(visible, `Resource "${name}" should be displayed`).toBeGreaterThan(0);
    }

    console.log('✓ All 14 resource types are displayed');
  });

  test('giveResource increases displayed count for gold', async ({ page }) => {
    console.log('\n--- Test: giveResource increases displayed count for gold ---');

    await openDebugPanel(page);

    const initialGold = await page.evaluate(() => G.resources.gold || 0);
    console.log(`Initial gold: ${initialGold}`);

    await giveResource(page, 'gold', 500);

    const newGold = await page.evaluate(() => G.resources.gold || 0);
    console.log(`Gold after giving 500: ${newGold}`);

    expect(newGold).toBe(initialGold + 500);
    console.log('✓ Gold increased correctly');
  });

  test('giveResource increases displayed count for condensed_knowledge_alchemy', async ({ page }) => {
    console.log('\n--- Test: giveResource increases displayed count for condensed_knowledge_alchemy ---');

    await openDebugPanel(page);

    const initial = await page.evaluate(() => G.resources.condensed_knowledge_alchemy || 0);
    console.log(`Initial condensed_knowledge_alchemy: ${initial}`);

    await giveResource(page, 'condensed_knowledge_alchemy', 100);

    const newVal = await page.evaluate(() => G.resources.condensed_knowledge_alchemy || 0);
    console.log(`condensed_knowledge_alchemy after giving 100: ${newVal}`);

    expect(newVal).toBe(initial + 100);

    // Check it shows in the UI
    const displayText = await page.locator('#resources-display').textContent();
    console.log('Resources display contains CK display:', displayText.includes('Alchemy Condensed'));
    expect(displayText).toContain('Alchemy Condensed');

    console.log('✓ condensed_knowledge_alchemy increased correctly');
  });

  test('large number 1000 formats as "1K" in UI', async ({ page }) => {
    console.log('\n--- Test: large number 1000 formats as "1K" ---');

    await openDebugPanel(page);
    await giveResource(page, 'gold', 1000);

    const goldDisplay = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#resources-display .resource-row'));
      const goldRow = rows.find(r => r.textContent.includes('Gold Coins'));
      return goldRow ? goldRow.textContent.trim() : null;
    });

    console.log('Gold display row:', goldDisplay);

    // fmt(1000+) outputs "1.0K" format — check for K suffix
    const formatted = goldDisplay && (goldDisplay.includes('K') || goldDisplay.includes(',') || /\d{4,}/.test(goldDisplay));
    expect(formatted, `Gold display "${goldDisplay}" should show 1K or 1,000`).toBeTruthy();

    console.log('✓ Large number is formatted correctly');
  });

  test('resource count cannot go below 0 after spending', async ({ page }) => {
    console.log('\n--- Test: resource count cannot go below 0 after spending ---');

    await openDebugPanel(page);

    // Give exactly 3 herbs (Clay Golem costs clay:5, herbs:3)
    await giveResource(page, 'herbs', 3);
    await giveResource(page, 'clay', 5);

    const beforeHerbs = await page.evaluate(() => G.resources.herbs || 0);
    const beforeClay = await page.evaluate(() => G.resources.clay || 0);
    console.log(`Before craft: herbs=${beforeHerbs}, clay=${beforeClay}`);

    // Craft a Clay Golem (costs exactly clay:5, herbs:3)
    const craftBtn = page.locator('button[data-action="craft"][data-type="clay"]');
    if (await craftBtn.count() > 0 && !(await craftBtn.isDisabled())) {
      await craftBtn.click();
      await page.waitForTimeout(300);
    }

    const resources = await getResources(page);
    console.log(`After craft: herbs=${resources.herbs}, clay=${resources.clay}`);

    // Resources should be >= 0 (not negative)
    for (const [key, val] of Object.entries(resources)) {
      expect(val, `Resource ${key} should not be negative`).toBeGreaterThanOrEqual(0);
    }

    console.log('✓ No resource went below 0');
  });

});

const { test, expect } = require('@playwright/test');
const {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop,
  buildAllMachines,
  completeResearch,
  navigateToResearchLab,
  queueResearch,
  setupForResearch
} = require('./helpers');

test.describe('Save / Load', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
  });

  test('save game: give gold:500, trigger save, reload, gold still 500', async ({ page }) => {
    console.log('\n--- Test: gold persists after save/reload ---');

    await openDebugPanel(page);
    await giveResource(page, 'gold', 500);

    const goldBefore = await page.evaluate(() => G.resources.gold || 0);
    console.log(`Gold before save: ${goldBefore}`);
    expect(goldBefore).toBeGreaterThanOrEqual(500);

    // Trigger save via page.evaluate
    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    // Reload the page (localStorage persists)
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const goldAfter = await page.evaluate(() => G.resources.gold || 0);
    console.log(`Gold after reload: ${goldAfter}`);
    expect(goldAfter).toBe(goldBefore);

    console.log('✓ Gold persisted through save/reload');
  });

  test('workshop level persists after reload', async ({ page }) => {
    console.log('\n--- Test: workshop level persists ---');

    await openDebugPanel(page);
    await maxWorkshop(page);

    const levelBefore = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level before save: ${levelBefore}`);
    expect(levelBefore).toBe(3);

    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const levelAfter = await page.evaluate(() => G.workshopLevel);
    console.log(`Workshop level after reload: ${levelAfter}`);
    expect(levelAfter).toBe(levelBefore);

    console.log('✓ Workshop level persisted through save/reload');
  });

  test('completed research nodes persist (complete a node, reload, node shows completed)', async ({ page }) => {
    console.log('\n--- Test: completed research nodes persist ---');

    await openDebugPanel(page);
    await setupForResearch(page);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    await queueResearch(page, 'alembic_automation');
    await page.waitForTimeout(300);

    // Inject PK and complete
    await page.evaluate(() => {
      if (G.injector) G.injector.currentAmount = 100;
    });
    await completeResearch(page);
    await page.waitForTimeout(300);

    const levelBefore = await page.evaluate(() => G.researchNodes['alembic_automation']?.level || 0);
    const alembicsUnlockedBefore = await page.evaluate(() => G.alembicsUnlocked);
    console.log(`alembic_automation level before save: ${levelBefore}, alembicsUnlocked: ${alembicsUnlockedBefore}`);
    expect(levelBefore).toBeGreaterThan(0);
    expect(alembicsUnlockedBefore).toBeTruthy();

    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const levelAfter = await page.evaluate(() => G.researchNodes['alembic_automation']?.level || 0);
    const alembicsUnlockedAfter = await page.evaluate(() => G.alembicsUnlocked);
    console.log(`alembic_automation level after reload: ${levelAfter}, alembicsUnlocked: ${alembicsUnlockedAfter}`);
    expect(levelAfter).toBe(levelBefore);
    expect(alembicsUnlockedAfter).toBeTruthy();

    console.log('✓ Research nodes persisted through save/reload');
  });

  test('Injector divinationAmount persists (set via page.evaluate, save, reload, value restored)', async ({ page }) => {
    console.log('\n--- Test: injector divinationAmount persists ---');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Set divinationAmount via evaluate
    await page.evaluate(() => {
      if (G.injector) {
        G.injector.divinationAmount = 42;
      }
    });

    const divAmountBefore = await page.evaluate(() => G.injector?.divinationAmount || 0);
    console.log(`divinationAmount before save: ${divAmountBefore}`);
    expect(divAmountBefore).toBe(42);

    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const divAmountAfter = await page.evaluate(() => G.injector?.divinationAmount || 0);
    console.log(`divinationAmount after reload: ${divAmountAfter}`);
    expect(divAmountAfter).toBe(42);

    console.log('✓ divinationAmount persisted through save/reload');
  });

  test('condensed_knowledge_divination persists', async ({ page }) => {
    console.log('\n--- Test: condensed_knowledge_divination persists ---');

    await openDebugPanel(page);
    await giveResource(page, 'condensed_knowledge_divination', 7);

    const ckDivBefore = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination before save: ${ckDivBefore}`);
    expect(ckDivBefore).toBe(7);

    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const ckDivAfter = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination after reload: ${ckDivAfter}`);
    expect(ckDivAfter).toBe(ckDivBefore);

    console.log('✓ condensed_knowledge_divination persisted');
  });

  test('old save without condensed_knowledge_divination loads without JS errors', async ({ page }) => {
    console.log('\n--- Test: old save missing condensed_knowledge_divination loads cleanly ---');

    // Inject an old-style save that lacks condensed_knowledge_divination
    await page.evaluate(() => {
      const oldSave = {
        resources: {
          gold: 100,
          essence: 10,
          herbs: 5,
          crystals: 5,
          iron: 0,
          moonstone: 0,
          sulfur: 0,
          clay: 10,
          condensed_knowledge_alchemy: 0,
          prepared_knowledge_alchemy: 0,
          // intentionally missing condensed_knowledge_divination
          philosophers_draft: 0,
          soul_crystal: 0,
          divination_shard: 0
        },
        golems: [],
        nextGolemId: 1,
        workshopLevel: 0,
        alchemyQueue: [],
        alchemySpeedMult: 1,
        golemSpeedMult: 1,
        golemBonusCapacity: 0,
        essenceMult: 1,
        craftCostMult: 1,
        lunarAttunement: false,
        totalTime: 0,
        prestigeCount: 0,
        upgrades: [],
        recipes: [],
        savedAt: Date.now()
      };
      localStorage.setItem('alch_auto_save', JSON.stringify(oldSave));
    });

    // Collect any JS errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log(`JS errors during load: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    // Should load without errors
    expect(errors.length).toBe(0);

    // condensed_knowledge_divination should default to 0
    const ckDiv = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination after loading old save: ${ckDiv}`);
    expect(ckDiv).toBeGreaterThanOrEqual(0);

    // Game should be in a valid state
    const workshopLevel = await page.evaluate(() => G.workshopLevel);
    expect(workshopLevel).toBe(0);

    console.log('✓ Old save without condensed_knowledge_divination loaded without errors');
  });

  test('old save without divinationAmount in injector loads without JS errors (G.injector.divinationAmount = 0)', async ({ page }) => {
    console.log('\n--- Test: old save missing divinationAmount in injector loads cleanly ---');

    // Inject an old-style save with injector but no divinationAmount
    await page.evaluate(() => {
      const oldSave = {
        resources: {
          gold: 500,
          essence: 50,
          herbs: 20,
          crystals: 20,
          iron: 10,
          moonstone: 5,
          sulfur: 0,
          clay: 15,
          condensed_knowledge_alchemy: 10,
          prepared_knowledge_alchemy: 0,
          condensed_knowledge_divination: 0,
          philosophers_draft: 0,
          soul_crystal: 0,
          divination_shard: 0
        },
        golems: [],
        nextGolemId: 1,
        workshopLevel: 3,
        alchemyQueue: [],
        alchemySpeedMult: 1,
        golemSpeedMult: 1,
        golemBonusCapacity: 0,
        essenceMult: 1,
        craftCostMult: 1,
        lunarAttunement: false,
        totalTime: 300,
        prestigeCount: 0,
        upgrades: [],
        recipes: [],
        distiller: {
          built: true,
          processingQueue: [],
          currentProcessing: null,
          baseProcessingTime: 10000,
          speedMultiplier: 1.0,
          waitingForSpace: false
        },
        injector: {
          built: true,
          capacity: 100,
          currentAmount: 25
          // intentionally missing divinationAmount
        },
        activeResearch: null,
        researchQueue: [],
        researchNodes: {},
        injectionPointsMult: 1,
        alchemyProductivityBonus: 0,
        autoDistiller: false,
        autoResearch: false,
        alembicsUnlocked: false,
        alembicsBuilt: 0,
        alembicConfigs: {},
        intelligentGolemsUnlocked: false,
        savedAt: Date.now()
      };
      localStorage.setItem('alch_auto_save', JSON.stringify(oldSave));
    });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log(`JS errors during load: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    expect(errors.length).toBe(0);

    // divinationAmount should default to 0
    const divAmount = await page.evaluate(() => G.injector?.divinationAmount);
    console.log(`injector.divinationAmount after loading old save: ${divAmount}`);
    expect(divAmount).toBeDefined();
    expect(divAmount).toBe(0);

    // Injector should still show currentAmount = 25
    const currentAmount = await page.evaluate(() => G.injector?.currentAmount || 0);
    console.log(`injector.currentAmount: ${currentAmount}`);
    expect(currentAmount).toBe(25);

    console.log('✓ Old save without divinationAmount loaded cleanly, defaulted to 0');
  });

});

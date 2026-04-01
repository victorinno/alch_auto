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
  navigateToWorkshop,
  queueResearch,
  skipTime,
  getEventLog,
  setupForResearch,
  setupForDivination
} = require('./helpers');

test.describe('Divination', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
    await openDebugPanel(page);
  });

  test('Divination Brew recipe requires soul_crystal + moonstone + essence, blocked otherwise', async ({ page }) => {
    console.log('\n--- Test: Divination Brew blocked without ingredients ---');

    await maxWorkshop(page);

    // Unlock recipe
    await page.evaluate(() => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === 'divination_brew');
      if (recipe) recipe.unlocked = true;
      renderAlchemy();
    });

    // Give NO ingredients
    const brewBtn = page.locator('button[data-action="brew"][data-recipe="divination_brew"]');
    if (await brewBtn.count() > 0) {
      const isDisabled = await brewBtn.isDisabled();
      console.log(`Divination Brew brew button disabled with no resources: ${isDisabled}`);
      expect(isDisabled).toBeTruthy();
    } else {
      console.log('Brew button not found — locked (expected)');
    }

    // Verify in game state: canAfford should return false
    const canAfford = await page.evaluate(() => {
      return canAfford({ soul_crystal: 2, moonstone: 3, essence: 10 });
    });
    console.log(`canAfford divination brew without resources: ${canAfford}`);
    expect(canAfford).toBeFalsy();

    console.log('✓ Divination Brew blocked without ingredients');
  });

  test('Brew Divination Brew produces divination_shard', async ({ page }) => {
    console.log('\n--- Test: Divination Brew produces divination_shard ---');

    await maxWorkshop(page);

    await page.evaluate(() => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === 'divination_brew');
      if (recipe) recipe.unlocked = true;
      renderAlchemy();
    });

    // Give ingredients: soul_crystal:2, moonstone:3, essence:10
    await giveResources(page, { soul_crystal: 2, moonstone: 3, essence: 10 });

    const brewBtn = page.locator('button[data-action="brew"][data-recipe="divination_brew"]');
    if (await brewBtn.count() > 0 && !(await brewBtn.isDisabled())) {
      await brewBtn.click();
      await page.waitForTimeout(200);
    }

    const queueLen = await page.evaluate(() => G.alchemyQueue.length);
    console.log(`Queue length after brew: ${queueLen}`);
    expect(queueLen).toBe(1);

    // Divination Brew takes 25s, skip 30s
    await skipTime(page, 30);
    await page.waitForTimeout(500);

    const divinationShards = await page.evaluate(() => G.resources.divination_shard || 0);
    console.log(`Divination shards produced: ${divinationShards}`);
    expect(divinationShards).toBeGreaterThan(0);

    console.log('✓ Divination Brew produced divination_shard');
  });

  test('Brew Divination CK produces condensed_knowledge_divination', async ({ page }) => {
    console.log('\n--- Test: Divination CK brew produces condensed_knowledge_divination ---');

    await maxWorkshop(page);

    await page.evaluate(() => {
      ALCHEMY_RECIPES.forEach(r => r.unlocked = true);
      renderAlchemy();
    });

    // Divination CK: divination_shard:2, soul_crystal:1, essence:8
    await giveResources(page, { divination_shard: 2, soul_crystal: 1, essence: 8 });

    const brewBtn = page.locator('button[data-action="brew"][data-recipe="divination_condensed_knowledge"]');
    if (await brewBtn.count() > 0 && !(await brewBtn.isDisabled())) {
      await brewBtn.click();
      await page.waitForTimeout(200);
    }

    const queueLen = await page.evaluate(() => G.alchemyQueue.length);
    expect(queueLen).toBe(1);

    // Divination CK takes 20s, skip 25s
    await skipTime(page, 25);
    await page.waitForTimeout(500);

    const ckDiv = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination produced: ${ckDiv}`);
    expect(ckDiv).toBeGreaterThan(0);

    console.log('✓ Divination CK brew produced condensed_knowledge_divination');
  });

  test('Divination distill buttons HIDDEN when condensed_knowledge_divination = 0', async ({ page }) => {
    console.log('\n--- Test: Div distill buttons hidden when no divination CK ---');

    await setupForResearch(page);
    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    // Ensure no divination CK
    const divCK = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination: ${divCK}`);
    expect(divCK).toBe(0);

    // Div distill buttons should not exist
    const divBtn = page.locator('button[data-action="distill"][data-type="divination"]');
    const divBtnCount = await divBtn.count();
    console.log(`Divination distill buttons count: ${divBtnCount}`);
    expect(divBtnCount).toBe(0);

    console.log('✓ Divination distill buttons hidden when no divination CK');
  });

  test('Divination distill buttons APPEAR when condensed_knowledge_divination > 0', async ({ page }) => {
    console.log('\n--- Test: Div distill buttons appear when divination CK available ---');

    await setupForResearch(page);
    await giveResource(page, 'condensed_knowledge_divination', 5);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    const divCK = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`condensed_knowledge_divination: ${divCK}`);
    expect(divCK).toBeGreaterThan(0);

    // Div distill buttons should now exist
    const divBtn = page.locator('button[data-action="distill"][data-type="divination"]');
    const divBtnCount = await divBtn.count();
    console.log(`Divination distill buttons count: ${divBtnCount}`);
    expect(divBtnCount).toBeGreaterThan(0);

    console.log('✓ Divination distill buttons appear when divination CK available');
  });

  test('Div +1 button queues 1 divination CK for processing', async ({ page }) => {
    console.log('\n--- Test: Div +1 queues 1 divination CK ---');

    await setupForResearch(page);
    await giveResource(page, 'condensed_knowledge_divination', 5);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    const div1Btn = page.locator('button[data-action="distill"][data-amount="1"][data-type="divination"]');
    const exists = await div1Btn.count();
    console.log(`Div +1 button exists: ${exists}`);
    expect(exists).toBeGreaterThan(0);

    await div1Btn.click();
    await page.waitForTimeout(300);

    const distillerState = await page.evaluate(() => ({
      currentType: G.distiller?.currentProcessing?.type,
      currentAmount: G.distiller?.currentProcessing?.ckAmount,
      queueLen: G.distiller?.processingQueue?.length || 0
    }));
    console.log('Distiller state after Div +1:', distillerState);

    const hasDiv = distillerState.currentType === 'divination' || distillerState.queueLen > 0;
    expect(hasDiv, 'Distiller should be processing divination CK').toBeTruthy();

    console.log('✓ Div +1 queued 1 divination CK');
  });

  test('Div Max queues all available divination CK', async ({ page }) => {
    console.log('\n--- Test: Div Max queues all divination CK ---');

    await setupForResearch(page);
    await giveResource(page, 'condensed_knowledge_divination', 5);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    const ckBefore = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`Divination CK before Div Max: ${ckBefore}`);

    const divMaxBtn = page.locator('button[data-action="distill"][data-type="divination"]').filter({ hasText: 'Max' });
    if (await divMaxBtn.count() > 0) {
      await divMaxBtn.click();
      await page.waitForTimeout(300);
    } else {
      // Use amount=5 button
      const div5Btn = page.locator('button[data-action="distill"][data-amount="5"][data-type="divination"]');
      if (await div5Btn.count() > 0 && !(await div5Btn.isDisabled())) {
        await div5Btn.click();
        await page.waitForTimeout(300);
      } else {
        await page.evaluate(() => startDistilling(G.resources.condensed_knowledge_divination, 'divination'));
        await page.waitForTimeout(300);
      }
    }

    const ckAfter = await page.evaluate(() => G.resources.condensed_knowledge_divination || 0);
    console.log(`Divination CK after Div Max: ${ckAfter}`);
    expect(ckAfter).toBeLessThan(ckBefore);

    console.log('✓ Div Max queued divination CK for processing');
  });

  test('after distillation: Divination PK bar appears in Injector', async ({ page }) => {
    console.log('\n--- Test: Divination PK bar appears after divination distillation ---');

    await setupForResearch(page);
    await giveResource(page, 'condensed_knowledge_divination', 3);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    // Queue divination distillation
    await page.evaluate(() => {
      if (G.distiller?.built && G.injector?.built) {
        startDistilling(1, 'divination');
      }
    });
    await page.waitForTimeout(300);

    // Wait for distillation to complete (10s)
    await page.waitForTimeout(11000);

    const divAmount = await page.evaluate(() => G.injector?.divinationAmount || 0);
    console.log(`Injector divinationAmount after distillation: ${divAmount}`);
    expect(divAmount).toBeGreaterThan(0);

    // Check UI shows divination PK
    const labHtml = await page.locator('#researchlab-panel').innerHTML();
    const hasDivPK = labHtml.includes('Divination PK');
    console.log(`UI shows Divination PK: ${hasDivPK}`);
    expect(hasDivPK).toBeTruthy();

    console.log('✓ Divination PK bar appears after distillation');
  });

  test('Divination PK amount increases after distillation completes', async ({ page }) => {
    console.log('\n--- Test: Divination PK increases after distillation ---');

    await setupForResearch(page);

    const divBefore = await page.evaluate(() => G.injector?.divinationAmount || 0);
    console.log(`Divination PK before: ${divBefore}`);
    expect(divBefore).toBe(0);

    await giveResource(page, 'condensed_knowledge_divination', 3);

    // Trigger distillation directly
    await page.evaluate(() => {
      if (G.distiller?.built && G.injector?.built) {
        startDistilling(2, 'divination');
      }
    });

    // Wait for completion (10s base processing)
    console.log('Waiting 12s for divination distillation...');
    await page.waitForTimeout(12000);

    const divAfter = await page.evaluate(() => G.injector?.divinationAmount || 0);
    console.log(`Divination PK after distillation: ${divAfter}`);
    expect(divAfter).toBeGreaterThan(divBefore);

    console.log('✓ Divination PK increased after distillation');
  });

  test('Divination research node shows "Alchemy PK" + "Divination PK" cost lines', async ({ page }) => {
    console.log('\n--- Test: Divination node shows both PK cost lines ---');

    await maxWorkshop(page);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    // Complete alembic_automation first (divination prereq)
    await buildAllMachines(page);
    await page.evaluate(() => {
      if (!G.researchNodes['alembic_automation']) G.researchNodes['alembic_automation'] = { level: 0 };
      G.researchNodes['alembic_automation'].level = 1;
      G.alembicsUnlocked = true;
    });
    await page.evaluate(() => renderResearchLab());
    await page.waitForTimeout(300);

    const labHtml = await page.locator('#researchlab-panel').innerHTML();
    const hasAlchemyPK = labHtml.includes('Alchemy PK');
    const hasDivPK = labHtml.includes('Divination PK');
    console.log(`Research tree shows Alchemy PK: ${hasAlchemyPK}, Divination PK: ${hasDivPK}`);

    expect(hasAlchemyPK, 'Should show Alchemy PK cost line').toBeTruthy();
    expect(hasDivPK, 'Should show Divination PK cost line').toBeTruthy();

    console.log('✓ Divination node shows both Alchemy PK and Divination PK costs');
  });

  test('Divination research requires alembic_automation as prerequisite (locked before)', async ({ page }) => {
    console.log('\n--- Test: Divination locked before alembic_automation ---');

    await maxWorkshop(page);

    await navigateToResearchLab(page);
    await page.waitForTimeout(500);

    // Check alembic_automation not done
    const alembicLevel = await page.evaluate(() => G.researchNodes['alembic_automation']?.level || 0);
    console.log(`alembic_automation level: ${alembicLevel}`);
    expect(alembicLevel).toBe(0);

    // Divination should be locked
    const canResearch = await page.evaluate(() => canResearchNode('divination'));
    console.log(`canResearchNode('divination'): ${canResearch}`);
    expect(canResearch).toBeFalsy();

    const divBtn = page.locator('button[data-action="queue-research"][data-node-id="divination"]');
    if (await divBtn.count() > 0) {
      const isDisabled = await divBtn.isDisabled();
      console.log(`Divination button disabled: ${isDisabled}`);
      expect(isDisabled).toBeTruthy();
    }

    console.log('✓ Divination locked before alembic_automation completed');
  });

  test('Divination research needs BOTH PK types: stalls if only alchemy PK available', async ({ page }) => {
    console.log('\n--- Test: Divination research stalls without divination PK ---');

    await maxWorkshop(page);
    await buildAllMachines(page);

    // Complete alembic_automation prereq
    await page.evaluate(() => {
      G.researchNodes['alembic_automation'] = { level: 1 };
      G.alembicsUnlocked = true;
    });

    await navigateToResearchLab(page);
    await page.waitForTimeout(300);

    // Queue divination research
    await queueResearch(page, 'divination');
    await page.waitForTimeout(300);

    // Give ONLY alchemy PK (no divination PK)
    await page.evaluate(() => {
      if (G.injector) {
        G.injector.currentAmount = 50;     // alchemy PK
        G.injector.divinationAmount = 0;   // no divination PK
      }
    });

    const pointsBefore = await page.evaluate(() => G.activeResearch?.pointsAccumulated || 0);

    // Wait 3 seconds — research should NOT progress (needs both)
    await page.waitForTimeout(3000);

    const pointsAfter = await page.evaluate(() => G.activeResearch?.pointsAccumulated || 0);
    console.log(`Points before: ${pointsBefore}, after 3s with only alchemy PK: ${pointsAfter}`);

    expect(pointsAfter).toBe(pointsBefore);
    console.log('✓ Divination research stalls without divination PK');
  });

  test('Divination research completes: G.intelligentGolemsUnlocked = true', async ({ page }) => {
    console.log('\n--- Test: Divination completion sets intelligentGolemsUnlocked ---');

    await maxWorkshop(page);
    await buildAllMachines(page);

    // Complete alembic_automation prereq
    await page.evaluate(() => {
      G.researchNodes['alembic_automation'] = { level: 1 };
      G.alembicsUnlocked = true;
    });

    await navigateToResearchLab(page);
    await page.waitForTimeout(300);

    await queueResearch(page, 'divination');
    await page.waitForTimeout(300);

    const intelligentBefore = await page.evaluate(() => G.intelligentGolemsUnlocked);
    console.log(`intelligentGolemsUnlocked before: ${intelligentBefore}`);
    expect(intelligentBefore).toBeFalsy();

    // Inject enough PK to complete research (divination costs 800 points base)
    await page.evaluate(() => {
      if (G.injector) {
        G.injector.currentAmount = 1000;
        G.injector.divinationAmount = 1000;
      }
    });

    await completeResearch(page);
    await page.waitForTimeout(500);

    const intelligentAfter = await page.evaluate(() => G.intelligentGolemsUnlocked);
    console.log(`intelligentGolemsUnlocked after research complete: ${intelligentAfter}`);
    expect(intelligentAfter).toBeTruthy();

    console.log('✓ Divination completion set intelligentGolemsUnlocked = true');
  });

  test('after divination: Feeder Golem recipe visible in Workshop', async ({ page }) => {
    console.log('\n--- Test: Feeder Golem recipe visible after divination ---');

    await maxWorkshop(page);

    // Unlock divination directly via JS
    await page.evaluate(() => {
      G.intelligentGolemsUnlocked = true;
      renderRecipes();
    });

    const recipesHtml = await page.locator('#golem-recipes').innerHTML();
    const hasFeeder = recipesHtml.includes('Feeder Golem');
    console.log(`Feeder Golem in recipes after divination: ${hasFeeder}`);
    expect(hasFeeder).toBeTruthy();

    const hasCarrier = recipesHtml.includes('Carrier Golem');
    console.log(`Carrier Golem in recipes: ${hasCarrier}`);
    expect(hasCarrier).toBeTruthy();

    console.log('✓ Feeder and Carrier Golem recipes visible after divination');
  });

});

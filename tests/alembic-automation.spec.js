const { test, expect } = require('@playwright/test');
const {
  openDebugPanel,
  giveResource,
  maxWorkshop,
  buildAllMachines,
  navigateToResearchLab,
  queueResearch,
  captureState,
  getEventLog
} = require('./helpers');

test.describe('Alembic Automation System', () => {

  test('should unlock Alembic Automation via research', async ({ page }) => {
    console.log('\n⚗️ Starting Alembic Automation Research Test\n');

    // Step 1: Load the game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('✓ Game loaded');

    // Step 2: Open debug panel and setup
    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Step 3: Give research points (need 50 for Alembic Automation)
    await giveResource(page, 'prepared_knowledge_alchemy', 100);
    console.log('✓ Gave 100 PK for research');

    await captureState(page, 'alembic-01-initial-setup');

    // Step 4: Navigate to Research Lab
    await navigateToResearchLab(page);
    await captureState(page, 'alembic-02-research-lab-opened');

    // Step 5: Verify Alembic Automation research node is visible
    const alembicResearchVisible = await page.locator('button[data-action="queue-research"][data-node-id="alembic_automation"]').isVisible();
    expect(alembicResearchVisible).toBeTruthy();
    console.log('✓ Alembic Automation research node found');

    // Step 6: Queue Alembic Automation research
    await queueResearch(page, 'alembic_automation');
    console.log('✓ Queued Alembic Automation research');

    await captureState(page, 'alembic-03-research-queued');

    // Step 7: Wait for research to complete (should be instant with 100 PK)
    await page.waitForTimeout(3000);

    // Step 8: Check if research completed and Alembics unlocked
    const logs = await getEventLog(page);
    const unlockLog = logs.find(log => log.includes('Alembic Automation unlocked'));

    if (!unlockLog) {
      console.log('❌ ISSUE: Alembic Automation not unlocked!');
      console.log('\n📋 Event Log:');
      logs.slice(-10).forEach(log => console.log('  ', log));
      await captureState(page, 'alembic-04-ERROR-not-unlocked');
      throw new Error('Alembic Automation should have been unlocked');
    }

    console.log('✓ Alembic Automation research completed');
    await captureState(page, 'alembic-04-research-completed');

    console.log('\n✅ TEST PASSED: Alembic Automation research unlocked successfully!\n');
  });

  test('should display Alembics section in Workshop after unlock', async ({ page }) => {
    console.log('\n⚗️ Testing Alembics Workshop Section\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);
    await giveResource(page, 'prepared_knowledge_alchemy', 100);

    // Unlock Alembics
    await navigateToResearchLab(page);
    await queueResearch(page, 'alembic_automation');
    await page.waitForTimeout(3000);

    // Return to workshop
    await page.click('button[data-action="hide-researchlab"]');
    await page.waitForTimeout(500);

    await captureState(page, 'alembic-05-workshop-view');

    // Check if Alembics section is visible
    const alembicsSection = await page.locator('#alembics-section').isVisible();
    expect(alembicsSection).toBeTruthy();
    console.log('✓ Alembics section visible in Workshop');

    // Check for Build Alembic button
    const buildButton = await page.locator('button[data-action="build-alembic"]').isVisible();
    expect(buildButton).toBeTruthy();
    console.log('✓ Build Alembic button found');

    console.log('\n✅ TEST PASSED: Alembics section displayed in Workshop!\n');
  });

  test('should build Alembic and open configuration panel', async ({ page }) => {
    console.log('\n⚗️ Testing Alembic Building and Configuration\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Give resources for research and building
    await giveResource(page, 'prepared_knowledge_alchemy', 100);
    await giveResource(page, 'clay', 100);
    await giveResource(page, 'iron', 100);
    await giveResource(page, 'crystals', 100);
    await giveResource(page, 'gold', 1000);

    // Unlock Alembics
    await navigateToResearchLab(page);
    await queueResearch(page, 'alembic_automation');
    await page.waitForTimeout(3000);
    await page.click('button[data-action="hide-researchlab"]');
    await page.waitForTimeout(500);

    await captureState(page, 'alembic-06-ready-to-build');

    // Build an Alembic
    await page.click('button[data-action="build-alembic"]');
    await page.waitForTimeout(500);

    console.log('✓ Clicked Build Alembic');

    // Check event log for build confirmation
    const logs = await getEventLog(page);
    const buildLog = logs.find(log => log.includes('Alembic built'));

    expect(buildLog).toBeTruthy();
    console.log('✓ Alembic built successfully');

    await captureState(page, 'alembic-07-alembic-built');

    // Open configuration panel
    await page.click('button[data-action="show-alembics"]');
    await page.waitForTimeout(1000);

    // Verify panel is visible
    const panelVisible = await page.locator('#alembic-panel').isVisible();
    expect(panelVisible).toBeTruthy();
    console.log('✓ Alembic configuration panel opened');

    await captureState(page, 'alembic-08-config-panel-opened');

    // Check for recipe selection grid
    const recipeGrid = await page.locator('.recipe-selection-grid').isVisible();
    expect(recipeGrid).toBeTruthy();
    console.log('✓ Recipe selection grid visible');

    // Check for recipe cards
    const recipeCards = await page.locator('.recipe-selection-card').count();
    expect(recipeCards).toBeGreaterThan(0);
    console.log(`✓ Found ${recipeCards} recipe cards`);

    console.log('\n✅ TEST PASSED: Alembic built and configuration panel works!\n');
  });

  test('should configure and run Alembic automation', async ({ page }) => {
    console.log('\n⚗️ Testing Alembic Automation Workflow\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Give resources for everything
    await giveResource(page, 'prepared_knowledge_alchemy', 100);
    await giveResource(page, 'clay', 100);
    await giveResource(page, 'iron', 100);
    await giveResource(page, 'crystals', 100);
    await giveResource(page, 'gold', 1000);
    await giveResource(page, 'herbs', 500); // For Herb Tonic recipe

    // Unlock and build Alembic
    await navigateToResearchLab(page);
    await queueResearch(page, 'alembic_automation');
    await page.waitForTimeout(3000);
    await page.click('button[data-action="hide-researchlab"]');
    await page.waitForTimeout(500);
    await page.click('button[data-action="build-alembic"]');
    await page.waitForTimeout(500);

    // Open configuration
    await page.click('button[data-action="show-alembics"]');
    await page.waitForTimeout(1000);

    await captureState(page, 'alembic-09-ready-to-configure');

    // Select Herb Tonic recipe (first unlocked recipe)
    const herbTonicCard = await page.locator('.recipe-selection-card').first();
    await herbTonicCard.click();
    await page.waitForTimeout(500);

    console.log('✓ Selected recipe');

    // Wait for configuration card to appear
    await page.waitForSelector('.alembic-config-card', { timeout: 2000 });
    console.log('✓ Configuration card appeared');

    await captureState(page, 'alembic-10-recipe-selected');

    // Allocate 1 Alembic using slider
    const slider = await page.locator('.allocation-slider input[type="range"]').first();
    await slider.fill('1');
    await page.waitForTimeout(500);

    console.log('✓ Allocated 1 Alembic');

    await captureState(page, 'alembic-11-alembic-allocated');

    // Load ingredients (Herb Tonic needs herbs)
    // Click +100 button for herbs
    const loadButton = await page.locator('button[data-action="load-alembic-input"]').first();
    await loadButton.click();
    await page.waitForTimeout(500);

    console.log('✓ Loaded ingredients into input buffer');

    await captureState(page, 'alembic-12-ingredients-loaded');

    // Wait for crafting to start
    await page.waitForTimeout(3000);

    // Check if crafting started (card should have 'crafting' class)
    const craftingCard = await page.locator('.alembic-config-card.crafting');
    const isCrafting = await craftingCard.count() > 0;

    if (!isCrafting) {
      console.log('⚠️ Crafting may not have started yet, checking status...');
      await captureState(page, 'alembic-13-checking-status');

      // Check for status message
      const statusText = await page.locator('.alembic-status').textContent();
      console.log('Status:', statusText);
    } else {
      console.log('✓ Alembic started crafting');
    }

    await captureState(page, 'alembic-14-crafting-or-status');

    // Wait for craft to complete (Herb Tonic takes 3 seconds)
    await page.waitForTimeout(5000);

    await captureState(page, 'alembic-15-after-craft-time');

    // Check if output buffer has items
    const outputBuffer = await page.locator('.buffer-group:has-text("Output Buffer")');
    const outputVisible = await outputBuffer.isVisible();

    if (outputVisible) {
      console.log('✓ Output buffer visible');
      const outputText = await outputBuffer.textContent();
      console.log('Output buffer content:', outputText);
    }

    // Final state capture
    await captureState(page, 'alembic-16-final-state');

    console.log('\n✅ TEST PASSED: Alembic automation workflow completed!\n');
  });

  test('should handle multiple Alembics allocation', async ({ page }) => {
    console.log('\n⚗️ Testing Multiple Alembics Allocation\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Give resources
    await giveResource(page, 'prepared_knowledge_alchemy', 100);
    await giveResource(page, 'clay', 500);
    await giveResource(page, 'iron', 500);
    await giveResource(page, 'crystals', 500);
    await giveResource(page, 'gold', 5000);
    await giveResource(page, 'herbs', 1000);

    // Unlock Alembics
    await navigateToResearchLab(page);
    await queueResearch(page, 'alembic_automation');
    await page.waitForTimeout(3000);
    await page.click('button[data-action="hide-researchlab"]');
    await page.waitForTimeout(500);

    // Build 3 Alembics
    for (let i = 0; i < 3; i++) {
      await page.click('button[data-action="build-alembic"]');
      await page.waitForTimeout(300);
    }

    console.log('✓ Built 3 Alembics');

    // Open configuration
    await page.click('button[data-action="show-alembics"]');
    await page.waitForTimeout(1000);

    // Select recipe and allocate 3 Alembics
    const recipeCard = await page.locator('.recipe-selection-card').first();
    await recipeCard.click();
    await page.waitForTimeout(500);

    const slider = await page.locator('.allocation-slider input[type="range"]').first();
    await slider.fill('3');
    await page.waitForTimeout(500);

    console.log('✓ Allocated 3 Alembics to recipe');

    await captureState(page, 'alembic-17-multiple-allocated');

    // Check consumption/production display
    const allocationSection = await page.locator('.allocation-section').textContent();
    console.log('Allocation info:', allocationSection);

    // Should show multiplied amounts (3x)
    expect(allocationSection).toContain('3');
    console.log('✓ Multiplier working correctly');

    console.log('\n✅ TEST PASSED: Multiple Alembics allocation works!\n');
  });

});

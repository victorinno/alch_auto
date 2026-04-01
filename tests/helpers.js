/**
 * Test helper functions for Alchemist's Automatons
 */

const { expect } = require('@playwright/test');

/**
 * Reset the game: clear localStorage and reload fresh
 */
async function resetGame(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  console.log('✓ Game reset (localStorage cleared + reloaded)');
}

/**
 * Open the debug panel by pressing F2
 */
async function openDebugPanel(page) {
  await page.keyboard.press('F2');
  await page.waitForSelector('#debug-panel', { state: 'visible', timeout: 3000 });
  console.log('✓ Debug panel opened');
}

/**
 * Give a resource using the debug panel
 */
async function giveResource(page, resourceId, amount) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.selectOption('#debug-resource', resourceId);
  await page.fill('#debug-amount', amount.toString());
  await page.click('button[data-action="debug-give-resource"]');
  await page.waitForTimeout(200);

  console.log(`✓ Gave ${amount}x ${resourceId}`);
}

/**
 * Give multiple resources from an object map { resourceId: amount }
 */
async function giveResources(page, resourceMap) {
  for (const [resourceId, amount] of Object.entries(resourceMap)) {
    await giveResource(page, resourceId, amount);
  }
  console.log('✓ Gave all resources:', resourceMap);
}

/**
 * Max out workshop level using debug panel
 */
async function maxWorkshop(page) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.click('button[data-action="debug-max-workshop"]');
  await page.waitForTimeout(500);
  console.log('✓ Maxed workshop level');
}

/**
 * Build all machines (Distiller + Injector) using debug panel
 */
async function buildAllMachines(page) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.click('button[data-action="debug-build-machines"]');
  await page.waitForTimeout(500);
  console.log('✓ Built all machines (Distiller + Injector)');
}

/**
 * Complete the active research instantly using debug panel
 */
async function completeResearch(page) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.click('button[data-action="debug-complete-research"]');
  await page.waitForTimeout(300);
  console.log('✓ Completed active research');
}

/**
 * Unlock all alchemy recipes using debug panel
 */
async function unlockAllRecipes(page) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.click('button[data-action="debug-unlock-all-recipes"]');
  await page.waitForTimeout(300);
  console.log('✓ Unlocked all recipes');
}

/**
 * Skip time forward using debug panel
 */
async function skipTime(page, seconds) {
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  await page.fill('#debug-skip-seconds', seconds.toString());
  await page.click('button[data-action="debug-skip-time"]');
  await page.waitForTimeout(300);
  console.log(`✓ Skipped ${seconds} seconds`);
}

/**
 * Navigate to Research Lab (requires workshop level 2+)
 */
async function navigateToResearchLab(page) {
  await page.click('button[data-action="show-researchlab"]');
  await page.waitForSelector('#researchlab-panel', { state: 'visible', timeout: 3000 });
  console.log('✓ Navigated to Research Lab');
}

/**
 * Navigate back to Workshop (hide research lab if visible)
 */
async function navigateToWorkshop(page) {
  const researchLabVisible = await page.locator('#researchlab-panel').isVisible();
  if (researchLabVisible) {
    await page.click('button[data-action="hide-researchlab"]');
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('#main-layout', { state: 'visible', timeout: 3000 });
  console.log('✓ Navigated to Workshop');
}

/**
 * Queue a research node by ID
 */
async function queueResearch(page, nodeId) {
  await page.click(`button[data-action="queue-research"][data-node-id="${nodeId}"]`);
  await page.waitForTimeout(300);
  console.log(`✓ Queued research: ${nodeId}`);
}

/**
 * Get the full game state G object
 */
async function getGameState(page) {
  return await page.evaluate(() => {
    // Return a serializable snapshot of G
    return JSON.parse(JSON.stringify(G));
  });
}

/**
 * Get G.resources object
 */
async function getResources(page) {
  return await page.evaluate(() => JSON.parse(JSON.stringify(G.resources)));
}

/**
 * Get a golem from G.golems by id
 */
async function getGolem(page, golemId) {
  return await page.evaluate((id) => {
    const g = G.golems.find(g => g.id === id);
    return g ? JSON.parse(JSON.stringify(g)) : null;
  }, golemId);
}

/**
 * Get Distiller status from machine-card UI
 * Returns { isProcessing, isIdle, hasQueue, text } or null
 */
async function getDistillerStatus(page) {
  return await page.evaluate(() => {
    const distillerCard = Array.from(document.querySelectorAll('.machine-card'))
      .find(card => card.textContent.includes('Distiller'));

    if (!distillerCard) return null;

    const text = distillerCard.innerText || distillerCard.textContent;
    const isProcessing = text.includes('PROCESSING');
    const isIdle = text.includes('Idle') || text.includes('idle');
    const hasQueue = text.includes('Queue:');

    return { isProcessing, isIdle, hasQueue, text };
  });
}

/**
 * Get Injector Alchemy PK amount from injector machine-card
 * Reads "Alchemy PK: X/Y" format
 * Returns { current, capacity } or null
 */
async function getInjectorPK(page) {
  return await page.evaluate(() => {
    const injectorCard = Array.from(document.querySelectorAll('.machine-card'))
      .find(card => card.textContent.includes('Injector'));

    if (!injectorCard) return null;

    const text = injectorCard.textContent;
    // Match "Alchemy PK: X/Y"
    const match = text.match(/Alchemy PK:\s*(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;

    return {
      current: parseInt(match[1]),
      capacity: parseInt(match[2])
    };
  });
}

/**
 * Get Injector Divination PK amount from injector machine-card
 * Reads "Divination PK: X/Y" format
 * Returns { current, capacity } or null
 */
async function getInjectorDivinationPK(page) {
  return await page.evaluate(() => {
    const injectorCard = Array.from(document.querySelectorAll('.machine-card'))
      .find(card => card.textContent.includes('Injector'));

    if (!injectorCard) return null;

    const text = injectorCard.textContent;
    // Match "Divination PK: X/Y"
    const match = text.match(/Divination PK:\s*(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;

    return {
      current: parseInt(match[1]),
      capacity: parseInt(match[2])
    };
  });
}

/**
 * Get active research points from .active-research-card
 * Reads "X / Y points" format
 * Returns { current, needed } or null
 */
async function getResearchPoints(page) {
  return await page.evaluate(() => {
    const activeCard = document.querySelector('.active-research-card');
    if (!activeCard) return null;

    const text = activeCard.textContent;
    const match = text.match(/(\d+)\s*\/\s*(\d+)\s*points/);
    if (!match) return null;

    return {
      current: parseInt(match[1]),
      needed: parseInt(match[2])
    };
  });
}

/**
 * Wait for an event log entry containing the given text pattern
 */
async function waitForLogMessage(page, pattern, timeout = 8000) {
  await page.waitForFunction(
    (pat) => {
      const logs = Array.from(document.querySelectorAll('#event-log .log-entry'));
      return logs.some(log => log.textContent.includes(pat));
    },
    pattern,
    { timeout }
  );
  console.log(`✓ Found log message: "${pattern}"`);
}

/**
 * Capture state with screenshot + console log
 * Returns state object { distiller, injector, research }
 */
async function captureState(page, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/${label}-${timestamp}.png`;

  try {
    await page.screenshot({ path: filename, fullPage: true });
  } catch (e) {
    // Non-fatal: screenshot dir may not exist
  }

  const state = {
    distiller: await getDistillerStatus(page),
    injector: await getInjectorPK(page),
    research: await getResearchPoints(page)
  };

  console.log(`\n--- State Capture: ${label} ---`);
  console.log(JSON.stringify(state, null, 2));
  console.log(`Screenshot: ${filename}\n`);

  return state;
}

/**
 * Get all event log text entries as an array of strings
 */
async function getEventLog(page) {
  return await page.evaluate(() => {
    const logs = Array.from(document.querySelectorAll('#event-log .log-entry'));
    return logs.map(log => log.textContent.trim());
  });
}

/**
 * Setup for research: max workshop + build machines + give 50 condensed_knowledge_alchemy
 */
async function setupForResearch(page) {
  await maxWorkshop(page);
  await buildAllMachines(page);
  await giveResource(page, 'condensed_knowledge_alchemy', 50);
  console.log('✓ setupForResearch complete');
}

/**
 * Setup for divination: setupForResearch + give divination shards & CK divination
 * + unlock all recipes + complete prereq research nodes (alembic_automation)
 */
async function setupForDivination(page) {
  await setupForResearch(page);
  await giveResources(page, {
    divination_shard: 10,
    condensed_knowledge_divination: 10
  });
  await unlockAllRecipes(page);

  // Navigate to research lab and complete prerequisite: alembic_automation
  await navigateToResearchLab(page);
  await queueResearch(page, 'alembic_automation');
  await completeResearch(page);
  await page.waitForTimeout(300);

  console.log('✓ setupForDivination complete');
}

/**
 * Setup for alembic: setupForResearch + queue+complete alembic_automation research
 * + give clay:100, iron:100, crystals:100, gold:1000, herbs:500
 */
async function setupForAlembic(page) {
  await setupForResearch(page);
  await giveResources(page, {
    clay: 100,
    iron: 100,
    crystals: 100,
    gold: 1000,
    herbs: 500
  });

  // Navigate to research lab, queue and complete alembic_automation
  await navigateToResearchLab(page);
  await queueResearch(page, 'alembic_automation');
  await completeResearch(page);
  await page.waitForTimeout(500);

  // Return to workshop
  await navigateToWorkshop(page);
  await page.waitForTimeout(300);

  console.log('✓ setupForAlembic complete');
}

module.exports = {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop,
  buildAllMachines,
  completeResearch,
  unlockAllRecipes,
  skipTime,
  navigateToResearchLab,
  navigateToWorkshop,
  queueResearch,
  getGameState,
  getResources,
  getGolem,
  getDistillerStatus,
  getInjectorPK,
  getInjectorDivinationPK,
  getResearchPoints,
  waitForLogMessage,
  captureState,
  getEventLog,
  setupForResearch,
  setupForDivination,
  setupForAlembic
};

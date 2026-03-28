const { expect } = require('@playwright/test');

/**
 * Test helper functions for Alchemist's Automatons
 */

/**
 * Open the debug panel by pressing F2
 */
async function openDebugPanel(page) {
  await page.keyboard.press('F2');
  await page.waitForSelector('#debug-panel', { state: 'visible', timeout: 2000 });
  console.log('✓ Debug panel opened');
}

/**
 * Give a resource using the debug panel
 */
async function giveResource(page, resourceId, amount) {
  // Ensure debug panel is open
  const panelVisible = await page.locator('#debug-panel').isVisible();
  if (!panelVisible) {
    await openDebugPanel(page);
  }

  // Select resource from dropdown
  await page.selectOption('#debug-resource', resourceId);

  // Set amount
  await page.fill('#debug-amount', amount.toString());

  // Click Give button
  await page.click('button[data-action="debug-give-resource"]');

  // Wait briefly for the action to complete
  await page.waitForTimeout(300);

  console.log(`✓ Gave ${amount}x ${resourceId}`);
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
 * Build all machines using debug panel
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
 * Navigate to Research Lab
 */
async function navigateToResearchLab(page) {
  await page.click('button[data-action="show-researchlab"]');
  await page.waitForSelector('#researchlab-panel', { state: 'visible', timeout: 2000 });
  console.log('✓ Navigated to Research Lab');
}

/**
 * Queue a research node
 */
async function queueResearch(page, nodeId) {
  await page.click(`button[data-action="queue-research"][data-node-id="${nodeId}"]`);
  await page.waitForTimeout(500);
  console.log(`✓ Queued research: ${nodeId}`);
}

/**
 * Get Distiller status from UI
 */
async function getDistillerStatus(page) {
  const status = await page.evaluate(() => {
    const distillerCard = Array.from(document.querySelectorAll('.machine-card'))
      .find(card => card.textContent.includes('Distiller'));

    if (!distillerCard) return null;

    const isProcessing = distillerCard.textContent.includes('PROCESSING');
    const isIdle = distillerCard.textContent.includes('Idle');
    const hasQueue = distillerCard.textContent.includes('Queue:');

    return {
      isProcessing,
      isIdle,
      hasQueue,
      text: distillerCard.innerText
    };
  });

  return status;
}

/**
 * Get Injector PK amount from UI
 */
async function getInjectorPK(page) {
  const pk = await page.evaluate(() => {
    const injectorCard = Array.from(document.querySelectorAll('.machine-card'))
      .find(card => card.textContent.includes('Injector'));

    if (!injectorCard) return null;

    // Extract "Stored: X/100"
    const match = injectorCard.textContent.match(/Stored:\s*(\d+)\/(\d+)/);
    if (!match) return null;

    return {
      current: parseInt(match[1]),
      capacity: parseInt(match[2])
    };
  });

  return pk;
}

/**
 * Get active research points from UI
 */
async function getResearchPoints(page) {
  const points = await page.evaluate(() => {
    const activeCard = document.querySelector('.active-research-card');
    if (!activeCard) return null;

    // Extract "X / Y points"
    const match = activeCard.textContent.match(/(\d+)\s*\/\s*(\d+)\s*points/);
    if (!match) return null;

    return {
      current: parseInt(match[1]),
      needed: parseInt(match[2])
    };
  });

  return points;
}

/**
 * Wait for a specific log message pattern
 */
async function waitForLogMessage(page, messagePattern, timeout = 5000) {
  await page.waitForFunction(
    (pattern) => {
      const logs = Array.from(document.querySelectorAll('#event-log .event-item'));
      return logs.some(log => log.textContent.includes(pattern));
    },
    messagePattern,
    { timeout }
  );

  console.log(`✓ Found log message: "${messagePattern}"`);
}

/**
 * Capture current state with screenshot and console log
 */
async function captureState(page, label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/${label}-${timestamp}.png`;

  await page.screenshot({ path: filename, fullPage: true });

  const state = {
    distiller: await getDistillerStatus(page),
    injector: await getInjectorPK(page),
    research: await getResearchPoints(page)
  };

  console.log(`\n📸 State Capture: ${label}`);
  console.log(JSON.stringify(state, null, 2));
  console.log(`Screenshot saved: ${filename}\n`);

  return state;
}

/**
 * Get all event log messages
 */
async function getEventLog(page) {
  return await page.evaluate(() => {
    const logs = Array.from(document.querySelectorAll('#event-log .event-item'));
    return logs.map(log => log.textContent.trim());
  });
}

module.exports = {
  openDebugPanel,
  giveResource,
  maxWorkshop,
  buildAllMachines,
  navigateToResearchLab,
  queueResearch,
  getDistillerStatus,
  getInjectorPK,
  getResearchPoints,
  waitForLogMessage,
  captureState,
  getEventLog
};

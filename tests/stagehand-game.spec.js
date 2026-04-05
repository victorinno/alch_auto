/**
 * Stagehand AI-powered tests for Alchemist's Automatons
 *
 * These tests use natural language via Stagehand to interact with the game,
 * complementing the low-level Playwright tests in other spec files.
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

const { test, expect } = require('@playwright/test');
const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');
const { resetGame, openDebugPanel, giveResources, maxWorkshop } = require('./helpers');

const STAGEHAND_CONFIG = {
  env: 'LOCAL',
  verbose: 0,
  headless: false,
  enableCaching: true,
  modelName: 'claude-sonnet-4-5-20251001',
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
};

test.describe('Stagehand AI Tests', () => {
  let stagehand;

  test.beforeEach(async () => {
    stagehand = new Stagehand(STAGEHAND_CONFIG);
    await stagehand.init();
    await stagehand.page.goto('http://localhost:3000');
    await stagehand.page.evaluate(() => localStorage.clear());
    await stagehand.page.reload({ waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await stagehand.close();
  });

  test('extract resource panel information', async () => {
    const resources = await stagehand.extract(
      'extract the list of resources shown in the resources panel, including their names and amounts',
      {
        schema: z.object({
          resources: z.array(
            z.object({
              name: z.string(),
              amount: z.number(),
            })
          ),
        }),
      }
    );

    expect(resources.resources.length).toBeGreaterThan(0);
    const goldEntry = resources.resources.find(r =>
      r.name.toLowerCase().includes('gold')
    );
    expect(goldEntry).toBeDefined();
    console.log('Resources found:', resources.resources);
  });

  test('observe available zones', async () => {
    const observations = await stagehand.observe(
      'find all zone cards or zone panels in the right panel of the page'
    );

    expect(observations.length).toBeGreaterThan(0);
    console.log(
      'Zone observations:',
      observations.map(o => o.description)
    );
  });

  test('brew a Herb Tonic using natural language', async () => {
    // Give herbs via page evaluate since debug panel needs F2
    await stagehand.page.keyboard.press('F2');
    await stagehand.page.waitForSelector('#debug-panel', { state: 'visible' });
    await stagehand.page.selectOption('#debug-resource', 'herbs');
    await stagehand.page.fill('#debug-amount', '10');
    await stagehand.page.click('button[data-action="debug-give-resource"]');
    await stagehand.page.waitForTimeout(300);

    await stagehand.act('click the brew button for Herb Tonic');

    const queueLength = await stagehand.page.evaluate(() => G.alchemyQueue.length);
    expect(queueLength).toBe(1);
    console.log('✓ Herb Tonic queued via Stagehand act()');
  });

  test('extract alchemy queue status', async () => {
    // Set up a brew first
    await stagehand.page.keyboard.press('F2');
    await stagehand.page.waitForSelector('#debug-panel', { state: 'visible' });
    await stagehand.page.selectOption('#debug-resource', 'herbs');
    await stagehand.page.fill('#debug-amount', '10');
    await stagehand.page.click('button[data-action="debug-give-resource"]');
    await stagehand.page.waitForTimeout(300);
    await stagehand.page.click('button[data-action="brew"][data-recipe="herb_tonic"]');
    await stagehand.page.waitForTimeout(300);

    const alchemyStatus = await stagehand.extract(
      'extract the active alchemy queue: how many items are brewing and what are their names',
      {
        schema: z.object({
          activeCount: z.number(),
          items: z.array(z.string()),
        }),
      }
    );

    expect(alchemyStatus.activeCount).toBeGreaterThanOrEqual(1);
    console.log('Alchemy status:', alchemyStatus);
  });

  test('extract workshop upgrade information', async () => {
    const upgradeInfo = await stagehand.extract(
      'extract the current workshop level and the cost to upgrade it to the next level',
      {
        schema: z.object({
          currentLevel: z.string(),
          upgradeCost: z.string().optional(),
          canUpgrade: z.boolean(),
        }),
      }
    );

    expect(upgradeInfo.currentLevel).toBeDefined();
    console.log('Workshop upgrade info:', upgradeInfo);
  });
});

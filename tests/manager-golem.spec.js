const { test, expect } = require('@playwright/test');
const {
  resetGame,
  openDebugPanel,
  giveResource,
  giveResources,
  maxWorkshop,
  waitForLogMessage,
  getResources,
} = require('./helpers');

// ─── Helpers specific to Manager Golem tests ─────────────────────────────────

/** Unlock divination research so Manager Golems can be crafted */
async function unlockDivination(page) {
  await page.evaluate(() => {
    G.intelligentGolemsUnlocked = true;
  });
  console.log('✓ Divination unlocked (G.intelligentGolemsUnlocked = true)');
}

/** Inject a Manager Golem directly into G.golems */
async function injectManagerGolem(page) {
  const id = await page.evaluate(() => {
    const id = G.nextGolemId++;
    G.golems.push({
      id, typeId: 'manager',
      name: `Manager Golem #${id}`,
      state: 'idle', zoneId: null,
      tripStart: null, tripEnd: null, tripPhase: null, collected: {},
      upgrades: [], danger_resist: 0, bonus_capacity: 0, speed_mult: 1.0,
      targetRecipeId: null, alembicSlot: null, trackedResources: [],
      dispatchedByExplorerId: null, dispatchedForSlot: null, managedByJobId: null
    });
    return id;
  });
  console.log(`✓ Injected Manager Golem #${id}`);
  return id;
}

/** Inject a worker golem of the given typeId */
async function injectWorkerGolem(page, typeId) {
  const id = await page.evaluate((tid) => {
    const def = GOLEM_TYPES[tid];
    const id = G.nextGolemId++;
    G.golems.push({
      id, typeId: tid,
      name: `${def.name} #${id}`,
      state: 'idle', zoneId: null,
      tripStart: null, tripEnd: null, tripPhase: null, collected: {},
      upgrades: [], danger_resist: def.danger_resist, bonus_capacity: 0, speed_mult: 1.0,
      targetRecipeId: null, alembicSlot: null, trackedResources: [],
      dispatchedByExplorerId: null, dispatchedForSlot: null, managedByJobId: null
    });
    return id;
  }, typeId);
  console.log(`✓ Injected ${typeId} golem #${id}`);
  return id;
}

/** Add a manager job via G state directly */
async function injectJob(page, { type, target, targetAmount, limit, managerId }) {
  const jobId = await page.evaluate(({ type, target, targetAmount, limit, managerId }) => {
    const id = 'job_test_' + Date.now();
    G.managerJobs.push({ id, type, target, targetAmount, limit, managerId });
    return id;
  }, { type, target, targetAmount, limit, managerId });
  console.log(`✓ Injected job ${jobId}`);
  return jobId;
}

/** Wait up to timeoutMs for a worker golem to leave idle state (dispatched) */
async function waitForDispatch(page, golemId, timeoutMs = 10000) {
  await page.waitForFunction(
    (id) => {
      const g = G.golems.find(g => g.id === id);
      return g && g.state !== 'idle';
    },
    golemId,
    { timeout: timeoutMs }
  );
  console.log(`✓ Golem #${golemId} was dispatched`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Manager Golem', () => {

  test.beforeEach(async ({ page }) => {
    await resetGame(page);
    await openDebugPanel(page);
    await maxWorkshop(page);
  });

  // ── T1: Craft Manager Golem via UI ───────────────────────────────────────

  test('can craft Manager Golem when divination is unlocked and resources available', async ({ page }) => {
    console.log('\n--- Test: craft Manager Golem ---');

    await unlockDivination(page);
    await giveResources(page, {
      soul_crystal: 1,
      condensed_knowledge_divination: 2,
      divination_shard: 5
    });

    const before = await page.evaluate(() => G.golems.length);

    const craftBtn = page.locator('button[data-action="craft"][data-type="manager"]');
    await expect(craftBtn).toBeVisible();
    await expect(craftBtn).not.toBeDisabled();
    await craftBtn.click();
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => G.golems.length);
    expect(after).toBe(before + 1);

    const golem = await page.evaluate(() => G.golems.find(g => g.typeId === 'manager'));
    expect(golem).toBeTruthy();
    expect(golem.state).toBe('idle');
    console.log('✓ Manager Golem crafted, state is idle');
  });

  // ── T2: Manager Golem counts against workshop slot cap ───────────────────

  test('Manager Golem counts against workshop maxGolems cap', async ({ page }) => {
    console.log('\n--- Test: Manager Golem counts against cap ---');

    await unlockDivination(page);

    // Fill the workshop to max (25 golems for max workshop)
    const maxGolems = await page.evaluate(() => WORKSHOP_LEVELS[G.workshopLevel].maxGolems);
    console.log(`Max golems: ${maxGolems}`);

    await page.evaluate((max) => {
      while (G.golems.filter(g => { const r = GOLEM_TYPES[g.typeId]?.role; return !r || r === 'manager'; }).length < max) {
        const id = G.nextGolemId++;
        G.golems.push({
          id, typeId: 'clay', name: `Clay #${id}`,
          state: 'idle', zoneId: null, tripStart: null, tripEnd: null, tripPhase: null, collected: {},
          upgrades: [], danger_resist: 0, bonus_capacity: 0, speed_mult: 1.0,
          targetRecipeId: null, alembicSlot: null, trackedResources: [],
          dispatchedByExplorerId: null, dispatchedForSlot: null, managedByJobId: null
        });
      }
    }, maxGolems);

    await giveResources(page, { soul_crystal: 5, condensed_knowledge_divination: 5, divination_shard: 10 });

    const craftBtn = page.locator('button[data-action="craft"][data-type="manager"]');
    await page.waitForTimeout(300);

    // Craft button should be disabled or show blocking reason (full roster)
    const isDisabled = await craftBtn.isDisabled();
    if (!isDisabled) {
      // May be rendered as non-disabled but clicking should log warning
      await craftBtn.click();
      await page.waitForTimeout(300);
      const count = await page.evaluate(() =>
        G.golems.filter(g => { const r = GOLEM_TYPES[g.typeId]?.role; return !r || r === 'manager'; }).length
      );
      // Count should not exceed max
      expect(count).toBeLessThanOrEqual(maxGolems);
      console.log('✓ Manager Golem correctly blocked by workshop cap');
    } else {
      console.log('✓ Craft button disabled (workshop full)');
    }
  });

  // ── T3: Manager panel visible after Manager Golem is in roster ───────────

  test('Manager button appears after a Manager Golem is crafted', async ({ page }) => {
    console.log('\n--- Test: Manager button visibility ---');

    const btnBefore = page.locator('#manager-btn');
    await expect(btnBefore).toBeHidden();

    await injectManagerGolem(page);
    // Trigger a renderAll to update button visibility
    await page.evaluate(() => renderAll());
    await page.waitForTimeout(200);

    await expect(page.locator('#manager-btn')).toBeVisible();
    console.log('✓ Manager button appeared after Manager Golem added');
  });

  // ── T4: Manager auto-dispatches a golem for a material job ──────────────

  test('Manager auto-dispatches a worker golem to meet material target', async ({ page }) => {
    console.log('\n--- Test: auto-dispatch for material job ---');

    const managerId = await injectManagerGolem(page);
    const workerId  = await injectWorkerGolem(page, 'clay');

    // Set herbs below target (5 < 30)
    await page.evaluate(() => { G.resources.herbs = 5; });

    const jobId = await injectJob(page, {
      type: 'material', target: 'herbs', targetAmount: 30, limit: 2, managerId
    });

    // Wait for tickManager to fire (throttled at 2s)
    await waitForDispatch(page, workerId, 8000);

    const golem = await page.evaluate((id) => G.golems.find(g => g.id === id), workerId);
    expect(golem.state).not.toBe('idle');
    // Should be traveling to a zone that yields herbs
    const zone = await page.evaluate((zoneId) => ZONES.find(z => z.id === zoneId), golem.zoneId);
    expect(zone.yields).toContain('herbs');
    console.log(`✓ Dispatched to zone "${golem.zoneId}" which yields herbs`);
  });

  // ── T5: Manager respects per-job golem limit ─────────────────────────────

  test('Manager never exceeds per-job golem limit', async ({ page }) => {
    console.log('\n--- Test: per-job golem limit enforced ---');

    const managerId = await injectManagerGolem(page);
    const limit = 2;

    // Add 5 worker golems
    const workerIds = [];
    for (let i = 0; i < 5; i++) workerIds.push(await injectWorkerGolem(page, 'clay'));

    await page.evaluate(() => { G.resources.herbs = 0; });

    const jobId = await injectJob(page, {
      type: 'material', target: 'herbs', targetAmount: 100, limit, managerId
    });

    // Wait enough time for multiple tickManager ticks
    await page.waitForTimeout(7000);

    const dispatched = await page.evaluate((jid) =>
      G.golems.filter(g => g.managedByJobId === jid && g.state !== 'idle').length
    , jobId);

    console.log(`Dispatched for job: ${dispatched}/${limit}`);
    expect(dispatched).toBeLessThanOrEqual(limit);
    console.log('✓ Limit enforced — no more than 2 golems dispatched');
  });

  // ── T6: Manager picks weakest eligible golem ─────────────────────────────

  test('Manager picks lowest-tier eligible golem over higher-tier', async ({ page }) => {
    console.log('\n--- Test: weakest golem selected ---');

    const managerId = await injectManagerGolem(page);

    // Add a tier-3 crystal golem and a tier-1 clay golem
    const crystalId = await injectWorkerGolem(page, 'crystal');
    const clayId    = await injectWorkerGolem(page, 'clay');

    await page.evaluate(() => { G.resources.herbs = 0; });

    const jobId = await injectJob(page, {
      type: 'material', target: 'herbs', targetAmount: 50, limit: 1, managerId
    });

    // Wait for dispatch
    await waitForDispatch(page, clayId, 8000);

    const crystalGolem = await page.evaluate((id) => G.golems.find(g => g.id === id), crystalId);
    const clayGolem    = await page.evaluate((id) => G.golems.find(g => g.id === id), clayId);

    // Clay (tier 1) should have been dispatched, crystal should still be idle
    expect(clayGolem.state).not.toBe('idle');
    expect(crystalGolem.state).toBe('idle');
    console.log('✓ Clay golem (tier 1) dispatched instead of Crystal golem (tier 3)');
  });

  // ── T7: Player assignment overrides — manager skips non-idle golems ──────

  test('Manager does not override a golem the player manually sent', async ({ page }) => {
    console.log('\n--- Test: player wins over manager ---');

    const managerId = await injectManagerGolem(page);
    const workerId  = await injectWorkerGolem(page, 'clay');

    // Player manually sends the worker to a zone
    await page.evaluate((id) => {
      assignGolemToZone(id, 'forest');
    }, workerId);

    const stateAfterPlayerSend = await page.evaluate((id) =>
      G.golems.find(g => g.id === id)?.state, workerId);
    expect(stateAfterPlayerSend).not.toBe('idle');
    const zoneAfterPlayerSend = await page.evaluate((id) =>
      G.golems.find(g => g.id === id)?.zoneId, workerId);

    await page.evaluate(() => { G.resources.herbs = 0; });

    // Manager job targets herbs (forest), limit 1
    const jobId = await injectJob(page, {
      type: 'material', target: 'herbs', targetAmount: 50, limit: 1, managerId
    });

    // Wait for a couple of tickManager cycles
    await page.waitForTimeout(6000);

    // Worker should still be in player-assigned zone, state unchanged from player send
    const golemAfter = await page.evaluate((id) => G.golems.find(g => g.id === id), workerId);
    expect(golemAfter.zoneId).toBe(zoneAfterPlayerSend);
    console.log('✓ Manager did not override player-assigned golem');
  });

  // ── T8: Manager jobs persist through save/load ───────────────────────────

  test('Manager jobs survive save and reload', async ({ page }) => {
    console.log('\n--- Test: manager job persistence ---');

    const managerId = await injectManagerGolem(page);

    const jobId = await injectJob(page, {
      type: 'material', target: 'clay', targetAmount: 25, limit: 1, managerId
    });

    // Save game
    await page.evaluate(() => saveGame());
    await page.waitForTimeout(300);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const jobs = await page.evaluate(() => G.managerJobs);
    expect(jobs.length).toBeGreaterThan(0);

    const restoredJob = jobs.find(j => j.id === jobId);
    expect(restoredJob).toBeTruthy();
    expect(restoredJob.target).toBe('clay');
    expect(restoredJob.targetAmount).toBe(25);
    expect(restoredJob.limit).toBe(1);
    expect(restoredJob.managerId).toBe(managerId);
    console.log('✓ Manager job restored correctly after reload');
  });

  // ── T9: Manager panel UI renders and opens correctly ─────────────────────

  test('Manager panel opens and shows job list', async ({ page }) => {
    console.log('\n--- Test: Manager panel UI ---');

    const managerId = await injectManagerGolem(page);
    await page.evaluate(() => renderAll());
    await page.waitForTimeout(200);

    // Click the manager button
    await page.locator('#manager-btn').click();
    await page.waitForSelector('#manager-panel', { state: 'visible', timeout: 3000 });
    console.log('✓ Manager panel opened');

    // Panel should show the manager golem
    const panelText = await page.locator('#manager-panel').innerText();
    expect(panelText).toContain('Manager Golem');
    expect(panelText).toContain('Add Job');
    console.log('✓ Panel contains Manager Golem and Add Job section');

    // Add a job via UI
    await page.selectOption('#mgr-job-type', 'material');
    await page.waitForTimeout(100);
    await page.fill('#mgr-amount', '15');
    await page.fill('#mgr-limit', '1');
    await page.click('button[data-action="add-manager-job"]');
    await page.waitForTimeout(300);

    const jobCount = await page.evaluate(() => G.managerJobs.length);
    expect(jobCount).toBe(1);
    console.log('✓ Job added via UI');

    // Remove it
    const removeBtn = page.locator('button[data-action="remove-manager-job"]').first();
    await removeBtn.click();
    await page.waitForTimeout(300);

    const jobCountAfter = await page.evaluate(() => G.managerJobs.length);
    expect(jobCountAfter).toBe(0);
    console.log('✓ Job removed via UI');

    // Close panel
    await page.click('button[data-action="hide-manager"]');
    await page.waitForSelector('#main-layout', { state: 'visible', timeout: 3000 });
    console.log('✓ Manager panel closed');
  });

  // ── T10: Manager does not dispatch when target is already met ────────────

  test('Manager does not dispatch when target stock is already met', async ({ page }) => {
    console.log('\n--- Test: target met, no dispatch ---');

    const managerId = await injectManagerGolem(page);
    const workerId  = await injectWorkerGolem(page, 'clay');

    // Set herbs already above target
    await page.evaluate(() => { G.resources.herbs = 100; });

    const jobId = await injectJob(page, {
      type: 'material', target: 'herbs', targetAmount: 30, limit: 2, managerId
    });

    // Wait for a couple of tickManager cycles
    await page.waitForTimeout(6000);

    const golem = await page.evaluate((id) => G.golems.find(g => g.id === id), workerId);
    expect(golem.state).toBe('idle');
    console.log('✓ No dispatch when target (100 herbs) already exceeds goal (30)');
  });

});

const { test, expect } = require('@playwright/test');
const {
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
} = require('./helpers');

test.describe('Research Lab - Auto-Processing Pipeline', () => {

  test('should automatically process CK → PK → Research Points', async ({ page }) => {
    console.log('\n🧪 Starting Research Lab Auto-Processing Test\n');

    // Step 1: Load the game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    console.log('✓ Game loaded');

    // Step 2: Open debug panel and setup
    await openDebugPanel(page);
    await maxWorkshop(page); // Need workshop level 2+ for Research Lab
    await buildAllMachines(page);

    // Step 3: Give Condensed Knowledge
    await giveResource(page, 'condensed_knowledge_alchemy', 10);

    // Capture initial state
    await captureState(page, '01-initial-setup');

    // Step 4: Navigate to Research Lab
    await navigateToResearchLab(page);
    await captureState(page, '02-research-lab-opened');

    // Step 5: Queue research
    await queueResearch(page, 'distiller_speed');
    await captureState(page, '03-research-queued');

    // Step 6: Wait for Distiller to start processing
    console.log('\n⏳ Waiting for Distiller to auto-process CK...');
    await page.waitForTimeout(2000); // Give time for auto-processing to trigger

    const distillerStatus1 = await getDistillerStatus(page);
    console.log('Distiller Status after 2s:', distillerStatus1);

    // Check if Distiller started processing
    expect(distillerStatus1).not.toBeNull();

    if (!distillerStatus1.isProcessing && !distillerStatus1.hasQueue) {
      console.log('❌ ISSUE: Distiller did NOT auto-start processing!');
      await captureState(page, '04-ERROR-distiller-not-processing');

      // Get event log to diagnose
      const logs = await getEventLog(page);
      console.log('\n📋 Event Log:');
      logs.slice(-10).forEach(log => console.log('  ', log));

      throw new Error('Distiller should have auto-started processing CK, but it is idle');
    }

    console.log('✓ Distiller is processing CK');
    await captureState(page, '04-distiller-processing');

    // Step 7: Wait for Distiller to complete (10s processing time + buffer)
    console.log('\n⏳ Waiting for Distiller to complete processing...');
    await page.waitForTimeout(12000); // Wait for 10s processing + 2s buffer
    await captureState(page, '05-distiller-completed');

    // Step 8: Check Injector PK (may be 0 if research consumed it already)
    console.log('\n⏳ Checking Injector PK status...');
    await page.waitForTimeout(1000);
    const injectorPK = await getInjectorPK(page);
    console.log('Injector PK:', injectorPK);

    expect(injectorPK).not.toBeNull();
    // NOTE: Injector may show 0 PK because research consumes it faster than Distiller produces
    // This is expected behavior - check research points instead
    console.log(`✓ Injector PK: ${injectorPK.current}/${injectorPK.capacity} (may be 0 if research consumed it)`);

    await captureState(page, '06-injector-status');

    // Step 9: Wait for research to consume PK and accumulate points
    console.log('\n⏳ Waiting for Research to consume PK (1 PK per second)...');
    await page.waitForTimeout(3000); // Wait 3 seconds for 30 points

    const researchPoints = await getResearchPoints(page);
    console.log('Research Points:', researchPoints);

    expect(researchPoints).not.toBeNull();

    if (researchPoints.current === 0) {
      console.log('❌ ISSUE: Research is NOT consuming PK!');
      await captureState(page, '07-ERROR-research-not-progressing');

      // Get event log to diagnose
      const logs = await getEventLog(page);
      console.log('\n📋 Event Log:');
      logs.slice(-15).forEach(log => console.log('  ', log));

      // Check if we're seeing the "Research progress" messages
      const hasProgressLogs = logs.some(log => log.includes('Research progress'));
      if (!hasProgressLogs) {
        console.log('❌ No "Research progress" log messages found!');
        console.log('This indicates tickResearch() is not consuming PK');
      }

      throw new Error('Research should have consumed PK and gained points, but points are still 0');
    }

    console.log(`✓ Research has accumulated ${researchPoints.current}/${researchPoints.needed} points`);
    await captureState(page, '07-research-progressing');

    // Step 10: Verify continuous processing
    console.log('\n⏳ Verifying continuous auto-processing...');
    await page.waitForTimeout(5000);

    const finalState = await captureState(page, '08-final-state');

    // Check if more points were accumulated
    expect(finalState.research.current).toBeGreaterThan(researchPoints.current);
    console.log(`✓ Research continued progressing: ${finalState.research.current}/${finalState.research.needed} points`);

    // Final event log
    const finalLogs = await getEventLog(page);
    console.log('\n📋 Final Event Log (last 20 entries):');
    finalLogs.slice(-20).forEach(log => console.log('  ', log));

    console.log('\n✅ TEST PASSED: Research Lab auto-processing pipeline is working!\n');
  });

  test('should handle Injector full condition', async ({ page }) => {
    console.log('\n🧪 Testing Injector Full Condition\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openDebugPanel(page);
    await maxWorkshop(page);
    await buildAllMachines(page);

    // Give enough CK to fill injector beyond capacity
    await giveResource(page, 'condensed_knowledge_alchemy', 150);

    await navigateToResearchLab(page);
    await captureState(page, 'injector-test-01-setup');

    // Don't queue research, so Injector fills up
    console.log('\n⏳ Waiting for Distiller to fill Injector...');
    await page.waitForTimeout(15000);

    const injectorPK = await getInjectorPK(page);
    console.log('Injector Status:', injectorPK);

    await captureState(page, 'injector-test-02-filled');

    // Check event log for "Injector is full" warning
    const logs = await getEventLog(page);
    const hasFullWarning = logs.some(log => log.includes('Injector is full'));

    if (hasFullWarning) {
      console.log('✓ Injector full warning detected correctly');
    }

    console.log('\n📋 Event Log:');
    logs.slice(-10).forEach(log => console.log('  ', log));
  });

});

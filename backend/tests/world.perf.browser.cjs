// Budgets for a phone-sized, CPU-throttled page. A scene that keeps painting while
// nothing moves is what made iPhones run hot, so this must stay close to zero.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  try {
    const login = await (await fetch('http://127.0.0.1:4400/fixture/login/19')).json();
    const context = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), login.token);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('http://localhost:3300/z4world/play');
    await page.locator('[data-username="Tester19"]').waitFor();
    await delay(4000);
    const busy = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'TaskDuration').value;
    const sample = async (seconds, during) => {
      const file = path.join(os.tmpdir(), `z4world-perf-${process.pid}.json`);
      await browser.startTracing(page, { path: file, categories: ['devtools.timeline'] });
      const before = await busy();
      if (during) await during();
      await delay(seconds * 1000);
      const after = await busy();
      await browser.stopTracing();
      const events = JSON.parse(fs.readFileSync(file)).traceEvents;
      fs.unlinkSync(file);
      return {
        busy: (after - before) / seconds,
        paints: events.filter(e => e.name === 'Paint').length / seconds,
      };
    };
    assert.equal(await page.locator('[data-ambient]').count(), 0, 'phones skip the decorative walkers');
    const idle = await sample(6);
    console.log(`idle: main thread ${(idle.busy * 100).toFixed(1)}%, ${idle.paints.toFixed(1)} paints/s`);
    assert.ok(idle.paints < 1, 'nothing moves, so nothing paints');
    assert.ok(idle.busy < 0.05, 'an idle scene leaves the main thread alone');
    console.log('PASS an idle scene does not paint');
    const walking = await sample(5, () => page.locator('[data-testid="world-scene"]').evaluate(scene =>
      scene.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 330, clientY: 300 }))));
    console.log(`walking: main thread ${(walking.busy * 100).toFixed(1)}%, ${walking.paints.toFixed(1)} paints/s`);
    assert.ok(walking.busy < 0.3, 'walking stays well under the main thread budget');
    assert.ok(walking.paints < 30, 'walking does not repaint on every frame');
    console.log('PASS walking stays within budget');
    assert.equal(await page.locator('figure svg, figure [style*="filter"]').count(), 0, 'no SVG or filters in the scene');
    // A window over the map, such as the cinema player, stops the scene entirely.
    await delay(1500);
    await page.getByRole('button', { name: 'Tủ đồ', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await delay(1500);
    const behind = await sample(4);
    console.log(`with a window open: main thread ${(behind.busy * 100).toFixed(1)}%, ${behind.paints.toFixed(1)} paints/s`);
    assert.ok(behind.paints < 1 && behind.busy < 0.05, 'the scene rests behind an open window');
    console.log('PASS the scene rests behind an open window');
    console.log('ALL PERFORMANCE CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

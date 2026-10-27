const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const partial = process.argv.includes('--partial');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const login = await (await fetch('http://127.0.0.1:4400/fixture/login/0')).json();
    for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), login.token);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:3300/z4world');
      await page.locator('[data-username="Tester0"]').waitFor();
      await page.locator('[data-testid="world-scene"]').waitFor();
      if (!partial) {
        const results = await page.evaluate(async () => {
          const manifest = await (await fetch('/z4world/assets/manifest.json')).json();
          return Promise.all(manifest.assets.map(async a => {
            const response = await fetch(a.runtime);
            const bitmap = await createImageBitmap(await response.blob());
            return { name: a.name, ok: response.ok && bitmap.width > 0 };
          }));
        });
        assert.equal(results.length, 14);
        assert.ok(results.every(r => r.ok));
      }
      await delay(800);
      await page.screenshot({ path: `/tmp/z4world-art-${name}.png`, fullPage: true });
      const scene = page.locator('figure');
      await scene.screenshot({ path: `/tmp/z4world-art-${name}-scene.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      // Hold an actual pointer on the right control; verify screen-space direction.
      const player = page.locator('[data-username="Tester0"]');
      const before = { x: Number(await player.getAttribute('data-x')), y: Number(await player.getAttribute('data-y')) };
      const right = page.getByRole('button', { name: 'Di chuyển →', exact: true });
      await right.scrollIntoViewIfNeeded();
      const box = await right.boundingBox();
      await page.mouse.move(box.x+box.width/2, box.y+box.height/2); await page.mouse.down(); await delay(400); await page.mouse.up(); await delay(200);
      const after = { x: Number(await player.getAttribute('data-x')), y: Number(await player.getAttribute('data-y')) };
      assert.ok(after.x > before.x && after.y < before.y, 'right control must move screen-right');
      assert.ok(Math.abs((after.x+after.y)-(before.x+before.y)) < .01, 'right control must keep projected vertical coordinate');
      await delay(250);
      assert.equal(Number(await player.getAttribute('data-x')), after.x, 'release must stop movement');
      if (name === 'mobile') {
        await page.getByRole('button', { name: 'Xem toàn cảnh', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Xem toàn cảnh', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-testid="world-scene"]').getAttribute('viewBox') === '0 0 1760 1060');
        assert.equal(await page.locator('[data-testid="world-scene"]').getAttribute('viewBox'), '0 0 1760 1060');
      }
      await page.getByRole('button', { name: 'Theo chân nhân vật', exact: true }).click();
      await page.waitForFunction(() => Number(document.querySelector('[data-testid="world-scene"]').getAttribute('viewBox').split(' ')[2]) < 900);
      assert.notEqual(await page.locator('[data-testid="world-scene"]').getAttribute('viewBox'), '0 0 1760 1060');
      await scene.screenshot({ path: `/tmp/z4world-art-${name}-follow.png` });
      if (name === 'desktop') {
        async function goTo(x,y) {
          await page.locator('h1').click();
          const started = Date.now();
          for (;;) {
            const dx = x-Number(await player.getAttribute('data-x')), dy = y-Number(await player.getAttribute('data-y'));
            if (Math.hypot(dx,dy) < 10) break;
            if (Date.now()-started > 8000) throw new Error('Occlusion walk timed out');
            const sx=dx-dy, sy=(dx+dy)*.5, pressed=[];
            if (Math.abs(sx) > Math.abs(sy)*.45) pressed.push(sx>0?'ArrowRight':'ArrowLeft');
            if (Math.abs(sy) > Math.abs(sx)*.45) pressed.push(sy>0?'ArrowDown':'ArrowUp');
            for (const key of pressed) await page.keyboard.down(key);
            await delay(Math.hypot(dx,dy)<35?65:130);
            for (const key of pressed) await page.keyboard.up(key);
            await delay(80);
          }
        }
        await goTo(350,500); await goTo(240,500);
        assert.equal(await page.locator('[data-prop="tree-2"]').evaluate(el => el.parentElement.getAttribute('opacity')), '0.35');
        await delay(400);
        await scene.screenshot({ path: '/tmp/z4world-art-occlusion.png' });
        console.log('PASS ground-depth occlusion fades foliage behind the local player');
      }
      console.log(`PASS ${name}: art load, no overflow, screen-space controls, release and follow camera`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(partial ? 'PARTIAL ART CAPTURES COMPLETE' : 'ALL ISOMETRIC ART CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

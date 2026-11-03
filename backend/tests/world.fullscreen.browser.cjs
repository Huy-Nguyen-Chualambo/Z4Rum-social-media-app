// Full-screen route and responsive HUD. Run with the fixture and frontend from Z4WORLD_PLAN.md.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = 'http://localhost:3300';
const shots = process.env.WORLD_SHOT_DIR || '/tmp';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const screens = [
  ['desktop', { width: 1440, height: 900 }, {}],
  ['laptop', { width: 1280, height: 640 }, {}],
  ['phone-landscape', { width: 844, height: 390 }, { isMobile: true, hasTouch: true }],
  ['phone-portrait', { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
  ['small-landscape', { width: 568, height: 320 }, { isMobile: true, hasTouch: true }],
];
const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const login = await (await fetch('http://127.0.0.1:4400/fixture/login/10')).json();
    const open = async (viewport, extra) => {
      const context = await browser.newContext({ viewport, ...extra });
      await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), login.token);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      return { context, page };
    };

    // Landing keeps the site's navigation; the game page removes it.
    {
      const { context, page } = await open(screens[0][1], {});
      await page.goto(`${base}/z4world`);
      const enter = page.getByRole('link', { name: 'Vào thế giới', exact: true });
      await enter.waitFor();
      await page.getByText(/đang ở trong thế giới|hãy là người đầu tiên/).waitFor();
      assert.equal(await page.locator('#main-content').count(), 1, 'landing keeps the shell');
      await delay(500);
      await page.screenshot({ path: `${shots}/landing-desktop.png` });
      await enter.click();
      await page.waitForURL('**/z4world/play');
      await page.locator('[data-username="Tester10"]').waitFor();
      assert.equal(await page.locator('#main-content').count(), 0, 'game removes the shell');
      await page.getByRole('link', { name: 'Thoát Z4world' }).click();
      await page.waitForURL(u => u.pathname === '/z4world');
      await page.locator('#main-content').waitFor();
      console.log('PASS landing, enter and exit restore the site navigation');

      // Invitations sent before this change still reach the room.
      await page.goto(`${base}/z4world?room=world:abc123`);
      await page.waitForURL('**/z4world/play?room=world%3Aabc123');
      await page.locator('[data-username="Tester10"]').waitFor();
      console.log('PASS old invitation links redirect to the game');
      await context.close();
    }

    for (const [name, viewport, extra] of screens) {
      const { context, page } = await open(viewport, extra);
      await page.goto(`${base}/z4world/play`);
      const player = page.locator('[data-username="Tester10"]');
      await player.waitFor();
      await delay(900);
      await page.screenshot({ path: `${shots}/play-${name}.png` });

      // The map fills the screen exactly and the page cannot scroll.
      const scene = await page.locator('[data-testid="world-scene"]').boundingBox();
      assert.deepEqual([scene.x, scene.y, scene.width, scene.height], [0, 0, viewport.width, viewport.height], `${name}: scene fills the viewport`);
      assert.deepEqual(await page.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight]), [false, false], `${name}: no page scroll`);

      // Every control is on screen, reachable, and none overlap each other.
      const controls = await page.locator('[data-testid="world-stage"] :is(header, div) > :is(a, button), [role="group"][aria-label="Joystick di chuyển"]').all();
      const boxes = [];
      for (const control of controls) {
        const box = await control.boundingBox(), label = await control.getAttribute('aria-label') || await control.innerText();
        assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, `${name}: ${label} is on screen`);
        const hit = await control.evaluate(el => { const r = el.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el === t || el.contains(t); });
        assert.ok(hit, `${name}: ${label} can be tapped`);
        boxes.push({ ...box, label });
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++)
        assert.ok(!intersects(boxes[i], boxes[j]), `${name}: ${boxes[i].label} overlaps ${boxes[j].label}`);

      // Pressing a control must not also walk across the map underneath it.
      const before = await player.getAttribute('data-x');
      await page.getByRole('button', { name: 'Biểu cảm 👋' }).click();
      await delay(350);
      assert.equal(await player.getAttribute('data-x'), before, `${name}: HUD press does not walk`);

      const touch = Boolean(extra.hasTouch);
      assert.equal(await page.getByRole('group', { name: 'Joystick di chuyển' }).count(), touch ? 1 : 0, `${name}: joystick only on touch`);
      if (touch) {
        const stick = await page.getByRole('group', { name: 'Joystick di chuyển' }).boundingBox();
        await page.mouse.move(stick.x + stick.width / 2, stick.y + stick.height / 2);
        await page.mouse.down();
        await page.mouse.move(stick.x + stick.width - 6, stick.y + stick.height / 2);
        await delay(350);
        await page.mouse.up();
        await delay(150);
        assert.notEqual(await player.getAttribute('data-x'), before, `${name}: joystick walks`);

        // Chat opens on demand and hides the controls beneath it.
        await page.getByRole('button', { name: 'Mở trò chuyện' }).click();
        const input = page.getByRole('textbox', { name: 'Tin nhắn gần bạn' });
        await input.fill(`Xin chào từ ${name}`);
        await page.getByRole('button', { name: 'Gửi', exact: true }).click();
        await page.getByRole('log').getByText(`Xin chào từ ${name}`, { exact: false }).waitFor();
        await delay(200);
        await page.screenshot({ path: `${shots}/chat-${name}.png` });
        assert.equal(await page.getByRole('group', { name: 'Joystick di chuyển' }).count(), 0);
        await page.locator('[data-testid="world-scene"]').click({ position: { x: viewport.width - 8, y: 60 } });
        await page.getByRole('button', { name: 'Đóng trò chuyện' }).click();
        await page.getByRole('group', { name: 'Joystick di chuyển' }).waitFor();
      }

      // Dialogs fit short screens and scroll internally.
      await page.getByRole('button', { name: 'Tủ đồ', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Tủ đồ của bạn' });
      await dialog.waitFor();
      const box = await dialog.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= viewport.height, `${name}: dialog fits`);
      const preview = await page.getByLabel('Xem trước ngoại hình').boundingBox();
      const firstChoice = await page.getByRole('button', { name: 'Đào ấm', exact: true }).boundingBox();
      assert.ok(preview.y + preview.height <= box.y + box.height && firstChoice.y + firstChoice.height <= box.y + box.height, `${name}: preview and first choices need no scrolling`);
      await page.screenshot({ path: `${shots}/wardrobe-${name}.png` });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      console.log(`PASS ${name}: full-bleed scene, reachable controls, no overlap, dialog fits`);
      await context.close();
    }

    // The rotate suggestion only appears upright, never blocks, and stays dismissed.
    {
      const { context, page } = await open({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
      await page.goto(`${base}/z4world/play`);
      await page.locator('[data-username="Tester10"]').waitFor();
      const hint = page.getByText('Xoay ngang để chơi rộng hơn');
      await hint.waitFor();
      await page.setViewportSize({ width: 844, height: 390 });
      await hint.waitFor({ state: 'detached' });
      await page.setViewportSize({ width: 390, height: 844 });
      await hint.waitFor();
      await page.getByRole('button', { name: 'Đóng gợi ý xoay màn hình' }).click();
      await page.reload();
      await page.locator('[data-username="Tester10"]').waitFor();
      await delay(300);
      assert.equal(await hint.count(), 0, 'dismissed hint stays gone');
      console.log('PASS rotate hint: portrait only, non-blocking, dismissal remembered');
      await context.close();
    }

    // The full-screen button works, and leaving the game always releases it.
    {
      const { context, page } = await open({ width: 1440, height: 900 }, {});
      await page.goto(`${base}/z4world/play`);
      await page.locator('[data-username="Tester10"]').waitFor();
      await page.getByRole('button', { name: 'Toàn màn hình', exact: true }).click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await page.getByRole('button', { name: 'Thoát toàn màn hình', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Thoát Z4world' }).click();
      await page.waitForURL(u => u.pathname === '/z4world');
      await page.waitForFunction(() => !document.fullscreenElement);
      console.log('PASS full-screen toggle, released when leaving the game');
      await context.close();
    }

    // A live match stays usable on a short landscape phone.
    {
      const phone = { width: 844, height: 390 }, touch = { isMobile: true, hasTouch: true };
      const logins = await Promise.all([11, 12].map(async id => (await fetch(`http://127.0.0.1:4400/fixture/login/${id}`)).json()));
      const players = [];
      for (const [i, auth] of logins.entries()) {
        const context = await browser.newContext({ viewport: phone, ...touch });
        await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), auth.token);
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}/z4world/play`);
        await page.locator(`[data-username="Tester${11 + i}"]`).waitFor();
        players.push({ context, page });
      }
      for (const { page } of players) {
        await page.getByRole('button', { name: 'Đi tới Game Club', exact: true }).click();
        // The map's own Game Club prop always has this label; wait for the HUD button.
        const club = page.locator('button', { hasText: 'Vào Game Club' });
        await club.waitFor({ timeout: 15000 });
        await club.click();
        await page.getByRole('dialog', { name: 'Game Club' }).waitFor();
      }
      await players[0].page.screenshot({ path: `${shots}/club-phone-landscape.png` });
      for (const { page } of players) await page.getByRole('button', { name: 'Chơi sàn biến mất', exact: true }).click();
      const { page } = players[0];
      await page.getByText('Vòng 1/8', { exact: false }).waitFor();
      assert.equal(await page.getByText('Đố vui anh em', { exact: false }).count(), 0, 'quiz is hidden during a floor round');
      const dialog = await page.getByRole('dialog', { name: 'Game Club' }).boundingBox();
      await page.screenshot({ path: `${shots}/floor-phone-landscape.png` });
      const close = await page.getByRole('button', { name: 'Đóng cửa sổ' }).boundingBox();
      assert.ok(close.y >= dialog.y, 'close button is not cut off during a round');
      assert.equal(await page.getByRole('dialog', { name: 'Game Club' }).evaluate(el => el.scrollHeight > el.clientHeight), false, 'a live round needs no dialog scrolling');
      for (const cell of ['Ô 1', 'Ô 6', 'Ô 31', 'Ô 36']) {
        const tile = await page.getByRole('button', { name: cell, exact: true }).boundingBox();
        assert.ok(tile.y >= dialog.y && tile.y + tile.height <= Math.min(dialog.y + dialog.height, phone.height), `${cell} is visible without scrolling`);
      }
      console.log('PASS floor board fits a landscape phone without scrolling');
      for (const { context } of players) await context.close();
    }

    assert.deepEqual(errors, []);
    console.log('ALL FULL-SCREEN CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

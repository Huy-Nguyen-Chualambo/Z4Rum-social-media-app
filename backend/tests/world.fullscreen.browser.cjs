// Full-screen route and responsive HUD. Run with the fixture and frontend from Z4WORLD_PLAN.md.
const { chromium } = require('playwright');
const { mockMovies } = require('./world.movies.mock.cjs');
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
      await mockMovies(context);
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
      const controls = await page.locator('[data-testid="world-stage"] :is(header, div, nav) > :is(a, button), [role="group"][aria-label="Joystick di chuyển"]').all();
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
      await page.getByRole('button', { name: 'Biểu cảm', exact: true }).click();
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

    // One tap on a table walks over and sits; the action then appears on the map.
    {
      const { context, page } = await open({ width: 1440, height: 900 }, {});
      await page.goto(`${base}/z4world/play`);
      const me = page.locator('[data-username="Tester10"]');
      await me.waitFor();
      await page.getByRole('button', { name: 'Ngồi cafe-1', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-username="Tester10"] [data-animation]')?.getAttribute('data-animation') === 'sit', null, { timeout: 15000 });
      await page.getByRole('button', { name: 'Đứng dậy', exact: true }).waitFor();
      const long = 'Tối nay quán đông vui quá, anh em ghé làm ly cà phê rồi ngồi tám chuyện cho hết buổi tối nha';
      await page.getByRole('textbox', { name: 'Tin nhắn gần bạn' }).fill(long);
      await page.getByRole('button', { name: 'Gửi', exact: true }).click();
      await page.getByRole('log').getByText(long, { exact: false }).waitFor();
      await delay(300);
      const bubbleWords = await page.locator('[data-testid="world-scene"] text').allTextContents();
      assert.ok(bubbleWords.join(' ').includes('buổi tối nha'), 'a long bubble wraps instead of being cut off');
      await page.screenshot({ path: `${shots}/seated-desktop.png` });
      await page.getByRole('button', { name: 'Đứng dậy', exact: true }).click();
      const sit = page.getByRole('button', { name: 'Ngồi bàn cà phê', exact: true });
      await sit.waitFor();
      await delay(250);
      await page.screenshot({ path: `${shots}/near-table-desktop.png` });
      // Walking away by hand cancels a pending one-tap action.
      await page.getByRole('button', { name: 'Vào rạp phim', exact: true }).first().click();
      await delay(150);
      await page.locator('h1').click();
      await page.keyboard.down('ArrowLeft'); await delay(200); await page.keyboard.up('ArrowLeft');
      await delay(3500);
      assert.equal(await page.getByRole('dialog').count(), 0, 'manual movement cancels the arrival action');
      assert.equal(await page.locator('[data-ambient]').count(), 3);
      assert.equal(await page.locator('[data-player]').count(), 1, 'passers-by are not counted as players');
      console.log('PASS one-tap seating, on-map action, wrapped bubble and cancel by hand');
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

    // The cinema stays usable on a short landscape phone and in portrait.
    for (const [name, phone] of [['landscape', { width: 844, height: 390 }], ['portrait', { width: 390, height: 844 }]]) {
      const auth = await (await fetch(`http://127.0.0.1:4400/fixture/login/11`)).json();
      const context = await browser.newContext({ viewport: phone, isMobile: true, hasTouch: true });
      await mockMovies(context);
      await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), auth.token);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}/z4world/play`);
      await page.locator('[data-username="Tester11"]').waitFor();
      await page.getByRole('button', { name: 'Xem toàn cảnh', exact: true }).click();
      // One tap on the building: the avatar walks over and the cinema opens.
      await page.getByRole('button', { name: 'Vào rạp phim', exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Rạp phim' });
      await dialog.waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: 'Xem phim Phim Một', exact: true }).waitFor();
      await delay(200);
      await page.screenshot({ path: `${shots}/cinema-browse-phone-${name}.png` });
      await page.getByRole('button', { name: 'Xem phim Phim Một', exact: true }).click();
      await page.getByRole('button', { name: 'Xem Tập 01', exact: true }).click();
      const player = await page.getByTitle('Trình phát Phim Một').boundingBox();
      const frame = await dialog.boundingBox();
      assert.ok(player.x >= frame.x && player.x + player.width <= frame.x + frame.width, `${name}: player fits the dialog`);
      assert.ok(player.y + player.height <= phone.height, `${name}: player is fully on screen`);
      assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth), false, `${name}: no sideways scrolling`);
      await delay(200);
      await page.screenshot({ path: `${shots}/cinema-player-phone-${name}.png` });
      await context.close();
      console.log(`PASS cinema fits a ${name} phone`);
    }

    assert.deepEqual(errors, []);
    console.log('ALL FULL-SCREEN CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

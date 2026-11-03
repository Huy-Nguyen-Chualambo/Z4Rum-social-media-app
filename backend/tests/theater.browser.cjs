const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockMovies } = require('./theater.movies.mock.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = 'http://localhost:3300';
const shots = process.env.THEATER_SHOT_DIR || '/tmp';
const PLAYER = '[title^="Trình phát"]';

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  const open = async (id, path = '/z4theater', options = { viewport: { width: 1440, height: 900 } }) => {
    const auth = await (await fetch(`http://127.0.0.1:4400/fixture/login/${id}`)).json();
    const context = await browser.newContext(options);
    const movies = await mockMovies(context);
    await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), auth.token);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}${path}`);
    return { context, page, movies };
  };
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const video = (page, read) => page.locator(`video${PLAYER}`).evaluate(read);
  const time = page => video(page, v => v.currentTime);
  const paused = page => video(page, v => v.paused);
  const until = async (check, message, timeout = 12000) => {
    const start = Date.now();
    for (;;) {
      if (await check().catch(() => false)) return;
      if (Date.now() - start > timeout) assert.fail(message);
      await delay(150);
    }
  };
  const inSync = (host, viewer, message, within = 1.5) =>
    until(async () => Math.abs((await time(host)) - (await time(viewer))) <= within, message);
  const openRoom = async (page, film, episode) => {
    await button(page, `Xem phim ${film}`).click();
    await button(page, `Xem ${episode}`).click();
    await page.waitForURL(/\/z4theater\/[\w-]+$/);
  };
  try {
    // The catalog replaces the old page, and old links land on it.
    const a = await open(5, '/z4world/play?room=world:abc');
    await a.page.waitForURL(/\/z4theater(\?|$)/);
    await a.page.getByRole('heading', { name: 'Z4theater', exact: true }).waitFor();
    assert.ok(await a.page.getByRole('link', { name: 'Z4theater' }).count() > 0, 'the site menu leads here');
    assert.equal(await a.page.getByText('Z4world').count(), 0, 'nothing mentions the old name');
    await button(a.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await button(a.page, 'Xem phim Phim Người Lớn').count(), 0, '18+ films stay hidden');
    await a.page.getByLabel('Tìm phim').fill('hai');
    await button(a.page, 'Tìm').click();
    await button(a.page, 'Xem phim Phim Hai').waitFor();
    assert.equal(await button(a.page, 'Xem phim Phim Một').count(), 0, 'search narrows the list');
    await button(a.page, 'Mới cập nhật').click();
    await a.page.screenshot({ path: `${shots}/theater-catalog.png` });
    console.log('PASS old links, site menu, browse, search and hidden 18+ films');

    // Choosing an episode opens a private room playing real video.
    await openRoom(a.page, 'Phim Một', 'Tập 02');
    const link = new URL(a.page.url()).pathname;
    await a.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await until(async () => (await time(a.page)) > 1, 'the stream plays');
    assert.equal(await a.page.locator('nav').count(), 0, 'a room has no site navigation');
    await a.context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await button(a.page, 'Mời bạn').click();
    await a.page.getByText('Đã chép link mời.').waitFor();
    assert.equal(await a.page.evaluate(() => navigator.clipboard.readText()), a.page.url());
    console.log('PASS an episode opens a private room with an invite link');

    // A friend with the link lands on the same moment.
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 20; });
    await delay(600);
    const b = await open(6, link);
    await b.page.getByText('Đang xem theo Tester5', { exact: false }).waitFor();
    await until(async () => (await time(b.page)) >= 18, 'the viewer joins at the host position');
    await inSync(a.page, b.page, 'the viewer matches the host after joining');
    assert.equal(await paused(b.page), false, 'the viewer plays along');
    assert.equal(await button(b.page, 'Đổi phim').count(), 0, 'only the host changes the film');
    assert.equal(await button(b.page, 'Xem Tập 01').count(), 0, 'only the host changes the episode');
    await a.page.getByText('2 người trong phòng').waitFor();
    await a.page.screenshot({ path: `${shots}/theater-room-host.png` });
    await b.page.screenshot({ path: `${shots}/theater-room-viewer.png` });
    console.log('PASS a friend with the link lands on the moment being shown');

    // The host steers: seek, pause and play.
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 45; });
    await until(async () => (await time(b.page)) >= 43, 'a host seek moves the viewer');
    await a.page.locator(`video${PLAYER}`).evaluate(v => v.pause());
    await until(() => paused(b.page), 'a host pause stops the viewer');
    await inSync(a.page, b.page, 'the paused frames match', 0.6);
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 10; return v.play(); });
    await until(async () => !(await paused(b.page)) && (await time(b.page)) < 20, 'a host play resumes the viewer');
    await inSync(a.page, b.page, 'in sync after resuming');
    console.log('PASS the host steers seek, pause and play');

    // A viewer may step out, and is not dragged back until they ask.
    await b.page.locator(`video${PLAYER}`).evaluate(v => v.pause());
    await button(b.page, 'Theo lại người chiếu').waitFor();
    await delay(1500);
    assert.equal(await paused(b.page), true, 'a viewer who paused stays paused');
    await button(b.page, 'Theo lại người chiếu').click();
    await until(async () => !(await paused(b.page)), 'following again resumes');
    await inSync(a.page, b.page, 'following again catches up');
    console.log('PASS a viewer can step out and rejoin');

    // Chat, and everyone follows when the host moves on.
    await a.page.getByLabel('Tin nhắn trong phòng').fill('Phim hay quá');
    await button(a.page, 'Gửi').click();
    await b.page.getByRole('log').getByText('Phim hay quá', { exact: false }).waitFor();
    await button(a.page, 'Xem Tập 01').click();
    await b.page.getByRole('heading', { name: 'Phim Một · Tập 01' }).waitFor();
    await until(async () => (await time(b.page)) < 15, 'the new episode starts from the top');
    await delay(1100);
    await button(a.page, 'Đổi phim').click();
    await button(a.page, 'Xem phim Phim Hai').click();
    await button(a.page.getByRole('dialog'), 'Xem Tập 01').click();
    await b.page.getByRole('heading', { name: 'Phim Hai · Tập 01' }).waitFor();
    console.log('PASS chat, and viewers follow a new episode or film');

    // A reload keeps the host's seat and position; the room waits meanwhile.
    await until(async () => (await time(a.page)) > 1, 'the new film plays');
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 30; });
    await delay(800);
    await a.page.reload();
    await until(() => paused(b.page), 'the room waits for a host who dropped');
    await b.page.getByText('tạm rời phòng', { exact: false }).waitFor({ timeout: 3000 }).catch(() => {});
    await a.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await until(async () => (await time(a.page)) >= 28, 'the host comes back at the same moment');
    console.log('PASS a host who reloads keeps the seat and the moment');

    // Leaving passes the seat on; a closed room says so.
    await a.page.getByRole('link', { name: 'Rời phòng' }).click();
    await a.page.waitForURL(/\/z4theater$/);
    await b.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await button(b.page, 'Đổi phim').waitFor();
    await b.page.goto(`${base}/z4theater/phong-khong-co`);
    await b.page.getByRole('heading', { name: 'Phòng này đã đóng' }).waitFor();
    await a.context.close();
    await b.context.close();
    console.log('PASS the seat passes on, and a closed room says so');

    // The backup source takes over when the primary is down.
    const c = await open(7, '/z4theater');
    c.movies.primaryDown = true;
    await c.page.reload();
    await c.page.getByText('chuyển sang nguồn dự phòng', { exact: false }).waitFor();
    await button(c.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await button(c.page, 'Nguồn dự phòng').getAttribute('aria-pressed'), 'true');
    assert.equal(await button(c.page, 'Xem phim Phim Người Lớn').count(), 0, 'the backup hides 18+ films too');
    await button(c.page, 'Nguồn chính').click();
    await c.page.getByText('Không kết nối được nguồn phim.').waitFor();
    assert.equal(await button(c.page, 'Nguồn chính').getAttribute('aria-pressed'), 'true', 'a chosen source is respected');
    c.movies.primaryDown = false;
    await button(c.page, 'Thử lại').click();
    await button(c.page, 'Xem phim Phim Một').waitFor();
    console.log('PASS the backup takes over, and a chosen source is respected');

    // Switching source keeps the film and episode; a dead stream moves by itself.
    await openRoom(c.page, 'Phim Một', 'Tập 02');
    await c.page.locator(`video${PLAYER}`).waitFor();
    await button(c.page, 'Đổi sang nguồn dự phòng').click();
    await c.page.locator(`iframe${PLAYER}`).waitFor();
    assert.equal(await c.page.locator(`iframe${PLAYER}`).getAttribute('src'), 'https://embed.example.test/phim-mot/tap-2', 'the episode carries over');
    await c.page.getByText('không đồng bộ được', { exact: false }).waitFor();
    await delay(1100);
    await button(c.page, 'Đổi sang nguồn chính').click();
    await c.page.locator(`video${PLAYER}`).waitFor();
    await delay(1100);
    c.movies.streamDown = true;
    await button(c.page, 'Xem Tập 01').click();
    await c.page.locator(`iframe${PLAYER}`).waitFor({ timeout: 30000 });
    await c.page.getByText('chuyển sang nguồn còn lại', { exact: false }).waitFor();
    await c.context.close();
    console.log('PASS switching source keeps the episode, and a dead stream moves by itself');

    // The room fits a phone both ways, with the picture and the chat box on screen.
    for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
      const phone = await open(8, '/z4theater', { viewport, isMobile: true, hasTouch: true });
      await button(phone.page, 'Xem phim Phim Một').waitFor();
      await phone.page.screenshot({ path: `${shots}/theater-catalog-${name}.png` });
      assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: catalog has no sideways scroll`);
      await delay(2100);
      await openRoom(phone.page, 'Phim Một', 'Tập 01');
      const player = await phone.page.locator(`video${PLAYER}`).boundingBox();
      assert.ok(player.x >= 0 && player.x + player.width <= viewport.width + 1 && player.y + player.height <= viewport.height, `${name}: the picture is fully on screen`);
      const box = await phone.page.getByLabel('Tin nhắn trong phòng').boundingBox();
      assert.ok(box.y + box.height <= viewport.height, `${name}: the chat box is on screen`);
      assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: room has no sideways scroll`);
      await delay(500);
      await phone.page.screenshot({ path: `${shots}/theater-room-${name}.png` });
      await phone.context.close();
      await delay(2100);
      console.log(`PASS the room fits a phone in ${name}`);
    }

    assert.deepEqual(errors, []);
    console.log('ALL THEATER CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

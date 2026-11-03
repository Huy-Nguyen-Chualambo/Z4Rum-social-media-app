const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockMovies } = require('./world.movies.mock.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = 'http://localhost:3300';
const shots = process.env.WORLD_SHOT_DIR || '/tmp';
const PLAYER = '[title="Trình phát Phim Một"]';

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  const open = async id => {
    const auth = await (await fetch(`http://127.0.0.1:4400/fixture/login/${id}`)).json();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const movies = await mockMovies(context);
    await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), auth.token);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/z4world/play`);
    await page.locator(`[data-username="Tester${id}"]`).waitFor();
    return { context, page, movies };
  };
  const enter = async page => {
    await page.getByRole('button', { name: 'Vào rạp phim', exact: true }).first().click();
    await page.getByRole('dialog', { name: 'Rạp phim', exact: true }).waitFor({ timeout: 20000 });
  };
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const video = (page, read) => page.locator(`video${PLAYER}`).evaluate(read);
  const time = page => video(page, v => v.currentTime);
  const paused = page => video(page, v => v.paused);
  const until = async (check, message, timeout = 12000) => {
    const start = Date.now();
    for (;;) {
      if (await check()) return;
      if (Date.now() - start > timeout) assert.fail(message);
      await delay(150);
    }
  };
  const inSync = async (host, viewer, message, within = 1.5) =>
    until(async () => Math.abs((await time(host)) - (await time(viewer))) <= within, message);
  try {
    // Browse, the 18+ filter and search on the primary source.
    const a = await open(5);
    const b = await open(6);
    await enter(a.page);
    await enter(b.page);
    await button(a.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await button(a.page, 'Xem phim Phim Người Lớn').count(), 0, '18+ films stay hidden');
    await a.page.getByLabel('Tìm phim').fill('hai');
    await button(a.page, 'Tìm').click();
    await button(a.page, 'Xem phim Phim Hai').waitFor();
    assert.equal(await button(a.page, 'Xem phim Phim Một').count(), 0, 'search narrows the list');
    await button(a.page, 'Mới cập nhật').click();
    console.log('PASS browse, search and hidden 18+ films');

    // Real video through hls.js.
    await button(a.page, 'Xem phim Phim Một').click();
    await a.page.getByRole('button', { name: 'Xem Tập 02', exact: true }).click();
    await until(async () => (await time(a.page)) > 1, 'the stream plays');
    assert.equal(await paused(a.page), false);
    await a.page.screenshot({ path: `${shots}/cinema-sync-host.png` });
    console.log('PASS an episode plays as real video');

    // Sharing fixes the host's position; a viewer lands on the same moment.
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 20; });
    await button(a.page, 'Chiếu cho cả sảnh').click();
    await a.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await button(b.page, 'Xem cùng').click();
    await b.page.locator(`video${PLAYER}`).waitFor();
    await until(async () => (await time(b.page)) >= 18, 'the viewer joins at the host position');
    await inSync(a.page, b.page, 'the viewer matches the host after joining');
    assert.equal(await paused(b.page), false, 'the viewer plays along');
    await b.page.screenshot({ path: `${shots}/cinema-sync-viewer.png` });
    console.log('PASS a viewer joins at the moment being shown');

    // The host steers: seek, pause and play.
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 45; });
    await until(async () => (await time(b.page)) >= 43, 'a host seek moves the viewer');
    await inSync(a.page, b.page, 'in sync after a seek');
    await a.page.locator(`video${PLAYER}`).evaluate(v => v.pause());
    await until(() => paused(b.page), 'a host pause stops the viewer');
    await inSync(a.page, b.page, 'the paused frames match', 0.6);
    await a.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 10; return v.play(); });
    await until(async () => !(await paused(b.page)) && (await time(b.page)) < 20, 'a host play resumes the viewer');
    await inSync(a.page, b.page, 'in sync after resuming');
    console.log('PASS the host steers seek, pause and play');

    // A viewer may leave the screening, and is not dragged back until they ask.
    await b.page.locator(`video${PLAYER}`).evaluate(v => v.pause());
    await button(b.page, 'Theo lại người chiếu').waitFor();
    await delay(1500);
    assert.equal(await paused(b.page), true, 'a viewer who paused stays paused');
    await button(b.page, 'Theo lại người chiếu').click();
    await until(async () => !(await paused(b.page)), 'following again resumes');
    await inSync(a.page, b.page, 'following again catches up');
    console.log('PASS a viewer can leave the screening and rejoin');

    // Chat works beside the player.
    await a.page.getByRole('dialog').getByLabel('Tin nhắn gần bạn').fill('Phim hay quá');
    await a.page.getByRole('dialog').getByRole('button', { name: 'Gửi', exact: true }).click();
    await b.page.getByRole('dialog').getByRole('log').getByText('Phim hay quá', { exact: false }).waitFor();

    // The film switching episode takes followers along.
    await a.page.getByRole('button', { name: 'Xem Tập 01', exact: true }).click();
    await until(async () => (await b.page.getByRole('button', { name: 'Xem Tập 01', exact: true }).getAttribute('aria-current')) === 'true', 'viewers follow an episode change');
    await until(async () => (await time(b.page)) < 15, 'the new episode starts from the top');
    console.log('PASS chat beside the player and following an episode change');

    // Closing stops the player and leaves a way back.
    await b.page.keyboard.press('Escape');
    await button(b.page, 'Đang chiếu · Phim Một').click();
    await button(b.page, 'Xem cùng').click();
    await inSync(a.page, b.page, 'coming back lands on the same moment');
    await b.page.keyboard.press('Escape');
    // The host stepping away pauses the room instead of leaving it to run on.
    await a.page.keyboard.press('Escape');
    await a.page.getByRole('dialog').waitFor({ state: 'detached' }).catch(() => {});
    await button(a.page, 'Đang chiếu · Phim Một').click();
    await button(a.page, 'Tiếp tục chiếu').click();
    await until(async () => !(await paused(a.page)), 'the host resumes');
    await button(a.page, 'Dừng chiếu cho sảnh').click();
    await button(b.page, 'Đang chiếu · Phim Một').waitFor({ state: 'detached' });
    await a.page.getByRole('button', { name: 'Đóng cửa sổ' }).click();
    console.log('PASS closing, coming back and stopping the screening');
    await a.context.close();
    await b.context.close();

    // The backup source takes over when the primary is down.
    const c = await open(7);
    c.movies.primaryDown = true;
    await enter(c.page);
    await c.page.getByText('chuyển sang nguồn dự phòng', { exact: false }).waitFor();
    await button(c.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await button(c.page, 'Nguồn dự phòng').getAttribute('aria-pressed'), 'true');
    assert.equal(await button(c.page, 'Xem phim Phim Người Lớn').count(), 0, 'the backup hides 18+ films too');
    await c.page.screenshot({ path: `${shots}/cinema-fallback.png` });
    await button(c.page, 'Xem phim Phim Một').click();
    await button(c.page, 'Xem Tập 1').click();
    assert.equal(await c.page.locator(`iframe${PLAYER}`).getAttribute('src'), 'https://embed.example.test/phim-mot/tap-1');
    await c.page.getByText('không đồng bộ được', { exact: false }).waitFor();
    console.log('PASS the backup takes over and plays through its embed');

    // Choosing a source by hand: a failure no longer switches by itself.
    await button(c.page, 'Thông tin phim').click();
    await button(c.page, 'Danh sách phim').click();
    await button(c.page, 'Nguồn chính').click();
    await c.page.getByRole('alert').waitFor();
    assert.equal(await button(c.page, 'Nguồn chính').getAttribute('aria-pressed'), 'true', 'a chosen source is respected');
    c.movies.primaryDown = false;
    await button(c.page, 'Thử lại').click();
    await button(c.page, 'Xem phim Phim Một').waitFor();
    console.log('PASS a chosen source is respected and can be retried');

    // Switching source while watching keeps the film and episode.
    await button(c.page, 'Xem phim Phim Một').click();
    await button(c.page, 'Xem Tập 02').click();
    await c.page.locator(`video${PLAYER}`).waitFor();
    await button(c.page, 'Đổi sang nguồn dự phòng').click();
    await c.page.locator(`iframe${PLAYER}`).waitFor();
    assert.equal(await c.page.locator(`iframe${PLAYER}`).getAttribute('src'), 'https://embed.example.test/phim-mot/tap-2', 'the episode carries over');
    await button(c.page, 'Đổi sang nguồn chính').click();
    await c.page.locator(`video${PLAYER}`).waitFor();
    console.log('PASS switching source mid-film keeps the episode');

    // A stream that dies moves to the backup by itself.
    await button(c.page, 'Thông tin phim').click();
    c.movies.streamDown = true;
    await button(c.page, 'Xem Tập 01').click();
    await c.page.locator(`iframe${PLAYER}`).waitFor({ timeout: 30000 });
    await c.page.getByText('chuyển sang nguồn còn lại', { exact: false }).waitFor();
    console.log('PASS a dead stream falls back to the other source');
    await c.context.close();

    assert.deepEqual(errors, []);
    console.log('ALL CINEMA CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

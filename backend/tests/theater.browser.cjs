const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mockMovies } = require('./theater.movies.mock.cjs');
const { io } = require('../../frontend/node_modules/socket.io-client');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = 'http://localhost:3300';
const shots = process.env.THEATER_SHOT_DIR || '/tmp';
const PLAYER = '[title^="Trình phát"]';

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  /** Pass null as the id to visit without an account. */
  const open = async (id, path = '/z4theater', options = { viewport: { width: 1440, height: 900 } }) => {
    const context = await browser.newContext(options);
    const movies = await mockMovies(context);
    if (id !== null) {
      const auth = await (await fetch(`http://127.0.0.1:4400/fixture/login/${id}`)).json();
      await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), auth.token);
    }
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
    await b.page.getByText('đã rời phòng', { exact: false }).waitFor({ timeout: 3000 }).catch(() => {});
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

    // Guests reach the theater's namespace only, and can do nothing there but watch.
    const connects = (path, auth) => new Promise(resolve => {
      const socket = io(`http://127.0.0.1:4400${path}`, { auth, transports: ['websocket'], reconnection: false, forceNew: true });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', () => { socket.close(); resolve(null); });
    });
    assert.equal(await connects('/', {}), null, 'the main namespace still refuses guests');
    assert.equal(await connects('/', { token: 'forged' }), null, 'the main namespace still refuses a bad token');
    for (const auth of [{}, { token: 'forged' }, { token: 42 }]) {
      const socket = await connects('/theater', auth);
      assert.ok(socket, `the theater accepts ${JSON.stringify(auth)} as a guest`);
      const reply = await socket.timeout(3000).emitWithAck('theater:create', { source: 'phimapi', slug: 'phim-mot', server: 0, episode: 'tap-01' });
      assert.match(reply.error, /đăng nhập/, 'a guest cannot open a room');
      socket.close();
    }
    console.log('PASS guests stay out of the main namespace and cannot open rooms');

    // A visitor without an account browses and watches straight away.
    const g = await open(null);
    await button(g.page, 'Xem phim Phim Một').waitFor();
    assert.equal(new URL(g.page.url()).pathname, '/z4theater', 'the catalog does not ask for a login');
    assert.equal(await button(g.page, 'Xem phim Phim Người Lớn').count(), 0, '18+ films stay hidden from guests too');
    await button(g.page, 'Xem phim Phim Một').click();
    await button(g.page, 'Xem Tập 02').click();
    await g.page.waitForURL(/\/z4theater\/watch\?/);
    await g.page.getByText('Bạn đang xem một mình').waitFor();
    await until(async () => (await time(g.page)) > 1, 'a guest plays the film');
    assert.equal(await g.page.locator('nav').count(), 0, 'watching has no site navigation');
    await g.page.screenshot({ path: `${shots}/theater-guest-solo.png` });
    await button(g.page, 'Xem Tập 01').click();
    await g.page.getByRole('heading', { name: 'Phim Một · Tập 01' }).waitFor();
    assert.equal(new URL(g.page.url()).searchParams.get('episode'), 'tap-01', 'the link follows the episode');
    await until(async () => (await time(g.page)) > 1, 'the next episode plays');
    await g.page.reload();
    await g.page.getByRole('heading', { name: 'Phim Một · Tập 01' }).waitFor();
    console.log('PASS a guest browses, watches and changes episode without an account');

    // Chat and inviting ask for a login, then carry on from the same moment in a real room.
    await button(g.page, 'Trò chuyện').click();
    await button(g.page, 'Đăng nhập để trò chuyện').waitFor();
    assert.equal(await g.page.getByLabel('Tin nhắn trong phòng').count(), 0, 'a guest has no message box');
    await until(async () => (await time(g.page)) > 1, 'the reloaded film plays');
    await g.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 25; });
    await until(async () => (await time(g.page)) >= 25, 'the seek lands');
    assert.equal(await g.page.evaluate(() => sessionStorage.getItem('z4rum_token')), null);
    await button(g.page, 'Mời bạn').click();
    await g.page.waitForURL(/\/login\?next=/);
    await g.page.getByText('quay lại đúng chỗ đang xem').waitFor();
    assert.match(await g.page.getByRole('link', { name: 'Đăng ký ngay' }).getAttribute('href'), /^\/register\?next=/, 'signing up keeps the way back');
    await g.page.screenshot({ path: `${shots}/theater-guest-login.png` });
    await g.page.getByPlaceholder('Email').fill('theater-test-9@example.test');
    await g.page.getByPlaceholder('Mật khẩu').fill('matkhau123');
    await g.page.locator('button[type=submit]').click();
    await g.page.waitForURL(/\/z4theater\/[\w-]{12}$/);
    await g.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await until(async () => (await time(g.page)) >= 24, 'the room opens at the moment the guest was watching');
    await button(g.page, 'Mời bạn').click();
    await g.page.getByLabel('Tin nhắn trong phòng').waitFor();
    await g.context.close();
    console.log('PASS inviting asks for a login, then opens a room at the same moment');

    // A link cannot use the login page to send people elsewhere.
    const evil = await open(null, '/login?next=https%3A%2F%2Fevil.example');
    await evil.page.getByPlaceholder('Email').waitFor();
    assert.equal(await evil.page.getByText('quay lại đúng chỗ đang xem').count(), 0, 'an outside next is ignored');
    assert.equal(await evil.page.getByRole('link', { name: 'Đăng ký ngay' }).getAttribute('href'), '/register');
    await evil.context.close();
    console.log('PASS the login page ignores a link that leads off the site');

    // A friend without an account opens the invite and watches along.
    const h = await open(10);
    await openRoom(h.page, 'Phim Một', 'Tập 02');
    const invite = new URL(h.page.url()).pathname;
    await until(async () => (await time(h.page)) > 1, 'the host plays');
    await h.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 20; });
    await delay(600);
    const v = await open(null, invite);
    await v.page.getByText('Đang xem theo Tester10', { exact: false }).waitFor();
    assert.equal(new URL(v.page.url()).pathname, invite, 'the invite does not ask for a login');
    await until(async () => (await time(v.page)) >= 18, 'the guest joins at the host position');
    await inSync(h.page, v.page, 'the guest matches the host');
    await h.page.getByText('2 người trong phòng').waitFor();
    assert.match(await h.page.getByText('2 người trong phòng').getAttribute('title'), /Khách/, 'the room can see a guest is there');
    assert.equal(await button(v.page, 'Đổi phim').count(), 0, 'a guest cannot change the film');
    assert.equal(await button(v.page, 'Xem Tập 01').count(), 0, 'a guest cannot change the episode');
    assert.equal(await v.page.getByLabel('Tin nhắn trong phòng').count(), 0, 'a guest has no message box');
    await h.page.getByLabel('Tin nhắn trong phòng').fill('Chào cả nhà');
    await button(h.page, 'Gửi').click();
    await v.page.getByRole('log').getByText('Chào cả nhà', { exact: false }).waitFor();
    await v.page.screenshot({ path: `${shots}/theater-guest-room.png` });
    console.log('PASS a guest with the invite watches in sync and reads the chat');

    // Logging in from the room returns to the same room, now able to talk.
    const f = await open(null, invite);
    await f.page.getByText('Đang xem theo Tester10', { exact: false }).waitFor();
    await button(f.page, 'Đăng nhập để trò chuyện').click();
    await f.page.waitForURL(/\/login\?next=/);
    await f.page.getByPlaceholder('Email').fill('theater-test-11@example.test');
    await f.page.getByPlaceholder('Mật khẩu').fill('matkhau123');
    await f.page.locator('button[type=submit]').click();
    await f.page.waitForURL(`**${invite}`);
    await f.page.getByLabel('Tin nhắn trong phòng').fill('Mình vào rồi');
    await delay(100);
    await button(f.page, 'Gửi').click();
    await h.page.getByRole('log').getByText('Mình vào rồi', { exact: false }).waitFor();
    assert.match(await h.page.getByRole('log').innerText(), /Tester11/);
    await f.page.getByRole('link', { name: 'Rời phòng' }).click();
    await f.page.waitForURL(/\/z4theater$/);
    await f.context.close();
    console.log('PASS logging in from a room returns to it, able to chat');

    // With only guests left nobody steers, but they are not stuck.
    await h.page.getByRole('link', { name: 'Rời phòng' }).click();
    await h.page.waitForURL(/\/z4theater$/);
    await until(() => paused(v.page), 'the room stops when the last account leaves');
    await v.page.getByText('đã rời phòng', { exact: false }).waitFor();
    assert.equal(await button(v.page, 'Đổi phim').count(), 0, 'the seat does not fall to a guest');
    await button(v.page, 'Xem tiếp một mình').click();
    await v.page.locator(`video${PLAYER}`).evaluate(el => el.play());
    await delay(1500);
    assert.equal(await paused(v.page), false, 'the guest can carry on alone');
    const back = await open(12, invite);
    await back.page.getByText('Bạn đang chiếu', { exact: false }).waitFor();
    await button(v.page, 'Theo lại người chiếu').click();
    await v.page.getByText('Đang xem theo Tester12', { exact: false }).waitFor();
    await back.context.close();
    await v.context.close();
    await h.context.close();
    console.log('PASS the seat skips guests and waits for the next account');

    // The catalog narrows by genre, and a device remembers what was saved and watched.
    const l = await open(null);
    await button(l.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await l.page.getByRole('region', { name: 'Phim của bạn' }).count(), 0, 'nothing to show on a first visit');
    await l.page.getByLabel('Thể loại').selectOption('tinh-cam');
    await button(l.page, 'Xem phim Phim Hai').waitFor();
    assert.equal(await button(l.page, 'Xem phim Phim Một').count(), 0, 'a genre narrows the list');
    await l.page.getByLabel('Thể loại').selectOption('');
    await button(l.page, 'Xem phim Phim Một').click();
    await button(l.page, 'Lưu phim').click();
    assert.equal(await button(l.page, 'Đã lưu').getAttribute('aria-pressed'), 'true');
    await button(l.page, 'Xem Tập 02').click();
    await l.page.waitForURL(/\/z4theater\/watch\?/);
    await until(async () => (await time(l.page)) > 1, 'the film plays');
    await l.page.locator(`video${PLAYER}`).evaluate(v => { v.currentTime = 30; });
    await until(async () => (await l.page.evaluate(() => JSON.parse(localStorage.getItem('z4theater_library') || '{}').history?.[0]?.position)) >= 30, 'the place is remembered', 15000);
    await l.page.goto(`${base}/z4theater`);
    await button(l.page, 'Đã lưu (1)').waitFor();
    await l.page.screenshot({ path: `${shots}/theater-library.png` });
    await button(l.page, 'Xem tiếp Phim Một').click();
    await l.page.waitForURL(/episode=tap-02.*t=\d+|t=\d+.*episode=tap-02/);
    await until(async () => (await time(l.page)) >= 29, 'resuming lands on the same moment');
    await l.page.goto(`${base}/z4theater`);
    await button(l.page, 'Đã lưu (1)').click();
    await button(l.page, 'Mở phim đã lưu Phim Một').click();
    await button(l.page, 'Đã lưu').click();
    await button(l.page, 'Lưu phim').waitFor();
    await l.page.goto(`${base}/z4theater`);
    await button(l.page, 'Xoá Phim Một khỏi lịch sử').click();
    await button(l.page, 'Xem phim Phim Một').waitFor();
    assert.equal(await l.page.getByRole('region', { name: 'Phim của bạn' }).count(), 0, 'the shelf empties');
    await l.context.close();
    const m = await open(13);
    await m.page.evaluate(() => localStorage.setItem('z4theater_library', JSON.stringify({ saved: [], history: [{ source: 'phimapi', slug: 'phim-mot', name: 'Phim Một', originalName: '', year: '2026', poster: '', status: '', adult: false, server: 0, episode: 'tap-01', episodeName: 'Tập 01', position: 25, at: 1 }] })));
    await m.page.reload();
    await button(m.page, 'Xem tiếp Phim Một').click();
    await m.page.waitForURL(/\/z4theater\/[\w-]{12}$/);
    await until(async () => (await time(m.page)) >= 24, 'an account resumes in a room at that moment');
    await m.context.close();
    console.log('PASS genre filter, saved films and resuming from history');

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

      // A guest on the same phone: watching alone, and inside the room with the login button.
      const room = new URL(phone.page.url()).pathname;
      const guest = await open(null, '/z4theater/watch?source=phimapi&slug=phim-mot&server=0&episode=tap-01', { viewport, isMobile: true, hasTouch: true });
      await guest.page.getByText('Bạn đang xem một mình').waitFor();
      const alone = await guest.page.locator(`video${PLAYER}`).boundingBox();
      assert.ok(alone.x >= 0 && alone.x + alone.width <= viewport.width + 1 && alone.y + alone.height <= viewport.height, `${name}: a guest's picture is fully on screen`);
      assert.equal(await guest.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: watching has no sideways scroll`);
      await delay(500);
      await guest.page.screenshot({ path: `${shots}/theater-guest-solo-${name}.png` });
      await guest.page.goto(`${base}${room}`);
      const login = button(guest.page, 'Đăng nhập để trò chuyện');
      await login.waitFor();
      const prompt = await login.boundingBox();
      assert.ok(prompt.y + prompt.height <= viewport.height, `${name}: the login button is on screen`);
      await delay(500);
      await guest.page.screenshot({ path: `${shots}/theater-guest-room-${name}.png` });
      await guest.context.close();

      await phone.context.close();
      await delay(2100);
      console.log(`PASS the room fits a phone in ${name}`);
    }

    assert.deepEqual(errors, []);
    console.log('ALL THEATER CHECKS PASSED');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

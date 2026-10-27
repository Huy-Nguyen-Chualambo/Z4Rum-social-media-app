// Run with NODE_PATH pointing at a Playwright installation; see Z4WORLD_PLAN.md.
const { chromium } = require('playwright');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const path = require('node:path');
const { io } = createRequire(path.resolve(__dirname, '../../frontend/package.json'))('socket.io-client');
const base = 'http://localhost:3300';
const api = 'http://127.0.0.1:4400';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const event = (socket, name, trigger) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout: ${name}`)); }, 6000);
  const handler = value => { clearTimeout(timer); resolve(value); };
  socket.once(name, handler); trigger?.();
});

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  const sockets = [];
  try {
    const login = async id => (await fetch(`${api}/fixture/login/${id}`)).json();
    const credentials = await Promise.all([login(0), login(1)]);
    async function open(index, mobile = false) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
      await context.addInitScript(token => sessionStorage.setItem('z4rum_token', token), credentials[index].token);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/z4world`);
      await page.locator(`[data-username="Tester${index}"]`).waitFor();
      return { page, context };
    }
    const a = await open(0), b = await open(1);
    await a.page.locator('[data-username="Tester1"]').waitFor();
    await b.page.locator('[data-username="Tester0"]').waitFor();
    console.log('PASS two browser contexts join same room');

    const send = async (page, text) => {
      await page.getByRole('textbox', { name: 'Tin nhắn gần bạn' }).fill(text);
      await page.getByRole('button', { name: 'Gửi', exact: true }).click();
    };
    await send(a.page, 'Xin chào quảng trường');
    await b.page.getByRole('log').getByText('Xin chào quảng trường', { exact: false }).waitFor();
    console.log('PASS nearby chat');

    async function walk(page, username, key, coordinate, target, sign) {
      await page.locator('h1').click();
      const player = page.locator(`[data-username="${username}"]`);
      const destination = { x: Number(await player.getAttribute('data-x')), y: Number(await player.getAttribute('data-y')) };
      destination[coordinate] = target;
      const started = Date.now();
      for (;;) {
        const current = { x: Number(await player.getAttribute('data-x')), y: Number(await player.getAttribute('data-y')) };
        const dx = destination.x-current.x, dy = destination.y-current.y;
        if (Math.hypot(dx,dy) < 15) break;
        if (Date.now()-started > 14000) throw new Error(`Could not walk ${username} to ${JSON.stringify(destination)}`);
        const sx = dx-dy, sy = (dx+dy)*.5;
        const pressed = [];
        if (Math.abs(sx) > Math.abs(sy)*.45) pressed.push(sx > 0 ? 'ArrowRight' : 'ArrowLeft');
        if (Math.abs(sy) > Math.abs(sx)*.45) pressed.push(sy > 0 ? 'ArrowDown' : 'ArrowUp');
        for (const k of pressed) await page.keyboard.down(k);
        await delay(Math.hypot(dx,dy) < 45 ? 70 : 150);
        for (const k of pressed) await page.keyboard.up(k);
        await delay(75);
      }
      await delay(100);
    }
    await walk(a.page, 'Tester0', 'ArrowLeft', 'x', 180, -1);
    await a.page.getByRole('button', { name: 'Ngồi bàn cà phê' }).click();
    await a.page.getByRole('button', { name: 'Đứng dậy' }).waitFor();
    assert.equal(await a.page.locator('[data-username="Tester0"] [data-animation]').getAttribute('data-animation'),'sit');
    const seatedX=await a.page.locator('[data-username="Tester0"]').getAttribute('data-x');
    await a.page.locator('h1').click();await a.page.keyboard.down('ArrowRight');await delay(200);await a.page.keyboard.up('ArrowRight');
    assert.equal(await a.page.locator('[data-username="Tester0"]').getAttribute('data-x'),seatedX,'seated players cannot walk');
    await a.page.getByLabel('Kênh trò chuyện').selectOption('table');
    await send(a.page, 'Tin riêng chỉ tại bàn');
    await delay(350);
    assert.equal(await b.page.getByRole('log').getByText('Tin riêng chỉ tại bàn', { exact: false }).count(), 0);
    await walk(b.page, 'Tester1', 'ArrowLeft', 'x', 180, -1);
    await b.page.getByRole('button', { name: 'Ngồi bàn cà phê' }).click();
    await delay(1600);
    await send(a.page, 'Hai người cùng bàn');
    await b.page.getByRole('log').getByText('Hai người cùng bàn', { exact: false }).waitFor();
    console.log('PASS seating and private table isolation');
    for (const c of [a,b]) await c.page.getByRole('button', { name: 'Đứng dậy' }).click();

    async function toLobby(page, username) {
      await walk(page, username, 'ArrowUp', 'y', 250, -1);
      await walk(page, username, 'ArrowRight', 'x', 750, 1);
    }
    await Promise.all([toLobby(a.page, 'Tester0'), toLobby(b.page, 'Tester1')]);
    await delay(1600);
    await send(a.page, 'Xa quá không nghe');
    // Both are close again; verify keyboard movement replicated.
    await b.page.getByRole('log').getByText('Xa quá không nghe', { exact: false }).waitFor();
    for(const c of [a,b]) await c.page.getByRole('button',{name:'Vào Game Club',exact:true}).last().click();
    await a.page.getByRole('button', { name: 'Tham gia quiz', exact: true }).click();
    await a.page.getByRole('button', { name: 'Rời hàng đợi quiz' }).click();
    await a.page.getByRole('button', { name: 'Tham gia quiz', exact: true }).click();
    await b.page.getByRole('button', { name: 'Tham gia quiz', exact: true }).click();
    const answers = ['60', 'Sao Thủy', '35', 'Hà Nội', '3'];
    for (let i=0; i<answers.length; i++) {
      const button = a.page.getByRole('button', { name: answers[i], exact: true });
      await button.waitFor({ timeout: 15000 });
      await button.click();
      await a.page.getByText('Đã nhận đáp án. Chờ câu tiếp theo!').waitFor();
      await b.page.getByRole('button', { name: answers[i], exact: true }).click();
      console.log(`PASS quiz answer ${i+1}`);
    }
    await a.page.getByText('1. Tester0 — 500 điểm', { exact: true }).waitFor({ timeout: 15000 });
    await b.page.getByText('2. Tester1 — 500 điểm', { exact: true }).waitFor();
    console.log('PASS full quiz, authoritative scores and queue cancellation');

    await a.page.getByRole('button', { name: 'Chơi sàn biến mất', exact: true }).click();
    await b.page.getByRole('button', { name: 'Chơi sàn biến mất', exact: true }).click();
    await a.page.getByText('Vòng 1/8', { exact: false }).waitFor();
    await a.page.getByRole('button', { name: 'Ô 2', exact: true }).click();
    await a.page.getByText('Kết quả:', { exact: false }).waitFor({ timeout: 10000 });
    console.log('PASS disappearing floor movement and elimination');
    await a.page.screenshot({ path: '/tmp/z4world-desktop.png', fullPage: true });

    // Rejoin, reload and mobile pointer-release behavior.
    await b.context.close();
    await a.page.waitForFunction(() => document.querySelectorAll('[data-player]').length === 1);
    const mobile = await open(1, true);
    await mobile.page.getByRole('button', { name: 'Xem toàn cảnh' }).click();
    const before = Number(await mobile.page.locator('[data-username="Tester1"]').getAttribute('data-x'));
    const arrow = mobile.page.getByRole('button', { name: 'Di chuyển →', exact: true });
    await arrow.scrollIntoViewIfNeeded();
    const box = await arrow.boundingBox();
    await mobile.page.mouse.move(box.x+box.width/2, box.y+box.height/2);
    await mobile.page.mouse.down();
    await delay(350);
    await mobile.page.mouse.up();
    await delay(200);
    const after = Number(await mobile.page.locator('[data-username="Tester1"]').getAttribute('data-x'));
    assert.ok(after > before);
    await delay(250);
    assert.equal(Number(await mobile.page.locator('[data-username="Tester1"]').getAttribute('data-x')), after);
    await mobile.page.reload();
    await mobile.page.locator('[data-username="Tester1"]').waitFor();
    await mobile.page.screenshot({ path: '/tmp/z4world-mobile.png', fullPage: true });
    assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    console.log('PASS disconnect/rejoin, reload, mobile controls and layout');
    await a.context.close(); await mobile.context.close();

    // Room cap and authentication over real network sockets.
    const invalid = io(api, { auth: { token: 'invalid' }, reconnection: false }); sockets.push(invalid);
    await event(invalid, 'connect_error');
    const snapshots = [];
    for (let i=0; i<21; i++) {
      const auth = await login(i);
      const socket = io(api, { auth: { token: auth.token }, reconnection: false }); sockets.push(socket);
      await event(socket, 'connect');
      snapshots.push(await event(socket, 'world:snapshot', () => socket.emit('world:join')));
    }
    assert.equal(Object.keys(snapshots[19].players).length, 20);
    assert.notEqual(snapshots[20].roomId, snapshots[19].roomId);
    assert.equal(Object.keys(snapshots[20].players).length, 1);
    const moving=new Set();const delivery=value=>moving.add(value.id);sockets[1].on('world:moved',delivery);
    for(let tick=0;tick<5;tick++){for(const client of sockets.slice(1,21))client.emit('world:move',{dx:1,dy:0});await delay(65);}
    await delay(150);sockets[1].off('world:moved',delivery);assert.equal(moving.size,20);
    console.log('PASS movement delivery from all 20 simultaneous room members');
    const invitedAuth = await login(21);
    const invited = io(api, { auth: { token: invitedAuth.token }, reconnection: false }); sockets.push(invited);
    await event(invited, 'connect');
    const full = await event(invited, 'world:error', () => invited.emit('world:join', { roomId: snapshots[0].roomId }));
    assert.match(full, /đã đầy/);
    let receivedFar = false;
    sockets[2].on('world:chat', () => { receivedFar = true; });
    for (let i=0; i<30; i++) { sockets[1].emit('world:move', { dx: 1, dy: 0 }); await delay(60); }
    sockets[1].emit('world:chat', 'Out of proximity');
    await delay(300);
    assert.equal(receivedFar, false);
    const duplicate = io(api, { auth: { token: (await login(0)).token }, reconnection: false }); sockets.push(duplicate);
    await event(duplicate, 'connect');
    const kicked = event(sockets[1], 'world:error');
    const replaced = await event(duplicate, 'world:snapshot', () => duplicate.emit('world:join', { roomId: snapshots[0].roomId }));
    await kicked;
    assert.equal(Object.values(replaced.players).filter(p => p.id === 'world-test-0').length, 1);
    assert.deepEqual(errors, []);
    console.log('PASS rejected invalid JWT, 20-player cap, invitations, proximity isolation and duplicate-account takeover');
    console.log('ALL WORLD BROWSER CHECKS PASSED');
  } finally { sockets.forEach(s => s.disconnect()); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

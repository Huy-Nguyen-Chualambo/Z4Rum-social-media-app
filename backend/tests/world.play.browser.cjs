const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const api = "http://127.0.0.1:4400";
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const errors = [];
  const contexts = [];
  try {
    const auth = await Promise.all(
      [22, 23].map(async (id) =>
        (await fetch(`${api}/fixture/login/${id}`)).json(),
      ),
    );
    const request = (index, method = "GET", body) =>
      fetch(`${api}/world/profile`, {
        method,
        headers: {
          Authorization: `Bearer ${auth[index].token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await fetch(`${api}/world/profile`)).status, 401);
    assert.equal(
      (
        await request(0, "PUT", {
          character: "peach",
          hair: "original",
          outfit: "mint",
          userId: "world-test-23",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(0, "PUT", {
          character: "evil",
          hair: "original",
          outfit: "mint",
        })
      ).status,
      400,
    );
    const original = {
      character: "peach",
      hair: "original",
      outfit: "original",
    };
    assert.equal((await request(0, "PUT", original)).status, 200);
    const otherBefore = await (await request(1)).json();
    const pages = [];
    for (let i = 0; i < 2; i++) {
      const context = await browser.newContext({
        viewport: i
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
        ...(i ? { isMobile: true, hasTouch: true } : {}),
      });
      contexts.push(context);
      await context.addInitScript(
        (token) => sessionStorage.setItem("z4rum_token", token),
        auth[i].token,
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      pages.push(page);
      await page.goto("http://localhost:3300/z4world");
      await page.locator(`[data-username="Tester${22 + i}"]`).waitFor();
    }
    const [a, b] = pages,
      actor = a.locator('[data-username="Tester22"]'),
      peer = b.locator('[data-username="Tester22"]');
    await peer.waitFor();
    await a.getByRole("button", { name: "Tủ đồ", exact: true }).click();
    await a.getByRole("dialog", { name: "Tủ đồ của bạn" }).waitFor();
    await a.keyboard.press("Shift+Tab");
    assert.equal(
      await a
        .getByRole("button", { name: "Lưu ngoại hình", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
      "modal traps reverse Tab at last control",
    );
    await a.keyboard.press("Tab");
    assert.equal(
      await a
        .getByRole("button", { name: "Đóng cửa sổ", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
      "modal wraps Tab to close control",
    );
    const before = await actor.getAttribute("data-x");
    await a.keyboard.down("ArrowRight");
    await delay(350);
    await a.keyboard.up("ArrowRight");
    assert.equal(
      await actor.getAttribute("data-x"),
      before,
      "dialog pauses movement",
    );
    await a.getByRole("button", { name: "Oải hương", exact: true }).click();
    await a.getByRole("button", { name: "Nâu đồng", exact: true }).click();
    await a.getByRole("button", { name: "Bạc hà", exact: true }).click();
    await a.screenshot({
      path: "/tmp/z4world-play-wardrobe.png",
      fullPage: true,
    });
    await a.route("**/world/profile", (route) => route.abort());
    await a
      .getByRole("button", { name: "Lưu ngoại hình", exact: true })
      .click();
    await a.getByRole("dialog").getByRole("alert").waitFor();
    assert.equal(
      await a
        .getByRole("button", { name: "Bạc hà", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await a.getByRole("dialog").count(),
      1,
      "failed saves preserve draft and stay open",
    );
    await a.unroute("**/world/profile");
    await a
      .getByRole("button", { name: "Lưu ngoại hình", exact: true })
      .click();
    await a.getByText("Đã lưu ngoại hình theo tài khoản.").waitFor();
    await b.waitForFunction(
      () =>
        document
          .querySelector('[data-username="Tester22"] [data-character]')
          ?.getAttribute("data-character") === "lavender",
    );
    assert.equal(
      await peer.locator("[data-outfit]").getAttribute("data-outfit"),
      "mint",
    );
    assert.deepEqual(await (await request(0)).json(), {
      character: "lavender",
      hair: "copper",
      outfit: "mint",
    });
    assert.deepEqual(
      await (await request(1)).json(),
      otherBefore,
      "cannot modify another account",
    );
    await a.reload();
    await actor.waitFor();
    assert.equal(
      await actor.locator("[data-character]").getAttribute("data-character"),
      "lavender",
    );
    console.log(
      "PASS authenticated strict API, account isolation, wardrobe preview, save, peer propagation and reload",
    );
    // True gait frames, followed by release to idle.
    await a.locator("h1").click();
    await a.keyboard.down("ArrowDown");
    await a.waitForFunction(
      () =>
        document
          .querySelector('[data-username="Tester22"] [data-animation]')
          ?.getAttribute("data-animation") === "walk",
    );
    const frame = await actor
      .locator("[data-frame]")
      .getAttribute("data-frame");
    await delay(170);
    assert.notEqual(
      await actor.locator("[data-frame]").getAttribute("data-frame"),
      frame,
    );
    await a.keyboard.up("ArrowDown");
    await delay(300);
    assert.equal(
      await actor.locator("[data-animation]").getAttribute("data-animation"),
      "idle",
    );
    await a.getByRole("button", { name: "Biểu cảm 👋" }).click();
    await a.waitForFunction(
      () =>
        document
          .querySelector('[data-username="Tester22"] [data-animation]')
          ?.getAttribute("data-animation") === "wave",
    );
    console.log("PASS actual gait-frame animation, idle and wave pose");
    // Click path routes around the fountain; transform uses the actual rendered SVG matrix.
    async function clickGround(page, x, y) {
      const p = await page.locator('[data-testid="world-scene"]').evaluate(
        (svg, { x, y }) => {
          const p = new DOMPoint(
            760 + 0.8 * (x - y),
            220 + 0.4 * (x + y),
          ).matrixTransform(svg.getScreenCTM());
          return { x: p.x, y: p.y };
        },
        { x, y },
      );
      await page.mouse.click(p.x, p.y);
    }
    async function arrive(page, name, x, y) {
      await page.waitForFunction(
        ({ name, x, y }) => {
          const p = document.querySelector(`[data-username="${name}"]`);
          return (
            p &&
            Math.hypot(Number(p.dataset.x) - x, Number(p.dataset.y) - y) < 18
          );
        },
        { name, x, y },
        { timeout: 15000 },
      );
    }
    await clickGround(a, 350, 350);
    await arrive(a, "Tester22", 350, 350);
    await clickGround(a, 650, 350);
    await arrive(a, "Tester22", 650, 350);
    console.log("PASS real ground clicks and obstacle-aware fountain route");
    await a
      .getByRole("button", { name: "Đi tới Game Club", exact: true })
      .click();
    await a.keyboard.down("ArrowLeft");
    await delay(250);
    await a.keyboard.up("ArrowLeft");
    await delay(180);
    const overridden = await actor.getAttribute("data-x");
    await delay(200);
    assert.equal(
      await actor.getAttribute("data-x"),
      overridden,
      "keyboard cancels route even when its opener button has focus",
    );
    await a
      .getByRole("button", { name: "Đi tới Game Club", exact: true })
      .click();
    await arrive(a, "Tester22", 805, 250);
    await a
      .getByRole("button", { name: "Vào Game Club", exact: true })
      .first()
      .click();
    await a.getByRole("dialog", { name: "Game Club", exact: true }).waitFor();
    await a.keyboard.press("Escape");
    assert.equal(await a.getByRole("dialog").count(), 0);
    assert.equal(
      await a
        .getByRole("button", { name: "Vào Game Club", exact: true })
        .first()
        .evaluate((el) => el === document.activeElement),
      true,
      "focus returns to opener",
    );
    await a.locator("h1").click();
    await a.keyboard.press("e");
    await a.getByRole("dialog", { name: "Game Club", exact: true }).waitFor();
    await a.keyboard.press("Escape");
    assert.equal(
      await a
        .getByRole("button", { name: "Tham gia quiz", exact: true })
        .count(),
      0,
      "minigames not permanently displayed",
    );
    console.log(
      "PASS contextual Game Club, native modal, Escape and collapsed panels",
    );
    const stick = b.getByRole("group", { name: "Joystick di chuyển" });
    await stick.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await delay(250);
    const box = await stick.boundingBox();
    const mobileActor = b.locator('[data-username="Tester23"]');
    const initial = Number(await mobileActor.getAttribute("data-x"));
    await b.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await b.mouse.down();
    await b.mouse.move(box.x + box.width - 8, box.y + box.height / 2);
    await delay(400);
    await b.mouse.up();
    await delay(250);
    const end = Number(await mobileActor.getAttribute("data-x"));
    assert.ok(end > initial);
    await delay(250);
    assert.equal(Number(await mobileActor.getAttribute("data-x")), end);
    await b.mouse.move(box.x + 56, box.y + 56);
    await b.mouse.down();
    await b.mouse.move(box.x + 100, box.y + 56);
    await delay(180);
    await b.evaluate(() => window.dispatchEvent(new Event("blur")));
    await b.mouse.up();
    await delay(180);
    const stopped = await mobileActor.getAttribute("data-x");
    await delay(200);
    assert.equal(
      await mobileActor.getAttribute("data-x"),
      stopped,
      "blur cancels joystick movement",
    );
    await b.emulateMedia({ reducedMotion: "reduce" });
    await b.locator("h1").click();
    await b.keyboard.down("ArrowDown");
    await delay(200);
    const staticFrame = await mobileActor
      .locator("[data-frame]")
      .getAttribute("data-frame");
    await delay(220);
    assert.equal(
      await mobileActor.locator("[data-frame]").getAttribute("data-frame"),
      staticFrame,
      "reduced motion freezes gait frames",
    );
    await b.keyboard.up("ArrowDown");
    await b.getByRole("button", { name: "Tủ đồ", exact: true }).click();
    await b.keyboard.press("Tab");
    await b.keyboard.press("Escape");
    assert.equal(
      await b.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await a
      .locator("figure")
      .screenshot({ path: "/tmp/z4world-play-desktop.png" });
    await b
      .locator("figure")
      .screenshot({ path: "/tmp/z4world-play-mobile.png" });
    await b.getByRole("button", { name: "Tủ đồ", exact: true }).click();
    await b
      .getByRole("dialog")
      .screenshot({ path: "/tmp/z4world-play-mobile-wardrobe.png" });
    await b.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    console.log(
      "PASS mobile joystick/release, dialog focus, layout and zero client exceptions",
    );
    console.log("ALL PLAY POLISH CHECKS PASSED");
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

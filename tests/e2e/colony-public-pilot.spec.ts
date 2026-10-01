import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from 'node:crypto';
import { resolve } from "node:path";
const endpoint = process.env.PILOT_PUBLIC_URL;
test.skip(
  !endpoint,
  "Live Internet verification runs separately against the provisioned Vercel project.",
);
test("three public browsers host/join, gather, save and reconnect through the player UI", async ({
  browser,
}) => {
  test.setTimeout(420000);
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () =>
      browser.newContext({
        viewport: { width: 1280, height: 720 },
        permissions: ["clipboard-read", "clipboard-write"],
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    host = pages[0]!,
    errors: string[] = [];
  if (process.env.PILOT_ACCESS_COOKIE_FILE) {
    const cookies = readFileSync(process.env.PILOT_ACCESS_COOKIE_FILE, 'utf8').split(/\r?\n/)
      .filter(line => line && (!line.startsWith('#') || line.startsWith('#HttpOnly_')))
      .map(line => {
        const [domain, , path, secure, expires, name, value] = line.replace(/^#HttpOnly_/, '').split('\t');
        return { domain: domain!, path: path!, secure: secure === 'TRUE', expires: Number(expires), name: name!, value: value!, httpOnly: line.startsWith('#HttpOnly_') };
      });
    for (const context of contexts) await context.addCookies(cookies);
  }
  for (const page of pages) {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on('websocket', ws => ws.on('framereceived', frame => {
      try {
        const message = JSON.parse(frame.payload.toString());
        if (message.messageType === 'SESSION_REJECTED') console.log('Admission reason:', message.payload.reason);
      } catch { /* Frames are checked by the game protocol. */ }
    }));
  }
  const site = new URL(endpoint!).origin;
  let owner: { id: string; ownerToken: string } | null = null;
  const directory = resolve("test-results/phase2-priority/public-coop");
  mkdirSync(directory, { recursive: true });
  const ready = async (page: Page) =>
    expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-runtime-status",
      "ready",
      { timeout: 25000 },
    );
  const tag = randomBytes(5).toString('hex'), roomName = 'Colony ' + tag;
  const register = async (page: Page, n: number) => {
    await page.goto(site + '/?proz0Lobby=login');
    await page.getByRole('button', { name: 'Tạo tài khoản mới', exact: true }).click();
    await page.getByLabel('Tên đăng nhập', { exact: true }).fill('verify_' + tag + '_' + n);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('verification account password');
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
    await expect(page.locator('.lobby-recovery code')).toHaveText(/^[a-f0-9]{48}$/, { timeout: 20000 });
    await page.getByRole('button', { name: 'Tôi đã lưu mã · Tiếp tục', exact: true }).click();
    await page.getByRole('button', { name: 'Skin', exact: true }).click();
    await page.getByRole('button', { name: ['Azure', 'Moss', 'Pioneer'][n]!, exact: true }).click();
    await expect(page.getByRole('button', { name: ['Azure', 'Moss', 'Pioneer'][n]!, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Multiplayer', exact: true }).click();
  };
  try {
    for (let i = 0; i < pages.length; i++) await register(pages[i]!, i);
    await host.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await host.getByLabel('Tên phòng', { exact: true }).fill(roomName);
    await host.getByLabel('Mật mã phòng', { exact: true }).fill('room-secret');
    await host.getByRole('button', { name: 'Tạo phòng và vào game', exact: true }).click();
    await host.getByRole('button', { name: 'Bỏ qua', exact: true }).click({ timeout: 20000 });
    await ready(host);
    owner = await host.evaluate(() => {
      const entry = Object.keys(localStorage).find(
        (key) =>
          key.startsWith("proz0:coop:") &&
          !key.endsWith(":resume") &&
          !key.endsWith(":client"),
      );
      return JSON.parse(localStorage.getItem(entry!)!);
    });
    const id = await host
      .locator("[data-proz0-autoboot]")
      .getAttribute("data-coop-player-id");
    await expect(
      host.getByRole("button", { name: "Enable sound", exact: true }),
    ).toBeHidden();
    await host.getByRole("button", { name: "Settings", exact: true }).click();
    await host
      .getByRole("button", { name: "Copy invitation", exact: true })
      .click();
    const invitation = await host.evaluate(() =>
      navigator.clipboard.readText(),
    );
    await host.getByRole("button", { name: "Close", exact: true }).click();
    for (const guest of pages.slice(1)) {
      expect(new URL(invitation).searchParams.get('room')).toBe(roomName);
      expect(new URL(invitation).hash).toBe('');
      await guest.goto(invitation);
      await guest.getByRole('button', { name: 'Vào bằng tên phòng', exact: true }).click();
      await guest.getByLabel('Tên phòng', { exact: true }).fill(roomName);
      await guest.getByLabel('Mật mã phòng', { exact: true }).fill('room-secret');
      await guest.getByRole('button', { name: 'Vào game', exact: true }).click();
      await guest.getByRole('button', { name: 'Bỏ qua', exact: true }).click({ timeout: 20000 });
      await ready(guest);
    }
    await expect(host.locator("canvas")).toHaveAttribute(
      "data-teammate-count",
      "2",
      { timeout: 15000 },
    );
    await expect(host.locator('[data-world-role="player"][data-skin="moss"]')).toBeVisible({timeout:15000});
    const guest = pages[1]!,
      guestId = await guest
        .locator("[data-proz0-autoboot]")
        .getAttribute("data-coop-player-id");
    await guest.reload();
    await ready(guest);
    await expect(guest.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-coop-player-id",
      guestId!,
    );
    await host.bringToFront();
    // Reach the canonical nearby fiber source through normal movement.
    let held: string[] = [];
    try {
      for (let n = 0; n < 1200; n++) {
        const p = await host.locator("canvas").evaluate((e) => ({
          x: Number(e.dataset.playerX),
          y: Number(e.dataset.playerY),
        }));
        const dx = 18 - p.x,
          dy = 10 - p.y;
        if (Math.hypot(dx, dy) < 0.45) break;
        const next =
          Math.abs(dx) >= Math.abs(dy)
            ? dx > 0
              ? ["s", "d"]
              : ["w", "a"]
            : dy > 0
              ? ["s", "a"]
              : ["w", "d"];
        if (next.join() !== held.join()) {
          for (const key of held) await host.keyboard.up(key);
          for (const key of next) await host.keyboard.down(key);
          held = next;
        }
        await host.waitForTimeout(100);
      }
    } finally {
      for (const key of held) await host.keyboard.up(key);
    }
    const resource = host.locator(
      '[data-world-role="resource"][data-world-x="18"][data-world-y="10"]',
    );
    await expect(resource).toBeVisible();
    await resource.click();
    await expect(host.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-coop-action",
      "committed",
      { timeout: 10000 },
    );
    await host.keyboard.press("i");
    await expect(host.locator(".coop-panel")).toContainText("Plant Fiber");
    await host.getByRole("button", { name: "Close", exact: true }).click();
    await host.getByRole("button", { name: "Settings", exact: true }).click();
    await host
      .getByRole("button", { name: "Save shared world", exact: true })
      .click();
    await expect(host.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-coop-checkpoint",
      /^\d+$/,
      { timeout: 12000 },
    );
    await host.getByRole("button", { name: "Close", exact: true }).click();
    await host.reload();
    await ready(host);
    await expect(host.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-coop-player-id",
      id!,
    );
    const soakSeconds = Number(process.env.PILOT_SOAK_SECONDS ?? '0');
    if (soakSeconds > 0) {
      const tick = Number(await host.locator('canvas').getAttribute('data-authority-tick'));
      await host.waitForTimeout(soakSeconds * 1000);
      for (const p of pages) await ready(p);
      await expect(host.locator('canvas')).toHaveAttribute('data-teammate-count', '2', {timeout:20000});
      expect(Number(await host.locator('canvas').getAttribute('data-authority-tick'))).toBeGreaterThan(tick);
    }
    const frames = await host.evaluate(
      () =>
        new Promise<{ fps: number; p95: number }>((done) => {
          const values: number[] = [];
          let before = performance.now();
          const frame = (now: number) => {
            values.push(now - before);
            before = now;
            if (values.length < 180) requestAnimationFrame(frame);
            else {
              const sorted = [...values].sort((a, b) => a - b);
              done({
                fps: 1000 / (values.reduce((a, b) => a + b) / values.length),
                p95: sorted[Math.floor(sorted.length * 0.95)]!,
              });
            }
          };
          requestAnimationFrame(frame);
        }),
    );
    expect(frames.fps).toBeGreaterThan(45);
    expect(frames.p95).toBeLessThan(33.4);
    for (const [width, height] of [
      [640, 360],
      [1280, 720],
      [1920, 1080],
    ] as const) {
      await host.setViewportSize({ width, height });
      await host.screenshot({
        path: resolve(directory, "co-op-" + width + ".png"),
      });
    }
    expect(errors).toEqual([]);
    writeFileSync(
      resolve(directory, "journey.json"),
      JSON.stringify(
        {
          sourceHeadSha: process.env.P0_TEST_HEAD_SHA ?? "working-tree",
          players: 3,
          namedRoom: true, usernamePassword: true, skins: true, soakSeconds,
          hostJoin: "player UI",
          gather: "normal movement and real command",
          reconnect: "original colonist",
          save: "owner checkpoint",
          frames,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    const ownerCookie = (await contexts[0]!.cookies(site)).map(c => c.name + '=' + c.value).join('; ');
    for (const context of contexts) await context.close();
    if (owner) {
      let removed = false;
      for (let attempt = 0; attempt < 12 && !removed; attempt++) {
        await new Promise((r) => setTimeout(r, 1500));
        const response = await fetch(endpoint + "/lobby/rooms/" + owner.id, {
          method: "DELETE",
          headers: { Cookie: ownerCookie },
        });
        removed = response.ok;
        if (!removed) expect(response.status).toBe(409);
      }
      expect(removed).toBe(true);
    }
  }
});

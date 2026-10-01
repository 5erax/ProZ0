import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const base = process.env.COOP_SOCIAL_URL;
test.skip(!base, "Requires an isolated pilot with real Redis, run separately.");
test.use({
  actionTimeout: 15000,
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
test("three players share named chat, explored map and opt-in voice without losing gameplay input", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const soakSeconds = Number(process.env.COOP_SOAK_SECONDS ?? 0);
  if (soakSeconds) test.setTimeout((soakSeconds + 180) * 1000);
  const tag = randomBytes(5).toString("hex"),
    errors: string[] = [],
    dir = resolve(process.env.COOP_EVIDENCE_DIR ?? "test-results/coop-social");
  mkdirSync(dir, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () =>
      browser.newContext({
        viewport: { width: 1280, height: 720 },
        permissions: ["microphone"],
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  if(process.env.COOP_ACCESS_COOKIE_FILE){const cookies=readFileSync(process.env.COOP_ACCESS_COOKIE_FILE,'utf8').split(/\r?\n/).filter(line=>line&&(!line.startsWith('#')||line.startsWith('#HttpOnly_'))).map(line=>{const [domain,,path,secure,expires,name,value]=line.replace(/^#HttpOnly_/,'').split('\t');return {domain:domain!,path:path!,secure:secure==='TRUE',expires:Number(expires),name:name!,value:value!,httpOnly:line.startsWith('#HttpOnly_')};});for(const c of contexts)await c.addCookies(cookies);}
  const admissions=[0,0,0],closes=[0,0,0];
  for(const [i,page] of pages.entries())page.on('websocket',ws=>{ws.on('close',()=>closes[i]!++);ws.on('framereceived',frame=>{try{if(JSON.parse(frame.payload.toString()).messageType==='SESSION_ACCEPTED')admissions[i]!++;}catch{/* Game validates frames. */}});});
  let owned: { id: string; ownerToken: string } | null = null,
    ownerCookie = "";
  try {
    for (let n = 0; n < 3; n++) {
      const page = pages[n]!;
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        const original = navigator.mediaDevices.getUserMedia.bind(
          navigator.mediaDevices,
        );
        const state = { calls: 0, tracks: [] as MediaStreamTrack[] };
        Object.assign(window, { __micState: state });
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          state.calls++;
          const stream = await original(constraints);
          state.tracks.push(...stream.getTracks());
          return stream;
        };
      });
      await page.goto(base + "/?proz0Lobby=login");
      await page
        .getByRole("button", { name: "Tạo tài khoản mới", exact: true })
        .click();
      await page
        .getByLabel("Tên đăng nhập", { exact: true })
        .fill("social_" + tag + "_" + n);
      await page
        .getByLabel("Mật khẩu", { exact: true })
        .fill("test colony password");
      await page
        .getByRole("button", { name: "Tạo tài khoản", exact: true })
        .click();
      await expect(page.locator(".lobby-recovery code")).toHaveText(
        /^[a-f0-9]{48}$/,
        { timeout: 20000 },
      );
      await page
        .getByRole("button", { name: "Tôi đã lưu mã · Tiếp tục", exact: true })
        .click();
      await page
        .getByRole("button", { name: "social_" + tag + "_" + n, exact: true })
        .click();
      await page
        .getByLabel("Tên hiển thị trong phòng", { exact: true })
        .fill("Bạn " + (n + 1));
      await page
        .getByRole("button", { name: "Lưu tên hiển thị", exact: true })
        .click();
      await expect(
        page.getByText("Đã lưu tên hiển thị", { exact: false }),
      ).toBeVisible({ timeout: 20000 });
      await page
        .getByRole("button", { name: "Multiplayer", exact: true })
        .click();
    }
    const host = pages[0]!;
    await host.getByRole("button", { name: "Tạo phòng", exact: true }).click();
    await host.getByLabel("Tên phòng", { exact: true }).fill("Social " + tag);
    await host.getByLabel("Mật mã phòng", { exact: true }).fill("room-secret");
    await host
      .getByRole("button", { name: "Tạo phòng và vào game", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Bỏ qua", exact: true })
      .click({ timeout: 20000 });
    await expect(
      host.locator("[data-runtime-mode=colony-coop]"),
    ).toHaveAttribute("data-runtime-status", "ready", { timeout: 25000 });
    owned = await host.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) =>
          k.startsWith("proz0:coop:") &&
          !k.endsWith(":resume") &&
          !k.endsWith(":client"),
      );
      return JSON.parse(localStorage.getItem(key!)!);
    });
    ownerCookie = (await contexts[0]!.cookies())
      .map((c) => c.name + "=" + c.value)
      .join("; ");
    // Private receipt permits retrying cleanup without exposing credentials in logs.
    writeFileSync(dir + "/cleanup.private.json", JSON.stringify({ base, owned, ownerCookie }));
    for (const guest of pages.slice(1)) {
      await guest
        .getByRole("button", { name: "Vào bằng tên phòng", exact: true })
        .click();
      await guest
        .getByLabel("Tên phòng", { exact: true })
        .fill("Social " + tag);
      await guest
        .getByLabel("Mật mã phòng", { exact: true })
        .fill("room-secret");
      await guest
        .getByRole("button", { name: "Vào game", exact: true })
        .click();
      await guest
        .getByRole("button", { name: "Bỏ qua", exact: true })
        .click({ timeout: 20000 });
      await expect(
        guest.locator("[data-runtime-mode=colony-coop]"),
      ).toHaveAttribute("data-runtime-status", "ready", { timeout: 25000 });
    }
    for (const page of pages) {
      await expect(page.locator(".coop-hud meter")).toHaveCount(5);
      await expect(
        page.locator(".coop-name").filter({ hasText: "Bạn 3" }),
      ).toBeVisible({ timeout: 15000 });
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __micState: { calls: number } }).__micState
              .calls,
        ),
      ).toBe(0);
      await page.keyboard.press("m");
      await expect(
        page
          .getByRole("img", { name: "Explored map" })
          .or(page.locator('canvas[aria-label="Explored map"]')),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
    await host.screenshot({ path: dir + "/hud.png" });
    const latency: number[] = [], rtt: number[] = [], movementSamples: unknown[] = [];
    for (let n = 0; n < 10; n++) {
      rtt.push(Number(await host.locator('[data-runtime-mode=colony-coop]').getAttribute('data-coop-rtt-ms')));
      // Wait for the prior key-up to reach authority before measuring a new
      // start. Otherwise a delayed prior movement can look like a 5-ms reply.
      await expect(host.locator(".coop-stage canvas")).toHaveAttribute("data-player-locomotion", "IDLE");
      const sample = await host.evaluate(
          async (key) => {
            const canvas =
                document.querySelector<HTMLCanvasElement>(
                  ".coop-stage canvas",
                )!,
              x = Number(canvas.dataset.playerX),
              y = Number(canvas.dataset.playerY),
              start = performance.now();
            document.dispatchEvent(
              new KeyboardEvent("keydown", { code: key, bubbles: true }),
            );
            await new Promise<void>((resolve) => {
              const frame = () => {
                if (
                  Math.hypot(
                    Number(canvas.dataset.playerX) - x,
                    Number(canvas.dataset.playerY) - y,
                  ) > 0.02 ||
                  performance.now() - start > 1200
                )
                  resolve();
                else requestAnimationFrame(frame);
              };
              requestAnimationFrame(frame);
            });
            document.dispatchEvent(
              new KeyboardEvent("keyup", { code: key, bubbles: true }),
            );
            return { ms: performance.now() - start, key, x, y,
              endX: Number(canvas.dataset.playerX), endY: Number(canvas.dataset.playerY),
              locomotion: canvas.dataset.playerLocomotion,
              status: document.querySelector<HTMLElement>('[data-runtime-mode=colony-coop]')?.dataset.runtimeStatus };
          },
          n % 2 ? "KeyA" : "KeyD",
        );
      latency.push(sample.ms);
      movementSamples.push(sample);
      await host.waitForTimeout(200);
    }
    const frames = await host.evaluate(async () => {
      let prior = performance.now();
      const start = prior;
      const dt: number[] = [];
      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          dt.push(now - prior);
          prior = now;
          if (now - start < 5000) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      dt.sort((a, b) => a - b);
      return {
        fps: (dt.length * 1000) / (prior - start),
        p95Ms: dt[Math.floor(dt.length * 0.95)],
      };
    });
    writeFileSync(
      dir + "/latency-frames.json",
      JSON.stringify({ players: 3, latencyMs: latency, rttMs: rtt, movementSamples, frames }, null, 2),
    );
    expect(Math.max(...latency)).toBeLessThan(350);
    expect(frames.fps).toBeGreaterThanOrEqual(50);
    expect(frames.p95Ms).toBeLessThanOrEqual(34);
    for (const page of pages)
      await page
        .getByRole("button", { name: "Chat [Enter]", exact: true })
        .click();
    const before = await host
      .locator(".coop-stage canvas")
      .getAttribute("data-player-x");
    await host
      .getByLabel("Tin nhắn phòng")
      .fill("wasd <img src=x onerror=alert(1)> Xin chào");
    await host.getByLabel("Tin nhắn phòng").press("Enter");
    for (const page of pages)
      await expect(page.getByRole("log")).toContainText(
        "Bạn 1: wasd <img src=x onerror=alert(1)> Xin chào",
      );
    await expect(host.getByRole("log").locator("img")).toHaveCount(0);
    await expect(host.locator(".coop-stage canvas")).toHaveAttribute(
      "data-player-x",
      before!,
    );
    for (const page of pages)
      await page
        .getByRole("button", { name: "Bật voice", exact: true })
        .click();
    for (const page of pages)
      await expect(
        page.locator("[data-runtime-mode=colony-coop]"),
      ).toHaveAttribute("data-voice-peers", "2", { timeout: 30000 });
    await host.getByRole("button", { name: "Tắt mic", exact: true }).click();
    expect(
      await host.evaluate(() =>
        (
          window as unknown as { __micState: { tracks: MediaStreamTrack[] } }
        ).__micState.tracks.every((t) => !t.enabled),
      ),
    ).toBe(true);
    await host.screenshot({ path: dir + "/chat-voice.png" });
    await host.getByRole("button", { name: "Rời voice", exact: true }).click();
    expect(
      await host.evaluate(() =>
        (
          window as unknown as { __micState: { tracks: MediaStreamTrack[] } }
        ).__micState.tracks.every((t) => t.readyState === "ended"),
      ),
    ).toBe(true);
    for (const guest of pages.slice(1))
      await guest
        .getByRole("button", { name: "Rời voice", exact: true })
        .click();
    if (soakSeconds) {
      const start = Date.now(),
        samples: unknown[] = [],
        identities = await Promise.all(
          pages.map((p) =>
            p
              .locator("[data-runtime-mode=colony-coop]")
              .getAttribute("data-coop-player-id"),
          ),
        );
      while (Date.now() - start < soakSeconds * 1000) {
        await host.waitForTimeout(10000);
        for (const [i, page] of pages.entries()) {
          await expect(
            page.locator("[data-runtime-mode=colony-coop]"),
          ).toHaveAttribute("data-runtime-status", "ready", { timeout: 25000 });
          await expect(
            page.locator("[data-runtime-mode=colony-coop]"),
          ).toHaveAttribute("data-coop-player-id", identities[i]!);
          await page.keyboard.press("Escape");
          await page.keyboard.down((samples.length + i) % 2 ? "a" : "d");
          await page.waitForTimeout(180);
          await page.keyboard.up((samples.length + i) % 2 ? "a" : "d");
        }
        const state = await Promise.all(
          pages.map((p) =>
            p
              .locator(".coop-stage canvas")
              .evaluate((c) => ({
                tick: Number(c.dataset.authorityTick),
                teammates: Number(c.dataset.teammateCount),
                x: Number(c.dataset.playerX),
                y: Number(c.dataset.playerY),
              })),
          ),
        );
        samples.push({
          seconds: Math.round((Date.now() - start) / 1000),
          state,
        });
        writeFileSync(
          dir + "/soak.json",
          JSON.stringify(
            {
              durationSeconds: Math.round((Date.now() - start) / 1000),
              players: 3,
              samples,
              admissions,
              closes,
              errors,
            },
            null,
            2,
          ),
        );
        if (samples.length % 6 === 0)
          console.log(
            "Co-op soak:",
            Math.round((Date.now() - start) / 1000),
            "seconds; peers",
            state.map((s) => s.teammates + 1),
          );
      }
      for (const page of pages)
        await expect(page.locator(".coop-stage canvas")).toHaveAttribute(
          "data-teammate-count",
          "2",
          { timeout: 20000 },
        );
    }
    expect(errors).toEqual([]);
    writeFileSync(
      dir + "/verification.json",
      JSON.stringify(
        {
          players: 3,
          displayNames: true,
          chat: true,
          escapedText: true,
          map: true,
          hudMeters: 5,
          voicePeers: 2,
          explicitMic: true,
          mute: true,
          trackCleanup: true,
          admissions,
          closes,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close().catch(() => {})));
    if (owned) {
      // Delete only the newly returned room, authenticated as its original owner.
      await expect
        .poll(
          async () => {
            const response = await fetch(
              base + "/api/pilot/rooms/" + owned!.id,
              {
                method: "DELETE",
                headers: {
                  Authorization: "Bearer " + owned!.ownerToken,
                  Cookie: ownerCookie,
                  Origin: base!,
                },
              },
            );
            return response.status;
          },
          { timeout: 60000 },
        )
        .toBe(200);
    }
  }
});

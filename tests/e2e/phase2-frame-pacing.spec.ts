import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from "../../src/integration";
import {
  createPhase1SaveV2Compatibility,
  validatePortableSaveBundleV2,
} from "../../src/persistence";
import { colonySurveySites } from "../../src/world/phase2/ColonyRegions";

test("full scene frame pacing: colony regions, recurring weather and moving authority preserve the accepted budget", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const directory = resolve("test-results/phase2-frame-pacing");
  mkdirSync(directory, { recursive: true });
  const sites = colonySurveySites("p1-world-golden");
  const reports: unknown[] = [];
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const scene of [
    {
      name: "landing-clear",
      position: { x: 18, y: 10 },
      tick: 1,
      weather: "clear",
    },
    {
      name: "marsh-rain",
      position: sites[0]!.position,
      tick: 153_000,
      weather: "mist-rain",
    },
    {
      name: "badlands-wind",
      position: sites[1]!.position,
      tick: 153_000,
      weather: "dry-wind",
    },
    {
      name: "marsh-night-rain",
      position: sites[0]!.position,
      tick: 135_000,
      weather: "mist-rain",
    },
  ]) {
    const dbName = "p2-fps:" + scene.name;
    const bundle = await Phase1AuthorityBundle.create({
      worldId: dbName,
      worldSeed: "p1-world-golden",
      playerIds: ["observer"],
      colonyDepthEnabled: true,
      interactionRangeWorldUnits: 1.25,
      spawnClearanceRadiusWorldUnits: 1.25,
      requiredAccessRadiusWorldUnits: 1.25,
    });
    let request: ReturnType<typeof composePhase1SaveV2>;
    try {
      bundle.getRuntime("observer").relocatePlayer(scene.position);
      await bundle.stepSolo();
      request = composePhase1SaveV2(bundle, {
        nowUtc: "2026-09-30T00:00:00.000Z",
      });
    } finally {
      await bundle.destroy();
    }
    const save = {
      ...request,
      formatId: request.world.formatId,
      schemaVersion: request.world.schemaVersion,
      recordKind: "portable-bundle" as const,
      world: {
        ...request.world,
        authorityTick: scene.tick,
        environment: { ...request.world.environment, activeTick: scene.tick },
      },
    };
    // A labeled scene fixture accelerates weather setup; all measurements run the real game and authority.
    expect(
      validatePortableSaveBundleV2(
        save,
        createPhase1SaveV2Compatibility(bundle.catalog, [3]),
      ).ok,
    ).toBe(true);
    await page.goto("/");
    await page.evaluate(
      async ({ name, save }) => {
        const db = await new Promise<IDBDatabase>((resolveOpen, reject) => {
          const open = indexedDB.open(name, 2);
          open.onupgradeneeded = () => {
            open.result.createObjectStore("worlds", { keyPath: "worldId" });
            for (const [store, key] of [
              ["players", "playerId"],
              ["containers", "containerId"],
              ["chunks", "coord"],
              ["footholds", "footholdId"],
              ["structures", "structureId"],
            ]) {
              const keys =
                key === "coord"
                  ? ["worldId", "coord.x", "coord.y"]
                  : ["worldId", key!];
              open.result
                .createObjectStore(store!, { keyPath: keys })
                .createIndex("worldId", "worldId");
            }
          };
          open.onsuccess = () => resolveOpen(open.result);
          open.onerror = () => reject(open.error);
        });
        await new Promise<void>((done, reject) => {
          const tx = db.transaction(
            [
              "worlds",
              "players",
              "containers",
              "chunks",
              "footholds",
              "structures",
            ],
            "readwrite",
          );
          tx.objectStore("worlds").put(save.world);
          for (const key of [
            "players",
            "containers",
            "chunks",
            "footholds",
            "structures",
          ] as const)
            for (const record of save[key]) tx.objectStore(key).put(record);
          tx.oncomplete = () => done();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        db.close();
      },
      { name: dbName, save },
    );
    await page.goto(
      "/?" +
        new URLSearchParams({
          proz0Mode: "phase2-colony-review",
          proz0WorldId: dbName,
          proz0WorldSeed: "p1-world-golden",
          proz0Players: "observer",
          proz0Player: "observer",
          proz0SaveDb: dbName,
        }).toString(),
    );
    await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
      "data-runtime-status",
      "ready",
    );
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-regional-weather",
      scene.weather,
    );
    if(scene.weather==='dry-wind'){
      await expect(page.locator('[data-weather-effect="cold-rain"]')).toHaveCount(0);
      await expect(page.locator('[data-weather-effect="dry-wind"]')).toBeVisible();
      await expect(page.locator('[data-region="world"]')).toContainText('DRY WIND');
    }
    if(scene.weather==='mist-rain'){
      const rain=page.locator('[data-weather-effect="cold-rain"]');await expect(rain).toBeVisible();const before=await rain.getAttribute('data-rain-motion-phase');const transform=await rain.evaluate(e=>e.style.transform);await page.screenshot({path:resolve(directory,scene.name+'-rain-A.png')});await page.waitForTimeout(200);expect(await rain.getAttribute('data-rain-motion-phase')).not.toBe(before);expect(await rain.evaluate(e=>e.style.transform)).not.toBe(transform);await page.screenshot({path:resolve(directory,scene.name+'-rain-B.png')});
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(directory, scene.name + ".png") });
    for (const moving of [false, true]) {
      const report = await page.evaluate(async (move) => {
        const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
        const tick = Number(canvas.dataset.authorityTick),
          origin = {
            x: Number(canvas.dataset.playerX),
            y: Number(canvas.dataset.playerY),
          };
        const intervals: number[] = [];
        let distance = 0,
          key: string | null = null;
        const start = performance.now();
        let prior = start;
        await new Promise<void>((done) => {
          const frame = (now: number) => {
            intervals.push(now - prior);
            prior = now;
            distance = Math.max(
              distance,
              Math.hypot(
                Number(canvas.dataset.playerX) - origin.x,
                Number(canvas.dataset.playerY) - origin.y,
              ),
            );
            if (move) {
              const next = ["KeyD", "KeyS", "KeyA", "KeyW"][
                Math.floor((now - start) / 500) % 4
              ]!;
              if (key !== next) {
                if (key !== null)
                  document.dispatchEvent(
                    new KeyboardEvent("keyup", { code: key, bubbles: true }),
                  );
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { code: next, bubbles: true }),
                );
                key = next;
              }
            }
            if (now - start < 3000) requestAnimationFrame(frame);
            else done();
          };
          requestAnimationFrame(frame);
        });
        if (key !== null)
          document.dispatchEvent(
            new KeyboardEvent("keyup", { code: key, bubbles: true }),
          );
        const sorted = [...intervals].sort((a, b) => a - b);
        return {
          fps: (intervals.length * 1000) / (prior - start),
          p95Ms: sorted[Math.floor(sorted.length * 0.95)]!,
          authorityTicks: Number(canvas.dataset.authorityTick) - tick,
          distance,
          userAgent: navigator.userAgent,
          viewport: [innerWidth, innerHeight],
        };
      }, moving);
      reports.push({ scene: scene.name, moving, ...report });
      writeFileSync(
        resolve(directory, "frames.json"),
        JSON.stringify(
          {
            sourceHeadSha: process.env.P0_TEST_HEAD_SHA ?? "local-working-tree",
            fixture: "canonical Save V2 scene setup",
            threshold: { fpsMinimum: 50, p95MaximumMs: 34 },
            samples: reports,
          },
          null,
          2,
        ),
      );
      expect(report.fps).toBeGreaterThanOrEqual(50);
      expect(report.p95Ms).toBeLessThanOrEqual(34);
      expect(report.authorityTicks).toBeGreaterThan(100);
      if (moving) expect(report.distance).toBeGreaterThan(0.2);
    }
    for(const scale of [1,3]){
      await page.setViewportSize({width:640*scale,height:360*scale});
      await expect(page.locator('canvas')).toHaveAttribute('data-display-scale',String(scale));
      const box=await page.locator('.p2-colony-controls').boundingBox();
      expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(640*scale);
      await page.screenshot({path:resolve(directory,scene.name+'-'+String(scale)+'x.png')});
    }
    await page.setViewportSize({width:1280,height:720});
  }
});

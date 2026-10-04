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
import { colonyExplorationSites } from '../../src/world/phase2/ColonyExplorationSites';
import { EXPLORATION_TEMPLATES } from '../../src/content/phase2/ExplorationContent';
import { colonySurveySites } from "../../src/world/phase2/ColonyRegions";
import { colonyRiverLandmarks, colonyRiverTerrainAt } from '../../src/world/phase2/ColonyHydrology';

interface FrameScene {name:string;position:{x:number;y:number};tick:number;weather:string;dayPeriod:string;generationVersion?:number;fishing?:boolean;gear?:boolean;poi?:'laboratory'|'garden'|'array'}
test("full scene frame pacing: colony regions, recurring weather and moving authority preserve the accepted budget", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const directory = resolve("test-results/phase2-frame-pacing");
  mkdirSync(directory, { recursive: true });
  const profiler = process.env.P2_PROFILE === '1' ? await page.context().newCDPSession(page) : null;
  if (profiler) await profiler.send('Profiler.enable');
  const sites = colonySurveySites("p1-world-golden");
  const reports: unknown[] = [];
  await page.setViewportSize({ width: 1280, height: 720 });
  const scenes:readonly FrameScene[] = [
    {
      name: "landing-clear",
      position: { x: 18, y: 10 },
      tick: 1,
      weather: "clear",
      dayPeriod: 'day',
    },
    {
      name: "marsh-rain",
      position: sites[0]!.position,
      tick: 99_000,
      weather: "mist-rain",
      dayPeriod: 'day',
    },
    {
      name: "badlands-wind",
      position: sites[1]!.position,
      tick: 99_000,
      weather: "dry-wind",
      dayPeriod: 'day',
    },
    {
      name: "marsh-night-rain",
      position: sites[0]!.position,
      tick: 153_000,
      weather: "mist-rain",
      dayPeriod: 'night',
    },
    { name: 'river-crossing', position: colonyRiverLandmarks('p1-world-golden').crossings[0]!, tick: 1, weather: 'clear', dayPeriod: 'day' },
    { name: 'river-fishing', position: colonyRiverLandmarks('p1-world-golden').crossings[0]!, tick: 1, weather: 'clear', dayPeriod: 'day', fishing: true },
    { name: 'equipped-mythic', position: { x:18, y:10 }, tick:1, weather:'clear', dayPeriod:'day', gear:true },
    ...(['laboratory','garden','array'] as const).map(poi=>({name:'restored-'+poi,position:colonyExplorationSites('p1-world-golden',5).find(s=>s.template===poi)!.position,tick:poi==='array'?99_000:1,weather:poi==='array'?'dry-wind': 'clear',dayPeriod:'day',poi})),
    { name: 'legacy-v4-sized', position: { x: 18, y: 10 }, tick: 1, weather: 'clear', dayPeriod: 'day', generationVersion: 4 },
  ];
  for (const scene of scenes) {
    const dbName = "p2-fps:" + scene.name;
    const bundle = await Phase1AuthorityBundle.create({
      worldId: dbName,
      worldSeed: "p1-world-golden",
      worldGenerationVersion: scene.generationVersion ?? 5,
      resourceProfileVersion: 1,
      playerIds: ["observer"],
      colonyDepthEnabled: true,
      singlePlayerExpeditionEnabled: true,
      interactionRangeWorldUnits: 1.25,
      spawnClearanceRadiusWorldUnits: 1.25,
      requiredAccessRadiusWorldUnits: 1.25,
    });
    let request: ReturnType<typeof composePhase1SaveV2>;
    try {
      bundle.getRuntime("observer").relocatePlayer(scene.position);
      await bundle.stepSolo();
      if (scene.fishing) {
        const inventory = bundle.items.getContainerView('inventory:observer');
        expect(bundle.items.commitColonyExchange({ operationId: 'fixture:fish-performance', playerId: 'observer', expectedInventoryRevision: inventory.revision, inputs: [], outputs: [{ itemDefinitionId: 'item:fishing-rod', quantity: 1 }, { itemDefinitionId: 'item:fishing-bait', quantity: 1 }] }).status).toBe('committed');
        const center = { x: Math.floor(scene.position.x / 2) * 2 + 1, y: Math.floor(scene.position.y / 2) * 2 + 1 };
        const authority = bundle.livingWorld!.fishing;
        let water: { x: number; y: number } | undefined;
        search: for (let dy = -12; dy <= 12; dy += 2) for (let dx = -12; dx <= 12; dx += 2) {
          const bank = { x: center.x + dx, y: center.y + dy }; if (colonyRiverTerrainAt('p1-world-golden',bank) !== 'ground') continue;
          bundle.getRuntime('observer').relocatePlayer(bank); await bundle.stepSolo();
          water = [{ x: bank.x + 2, y: bank.y }, { x: bank.x - 2, y: bank.y }, { x: bank.x, y: bank.y + 2 }, { x: bank.x, y: bank.y - 2 }].find(p => authority.assessCast('observer',p.x,p.y) === null);
          if (water) break search;
        }
        expect(water).toBeDefined();
        expect(authority.execute({ id: 'fixture:active-cast', playerId: 'observer', expectedRevision: authority.revision(), expectedInventoryRevision: bundle.items.getContainerView('inventory:observer').revision, action: 'cast', ...water! }).status).toBe('committed');
      }
      if (scene.poi) {
        const template=EXPLORATION_TEMPLATES.find(t=>t.id===scene.poi)!;
        expect(bundle.items.commitColonyExchange({operationId:'fixture:poi-performance',playerId:'observer',expectedInventoryRevision:bundle.items.getContainerView('inventory:observer').revision,inputs:[],outputs:template.costs.map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity}))}).status).toBe('committed');
        for(const action of ['inspect-site','restore-site'] as const)expect(bundle.colonyDepth.execute({operationId:'fixture:'+action,playerId:'observer',expectedRevision:bundle.colonyDepth.read().revision,expectedInventoryRevision:bundle.items.getContainerView('inventory:observer').revision,action,targetId:template.siteId}).status).toBe('committed');
      }
      if (scene.gear) {
        expect(bundle.items.commitColonyExchange({ operationId:'fixture:gear-performance', playerId:'observer',expectedInventoryRevision:bundle.items.getContainerView('inventory:observer').revision,inputs:[],outputs:[{itemDefinitionId:'item:mythic-relic-spear',quantity:1},{itemDefinitionId:'item:thermal-wrap',quantity:1}] }).status).toBe('committed');
        const inventory=bundle.items.getContainerView('inventory:observer');
        expect(bundle.equipWeapon('observer',inventory.stacks.find(s=>s.itemDefinitionId==='item:mythic-relic-spear')!.stackId).status).toBe('committed');
        expect(bundle.equipThermalWrap('observer',inventory.stacks.find(s=>s.itemDefinitionId==='item:thermal-wrap')!.stackId).status).toBe('committed');
      }
      request = composePhase1SaveV2(bundle, {
        nowUtc: "2026-09-30T00:00:00.000Z",
      });
    } finally {
      await bundle.destroy();
    }
    const sceneTick = scene.fishing ? request.world.authorityTick : scene.tick;
    const save = {
      ...request,
      formatId: request.world.formatId,
      schemaVersion: request.world.schemaVersion,
      recordKind: "portable-bundle" as const,
      world: {
        ...request.world,
        authorityTick: sceneTick,
        environment: { ...request.world.environment, activeTick: sceneTick },
        singlePlayerExpedition: { ...request.world.singlePlayerExpedition!, nextEventTick: sceneTick + 7200 },
        industry: { ...request.world.industry!, lastTick: sceneTick },
      },
    };
    // A labeled scene fixture accelerates weather setup; all measurements run the real game and authority.
    const validated = validatePortableSaveBundleV2(save, createPhase1SaveV2Compatibility(bundle.catalog, [request.world.generationVersion]));
    expect(validated.ok, JSON.stringify(validated)).toBe(true);
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
    await expect(page.locator('canvas')).toHaveAttribute('data-day-period', scene.dayPeriod);
    if (scene.name === 'river-crossing') await expect(page.locator('[data-world-role="terrain"][data-water-kind="river"]').first()).toBeVisible();
    if (scene.poi) await expect(page.locator('[data-world-role="survey-site"][data-poi-template="'+scene.poi+'"]')).toHaveAttribute('data-poi-stage','restored');
    if (scene.fishing) await expect(page.locator('[data-fishing-bobber]')).toBeVisible();
    if (scene.gear) { await expect(page.locator('[data-world-role="held-weapon-overlay"]')).toHaveAttribute('data-rarity','mythic'); await expect(page.locator('[data-world-role="thermal-wrap-overlay"]')).toBeVisible(); }
    if(scene.weather==='dry-wind'){
      await expect(page.locator('[data-weather-effect="cold-rain"]')).toHaveCount(0);
      await expect(page.locator('[data-weather-effect="dry-wind"]')).toBeVisible();
      await expect(page.locator('[data-region="world"]')).toContainText('DRY WIND');
    }
    if(scene.weather==='mist-rain'){
      const rain=page.locator('[data-weather-effect="cold-rain"]');await expect(rain).toBeVisible();const before=await rain.getAttribute('data-rain-motion-phase');const pixels=await rain.screenshot();await page.screenshot({path:resolve(directory,scene.name+'-rain-A.png')});await page.waitForTimeout(200);expect(await rain.getAttribute('data-rain-motion-phase')).not.toBe(before);expect(await rain.screenshot()).not.toEqual(pixels);await page.screenshot({path:resolve(directory,scene.name+'-rain-B.png')});
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(directory, scene.name + ".png") });
    for (const moving of [false, true]) {
      if (profiler) await profiler.send('Profiler.start');
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
      if (profiler) writeFileSync(resolve(directory, scene.name + '-' + String(moving) + '.cpuprofile'), JSON.stringify((await profiler.send('Profiler.stop')).profile));
      reports.push({ scene: scene.name, moving, generationVersion: request.world.generationVersion, resourceProfileVersion: request.world.environment.resourceProfileVersion, ...report });
      writeFileSync(
        resolve(directory, "frames.json"),
        JSON.stringify(
          {
            sourceHeadSha: process.env.P0_TEST_HEAD_SHA ?? "local-working-tree",
            fixture: "canonical Save V2 scene setup; generation 5 plus legacy v4; resource profiles v1; expedition/living enabled",
            generationVersion: request.world.generationVersion,
            resourceProfileVersion: request.world.environment.resourceProfileVersion,
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
      if (scene.fishing) {
        if (moving) await expect(page.locator('[data-fishing-bobber]')).toBeHidden();
        else await expect(page.locator('[data-fishing-bobber]')).toBeVisible();
      }
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

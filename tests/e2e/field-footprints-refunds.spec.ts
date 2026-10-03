import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from "../../src/integration";
import { expeditionFacility } from "../../src/content/singleplayer/ExpeditionContent";
import type { ExpeditionCommand } from "../../src/simulation/expedition/ExpeditionAuthority";
import { installSaveFixture } from "./support/save-fixture";

test("large field blueprint preview rotates its real dimensions without clipping or spending materials", async ({
  page,
}) => {
  await page.goto(
    "/?proz0Mode=phase2-colony-review&proz0WorldId=world:footprint-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=footprint-ui",
  );
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-runtime-status",
    "ready",
  );
  await page
    .getByRole("button", { name: "Build base [B]", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Expedition blueprints · materials later",
      exact: true,
    })
    .click();
  const panel = page.locator(".sp-expedition-panel");
  await panel
    .locator("article")
    .filter({ has: page.getByText("Livestock Pen", { exact: true }) })
    .getByRole("button", { name: "Plan", exact: true })
    .click();
  await page.mouse.move(780, 430);
  const ghost = page.locator(".sp-ghost");
  await expect(ghost).toHaveAttribute("data-footprint-width", "3");
  await expect(ghost).toHaveAttribute("data-footprint-depth", "2.5");
  expect(
    await ghost.locator("svg").evaluate((e) => getComputedStyle(e).overflow),
  ).toBe("visible");
  await page.keyboard.press("r");
  await expect(ghost).toHaveAttribute("data-footprint-width", "2.5");
  await expect(ghost).toHaveAttribute("data-footprint-depth", "3");
  mkdirSync("test-results/field-construction", { recursive: true });
  await page.screenshot({
    path: "test-results/field-construction/large-footprint.png",
  });
  await page.keyboard.press("Escape");
  await expect(ghost).toBeHidden();
  await expect(page.locator(".sp-blueprint[data-plan-id]")).toHaveCount(0);
});

test("full bag cancellation tells the player materials reached a real crate and reload retains the cancellation and refund", async ({
  page,
}) => {
  const config = {
    worldId: "world:refund-ui",
    worldSeed: "p1-world-golden",
    playerIds: ["solo"],
    singlePlayerExpeditionEnabled: true,
    colonyDepthEnabled: true,
    interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  };
  const b = await Phase1AuthorityBundle.create(config);
  let save: ReturnType<typeof composePhase1SaveV2>;
  try {
    b.getRuntime("solo");
    await b.stepSolo();
    const a = b.expedition!;
    const run = (
      id: string,
      action: ExpeditionCommand["action"],
      target: string,
      extra: Partial<ExpeditionCommand> = {},
    ) =>
      a.execute({
        id,
        action,
        target,
        playerId: "solo",
        expectedRevision: a.read().revision,
        expectedInventoryRevision:
          b.items.getContainerView("inventory:solo").revision,
        ...extra,
      });
    const grant = (
      id: string,
      outputs: { itemDefinitionId: string; quantity: number }[],
    ) =>
      b.items.commitColonyExchange({
        operationId: id,
        playerId: "solo",
        expectedInventoryRevision:
          b.items.getContainerView("inventory:solo").revision,
        inputs: [],
        outputs,
      });
    let placed = false;
    for (const [x, y] of [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
      [2, 2],
      [-2, -2],
    ] as const) {
      if (
        run("cache", "plan", "supply-cache", { x, y }).status === "committed"
      ) {
        placed = true;
        break;
      }
    }
    expect(placed).toBe(true);
    expect(
      grant(
        "fixture:cache",
        expeditionFacility("supply-cache")!.costs.map(
          ([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }),
        ),
      ).status,
    ).toBe("committed");
    expect(run("cache-deposit", "deposit", "plan:cache").status).toBe(
      "committed",
    );
    expect(run("cache-complete", "complete", "plan:cache").status).toBe(
      "committed",
    );
    const crate = b.buildings.getStructure(
      a.read().facilities[0]!.canonicalStructureId!,
    )!;
    placed = false;
    for (let y = -3; y <= 3 && !placed; y++)
      for (let x = -3; x <= 3 && !placed; x++) {
        if (
          Math.hypot(x, y) <= 4 &&
          Math.hypot(x - crate.position.x, y - crate.position.y) <= 3 &&
          run("bed", "plan", "camp-bed", { x, y }).status === "committed"
        )
          placed = true;
      }
    expect(placed).toBe(true);
    expect(
      grant(
        "fixture:bed",
        expeditionFacility("camp-bed")!.costs.map(
          ([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }),
        ),
      ).status,
    ).toBe("committed");
    expect(run("bed-deposit", "deposit", "plan:bed").status).toBe("committed");
    // Controlled capacity fixture; natural gather/build journey remains separate.
    expect(
      grant("fixture:full", [
        { itemDefinitionId: "item:metal-ore", quantity: 20 },
        { itemDefinitionId: "item:metal-ore", quantity: 10 },
      ]).status,
    ).toBe("committed");
    b.getRuntime("solo").relocatePlayer(
      {
        x: crate.position.x - Math.sign(crate.position.x),
        y: crate.position.y - Math.sign(crate.position.y),
      },
      "N",
    );
    save = composePhase1SaveV2(b, { nowUtc: "2026-10-03T00:00:00Z" });
  } finally {
    await b.destroy();
  }
  await installSaveFixture(page, "refund-ui", save);
  await page.goto(
    "/?proz0Mode=phase2-colony-review&proz0WorldId=world:refund-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=refund-ui",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-runtime-status",
    "ready",
  );
  await page
    .getByRole("button", { name: "Build base [B]", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Expedition blueprints · materials later",
      exact: true,
    })
    .click();
  const panel = page.locator(".sp-expedition-panel");
  await panel
    .locator('[data-expedition-plan="plan:bed"]')
    .getByRole("button", { name: "Cancel & refund", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveAttribute(
    "data-result",
    "PLAN_REFUNDED_TO_STORAGE",
  );
  await expect(panel.getByRole("status")).toContainText(
    "accessible nearby storage crate",
  );
  await expect(panel.locator("[data-expedition-plan]")).toHaveCount(0);
  mkdirSync("test-results/field-construction", { recursive: true });
  await page.screenshot({
    path: "test-results/field-construction/full-bag-refund.png",
  });
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await page.keyboard.press("l");
  await expect(page.locator("[data-product-review-save]")).toHaveAttribute(
    "data-save-state",
    "success",
  );
  await page.reload();
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-runtime-status",
    "ready",
  );
  await expect(page.locator(".sp-blueprint[data-plan-id]")).toHaveCount(0);
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open("refund-ui", 2);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    const records = await new Promise<
      {
        kind: string;
        stacks: { itemDefinitionId: string; quantity: number }[];
      }[]
    >((resolve, reject) => {
      const q = db.transaction("containers").objectStore("containers").getAll();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    db.close();
    return records
      .filter((c) => c.kind === "storage-crate")
      .flatMap((c) => c.stacks.map((s) => [s.itemDefinitionId, s.quantity]));
  });
  expect(stored).toEqual([
    ["item:timber", 2],
    ["item:plant-fiber", 4],
  ]);
  expect(errors).toEqual([]);
});

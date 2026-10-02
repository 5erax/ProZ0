import { expect, test, type Page } from "@playwright/test";
import { colonySurveySites } from "../../src/world/phase2/ColonyRegions";
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

async function walkTo(page: Page, x: number, y: number): Promise<void> {
  let previous = "";
  let stuck = 0;
  let held: string[] = [];
  try {
    // The longest leg crosses both regions. Allow slower CI frame scheduling
    // without granting items, relocating the player, or accepting blocked motion.
    for (let step = 0; step < 1800; step += 1) {
      const position = await page.locator("canvas").evaluate((element) => ({
        x: Number(element.getAttribute("data-player-x")),
        y: Number(element.getAttribute("data-player-y")),
      }));
      const dx = x - position.x;
      const dy = y - position.y;
      if (Math.hypot(dx, dy) <= 0.65) return;
      const current = position.x.toFixed(2) + "," + position.y.toFixed(2);
      stuck = current === previous ? stuck + 1 : 0;
      previous = current;
      if (stuck > 15)
        throw new Error(
          "Movement blocked at " +
            current +
            " toward " +
            String(x) +
            "," +
            String(y),
        );
      const keys =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? ["s", "d"]
            : ["w", "a"]
          : dy > 0
            ? ["s", "a"]
            : ["w", "d"];
      if (keys.join(",") !== held.join(",")) {
        for (const key of held.toReversed()) await page.keyboard.up(key);
        for (const key of keys) await page.keyboard.down(key);
        held = keys;
      }
      await page.waitForTimeout(100);
    }
    throw new Error(
      "Normal movement failed toward " +
        String(x) +
        "," +
        String(y) +
        "; last position " +
        previous,
    );
  } finally {
    for (const key of held.toReversed()) await page.keyboard.up(key);
  }
}

test("colony exploration: real gathering funds research; walking reveals and inspects both regional sites; save restores journal", async ({
  page,
}) => {
  test.setTimeout(600_000);
  const directory=resolve('test-results/phase2-colony-depth');mkdirSync(directory,{recursive:true});
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(
    "/?" +
      new URLSearchParams({
        proz0Mode: "phase2-colony-review",
        proz0WorldId: "world:p2-natural",
        proz0WorldSeed: "p1-world-golden",
        proz0Players: "colonist",
        proz0Player: "colonist",
        proz0SaveDb: "p2-natural",
      }).toString(),
  );
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-runtime-status",
    "ready",
  );
  await expect(page).toHaveTitle("ProZ0 — Colony depth");
  const sound = page.waitForResponse((response) => /owner-rain-loop.*\.ogg/.test(response.url()));
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole("button", { name: "Enable sound", exact: true }).click();
  expect((await sound).ok()).toBe(true);
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.locator('[data-world-role="survey-site"]')).toHaveCount(0);
  await expect(page.locator(".p2-colony-controls")).toHaveAttribute(
    "data-biome",
    "landing-grassland",
  );
  const interaction = page.locator('[data-region="interaction"]');
  await walkTo(page, 18, 10);
  for (let n = 0; n < 3; n++) {
    await page.keyboard.press("e");
    await expect(interaction).toHaveAttribute("data-state", "CHANNELING");
    await expect(interaction).toHaveAttribute("data-state", "AVAILABLE", {
      timeout: 3000,
    });
  }
  await walkTo(page, 48, 24);
  await expect(interaction).toContainText("Stone");
  for (let n = 0; n < 2; n++) {
    await page.keyboard.press("e");
    await expect(interaction).toHaveAttribute("data-state", "CHANNELING");
    await expect(interaction).toHaveAttribute("data-state", "AVAILABLE", {
      timeout: 3000,
    });
  }
  await walkTo(page, 0, 0);
  await page.locator('[data-colony-panel="research"]').click();
  const survey = page.locator('[data-colony-action="research:field-survey"]');
  await expect(survey).toBeEnabled();
  await survey.click();
  await expect(survey).toHaveText("✓ Completed");
  await page.keyboard.press("Escape");
  await expect(page.locator(".p2-colony-panel")).toBeHidden();
  await walkTo(page, 0, 12);
  for (const site of colonySurveySites("p1-world-golden")) {
    await walkTo(page, site.position.x, site.position.y);
    await expect(page.locator(".p2-colony-controls")).toHaveAttribute(
      "data-biome",
      site.biomeId,
    );
    await expect(
      page.locator('[data-site-id="' + site.id + '"]'),
    ).toBeVisible();
    await page.keyboard.press("j");
    await page
      .locator('[data-colony-action="inspect-site:' + site.id + '"]')
      .click();
    await expect(page.locator(".p2-colony-panel")).toContainText(
      site.observation,
    );
    await page.screenshot({path:resolve(directory,site.biomeId+'.png')});
    await page.keyboard.press("Escape");
  }
  await page.keyboard.press("l");
  await expect(page.locator("[data-product-review-save]")).toHaveAttribute(
    "data-save-state",
    "success",
  );
  await page.reload();
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-product-review-reopened",
    "true",
  );
  await page.keyboard.press("j");
  for (const site of colonySurveySites("p1-world-golden"))
    await expect(page.locator(".p2-colony-panel")).toContainText(
      site.observation,
    );
  expect(errors).toEqual([]);
  writeFileSync(resolve(directory,'journey.json'),JSON.stringify({sourceHeadSha:process.env.P0_TEST_HEAD_SHA??'local-working-tree',setup:'fresh world; keyboard movement and actual gather commands; no item grants or relocation',research:'field-survey',inspectedSites:colonySurveySites('p1-world-golden').map(site=>site.id),reopened:true,errors},null,2));
});

test("accepted Phase 1 world upgrades from the launcher while keeping its saved position and inventory", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto('/?' + new URLSearchParams({proz0Mode:'phase1-product-review',proz0WorldId:'legacy-upgrade',proz0WorldSeed:'phase1-product-review',proz0Players:'review-player',proz0Player:'review-player',proz0SaveDb:'legacy-upgrade'}).toString());
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-runtime-status",
    "ready",
  );
  await page.keyboard.down("s");
  await page.waitForTimeout(600);
  await page.keyboard.up("s");
  await page.keyboard.press("l");
  await expect(page.locator("[data-product-review-save]")).toHaveAttribute(
    "data-save-state",
    "success",
  );
  const position = await page.locator("canvas").getAttribute("data-player-y");
  const prior = new URL(page.url());
  await page.goto("/");
  await page.locator("[data-upgrade-colony-review]").click();
  await expect(page.locator("[data-proz0-autoboot]")).toHaveAttribute(
    "data-product-review-reopened",
    "true",
  );
  expect(new URL(page.url()).searchParams.get("proz0WorldId")).toBe(
    prior.searchParams.get("proz0WorldId"),
  );
  expect(
    Number(await page.locator("canvas").getAttribute("data-player-y")),
  ).toBeCloseTo(Number(position), 5);
  await expect(page.locator(".p2-colony-controls")).toBeVisible();
  await page.keyboard.press("l");
  await expect(page.locator("[data-product-review-save]")).toHaveAttribute(
    "data-save-state",
    "success",
  );
  await page.goto("/");
  await page.locator("[data-continue-phase1-review]").click();
  await expect(page.locator(".p2-colony-controls")).toBeVisible();
});

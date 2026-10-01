import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { Phase1HostedAuthorityComposition } from "../../src/integration";
import { colonyHostedScene } from "../../src/integration/ColonyHostedScene";
import { serializeServerEnvelopeV1 } from "../../src/protocol";
import { roomStorageKey } from "../../src/client/runtime/ColonyCoopLauncher";
import type { HostedOutboundMessage } from "../../src/server";
test.use({ actionTimeout: 15000 });

test("co-op UI performs real equipment, drop/pickup, storage, research and profession transactions", async ({
  page,
}) => {
  test.setTimeout(120000);
  const colony = await Phase1HostedAuthorityComposition.create({
    worldId: "fixture:coop-ui",
    worldSeed: "p1-world-golden",
    maxPlayers: 3,
    colonyDepthEnabled: true,
    interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 1.25,
    requiredAccessRadiusWorldUnits: 1.25,
    persistence: {
      save: async (authorityTick) => ({
        authorityTick,
        durableSaveRevision: 1,
      }),
    },
  });
  const server = createServer(),
    wsServer = new WebSocketServer({ server }),
    peers = new Map<string, WebSocket>();
  const submitted: unknown[] = [], results: unknown[] = [];
  const flush = (messages: readonly HostedOutboundMessage[]) => {
    for (const m of messages) {
      if (m.envelope.messageType === "COMMAND_RESULT") results.push(m.envelope.payload);
      const ws = peers.get(m.transportId);
      if (ws?.readyState === WebSocket.OPEN)
        ws.send(serializeServerEnvelopeV1(m.envelope));
    }
  };
  wsServer.on("connection", (ws) => {
    const id = randomUUID();
    peers.set(id, ws);
    ws.on("message", (raw) => {
      const text = raw.toString();
      if (JSON.parse(text).proz0Social === 1) return;
      const message = JSON.parse(text);
      if (message.messageType === "GAMEPLAY_COMMAND") submitted.push(message.payload);
      flush(colony.host.receiveText(id, text));
    });
    ws.on("close", () => {
      colony.host.disconnect(id);
      peers.delete(id);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Port unavailable");
  const endpoint = "http://127.0.0.1:" + address.port + "/api/pilot",
    room = "abcdefabcdefabcd";
  let stepping = false;
  const timer = setInterval(() => {
    if (stepping) return;
    stepping = true;
    void (async () => {
      for (let n = 0; n < 3; n++) flush(await colony.step());
      if (colony.bundle.authorityTick % 6 === 0)
        for (const playerId of colony.bundle.getActivePlayerIds())
          flush(
            colony.host.publishAggregate({
              aggregateType: "colony-scene",
              aggregateId: playerId,
              revision: colony.bundle.authorityTick,
              tombstone: false,
              state: colonyHostedScene(colony.bundle, playerId) as never,
            }),
          );
    })().finally(() => (stepping = false));
  }, 50);
  try {
    await page.goto("/");
    await page.evaluate(
      ({ key, details }) => localStorage.setItem(key, JSON.stringify(details)),
      {
        key: roomStorageKey(endpoint, room),
        details: {
          id: room,
          worldSeed: "p1-world-golden",
          accessToken: "fixture",
          clientKey: "fixture",
          contentCompatibility: colony.bundle.getContentCompatibility(),
          worldCompatibility: colony.bundle.getWorldCompatibility(),
        },
      },
    );
    await page.goto(
      "/?" +
        new URLSearchParams({
          proz0Mode: "colony-coop",
          proz0Room: room,
          proz0Server: endpoint,
        }),
    );
    const root = page.locator("[data-runtime-mode=colony-coop]");
    await expect(root).toHaveAttribute("data-runtime-status", "ready");
    await page.setViewportSize({ width: 640, height: 360 });
    await expect.poll(async () => {
      const region = await page.locator(".coop-region").boundingBox();
      return region ? region.y + region.height : Infinity;
    }).toBeLessThan(130);
    await page.setViewportSize({ width: 1280, height: 720 });
    const playerId = (await root.getAttribute("data-coop-player-id"))!,
      inventory = "inventory:" + playerId;
    const fund = async (
      outputs: { itemDefinitionId: string; quantity: number }[],
    ) => {
      await expect(root).not.toHaveAttribute("data-coop-action", "pending");
      const result = colony.bundle.items.commitColonyExchange({
        operationId: "fixture:" + randomUUID(),
        playerId,
        expectedInventoryRevision:
          colony.bundle.items.getContainerView(inventory).revision,
        inputs: [],
        outputs,
      });
      expect(result).toMatchObject({ status: "committed" });
      flush(colony.publishSharedState());
      await expect(page.locator(".coop-stage canvas")).toHaveAttribute("data-inventory-revision",
        String(colony.bundle.items.getContainerView(inventory).revision));
    };
    // Explicit material/position fixture isolates UI-to-authority wiring. Natural gathering is tested separately.
    await fund([
      { itemDefinitionId: "item:cordage", quantity: 1 },
      { itemDefinitionId: "item:stone", quantity: 2 },
      { itemDefinitionId: "item:storage-crate-kit", quantity: 1 },
      { itemDefinitionId: "item:timber", quantity: 6 },
      { itemDefinitionId: "item:plant-fiber", quantity: 3 },
      { itemDefinitionId: "item:metal-ore", quantity: 2 },
    ]);
    colony.bundle.getRuntime(playerId).relocatePlayer({ x: 4, y: 0 });
    await expect
      .poll(() =>
        page.locator(".coop-stage canvas").getAttribute("data-player-x"),
      )
      .toBe("4");
    await page.keyboard.press("c");
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Basic Spear" })
      .getByRole("button", { name: "Craft", exact: true })
      .click();
    await expect
      .poll(() =>
        colony.bundle.items
          .getContainerView(inventory)
          .stacks.some((s) => s.itemDefinitionId === "item:basic-spear"),
      )
      .toBe(true);
    await page.keyboard.press("i");
    const spear = page
      .locator(".coop-panel article")
      .filter({ hasText: "Basic Spear" });
    await spear.getByRole("button", { name: "Equip", exact: true }).click();
    await expect
      .poll(
        () => colony.bundle.equipment.reconcile(playerId).equippedWeaponStackId,
      )
      .not.toBeNull();
    await expect(spear.getByRole('button',{name:'Unequip',exact:true})).toBeVisible();
    await page.keyboard.press('q');await expect(spear.getByRole('button',{name:'Equip',exact:true})).toBeVisible();
    await page.keyboard.press('q');await expect(spear.getByRole('button',{name:'Unequip',exact:true})).toBeVisible();
    const stone = page
      .locator(".coop-panel article")
      .filter({ hasText: "Stone ×1" });
    await stone.getByRole("button", { name: "Thả 1", exact: true }).click();
    await expect
      .poll(
        () =>
          colony.bundle.world.exportSnapshot().drops.filter((d) => d.available)
            .length,
      )
      .toBe(1);
    await page.keyboard.press("Escape");
    await page.locator("[data-world-role=world-drop]").click();
    await expect
      .poll(
        () =>
          colony.bundle.world.exportSnapshot().drops.filter((d) => d.available)
            .length,
      )
      .toBe(0);
    await page.keyboard.press("b");
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Storage Crate" })
      .getByRole("button", { name: "Place", exact: true })
      .click();
    const box = await page.locator(".coop-stage").boundingBox();
    if (!box) throw Error("Missing stage");
    await page.mouse.click(
      box.x + box.width / 2 + (box.width * 16) / 640,
      box.y + box.height / 2 + (box.height * 8) / 360,
    );
    await expect
      .poll(() =>
        colony.bundle.buildings
          .exportSnapshot()
          .foothold.structures.some(
            (s) => s.definitionId === "structure:storage-crate",
          ),
      )
      .toBe(true);
    await page.locator('[aria-label="structure:storage-crate"]').click();
    const timber = page
      .locator(".coop-panel article")
      .filter({ hasText: "Timber ×4" });
    await timber.getByRole("button", { name: "Cất", exact: true }).click();
    await expect(
      page
        .locator(".coop-panel article")
        .filter({ hasText: "Timber ×4" })
        .getByRole("button", { name: "Lấy", exact: true }),
    ).toBeVisible();
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Timber ×4" })
      .getByRole("button", { name: "Lấy", exact: true })
      .click();
    await expect
      .poll(
        () =>
          colony.bundle.items
            .getContainerView(inventory)
            .stacks.find((s) => s.itemDefinitionId === "item:timber")?.quantity,
      )
      .toBe(4);
    await fund([{ itemDefinitionId: "item:stone", quantity: 1 }]);
    await page.keyboard.press("u");
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Field Survey" })
      .getByRole("button", { name: "Research", exact: true })
      .click();
    await expect
      .poll(() =>
        colony.bundle.colonyDepth.read().researchIds.includes("field-survey"),
      )
      .toBe(true);
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Expanded Storage" })
      .getByRole("button", { name: "Research", exact: true })
      .click();
    await expect
      .poll(() =>
        colony.bundle.colonyDepth
          .read()
          .researchIds.includes("expanded-storage"),
      )
      .toBe(true);
    await page.keyboard.press("p");
    await page
      .locator(".coop-panel article")
      .filter({ hasText: "Engineer" })
      .getByRole("button", { name: "Chọn nghề", exact: true })
      .click();
    await expect
      .poll(() => colony.bundle.colonyDepth.read().professions[playerId])
      .toBe("engineer");
    await page.keyboard.press("c");
    await expect(page.locator(".coop-cost").first()).toContainText(/\d+\/\d+/);
    expect(
      await page
        .locator(".coop-cost span")
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundImage),
    ).not.toBe("none");
    await page.keyboard.press("Escape");
    await page.keyboard.press("m");
    await expect(page.locator(".coop-map")).toBeVisible();
    await page.keyboard.press("Escape");

    await fund([{ itemDefinitionId: "item:machine-kit", quantity: 1 }]);
    colony.bundle.getRuntime(playerId).relocatePlayer({ x: 3, y: 1 });
    await expect(page.locator(".coop-stage canvas")).toHaveAttribute("data-player-x", "3");
    await page.keyboard.press("b");
    await page.locator(".coop-panel article").filter({ hasText: "Atmospheric Water Condenser" })
      .getByRole("button", { name: "Place", exact: true }).click();
    await page.waitForTimeout(150);
    const machineStage = await page.locator(".coop-stage").boundingBox();
    if (!machineStage) throw Error("Missing stage");
    await page.mouse.click(machineStage.x + machineStage.width / 2 + machineStage.width * 16 / 640,
      machineStage.y + machineStage.height / 2 + machineStage.height * 8 / 360);
    await expect.poll(() => colony.bundle.buildings.exportSnapshot().foothold.structures
      .some(s => s.definitionId === "structure:atmospheric-water-condenser")).toBe(true);
    await page.locator('[aria-label="structure:atmospheric-water-condenser"]').click();
    await page.getByRole("button", { name: "Tắt máy", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bật máy", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bật máy", exact: true }).click();
    await expect(page.getByRole("button", { name: "Tắt máy", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tháo dỡ · thu hồi kit", exact: true }).click();
    await expect.poll(() => colony.bundle.buildings.exportSnapshot().foothold.structures
      .some(s => s.definitionId === "structure:atmospheric-water-condenser")).toBe(false);
    expect(colony.bundle.items.getContainerView(inventory).stacks
      .some(s => s.itemDefinitionId === "item:machine-kit")).toBe(true);

    await page.keyboard.press("Escape");
    colony.bundle.getRuntime(playerId).relocatePlayer({ x: 4, y: 0 });
    await expect(page.locator(".coop-stage canvas")).toHaveAttribute("data-player-x", "4");
    await page.locator('[aria-label="structure:storage-crate"]').click();
    await page.locator(".coop-panel article").filter({ hasText: "Machine Kit ×1" })
      .getByRole("button", { name: "Cất", exact: true }).click();
    await expect.poll(() => colony.bundle.items.getContainerView(inventory).stacks
      .some(s => s.itemDefinitionId === "item:machine-kit")).toBe(false);
    await page.keyboard.press("Escape");
    await fund([{ itemDefinitionId: "item:habitat-kit", quantity: 1 }]);
    colony.bundle.getRuntime(playerId).relocatePlayer({ x: 0, y: -1.2 });
    await expect(page.locator(".coop-stage canvas")).toHaveAttribute("data-player-x", "0");
    await page.keyboard.press("b");
    await page.locator(".coop-panel article").filter({ hasText: "Habitat Room" })
      .getByRole("button", { name: "Nối · north", exact: true }).click();
    await expect.poll(() => colony.bundle.buildings.exportSnapshot().foothold.structures
      .some(s => s.definitionId === "structure:habitat-room")).toBe(true);
    expect(colony.bundle.buildings.exportSnapshot().foothold.connectors
      .find(c => c.connectorId === "connector:landing:north")?.occupiedByConnectionId).not.toBeNull();
  } catch (error) {
    console.error("Co-op authority UI failure", JSON.stringify({
      submitted: submitted.slice(-5), results: results.slice(-5),
      feedback: await page.locator(".coop-context").textContent().catch(() => "Unavailable"),
      colony: colony.bundle.colonyDepth.read(),
      containers: colony.bundle.items.exportSnapshot().containers,
    }));
    throw error;
  } finally {
    clearInterval(timer);
    while (stepping) await new Promise((resolve) => setTimeout(resolve, 10));
    for (const ws of peers.values()) ws.close();
    await new Promise<void>((resolve) => wsServer.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await colony.destroy();
  }
});

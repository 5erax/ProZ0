import { COLONY_ACTIONS } from "../../simulation/sustenance/ColonySustenanceAuthority";
import type { FacingDirection } from "../../simulation";
import { phase1IsometricFacing } from "./Phase1IsometricProjection";
import { createColonyAudio } from "../presentation/ColonyAudio";
import { HostedClientConnection } from "../network/HostedClientConnection";
import {
  HOSTED_PROTOCOL_VERSION,
  type ClientHelloV1,
  type JsonValue,
} from "../../protocol";
import type { ColonySceneV1 } from "../../protocol/v1/ColonySceneV1";
import {
  normalizePilotEndpoint,
  roomStorageKey,
  type ColonyRoomDetails,
} from "./ColonyCoopLauncher";
import { createPhase1ContentCatalog } from "../../content";
import { COLONY_RESEARCH } from "../../content/phase2/ColonyDepthContent";
import { colonyBiomeAt } from "../../world/phase2/ColonyRegions";
import {
  applyProductionSprite,
  playerActorSprite,
  itemIconSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
  type Phase1ProductionSprite,
} from "../presentation/Phase1ProductionAssets";
import {
  colonyTerrainSprite,
  colonyLandmarkSprite,
  colonyResourceSprite,
  colonyFacilitySprite,
} from "../presentation/ColonyRegionSprites";
import { colonySurveySites } from "../../world/phase2/ColonyRegions";
import { createColonySettings } from "./ColonySettings";

interface Inventory {
  stacks: {
    stackId: string;
    itemDefinitionId: string;
    quantity: number;
    condition: number | null;
  }[];
}
export async function bootColonyCoop(
  root: HTMLElement,
  query: URLSearchParams,
) {
  const endpoint = normalizePilotEndpoint(
      query.get("proz0Server") ?? location.origin + "/api/pilot",
    ),
    id = query.get("proz0Room") ?? "";
  if (!/^[a-f0-9]{16}$/.test(id)) throw Error("Missing room code");
  const storageKey = roomStorageKey(endpoint, id),
    fragment = new URLSearchParams(location.hash.slice(1));
  let details: ColonyRoomDetails;
  const cached = localStorage.getItem(storageKey);
  if (fragment.has("invitation")) {
    const accessToken = fragment.get("invitation")!;
    history.replaceState(null, "", location.pathname + location.search);
    const response = await fetch(endpoint + "/rooms/" + id, {
      headers: { Authorization: "Bearer " + accessToken },
    });
    if (!response.ok) throw Error("Invitation rejected");
    details = { ...(await response.json()), accessToken };
    localStorage.setItem(storageKey, JSON.stringify(details));
  } else if (cached) {
    details = JSON.parse(cached);
  } else throw Error("Join this room using its invitation");
  const document = root.ownerDocument,
    catalog = createPhase1ContentCatalog();
  root.style.cssText =
    "position:relative;width:100vw;height:100vh;overflow:hidden;background:#142732";
  root.dataset.runtimeMode = "colony-coop";
  const stage = document.createElement("div");
  stage.className = "coop-stage";
  stage.style.cssText =
    "position:absolute;width:640px;height:360px;left:50%;top:50%;transform-origin:center;";
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  canvas.style.cssText =
    "position:absolute;left:0;top:0;width:640px;height:360px;pointer-events:none";
  stage.append(canvas);
  root.append(stage);
  const style = document.createElement("style");
  style.textContent =
    ".coop-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#0b1721f5;color:#eef4e6;border:1px solid #809799;padding:12px;width:min(600px,85vw);max-height:60vh;overflow:auto;font:12px monospace;z-index:1000000}.coop-panel button,.coop-nav button{padding:8px;background:#14232d;color:#eef4e6;border:1px solid #809799;font:inherit;cursor:pointer}.coop-panel[hidden]{display:none}.coop-panel article{display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #405655}.coop-nav{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;font:12px monospace;z-index:1000001}";
  root.append(style);
  const connectionStatus = document.createElement("div");
  connectionStatus.setAttribute("role", "status");
  connectionStatus.dataset.coopStatus = "connecting";
  connectionStatus.style.cssText =
    "position:absolute;top:12px;left:12px;color:#eef4e6;background:#0b1721e6;padding:8px;font:12px monospace;z-index:1000000";
  root.append(connectionStatus);
  const stats = document.createElement("div");
  stats.style.cssText =
    "position:absolute;bottom:14px;right:12px;color:#eef4e6;background:#0b1721e6;padding:8px;font:12px monospace";
  root.append(stats);
  const settings = createColonySettings(root),
    settingsPanel = root.querySelector<HTMLElement>("[data-colony-settings]")!;
  const audio = createColonyAudio(settingsPanel);
  const nav = document.createElement("nav");
  nav.className = "coop-nav";
  root.append(nav);
  const panel = document.createElement("section");
  panel.className = "coop-panel";
  panel.hidden = true;
  root.append(panel);
  let panelKind: string | null = null,
    feedback = "",
    lastOperation: string | null = null,
    connection: HostedClientConnection | null = null,
    socket: WebSocket | null = null,
    destroyed = false,
    retry = 0,
    reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let scene: ColonySceneV1 | null = null,
    signature = "",
    frame = 0;
  const visualPositions = new Map<string, { x: number; y: number }>();
  let lastFrame = performance.now();
  let placing: { definitionId: string; stackId: string } | null = null;
  const pressed = new Set<string>(),
    nodes = new Map<string, HTMLElement>();
  const credentialKey = storageKey + ":resume";
  let resume = localStorage.getItem(credentialKey);
  const clientKey = storageKey + ":client";
  let client = localStorage.getItem(clientKey);
  if (!client) {
    client = Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem(clientKey, client);
  }
  const aggregate = (type: string, key: string) =>
    connection?.replication.get(type, key) ?? null;
  const inventory = (): Inventory =>
    (aggregate("container", "inventory:" + connection?.getPlayerId())
      ?.state as unknown as Inventory) ?? { stacks: [] };
  const command = (
    commandType: string,
    payload: unknown,
    refs: { aggregateType: string; aggregateId: string; revision: number }[],
  ) => {
    if (connection?.getState() !== "READY") {
      feedback = "Reconnect before interacting";
      return;
    }
    if (lastOperation !== null) return;
    lastOperation = "coop:" + crypto.randomUUID();
    feedback = "Working…";
    signature = "";
    connection.sendGameplayCommand({
      operationId: lastOperation,
      commandType,
      expectedRevisions: refs,
      payload: payload as JsonValue,
    });
  };
  const containerRef = () => {
    const key = "inventory:" + connection?.getPlayerId();
    return {
      aggregateType: "container",
      aggregateId: key,
      revision: aggregate("container", key)?.revision ?? 0,
    };
  };
  stage.addEventListener("click", (event) => {
    if (!placing || !connection || root.dataset.colonySettingsOpen === "true")
      return;
    const local = connection
      .getPlayerMotions()
      .find((p) => p.playerId === connection?.getPlayerId());
    if (!local) return;
    const rect = stage.getBoundingClientRect(),
      screenX = ((event.clientX - rect.left) * 640) / rect.width - 320,
      screenY = ((event.clientY - rect.top) * 360) / rect.height - 180;
    const anchor = {
      x: Math.round(local.position.x + screenX / 32 + screenY / 16),
      y: Math.round(local.position.y + screenY / 16 - screenX / 32),
    };
    const inv = containerRef();
    command(
      "building.place",
      {
        inventoryContainerId: inv.aggregateId,
        sourceKitStackId: placing.stackId,
        structureDefinitionId: placing.definitionId,
        placement: { mode: "free", ...anchor, orientationQuarterTurns: 0 },
      },
      [
        inv,
        {
          aggregateType: "foothold",
          aggregateId: "foothold:landing",
          revision: aggregate("foothold", "foothold:landing")?.revision ?? 0,
        },
      ],
    );
    placing = null;
  });
  const gather = (entity: ColonySceneV1["entities"][number]) => {
    const inv = containerRef(),
      tool = inventory().stacks.find(
        (s) => s.itemDefinitionId === "item:stone-field-tool",
      );
    command(
      "item.gather",
      {
        inventoryContainerId: inv.aggregateId,
        resourceEntityId: entity.id,
        ...(tool ? { toolStackId: tool.stackId } : {}),
      },
      [
        inv,
        {
          aggregateType: "resource",
          aggregateId: entity.id,
          revision:
            aggregate("resource", entity.id)?.revision ?? entity.revision,
        },
      ],
    );
  };
  const makeButton = (
    parent: HTMLElement,
    text: string,
    action: () => void,
  ) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.addEventListener("click", action);
    parent.append(button);
    return button;
  };
  for (const [kind, label] of [
    ["inventory", "▣"],
    ["craft", "⚒"],
    ["build", "⌂"],
    ["research", "⚗"],
    ["journal", "◇"],
  ]) {
    const button = makeButton(nav, label!, () => {
      panelKind = panelKind === kind ? null : kind!;
      signature = "";
    });
    button.setAttribute("aria-label", kind!);
    button.title = kind!;
  }
  makeButton(settingsPanel, "Fullscreen", () => {
    void root.requestFullscreen?.();
  });
  makeButton(settingsPanel, "Save shared world", () => {
    void (async () => {
      if (!details.ownerToken) {
        feedback = "Only the host can save this shared world";
        return;
      }
      const response = await fetch(endpoint + "/rooms/" + id + "/save", {
        method: "POST",
        headers: { Authorization: "Bearer " + details.ownerToken },
      });
      if (!response.ok) throw Error("Shared save failed");
      const result = await response.json();
      feedback = "World saved · checkpoint " + result.checkpoint;
      root.dataset.coopCheckpoint = String(result.checkpoint);
      saveStatus.textContent = feedback;
    })().catch(() => {
      saveStatus.textContent = "Save failed · retry before leaving";
    });
  }).disabled = !details.ownerToken;
  const saveStatus = document.createElement("p");
  saveStatus.setAttribute("role", "status");
  settingsPanel.append(saveStatus);
  makeButton(settingsPanel, "Copy invitation", () => {
    const url = new URL(location.href);
    url.hash = new URLSearchParams({
      invitation: details.accessToken,
    }).toString();
    void navigator.clipboard
      .writeText(url.href)
      .then(() => {
        saveStatus.textContent = "Invitation copied · maximum 3 players";
      })
      .catch(() => {
        saveStatus.textContent = "Clipboard unavailable";
      });
  });
  makeButton(settingsPanel, "Reconnect", () => {
    socket?.close();
  });
  makeButton(settingsPanel, "Export shared world backup", () => {
    void (async () => {
      if (!details.ownerToken) return;
      const headers = { Authorization: "Bearer " + details.ownerToken };
      const saved = await fetch(endpoint + "/rooms/" + id + "/save", {
        method: "POST",
        headers,
      });
      if (!saved.ok) throw Error("Save failed");
      const response = await fetch(endpoint + "/rooms/" + id + "/export", {
        headers,
      });
      if (!response.ok) throw Error("Export failed");
      const url = URL.createObjectURL(await response.blob()),
        link = document.createElement("a");
      link.href = url;
      link.download = "proz0-shared-world.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      saveStatus.textContent = "Shared world backup exported";
    })().catch(() => {
      saveStatus.textContent = "Backup failed · retry shortly";
    });
  }).disabled = !details.ownerToken;
  function renderPanel() {
    if (panelKind === null) {
      panel.hidden = true;
      signature = "";
      return;
    }
    const next = JSON.stringify([
      panelKind,
      connection?.replication
        .snapshot()
        .filter((v) =>
          ["container", "colony-depth", "equipment"].includes(v.aggregateType),
        )
        .map((v) => [v.aggregateId, v.revision]),
      feedback,
    ]);
    if (next === signature) return;
    signature = next;
    panel.hidden = panelKind === null;
    panel.replaceChildren();
    if (panelKind === null) return;
    const title = document.createElement("h2");
    title.textContent = panelKind.toUpperCase();
    panel.append(title);
    makeButton(panel, "Close", () => {
      panelKind = null;
      signature = "";
    });
    const inv = containerRef();
    const local = connection
      ?.getPlayerMotions()
      .find((p) => p.playerId === connection?.getPlayerId());
    const storage = scene?.entities.find(
      (e) =>
        e.definitionId === "structure:storage-crate" &&
        local &&
        Math.hypot(e.x - local.position.x, e.y - local.position.y) <= 1.25,
    );
    const storageId = storage
      ? (aggregate("structure", storage.id)?.state as { containerId?: string })
          ?.containerId
      : null;
    const storageView = storageId ? aggregate("container", storageId) : null;
    const transfer = (
      stack: Inventory["stacks"][number],
      fromStorage: boolean,
    ) => {
      if (!storageId || !storageView) return;
      command(
        "item.transfer",
        {
          sourceContainerId: fromStorage ? storageId : inv.aggregateId,
          targetContainerId: fromStorage ? inv.aggregateId : storageId,
          sourceStackId: stack.stackId,
          quantity: stack.quantity,
        },
        [
          inv,
          {
            aggregateType: "container",
            aggregateId: storageId,
            revision: storageView.revision,
          },
        ],
      );
    };
    if (panelKind === "help") {
      const text = document.createElement("p");
      text.textContent =
        "WASD move · click a nearby resource to gather · I inventory · C craft · B build · U research · J journal · Escape close. Share the private invitation from Settings. Settings pauses your input.";
      panel.append(text);
    }
    if (panelKind === "inventory") {
      const hint = document.createElement("p");
      hint.textContent = storageView
        ? "Nearby storage · move a stack in either direction"
        : "Stand beside a storage crate to put supplies away.";
      panel.append(hint);
      for (const stack of [...inventory().stacks].sort((a, b) =>
        a.itemDefinitionId.localeCompare(b.itemDefinitionId),
      )) {
        const row = document.createElement("article");
        row.dataset.stackId = stack.stackId;
        const icon = document.createElement("span");
        const image = itemIconSprite(stack.itemDefinitionId);
        if (image) applyProductionSprite(icon, image);
        row.append(icon);
        row.append(
          catalog.getAs(stack.itemDefinitionId, "item").displayName +
            " ×" +
            stack.quantity,
        );
        const profile = catalog.getAs(
          stack.itemDefinitionId,
          "item",
        ).useProfile;
        if (profile?.type === "restore-stat")
          makeButton(row, "Use", () =>
            command(
              "item.consume",
              {
                inventoryContainerId: inv.aggregateId,
                sourceStackId: stack.stackId,
              },
              [inv],
            ),
          );
        if (
          profile?.type === "melee-weapon" ||
          profile?.type === "thermal-protection"
        ) {
          const slot =
              profile.type === "melee-weapon" ? "weapon" : "protection",
            equipment = aggregate("equipment", connection!.getPlayerId()!)
              ?.state as {
              equippedWeaponStackId?: string;
              equippedThermalWrapStackId?: string;
            },
            equipped =
              (slot === "weapon"
                ? equipment?.equippedWeaponStackId
                : equipment?.equippedThermalWrapStackId) === stack.stackId;
          makeButton(row, equipped ? "Unequip" : "Equip", () =>
            command(
              "equipment.set",
              { slot, stackId: equipped ? null : stack.stackId },
              [inv],
            ),
          );
        }
        if (storageView)
          makeButton(row, "Store stack", () => transfer(stack, false));
        panel.append(row);
      }
      if (storageView) {
        const heading = document.createElement("h3");
        heading.textContent = "Storage";
        panel.append(heading);
        for (const stack of (storageView.state as unknown as Inventory)
          .stacks) {
          const row = document.createElement("article");
          row.append(
            catalog.getAs(stack.itemDefinitionId, "item").displayName +
              " ×" +
              stack.quantity,
          );
          makeButton(row, "Take stack", () => transfer(stack, true));
          panel.append(row);
        }
      }
    }
    if (panelKind === "craft")
      for (const recipe of catalog.list("recipe")) {
        const row = document.createElement("article");
        row.append(recipe.displayName);
        for (const cost of recipe.inputs) {
          const icon = document.createElement("span"),
            image = itemIconSprite(cost.itemId);
          if (image) applyProductionSprite(icon, image);
          icon.title =
            catalog.getAs(cost.itemId, "item").displayName +
            " ×" +
            cost.quantity;
          row.append(icon, "×" + cost.quantity);
        }
        makeButton(row, "Craft", () => {
          const workbench = scene?.entities.find(
            (e) =>
              recipe.tier === "workbench" &&
              e.definitionId === "structure:workbench" &&
              local &&
              Math.hypot(e.x - local.position.x, e.y - local.position.y) <=
                1.25,
          );
          command(
            "item.craft",
            {
              inventoryContainerId: inv.aggregateId,
              recipeId: recipe.id,
              ...(workbench ? { workbenchStructureId: workbench.id } : {}),
            },
            [
              inv,
              ...(workbench
                ? [
                    {
                      aggregateType: "structure",
                      aggregateId: workbench.id,
                      revision:
                        aggregate("structure", workbench.id)?.revision ??
                        workbench.revision,
                    },
                  ]
                : []),
            ],
          );
        });
        panel.append(row);
      }
    if (panelKind === "build") {
      const hint = document.createElement("p");
      hint.textContent =
        "Choose a facility, close this panel, then click the ground nearby. Building uses a crafted kit.";
      panel.append(hint);
      const farming = document.createElement("details"),
        label = document.createElement("summary");
      label.textContent = "Cultivation and husbandry";
      farming.append(label);
      const state = aggregate("colony-sustenance", "colony");
      for (const action of COLONY_ACTIONS)
        makeButton(farming, action.replaceAll("-", " "), () => {
          const animal = scene?.entities.find(
            (e) => e.type === "passive-wildlife",
          );
          command(
            "colony.sustenance",
            {
              action,
              ...(action === "capture"
                ? { animalEntityId: animal?.id ?? "" }
                : {}),
            },
            [
              inv,
              {
                aggregateType: "colony-sustenance",
                aggregateId: "colony",
                revision: state?.revision ?? 0,
              },
            ],
          );
        });
      panel.append(farming);
      for (const definition of catalog.list("structure"))
        if (definition.sourceKitItemId) {
          const row = document.createElement("article");
          row.append(definition.displayName);
          const kit = inventory().stacks.find(
            (s) => s.itemDefinitionId === definition.sourceKitItemId,
          );
          const button = makeButton(row, "Place", () => {
            placing = { definitionId: definition.id, stackId: kit!.stackId };
            panelKind = null;
            feedback = "Click nearby ground to place " + definition.displayName;
            signature = "";
          });
          button.disabled = !kit;
          panel.append(row);
        }
    }
    if (panelKind === "research")
      for (const research of COLONY_RESEARCH) {
        const row = document.createElement("article");
        row.append(research.name);
        const colony = aggregate("colony-depth", "colony");
        makeButton(row, "Research", () =>
          command(
            "colony.depth",
            { action: "research", targetId: research.id },
            [
              inv,
              {
                aggregateType: "colony-depth",
                aggregateId: "colony",
                revision: colony?.revision ?? 0,
              },
            ],
          ),
        );
        panel.append(row);
      }
    if (panelKind === "journal") {
      const colony = aggregate("colony-depth", "colony"),
        inspected =
          (colony?.state as { inspectedSites?: string[] })?.inspectedSites ??
          [];
      const sites = colonySurveySites(details.worldSeed).filter(
        (site) =>
          inspected.includes(site.id) ||
          scene?.sites.some((s) => s.id === site.id),
      );
      for (const site of sites) {
        const row = document.createElement("article");
        row.append(site.name);
        if (inspected.includes(site.id)) {
          const text = document.createElement("p");
          text.textContent = site.observation + " " + site.unresolved;
          row.append(text);
        } else {
          const button = makeButton(row, "Inspect nearby", () =>
            command(
              "colony.depth",
              { action: "inspect-site", targetId: site.id },
              [
                inv,
                {
                  aggregateType: "colony-depth",
                  aggregateId: "colony",
                  revision: colony?.revision ?? 0,
                },
              ],
            ),
          );
          button.disabled =
            !local ||
            Math.hypot(
              local.position.x - site.position.x,
              local.position.y - site.position.y,
            ) > 1.25;
        }
        panel.append(row);
      }
    }
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = feedback;
    panel.append(status);
  }
  function connect() {
    if (destroyed) return;
    connectionStatus.textContent = "Connecting to shared world…";
    connectionStatus.dataset.coopStatus = "connecting";
    const url = new URL(endpoint + "/rooms/" + id + "/socket");
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url.href, [
      "proz0.access." + details.accessToken,
      "proz0.client." + client,
    ]);
    const current = socket;
    current.addEventListener("open", () => {
      let operationQueried = false;
      connection = new HostedClientConnection({
        transport: {
          sendText(text) {
            current.send(text);
          },
          close() {
            current.close();
          },
        },
        hello: {
          protocolVersion: HOSTED_PROTOCOL_VERSION,
          contentCompatibility: details.contentCompatibility,
          worldCompatibility: details.worldCompatibility,
          ...(resume ? { resumeCredential: resume } : {}),
        } as ClientHelloV1,
      });
      connection.subscribeReadModel(() => {
        if (connection?.getState() === "READY") {
          const issued = connection.getResumeCredential();
          if (issued) {
            resume = issued;
            localStorage.setItem(credentialKey, issued);
          }
          connectionStatus.dataset.coopStatus = "ready";
          root.dataset.runtimeStatus = "ready";
          root.dataset.coopPlayerId = connection.getPlayerId()!;
          retry = 0;
          const view = aggregate("colony-scene", connection.getPlayerId()!);
          if (view && !view.tombstone)
            scene = view.state as unknown as ColonySceneV1;
          if (lastOperation) {
            if (!operationQueried) {
              operationQueried = true;
              connection.queryOperation(lastOperation);
            }
            const result = connection.getCommandResult(lastOperation);
            if (result) {
              feedback =
                result.status === "committed"
                  ? "✓ Action completed"
                  : (result.reason ?? "Action rejected");
              root.dataset.coopAction = result.status;
              lastOperation = null;
              signature = "";
            } else if (
              connection.getOperationStatus(lastOperation)?.state === "unknown"
            ) {
              lastOperation = null;
              feedback =
                "Check your inventory before repeating the last action.";
              signature = "";
            }
          }
        } else if (connection?.getState() === "RESYNC_REQUIRED") {
          current.close(1012, "Resync");
        } else if (connection?.getState() === "CLOSED") {
          feedback =
            "Room full or saved identity rejected. Rejoin with your original invitation.";
          connectionStatus.textContent = feedback;
          connectionStatus.dataset.coopStatus = "rejected";
          current.close(1000);
        }
      });
      connection.start();
    });
    current.addEventListener("message", (event) => {
      if (current !== socket || typeof event.data !== "string") return;
      try {
        const envelope = JSON.parse(event.data);
        if (
          envelope.messageType === "SESSION_REJECTED" &&
          envelope.payload.reason === "PLAYER_ALREADY_CONNECTED"
        ) {
          current.close(1012, "Previous connection closing");
          return;
        }
      } catch {
        /* Existing protocol decoder handles invalid JSON. */
      }
      connection?.handleText(event.data);
    });
    current.addEventListener("close", () => {
      if (current !== socket) return;
      pressed.clear();
      scene = null;
      if (destroyed || connectionStatus.dataset.coopStatus === "rejected")
        return;
      connectionStatus.dataset.coopStatus = "reconnecting";
      connectionStatus.textContent =
        "Connection lost · reconnecting to your colonist…";
      root.dataset.runtimeStatus = "reconnecting";
      reconnectTimer = setTimeout(
        connect,
        Math.min(1000 * 2 ** retry++, 10000),
      );
    });
    current.addEventListener("error", () => {
      connectionStatus.textContent = "Server unavailable · reconnecting…";
    });
  }
  const inputTimer = setInterval(() => {
    if (
      connection?.getState() !== "READY" ||
      socket?.readyState !== WebSocket.OPEN
    )
      return;
    const active =
      panelKind === null && root.dataset.colonySettingsOpen !== "true";
    const up = active && pressed.has("KeyW"),
      down = active && pressed.has("KeyS"),
      left = active && pressed.has("KeyA"),
      right = active && pressed.has("KeyD");
    connection.sendMovement({
      up: up || right,
      down: down || left,
      left: up || left,
      right: down || right,
    });
  }, 50);
  const keyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    )
      return;
    if (event.code === "Escape") {
      panelKind = null;
      signature = "";
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
      pressed.add(event.code);
    }
    if (root.dataset.colonySettingsOpen === "true") return;
    if (!event.repeat) {
      const kind: Record<string, string> = {
        KeyI: "inventory",
        KeyC: "craft",
        KeyU: "research",
        KeyJ: "journal",
        KeyB: "build",
        KeyH: "help",
      };
      if (kind[event.code]) {
        panelKind = panelKind === kind[event.code] ? null : kind[event.code]!;
        signature = "";
      }
    }
  };
  const keyUp = (event: KeyboardEvent) => pressed.delete(event.code),
    blur = () => pressed.clear();
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur);
  function render() {
    if (destroyed) return;
    frame = requestAnimationFrame(render);
    renderPanel();
    const scale = Math.max(
      1,
      Math.min(
        Math.floor(innerWidth / 640),
        Math.floor(innerHeight / 360),
        Number(root.dataset.displayLimit ?? Infinity) || Infinity,
      ),
    );
    stage.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
    canvas.dataset.displayScale = String(scale);
    if (!scene || connection?.getState() !== "READY") return;
    const motions = connection.getPlayerMotions(),
      local = motions.find((p) => p.playerId === connection?.getPlayerId());
    if (!local) return;
    const now = performance.now(),
      blend = 1 - Math.exp(-Math.min(now - lastFrame, 100) / 65);
    lastFrame = now;
    for (const motion of motions) {
      const previous = visualPositions.get(motion.playerId);
      if (
        !previous ||
        Math.hypot(
          previous.x - motion.position.x,
          previous.y - motion.position.y,
        ) > 8
      )
        visualPositions.set(motion.playerId, { ...motion.position });
      else {
        previous.x += (motion.position.x - previous.x) * blend;
        previous.y += (motion.position.y - previous.y) * blend;
      }
    }
    const camera = visualPositions.get(local.playerId)!;
    canvas.dataset.playerX = String(local.position.x);
    canvas.dataset.playerY = String(local.position.y);
    canvas.dataset.authorityTick = String(
      connection.replication.getAuthorityTick(),
    );
    canvas.dataset.teammateCount = String(motions.length - 1);
    audio.region(colonyBiomeAt(scene.worldSeed, local.position));
    connectionStatus.textContent = placing
      ? "Click nearby ground to place facility"
      : "CO-OP · " + motions.length + "/3";
    stats.textContent =
      "♥ " +
      scene.survival.health.toFixed(0) +
      "  Water " +
      scene.survival.water.toFixed(0) +
      "  Food " +
      scene.survival.food.toFixed(0);
    const used = new Set<string>();
    const sprite = (
      key: string,
      definition: Phase1ProductionSprite,
      x: number,
      y: number,
      type: string,
      action?: () => void,
    ) => {
      used.add(key);
      let node = nodes.get(key);
      if (!node) {
        node = document.createElement(action ? "button" : "div");
        node.style.cssText =
          "position:absolute;padding:0;border:0;background-color:transparent;image-rendering:pixelated;";
        nodes.set(key, node);
        stage.append(node);
      }
      node.dataset.coopEntity = key;
      node.dataset.worldRole = type;
      node.dataset.worldX = String(x);
      node.dataset.worldY = String(y);
      const scale = type === "terrain" ? 64 / definition.cellWidth : 1;
      const spriteIdentity =
        definition.assetPath + ":" + definition.index + ":" + scale;
      if (node.dataset.spriteIdentity !== spriteIdentity) {
        applyProductionSprite(node, definition, scale);
        node.dataset.spriteIdentity = spriteIdentity;
      }
      node.style.left =
        Math.round(
          320 +
            (x - camera.x - y + camera.y) * 16 -
            (definition.cellWidth * scale) / 2,
        ) + "px";
      node.style.top =
        Math.round(
          180 +
            (x - camera.x + y - camera.y) * 8 -
            (definition.cellHeight * scale) / (type === "terrain" ? 2 : 1),
        ) + "px";
      node.style.zIndex = String(
        type === "terrain" ? -10000 : Math.floor((x + y) * 10) + 10000,
      );
      node.onclick = action ?? null;
    };
    for (const cell of scene.terrain)
      sprite(
        "tile:" + cell.x + ":" + cell.y,
        colonyTerrainSprite(
          colonyBiomeAt(scene.worldSeed, cell),
          cell.terrain,
          Math.abs(Math.floor(cell.x + cell.y)) % 4,
        ),
        cell.x,
        cell.y,
        "terrain",
      );
    for (const e of scene.entities) {
      let definition: Phase1ProductionSprite =
        PHASE1_PRODUCTION_WORLD_SPRITES.ruin;
      if (e.type === "resource")
        definition = colonyResourceSprite(
          colonyBiomeAt(scene.worldSeed, e),
          e.definitionId,
          e.depleted,
        );
      if (e.type === "passive-wildlife")
        definition = PHASE1_PRODUCTION_WORLD_SPRITES.passiveWildlife;
      if (e.type === "hostile")
        definition = PHASE1_PRODUCTION_WORLD_SPRITES.predator;
      if (e.type === "colony-site")
        definition = colonyFacilitySprite(
          e.definitionId === "colony:bed" ? "bed" : "pen",
        );
      if (e.type === "structure") {
        const mapping: Record<string, Phase1ProductionSprite> = {
          "structure:landing-module":
            PHASE1_PRODUCTION_WORLD_SPRITES.landingModule,
          "structure:storage-crate":
            PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate,
          "structure:workbench": PHASE1_PRODUCTION_WORLD_SPRITES.workbench,
        };
        definition =
          mapping[e.definitionId] ?? PHASE1_PRODUCTION_WORLD_SPRITES.habitat;
      }
      sprite(
        e.id,
        definition,
        e.x,
        e.y,
        e.type,
        e.type === "resource" ? () => gather(e) : undefined,
      );
      nodes
        .get(e.id)!
        .setAttribute(
          "aria-label",
          e.type === "resource"
            ? "Gather " + catalog.getAs(e.definitionId, "resource").displayName
            : e.definitionId,
        );
    }
    for (const site of scene.sites) {
      const authored = colonySurveySites(scene.worldSeed).find(
        (s) => s.id === site.id,
      );
      if (authored)
        sprite(site.id, colonyLandmarkSprite(authored), site.x, site.y, "site");
    }
    for (const motion of motions) {
      const actor = playerActorSprite(
          phase1IsometricFacing((motion.facing ?? "E") as FacingDirection)!,
          motion.locomotionState === "IDLE" ? "IDLE" : "MOVE",
          Math.floor(motion.authorityTick / 8),
        ),
        position = visualPositions.get(motion.playerId)!;
      sprite(motion.playerId, actor.sprite, position.x, position.y, "player");
      nodes.get(motion.playerId)!.style.transform = actor.flipX
        ? "scaleX(-1)"
        : "";
      nodes.get(motion.playerId)!.title = motion.playerId;
    }
    for (const [key, node] of nodes)
      if (!used.has(key)) {
        node.remove();
        nodes.delete(key);
      }
  }
  connect();
  render();
  document.title = "ProZ0 — Private colony co-op";
  return {
    destroy() {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(inputTimer);
      cancelAnimationFrame(frame);
      socket?.close();
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      audio.destroy();
      settings.destroy();
      root.replaceChildren();
    },
  };
}

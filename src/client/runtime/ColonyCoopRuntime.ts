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
import { playerSkinFilter } from "./PlayerProfile";
import { createCoopSocial } from "./CoopSocial";
import { COLONY_PROFESSIONS } from "../../content/phase2/ColonyDepthContent";
import { colonyWeatherAt } from "../../world/phase2/ColonyRegions";
import { computeContainerUsage } from "../../simulation/items/ItemCapacity";

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
  const worldLayer = document.createElement("div");
  worldLayer.style.cssText = "position:absolute;inset:0;will-change:transform";
  stage.append(worldLayer);
  root.append(stage);
  const style = document.createElement("style");
  style.textContent =
    ".coop-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#0b1721f5;color:#eef4e6;border:1px solid #809799;padding:12px;width:min(600px,85vw);max-height:60vh;overflow:auto;font:12px monospace;z-index:1000000}.coop-panel button,.coop-nav button{padding:8px;background:#14232d;color:#eef4e6;border:1px solid #809799;font:inherit;cursor:pointer}.coop-panel[hidden]{display:none}.coop-panel article{display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #405655}.coop-nav{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;font:12px monospace;z-index:1000001}";
  root.append(style);
  style.textContent += `.coop-stage{overflow:hidden;background:#142732}.coop-panel{width:min(760px,90vw);max-height:74vh;padding:18px;font:clamp(12px,1.05vw,17px) monospace;border:2px solid #a7b6ad;box-sizing:border-box}.coop-panel h2{font-size:1.2em;margin:0 0 12px}.coop-panel article{padding:10px;gap:12px;flex-wrap:wrap}.coop-panel button:disabled{opacity:.45;cursor:not-allowed}.coop-panel .coop-cost{display:inline-flex;align-items:center;gap:4px;font-size:.8em}.coop-cost[data-affordable=false]{color:#e5ae78}.coop-hud{position:absolute;left:12px;top:12px;width:170px;background:#09131de8;border:1px solid #a7b6ad;padding:10px;color:#e2e9dc;font:12px monospace;z-index:1000000}.coop-stat{display:flex;gap:8px;align-items:center;margin:5px 0}.coop-stat meter{width:85px;height:10px;accent-color:#d7e4d1}.coop-region{position:absolute;top:12px;left:50%;transform:translateX(-50%);color:#d4ddcc;background:#0b1721d9;padding:6px 12px;font:12px monospace;pointer-events:none}.coop-equipment{position:absolute;bottom:12px;left:12px;max-width:180px;background:#0b1721e6;border:1px solid #809799;padding:8px;color:#dce7d6;font:12px monospace;z-index:1000000}.coop-context{position:absolute;bottom:70px;left:50%;transform:translateX(-50%);max-width:55vw;padding:8px;color:#e8ecd8;background:#0b1721ec;font:12px monospace;z-index:1000000;text-align:center}.coop-context:empty{display:none}.coop-name{position:absolute;transform:translate(-50%,-100%);background:#0b1721c9;padding:2px 4px;color:#dce6d4;white-space:nowrap;font:7px monospace;pointer-events:none;z-index:900000}.coop-map{display:block;width:100%;height:300px;background:#142732;border:1px solid #607775;image-rendering:pixelated}.coop-nav{bottom:16px}.coop-stat-name{width:20px}.coop-nav button{width:40px;height:40px}@media(max-width:700px){.coop-hud{width:126px;padding:6px;font-size:10px}.coop-stat meter{width:57px}.coop-region{top:12px;left:160px;right:52px;transform:none;text-align:center;font-size:10px}.coop-equipment{bottom:58px;max-width:145px;font-size:10px}.coop-context{bottom:108px;max-width:70vw;font-size:10px}.coop-social{bottom:80px}.coop-nav{bottom:10px}.coop-panel article{padding:8px}}`;
  const connectionStatus = document.createElement("div");
  connectionStatus.setAttribute("role", "status");
  connectionStatus.dataset.coopStatus = "connecting";
  connectionStatus.style.cssText =
    "position:absolute;top:170px;left:12px;color:#eef4e6;background:#0b1721e6;padding:6px;font:10px monospace;z-index:1000000";
  root.append(connectionStatus);
  const stats = document.createElement("div");
  stats.style.cssText =
    "position:absolute;bottom:14px;right:12px;color:#eef4e6;background:#0b1721e6;padding:8px;font:12px monospace";
  root.append(stats);
  const hud = document.createElement("section");
  hud.className = "coop-hud";
  hud.setAttribute("aria-label", "Survival");
  root.append(hud);
  const statRows = new Map<
    string,
    { meter: HTMLMeterElement; value: HTMLElement }
  >();
  for (const [key, label] of [
    ["health", "♥"],
    ["water", "💧"],
    ["food", "●"],
    ["stamina", "ϟ"],
    ["temperature", "♨"],
  ]) {
    const row = document.createElement("div");
    row.className = "coop-stat";
    row.title = key!;
    row.dataset.survivalStat = key!;
    const name = document.createElement("span");
    name.className = "coop-stat-name";
    name.textContent = label!;
    const meter = document.createElement("meter");
    meter.min = 0;
    meter.max = 100;
    meter.setAttribute("aria-label", key!);
    const value = document.createElement("span");
    row.append(name, meter, value);
    hud.append(row);
    statRows.set(key!, { meter, value });
  }
  const region = document.createElement("div");
  region.className = "coop-region";
  root.append(region);
  const equipmentHud = document.createElement("div");
  equipmentHud.className = "coop-equipment";
  equipmentHud.dataset.coopEquipment = "";
  root.append(equipmentHud);
  const context = document.createElement("div");
  context.className = "coop-context";
  context.setAttribute("role", "status");
  root.append(context);
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
  const social = createCoopSocial(root, {
    playerId: () => connection?.getPlayerId() ?? null,
    ready: () => connection?.getState() === "READY",
    send: (value) => {
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(value));
    },
  });
  let focused: ColonySceneV1["entities"][number] | null = null;
  let feedbackUntil = 0;
  let scene: ColonySceneV1 | null = null,
    signature = "",
    frame = 0;
  const visualPositions = new Map<string, { x: number; y: number }>();
  let staticScene: ColonySceneV1 | null = null;
  const staticKeys = new Set<string>();
  const setText = (element: HTMLElement, text: string) => {
    if (element.textContent !== text) element.textContent = text;
  };
  let lastFrame = performance.now();
  let placing: { definitionId: string; stackId: string } | null = null;
  const pressed = new Set<string>(),
    nodes = new Map<string, HTMLElement>();
  const credentialKey = storageKey + ":resume";
  let resume = localStorage.getItem(credentialKey);
  const clientKey = storageKey + ":client";
  let client = details.clientKey ?? localStorage.getItem(clientKey);
  if (details.clientKey) localStorage.setItem(clientKey, details.clientKey);
  if (!client) {
    client = Array.from(crypto.getRandomValues(new Uint8Array(24)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem(clientKey, client);
  }
  const aggregate = (type: string, key: string) =>
    connection?.replication.get(type, key) ?? null;
  const itemImage = (id: string) =>
    itemIconSprite(catalog.getAs(id, "item").displayName);
  const rejectText = (reason: string) =>
    (
      ({
        TOOL_REQUIRED: "Cần Stone Field Tool · mở Craft [C] để chế tạo",
        OUT_OF_RANGE: "Đến gần đối tượng hơn để tương tác",
        INSUFFICIENT_ITEMS: "Chưa đủ nguyên liệu",
        COOLDOWN: "Chờ thao tác hồi lại",
        STALE_REVISION: "Dữ liệu đã thay đổi; thử lại",
        CAPACITY_EXCEEDED: "Túi đầy; cất đồ vào hòm",
        OUTSIDE_BASE_BUILD_ZONE: "Chọn vị trí gần Landing Module hoặc Habitat để mở rộng căn cứ",
        OBSTRUCTED: "Vị trí bị chắn; chọn khoảng đất trống",
        INVALID_CONNECTOR: "Điểm nối không còn hợp lệ; chọn điểm nối khác",
        CONNECTOR_OCCUPIED: "Điểm nối đã được sử dụng; chọn điểm nối khác",
        KIT_UNAVAILABLE: "Cần kit xây dựng trong túi; mở Craft [C] để chế tạo",
        SOURCE_MISSING: "Vật phẩm hoặc đối tượng đã thay đổi; mở lại bảng để chọn lại",
        RESEARCH_PREREQUISITE: "Hoàn thành nghiên cứu trước đó để mở khóa",
        ALREADY_RESEARCHED: "Nghiên cứu đã hoàn thành cho cả phòng",
        WORKBENCH_REQUIRED: "Đến gần Workbench để chế tạo công thức này",
        NOT_READY: "Chờ kết nối lại",
      }) as Record<string, string>
    )[reason] ?? reason.replaceAll("_", " ");
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
      feedbackUntil = performance.now() + 5000;
      return;
    }
    if (lastOperation !== null) return;
    lastOperation = "coop:" + crypto.randomUUID();
    root.dataset.coopAction = "pending";
    for (const button of panel.querySelectorAll<HTMLButtonElement>("button"))
      if (button.textContent !== "Close") button.disabled = true;
    feedback = "Working…";
    signature = "";
    connection.sendGameplayCommand({
      operationId: lastOperation,
      commandType,
      expectedRevisions: refs.map((ref) => ({
        ...ref,
        revision: aggregate(ref.aggregateType, ref.aggregateId)?.revision ?? ref.revision,
      })),
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
    if (!local) {
      audio.weather("clear");
      return;
    }
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
  const ref = (aggregateType: string, aggregateId: string) => ({
    aggregateType,
    aggregateId,
    revision: aggregate(aggregateType, aggregateId)?.revision ?? 0,
  });
  const localMotion = () =>
    connection
      ?.getPlayerMotions()
      .find((p) => p.playerId === connection?.getPlayerId());
  const inRange = (e: { x: number; y: number }) => {
    const p = localMotion()?.position;
    return !!p && Math.hypot(e.x - p.x, e.y - p.y) <= 1.25;
  };
  function nearestTarget(type?: string) {
    return scene?.entities
      .filter((e) => !e.depleted && (!type || e.type === type) && inRange(e))
      .sort((a, b) => {
        const p = localMotion()!.position;
        return (
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
        );
      })[0];
  }
  function targetLabel(e: ColonySceneV1["entities"][number]) {
    if (e.type === "resource")
      return (
        "Thu thập " + catalog.getAs(e.definitionId, "resource").displayName
      );
    if (e.type === "structure")
      return catalog.getAs(e.definitionId, "structure").displayName;
    return (
      (
        {
          hostile: "Tấn công [Space]",
          ruin: "Khảo sát di tích",
          "world-drop": "Nhặt đồ",
          "death-cache": "Thu hồi đồ",
          "passive-wildlife": "Chăn nuôi",
          "colony-site": "Chăm sóc thuộc địa",
        } as Record<string, string>
      )[e.type] ?? e.definitionId
    );
  }
  function attack(e: ColonySceneV1["entities"][number]) {
    const p = localMotion()?.position;
    if (!p) return;
    const length = Math.hypot(e.x - p.x, e.y - p.y) || 1;
    command(
      "combat.attack",
      {
        inventoryContainerId: containerRef().aggregateId,
        predatorEntityId: e.id,
        facingX: (e.x - p.x) / length,
        facingY: (e.y - p.y) / length,
      },
      [containerRef()],
    );
  }
  function interact(e: ColonySceneV1["entities"][number]) {
    pressed.clear();
    if (!inRange(e)) {
      feedback = "Đến gần đối tượng hơn để tương tác";
      feedbackUntil = performance.now() + 5000;
      return;
    }
    if (e.type === "resource") {
      gather(e);
      return;
    }
    if (e.type === "hostile") {
      attack(e);
      return;
    }
    if (e.type === "world-drop" && e.containerId) {
      command(
        "item.pickup",
        {
          inventoryContainerId: containerRef().aggregateId,
          worldDropId: e.id,
          dropContainerId: e.containerId,
        },
        [
          containerRef(),
          ref("world-drop", e.id),
          ref("container", e.containerId),
        ],
      );
      return;
    }
    focused = e;
    panelKind =
      e.type === "colony-site" || e.type === "passive-wildlife"
        ? "build"
        : "object";
    signature = "";
  }
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
    ["map", "⌖"],
    ["professions", "♙"],
  ]) {
    const button = makeButton(nav, label!, () => {
      panelKind = panelKind === kind ? null : kind!;
      pressed.clear();
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
  makeButton(settingsPanel, "Về sảnh", () => {
    void (async () => {
      if (details.ownerToken) {
        const saved = await fetch(endpoint + "/rooms/" + id + "/save", {
          method: "POST",
          headers: { Authorization: "Bearer " + details.ownerToken },
          credentials: "include",
        });
        if (!saved.ok) throw Error("Save failed");
      }
      location.assign(location.pathname + "?proz0Lobby=multiplayer");
    })().catch(() => {
      saveStatus.textContent = "Chưa lưu được; thử lại trước khi rời phòng";
    });
  });
  makeButton(settingsPanel, "Copy invitation", () => {
    const url = new URL(location.href);
    if (details.roomName) {
      url.search = new URLSearchParams({
        proz0Lobby: "multiplayer",
        room: details.roomName,
      }).toString();
      url.hash = "";
    } else
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
  const panelPointers = new Set<number>();
  const panelPointerDown = (event: PointerEvent) => {
    if (event.target instanceof Node && panel.contains(event.target))
      panelPointers.add(event.pointerId);
  };
  const panelPointerEnd = (event: PointerEvent) => {
    panelPointers.delete(event.pointerId);
  };
  document.addEventListener("pointerdown", panelPointerDown, true);
  document.addEventListener("pointerup", panelPointerEnd, true);
  document.addEventListener("pointercancel", panelPointerEnd, true);
  function closePanel() {
    panelKind = null;
    panel.hidden = true;
    signature = "";
  }
  function renderPanel() {
    if (panelKind === null) {
      panel.hidden = true;
      signature = "";
      return;
    }
    // Preserve the pressed DOM node until its click is dispatched. Replication
    // can arrive between pointerdown and pointerup on slower clients.
    if (panelPointers.size) return;
    const next = JSON.stringify([
      panelKind,
      connection?.replication
        .snapshot()
        .filter((v) =>
          [
            "container",
            "colony-depth",
            "equipment",
            "condenser",
            "ruin",
            "foothold",
            "colony-sustenance",
            "colony-map",
          ].includes(v.aggregateType),
        )
        .map((v) => [v.aggregateId, v.revision]),
      feedback,
      lastOperation,
      performance.now() < feedbackUntil,
      focused?.id,
      panelKind === "map" ? Math.floor((scene?.tick ?? 0) / 30) : 0,
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
      closePanel();
    });
    const inv = containerRef();
    const local = connection
      ?.getPlayerMotions()
      .find((p) => p.playerId === connection?.getPlayerId());
    if (panelKind === "map") {
      const map = document.createElement("canvas");
      map.className = "coop-map";
      map.width = 600;
      map.height = 300;
      map.setAttribute("aria-label", "Explored map");
      panel.append(map);
      const cells =
          (
            aggregate("colony-map", connection?.getPlayerId() ?? "")?.state as
              { cells?: NonNullable<ColonySceneV1["map"]> } | undefined
          )?.cells ??
          scene?.map ??
          scene?.terrain ??
          [],
        ctx = map.getContext("2d");
      if (ctx && local && cells.length) {
        const minX = Math.min(...cells.map((c) => c.x)),
          maxX = Math.max(...cells.map((c) => c.x)),
          minY = Math.min(...cells.map((c) => c.y)),
          maxY = Math.max(...cells.map((c) => c.y));
        const scale = Math.min(
          560 / (maxX - minX + 4),
          260 / (maxY - minY + 4),
        );
        const point = (x: number, y: number) =>
          [20 + (x - minX) * scale, 20 + (y - minY) * scale] as const;
        for (const c of cells) {
          ctx.fillStyle = c.terrain === "water" ? "#428d9c" : "#617657";
          const [x, y] = point(c.x, c.y);
          ctx.fillRect(x, y, Math.ceil(scale * 2), Math.ceil(scale * 2));
        }
        for (const m of connection!.getPlayerMotions()) {
          const [x, y] = point(m.position.x, m.position.y);
          ctx.fillStyle = m.playerId === local.playerId ? "#f4d89a" : "#81dce6";
          ctx.fillRect(x - 3, y - 3, 6, 6);
        }
      }
      const hint = document.createElement("p");
      hint.textContent =
        "Chỉ hiện địa hình đã khám phá · vàng: bạn · xanh: đồng đội";
      panel.append(hint);
    }
    if (panelKind === "professions") {
      const colony = aggregate("colony-depth", "colony"),
        state = colony?.state as
          | {
              researchIds?: string[];
              professions?: Record<string, string>;
              discoveredBiomes?: string[];
            }
          | undefined;
      for (const [id, def] of Object.entries(COLONY_PROFESSIONS)) {
        const row = document.createElement("article");
        row.append(
          def.name +
            " · " +
            def.description +
            " · " +
            def.requiredResearch +
            " · " +
            def.requiredRegions +
            " biomes",
        );
        const chosen = state?.professions?.[connection!.getPlayerId()!];
        const b = makeButton(row, chosen === id ? "Đã chọn" : "Chọn nghề", () =>
          command("colony.depth", { action: "specialize", targetId: id }, [
            inv,
            ref("colony-depth", "colony"),
          ]),
        );
        b.disabled =
          !!chosen ||
          !state?.researchIds?.includes(def.requiredResearch) ||
          (state?.discoveredBiomes?.length ?? 0) < def.requiredRegions;
        panel.append(row);
      }
      panel.append(
        "Mỗi nhân vật chọn một nghề cố định. Nghiên cứu và khám phá mở khóa nghề.",
      );
    }
    if (panelKind === "object" && focused) {
      const e = scene?.entities.find((s) => s.id === focused!.id) ?? focused;
      const row = document.createElement("article");
      row.append(targetLabel(e));
      panel.append(row);
      if (!inRange(e)) {
        panel.append("Đến gần để tương tác.");
        return;
      }
      const structure = aggregate("structure", e.id),
        state = structure?.state as { containerId?: string } | undefined;
      const containerId = e.containerId ?? state?.containerId,
        view = containerId ? aggregate("container", containerId) : null;
      if (view && containerId) {
        const transfer = (stack: Inventory["stacks"][number], store: boolean) =>
          command(
            e.type === "death-cache" ? "death-cache.recover" : "item.transfer",
            {
              sourceContainerId: store ? inv.aggregateId : containerId,
              targetContainerId: store ? containerId : inv.aggregateId,
              sourceStackId: stack.stackId,
              quantity: stack.quantity,
            },
            [inv, ref("container", containerId)],
          );
        const heading = document.createElement("h3");
        heading.textContent = "Vật phẩm trong hòm / máy";
        panel.append(heading);
        for (const stack of (view.state as unknown as Inventory).stacks) {
          const item = document.createElement("article");
          const icon = document.createElement("span"),
            image = itemImage(stack.itemDefinitionId);
          if (image) applyProductionSprite(icon, image);
          item.append(
            icon,
            catalog.getAs(stack.itemDefinitionId, "item").displayName +
              " ×" +
              stack.quantity,
          );
          makeButton(item, "Lấy", () => transfer(stack, false));
          panel.append(item);
        }
        if (e.definitionId === "structure:storage-crate")
          for (const stack of inventory().stacks) {
            const item = document.createElement("article");
            item.append(
              catalog.getAs(stack.itemDefinitionId, "item").displayName +
                " ×" +
                stack.quantity,
            );
            makeButton(item, "Cất", () => transfer(stack, true));
            panel.append(item);
          }
      }
      const machine = aggregate("condenser", e.id);
      if (machine) {
        const enabled = (machine.state as { enabled: boolean }).enabled;
        makeButton(panel, enabled ? "Tắt máy" : "Bật máy", () =>
          command(
            "machine.set-enabled",
            { structureId: e.id, enabled: !enabled },
            [ref("condenser", e.id)],
          ),
        );
      }
      if (e.type === "ruin") {
        const ruin = aggregate("ruin", e.id);
        makeButton(panel, "Khảo sát", () =>
          command("world.ruin-inspect", { ruinEntityId: e.id }, [
            ref("ruin", e.id),
          ]),
        );
        makeButton(panel, "Lấy vật tư", () =>
          command(
            "world.ruin-reward-claim",
            { ruinEntityId: e.id, inventoryContainerId: inv.aggregateId },
            [inv, ref("ruin", e.id)],
          ),
        ).disabled =
          (ruin?.state as { discoveryState?: string })?.discoveryState !==
          "investigated";
      }
      if (
        e.type === "structure" &&
        e.definitionId !== "structure:landing-module"
      )
        makeButton(panel, "Tháo dỡ · thu hồi kit", () =>
          command(
            "building.dismantle",
            { structureId: e.id, inventoryContainerId: inv.aggregateId },
            [inv, ref("structure", e.id), ref("foothold", "foothold:landing")],
          ),
        );
      if (e.definitionId === "structure:workbench")
        makeButton(panel, "Chế tạo", () => {
          panelKind = "craft";
          signature = "";
        });
    }
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
        "WASD di chuyển · E tương tác gần bạn · Space tấn công · I túi đồ · C chế tạo · B xây dựng · M bản đồ · U nghiên cứu · P nghề · J nhật ký · Enter chat · Escape đóng. Cài đặt chứa lưu thế giới và lời mời. Voice chỉ bật khi bạn chọn và cho phép mic.";
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
        const image = itemImage(stack.itemDefinitionId);
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
        makeButton(row, "Thả 1", () =>
          command(
            "item.drop",
            {
              inventoryContainerId: inv.aggregateId,
              sourceStackId: stack.stackId,
              quantity: 1,
            },
            [inv],
          ),
        );
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
        const output = recipe.outputs[0]
          ? itemImage(recipe.outputs[0].itemId)
          : null;
        if (output) {
          const icon = document.createElement("span");
          applyProductionSprite(icon, output);
          row.append(icon);
        }
        row.append(recipe.displayName);
        let affordable = true;
        for (const cost of recipe.inputs) {
          const icon = document.createElement("span"),
            image = itemImage(cost.itemId);
          if (image) applyProductionSprite(icon, image);
          icon.title =
            catalog.getAs(cost.itemId, "item").displayName +
            " ×" +
            cost.quantity;
          const have = inventory()
            .stacks.filter((s) => s.itemDefinitionId === cost.itemId)
            .reduce((n, s) => n + s.quantity, 0);
          if (have < cost.quantity) affordable = false;
          const badge = document.createElement("span");
          badge.className = "coop-cost";
          badge.dataset.affordable = String(have >= cost.quantity);
          badge.append(
            icon,
            catalog.getAs(cost.itemId, "item").displayName +
              " " +
              have +
              "/" +
              cost.quantity,
          );
          row.append(badge);
        }
        const craftButton = makeButton(row, "Craft", () => {
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
        const station =
          recipe.tier !== "workbench" ||
          scene?.entities.some(
            (e) =>
              e.definitionId === "structure:workbench" &&
              local &&
              Math.hypot(e.x - local.position.x, e.y - local.position.y) <=
                1.25,
          );
        craftButton.disabled = !affordable || !station;
        craftButton.title = !affordable
          ? "Chưa đủ nguyên liệu"
          : !station
            ? "Cần đứng cạnh Workbench"
            : "";
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
          const animal =
            focused?.type === "passive-wildlife" && inRange(focused)
              ? focused
              : nearestTarget("passive-wildlife");
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
            closePanel();
            feedback = "Click nearby ground to place " + definition.displayName;
            signature = "";
          });
          button.disabled = !kit;
          const connectors =
            (
              aggregate("foothold", "foothold:landing")?.state as
                | {
                    connectors?: {
                      connectorId: string;
                      structureId: string;
                      occupiedByConnectionId: string | null;
                    }[];
                  }
                | undefined
            )?.connectors ?? [];
          for (const connector of connectors.filter(
            (c) =>
              !c.occupiedByConnectionId &&
              scene?.entities.some((e) => e.id === c.structureId && inRange(e)),
          )) {
            const b = makeButton(
              row,
              "Nối · " + connector.connectorId.split(":").slice(-1)[0],
              () =>
                command(
                  "building.place",
                  {
                    inventoryContainerId: inv.aggregateId,
                    sourceKitStackId: kit!.stackId,
                    structureDefinitionId: definition.id,
                    placement: {
                      mode: "connector",
                      targetConnectorId: connector.connectorId,
                      requestedOrientationQuarterTurns: 0,
                    },
                  },
                  [inv, ref("foothold", "foothold:landing")],
                ),
            );
            b.disabled = !kit;
          }
          panel.append(row);
        }
    }
    if (panelKind === "research")
      for (const research of COLONY_RESEARCH) {
        const row = document.createElement("article");
        row.append(research.name);
        const colony = aggregate("colony-depth", "colony");
        const state = colony?.state as { researchIds?: string[] } | undefined;
        let affordable = true;
        for (const cost of research.costs) {
          const have = inventory()
              .stacks.filter(
                (s) => s.itemDefinitionId === cost.itemDefinitionId,
              )
              .reduce((n, s) => n + s.quantity, 0),
            badge = document.createElement("span"),
            icon = document.createElement("span"),
            image = itemImage(cost.itemDefinitionId);
          if (image) applyProductionSprite(icon, image);
          badge.className = "coop-cost";
          badge.dataset.affordable = String(have >= cost.quantity);
          badge.append(
            icon,
            catalog.getAs(cost.itemDefinitionId, "item").displayName +
              " " +
              have +
              "/" +
              cost.quantity,
          );
          row.append(badge);
          if (have < cost.quantity) affordable = false;
        }
        const complete = state?.researchIds?.includes(research.id);
        const researchButton = makeButton(
          row,
          complete ? "Đã nghiên cứu" : "Research",
          () =>
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
        researchButton.disabled =
          !!complete ||
          !affordable ||
          research.prerequisites.some((p) => !state?.researchIds?.includes(p));
        if (research.prerequisites.length)
          row.append("Cần: " + research.prerequisites.join(", "));
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
    status.textContent =
      panelKind === "help"
        ? ""
        : lastOperation
          ? "Đang xử lý…"
          : performance.now() < feedbackUntil
            ? feedback
            : "";
    panel.append(status);
    if (lastOperation)
      for (const button of panel.querySelectorAll<HTMLButtonElement>("button"))
        if (button.textContent !== "Close") button.disabled = true;
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
          social.connect();
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
                  : rejectText(result.reason ?? "Action rejected");
              feedbackUntil = performance.now() + 5000;
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
          current.close(4000, "Resync");
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
        if (envelope.proz0Social === 1) {
          social.handle(envelope);
          return;
        }
        if (
          envelope.messageType === "SESSION_REJECTED" &&
          envelope.payload.reason === "PLAYER_ALREADY_CONNECTED"
        ) {
          current.close(4000, "Previous connection closing");
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
      social.disconnect();
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
  let lastPing = 0;
  const sendMovement = () => {
    if (
      connection?.getState() !== "READY" ||
      socket?.readyState !== WebSocket.OPEN
    )
      return;
    const active =
      panelKind === null &&
      root.dataset.colonySettingsOpen !== "true" &&
      !social.inputActive();
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
  };
  const inputTimer = setInterval(() => {
    if (connection?.getState() !== "READY" || socket?.readyState !== WebSocket.OPEN) return;
    if (performance.now() - lastPing > 2000) {
      lastPing = performance.now();
      connection.ping("coop:" + crypto.randomUUID());
    }
    const rtt = connection.getRttMs();
    if (rtt !== null) root.dataset.coopRttMs = String(rtt);
    sendMovement();
  }, 50);
  const keyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    if (event.code === "Escape") {
      closePanel();
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      event.preventDefault();
      const changed = !pressed.has(event.code);
      pressed.add(event.code);
      if (changed) sendMovement();
    }
    if (root.dataset.colonySettingsOpen === "true") return;
    if (!event.repeat) {
      if(event.code==='KeyQ'||event.code==='KeyT'){
        const slot=event.code==='KeyQ'?'weapon':'protection',state=aggregate('equipment',connection?.getPlayerId()??'')?.state as {equippedWeaponStackId?:string;equippedThermalWrapStackId?:string}|undefined;
        const equipped=slot==='weapon'?state?.equippedWeaponStackId:state?.equippedThermalWrapStackId;
        const stack=inventory().stacks.find(s=>catalog.getAs(s.itemDefinitionId,'item').useProfile?.type===(slot==='weapon'?'melee-weapon':'thermal-protection'));
        if(equipped||stack)command('equipment.set',{slot,stackId:equipped?null:stack!.stackId},[containerRef()]);
      }
      const kind: Record<string, string> = {
        KeyI: "inventory",
        KeyC: "craft",
        KeyU: "research",
        KeyJ: "journal",
        KeyB: "build",
        KeyH: "help",
        KeyM: "map",
        KeyP: "professions",
      };
      if (event.code === "KeyE") {
        event.preventDefault();
        const target = nearestTarget();
        if (target) interact(target);
      }
      if (event.code === "Space") {
        event.preventDefault();
        const target = nearestTarget("hostile");
        if (target) attack(target);
      }
      if (kind[event.code]) {
        panelKind = panelKind === kind[event.code] ? null : kind[event.code]!;
        signature = "";
      }
    }
  };
  const keyUp = (event: KeyboardEvent) => {
    if (pressed.delete(event.code)) sendMovement();
  },
    blur = () => {
      pressed.clear();
      panelPointers.clear();
      sendMovement();
    };
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
    if (!scene || connection?.getState() !== "READY") {
      audio.weather("clear");
      return;
    }
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
    worldLayer.style.transform =
      "translate(" +
      String(-camera.x * 16 + camera.y * 16) +
      "px," +
      String(-(camera.x + camera.y) * 8) +
      "px)";
    canvas.dataset.playerX = String(local.position.x);
    canvas.dataset.playerY = String(local.position.y);
    canvas.dataset.playerLocomotion = local.locomotionState;
    canvas.dataset.inventoryRevision = String(containerRef().revision);
    canvas.dataset.authorityTick = String(
      connection.replication.getAuthorityTick(),
    );
    canvas.dataset.teammateCount = String(motions.length - 1);

    connectionStatus.textContent = placing
      ? "Click nearby ground to place facility"
      : "CO-OP · " + motions.length + "/3";
    for (const [key, row] of statRows) {
      const value = Number(
        scene.survival[key as keyof typeof scene.survival] ?? 0,
      );
      row.meter.value = value;
      setText(row.value, value.toFixed(0));
    }
    const usage = computeContainerUsage(catalog, inventory().stacks);
    setText(
      stats,
      usage.totalWeightKg.toFixed(1) +
        "/20 kg · " +
        usage.totalVolume.toFixed(1) +
        "/24",
    );
    const weather = colonyWeatherAt(
      scene.worldSeed,
      local.position,
      scene.tick,
    );
    audio.weather(weather.weather);
    setText(
      region,
      weather.biomeId.replaceAll("-", " ") +
        " · " +
        weather.weather.replaceAll("-", " "),
    );
    const equipment = aggregate("equipment", local.playerId)?.state as
      | { equippedWeaponStackId?: string; equippedThermalWrapStackId?: string }
      | undefined;
    const equippedName = (id: string | undefined) => {
      const stack = inventory().stacks.find((s) => s.stackId === id);
      return stack
        ? catalog.getAs(stack.itemDefinitionId, "item").displayName
        : "—";
    };
    setText(
      equipmentHud,
      "[Q] " +
        equippedName(equipment?.equippedWeaponStackId) +
        " · [T] " +
        equippedName(equipment?.equippedThermalWrapStackId),
    );
    const near = nearestTarget();
    setText(
      context,
      lastOperation
        ? "Đang xử lý…"
        : performance.now() < feedbackUntil
          ? feedback
          : placing
            ? "Bấm đất gần bạn để đặt công trình"
            : near
              ? "[E] " + targetLabel(near)
              : "",
    );
    const used = new Set(staticKeys);
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
        worldLayer.append(node);
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
        Math.round(320 + (x - y) * 16 - (definition.cellWidth * scale) / 2) +
        "px";
      node.style.top =
        Math.round(
          180 +
            (x + y) * 8 -
            (definition.cellHeight * scale) / (type === "terrain" ? 2 : 1),
        ) + "px";
      node.style.zIndex = String(
        type === "terrain" ? -10000 : Math.floor((x + y) * 10) + 10000,
      );
      node.onclick = action ?? null;
    };
    if (staticScene !== scene) {
      for (const key of staticKeys) used.delete(key);
      staticKeys.clear();
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
            "structure:compact-power-unit":
              PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit,
            "structure:atmospheric-water-condenser":
              PHASE1_PRODUCTION_WORLD_SPRITES.condenser,
          };
          definition =
            mapping[e.definitionId] ?? PHASE1_PRODUCTION_WORLD_SPRITES.habitat;
        }
        if (e.type === "world-drop")
          definition = PHASE1_PRODUCTION_WORLD_SPRITES.worldDrop;
        if (e.type === "death-cache")
          definition = PHASE1_PRODUCTION_WORLD_SPRITES.deathCache;
        sprite(e.id, definition, e.x, e.y, e.type, () => interact(e));
        nodes
          .get(e.id)!
          .setAttribute(
            "aria-label",
            e.type === "resource"
              ? "Gather " +
                  catalog.getAs(e.definitionId, "resource").displayName
              : e.definitionId,
          );
      }
      for (const site of scene.sites) {
        const authored = colonySurveySites(scene.worldSeed).find(
          (s) => s.id === site.id,
        );
        if (authored)
          sprite(
            site.id,
            colonyLandmarkSprite(authored),
            site.x,
            site.y,
            "site",
            () => {
              panelKind = "journal";
              signature = "";
            },
          );
      }
      for (const key of used) staticKeys.add(key);
      staticScene = scene;
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
      nodes.get(motion.playerId)!.title =
        scene.playerNames?.[motion.playerId] ?? motion.playerId;
      const skin = scene.playerSkins?.[motion.playerId] ?? "pioneer";
      nodes.get(motion.playerId)!.style.filter = playerSkinFilter(skin);
      nodes.get(motion.playerId)!.dataset.skin = skin;
      const nameKey = "name:" + motion.playerId;
      used.add(nameKey);
      let label = nodes.get(nameKey);
      if (!label) {
        label = document.createElement("div");
        label.className = "coop-name";
        worldLayer.append(label);
        nodes.set(nameKey, label);
      }
      label.textContent =
        scene.playerNames?.[motion.playerId] ?? motion.playerId;
      label.style.left = String(320 + (position.x - position.y) * 16) + "px";
      label.style.top = String(180 + (position.x + position.y) * 8 - 29) + "px";
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
      document.removeEventListener("pointerdown", panelPointerDown, true);
      document.removeEventListener("pointerup", panelPointerEnd, true);
      document.removeEventListener("pointercancel", panelPointerEnd, true);
      window.removeEventListener("blur", blur);
      audio.destroy();
      settings.destroy();
      social.destroy();
      root.replaceChildren();
    },
  };
}

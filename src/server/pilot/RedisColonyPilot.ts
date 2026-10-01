import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { OrderedInputQueue } from "./OrderedInputQueue";
import { createClient } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import { Phase1HostedAuthorityComposition } from "../../integration/Phase1HostedAuthorityComposition";
import { composePhase1SaveV2 } from "../../integration/Phase1SaveV2Composer";
import { colonyHostedScene } from "../../integration/ColonyHostedScene";
import { createPhase1ContentCatalog } from "../../content";
import { reconstructPhase1ReopenState } from "../../persistence/integration/Phase1ReopenState";
import { createPhase1SaveV2Compatibility } from "../../persistence/validation/SaveValidatorV2";
import {
  HOSTED_PROTOCOL_VERSION,
  serializeServerEnvelopeV1,
  type JsonValue,
} from "../../protocol";
import type { HostedOutboundMessage } from "../runtime/ServerAuthorityHost";
import { LobbyAccounts, LobbyError, type LobbySkin } from "./LobbyAccounts";
import { LobbyRooms, type LobbyRoomDetails } from "./LobbyRooms";

interface RecordV1 {
  version: 1;
  id: string;
  seed: string;
  accessToken: string;
  ownerToken: string;
  bindings: [string, string][];
  clients: Record<string, string>;
  save: unknown;
  checkpoint: number;
  roomByteLimit?: number;
  skins?: Record<string, LobbySkin>;
  contentCompatibility: unknown;
  worldCompatibility: unknown;
}
interface Inbound {
  kind: "open" | "text" | "close" | "save";
  transport: string;
  gateway: string;
  client: string;
  text?: string;
  request?: string;
  skin?: LobbySkin;
  accountBound?: boolean;
}
interface Outbound {
  transport: string;
  kind: "text" | "close" | "saved";
  text?: string;
  request?: string;
  checkpoint?: number;
}
interface Authority {
  record: RecordV1;
  token: string;
  composition: Phase1HostedAuthorityComposition;
  peers: Map<string, { gateway: string; client: string; skin?: LobbySkin }>;
  lastSave: number;
  started: number;
}
export interface RedisPilotOptions {
  url: string;
  namespace?: string;
  allowedOrigins: readonly string[];
  creationKey?: string;
  secureCookies?: boolean;
}
const token = () => randomBytes(24).toString("hex");
const equal = (a: string, b: string) =>
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const drain =
  "local v=redis.call('LRANGE',KEYS[1],0,255);redis.call('LTRIM',KEYS[1],#v,-1);return v";
const leaseTTL = 10000;

/** Redis queues bridge gateways; only the holder of a fenced lease may simulate or save a room. */
export function createRedisColonyPilot(options: RedisPilotOptions) {
  const namespace = options.namespace ?? "proz0:pilot:v1",
    gateway = token(),
    catalog = createPhase1ContentCatalog();
  const redis = createClient({
    url: options.url,
    socket: { connectTimeout: 5000, reconnectStrategy: () => false },
  });
  redis.on("error", () => {
    for (const ws of sockets.values())
      ws.close(1011, "World store unavailable");
  });
  let connecting: Promise<unknown> | null = null,
    stopped = false,
    running = false,
    lastHeartbeat = 0;
  const ready = async () => {
    if (!redis.isOpen)
      connecting ??= redis.connect().finally(() => {
        connecting = null;
      });
    await connecting;
  };
  const key = (id: string, suffix: string) =>
    namespace + ":" + id + ":" + suffix;
  const authorities = new Map<string, Authority>(),
    electing = new Map<string, Promise<void>>(),
    sockets = new Map<string, WebSocket>(),
    socketRooms = new Map<string, string>();
  const saves = new Map<
    string,
    { resolve: (n: number) => void; reject: () => void }
  >();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32 * 1024,
    perMessageDeflate: false,
  });
  const originAllowed = (req: IncomingMessage) =>
    !req.headers.origin || options.allowedOrigins.includes(req.headers.origin);
  const bearer = (req: IncomingMessage) =>
    req.headers.authorization?.replace(/^Bearer /, "") ?? "";
  const json = (res: ServerResponse, status: number, value: unknown) => {
    if (res.headersSent) return;
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    });
    res.end(JSON.stringify(value));
  };
  const read = async (id: string) => {
    const raw = await redis.get(key(id, "record"));
    if (!raw) throw Error("Unknown room");
    const record = JSON.parse(raw) as RecordV1;
    if (record.version !== 1 || record.id !== id) throw Error("Invalid room");
    return record;
  };
  const metadata = (r: RecordV1) => ({
    id: r.id,
    worldSeed: r.seed,
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: r.contentCompatibility,
    worldCompatibility: r.worldCompatibility,
    checkpoint: r.checkpoint,
  });
  const checkpoint = async (authority: Authority) => {
    const request = composePhase1SaveV2(authority.composition.bundle, {
      nowUtc: new Date().toISOString(),
    });
    const save = {
      ...request,
      formatId: request.world.formatId,
      schemaVersion: request.world.schemaVersion,
      recordKind: "portable-bundle",
    };
    const checked = reconstructPhase1ReopenState(
      save,
      createPhase1SaveV2Compatibility(catalog, [3, 4]),
    );
    if (!checked.ok) throw Error("Invalid checkpoint");
    const record = {
      ...authority.record,
      save,
      bindings: [...authority.composition.host.exportResumeBindings()],
      checkpoint: authority.record.checkpoint + 1,
    };
    const data = JSON.stringify(record);
    if (
      Buffer.byteLength(data) >
      (authority.record.roomByteLimit ?? 4 * 1024 * 1024)
    )
      throw Error("Room storage limit");
    const result = await redis.eval(
      "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('SET',KEYS[2],ARGV[2]);return 1",
      {
        keys: [key(record.id, "lease"), key(record.id, "record")],
        arguments: [authority.token, data],
      },
    );
    if (result !== 1) throw Error("Authority lease lost");
    authority.record = record;
    authority.lastSave = Date.now();
  };
  const send = async (peer: { gateway: string }, message: Outbound) => {
    await redis
      .multi()
      .rPush(key(peer.gateway, "out"), JSON.stringify(message))
      .expire(key(peer.gateway, "out"), 60)
      .exec();
  };
  const deliver = async (
    authority: Authority,
    messages: readonly HostedOutboundMessage[],
  ) => {
    if (
      messages.some(
        (m) =>
          m.envelope.messageType === "SESSION_ACCEPTED" ||
          m.envelope.messageType === "COMMAND_RESULT",
      )
    ) {
      for (const message of messages)
        if (message.envelope.messageType === "SESSION_ACCEPTED") {
          const peer = authority.peers.get(message.transportId),
            payload = message.envelope.payload as unknown as {
              resumeCredential?: string;
              playerId: string;
            };
          if (peer && payload.resumeCredential) {
            authority.record.clients[peer.client] = payload.resumeCredential;
            (authority.record.skins ??= {})[payload.playerId] =
              peer.skin ?? "pioneer";
          }
        }
      // A reconnect can recover even if the accepted frame never reached the browser.
      await checkpoint(authority);
    }
    const tx = redis.multi();
    let count = 0;
    for (const message of messages) {
      const peer = authority.peers.get(message.transportId);
      if (!peer) continue;
      tx.rPush(
        key(peer.gateway, "out"),
        JSON.stringify({
          transport: message.transportId,
          kind: "text",
          text: serializeServerEnvelopeV1(message.envelope),
        }),
      );
      tx.expire(key(peer.gateway, "out"), 60);
      count++;
    }
    if (count) await tx.exec();
  };
  const retire = async (authority: Authority) => {
    authorities.delete(authority.record.id);
    for (const [transport, peer] of authority.peers)
      await send(peer, { transport, kind: "close" });
    await authority.composition.destroy();
    await redis.eval(
      "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end;return 0",
      {
        keys: [key(authority.record.id, "lease")],
        arguments: [authority.token],
      },
    );
  };
  const elect = async (id: string) => {
    if (authorities.has(id)) return;
    const pending = electing.get(id);
    if (pending) {
      await pending;
      return;
    }
    const task = (async () => {
      const lease = token();
      if (
        (await redis.set(key(id, "lease"), lease, {
          NX: true,
          PX: leaseTTL,
        })) !== "OK"
      )
        return;
      try {
        const record = await read(id),
          checked = reconstructPhase1ReopenState(
            record.save,
            createPhase1SaveV2Compatibility(catalog, [3, 4]),
          );
        if (!checked.ok) throw Error("Invalid shared save");
        const composition: Phase1HostedAuthorityComposition =
          await Phase1HostedAuthorityComposition.create({
            worldId: "pilot:" + id,
            worldSeed: record.seed,
            maxPlayers: 3,
            colonyDepthEnabled: true,
            interactionRangeWorldUnits: 1.25,
            spawnClearanceRadiusWorldUnits: 1.25,
            requiredAccessRadiusWorldUnits: 1.25,
            initialResumeBindings: new Map(record.bindings),
            reopen: checked.value,
            persistence: {
              async save(authorityTick) {
                await checkpoint(authority);
                return {
                  authorityTick,
                  durableSaveRevision: authority.record.checkpoint,
                };
              },
            },
          });
        const authority: Authority = {
          record,
          token: lease,
          composition,
          peers: new Map(),
          lastSave: Date.now(),
          started: Date.now(),
        };
        authorities.set(id, authority);
      } catch (error) {
        await redis.eval(
          "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end;return 0",
          { keys: [key(id, "lease")], arguments: [lease] },
        );
        throw error;
      }
    })();
    electing.set(id, task);
    try {
      await task;
    } finally {
      electing.delete(id);
    }
  };
  const enqueue = async (id: string, event: Inbound) => {
    const result = await redis.eval(
      "if redis.call('LLEN',KEYS[1])>=128 then return 0 end;redis.call('RPUSH',KEYS[1],ARGV[1]);redis.call('EXPIRE',KEYS[1],30);return 1",
      { keys: [key(id, "in")], arguments: [JSON.stringify(event)] },
    );
    if (result !== 1) throw Error("Input backlog limit");
  };
  const makeRoom = async (seed: string): Promise<LobbyRoomDetails> => {
    const id = randomBytes(8).toString("hex");
    const reservation = await redis.eval(
      "local ids=redis.call('SMEMBERS',KEYS[1]);for _,id in ipairs(ids) do if redis.call('EXISTS',ARGV[1]..':'..id..':record',ARGV[1]..':'..id..':reservation')==0 then redis.call('SREM',KEYS[1],id) end end;if redis.call('SCARD',KEYS[1])>=8 then return 0 end;if redis.call('SET',KEYS[2],'1','NX','EX',10)==false then return -1 end;redis.call('SET',ARGV[1]..':'..ARGV[2]..':reservation','1','EX',60);redis.call('SADD',KEYS[1],ARGV[2]);return 1",
      {
        keys: [namespace + ":rooms", namespace + ":create-limit"],
        arguments: [namespace, id],
      },
    );
    if (reservation !== 1)
      throw new LobbyError(
        429,
        reservation === 0
          ? "Số thế giới đang đạt giới hạn; hãy tiếp tục phòng đã lưu"
          : "Chờ vài giây trước khi tạo phòng tiếp theo",
      );
    let composition: Phase1HostedAuthorityComposition | undefined;
    try {
      composition = await Phase1HostedAuthorityComposition.create({
        worldId: "pilot:" + id,
        worldSeed: seed,
        maxPlayers: 3,
        colonyDepthEnabled: true,
        interactionRangeWorldUnits: 1.25,
        spawnClearanceRadiusWorldUnits: 1.25,
        requiredAccessRadiusWorldUnits: 1.25,
        persistence: {
          async save() {
            throw Error("Creation cannot save before room is stored");
          },
        },
      });
      const request = composePhase1SaveV2(composition.bundle, {
        nowUtc: new Date().toISOString(),
      });
      const record: RecordV1 = {
        version: 1,
        id,
        seed,
        accessToken: token(),
        ownerToken: token(),
        bindings: [],
        clients: {},
        checkpoint: 0,
        roomByteLimit: 2 * 1024 * 1024,
        save: {
          ...request,
          formatId: request.world.formatId,
          schemaVersion: request.world.schemaVersion,
          recordKind: "portable-bundle",
        },
        contentCompatibility: composition.bundle.getContentCompatibility(),
        worldCompatibility: composition.bundle.getWorldCompatibility(),
      };
      const published = await redis.eval(
        "if redis.call('EXISTS',KEYS[1])==0 or redis.call('SISMEMBER',KEYS[2],ARGV[1])==0 then return 0 end;redis.call('SET',KEYS[3],ARGV[2]);redis.call('DEL',KEYS[1]);return 1",
        {
          keys: [
            key(id, "reservation"),
            namespace + ":rooms",
            key(id, "record"),
          ],
          arguments: [id, JSON.stringify(record)],
        },
      );
      if (published !== 1) throw Error("Room reservation expired; try again");
      return {
        ...metadata(record),
        accessToken: record.accessToken,
        ownerToken: record.ownerToken,
      };
    } catch (error) {
      await redis.sRem(namespace + ":rooms", id);
      await redis.del(key(id, "reservation"));
      throw error;
    } finally {
      await composition?.destroy();
    }
  };
  const accounts = new LobbyAccounts(
    redis,
    namespace,
    options.secureCookies === true,
  );
  const removeRoom = async (id: string) => {
    if (await redis.get(key(id, "lease")))
      throw new LobbyError(
        409,
        "Mọi người cần rời phòng trước khi xóa; chờ khoảng mười giây rồi thử lại",
      );
    await redis.del(key(id, "record"));
    await redis.sRem(namespace + ":rooms", id);
  };
  const directory = new LobbyRooms(
    redis,
    namespace,
    accounts,
    () => makeRoom("colony-world:" + randomBytes(8).toString("hex")),
    async (id) => {
      const r = await read(id);
      return {
        ...metadata(r),
        accessToken: r.accessToken,
        ownerToken: r.ownerToken,
      };
    },
    removeRoom,
  );
  const api = createServer((req, res) => {
    void (async () => {
      if (!originAllowed(req)) {
        json(res, 403, { error: "Origin not allowed" });
        return;
      }
      if (req.headers.origin) {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      if (req.method === "OPTIONS") {
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization, Content-Type",
        );
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PATCH, DELETE, OPTIONS",
        );
        res.writeHead(204);
        res.end();
        return;
      }
      await ready();
      const path = new URL(
        req.url ?? "/",
        "https://pilot.local",
      ).pathname.replace(/^\/api\/pilot/, "");
      if (path.startsWith("/auth/")) {
        json(res, 200, await accounts.route(req, res, path));
        return;
      }
      if (path.startsWith("/lobby/")) {
        json(
          res,
          path === "/lobby/rooms" && req.method === "POST" ? 201 : 200,
          await directory.route(req, path),
        );
        return;
      }
      if (path === "/health") {
        await redis.ping();
        json(res, 200, {
          status: "ready",
          durableStore: "redis",
          maxPlayers: 3,
          creationKeyRequired: !!options.creationKey,
        });
        return;
      }
      if (path === "/rooms" && req.method === "POST") {
        if (options.creationKey && !equal(bearer(req), options.creationKey)) {
          json(res, 403, { error: "Creation key required" });
          return;
        }
        let text = "";
        for await (const chunk of req) {
          text += chunk;
          if (Buffer.byteLength(text) > 4096) throw Error("Request too large");
        }
        const input = JSON.parse(text || "{}") as { seed?: string };
        if (
          input.seed !== undefined &&
          (typeof input.seed !== "string" ||
            !input.seed.length ||
            input.seed.length > 128)
        )
          throw Error("Invalid seed");
        json(res, 201, await makeRoom(input.seed ?? "colony-pilot"));
        return;
      }
      const match = path.match(/^\/rooms\/([a-f0-9]{16})(\/(?:save|export))?$/);
      if (match) {
        const record = await read(match[1]!);
        await directory.authorize(req, record.id);
        if (req.method === "DELETE" && !match[2]) {
          if (!equal(bearer(req), record.ownerToken)) {
            json(res, 403, { error: "Only room owner may remove this room" });
            return;
          }
          if (await redis.get(key(record.id, "lease"))) {
            json(res, 409, {
              error: "Disconnect all players before removing a room",
            });
            return;
          }
          await redis.del(key(record.id, "record"));
          await redis.sRem(namespace + ":rooms", record.id);
          await directory.unlink(record.id);
          json(res, 200, { removed: true });
          return;
        }
        if (match[2] === "/export" && req.method === "GET") {
          if (!equal(bearer(req), record.ownerToken)) {
            json(res, 403, { error: "Only room owner may export" });
            return;
          }
          json(res, 200, record.save);
          return;
        }
        if (match[2] === "/save" && req.method === "POST") {
          if (!equal(bearer(req), record.ownerToken)) {
            json(res, 403, { error: "Only room owner may save" });
            return;
          }
          if (!(await redis.get(key(record.id, "lease")))) {
            json(res, 200, { checkpoint: record.checkpoint });
            return;
          }
          const request = token();
          const checkpointNumber = await new Promise<number>(
            (resolve, reject) => {
              const timeout = setTimeout(() => {
                saves.delete(request);
                reject(Error("Save timeout"));
              }, 8000);
              saves.set(request, {
                resolve(n) {
                  clearTimeout(timeout);
                  saves.delete(request);
                  resolve(n);
                },
                reject() {
                  clearTimeout(timeout);
                  saves.delete(request);
                  reject(Error("Save failed"));
                },
              });
              void enqueue(record.id, {
                kind: "save",
                transport: "",
                gateway,
                client: "",
                request,
              }).catch(() => saves.get(request)?.reject());
            },
          );
          json(res, 200, { checkpoint: checkpointNumber });
          return;
        }
        if (req.method === "GET" && equal(bearer(req), record.accessToken)) {
          json(res, 200, metadata(record));
          return;
        }
        json(res, 403, { error: "Room invitation required" });
        return;
      }
      json(res, 404, { error: "Not found" });
    })().catch((error: unknown) =>
      json(res, error instanceof LobbyError ? error.status : 503, {
        error:
          error instanceof LobbyError
            ? error.message
            : "Yêu cầu thất bại, hãy thử lại",
      }),
    );
  });
  api.on("upgrade", (req, socket, head) => {
    void (async () => {
      const id = new URL(req.url ?? "/", "https://pilot.local").pathname.match(
        /\/rooms\/([a-f0-9]{16})\/socket$/,
      )?.[1];
      const protocols = (req.headers["sec-websocket-protocol"] ?? "")
        .split(",")
        .map((p) => p.trim());
      const access =
          protocols.find((p) => p.startsWith("proz0.access."))?.slice(13) ?? "",
        client =
          protocols.find((p) => p.startsWith("proz0.client."))?.slice(13) ?? "";
      if (!id || !originAllowed(req) || !/^[a-f0-9]{48}$/.test(client)) {
        socket.destroy();
        return;
      }
      await ready();
      const record = await read(id);
      const account = await directory.authorize(req, id, client);
      if (!equal(access, record.accessToken)) {
        socket.destroy();
        return;
      }
      await elect(id);
      wss.handleUpgrade(req, socket, head, (ws) => {
        if (
          [...socketRooms.values()].filter((room) => room === id).length >= 8
        ) {
          ws.close(4008, "Gateway capacity");
          return;
        }
        let windowStart = Date.now(),
          frames = 0;
        const transport = token();
        sockets.set(transport, ws);
        socketRooms.set(transport, id);
        const queue = new OrderedInputQueue<Inbound>(event => enqueue(id, event), () => ws.close(1011, "World store unavailable"));
        queue.push({
          kind: "open",
          transport,
          gateway,
          client,
          skin: account?.skin ?? "pioneer",
        });
        ws.on("message", (data, isBinary) => {
          if (Date.now() - windowStart >= 1000) {
            windowStart = Date.now();
            frames = 0;
          }
          if (++frames > 80) {
            ws.close(4008, "Input rate limit");
            return;
          }
          if (isBinary) {
            ws.close(1003, "Text required");
            return;
          }
          const text = data.toString();
          let movement = false;
          try { movement = JSON.parse(text).messageType === "MOVEMENT_INPUT"; } catch { /* Protocol validation rejects malformed frames. */ }
          queue.push({
                kind: "text",
                transport,
                gateway,
                client,
                text,
                accountBound: account !== null,
              }, movement);
        });
        ws.on("close", () => {
          sockets.delete(transport);
          socketRooms.delete(transport);
          const close: Inbound = { kind: "close", transport, gateway, client };
          if (queue.isFailed()) void enqueue(id, close).catch(() => {});
          else queue.push(close);
        });
        ws.on("error", () => ws.close(1011, "Connection failed"));
      });
    })().catch(() => socket.destroy());
  });
  const tick = async () => {
    if (running || stopped || !redis.isReady) return;
    running = true;
    try {
      const heartbeat = Date.now() - lastHeartbeat >= 1000;
      if (heartbeat) {
        await redis.set(key(gateway, "live"), "1", { EX: 10 });
        lastHeartbeat = Date.now();
      }
      for (const authority of [...authorities.values()]) {
        const id = authority.record.id;
        const renewed = await redis.eval(
          "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('PEXPIRE',KEYS[1],ARGV[2]);return 1",
          {
            keys: [key(id, "lease")],
            arguments: [authority.token, String(leaseTTL)],
          },
        );
        if (renewed !== 1) {
          await retire(authority);
          continue;
        }
        if (heartbeat)
          for (const remote of new Set(
            [...authority.peers.values()].map((p) => p.gateway),
          ))
            if (!(await redis.get(key(remote, "live"))))
              for (const [transport, peer] of authority.peers)
                if (peer.gateway === remote) {
                  authority.composition.host.disconnect(transport);
                  authority.peers.delete(transport);
                }
        const events = (await redis.eval(drain, {
          keys: [key(id, "in")],
          arguments: [],
        })) as string[];
        for (const raw of events) {
          const event = JSON.parse(raw) as Inbound;
          if (event.kind === "open")
            authority.peers.set(event.transport, {
              gateway: event.gateway,
              client: event.client,
              skin: event.skin ?? "pioneer",
            });
          if (event.kind === "close") {
            authority.composition.host.disconnect(event.transport);
            authority.peers.delete(event.transport);
          }
          if (event.kind === "save") {
            await checkpoint(authority);
            await send(
              { gateway: event.gateway },
              {
                transport: "",
                kind: "saved",
                request: event.request!,
                checkpoint: authority.record.checkpoint,
              },
            );
          }
          if (event.kind === "text" && authority.peers.has(event.transport)) {
            let text = event.text!;
            const recovered = authority.record.clients[event.client];
            if (recovered || event.accountBound) {
              try {
                const parsed = JSON.parse(text);
                if (
                  parsed.messageType === "CLIENT_HELLO" &&
                  (event.accountBound || !parsed.payload.resumeCredential)
                ) {
                  if (recovered) parsed.payload.resumeCredential = recovered;
                  else delete parsed.payload.resumeCredential;
                  text = JSON.stringify(parsed);
                }
              } catch {
                /* Protocol validator rejects malformed text. */
              }
            }
            await deliver(
              authority,
              authority.composition.host.receiveText(event.transport, text),
            );
          }
        }
        if (authority.peers.size) {
          const messages: HostedOutboundMessage[] = [];
          for (let n = 0; n < 3; n++)
            messages.push(...(await authority.composition.step()));
          if (authority.composition.bundle.authorityTick % 6 === 0)
            for (const playerId of authority.composition.bundle.getActivePlayerIds())
              messages.push(
                ...authority.composition.host.publishAggregate({
                  aggregateType: "colony-scene",
                  aggregateId: playerId,
                  revision: authority.composition.bundle.authorityTick,
                  tombstone: false,
                  state: colonyHostedScene(
                    authority.composition.bundle,
                    playerId,
                    authority.record.skins,
                  ) as unknown as JsonValue,
                }),
              );
          await deliver(authority, messages);
        }
        if (Date.now() - authority.lastSave > 5000) await checkpoint(authority);
        // A leader stays alive through its own socket. Rotate before Vercel's 300s limit.
        if (
          (![...socketRooms.values()].includes(id) &&
            Date.now() - authority.started > 2000) ||
          Date.now() - authority.started > 240000
        ) {
          await checkpoint(authority);
          await retire(authority);
        }
      }
      const outgoing = (await redis.eval(drain, {
        keys: [key(gateway, "out")],
        arguments: [],
      })) as string[];
      for (const raw of outgoing) {
        const event = JSON.parse(raw) as Outbound;
        if (event.kind === "saved") {
          saves.get(event.request!)?.resolve(event.checkpoint!);
          continue;
        }
        const ws = sockets.get(event.transport);
        if (!ws) continue;
        if (event.kind === "close") ws.close(1012, "Shared world reconnect");
        else if (ws.bufferedAmount > 1024 * 1024)
          ws.close(4008, "Slow connection");
        else if (ws.readyState === 1) ws.send(event.text!);
      }
      // Detect a dead leader on any gateway and make all clients reconnect together.
      for (const id of new Set(socketRooms.values()))
        if (!(await redis.get(key(id, "lease"))))
          for (const [transport, room] of socketRooms)
            if (room === id)
              sockets.get(transport)?.close(1012, "Authority restarting");
    } catch {
      for (const ws of sockets.values())
        ws.close(1011, "Shared world store interrupted");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 50);
  timer.unref();
  return {
    server: api,
    ready,
    async close() {
      stopped = true;
      clearInterval(timer);
      while (running) await new Promise((r) => setTimeout(r, 10));
      for (const authority of [...authorities.values()]) {
        await checkpoint(authority);
        await retire(authority);
      }
      for (const ws of sockets.values()) ws.close(1001, "Server restart");
      for (const save of saves.values()) save.reject();
      wss.close();
      if (redis.isOpen) await redis.quit();
    },
  };
}

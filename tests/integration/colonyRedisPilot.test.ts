import { afterEach, expect, test } from "vitest";
import { randomBytes } from "node:crypto";
import { createClient } from "redis";
import { WebSocket } from "ws";
import { createRedisColonyPilot } from "../../src/server/pilot/RedisColonyPilot";
import { HostedClientConnection } from "../../src/client/network/HostedClientConnection";
import {
  HOSTED_PROTOCOL_VERSION,
  type ClientHelloV1,
} from "../../src/protocol";

const url = process.env.REDIS_URL,
  namespace = "proz0:test:" + randomBytes(8).toString("hex");
const services: ReturnType<typeof createRedisColonyPilot>[] = [],
  peers: WebSocket[] = [];
const wait = async (check: () => boolean) => {
  const until = Date.now() + 20000;
  while (!check()) {
    if (Date.now() > until) throw Error("Timed out waiting for co-op");
    await new Promise((r) => setTimeout(r, 40));
  }
};
afterEach(async () => {
  for (const ws of peers) ws.close();
  for (const service of services) {
    await service.close();
    await new Promise<void>((done) => service.server.close(() => done()));
  }
  if (url) {
    const store = createClient({ url });
    await store.connect();
    const keys = await store.keys(namespace + ":*");
    if (keys.length) await store.del(keys);
    await store.quit();
  }
});
test.skipIf(!url)(
  "real Redis bridges two gateways, bounds rooms to three players, and restores saved identities",
  async () => {
    const start = async () => {
      const service = createRedisColonyPilot({
        url: url!,
        namespace,
        allowedOrigins: [],
      });
      await service.ready();
      await new Promise<void>((done) =>
        service.server.listen(0, "127.0.0.1", done),
      );
      services.push(service);
      const address = service.server.address();
      if (!address || typeof address === "string") throw Error("Missing port");
      return { service, endpoint: "http://127.0.0.1:" + address.port };
    };
    const a = await start(),
      b = await start();
    const creations = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch(a.endpoint + "/rooms", {
          method: "POST",
          body: JSON.stringify({ seed: "redis-coop-verification" }),
        }),
      ),
    );
    expect(creations.filter((r) => r.status === 201)).toHaveLength(1);
    expect(creations.filter((r) => r.status === 429)).toHaveLength(2);
    const response = creations.find((r) => r.status === 201)!;
    expect(response.status).toBe(201);
    const details = (await response.json()) as {
      id: string;
      accessToken: string;
      ownerToken: string;
      contentCompatibility: ClientHelloV1["contentCompatibility"];
      worldCompatibility: ClientHelloV1["worldCompatibility"];
    };
    const registry = createClient({ url: url! });
    await registry.connect();
    try {
      expect(await registry.sMembers(namespace + ":rooms")).toEqual([
        details.id,
      ]);
    } finally {
      await registry.quit();
    }
    const join = async (
      endpoint: string,
      client = randomBytes(24).toString("hex"),
      resumeCredential?: string,
    ) => {
      const ws = new WebSocket(
        endpoint.replace("http:", "ws:") + "/rooms/" + details.id + "/socket",
        ["proz0.access." + details.accessToken, "proz0.client." + client],
      );
      peers.push(ws);
      const connection = new HostedClientConnection({
        transport: {
          sendText(text) {
            ws.send(text);
          },
          close() {
            ws.close();
          },
        },
        hello: {
          protocolVersion: HOSTED_PROTOCOL_VERSION,
          contentCompatibility: details.contentCompatibility,
          worldCompatibility: details.worldCompatibility,
          ...(resumeCredential ? { resumeCredential } : {}),
        },
      });
      ws.on("open", () => connection.start());
      ws.on("message", (data) => connection.handleText(data.toString()));
      await wait(() =>
        ["READY", "CLOSED", "RESYNC_REQUIRED"].includes(connection.getState()),
      );
      return { connection, ws, client };
    };
    const one = await join(a.endpoint),
      two = await join(b.endpoint),
      three = await join(b.endpoint);
    expect([one, two, three].map((p) => p.connection.getState())).toEqual([
      "READY",
      "READY",
      "READY",
    ]);
    await wait(
      () =>
        one.connection.getPlayerMotions().length === 3 &&
        two.connection.getPlayerMotions().length === 3,
    );
    expect(
      one.connection
        .getPlayerMotions()
        .map((p) => p.playerId)
        .sort(),
    ).toEqual(
      two.connection
        .getPlayerMotions()
        .map((p) => p.playerId)
        .sort(),
    );
    expect(
      one.connection.replication
        .snapshot()
        .filter((v) => v.aggregateType === "container")
        .every(
          (v) =>
            v.aggregateId === "inventory:" + one.connection.getPlayerId() ||
            v.aggregateId.startsWith("storage:"),
        ),
    ).toBe(true);
    const four = await join(b.endpoint);
    expect(four.connection.getState()).toBe("CLOSED");
    four.ws.close();
    const id = one.connection.getPlayerId(),
      resume = one.connection.getResumeCredential()!;
    one.ws.close();
    await wait(() => two.ws.readyState === WebSocket.CLOSED);
    await new Promise((r) => setTimeout(r, 250));
    const rejoined = await join(b.endpoint, one.client, resume);
    expect(rejoined.connection.getPlayerId()).toBe(id);
    const threeRestored = await join(
      b.endpoint,
      three.client,
      three.connection.getResumeCredential()!,
    );
    expect(threeRestored.connection.getPlayerId()).toBe(
      three.connection.getPlayerId(),
    );
    // A lost acceptance frame is recoverable through the private browser identity.
    two.ws.close();
    await new Promise((r) => setTimeout(r, 250));
    const recovered = await join(b.endpoint, two.client);
    expect(recovered.connection.getPlayerId()).toBe(
      two.connection.getPlayerId(),
    );
    const saved = await fetch(b.endpoint + "/rooms/" + details.id + "/save", {
      method: "POST",
      headers: { Authorization: "Bearer " + details.ownerToken },
    });
    expect(saved.status).toBe(200);
    expect((await saved.json()).checkpoint).toBeGreaterThan(0);
    const denied = await fetch(b.endpoint + "/rooms/" + details.id + "/save", {
      method: "POST",
      headers: { Authorization: "Bearer " + details.accessToken },
    });
    expect(denied.status).toBe(403);
    await a.service.close();
    await new Promise<void>((done) => a.service.server.close(() => done()));
    services.splice(services.indexOf(a.service), 1);
    rejoined.ws.close();
    await new Promise((r) => setTimeout(r, 250));
    const restored = await join(b.endpoint, one.client, resume);
    expect(restored.connection.getPlayerId()).toBe(id);
    expect(restored.connection.getState()).toBe("READY");
  },
  60000,
);

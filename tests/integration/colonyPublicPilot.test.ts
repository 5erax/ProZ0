import { expect, test } from "vitest";
import { randomBytes } from "node:crypto";
import { WebSocket } from "ws";
import { HostedClientConnection } from "../../src/client/network/HostedClientConnection";
import {
  HOSTED_PROTOCOL_VERSION,
  type ClientHelloV1,
} from "../../src/protocol";

const endpoint = process.env.PILOT_PUBLIC_URL;
test.skipIf(!endpoint)(
  "deployed Vercel room admits three players and preserves host identity on reconnect",
  async () => {
    const health = await fetch(endpoint + "/health");
    expect(health.status).toBe(200);
    expect((await health.json()).maxPlayers).toBe(3);
    const response = await fetch(endpoint + "/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: "public-coop-verification" }),
    });
    expect(response.status).toBe(201);
    const details = (await response.json()) as {
      id: string;
      accessToken: string;
      ownerToken: string;
      contentCompatibility: ClientHelloV1["contentCompatibility"];
      worldCompatibility: ClientHelloV1["worldCompatibility"];
    };
    const sockets: WebSocket[] = [];
    const wait = async (check: () => boolean) => {
      const end = Date.now() + 25000;
      while (!check()) {
        if (Date.now() > end) throw Error("Public co-op timed out");
        await new Promise((r) => setTimeout(r, 50));
      }
    };
    const join = async (
      resumeCredential?: string,
      client = randomBytes(24).toString("hex"),
    ) => {
      const ws = new WebSocket(
        endpoint!.replace(/^https:/, "wss:") +
          "/rooms/" +
          details.id +
          "/socket",
        ["proz0.access." + details.accessToken, "proz0.client." + client],
        { origin: "https://proz0-colony.vercel.app" },
      );
      sockets.push(ws);
      let error: string | undefined;
      ws.on("error", (e) => {
        error = e.message;
      });
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
      await wait(
        () =>
          !!error ||
          ["READY", "CLOSED", "RESYNC_REQUIRED"].includes(
            connection.getState(),
          ),
      );
      if (error) throw Error(error);
      return { connection, ws, client };
    };
    try {
      const one = await join(),
        two = await join(),
        three = await join();
      expect([one, two, three].map((p) => p.connection.getState())).toEqual([
        "READY",
        "READY",
        "READY",
      ]);
      await wait(
        () =>
          one.connection.getPlayerMotions().length === 3 &&
          three.connection.getPlayerMotions().length === 3,
      );
      const id = one.connection.getPlayerId(),
        resume = one.connection.getResumeCredential()!;
      one.ws.close();
      await new Promise((r) => setTimeout(r, 1000));
      const rejoined = await join(resume, one.client);
      expect(rejoined.connection.getPlayerId()).toBe(id);
      const saved = await fetch(endpoint + "/rooms/" + details.id + "/save", {
        method: "POST",
        headers: { Authorization: "Bearer " + details.ownerToken },
      });
      expect(saved.status).toBe(200);
      expect((await saved.json()).checkpoint).toBeGreaterThan(0);
    } finally {
      for (const ws of sockets) ws.close();
      let removed = false;
      for (let attempt = 0; attempt < 12 && !removed; attempt++) {
        await new Promise((r) => setTimeout(r, 1500));
        const response = await fetch(endpoint + "/rooms/" + details.id, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + details.ownerToken },
        });
        removed = response.ok;
        if (!removed) expect(response.status).toBe(409);
      }
      expect(removed).toBe(true);
    }
  },
  90000,
);

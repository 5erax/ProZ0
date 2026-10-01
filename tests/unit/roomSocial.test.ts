import { expect, test } from "vitest";
import { RoomSocial } from "../../src/server/pilot/RoomSocial";
import { validateDisplayName } from "../../src/server/pilot/LobbyAccounts";

test("Unicode display names normalize and reject controls and excess code points", () => {
  expect(validateDisplayName("  Cafe\u0301 Việt  ")).toBe("Café Việt");
  expect(validateDisplayName("🌿".repeat(24))).toHaveLength(48);
  for (const text of ["a", "x".repeat(25), "a\nb", "a\u0000b"])
    expect(() => validateDisplayName(text)).toThrow();
});
test("room chat derives identity from accepted sessions, isolates rooms and bounds spam/history", () => {
  const room = new RoomSocial(),
    other = new RoomSocial();
  room.join("one", "p1", "Bạn Một");
  room.join("two", "p2", "Bạn Hai");
  other.join("three", "p3", "Other");
  expect(
    room.receive("outsider", {
      proz0Social: 1,
      type: "chat",
      id: "a",
      text: "spoof",
    }),
  ).toEqual([]);
  const data = {
    proz0Social: 1,
    type: "chat",
    id: "a",
    text: "<img onerror=alert(1)>",
    playerId: "p3",
    displayName: "spoof",
  };
  const delivered = room.receive("one", data, 100);
  expect(delivered.map((d) => d.transport)).toEqual(["one", "two"]);
  expect(delivered[0]!.message.message).toMatchObject({
    playerId: "p1",
    displayName: "Bạn Một",
    text: data.text,
  });
  expect(room.receive("one", data, 101)).toEqual([]);
  expect(
    room.receive("one", { ...data, id: "b", text: "x".repeat(301) }, 102)[0]!
      .message.type,
  ).toBe("error");
  for (let n = 0; n < 8; n++)
    room.receive("one", { ...data, id: "spam" + n }, 103);
  expect(
    room.receive("one", { ...data, id: "overflow" }, 104)[0]!.message.type,
  ).toBe("error");
  for (let n = 0; n < 60; n++)
    room.receive("one", { ...data, id: "later" + n }, 20000 + n * 10000);
  expect(room.join("new", "p4", "New")[0]!.message.messages).toHaveLength(50);
  expect(other.join("newother", "p5", "NewOther")[0]!.message.messages).toEqual(
    [],
  );
});
test("voice signalling requires both room peers to opt in and cannot spoof sender", () => {
  const room = new RoomSocial();
  room.join("a", "pa", "A");
  room.join("b", "pb", "B");
  const signal = {
    proz0Social: 1,
    type: "signal",
    target: "pb",
    from: "spoof",
    signal: { type: "offer", sdp: "offer" },
  };
  expect(room.receive("a", signal)).toEqual([]);
  room.receive("a", { proz0Social: 1, type: "voice", enabled: true });
  expect(room.receive("a", signal)).toEqual([]);
  room.receive("b", { proz0Social: 1, type: "voice", enabled: true });
  expect(room.receive("a", signal)).toEqual([
    {
      transport: "b",
      message: {
        proz0Social: 1,
        type: "signal",
        from: "pa",
        signal: signal.signal,
      },
    },
  ]);
  expect(room.receive("a", { ...signal, target: "other-room" })).toEqual([]);
  expect(
    room.receive("a", {
      ...signal,
      signal: { type: "offer", sdp: "x".repeat(15000) },
    }),
  ).toEqual([]);
  room.leave("b");
  expect(room.receive("a", signal)).toEqual([]);
});

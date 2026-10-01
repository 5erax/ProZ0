import { randomUUID } from "node:crypto";
export interface SocialPeer {
  transport: string;
  playerId: string;
  displayName: string;
  voice: boolean;
}
export interface RoomChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  time: number;
}
export interface SocialDelivery {
  transport: string;
  message: Record<string, unknown>;
}
/** Ephemeral room messages; identity always comes from the accepted authority session. */
export class RoomSocial {
  private peers = new Map<string, SocialPeer>();
  private history: RoomChatMessage[] = [];
  private limits = new Map<
    string,
    { start: number; chat: number; signal: number; ids: Set<string> }
  >();
  private envelope(type: string, data: Record<string, unknown>) {
    return { proz0Social: 1, type, ...data };
  }
  private presence(): SocialDelivery[] {
    return [...this.peers.values()].map((p) => ({
      transport: p.transport,
      message: this.envelope("presence", {
        peers: [...this.peers.values()].map(
          ({ playerId, displayName, voice }) => ({
            playerId,
            displayName,
            voice,
          }),
        ),
      }),
    }));
  }
  join(
    transport: string,
    playerId: string,
    displayName: string,
  ): SocialDelivery[] {
    this.peers.set(transport, {
      transport,
      playerId,
      displayName,
      voice: false,
    });
    return [
      {
        transport,
        message: this.envelope("history", { messages: this.history }),
      },
      ...this.presence(),
    ];
  }
  leave(transport: string) {
    this.peers.delete(transport);
    this.limits.delete(transport);
    return this.presence();
  }
  receive(
    transport: string,
    value: unknown,
    now = Date.now(),
  ): SocialDelivery[] {
    const peer = this.peers.get(transport);
    if (!peer || !value || typeof value !== "object" || Array.isArray(value))
      return [];
    const v = value as Record<string, unknown>;
    if (v.proz0Social !== 1) return [];
    const error = (text: string): SocialDelivery[] => [
      { transport, message: this.envelope("error", { text }) },
    ];
    let limit = this.limits.get(transport);
    if (!limit || now - limit.start >= 10000) {
      limit = { start: now, chat: 0, signal: 0, ids: new Set() };
      this.limits.set(transport, limit);
    }
    if (v.type === "chat") {
      if (
        typeof v.text !== "string" ||
        typeof v.id !== "string" ||
        !/^[a-zA-Z0-9:-]{1,64}$/.test(v.id)
      )
        return error("Tin nhắn không hợp lệ");
      const text = v.text.normalize("NFC").trim();
      if (!text || Array.from(text).length > 300 || /[\p{C}]/u.test(text))
        return error("Tin nhắn cần 1–300 ký tự");
      if (limit.ids.has(v.id)) return [];
      if (++limit.chat > 8) return error("Bạn gửi quá nhanh; chờ vài giây");
      limit.ids.add(v.id);
      const message = {
        id: randomUUID(),
        playerId: peer.playerId,
        displayName: peer.displayName,
        text,
        time: now,
      };
      this.history.push(message);
      this.history = this.history.slice(-50);
      return [...this.peers.values()].map((p) => ({
        transport: p.transport,
        message: this.envelope("chat", { message }),
      }));
    }
    if (v.type === "voice") {
      if (typeof v.enabled !== "boolean" || ++limit.signal > 100) return [];
      peer.voice = v.enabled;
      return this.presence();
    }
    if (v.type === "signal") {
      if (!peer.voice || ++limit.signal > 100 || typeof v.target !== "string")
        return [];
      const target = [...this.peers.values()].find(
        (p) => p.playerId === v.target && p.voice && p.transport !== transport,
      );
      if (!target) return [];
      const signal = v.signal;
      if (
        !signal ||
        typeof signal !== "object" ||
        Array.isArray(signal) ||
        JSON.stringify(signal).length > 14000
      )
        return [];
      const s = signal as Record<string, unknown>;
      if (!["offer", "answer", "candidate"].includes(String(s.type))) return [];
      if (
        s.type === "candidate" &&
        (!s.candidate || typeof s.candidate !== "object")
      )
        return [];
      if (s.type !== "candidate" && typeof s.sdp !== "string") return [];
      return [
        {
          transport: target.transport,
          message: this.envelope("signal", { from: peer.playerId, signal }),
        },
      ];
    }
    return [];
  }
}

import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
  LobbyAccounts,
  LobbyError,
  hashLobbyPassword,
  readLobbyBody,
  verifyLobbyPassword,
  type LobbyStore,
} from "./LobbyAccounts";
interface Room {
  id: string;
  name: string;
  owner: string;
  password: string;
  passwordVersion: number;
  revision: number;
}
export interface LobbyRoomDetails {
  id: string;
  accessToken: string;
  ownerToken?: string;
  [key: string]: unknown;
}
export function validateRoomName(value: unknown): string {
  if (typeof value !== "string") throw new LobbyError(400, "Nhập tên phòng");
  const name = value.normalize("NFC").trim();
  if (name.length < 3 || name.length > 32 || Array.from(name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw new LobbyError(400, "Tên phòng cần 3–32 ký tự");
  return name;
}
function password(value: unknown) {
  if (typeof value !== "string" || value.length < 4 || value.length > 64)
    throw new LobbyError(400, "Mật mã phòng cần 4–64 ký tự");
  return value;
}
export class LobbyRooms {
  constructor(
    private store: LobbyStore,
    private namespace: string,
    private accounts: LobbyAccounts,
    private create: () => Promise<LobbyRoomDetails>,
    private details: (id: string) => Promise<LobbyRoomDetails>,
    private remove: (id: string) => Promise<void>,
  ) {}
  private key(kind: string, id: string) {
    return this.namespace + ":lobby:" + kind + ":" + id;
  }
  private nameKey(name: string) {
    return this.key(
      "name",
      createHash("sha256").update(name.toLocaleLowerCase("en")).digest("hex"),
    );
  }
  async read(id: string): Promise<Room | null> {
    const raw = await this.store.get(this.key("room", id));
    return raw ? (JSON.parse(raw) as Room) : null;
  }
  private async connection(req: IncomingMessage, room: Room) {
    const a = await this.accounts.require(req);
    if (
      a.id !== room.owner &&
      (await this.store.get(this.key("grant", a.id + ":" + room.id))) !==
        String(room.passwordVersion)
    )
      throw new LobbyError(403, "Nhập lại mật mã phòng để vào");
    await this.store.set(
      this.key("grant", a.id + ":" + room.id),
      String(room.passwordVersion),
    );
    const details = await this.details(room.id);
    if (a.id !== room.owner) delete details.ownerToken;
    return {
      ...details,
      roomName: room.name,
      clientKey: await this.accounts.clientKey(a, room.id),
      skin: a.skin,
    };
  }
  async authorize(req: IncomingMessage, id: string, client?: string) {
    const room = await this.read(id);
    if (!room) return null;
    const a = await this.accounts.require(req);
    if (
      a.id !== room.owner &&
      (await this.store.get(this.key("grant", a.id + ":" + id))) !==
        String(room.passwordVersion)
    )
      throw new LobbyError(403, "Nhập lại mật mã phòng");
    if (client && client !== (await this.accounts.clientKey(a, id)))
      throw new LobbyError(403, "Nhân vật không thuộc tài khoản này");
    return a;
  }
  async unlink(id: string) {
    const room = await this.read(id);
    if (!room) return;
    await this.store.eval(
      "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1]) end;redis.call('DEL',KEYS[2]);redis.call('SREM',KEYS[3],ARGV[1]);return 1",
      {
        keys: [
          this.nameKey(room.name),
          this.key("room", id),
          this.namespace + ":named-rooms",
        ],
        arguments: [id],
      },
    );
  }
  async authorizeOwner(req: IncomingMessage, id: string) {
    const room = await this.read(id);
    if (!room) return;
    const account = await this.accounts.require(req);
    if (account.id !== room.owner) throw new LobbyError(403, "Chỉ chủ phòng có thể quản lý");
  }
  async route(req: IncomingMessage, path: string): Promise<unknown> {
    const a = await this.accounts.require(req);
    if (path === "/lobby/rooms" && req.method === "GET") {
      const ids = await this.store.sMembers(this.namespace + ":named-rooms"),
        rooms = [];
      for (const id of ids) {
        const r = await this.read(id);
        if (r)
          rooms.push({
            id,
            name: r.name,
            owned: r.owner === a.id,
            maxPlayers: 3,
          });
      }
      return { rooms: rooms.sort((l, r) => l.name.localeCompare(r.name)) };
    }
    if (path === "/lobby/rooms" && req.method === "POST") {
      const data = await readLobbyBody(req),
        name = validateRoomName(data.name),
        pass = password(data.password);
      await this.accounts.rate(req, "host:" + a.id);
      const reservation = "pending:" + randomBytes(16).toString("hex"),
        nameKey = this.nameKey(name);
      if (!(await this.store.set(nameKey, reservation, { NX: true, EX: 60 })))
        throw new LobbyError(409, "Tên phòng đã được sử dụng");
      let details: LobbyRoomDetails | undefined;
      try {
        const hashed = await hashLobbyPassword(pass);
        details = await this.create();
        const room: Room = {
          id: details.id,
          name,
          owner: a.id,
          password: hashed,
          passwordVersion: 0,
          revision: 0,
        };
        const stored = await this.store.eval(
          "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('SET',KEYS[1],ARGV[2]);redis.call('SET',KEYS[2],ARGV[3]);redis.call('SADD',KEYS[3],ARGV[2]);return 1",
          {
            keys: [
              nameKey,
              this.key("room", room.id),
              this.namespace + ":named-rooms",
            ],
            arguments: [reservation, room.id, JSON.stringify(room)],
          },
        );
        if (stored !== 1)
          throw new LobbyError(409, "Tên phòng đã thay đổi, thử lại");
        return this.connection(req, room);
      } catch (error) {
        await this.store.eval(
          "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1]) end;return 1",
          { keys: [nameKey], arguments: [reservation] },
        );
        if (details) await this.remove(details.id);
        throw error;
      }
    }
    if (path === "/lobby/join" && req.method === "POST") {
      const data = await readLobbyBody(req),
        name = validateRoomName(data.name),
        pass = password(data.password);
      await this.accounts.rate(req, "join:" + a.id + ":" + name.toLowerCase());
      const id = await this.store.get(this.nameKey(name)),
        room = id && !id.startsWith("pending:") ? await this.read(id) : null;
      const match = await verifyLobbyPassword(
        pass,
        room?.password ?? "0".repeat(32) + ":" + "0".repeat(64),
      );
      if (!room || !match)
        throw new LobbyError(403, "Tên phòng hoặc mật mã không đúng");
      await this.store.set(
        this.key("grant", a.id + ":" + room.id),
        String(room.passwordVersion),
      );
      return this.connection(req, room);
    }
    const match = path.match(/^\/lobby\/rooms\/([a-f0-9]{16})(\/continue)?$/);
    if (!match) throw new LobbyError(404, "Không tìm thấy phòng");
    const room = await this.read(match[1]!);
    if (!room) throw new LobbyError(404, "Không tìm thấy phòng");
    if (match[2] && req.method === "POST") return this.connection(req, room);
    if (room.owner !== a.id)
      throw new LobbyError(403, "Chỉ chủ phòng có thể quản lý");
    if (req.method === "DELETE") {
      await this.remove(room.id);
      await this.unlink(room.id);
      return { removed: true };
    }
    if (req.method === "PATCH") {
      const data = await readLobbyBody(req),
        name = validateRoomName(data.name),
        newPassword =
          data.password === undefined || data.password === ""
            ? null
            : password(data.password),
        updated = {
          ...room,
          name,
          password: newPassword
            ? await hashLobbyPassword(newPassword)
            : room.password,
          passwordVersion: room.passwordVersion + (newPassword ? 1 : 0),
          revision: room.revision + 1,
        };
      const result = await this.store.eval(
        "if redis.call('GET',KEYS[1])~=ARGV[1] then return -1 end;local occupied=redis.call('GET',KEYS[2]);if occupied and occupied~=ARGV[2] then return 0 end;if KEYS[2]~=KEYS[3] and redis.call('GET',KEYS[3])==ARGV[2] then redis.call('DEL',KEYS[3]) end;redis.call('SET',KEYS[2],ARGV[2]);redis.call('SET',KEYS[1],ARGV[3]);return 1",
        {
          keys: [
            this.key("room", room.id),
            this.nameKey(name),
            this.nameKey(room.name),
          ],
          arguments: [JSON.stringify(room), room.id, JSON.stringify(updated)],
        },
      );
      if (result !== 1)
        throw new LobbyError(
          409,
          result === 0
            ? "Tên phòng đã được sử dụng"
            : "Phòng vừa thay đổi, thử lại",
        );
      return { id: room.id, name, updated: true };
    }
    throw new LobbyError(405, "Thao tác không được hỗ trợ");
  }
}

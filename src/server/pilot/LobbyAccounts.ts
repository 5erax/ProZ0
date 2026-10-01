import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
export interface LobbyStore {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean },
  ): Promise<string | null>;
  del(keys: string | string[]): Promise<number>;
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
  sMembers(key: string): Promise<string[]>;
  sAdd(key: string, value: string): Promise<number>;
  sRem(key: string, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
}
export const LOBBY_SKINS = ["pioneer", "azure", "moss"] as const;
export type LobbySkin = (typeof LOBBY_SKINS)[number];
interface Account {
  id: string;
  username: string;
  password: string;
  recovery: string;
  skin: LobbySkin;
  revision: number;
  authVersion?: string;
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashLobbyPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      32,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
  return salt + ":" + key.toString("hex");
}
export async function verifyLobbyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [salt, hex] = encoded.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{64}$/.test(hex ?? ""))
    return false;
  const key = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt!,
      32,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
  return timingSafeEqual(key, Buffer.from(hex!, "hex"));
}
export class LobbyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readLobbyBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new LobbyError(415, "Yêu cầu không hợp lệ");
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 4096)
      throw new LobbyError(413, "Thông tin quá dài");
  }
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Error();
    return data as Record<string, unknown>;
  } catch {
    throw new LobbyError(400, "Thông tin không hợp lệ");
  }
}
export class LobbyAccounts {
  private readonly cookie: string;
  constructor(
    private store: LobbyStore,
    private namespace: string,
    private secure: boolean,
  ) {
    this.cookie = secure ? "__Host-proz0_session" : "proz0_session";
  }
  private key(kind: string, id: string) {
    return this.namespace + ":account:" + kind + ":" + id;
  }
  private public(account: Account) {
    return { id: account.id, username: account.username, skin: account.skin };
  }
  async rate(req: IncomingMessage, subject: string) {
    const ip = (
      req.headers["x-forwarded-for"] ??
      req.socket.remoteAddress ??
      "unknown"
    )
      .toString()
      .split(",")[0]!
      .trim();
    for (const [id, maximum] of [
      ["ip:" + digest(ip), 20],
      ["subject:" + digest(subject), 8],
    ] as const) {
      const count = await this.store.eval(
        "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],60) end;return n",
        { keys: [this.key("limit", id)], arguments: [] },
      );
      if (Number(count) > maximum)
        throw new LobbyError(429, "Thử lại sau một phút");
    }
  }
  private session(req: IncomingMessage) {
    const cookie = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(this.cookie + "="))
      ?.slice(this.cookie.length + 1);
    return cookie && /^[a-f0-9]{48}$/.test(cookie) ? cookie : null;
  }
  async current(req: IncomingMessage): Promise<Account | null> {
    const token = this.session(req);
    if (!token) return null;
    const session = await this.store.get(this.key("session", digest(token)));
    if (!session) return null;
    const binding = JSON.parse(session) as { id: string; authVersion: string };
    const raw = await this.store.get(this.key("user", binding.id));
    const account = raw ? JSON.parse(raw) as Account : null;
    return account && (account.authVersion ?? "legacy") === binding.authVersion ? account : null;
  }
  async require(req: IncomingMessage) {
    const account = await this.current(req);
    if (!account) throw new LobbyError(401, "Đăng nhập để chơi Multiplayer");
    return account;
  }
  private cookieHeader(token: string, age: number) {
    return (
      this.cookie +
      "=" +
      token +
      "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
      age +
      (this.secure ? "; Secure" : "")
    );
  }
  private async revoke(account: Account) {
    const keys = await this.store.sMembers(this.key("sessions", account.id));
    if (keys.length) await this.store.del(keys);
    await this.store.del(this.key("sessions", account.id));
  }
  private async login(res: ServerResponse, account: Account) {
    const token = randomBytes(24).toString("hex"),
      key = this.key("session", digest(token));
    const old = await this.store.sMembers(this.key("sessions", account.id));
    if (old.length >= 8) {
      await this.revoke(account);
    }
    await this.store.set(key, JSON.stringify({ id: account.id, authVersion: account.authVersion ?? "legacy" }), { EX: 86400 });
    await this.store.sAdd(this.key("sessions", account.id), key);
    await this.store.expire(this.key("sessions", account.id), 86400);
    res.setHeader("Set-Cookie", this.cookieHeader(token, 86400));
    return this.public(account);
  }
  async clientKey(account: Account, room: string) {
    const key = this.key("colonist", account.id + ":" + room),
      value = randomBytes(24).toString("hex");
    await this.store.set(key, value, { NX: true });
    return (await this.store.get(key))!;
  }
  async route(
    req: IncomingMessage,
    res: ServerResponse,
    path: string,
  ): Promise<unknown> {
    if (path === "/auth/me" && req.method === "GET") {
      const a = await this.current(req);
      return { account: a ? this.public(a) : null };
    }
    if (path === "/auth/logout" && req.method === "POST") {
      const session = this.session(req);
      if (session) await this.store.del(this.key("session", digest(session)));
      res.setHeader("Set-Cookie", this.cookieHeader("", 0));
      return { ok: true };
    }
    const data = await readLobbyBody(req);
    if (path === "/auth/profile" && req.method === "POST") {
      const a = await this.require(req);
      const previous = JSON.stringify(a);
      if (!LOBBY_SKINS.includes(data.skin as LobbySkin))
        throw new LobbyError(400, "Skin không hợp lệ");
      a.skin = data.skin as LobbySkin;
      a.revision++;
      const updated = await this.store.eval(
        "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('SET',KEYS[1],ARGV[2]);return 1",
        { keys: [this.key("user", a.id)], arguments: [previous, JSON.stringify(a)] },
      );
      if (updated !== 1) throw new LobbyError(409, "Thông tin đã thay đổi, hãy thử lại");
      return { account: this.public(a) };
    }
    if (
      !["/auth/register", "/auth/login", "/auth/recover"].includes(path) ||
      req.method !== "POST"
    )
      throw new LobbyError(404, "Không tìm thấy");
    const username =
      typeof data.username === "string"
        ? data.username.trim().toLowerCase()
        : "";
    if (!/^[a-z0-9_]{3,24}$/.test(username))
      throw new LobbyError(
        400,
        "Tên đăng nhập: 3–24 chữ, số hoặc dấu gạch dưới",
      );
    await this.rate(req, username);
    const password = typeof data.password === "string" ? data.password : "";
    if (password.length < 15 || password.length > 128)
      throw new LobbyError(400, "Mật khẩu tài khoản cần 15–128 ký tự");
    const id = digest(username),
      raw = await this.store.get(this.key("user", id));
    if (path === "/auth/register") {
      const recovery = randomBytes(24).toString("hex"),
        account: Account = {
          id,
          username,
          password: await hashLobbyPassword(password),
          recovery: digest(recovery),
          skin: "pioneer",
          revision: 0,
          authVersion: randomBytes(16).toString("hex"),
        };
      const created = await this.store.eval(
        "if redis.call('SCARD',KEYS[1])>=500 then return 0 end;if redis.call('SET',KEYS[2],ARGV[2],'NX')==false then return 0 end;redis.call('SADD',KEYS[1],ARGV[1]);return 1",
        {
          keys: [this.namespace + ":accounts", this.key("user", id)],
          arguments: [id, JSON.stringify(account)],
        },
      );
      if (created !== 1)
        throw new LobbyError(409, "Tên đăng nhập không thể sử dụng");
      return {
        account: await this.login(res, account),
        recoveryCode: recovery,
      };
    }
    if (path === "/auth/recover") {
      const recovery =
        typeof data.recoveryCode === "string" ? data.recoveryCode : "";
      if (
        !raw ||
        !/^[a-f0-9]{48}$/.test(recovery) ||
        !timingSafeEqual(
          Buffer.from((JSON.parse(raw) as Account).recovery, "hex"),
          Buffer.from(digest(recovery), "hex"),
        )
      )
        throw new LobbyError(401, "Thông tin khôi phục không đúng");
      const a = JSON.parse(raw) as Account,
        newRecovery = randomBytes(24).toString("hex");
      a.password = await hashLobbyPassword(password);
      a.authVersion = randomBytes(16).toString("hex");
      a.recovery = digest(newRecovery);
      a.revision++;
      const updated = await this.store.eval(
        "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end;redis.call('SET',KEYS[1],ARGV[2]);return 1",
        { keys: [this.key("user", id)], arguments: [raw, JSON.stringify(a)] },
      );
      if (updated !== 1)
        throw new LobbyError(409, "Thông tin đã thay đổi, hãy thử lại");
      await this.revoke(a);
      return { account: await this.login(res, a), recoveryCode: newRecovery };
    }
    const a = raw ? (JSON.parse(raw) as Account) : null;
    const encoded = a?.password ?? "0".repeat(32) + ":" + "0".repeat(64);
    if (!(await verifyLobbyPassword(password, encoded)) || !a)
      throw new LobbyError(401, "Tên đăng nhập hoặc mật khẩu không đúng");
    if (await this.store.get(this.key("user", id)) !== raw)
      throw new LobbyError(409, "Thông tin đã thay đổi, hãy thử lại");
    return { account: await this.login(res, a) };
  }
}

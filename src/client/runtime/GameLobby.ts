import { lastSavedReviewUrl } from "./Phase1SavedReview";
import {
  normalizePilotEndpoint,
  roomStorageKey,
  type ColonyRoomDetails,
} from "./ColonyCoopLauncher";
import {
  PLAYER_SKINS,
  playerSkinFilter,
  savePlayerSkin,
  selectedPlayerSkin,
  type PlayerSkin,
} from "./PlayerProfile";
import {
  applyProductionSprite,
  playerActorSprite,
} from "../presentation/Phase1ProductionAssets";
interface Account {
  id: string;
  username: string;
  skin: PlayerSkin;
  displayName?: string;
}
interface Room {
  id: string;
  name: string;
  owned: boolean;
  maxPlayers: number;
}
export function createGameLobby(root: HTMLElement) {
  const doc = root.ownerDocument,
    target = doc.defaultView!,
    onPages = location.hostname === "5erax.github.io",
    endpoint = onPages
      ? "https://proz0-colony.vercel.app/api/pilot"
      : location.origin + "/api/pilot";
  let account: Account | null = null,
    active = "single",
    destroyed = false,
    requestSerial = 0;
  root.replaceChildren();
  root.style.cssText = "display:block;width:100%;height:100%;overflow:auto";
  root.dataset.runtimeMode = "game-lobby";
  root.dataset.runtimeStatus = "entrypoint";
  doc.title = "ProZ0";
  const style = doc.createElement("style");
  style.textContent = `
 .proz0-lobby{width:100vw;min-height:100dvh;box-sizing:border-box;display:grid;grid-template-rows:auto 1fr auto;color:#e5edde;background:radial-gradient(ellipse at 12% 28%,#223f43 0,transparent 60%),#0b1721;font:14px monospace;overflow:auto;padding:28px clamp(18px,5vw,80px)}
 .lobby-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #3c595a;padding-bottom:18px;gap:16px}.lobby-brand{font-size:32px;font-weight:900;letter-spacing:6px;color:#ecefdc}.lobby-header button,.lobby-content button,.lobby-content a,.lobby-footer button{font:inherit;border:1px solid #6c8981;background:#1d363b;color:#e8eedf;padding:12px 18px;border-radius:3px;cursor:pointer;text-decoration:none}.lobby-header button:hover,.lobby-content button:hover,.lobby-content a:hover{background:#304e50}.lobby-content button:disabled{opacity:.5;cursor:wait}
 .lobby-layout{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(360px,1.15fr);align-items:center;gap:clamp(22px,5vw,88px);padding:32px 0}.lobby-left h1{font-size:clamp(30px,4vw,60px);line-height:1.12;max-width:12ch;margin:16px 0}.lobby-eyebrow{letter-spacing:3px;color:#97c8bd;font-size:12px}.lobby-left p{line-height:1.7;color:#afc3b4;max-width:38ch}.lobby-diagram{position:relative;height:220px;max-width:420px;margin:28px 0;background:radial-gradient(ellipse at 50% 70%,#506d51 0,transparent 64%);overflow:hidden}.lobby-diagram svg{width:100%;height:100%;image-rendering:pixelated}.lobby-avatar{position:absolute;left:49%;top:38%;image-rendering:pixelated;z-index:2}.lobby-content{background:#10242cdd;border:1px solid #405f60;padding:clamp(18px,3vw,32px);min-height:360px;box-sizing:border-box}.lobby-tabs{display:flex;gap:8px;border-bottom:1px solid #405f60;padding-bottom:18px;flex-wrap:wrap}.lobby-tabs button[aria-selected=true]{background:#719885;color:#061b24;border-color:#a8c0a0}.lobby-view{padding-top:22px}.lobby-view h2{margin:0 0 12px;font-size:24px}.lobby-view p{line-height:1.7;color:#b7cbbf}.lobby-actions{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.lobby-content .lobby-primary{background:#bdc5a0;color:#122a2d;font-weight:700;border-color:#e5e7cb}.lobby-view label{display:block;margin:14px 0 6px;color:#c6d5c4}.lobby-view input{display:block;width:100%;box-sizing:border-box;padding:13px;background:#091922;border:1px solid #607b75;color:#f1f1df;font:inherit;border-radius:3px}.lobby-view input:focus{outline:2px solid #b7d0a4;outline-offset:2px}.lobby-status{min-height:1.7em;line-height:1.7;color:#e0bb80;overflow-wrap:anywhere}.lobby-room{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 0;border-top:1px solid #365358;flex-wrap:wrap}.lobby-room strong{display:block;font-size:16px;overflow-wrap:anywhere}.lobby-room small{display:block;margin-top:6px;color:#a2c3b5}.lobby-room button{padding:9px 12px}.lobby-skins{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.lobby-skins button{display:grid;gap:14px;justify-items:center;min-width:100px;padding:20px}.lobby-skins button[aria-pressed=true]{border-color:#d4dfb0;box-shadow:inset 0 0 0 1px #d4dfb0}.lobby-footer{display:flex;gap:16px;justify-content:space-between;align-items:center;color:#819c96;font-size:11px;padding:16px 0 0;border-top:1px solid #3c595a}.lobby-recovery{word-break:break-all;padding:16px;background:#253c3f;border:1px solid #b9cb99;font-size:14px}.lobby-recovery button{margin-top:12px}.lobby-auth-switch{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.lobby-auth-switch button{padding:9px 12px}
 @media(max-width:800px){.lobby-layout{grid-template-columns:1fr;gap:12px}.lobby-left h1{font-size:32px;max-width:none;margin:10px 0}.lobby-left p,.lobby-diagram{display:none}.proz0-lobby{padding:20px 16px}.lobby-header{padding-bottom:12px}.lobby-content{min-height:0}.lobby-footer{font-size:10px}.lobby-brand{font-size:25px}.lobby-header button{padding:10px}.lobby-view h2{font-size:22px}}
 @media(prefers-reduced-motion:no-preference){.lobby-diagram{animation:lobby-breathe 9s ease-in-out infinite}@keyframes lobby-breathe{50%{transform:translateY(-5px)}}}
 `;
  const main = doc.createElement("main");
  main.className = "proz0-lobby";
  main.dataset.gameLobby = "ready";
  const header = doc.createElement("header");
  header.className = "lobby-header";
  const brand = doc.createElement("div");
  brand.className = "lobby-brand";
  brand.textContent = "PROZ0";
  const user = doc.createElement("button");
  user.type = "button";
  user.textContent = "Đăng nhập";
  user.addEventListener("click", () => {
    if (onPages) {
      target.location.assign(
        "https://proz0-colony.vercel.app/?proz0Lobby=login",
      );
      return;
    }
    show(account ? "profile" : "login");
  });
  header.append(brand, user);
  const layout = doc.createElement("div");
  layout.className = "lobby-layout";
  const left = doc.createElement("section");
  left.className = "lobby-left";
  const eyebrow = doc.createElement("div");
  eyebrow.className = "lobby-eyebrow";
  eyebrow.textContent = "EXPLORE · BUILD · BELONG";
  const heading = doc.createElement("h1");
  heading.textContent = "Một thế giới. Dấu chân của bạn.";
  const pitch = doc.createElement("p");
  pitch.textContent =
    "Hạ cánh giữa những mảnh đất lơ lửng. Dựng căn cứ đầu tiên và tìm điều gì đang chờ phía sau màn sương.";
  const diagram = doc.createElement("div");
  diagram.className = "lobby-diagram";
  diagram.setAttribute("aria-hidden", "true");
  diagram.innerHTML =
    '<svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><path d="M40 115 210 32 380 115 210 198Z" fill="#71896b"/><path d="M40 115v16l170 83v-16Z" fill="#355c50"/><path d="M210 198v16l170-83v-16Z" fill="#254954"/><path d="M82 94 210 156 338 94M124 73 252 135 294 115M82 136 252 53" fill="none" stroke="#617e64" stroke-width="2"/><path d="M112 128v-27m-12 11 12-11 12 11M310 124v-25m-14 10 14-10 14 10" fill="none" stroke="#afbd85" stroke-width="6"/><path d="M180 91 210 76 240 91 210 107Z" fill="#d2d5bd"/><path d="M180 91v36l30 15v-35Z" fill="#6f999a"/><path d="M210 107v35l30-15V91Z" fill="#477680"/><path d="M219 112v13l14-7v-13Z" fill="#90d1b7"/><path d="M97 160l20-10 17 10-17 10Z" fill="#b1b5a0"/><path d="M278 155l18-9 20 9-20 10Z" fill="#89b2ac"/></svg>';
  const avatar = doc.createElement("span");
  avatar.className = "lobby-avatar";
  applyProductionSprite(avatar, playerActorSprite("S", "IDLE", 0).sprite, 3);
  diagram.append(avatar);
  left.append(eyebrow, heading, pitch, diagram);
  const content = doc.createElement("section");
  content.className = "lobby-content";
  const tabs = doc.createElement("nav");
  tabs.className = "lobby-tabs";
  tabs.setAttribute("aria-label", "Chế độ chơi");
  const view = doc.createElement("div");
  view.className = "lobby-view";
  const status = doc.createElement("div");
  status.className = "lobby-status";
  status.setAttribute("role", "status");
  const tabButtons: Record<string, HTMLButtonElement> = {};
  for (const [key, label] of [
    ["single", "Single Player"],
    ["multi", "Multiplayer"],
    ["skins", "Skin"],
  ] as const) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-selected", "false");
    button.addEventListener("click", () => {
      if (key === "multi" && onPages) {
        target.location.assign(
          "https://proz0-colony.vercel.app/?proz0Lobby=multiplayer",
        );
        return;
      }
      show(key);
    });
    tabs.append(button);
    tabButtons[key] = button;
  }
  content.append(tabs, view, status);
  layout.append(left, content);
  const footer = doc.createElement("footer");
  footer.className = "lobby-footer";
  const note = doc.createElement("span");
  note.textContent = "Một mình hoặc cùng tối đa hai người bạn.";
  const settings = doc.createElement("button");
  settings.type = "button";
  settings.textContent = "Toàn màn hình";
  settings.addEventListener("click", () => {
    void (
      doc.fullscreenElement
        ? doc.exitFullscreen()
        : doc.documentElement.requestFullscreen()
    ).catch(() => {
      status.textContent = "Trình duyệt chưa cho phép toàn màn hình";
    });
  });
  footer.append(note, settings);
  main.append(header, layout, footer);
  root.append(style, main);
  const button = (
    parent: HTMLElement,
    label: string,
    action: () => void,
    primary = false,
  ) => {
    const element = doc.createElement("button");
    element.type = "button";
    element.textContent = label;
    if (primary) element.className = "lobby-primary";
    element.addEventListener("click", action);
    parent.append(element);
    return element;
  };
  const field = (name: string, label: string, type = "text", value = "") => {
    const wrapper = doc.createElement("label");
    wrapper.textContent = label;
    const input = doc.createElement("input");
    input.name = name;
    input.type = type;
    input.value = value;
    input.autocomplete = type === "password" ? "current-password" : "off";
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      view.querySelector<HTMLButtonElement>(".lobby-actions button")?.click();
    });
    wrapper.append(input);
    view.append(wrapper);
    return input;
  };
  const title = (text: string, description: string) => {
    const h = doc.createElement("h2");
    h.textContent = text;
    const p = doc.createElement("p");
    p.textContent = description;
    view.append(h, p);
  };
  const call = async (path: string, method = "GET", data?: unknown) => {
    const response = await fetch(endpoint + path, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "Không thể kết nối, thử lại");
    return result;
  };
  const run = (action: () => Promise<void>) => {
    status.textContent = "Đang xử lý…";
    void action().catch((error) => {
      if (!destroyed)
        status.textContent =
          error instanceof Error ? error.message : "Thử lại sau";
    });
  };
  const enter = (details: ColonyRoomDetails) => {
    target.localStorage.setItem(
      roomStorageKey(endpoint, details.id),
      JSON.stringify(details),
    );
    if (details.skin) savePlayerSkin(details.skin as PlayerSkin);
    const url = new URL(location.href);
    url.search = new URLSearchParams({
      proz0Mode: "colony-coop",
      proz0Server: endpoint,
      proz0Room: details.id,
      proz0Intro: "1",
    }).toString();
    url.hash = "";
    target.location.assign(url.href);
  };
  const legacyWorlds = () => {
    try {
      for (let i = 0; i < target.localStorage.length; i++) {
        const key = target.localStorage.key(i)!;
        if (!key.startsWith("proz0:coop:")) continue;
        const details = JSON.parse(
          target.localStorage.getItem(key)!,
        ) as ColonyRoomDetails;
        if (
          details.roomName ||
          !/^[a-f0-9]{16}$/.test(details.id) ||
          !/^[a-f0-9]{48}$/.test(details.accessToken)
        )
          continue;
        const server = normalizePilotEndpoint(
          key.slice("proz0:coop:".length, -(details.id.length + 1)),
        );
        const url = new URL(location.href);
        url.search = new URLSearchParams({
          proz0Mode: "colony-coop",
          proz0Server: server,
          proz0Room: details.id,
        }).toString();
        url.hash = "";
        const link = doc.createElement("a");
        link.href = url.href;
        link.textContent = "Tiếp tục thế giới co-op đã lưu";
        view.append(link);
      }
    } catch {
      /* Optional saved invitations must never block the lobby. */
    }
  };
  const updateProfile = () => {
    user.textContent = account ? account.username : "Đăng nhập";
    avatar.style.filter = playerSkinFilter(selectedPlayerSkin());
  };
  const auth = (kind: string) => {
    const register = kind === "register",
      recover = kind === "recover";
    title(
      register
        ? "Tạo tài khoản"
        : recover
          ? "Khôi phục tài khoản"
          : "Đăng nhập",
      register
        ? "Lưu skin và quản lý phòng chơi của bạn."
        : recover
          ? "Dùng mã khôi phục đã nhận khi tạo tài khoản."
          : "Single Player có thể chơi ngay; Multiplayer dùng tài khoản của bạn.",
    );
    const username = field("username", "Tên đăng nhập");
    username.autocomplete = "username";
    username.maxLength = 24;
    const password = field(
      "password",
      recover ? "Mật khẩu mới" : "Mật khẩu",
      "password",
    );
    password.autocomplete =
      register || recover ? "new-password" : "current-password";
    password.maxLength = 128;
    if (register || recover) {
      const help = doc.createElement("p");
      help.textContent = "Mật khẩu tài khoản cần ít nhất 15 ký tự.";
      view.append(help);
    }
    const code = recover
      ? field("recoveryCode", "Mã khôi phục", "password")
      : null;
    const actions = doc.createElement("div");
    actions.className = "lobby-actions";
    view.append(actions);
    const submit = button(
      actions,
      register ? "Tạo tài khoản" : recover ? "Đặt lại mật khẩu" : "Đăng nhập",
      () => {
        submit.disabled = true;
        run(async () => {
          try {
            const result = await call(
              "/auth/" +
                (register ? "register" : recover ? "recover" : "login"),
              "POST",
              {
                username: username.value,
                password: password.value,
                ...(code ? { recoveryCode: code.value } : {}),
              },
            );
            account = result.account;
            savePlayerSkin(account!.skin);
            password.value = "";
            if (code) code.value = "";
            updateProfile();
            if (result.recoveryCode) {
              show("recovery-code");
              const box = doc.createElement("div");
              box.className = "lobby-recovery";
              const label = doc.createElement("p");
              label.textContent =
                "Lưu mã này để khôi phục khi quên mật khẩu. Không chia sẻ với người khác.";
              const text = doc.createElement("code");
              text.textContent = result.recoveryCode;
              box.append(label, text);
              button(box, "Tải mã khôi phục", () => {
                const blob = new Blob(
                    [
                      "ProZ0 account: " +
                        account!.username +
                        "\nRecovery code: " +
                        result.recoveryCode +
                        "\n",
                    ],
                    { type: "text/plain" },
                  ),
                  url = URL.createObjectURL(blob),
                  link = doc.createElement("a");
                link.href = url;
                link.download = "proz0-recovery.txt";
                link.click();
                URL.revokeObjectURL(url);
              });
              view.append(box);
              button(
                view,
                "Tôi đã lưu mã · Tiếp tục",
                () => show("multi"),
                true,
              );
            } else show("multi");
          } finally {
            submit.disabled = false;
          }
        });
      },
      true,
    );
    const switches = doc.createElement("div");
    switches.className = "lobby-auth-switch";
    view.append(switches);
    if (!register)
      button(switches, "Tạo tài khoản mới", () => show("register"));
    if (kind !== "login")
      button(switches, "Đã có tài khoản", () => show("login"));
    if (!recover) button(switches, "Quên mật khẩu", () => show("recover"));
  };
  const roomForm = (kind: "create" | "join" | "manage", room?: Room) => {
    title(
      kind === "create"
        ? "Tạo phòng"
        : kind === "manage"
          ? "Quản lý phòng"
          : "Vào phòng",
      kind === "manage"
        ? "Đổi tên hoặc mật mã. Tiến độ thế giới vẫn được giữ."
        : "Phòng riêng cho bạn và tối đa hai người bạn.",
    );
    const name = field(
      "roomName",
      "Tên phòng",
      "text",
      room?.name ?? new URLSearchParams(location.search).get("room") ?? "",
    );
    name.maxLength = 32;
    const password = field(
      "roomPassword",
      kind === "manage"
        ? "Mật mã mới (để trống nếu giữ nguyên)"
        : "Mật mã phòng",
      "password",
    );
    password.maxLength = 64;
    const actions = doc.createElement("div");
    actions.className = "lobby-actions";
    view.append(actions);
    const submit = button(
      actions,
      kind === "create"
        ? "Tạo phòng và vào game"
        : kind === "manage"
          ? "Lưu thay đổi"
          : "Vào game",
      () => {
        submit.disabled = true;
        run(async () => {
          try {
            const result = await call(
              kind === "manage"
                ? "/lobby/rooms/" + room!.id
                : kind === "create"
                  ? "/lobby/rooms"
                  : "/lobby/join",
              kind === "manage" ? "PATCH" : "POST",
              { name: name.value, password: password.value },
            );
            password.value = "";
            if (kind === "manage") {
              show("multi");
              status.textContent = "Đã cập nhật phòng";
            } else enter(result);
          } finally {
            submit.disabled = false;
          }
        });
      },
      true,
    );
    button(actions, "Quay lại", () => show("multi"));
    if (kind === "manage")
      button(view, "Xóa phòng", () => {
        if (
          !target.confirm(
            "Xóa vĩnh viễn thế giới này? Xuất bản sao lưu trong game trước và để mọi người rời phòng.",
          )
        )
          return;
        run(async () => {
          await call("/lobby/rooms/" + room!.id, "DELETE");
          target.localStorage.removeItem(roomStorageKey(endpoint, room!.id));
          show("multi");
          status.textContent = "Đã xóa phòng";
        });
      });
  };
  const multiplayer = () => {
    title(
      "Cùng nhau đặt chân đến ProZ0",
      "Tạo phòng bằng tên và mật mã, hoặc vào phòng của bạn bè.",
    );
    if (!account) {
      button(view, "Đăng nhập để chơi Multiplayer", () => show("login"), true);
      legacyWorlds();
      return;
    }
    const actions = doc.createElement("div");
    actions.className = "lobby-actions";
    view.append(actions);
    button(
      actions,
      "Tạo phòng",
      () => {
        view.replaceChildren();
        status.textContent = "";
        roomForm("create");
      },
      true,
    );
    button(actions, "Vào bằng tên phòng", () => {
      view.replaceChildren();
      status.textContent = "";
      roomForm("join");
    });
    const list = doc.createElement("div");
    list.setAttribute("aria-label", "Danh sách phòng");
    view.append(list);
    legacyWorlds();
    const serial = ++requestSerial;
    run(async () => {
      const result = await call("/lobby/rooms");
      if (destroyed || active !== "multi" || serial !== requestSerial) return;
      status.textContent = "";
      if (!result.rooms.length) {
        const p = doc.createElement("p");
        p.textContent = "Chưa có phòng. Tạo một phòng để bắt đầu cùng bạn bè.";
        list.append(p);
      }
      for (const room of result.rooms as Room[]) {
        const row = doc.createElement("article");
        row.className = "lobby-room";
        const info = doc.createElement("div"),
          name = doc.createElement("strong"),
          meta = doc.createElement("small");
        name.textContent = room.name;
        meta.textContent = room.owned
          ? "Phòng của bạn · tối đa 3 người"
          : "Phòng riêng · tối đa 3 người";
        info.append(name, meta);
        const controls = doc.createElement("div");
        row.append(info, controls);
        if (room.owned) {
          button(controls, "Tiếp tục", () =>
            run(async () =>
              enter(
                await call("/lobby/rooms/" + room.id + "/continue", "POST", {}),
              ),
            ),
          );
          button(controls, "Quản lý", () => {
            view.replaceChildren();
            status.textContent = "";
            roomForm("manage", room);
          });
        } else
          button(controls, "Vào phòng", () => {
            view.replaceChildren();
            status.textContent = "";
            roomForm("join", room);
          });
        list.append(row);
      }
    });
  };
  function show(kind: string) {
    active = kind;
    requestSerial++;
    view.replaceChildren();
    status.textContent = "";
    for (const [id, b] of Object.entries(tabButtons))
      b.setAttribute("aria-selected", String(id === kind));
    if (["login", "register", "recover"].includes(kind)) auth(kind);
    else if (kind === "single") {
      title(
        "Single Player",
        "Bắt đầu hành trình của riêng bạn. Tiến độ được lưu trong trình duyệt này.",
      );
      const actions = doc.createElement("div");
      actions.className = "lobby-actions";
      view.append(actions);
      const seedInput=field('worldSeed','Seed thế giới · để trống để tạo ngẫu nhiên');seedInput.maxLength=128;seedInput.placeholder='Ví dụ: mist-expedition-01';seedInput.dataset.singlePlayerSeed='true';
      const seedHelp=doc.createElement('p');seedHelp.textContent='Cùng seed tạo cùng địa hình và tài nguyên ban đầu. Mỗi thế giới mới có bản lưu riêng; Tiếp tục giữ nguyên seed và tiến độ.';view.append(seedHelp);
      const saved = lastSavedReviewUrl(target);
      if (saved) {
        const link = doc.createElement("a");
        link.href = saved;
        link.className = "lobby-primary";
        link.textContent = "Tiếp tục thế giới";
        link.dataset.continuePhase1Review = "true";
        actions.append(link);
        const upgraded = new URL(saved);
        if (
          upgraded.searchParams.get("proz0Mode") === "phase1-product-review"
        ) {
          upgraded.searchParams.set("proz0Mode", "phase2-colony-review");
          const upgrade = doc.createElement("a");
          upgrade.href = upgraded.href;
          upgrade.textContent = "Nâng cấp thế giới Colony";
          upgrade.dataset.upgradeColonyReview = "true";
          actions.append(upgrade);
        }
      }
      const start = button(
        actions,
        "Bắt đầu thế giới mới",
        () => {
          const id = target.crypto.randomUUID(),
            url = new URL(location.href);
          url.search = new URLSearchParams({
            proz0Mode: "phase2-colony-review",
            proz0WorldId: "world-" + id,
            proz0WorldSeed: seedInput.value.trim() || id,
            proz0Players: "review-player",
            proz0Player: "review-player",
            proz0SaveDb: "proz0-world-" + id,
            proz0Intro: "1",
          }).toString();
          url.hash = "";
          target.location.assign(url.href);
        },
        !saved,
      );
      start.dataset.startPhase2Review = "true";
    } else if (kind === "multi") multiplayer();
    else if (kind === "skins") {
      title(
        "Skin",
        "Chọn bộ đồ cho chuyến thám hiểm. Skin chỉ thay đổi hình ảnh.",
      );
      const choices = doc.createElement("div");
      choices.className = "lobby-skins";
      view.append(choices);
      for (const skin of PLAYER_SKINS) {
        const choice = button(choices, "", () => {
          if (account)
            run(async () => {
              const result = await call("/auth/profile", "POST", {
                skin: skin.id,
              });
              account = result.account;
              savePlayerSkin(skin.id);
              updateProfile();
              show("skins");
            });
          else {
            savePlayerSkin(skin.id);
            updateProfile();
            show("skins");
          }
        });
        choice.setAttribute("aria-label", skin.name);
        choice.setAttribute(
          "aria-pressed",
          String(selectedPlayerSkin() === skin.id),
        );
        const image = doc.createElement("span");
        applyProductionSprite(
          image,
          playerActorSprite("S", "IDLE", 0).sprite,
          3,
        );
        image.style.filter = playerSkinFilter(skin.id);
        const label = doc.createElement("span");
        label.textContent = skin.name;
        choice.append(image, label);
      }
      if (!account) {
        const p = doc.createElement("p");
        p.textContent =
          "Skin hiện lưu trên thiết bị này. Đăng nhập để lưu theo tài khoản.";
        view.append(p);
      }
    } else if (kind === "profile") {
      title(account!.username, "Tài khoản của bạn");
      const name = field(
        "displayName",
        "Tên hiển thị trong phòng",
        "text",
        account!.displayName ?? account!.username,
      );
      name.maxLength = 48;
      button(view, "Lưu tên hiển thị", () =>
        run(async () => {
          const result = await call("/auth/profile", "POST", {
            displayName: name.value,
          });
          account = result.account as Account;
          updateProfile();
          status.textContent =
            "Đã lưu tên hiển thị; áp dụng khi vào lại phòng.";
        }),
      );
      button(view, "Chọn skin", () => show("skins"));
      button(view, "Đăng xuất", () =>
        run(async () => {
          await call("/auth/logout", "POST", {});
          account = null;
          updateProfile();
          show("single");
        }),
      );
    } else if (kind === "recovery-code")
      title("Giữ mã khôi phục", "Tài khoản đã sẵn sàng.");
  }
  updateProfile();
  const intent = new URLSearchParams(location.search).get("proz0Lobby");
  show(
    intent === "login"
      ? "login"
      : intent === "multiplayer"
        ? "multi"
        : "single",
  );
  if (!onPages)
    void call("/auth/me")
      .then((result) => {
        if (destroyed) return;
        account = result.account;
        if (account) savePlayerSkin(account.skin);
        updateProfile();
        if (active === "multi") show("multi");
      })
      .catch(() => {});
  return {
    destroy() {
      destroyed = true;
      root.replaceChildren();
      root.dataset.runtimeStatus = "stopped";
    },
  };
}

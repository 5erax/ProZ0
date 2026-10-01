interface Peer {
  playerId: string;
  displayName: string;
  voice: boolean;
}
interface Chat {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
}
export function createCoopSocial(
  root: HTMLElement,
  options: {
    send: (v: unknown) => void;
    playerId: () => string | null;
    ready: () => boolean;
  },
) {
  const doc = root.ownerDocument,
    wrap = doc.createElement("section");
  wrap.className = "coop-social";
  wrap.dataset.coopSocial = "";
  const style = doc.createElement("style");
  style.textContent = `.coop-social{position:absolute;right:12px;bottom:88px;z-index:1000003;font:12px monospace;color:#e5ebd8}.coop-social button{padding:8px;background:#12272e;color:inherit;border:1px solid #73888a;font:inherit}.coop-chat-box{width:min(350px,calc(100vw - 40px));padding:12px;background:#0b1721f5;border:1px solid #73888a}.coop-chat-box[hidden]{display:none}.coop-chat-log{height:160px;overflow:auto;overflow-wrap:anywhere}.coop-chat-log p{margin:8px 0;line-height:1.5}.coop-chat-form{display:flex;gap:6px;margin-top:10px}.coop-chat-form input{min-width:0;flex:1;background:#10262e;color:#eef4df;border:1px solid #73888a;padding:8px;font:inherit}.coop-voice-controls{display:flex;gap:6px;margin-top:8px}.coop-chat-notice{font-size:10px;max-width:350px;line-height:1.4}`;
  root.append(style, wrap);
  const button = (text: string, action: () => void) => {
    const b = doc.createElement("button");
    b.textContent = text;
    b.addEventListener("click", action);
    return b;
  };
  const box = doc.createElement("div");
  box.className = "coop-chat-box";
  box.hidden = true;
  const log = doc.createElement("div");
  log.className = "coop-chat-log";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  const roster = doc.createElement("div");
  roster.dataset.coopRoster = "";
  const form = doc.createElement("form");
  form.className = "coop-chat-form";
  const input = doc.createElement("input");
  input.maxLength = 600;
  input.setAttribute("aria-label", "Tin nhắn phòng");
  input.placeholder = "Enter để gửi · tối đa 300 ký tự";
  const send = button("Gửi", () => form.requestSubmit());
  send.type = "button";
  form.append(input, send);
  const notice = doc.createElement("div");
  notice.className = "coop-chat-notice";
  notice.setAttribute("role", "status");
  let unread = 0;
  const toggle = button("Chat [Enter]", () => open());
  wrap.append(toggle, box);
  box.append(roster, log, form);
  const controls = doc.createElement("div");
  controls.className = "coop-voice-controls";
  box.append(controls, notice);
  let stream: MediaStream | null = null,
    generation = 0,
    peers: Peer[] = [],
    muted = false,
    subscribed = false;
  const connections = new Map<string, RTCPeerConnection>(),
    audios = new Map<string, HTMLAudioElement>(),
    candidates = new Map<string, RTCIceCandidateInit[]>();
  const voice = button("Bật voice", () => {
    void toggleVoice();
  });
  const mute = button("Tắt mic", () => {
    muted = !muted;
    stream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    mute.textContent = muted ? "Bật mic" : "Tắt mic";
  });
  mute.disabled = true;
  controls.append(voice, mute);
  function open() {
    box.hidden = !box.hidden;
    toggle.setAttribute("aria-expanded", String(!box.hidden));
    if (!box.hidden) {
      unread = 0;
      toggle.textContent = "Chat [Enter]";
      input.focus();
    }
  }
  const closedPeer = (id: string) => {
    connections.get(id)?.close();
    connections.delete(id);
    audios.get(id)?.remove();
    audios.delete(id);
    candidates.delete(id);
  };
  const stopVoice = () => {
    generation++;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    for (const id of connections.keys()) closedPeer(id);
    voice.textContent = "Bật voice";
    mute.disabled = true;
    muted = false;
    root.dataset.voicePeers = "0";
    root.dataset.voiceActive = "false";
  };
  const signal = (target: string, signal: unknown) =>
    options.send({ proz0Social: 1, type: "signal", target, signal });
  const create = (id: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    connections.set(id, pc);
    candidates.set(id, []);
    stream?.getTracks().forEach((t) => pc.addTrack(t, stream!));
    pc.onicecandidate = (e) => {
      if (e.candidate && stream && connections.get(id) === pc)
        signal(id, { type: "candidate", candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (!stream || connections.get(id) !== pc) return;
      let audio = audios.get(id);
      if (!audio) {
        audio = doc.createElement("audio");
        audio.autoplay = true;
        audio.dataset.voiceFrom = id;
        box.append(audio);
        audios.set(id, audio);
      }
      audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      void audio
        .play()
        .catch(
          () => (notice.textContent = "Bấm vào Chat để cho phép phát âm thanh"),
        );
    };
    pc.onconnectionstatechange = () => {
      root.dataset.voicePeers = String(
        [...connections.values()].filter(
          (p) => p.connectionState === "connected",
        ).length,
      );
      if (pc.connectionState === "failed")
        notice.textContent =
          "Voice không kết nối qua mạng này; bạn vẫn có thể chat.";
    };
    return pc;
  };
  async function reconcile() {
    if (!stream) return;
    const local = options.playerId();
    for (const [id] of connections)
      if (!peers.some((p) => p.playerId === id && p.voice)) closedPeer(id);
    for (const peer of peers) {
      if (
        !peer.voice ||
        !local ||
        peer.playerId === local ||
        connections.has(peer.playerId) ||
        local > peer.playerId
      )
        continue;
      const pc = create(peer.playerId);
      try {
        await pc.setLocalDescription(await pc.createOffer());
        if (connections.get(peer.playerId) === pc)
          signal(peer.playerId, {
            type: "offer",
            sdp: pc.localDescription!.sdp,
          });
      } catch {
        if (connections.get(peer.playerId) === pc) closedPeer(peer.playerId);
      }
    }
  }
  async function toggleVoice() {
    if (stream) {
      stopVoice();
      options.send({ proz0Social: 1, type: "voice", enabled: false });
      return;
    }
    if (!options.ready()) {
      notice.textContent = "Chờ kết nối lại trước khi bật voice";
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined"
    ) {
      notice.textContent = "Trình duyệt này không hỗ trợ voice";
      return;
    }
    const version = generation;
    voice.disabled = true;
    notice.textContent =
      "Cho phép mic nếu bạn muốn nói chuyện. Voice trực tiếp có thể bị mạng chặn.";
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (version !== generation || !options.ready()) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = media;
      root.dataset.voiceActive = "true";
      voice.textContent = "Rời voice";
      mute.disabled = false;
      options.send({ proz0Social: 1, type: "voice", enabled: true });
      await reconcile();
    } catch {
      notice.textContent =
        "Chưa bật được mic; kiểm tra quyền trình duyệt. Chat vẫn dùng được.";
    } finally {
      voice.disabled = false;
    }
  }
  async function receiveSignal(from: string, s: Record<string, unknown>) {
    if (!stream || !peers.some((p) => p.playerId === from && p.voice)) return;
    let pc = connections.get(from);
    if (!pc) {
      if (s.type === "answer") return;
      pc = create(from);
    }
    try {
      if (s.type === "candidate") {
        const c = s.candidate as RTCIceCandidateInit;
        if (pc.remoteDescription) await pc.addIceCandidate(c);
        else if ((candidates.get(from)?.length ?? 0) < 100)
          candidates.get(from)?.push(c);
        return;
      }
      if (s.type === "offer" || s.type === "answer") {
        await pc.setRemoteDescription({ type: s.type, sdp: String(s.sdp) });
        if (!stream || connections.get(from) !== pc) return;
        for (const c of candidates.get(from) ?? []) await pc.addIceCandidate(c);
        candidates.set(from, []);
        if (s.type === "offer") {
          await pc.setLocalDescription(await pc.createAnswer());
          if (stream && connections.get(from) === pc)
            signal(from, { type: "answer", sdp: pc.localDescription!.sdp });
        }
      }
    } catch {
      if (connections.get(from) === pc) {
        closedPeer(from);
        notice.textContent = "Voice bị gián đoạn; tắt/bật voice để thử lại.";
      }
    }
  }
  const seen = new Set<string>();
  const append = (m: Chat) => {
    if (seen.has(m.id)) return;
    seen.add(m.id);
    if (seen.size > 200) seen.delete(seen.values().next().value!);
    const p = doc.createElement("p");
    const name = doc.createElement("strong");
    name.textContent = m.displayName + ": ";
    p.append(name, doc.createTextNode(m.text));
    log.append(p);
    while (log.children.length > 50) log.firstElementChild?.remove();
    log.scrollTop = log.scrollHeight;
    if (box.hidden) {
      unread++;
      toggle.textContent = "Chat (" + unread + ")";
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!options.ready()) {
      notice.textContent = "Chờ kết nối lại để gửi";
      return;
    }
    const text = input.value.trim();
    if (!text) return;
    if (Array.from(text).length > 300) {
      notice.textContent = "Tối đa 300 ký tự";
      return;
    }
    options.send({
      proz0Social: 1,
      type: "chat",
      id: crypto.randomUUID(),
      text,
    });
    input.value = "";
  });
  const key = (e: KeyboardEvent) => {
    if (
      e.code === "Enter" &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement) &&
      !e.isComposing
    ) {
      e.preventDefault();
      if (box.hidden) open();
      else input.focus();
    }
    if (e.code === "Escape" && !box.hidden) {
      box.hidden = true;
      input.blur();
    }
  };
  doc.addEventListener("keydown", key);
  return {
    connect: () => {
      if (!subscribed && options.ready()) {
        subscribed = true;
        options.send({ proz0Social: 1, type: "subscribe" });
      }
    },
    inputActive: () => doc.activeElement === input,
    handle: (v: Record<string, unknown>) => {
      if (v.type === "history") {
        for (const m of v.messages as Chat[]) append(m);
      }
      if (v.type === "chat") append(v.message as Chat);
      if (v.type === "presence") {
        peers = v.peers as Peer[];
        roster.textContent = peers
          .map((p) => p.displayName + (p.voice ? " 🎙" : ""))
          .join(" · ");
        void reconcile();
      }
      if (v.type === "signal")
        void receiveSignal(String(v.from), v.signal as Record<string, unknown>);
      if (v.type === "error") notice.textContent = String(v.text);
    },
    disconnect: () => {
      subscribed = false;
      peers = [];
      stopVoice();
      notice.textContent = "Đang kết nối lại; voice đã tắt.";
    },
    destroy: () => {
      stopVoice();
      doc.removeEventListener("keydown", key);
      wrap.remove();
      style.remove();
    },
  };
}

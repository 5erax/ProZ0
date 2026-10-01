export interface ColonyRoomDetails {
  id: string;
  accessToken: string;
  ownerToken?: string;
  worldSeed: string;
  protocolVersion: 2;
  contentCompatibility: unknown;
  worldCompatibility: unknown;
  checkpoint: number;
  roomName?:string;
  clientKey?:string;
  skin?:string;
}
export function normalizePilotEndpoint(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash)
    throw Error("Use the server address only");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw Error("Use HTTPS for an internet server");
  return url.href.replace(/\/$/, "");
}
export const roomStorageKey = (endpoint: string, id: string) =>
  "proz0:coop:" + endpoint + ":" + id;
export function mountColonyCoopLauncher(parent: HTMLElement): () => void {
  const document = parent.ownerDocument,
    target = document.defaultView!;
  const section = document.createElement("details");
  section.style.cssText =
    "border-top:1px solid #60777d;margin-top:16px;padding-top:12px";
  const title = document.createElement("summary");
  title.textContent = "PRIVATE CO-OP · 2–3 PLAYERS";
  title.style.fontSize = "16px";
  section.append(title);
  const fields: Record<string, HTMLInputElement> = {};
  for (const [key, label, type] of [
    ["server", "Server address", "url"],
    ["creation", "Private server key (host)", "password"],
    ["room", "Room code (join)", "text"],
    ["invite", "Invitation key (join)", "password"],
  ]) {
    const wrapper = document.createElement("label");
    wrapper.style.cssText = "display:block;margin:8px 0";
    wrapper.textContent = label + " ";
    const input = document.createElement("input");
    input.type = type!;
    input.setAttribute("aria-label", label!);
    input.style.cssText = "max-width:90%;padding:7px";
    fields[key!] = input;
    wrapper.append(input);
    section.append(wrapper);
  }
  fields.server!.value =
    location.hostname === "5erax.github.io"
      ? "https://proz0-colony.vercel.app/api/pilot"
      : location.origin + "/api/pilot";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const controls = document.createElement("div");
  const enter = (endpoint: string, details: ColonyRoomDetails) => {
    target.localStorage.setItem(
      roomStorageKey(endpoint, details.id),
      JSON.stringify(details),
    );
    const url = new URL(location.href);
    url.search = new URLSearchParams({
      proz0Mode: "colony-coop",
      proz0Server: endpoint,
      proz0Room: details.id,
    }).toString();
    url.hash = "";
    target.location.assign(url.href);
  };
  for (const [kind, label] of [
    ["host", "Host room"],
    ["join", "Join room"],
  ] as const) {
    const button = document.createElement("button");
    button.textContent = label;
    button.className = "p1-review-primary";
    button.style.display = "inline-block";
    button.addEventListener("click", () => {
      void (async () => {
        button.disabled = true;
        status.textContent = "Connecting…";
        const endpoint = normalizePilotEndpoint(fields.server!.value);
        if (kind === "host") {
          const response = await fetch(endpoint + "/rooms", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + fields.creation!.value,
            },
            body: JSON.stringify({ seed: "colony-pilot" }),
          });
          const details = await response.json();
          if (!response.ok)
            throw Error(details.error ?? "Unable to create room");
          enter(endpoint, details);
        } else {
          const id = fields.room!.value.trim(),
            accessToken = fields.invite!.value.trim();
          if (!/^[a-f0-9]{16}$/.test(id))
            throw Error("Enter a valid room code");
          const response = await fetch(endpoint + "/rooms/" + id, {
            headers: { Authorization: "Bearer " + accessToken },
          });
          const details = await response.json();
          if (!response.ok) throw Error(details.error ?? "Unable to join room");
          enter(endpoint, { ...details, accessToken });
        }
      })().catch((error) => {
        status.textContent =
          error instanceof Error ? error.message : "Unable to connect";
        button.disabled = false;
      });
    });
    controls.append(button);
  }
  const hint = document.createElement("p");
  for (const key of Object.keys(target.localStorage)) {
    if (
      !key.startsWith("proz0:coop:") ||
      key.endsWith(":resume") ||
      key.endsWith(":client")
    )
      continue;
    try {
      const details = JSON.parse(
        target.localStorage.getItem(key)!,
      ) as ColonyRoomDetails;
      if (!/^[a-f0-9]{16}$/.test(details.id) || !details.accessToken) continue;
      const endpoint = normalizePilotEndpoint(
        key.slice("proz0:coop:".length, -(details.id.length + 1)),
      );
      const resume = document.createElement("button");
      resume.textContent = "Continue room · " + details.id;
      resume.className = "p1-review-primary";
      resume.addEventListener("click", () => enter(endpoint, details));
      controls.append(resume);
      if (details.ownerToken) {
        const remove = document.createElement("button");
        remove.textContent = "Delete room · " + details.id;
        remove.className = "p1-review-primary";
        remove.addEventListener("click", () => {
          if (
            !target.confirm(
              "Delete this shared world permanently? Export a backup first and disconnect all players.",
            )
          )
            return;
          remove.disabled = true;
          void fetch(endpoint + "/rooms/" + details.id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + details.ownerToken },
          })
            .then(async (response) => {
              const result = await response.json();
              if (!response.ok)
                throw Error(result.error ?? "Unable to remove room");
              for (const suffix of ["", ":resume", ":client"])
                target.localStorage.removeItem(key + suffix);
              resume.remove();
              remove.remove();
              status.textContent = "Shared room removed";
            })
            .catch((error) => {
              status.textContent =
                error instanceof Error
                  ? error.message
                  : "Unable to remove room";
              remove.disabled = false;
            });
        });
        controls.append(remove);
      }
    } catch {
      /* Ignore invalid or obsolete local records. */
    }
  }
  hint.textContent =
    "The host owns the shared world save. An invitation admits up to three players; your solo worlds stay separate.";
  section.append(controls, status, hint);
  parent.append(section);
  return () => section.remove();
}

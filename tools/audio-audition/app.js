/* global document, localStorage, Blob, URL, fetch */
"use strict";

const GATES = [
  {id:"A", title:"Predator state separation", prompt:"Listen for distinct ALERT → CHASE → WINDUP → RELEASE → RECOVERY states."},
  {id:"B", title:"Survival-warning family/severity separation", prompt:"Compare survival warning/high/critical cues for family and urgency separation."},
  {id:"C", title:"Cold Rain masking/readability", prompt:"Compare Cold Rain warning/active material and note masking/readability problems."},
  {id:"D", title:"Loop click / fatigue", prompt:"Run manifest loop assets continuously and listen for boundary clicks or short-cycle fatigue."},
  {id:"E", title:"Ambience/music yields to critical cues", prompt:"Compare ambience/music BED material with CRITICAL cues."},
  {id:"F", title:"Ruin / Ancient Alloy Shard tone + canon guardrails", prompt:"Confirm engineered/old/absent/unresolved tone without implying builder identity, language, faction, purpose, supernatural truth, or decoded technology."},
];

let data = null;
let queue = [];
let queuePos = -1;

const byId = id => document.getElementById(id);
const unique = values => [...new Set(values)].sort();
const gateRows = id => data.events.filter(row => row.gates.includes(id));
const key = (gate, field) => "proz0-audio-audition:" + data.audio_source.expected_head + ":" + gate + ":" + field;

function assetCard(row) {
  const node = byId("asset-template").content.firstElementChild.cloneNode(true);
  node.querySelector(".event-id").textContent = row.event_id;
  const badges = node.querySelector(".badges");
  [row.family, row.priority, row.variant, row.loop ? "LOOP" : "ONE-SHOT"].forEach(value => {
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = value;
    badges.appendChild(span);
  });
  const dl = node.querySelector(".metadata");
  [["family",row.family],["priority",row.priority],["loop",String(row.loop)],["variant",row.variant],["archive",row.archive],["internal_path",row.internal_path]].forEach(([name,value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = value;
    dl.append(dt,dd);
  });
  const audio = node.querySelector("audio");
  audio.src = row.audio_url;
  node.querySelector(".replay").addEventListener("click", () => {
    audio.currentTime = 0;
    audio.play();
  });
  const loop = node.querySelector(".loop-toggle");
  loop.disabled = !row.loop;
  loop.addEventListener("change", () => { audio.loop = row.loop && loop.checked; });
  return node;
}

function renderAssets() {
  const family = byId("family-filter").value;
  const priority = byId("priority-filter").value;
  const search = byId("event-filter").value.trim().toLowerCase();
  const loopsOnly = byId("loops-only").checked;
  const rows = data.events.filter(row =>
    (!family || row.family === family) &&
    (!priority || row.priority === priority) &&
    (!search || row.event_id.toLowerCase().includes(search)) &&
    (!loopsOnly || row.loop)
  );
  byId("asset-count").textContent = rows.length + " / " + data.events.length + " WAV variants";
  byId("asset-list").replaceChildren(...rows.map(assetCard));
}

function renderGates() {
  const grid = byId("gate-grid");
  GATES.forEach(gate => {
    const rows = gateRows(gate.id);
    const card = document.createElement("article");
    card.className = "gate-card";
    card.innerHTML =
      '<p class="eyebrow">Gate ' + gate.id + '</p>' +
      '<h3>' + gate.title + '</h3>' +
      '<p>' + gate.prompt + '</p>' +
      '<p class="gate-events"></p>' +
      '<button type="button" class="load-compare">Load ' + rows.length + ' variants for comparison</button>' +
      '<fieldset aria-label="Gate ' + gate.id + ' verdict">' +
      '<label class="inline"><input type="radio" name="gate-' + gate.id + '" value="PASS"> PASS</label>' +
      '<label class="inline"><input type="radio" name="gate-' + gate.id + '" value="FAIL"> FAIL</label>' +
      '<label class="inline"><input type="radio" name="gate-' + gate.id + '" value="NEEDS FOLLOW-UP"> NEEDS FOLLOW-UP</label>' +
      '</fieldset><textarea placeholder="Human listening notes for Gate ' + gate.id + '…"></textarea>';
    card.querySelector(".gate-events").textContent = unique(rows.map(row => row.event_id)).join(" · ");

    const status = localStorage.getItem(key(gate.id, "status"));
    if (status) {
      [...card.querySelectorAll('input[type="radio"]')].forEach(radio => { radio.checked = radio.value === status; });
    }
    const notes = card.querySelector("textarea");
    notes.value = localStorage.getItem(key(gate.id, "notes")) || "";
    card.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener("change", () => localStorage.setItem(key(gate.id, "status"), radio.value));
    });
    notes.addEventListener("input", () => localStorage.setItem(key(gate.id, "notes"), notes.value));
    card.querySelector(".load-compare").addEventListener("click", () => loadComparison(gate));
    grid.appendChild(card);
  });
}

function loadComparison(gate) {
  queue = gateRows(gate.id);
  queuePos = queue.length ? 0 : -1;
  byId("compare-title").textContent = "Gate " + gate.id + " — " + gate.title;
  renderComparison();
  byId("comparison").scrollIntoView({behavior:"smooth", block:"start"});
}

function renderComparison() {
  const audio = byId("compare-audio");
  const loop = byId("compare-loop");
  const list = byId("compare-queue");
  list.replaceChildren();
  queue.forEach((row, i) => {
    const li = document.createElement("li");
    li.textContent = row.event_id + " · " + row.variant + " · " + row.priority + (row.loop ? " · LOOP" : "");
    if (i === queuePos) li.className = "active";
    li.addEventListener("click", () => { queuePos = i; renderComparison(); });
    list.appendChild(li);
  });
  const row = queue[queuePos];
  if (!row) {
    audio.removeAttribute("src");
    audio.load();
    byId("compare-meta").textContent = "No comparison queue loaded.";
    loop.disabled = true;
    loop.checked = false;
    return;
  }
  audio.src = row.audio_url;
  audio.loop = false;
  loop.checked = false;
  loop.disabled = !row.loop;
  byId("compare-meta").textContent = row.event_id + " · family " + row.family + " · priority " + row.priority + " · " + row.variant + " · " + row.internal_path;
  byId("compare-prev").disabled = queuePos <= 0;
  byId("compare-next").disabled = queuePos >= queue.length - 1;
}

function exportVerdict() {
  const lines = [
    "# P1-AUD-002 Human Listening Verdict",
    "",
    "- Source task: #80 / P1-AUD-002",
    "- Source PR: #95",
    "- Exact audio head expected/validated by harness: " + data.audio_source.expected_head,
    "- Harness task: #119 / P1-DEVOPS-003",
    "- Human listener: <name/role>",
    "- Listening environment/headphones/speakers: <describe>",
    "- Date/time: <record locally>",
    "",
    "> Local human-review template only. Exporting does not post to GitHub or mark #80 accepted.",
    ""
  ];
  GATES.forEach(gate => {
    lines.push(
      "## Gate " + gate.id + " — " + gate.title,
      "",
      "**Verdict:** " + (localStorage.getItem(key(gate.id, "status")) || "NOT RECORDED"),
      "",
      localStorage.getItem(key(gate.id, "notes")) || "<notes>",
      ""
    );
  });
  lines.push(
    "## Return / evidence routing",
    "",
    "Return completed human listening evidence to PM-B and A-QA through the existing #80 lifecycle.",
    ""
  );
  const blob = new Blob([lines.join("\n")], {type:"text/markdown;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "p1-aud-002-human-listening-" + data.audio_source.expected_head.slice(0,8) + ".md";
  a.click();
  URL.revokeObjectURL(url);
}

async function init() {
  const response = await fetch("/api/index", {cache:"no-store"});
  if (!response.ok) throw new Error("index load failed: " + response.status);
  data = await response.json();

  byId("source-line").textContent =
    "Validated source: #80 / PR #95 @ " + data.audio_source.expected_head +
    " · " + data.events.length + " manifest-listed WAV variants";

  unique(data.events.map(row => row.family)).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    byId("family-filter").appendChild(option);
  });
  unique(data.events.map(row => row.priority)).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    byId("priority-filter").appendChild(option);
  });

  ["family-filter","priority-filter","loops-only"].forEach(id => byId(id).addEventListener("change", renderAssets));
  byId("event-filter").addEventListener("input", renderAssets);
  byId("compare-prev").addEventListener("click", () => { if (queuePos > 0) { queuePos--; renderComparison(); } });
  byId("compare-next").addEventListener("click", () => { if (queuePos + 1 < queue.length) { queuePos++; renderComparison(); } });
  byId("compare-replay").addEventListener("click", () => {
    const audio = byId("compare-audio");
    audio.currentTime = 0;
    audio.play();
  });
  byId("compare-loop").addEventListener("change", event => {
    const row = queue[queuePos];
    byId("compare-audio").loop = Boolean(row && row.loop && event.target.checked);
  });
  byId("export-notes").addEventListener("click", exportVerdict);

  renderGates();
  renderAssets();
  renderComparison();
}

init().catch(error => {
  document.body.innerHTML = '<main><section class="panel"><h1>Harness failed</h1><pre></pre></section></main>';
  document.querySelector("pre").textContent = String(error.stack || error);
});

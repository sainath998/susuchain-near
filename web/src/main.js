import {
  CONFIG, view, nearBalance, tokenBalance, onSession, getSession, restoreSession, connectWallet, signOut,
  createLocalAccount, createCircle, joinCircle, contribute, settleRound, tokenFaucet,
  neighbours, neighbourSession, addNeighbours, prettyError,
} from "./near.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const state = { circles: [], filter: "all", me: null, busy: new Set(), loaded: false, highlight: null, openHistory: new Set() };
const params = new URLSearchParams(location.search);
if (params.has("circle")) state.highlight = Number(params.get("circle"));

// ---------- formatting ----------
const DECIMALS = { near: 24 };
DECIMALS[CONFIG.tokenId] = 6;
const SYMBOL = { near: "NEAR" };
SYMBOL[CONFIG.tokenId] = "tUSDC";

function fmt(amount, asset, dp = 2) {
  const d = DECIMALS[asset] ?? 6;
  const v = BigInt(amount);
  const whole = v / 10n ** BigInt(d);
  const frac = (v % 10n ** BigInt(d)).toString().padStart(d, "0").slice(0, dp).replace(/0+$/, "");
  return `${whole.toLocaleString()}${frac ? "." + frac : ""}`;
}
const money = (amount, asset) => `${fmt(amount, asset)} ${SYMBOL[asset] || asset}`;
const toUnits = (value, asset) => {
  const d = DECIMALS[asset] ?? 6;
  const [w, f = ""] = String(value).split(".");
  return BigInt(w || "0") * 10n ** BigInt(d) + BigInt((f + "0".repeat(d)).slice(0, d) || "0");
};
const short = (id) => {
  if (!id) return "";
  const s = getSession();
  if (s && id === s.accountId) return "you";
  // "amara-x7k2.parent.testnet" -> "amara"; "saver-lx3k9a.testnet" -> "saver"
  return id.split(".")[0].replace(/-[a-z0-9]{3,}$/, "");
};
function until(ns) {
  const ms = Number(BigInt(ns) / 1000000n) - Date.now();
  if (ms <= 0) return { text: "deadline passed", late: true };
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const text = d ? `${d}d ${h}h left` : h ? `${h}h ${m}m left` : `${m}m ${s % 60}s left`;
  return { text, late: false };
}
const roundLabel = (sec) => sec % 86400 === 0 ? `${sec / 86400} day${sec === 86400 ? "" : "s"}` : sec % 3600 === 0 ? `${sec / 3600} h` : `${Math.round(sec / 60)} min`;

// Only touch the DOM when markup actually changed, so periodic refreshes never
// swap a button out from under a user's click.
function setHTML(el, html) {
  if (el.__html === html) return;
  el.__html = html;
  el.innerHTML = html;
}

// ---------- toast ----------
let toastTimer;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.innerHTML = msg;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), kind === "err" ? 7000 : 4000);
}

async function act(key, label, fn) {
  if (state.busy.has(key)) return;
  state.busy.add(key);
  render();
  try {
    await fn();
    toast(label);
  } catch (e) {
    console.error(e);
    toast(esc(prettyError(String(e?.message || e))), "err");
  } finally {
    state.busy.delete(key);
    await refresh();
  }
}
const busyBtn = (key, text) => (state.busy.has(key) ? `<span class="spinner"></span> ${text}…` : text);

// ---------- data ----------
async function refresh() {
  try {
    const total = await view("total_circles");
    const pages = [];
    for (let i = 0; i < total; i += 50) pages.push(view("get_circles", { from_index: i, limit: 50 }));
    state.circles = (await Promise.all(pages)).flat().reverse();
    state.loaded = true;
  } catch (e) {
    console.error(e);
  }
  const s = getSession();
  if (s) {
    const [near, tusdc, rep] = await Promise.all([nearBalance(s.accountId), tokenBalance(s.accountId), view("get_reputation", { account_id: s.accountId }).catch(() => null)]);
    state.me = { near, tusdc, rep };
  } else state.me = null;
  render();
}

// ---------- render ----------
function render() {
  renderSession();
  renderMe();
  renderCircles();
  renderCreateHint();
}

function renderSession() {
  const s = getSession();
  const box = $("#sessionBox"), cta = $("#heroCta");
  if (!s) {
    setHTML(box, `<button class="ghost small" data-action="wallet">Connect wallet</button>`);
    setHTML(cta, `
      <button class="primary" data-action="local">${busyBtn("local", "Try it on testnet: 1 click")}</button>
      <button class="ghost" data-action="wallet">Connect a NEAR wallet</button>
      <p class="note">One click creates a fresh testnet account with 10 test NEAR. Its key stays in this browser. No sign-up, no real money.</p>`);
    return;
  }
  const bal = state.me?.near != null ? ` · ${fmt(state.me.near, "near")} NEAR` : "";
  setHTML(box, `<span class="chip" title="${esc(s.accountId)}"><span class="dot"></span><span>${esc(s.accountId)}${bal}</span></span>
    <button class="ghost small" data-action="signout">Sign out</button>`);
  setHTML(cta, `<a class="primary" href="#createPanel" style="text-decoration:none">Start a circle</a>
    <button class="ghost" data-action="filter-open">Join an open circle</button>
    <p class="note">Signed in as <b>${esc(s.accountId)}</b> (${s.kind === "local" ? "testnet account, key kept in this browser" : "NEAR wallet"}).</p>`);
}

function renderMe() {
  const s = getSession(), p = $("#mePanel");
  if (!s || !state.me) { p.hidden = true; return; }
  p.hidden = false;
  const r = state.me.rep || { circles_completed: 0, contributions_on_time: 0, defaults: 0, circles_joined: 0, saved: {} };
  const saved = Object.entries(r.saved || {}).map(([a, v]) => money(v, a)).join(" + ") || "nothing yet";
  setHTML(p, `<div class="me">
    <div class="who">
      <h2>Your savings record</h2>
      <p class="muted" style="margin:0">Saved through circles: <b>${esc(saved)}</b>. This record lives on-chain under your account and travels with you to any app.</p>
      <div class="me-actions">
        <span class="chip">${fmt(state.me.near ?? 0n, "near")} NEAR</span>
        <span class="chip">${fmt(state.me.tusdc ?? 0n, CONFIG.tokenId)} tUSDC</span>
        <button class="ghost small" data-action="faucet">${busyBtn("faucet", "Get 200 test USDC")}</button>
      </div>
    </div>
    <div class="stat"><b>${r.circles_completed}</b><span>circles completed</span></div>
    <div class="stat"><b>${r.contributions_on_time}</b><span>on-time payments</span></div>
    <div class="stat ${r.defaults ? "bad" : ""}"><b>${r.defaults}</b><span>missed payments</span></div>
    <div class="stat"><b>${r.circles_joined}</b><span>circles joined</span></div>
  </div>`);
}

function visibleCircles() {
  const s = getSession();
  return state.circles.filter((c) => {
    if (state.filter === "mine") return s && c.members.includes(s.accountId);
    if (state.filter === "open") return c.status === "open";
    return true;
  });
}

let renderCircles = function () {
  const el = $("#circles");
  if (!state.loaded) return;
  const list = visibleCircles();
  if (!list.length) {
    setHTML(el, `<p class="muted">${state.filter === "mine" ? "You are not in any circle yet. Join an open one or start your own below." : "No circles here yet."}</p>`);
    return;
  }
  setHTML(el, list.map(circleCard).join(""));
  if (state.highlight != null) {
    const card = el.querySelector(`[data-circle="${state.highlight}"]`);
    if (card) { card.scrollIntoView({ block: "center" }); state.highlight = null; }
  }
};

function ring(c) {
  const R = 58, cx = 75, cy = 75, n = c.size;
  const order = c.status === "open" ? c.members : c.order;
  const received = new Set(c.payouts.map((p) => p.to));
  const next = c.status === "active" ? c.order[c.round] : null;
  const s = getSession();
  let dots = "";
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    const m = order[i];
    let fill = "var(--paper)", stroke = "var(--line)", r = 9, dash = "3 3";
    if (m) { dash = ""; stroke = "var(--ink)"; }
    if (m && c.paid.includes(m)) fill = "var(--ok-soft)";
    if (m && received.has(m)) { fill = "var(--ink)"; }
    if (m && m === next) { fill = "var(--gold)"; stroke = "var(--gold)"; r = 12; }
    const you = s && m === s.accountId ? `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="none" stroke="var(--gold)" stroke-width="2"/>` : "";
    const paidMark = m && c.status === "active" && c.paid.includes(m) ? `<path d="M${x - 4} ${y} l3 3 l5 -6" stroke="var(--ok)" stroke-width="2" fill="none"/>` : "";
    dots += `${you}<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ""}><title>${esc(m || "open seat")}</title></circle>${paidMark}`;
  }
  const pot = BigInt(c.contribution) * BigInt(c.size);
  const label = c.status === "completed" ? "paid out" : c.status === "open" ? "pot per round" : `round ${c.round + 1} pot`;
  return `<svg class="ring" viewBox="0 0 150 150" role="img" aria-label="Circle of ${n} members">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--gold-soft)" stroke-width="10"/>
    ${c.status === "active" ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--gold)" stroke-width="10" stroke-dasharray="${(2 * Math.PI * R * c.round) / n} 999" transform="rotate(-90 ${cx} ${cy})" opacity="0.55"/>` : ""}
    ${c.status === "completed" ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--gold)" stroke-width="10" opacity="0.55"/>` : ""}
    ${dots}
    <text class="pot" x="${cx}" y="${cy + 2}" text-anchor="middle">${esc(fmt(pot, c.asset))}</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle">${esc(SYMBOL[c.asset] || "tokens")} · ${label}</text>
  </svg>`;
}

function circleCard(c) {
  const s = getSession();
  const me = s?.accountId;
  const isMember = me && c.members.includes(me);
  const late = c.status === "active" && until(c.round_deadline).late;
  const badge = c.status === "active" ? (late ? `<span class="badge late">Settle due</span>` : `<span class="badge active">Round ${c.round + 1} of ${c.size}</span>`)
    : c.status === "open" ? `<span class="badge open">${c.size - c.members.length} seat${c.size - c.members.length === 1 ? "" : "s"} open</span>`
    : `<span class="badge completed">Completed</span>`;
  const lockedTotal = Object.values(c.collateral || {}).reduce((a, v) => a + BigInt(v), 0n);
  const deadline = c.status === "active" ? `<span data-deadline="${c.round_deadline}" data-late="${late ? 1 : 0}"></span>` : c.status === "open" ? "starts when full" : "finished";
  const facts = [
    ["Each pays", `${money(c.contribution, c.asset)} / ${roundLabel(c.round_seconds)}`],
    ["Members", `${c.members.length} of ${c.size}`],
    ["This round", deadline],
    ["Collateral held", money(lockedTotal, c.asset)],
    ["Entry rule", c.min_completed ? `${c.min_completed}+ completed, no misses` : "open to anyone"],
  ];

  const order = c.status === "open" ? c.members : c.order;
  const received = Object.fromEntries(c.payouts.map((p) => [p.to, p.round]));
  const missed = new Set((c.defaults || []).map((d) => d.member));
  const rows = order.map((m, i) => {
    const nCls = received[m] ? "got" : c.status === "active" && i === c.round ? "next" : "";
    let st = "";
    if (c.status === "open") st = "joined";
    else if (received[m]) st = `got pot · round ${received[m]}`;
    else if (c.status === "active") st = i === c.round ? "receives this round" : `receives round ${i + 1}`;
    let pay = "";
    if (c.status === "active") pay = c.paid.includes(m) ? `<span class="st paid">paid ✓</span>` : late ? `<span class="st miss">missed</span>` : `<span class="st">waiting</span>`;
    else if (missed.has(m)) pay = `<span class="st miss">had a miss</span>`;
    return `<li class="${m === me ? "you" : ""}"><span class="n ${nCls}">${i + 1}</span><span class="acct" title="${esc(m)}">${esc(short(m))} <span class="st">· ${st}</span></span>${pay}</li>`;
  }).join("") + Array.from({ length: c.size - order.length }, () => `<li><span class="n">·</span><span class="acct muted">open seat</span></li>`).join("");

  // actions
  const acts = [];
  const k = (x) => `${x}-${c.id}`;
  if (!s && c.status !== "completed") acts.push(`<span class="why">Sign in to join or pay.</span>`);
  if (s && c.status === "open" && !isMember) acts.push(`<button class="primary small" data-action="join" data-id="${c.id}">${busyBtn(k("join"), `Join · lock ${money(c.contribution, c.asset)}`)}</button>`);
  if (s && c.status === "active" && isMember && !c.paid.includes(me) && !late) acts.push(`<button class="primary small" data-action="pay" data-id="${c.id}">${busyBtn(k("pay"), `Pay ${money(c.contribution, c.asset)}`)}</button>`);
  if (s && c.status === "active" && isMember && c.paid.includes(me)) acts.push(`<span class="why">You've paid this round.</span>`);
  if (s && late) acts.push(`<button class="warn small" data-action="settle" data-id="${c.id}">${busyBtn(k("settle"), "Settle round")}</button><span class="why">Missing shares come out of collateral.</span>`);
  if (s?.kind === "local" && isMember) {
    const mine = neighbours().map((n) => n.id);
    if (c.status === "open") acts.push(`<button class="ghost small" data-action="fill" data-id="${c.id}">${busyBtn(k("fill"), `Fill ${c.size - c.members.length} seats with test neighbours`)}</button>`);
    const unpaid = c.status === "active" && !late ? c.members.filter((m) => mine.includes(m) && !c.paid.includes(m)) : [];
    if (unpaid.length) {
      acts.push(`<button class="ghost small" data-action="npay" data-id="${c.id}">${busyBtn(k("npay"), "Neighbours pay")}</button>`);
      if (unpaid.length > 1 || (unpaid.length === 1 && !c.paid.includes(me))) acts.push(`<button class="ghost small" data-action="nskip" data-id="${c.id}">${busyBtn(k("nskip"), "…but one skips")}</button>`);
    }
  }
  if (c.status !== "completed") acts.push(`<button class="ghost small" data-action="share" data-id="${c.id}">Invite link</button>`);

  const hist = c.payouts.length || (c.defaults || []).length
    ? `<details class="history" data-hist="${c.id}" ${state.openHistory.has(c.id) ? "open" : ""}><summary>History (${c.payouts.length} payout${c.payouts.length === 1 ? "" : "s"})</summary><ol>${c.payouts.map((p) =>
      `<li>Round ${p.round}: ${money(p.amount, c.asset)} to ${esc(short(p.to))}${p.covered_by_collateral.length ? ` · ${p.covered_by_collateral.map(short).map(esc).join(", ")} covered by collateral` : ""}${p.shortfall !== "0" ? ` · short ${money(p.shortfall, c.asset)}` : ""}</li>`).join("")}</ol></details>`
    : "";

  return `<article class="circle ${state.highlight === c.id ? "highlight" : ""}" data-circle="${c.id}">
    <div class="c-head"><div><h3>${esc(c.name)}</h3><div class="c-meta">#${c.id} · started by ${esc(short(c.creator))} · ${esc(SYMBOL[c.asset] || c.asset)}</div></div>${badge}</div>
    <div class="c-body">${ring(c)}<div class="facts">${facts.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join("")}</div></div>
    <ul class="members">${rows}</ul>
    <div class="c-actions">${acts.join("")}</div>
    ${hist}
  </article>`;
}

function renderCreateHint() {
  const f = $("#createForm");
  const asset = f.asset.value === "near" ? "near" : CONFIG.tokenId;
  const s = getSession();
  let hint = "You join your own circle by locking one contribution as collateral.";
  if (asset !== "near") hint += " Test USDC is free from the button in your savings record.";
  if (s?.kind === "local") hint += " With a one-click account you can fill the other seats with test neighbours.";
  if (!s) hint = "Sign in first (one click on testnet).";
  $("#createHint").textContent = hint;
  f.querySelector("button[type=submit]").innerHTML = busyBtn("create", "Create circle");
}

// countdowns tick without a full re-render
function tick() {
  document.querySelectorAll("[data-deadline]").forEach((el) => {
    const u = until(el.dataset.deadline);
    if (el.textContent !== u.text) el.textContent = u.text;
    if (u.late && el.dataset.late === "0") { el.dataset.late = "1"; render(); }
  });
}
setInterval(tick, 1000);
const _renderCircles = renderCircles;
renderCircles = function () { _renderCircles(); tick(); };

// ---------- events ----------
const byId = (id) => state.circles.find((c) => c.id === Number(id));

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action, c = byId(b.dataset.id);
  if (a === "local") {
    return act("local", "Your testnet account is ready with 10 NEAR.", async () => {
      await createLocalAccount("saver");
    });
  }
  if (a === "wallet") return connectWallet().catch((err) => toast(esc(err.message), "err"));
  if (a === "signout") return signOut();
  if (a === "filter-open") { setFilter("open"); return $("#circles").scrollIntoView({ behavior: "smooth" }); }
  if (a === "faucet") return act("faucet", "200 test USDC added.", () => tokenFaucet(200_000_000));
  if (a === "join") {
    return act(`join-${c.id}`, `Joined “${esc(c.name)}”. Your collateral is locked in the contract.`, async () => {
      await ensureTokens(c, BigInt(c.contribution));
      await joinCircle(c);
    });
  }
  if (a === "pay") {
    return act(`pay-${c.id}`, "Contribution received.", async () => {
      await ensureTokens(c, BigInt(c.contribution));
      await contribute(c);
    });
  }
  if (a === "settle") return act(`settle-${c.id}`, "Round settled and paid out.", () => settleRound(c));
  if (a === "fill") return act(`fill-${c.id}`, "Neighbours joined. The payout order was shuffled on-chain.", () => fillWithNeighbours(c));
  if (a === "npay") return act(`npay-${c.id}`, "Neighbours paid their share.", () => neighboursPay(c, false));
  if (a === "nskip") return act(`nskip-${c.id}`, "Neighbours paid, except one. Wait for the deadline, then settle.", () => neighboursPay(c, true));
  if (a === "share") {
    const url = `${location.origin}${location.pathname}?circle=${c.id}`;
    try { await navigator.clipboard.writeText(url); toast("Invite link copied."); } catch { toast(esc(url)); }
  }
});

async function ensureTokens(c, need, sess) {
  if (c.asset === "near") return;
  const who = sess?.accountId || getSession().accountId;
  const have = await tokenBalance(who);
  if (have < need) throw new Error(`You need ${money(need, c.asset)}. Use “Get 200 test USDC” first.`);
}

async function fillWithNeighbours(c) {
  const seats = c.size - c.members.length;
  const isNear = c.asset === "near";
  // NEAR circles: collateral + every round's contribution + gas. Token circles: just gas.
  // (NEAR reserves prepaid gas up front, ~0.3 NEAR per 300 Tgas call; unused gas is refunded.)
  const per = isNear ? Number(fmt(BigInt(c.contribution) * BigInt(c.size + 1), "near", 4)) + 1 : 1;
  const s = getSession();
  const bal = Number(fmt((await nearBalance(s.accountId)) ?? 0n, "near", 4));
  if (per * seats > bal - 0.5) throw new Error(`Funding ${seats} neighbours needs about ${(per * seats).toFixed(2)} NEAR; you have ${bal.toFixed(2)}. Try a smaller contribution or a tUSDC circle.`);
  const ns = await addNeighbours(seats, per.toFixed(3));
  for (const n of ns) {
    const ss = neighbourSession(n);
    if (!isNear) await tokenFaucet(BigInt(c.contribution) * BigInt(c.size + 1), ss);
    await joinCircle(c, ss);
  }
}

async function neighboursPay(c, oneSkips) {
  const mine = neighbours().filter((n) => c.members.includes(n.id) && !c.paid.includes(n.id));
  const payers = oneSkips ? mine.slice(0, -1) : mine;
  for (const n of payers) {
    const ss = neighbourSession(n);
    await ensureTokens(c, BigInt(c.contribution), ss);
    await contribute(c, ss);
    c = (await view("get_circle", { id: c.id })) || c;
    if (c.status !== "active") break;
  }
}

function setFilter(f) {
  state.filter = f;
  document.querySelectorAll(".filters button").forEach((b) => b.classList.toggle("on", b.dataset.filter === f));
  renderCircles();
}
document.querySelectorAll(".filters button").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));

// Remember which History panels are open across re-renders.
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.dataset.hist) return;
  const id = Number(d.dataset.hist);
  if (d.open) state.openHistory.add(id); else state.openHistory.delete(id);
}, true);

$("#createForm").addEventListener("change", renderCreateHint);
$("#createForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  if (!getSession()) return toast("Sign in first: one click on testnet.", "err");
  const asset = f.asset.value === "near" ? "near" : CONFIG.tokenId;
  const contribution = toUnits(f.amount.value, asset);
  const size = Number(f.size.value), round_seconds = Number(f.round.value), min_completed = Number(f.minc.value || 0);
  act("create", "Circle created. Share the invite link to fill the seats.", async () => {
    if (asset !== "near") await ensureTokens({ asset }, contribution);
    const out = await createCircle({ name: f.name.value.trim(), asset, contribution, size, round_seconds, min_completed, joinNow: true });
    let id = typeof out === "number" ? out : decodeReturn(out);
    if (id == null) id = (await view("total_circles")) - 1;
    state.highlight = id;
    if (asset !== "near") await joinCircle({ id, asset, contribution: contribution.toString() });
    setFilter("mine");
  });
});

function decodeReturn(outcome) {
  try {
    const v = outcome?.status?.SuccessValue;
    if (v != null) return JSON.parse(atob(v));
  } catch {}
  return null;
}

// ---------- boot ----------
$("#contractLink").textContent = CONFIG.contractId;
$("#contractLink").href = `${CONFIG.explorer}/address/${CONFIG.contractId}`;
onSession(() => refresh());
restoreSession();
refresh();
setInterval(refresh, 12000);

// Optional caption bar for recorded walkthroughs: open the app with ?captions
// and call window.susuCaption("text"). Has no effect otherwise.
if (params.has("captions")) {
  const bar = document.createElement("div");
  bar.className = "caption-bar";
  document.body.appendChild(bar);
  window.susuCaption = (text) => {
    bar.textContent = text || "";
    bar.classList.toggle("show", Boolean(text));
  };
}

// NEAR access layer for the SusuChain web app.
// Two ways to sign:
//   - "wallet": any NEAR wallet through @hot-labs/near-connect
//   - "local":  a testnet account created in one click; its key lives in this
//               browser's localStorage (testnet only, never use for real funds)
import { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } from "near-api-js";

export const CONFIG = {
  network: "testnet",
  contractId: import.meta.env.VITE_CONTRACT || "susuchain.testnet",
  tokenId: import.meta.env.VITE_TOKEN || "tusdc-d0wm.testnet",
  rpc: "https://test.rpc.fastnear.com",
  explorer: "https://testnet.nearblocks.io",
  faucet: "https://helper.testnet.near.org/account",
};

export const provider = new JsonRpcProvider({ url: CONFIG.rpc });

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// ---------- reads ----------
export const view = (method, args = {}, contractId = CONFIG.contractId) =>
  provider.callFunction({ contractId, method, args });

export async function nearBalance(accountId) {
  try {
    const a = await provider.viewAccount({ accountId });
    return BigInt(a.amount);
  } catch {
    return null;
  }
}

export async function tokenBalance(accountId) {
  try { return BigInt(await view("ft_balance_of", { account_id: accountId }, CONFIG.tokenId)); } catch { return 0n; }
}

// ---------- session ----------
let connector = null;
let session = null; // { kind: "local"|"wallet", accountId, account?, wallet? }
const listeners = new Set();
export const onSession = (fn) => { listeners.add(fn); fn(session); };
const emit = () => listeners.forEach((fn) => fn(session));
export const getSession = () => session;

async function getConnector() {
  if (connector) return connector;
  const { NearConnector } = await import("@hot-labs/near-connect");
  connector = new NearConnector({ network: CONFIG.network, features: { signAndSendTransaction: true, testnet: true } });
  connector.on("wallet:signIn", async (t) => {
    session = { kind: "wallet", accountId: t.accounts[0].accountId, wallet: await connector.wallet() };
    store.del("susu.local");
    emit();
  });
  connector.on("wallet:signOut", () => { if (session?.kind === "wallet") { session = null; emit(); } });
  return connector;
}

export async function restoreSession() {
  const local = store.get("susu.local");
  if (local?.accountId && local?.key) {
    session = { kind: "local", accountId: local.accountId, account: new Account(local.accountId, provider, local.key) };
    emit();
    return;
  }
  try {
    const c = await getConnector();
    const wallet = await c.wallet();
    const accounts = await wallet.getAccounts();
    if (accounts?.length) {
      session = { kind: "wallet", accountId: accounts[0].accountId, wallet };
      emit();
    }
  } catch { /* not signed in */ }
}

export async function connectWallet() {
  const c = await getConnector();
  await c.connect();
}

export async function signOut() {
  if (session?.kind === "wallet") {
    try { await (await getConnector()).disconnect(); } catch {}
  }
  store.del("susu.local");
  store.del("susu.neighbours");
  session = null;
  emit();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForAccount(accountId) {
  for (let i = 0; i < 25; i++) {
    if ((await nearBalance(accountId)) !== null) return;
    await sleep(1200);
  }
  throw new Error("The faucet created the account but it has not appeared yet; try again in a minute.");
}

/** One-click testnet account via the public testnet faucet (10 NEAR). */
export async function createLocalAccount(name) {
  const clean = (name || "saver").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "saver";
  const accountId = `${clean}-${Date.now().toString(36)}.testnet`;
  const kp = KeyPair.fromRandom("ed25519");
  const res = await fetch(CONFIG.faucet, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newAccountId: accountId, newAccountPublicKey: kp.getPublicKey().toString() }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("The public testnet faucet is rate-limiting this network. Connect a NEAR wallet instead, or try again later.");
    throw new Error(`Faucet error ${res.status}: ${text.slice(0, 160)}`);
  }
  await waitForAccount(accountId);
  store.set("susu.local", { accountId, key: kp.toString() });
  session = { kind: "local", accountId, account: new Account(accountId, provider, kp.toString()) };
  emit();
  return accountId;
}

// ---------- writes ----------
const TGAS = (n) => teraToGas(String(n));

/** Sign and send a function call with whichever signer is active. */
export async function callAs(sess, { contractId = CONFIG.contractId, method, args = {}, deposit = 0n, gas = 150 }) {
  if (!sess) throw new Error("Sign in first");
  if (sess.kind === "local") {
    for (let attempt = 1; ; attempt++) {
      try {
        return await sess.account.callFunction({ contractId, methodName: method, args, gas: TGAS(gas), deposit: BigInt(deposit) });
      } catch (e) {
        const msg = String(e?.message || e);
        if (attempt < 3 && /expired|timeout|nonce|50[23]|fetch/i.test(msg)) { await sleep(1500 * attempt); continue; }
        throw new Error(prettyError(msg));
      }
    }
  }
  try {
    const out = await sess.wallet.signAndSendTransaction({
      signerId: sess.accountId,
      receiverId: contractId,
      actions: [{ type: "FunctionCall", params: { methodName: method, args, gas: TGAS(gas).toString(), deposit: BigInt(deposit).toString() } }],
    });
    const failure = out?.status?.Failure || out?.receipts_outcome?.find((r) => r.outcome?.status?.Failure)?.outcome?.status?.Failure;
    if (failure) throw new Error(JSON.stringify(failure));
    return out;
  } catch (e) {
    throw new Error(prettyError(String(e?.message || e)));
  }
}

export const call = (opts) => callAs(session, opts);

export function prettyError(msg) {
  const m = msg.match(/assertion failed: ([^\\"\n]+)/) || msg.match(/panicked: ([^\\"\n]+)/);
  if (m) return m[1];
  if (/NotEnoughBalance|LackBalance/i.test(msg)) return "Not enough NEAR in this account for that.";
  return msg.length > 220 ? msg.slice(0, 220) + "…" : msg;
}

// Circle actions ------------------------------------------------------------
export function createCircle({ name, asset, contribution, size, round_seconds, min_completed, joinNow }) {
  const isNear = asset === "near";
  return call({
    method: "create_circle",
    args: { name, asset, contribution: contribution.toString(), size, round_seconds, min_completed },
    deposit: isNear && joinNow ? contribution : 0n,
  });
}

export function joinCircle(circle, sess = session) {
  if (circle.asset === "near") return callAs(sess, { method: "join_circle", args: { id: circle.id }, deposit: BigInt(circle.contribution) });
  return ftCall(sess, circle.contribution, { join: circle.id });
}

export function contribute(circle, sess = session) {
  if (circle.asset === "near") return callAs(sess, { method: "contribute", args: { id: circle.id }, deposit: BigInt(circle.contribution), gas: 200 });
  return ftCall(sess, circle.contribution, { contribute: circle.id });
}

export const settleRound = (circle) => call({ method: "settle_round", args: { id: circle.id }, gas: 200 });

function ftCall(sess, amount, msg) {
  return callAs(sess, {
    contractId: CONFIG.tokenId,
    method: "ft_transfer_call",
    args: { receiver_id: CONFIG.contractId, amount: String(amount), msg: JSON.stringify(msg) },
    deposit: 1n,
    gas: 300,
  });
}

export const tokenFaucet = (amount, sess = session) =>
  callAs(sess, { contractId: CONFIG.tokenId, method: "faucet", args: { amount: String(amount) }, gas: 50 });

// ---------- simulated neighbours (testnet demo helper) ----------
// For one-click accounts only: creates sub-accounts of YOUR testnet account,
// funded from your balance, so you can run a whole circle alone on testnet.
export function neighbours() {
  return (store.get("susu.neighbours") || []).filter((n) => session && n.id.endsWith("." + session.accountId));
}

export function neighbourSession(n) {
  return { kind: "local", accountId: n.id, account: new Account(n.id, provider, n.key) };
}

export async function addNeighbours(count, perNeighbourNear) {
  if (session?.kind !== "local") throw new Error("Simulated neighbours need a one-click testnet account");
  const names = ["amara", "kofi", "lucia", "priya", "tomas", "wanjiru", "nia", "mateo", "esi", "ravi", "sofia"];
  const list = store.get("susu.neighbours") || [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const kp = KeyPair.fromRandom("ed25519");
    const prefix = `${names[(list.length + i) % names.length]}-${Math.random().toString(36).slice(2, 6)}`;
    await session.account.createSubAccount({ accountOrPrefix: prefix, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(String(perNeighbourNear)) });
    const n = { id: `${prefix}.${session.accountId}`, key: kp.toString() };
    list.push(n);
    out.push(n);
    store.set("susu.neighbours", list);
  }
  return out;
}

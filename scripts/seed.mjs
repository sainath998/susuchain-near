// Seeds SusuChain on testnet with real circles in different states, so the
// dashboard shows live on-chain data. Every member is a fresh testnet account
// created through the public testnet faucet helper.
//
//   node scripts/seed.mjs            # uses CONTRACT and TOKEN from .env.testnet
//
// Scenarios:
//   A. Native NEAR circle, 3 members, run to completion (collateral refunded).
//   B. tUSDC (NEP-141) circle, 4 members, round 1 paid out, round 2 in progress.
//   C. Missed deadline: a member doesn't pay, a neighbour settles the round,
//      the defaulter's collateral covers it and the default is recorded.
//   D. Reputation-gated circle: only members of completed circles may join.
import { readFileSync, writeFileSync } from "node:fs";
import { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } from "near-api-js";

const env = Object.fromEntries(readFileSync(new URL("../.env.testnet", import.meta.url), "utf8").trim().split("\n").map((l) => l.split("=")));
const CONTRACT = process.env.CONTRACT || env.CONTRACT;
const TOKEN = process.env.TOKEN || env.TOKEN;
const provider = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
const EXPLORER = "https://testnet.nearblocks.io";
const usdc = (n) => String(Math.round(n * 1e6));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const created = [];

// Fund new member accounts as sub-accounts of existing testnet accounts (the
// public faucet is rate-limited per IP). Funder keys come from the near-cli
// legacy keychain (~/.near-credentials/testnet/<id>.json).
const FUNDERS = (process.env.FUNDERS || env.FUNDERS || "").split(",").filter(Boolean);
let funderIx = 0;
function keychainAccount(id) {
  const path = `${process.env.HOME}/.near-credentials/testnet/${id}.json`;
  const { private_key } = JSON.parse(readFileSync(path, "utf8"));
  return new Account(id, provider, private_key);
}
const KEYFILE = new URL("../.demo-accounts.json", import.meta.url);
try { created.push(...JSON.parse(readFileSync(KEYFILE, "utf8"))); } catch {}

async function newAccount(prefix, nearAmount = "3") {
  if (!FUNDERS.length) throw new Error("set FUNDERS=acct1.testnet,acct2.testnet (keys in legacy keychain)");
  const funder = keychainAccount(FUNDERS[funderIx++ % FUNDERS.length]);
  const kp = KeyPair.fromRandom("ed25519");
  const sub = `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
  const id = `${sub}.${funder.accountId}`;
  await funder.createSubAccount({ accountOrPrefix: sub, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(nearAmount) });
  created.push({ id, key: kp.toString() });
  writeFileSync(KEYFILE, JSON.stringify(created, null, 2));
  return new Account(id, provider, kp.toString());
}

async function call(acct, contractId, methodName, args, deposit = "0", gas = "150") {
  for (let attempt = 1; ; attempt++) {
    try {
      const out = await acct.callFunction({ contractId, methodName, args, gas: teraToGas(gas), deposit: BigInt(deposit) });
      return out;
    } catch (e) {
      const msg = String(e?.message || e);
      if (attempt < 4 && /expired|timeout|nonce|503|502|ECONN/i.test(msg)) { await sleep(2000 * attempt); continue; }
      throw e;
    }
  }
}
const view = (methodName, args = {}) => provider.callFunction({ contractId: CONTRACT, method: methodName, args });
const ftCall = (acct, amount, msg) =>
  call(acct, TOKEN, "ft_transfer_call", { receiver_id: CONTRACT, amount, msg: JSON.stringify(msg) }, "1", "300");
const log = (...a) => console.log(...a);

async function main() {
  log(`contract ${CONTRACT}\ntoken    ${TOKEN}\n`);
  const ONE = nearToYocto("1").toString();

  // ---------- A ----------
  const Q = nearToYocto("0.25").toString(); // 0.25 NEAR per round keeps testnet costs low
  log("A. Native NEAR circle, run to completion");
  const [ama, kwesi, efua] = await Promise.all(["ama", "kwesi", "efua"].map((n) => newAccount(n, "1.8")));
  const a = await call(ama, CONTRACT, "create_circle", { name: "Makola Market Susu", contribution: Q, size: 3, round_seconds: 86400 }, Q);
  await call(kwesi, CONTRACT, "join_circle", { id: a }, Q);
  await call(efua, CONTRACT, "join_circle", { id: a }, Q);
  for (let r = 0; r < 3; r++) for (const m of [ama, kwesi, efua]) await call(m, CONTRACT, "contribute", { id: a }, Q);
  const ca = await view("get_circle", { id: a });
  log(`   circle #${a}: ${ca.status}; payouts -> ${ca.payouts.map((p) => p.to.split(".")[0]).join(", ")}`);

  // ---------- B ----------
  log("B. tUSDC circle, round 2 in progress");
  const bm = await Promise.all(["wanjiru", "otieno", "achieng", "kamau"].map((n) => newAccount(n, "1")));
  for (const m of bm) await call(m, TOKEN, "faucet", { amount: usdc(500) });
  const b = await call(bm[0], CONTRACT, "create_circle", { name: "Boda-Boda Riders Chama", asset: TOKEN, contribution: usdc(25), size: 4, round_seconds: 7 * 86400 });
  for (const m of bm) await ftCall(m, usdc(25), { join: b });
  for (const m of bm) await ftCall(m, usdc(25), { contribute: b });
  await ftCall(bm[1], usdc(25), { contribute: b });
  await ftCall(bm[3], usdc(25), { contribute: b });
  const cb = await view("get_circle", { id: b });
  log(`   circle #${b}: ${cb.status}, round ${cb.round + 1}/${cb.size}, paid this round: ${cb.paid.length}/${cb.size}`);

  // ---------- C ----------
  log("C. Missed deadline settled from collateral (waits ~70s)");
  const [lupe, mateo, sofia] = await Promise.all(["lupe", "mateo", "sofia"].map((n) => newAccount(n, "1")));
  for (const m of [lupe, mateo, sofia]) await call(m, TOKEN, "faucet", { amount: usdc(200) });
  const c = await call(lupe, CONTRACT, "create_circle", { name: "Tanda de la Colonia", asset: TOKEN, contribution: usdc(40), size: 3, round_seconds: 60 });
  for (const m of [lupe, mateo, sofia]) await ftCall(m, usdc(40), { join: c });
  await ftCall(lupe, usdc(40), { contribute: c });
  await ftCall(mateo, usdc(40), { contribute: c });
  await sleep(75_000);
  await call(mateo, CONTRACT, "settle_round", { id: c });
  const cc = await view("get_circle", { id: c });
  log(`   circle #${c}: round 1 paid ${Number(cc.payouts[0].amount) / 1e6} tUSDC to ${cc.payouts[0].to.split(".")[0]}; covered by collateral: ${cc.payouts[0].covered_by_collateral.join(", ")}`);

  // ---------- D ----------
  log("D. Reputation-gated circle, open for trusted savers");
  const [nia, tunde] = await Promise.all(["nia", "tunde"].map((n) => newAccount(n, "1")));
  for (const m of [nia, tunde]) await call(m, TOKEN, "faucet", { amount: usdc(300) });
  const warm = await call(nia, CONTRACT, "create_circle", { name: "Esusu Starter Circle", asset: TOKEN, contribution: usdc(20), size: 2, round_seconds: 86400 });
  for (const m of [nia, tunde]) await ftCall(m, usdc(20), { join: warm });
  for (let r = 0; r < 2; r++) for (const m of [nia, tunde]) await ftCall(m, usdc(20), { contribute: warm });
  log(`   starter circle #${warm} completed by nia and tunde`);
  const d = await call(nia, CONTRACT, "create_circle", { name: "Trusted Savers (1+ completed circle)", asset: TOKEN, contribution: usdc(50), size: 4, round_seconds: 30 * 86400, min_completed: 1 });
  await ftCall(nia, usdc(50), { join: d });
  await ftCall(tunde, usdc(50), { join: d });
  await call(lupe, TOKEN, "faucet", { amount: usdc(100) });
  const lupeBefore = await provider.callFunction({ contractId: TOKEN, method: "ft_balance_of", args: { account_id: lupe.accountId } });
  await lupe.callFunction({ contractId: TOKEN, methodName: "ft_transfer_call", args: { receiver_id: CONTRACT, amount: usdc(50), msg: JSON.stringify({ join: d }) }, gas: teraToGas("300"), deposit: 1n }).catch(() => {});
  const lupeAfter = await provider.callFunction({ contractId: TOKEN, method: "ft_balance_of", args: { account_id: lupe.accountId } });
  const dd = await view("get_circle", { id: d });
  log(`   lupe (no completed circle yet) tried to join: ${dd.members.includes(lupe.accountId) ? "ADMITTED (unexpected)" : "rejected"}, tokens refunded: ${lupeBefore === lupeAfter}`);

  // ---------- E ----------
  log("E. Open circle waiting for members (judges can join this one)");
  const [esi, ravi] = await Promise.all(["esi", "ravi"].map((n) => newAccount(n, "1")));
  for (const m of [esi, ravi]) await call(m, TOKEN, "faucet", { amount: usdc(100) });
  const e = await call(esi, CONTRACT, "create_circle", { name: "Neighbourhood Savings Circle", asset: TOKEN, contribution: usdc(10), size: 4, round_seconds: 7 * 86400 });
  await ftCall(esi, usdc(10), { join: e });
  await ftCall(ravi, usdc(10), { join: e });
  log(`   circle #${e}: open, 2 of 4 seats taken`);

  log(`\nTotal circles on contract: ${await view("total_circles")}`);
  log(`Explorer: ${EXPLORER}/address/${CONTRACT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

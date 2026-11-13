// Integration tests against a local NEAR sandbox (near-workspaces).
// Run: npm run build && npm test
import anyTest from "ava";
import { Worker, parseNEAR } from "near-workspaces";

const test = anyTest;
const N = (s) => BigInt(parseNEAR(s));
const TG = (n) => BigInt(n) * 10n ** 12n;
const ONE = parseNEAR("1");
const usdc = (n) => String(n * 1_000_000);

test.beforeEach(async (t) => {
  const worker = await Worker.init();
  const root = worker.rootAccount;
  const susu = await root.createSubAccount("susu", { initialBalance: N("30") });
  await susu.deploy("build/susuchain.wasm");
  await susu.call(susu, "init", {});
  const token = await root.createSubAccount("tusdc", { initialBalance: N("30") });
  await token.deploy("build/test_usdc.wasm");
  await token.call(token, "init", {});
  const mk = (n) => root.createSubAccount(n, { initialBalance: N("50") });
  const [amara, kofi, lucia, priya] = await Promise.all(["amara", "kofi", "lucia", "priya"].map(mk));
  t.context = { worker, root, susu, token, amara, kofi, lucia, priya };
});

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch(() => {});
});

const yocto = async (acct) => BigInt((await acct.balance()).total.toString());
const near = (y) => Number(y / 10n ** 21n) / 1000; // yocto -> NEAR (3 dp)

async function nearCircle(t, { size = 3, round_seconds = 600, min_completed = 0, members } = {}) {
  const { susu } = t.context;
  const [creator, ...rest] = members;
  const id = await creator.call(susu, "create_circle", { name: "Test Circle", contribution: ONE, size, round_seconds, min_completed }, { attachedDeposit: BigInt(ONE), gas: TG(100) });
  for (const m of rest) await m.call(susu, "join_circle", { id }, { attachedDeposit: BigInt(ONE), gas: TG(100) });
  return id;
}

const contribute = (t, who, id) => who.call(t.context.susu, "contribute", { id }, { attachedDeposit: BigInt(ONE), gas: TG(150) });

test("full NEAR circle: every member receives the pot once and gets collateral back", async (t) => {
  const { susu, amara, kofi, lucia } = t.context;
  const members = [amara, kofi, lucia];
  const id = await nearCircle(t, { members });
  let c = await susu.view("get_circle", { id });
  t.is(c.status, "active");
  t.deepEqual([...c.order].sort(), members.map((m) => m.accountId).sort(), "order is a permutation of members");

  const before = Object.fromEntries(await Promise.all(members.map(async (m) => [m.accountId, await yocto(m)])));
  for (let r = 0; r < 3; r++) for (const m of members) await contribute(t, m, id);

  c = await susu.view("get_circle", { id });
  t.is(c.status, "completed");
  t.is(c.payouts.length, 3);
  t.deepEqual(c.payouts.map((p) => p.to).sort(), members.map((m) => m.accountId).sort(), "each member paid out exactly once");
  for (const p of c.payouts) t.is(p.amount, (3n * BigInt(ONE)).toString());

  // Net effect per member: paid 3 contributions, received 1 pot of 3, plus collateral (1) back.
  for (const m of members) {
    const diff = (await yocto(m)) - before[m.accountId];
    t.true(diff > N("0.95") && diff < N("1.05"), `${m.accountId} net ${near(diff)} NEAR (≈ +1 collateral refund, minus gas)`);
  }
  const rep = await susu.view("get_reputation", { account_id: amara.accountId });
  t.is(rep.circles_completed, 1);
  t.is(rep.contributions_on_time, 3);
  t.is(rep.defaults, 0);
  t.is(rep.saved.near, (3n * BigInt(ONE)).toString());
});

test("guardrails: wrong amount, double pay, outsiders, full circle", async (t) => {
  const { susu, amara, kofi, lucia, priya } = t.context;
  const id = await nearCircle(t, { members: [amara, kofi, lucia] });
  const half = N("0.5").toString();
  await t.throwsAsync(amara.call(susu, "contribute", { id }, { attachedDeposit: BigInt(half), gas: TG(100) }), { message: /contribute exactly/ });
  await contribute(t, amara, id);
  await t.throwsAsync(contribute(t, amara, id), { message: /already contributed/ });
  await t.throwsAsync(contribute(t, priya, id), { message: /not a member/ });
  await t.throwsAsync(priya.call(susu, "join_circle", { id }, { attachedDeposit: BigInt(ONE), gas: TG(100) }), { message: /not open/ });
  await t.throwsAsync(susu.view("get_circle", { id: 99 }).then((c) => { if (!c) throw new Error("circle not found"); }), { message: /not found/ });
});

test("joining requires exactly one contribution of collateral, once", async (t) => {
  const { susu, amara, kofi } = t.context;
  const id = await amara.call(susu, "create_circle", { name: "Pair", contribution: ONE, size: 2, round_seconds: 600 }, { attachedDeposit: BigInt(ONE), gas: TG(100) });
  await t.throwsAsync(kofi.call(susu, "join_circle", { id }, { gas: TG(100) }), { message: /collateral/ });
  await t.throwsAsync(amara.call(susu, "join_circle", { id }, { attachedDeposit: BigInt(ONE), gas: TG(100) }), { message: /already a member/ });
});

test("missed deadline: anyone can settle; collateral covers the default and it is recorded", async (t) => {
  const { worker, susu, amara, kofi, lucia, priya } = t.context;
  const id = await nearCircle(t, { members: [amara, kofi, lucia], round_seconds: 60 });
  await contribute(t, amara, id);
  await contribute(t, kofi, id);
  await t.throwsAsync(priya.call(susu, "settle_round", { id }, { gas: TG(100) }), { message: /not passed/ });

  await worker.provider.fastForward(200);
  await t.throwsAsync(contribute(t, lucia, id), { message: /deadline passed/ });
  await priya.call(susu, "settle_round", { id }, { gas: TG(150) }); // a non-member can settle

  let c = await susu.view("get_circle", { id });
  t.is(c.round, 1);
  t.is(c.payouts[0].amount, (3n * BigInt(ONE)).toString(), "pot paid in full thanks to collateral");
  t.deepEqual(c.payouts[0].covered_by_collateral, [lucia.accountId]);
  t.is(c.collateral[lucia.accountId], "0");
  t.is((await susu.view("get_reputation", { account_id: lucia.accountId })).defaults, 1);

  // Second miss: no collateral left -> shortfall is recorded and the pot shrinks.
  await contribute(t, amara, id);
  await contribute(t, kofi, id);
  await worker.provider.fastForward(200);
  await priya.call(susu, "settle_round", { id }, { gas: TG(150) });
  c = await susu.view("get_circle", { id });
  t.is(c.payouts[1].amount, (2n * BigInt(ONE)).toString());
  t.is(c.payouts[1].shortfall, ONE);
  t.is((await susu.view("get_reputation", { account_id: lucia.accountId })).defaults, 2);
});

test("reputation-gated circles admit only members with a clean, completed record", async (t) => {
  const { susu, amara, kofi, lucia, priya } = t.context;
  // amara + kofi complete a 2-person circle -> 1 completed circle each.
  const warmup = await nearCircle(t, { members: [amara, kofi], size: 2 });
  for (let r = 0; r < 2; r++) for (const m of [amara, kofi]) await contribute(t, m, warmup);

  const gated = await amara.call(susu, "create_circle", { name: "Trusted savers", contribution: ONE, size: 3, round_seconds: 600, min_completed: 1 }, { attachedDeposit: BigInt(ONE), gas: TG(100) });
  await t.throwsAsync(priya.call(susu, "join_circle", { id: gated }, { attachedDeposit: BigInt(ONE), gas: TG(100) }), { message: /requires 1 completed/ });
  await kofi.call(susu, "join_circle", { id: gated }, { attachedDeposit: BigInt(ONE), gas: TG(100) });
  t.is((await susu.view("get_circle", { id: gated })).members.length, 2);
  t.truthy(lucia);
});

test("stablecoin circle (NEP-141): join and contribute with ft_transfer_call; payouts in tokens", async (t) => {
  const { susu, token, amara, kofi, lucia } = t.context;
  const members = [amara, kofi, lucia];
  for (const m of members) await m.call(token, "faucet", { amount: usdc(100) });
  await susu.call(token, "storage_deposit", { account_id: susu.accountId }, { attachedDeposit: N("0.01") });

  const id = await amara.call(susu, "create_circle", { name: "USDC Tanda", asset: token.accountId, contribution: usdc(20), size: 3, round_seconds: 600 }, { gas: TG(100) });
  const ftCall = (m, msg, amount = usdc(20)) =>
    m.call(token, "ft_transfer_call", { receiver_id: susu.accountId, amount, msg: JSON.stringify(msg) }, { attachedDeposit: 1n, gas: TG(300) });

  // Wrong amount is refunded by the token contract (ft_resolve_transfer).
  await amara.callRaw(token, "ft_transfer_call", { receiver_id: susu.accountId, amount: usdc(5), msg: JSON.stringify({ join: id }) }, { attachedDeposit: 1n, gas: TG(300) });
  t.is(await token.view("ft_balance_of", { account_id: amara.accountId }), usdc(100), "failed join fully refunded");

  for (const m of members) await ftCall(m, { join: id });
  t.is((await susu.view("get_circle", { id })).status, "active");
  for (let r = 0; r < 3; r++) for (const m of members) await ftCall(m, { contribute: id });

  const c = await susu.view("get_circle", { id });
  t.is(c.status, "completed");
  for (const m of members) {
    // 100 - 20 collateral - 60 contributions + 60 pot + 20 collateral back = 100
    t.is(await token.view("ft_balance_of", { account_id: m.accountId }), usdc(100));
  }
  t.is(await token.view("ft_balance_of", { account_id: susu.accountId }), "0", "contract holds nothing after completion");
  t.is((await susu.view("get_reputation", { account_id: kofi.accountId })).saved[token.accountId], usdc(60));
});

// SusuChain on NEAR: rotating savings circles (susu / tanda / chit fund / ROSCA)
// run by a contract instead of a trusted treasurer.
//
// Lifecycle
//   1. create_circle: pick the asset (native NEAR or any NEP-141 token such as
//      USDC), the contribution per round, the number of members, the length of
//      a round and an optional reputation requirement.
//   2. Members join by locking ONE contribution as collateral.
//   3. When the circle is full, the payout order is shuffled with NEAR's
//      on-chain randomness, and round 1 starts.
//   4. Each round every member contributes. The moment the last contribution
//      lands, the whole pot is paid to that round's recipient.
//   5. If the round deadline passes, ANYONE can call settle_round: missing
//      contributions are covered from the defaulter's collateral (and recorded
//      against their reputation), and the pot is paid out anyway.
//   6. After N rounds, every member's unused collateral is returned.
//
// Every account accumulates a portable savings record (on-time contributions,
// defaults, completed circles). Circles can require a clean record to join,
// which is how real circles manage default risk: trust is earned.

import { NearBindgen, near, call, view, initialize, LookupMap, NearPromise, assert } from "near-sdk-js";

const MAX_MEMBERS = 12;
const MIN_MEMBERS = 2;
const MIN_ROUND_SECONDS = 60;
const NATIVE = "near";
const FT_TRANSFER_GAS = BigInt("15000000000000"); // 15 Tgas
const ONE_YOCTO = BigInt(1);
const NS = BigInt(1000000000);

function emptyRep() {
  return {
    circles_joined: 0,
    circles_completed: 0,
    contributions_on_time: 0,
    defaults: 0,
    // Totals per asset: { "near": "123", "usdc.testnet": "456" }
    saved: {},
  };
}

function addSaved(rep, asset, amount) {
  rep.saved[asset] = (BigInt(rep.saved[asset] || "0") + BigInt(amount)).toString();
}

@NearBindgen({})
class SusuChain {
  constructor() {
    this.circles = new LookupMap("c");
    this.reputation = new LookupMap("r");
    this.next_id = 0;
  }

  @initialize({})
  init() {
    this.next_id = 0;
  }

  // ================= writes =================

  /**
   * Create a circle.
   *  asset: "near" or the account id of a NEP-141 token (e.g. a USDC contract)
   *  contribution: amount per member per round, in the asset's smallest unit (string)
   *  size: number of members (= number of rounds)
   *  round_seconds: length of each round
   *  min_completed: completed circles (with zero defaults) required to join
   * For native NEAR circles, attach exactly `contribution` to join as the creator
   * in the same call. For token circles, the creator joins with ft_transfer_call.
   */
  @call({ payableFunction: true })
  create_circle({ name, asset = NATIVE, contribution, size, round_seconds = 604800, min_completed = 0 }) {
    assert(typeof name === "string" && name.length >= 2 && name.length <= 60, "name must be 2-60 characters");
    assert(typeof asset === "string" && asset.length >= 2 && asset.length <= 64, "invalid asset");
    const c = BigInt(contribution);
    assert(c > BigInt(0), "contribution must be > 0");
    assert(Number.isInteger(size) && size >= MIN_MEMBERS && size <= MAX_MEMBERS, `size must be ${MIN_MEMBERS}-${MAX_MEMBERS}`);
    assert(Number.isInteger(round_seconds) && round_seconds >= MIN_ROUND_SECONDS, `round_seconds must be >= ${MIN_ROUND_SECONDS}`);
    assert(Number.isInteger(min_completed) && min_completed >= 0 && min_completed <= 100, "min_completed must be 0-100");

    const creator = near.predecessorAccountId();
    const id = this.next_id;
    this.next_id += 1;
    const circle = {
      id,
      name,
      creator,
      asset,
      contribution: c.toString(),
      size,
      round_seconds,
      min_completed,
      status: "open", // open | active | completed
      members: [],
      collateral: {}, // member -> remaining collateral
      order: [],
      round: 0, // index of the current round (0-based); equals size when completed
      round_deadline: null, // ns timestamp (string) for the current round
      started_at: null,
      paid: [], // members who paid the current round
      payouts: [], // { round, to, amount, covered_by_collateral: [..], shortfall }
      defaults: [], // { round, member, covered }
      created_at: near.blockTimestamp().toString(),
    };
    near.log(`EVENT circle_created id=${id} by=${creator} asset=${asset}`);

    const deposit = near.attachedDeposit();
    if (asset === NATIVE && deposit > BigInt(0)) {
      assert(deposit === c, `attach exactly ${c} yoctoNEAR to join your own circle, or 0 to create without joining`);
      this._join(circle, creator, deposit);
    } else {
      assert(deposit === BigInt(0), "token circles: create with no deposit, then join with ft_transfer_call");
    }
    this.circles.set(String(id), circle);
    return id;
  }

  /** Join a native-NEAR circle: attach exactly one contribution as collateral. */
  @call({ payableFunction: true })
  join_circle({ id }) {
    const circle = this._get(id);
    assert(circle.asset === NATIVE, "token circle: join with ft_transfer_call(msg={\"join\":id})");
    this._join(circle, near.predecessorAccountId(), near.attachedDeposit());
    this.circles.set(String(id), circle);
  }

  /** Pay this round's contribution in a native-NEAR circle. */
  @call({ payableFunction: true })
  contribute({ id }) {
    const circle = this._get(id);
    assert(circle.asset === NATIVE, "token circle: contribute with ft_transfer_call(msg={\"contribute\":id})");
    return this._contribute(circle, near.predecessorAccountId(), near.attachedDeposit());
  }

  /**
   * NEP-141 receiver. msg is JSON: {"join": <id>} or {"contribute": <id>}.
   * Returns the unused amount ("0"); any validation failure panics, which makes
   * the token contract refund the sender in full.
   */
  @call({})
  ft_on_transfer({ sender_id, amount, msg }) {
    const token = near.predecessorAccountId();
    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch (e) {
      throw new Error("msg must be JSON: {\"join\":id} or {\"contribute\":id}");
    }
    const value = BigInt(amount);
    if (parsed.join !== undefined) {
      const circle = this._get(parsed.join);
      assert(circle.asset === token, `this circle takes ${circle.asset}, not ${token}`);
      this._join(circle, sender_id, value);
      this.circles.set(String(circle.id), circle);
      return "0";
    }
    if (parsed.contribute !== undefined) {
      const circle = this._get(parsed.contribute);
      assert(circle.asset === token, `this circle takes ${circle.asset}, not ${token}`);
      this._contribute(circle, sender_id, value);
      return "0"; // NEP-141: unused amount
    }
    throw new Error("msg must contain join or contribute");
  }

  /**
   * After the round deadline, anyone can settle the round: each missing
   * contribution is covered from that member's collateral (recorded as a
   * default), and the pot is paid to the round's recipient.
   */
  @call({})
  settle_round({ id }) {
    const circle = this._get(id);
    assert(circle.status === "active", "circle is not active");
    const now = near.blockTimestamp();
    assert(now > BigInt(circle.round_deadline), "round deadline has not passed yet");

    const contribution = BigInt(circle.contribution);
    const covered = [];
    let shortfall = BigInt(0);
    for (const m of circle.members) {
      if (circle.paid.includes(m)) continue;
      const col = BigInt(circle.collateral[m] || "0");
      const rep = this._rep(m);
      rep.defaults += 1;
      this.reputation.set(m, rep);
      if (col >= contribution) {
        circle.collateral[m] = (col - contribution).toString();
        covered.push(m);
        circle.defaults.push({ round: circle.round + 1, member: m, covered: true });
        near.log(`EVENT default_covered id=${id} round=${circle.round + 1} member=${m}`);
      } else {
        shortfall += contribution;
        circle.defaults.push({ round: circle.round + 1, member: m, covered: false });
        near.log(`EVENT default_uncovered id=${id} round=${circle.round + 1} member=${m}`);
      }
    }
    const pot = contribution * BigInt(circle.size) - shortfall;
    return this._payout(circle, pot, covered, shortfall);
  }

  // ================= views =================

  @view({})
  get_circle({ id }) {
    return this.circles.get(String(id));
  }

  @view({})
  get_circles({ from_index = 0, limit = 50 }) {
    const out = [];
    const end = Math.min(this.next_id, from_index + limit);
    for (let i = from_index; i < end; i++) {
      const c = this.circles.get(String(i));
      if (c) out.push(c);
    }
    return out;
  }

  @view({})
  get_reputation({ account_id }) {
    return this.reputation.get(account_id) || emptyRep();
  }

  @view({})
  total_circles() {
    return this.next_id;
  }

  // ================= internals =================

  _get(id) {
    const c = this.circles.get(String(id));
    assert(c, "circle not found");
    return c;
  }

  _rep(account) {
    return this.reputation.get(account) || emptyRep();
  }

  _join(circle, who, amount) {
    assert(circle.status === "open", "circle is not open for joining");
    assert(!circle.members.includes(who), "already a member");
    assert(circle.members.length < circle.size, "circle is full");
    assert(amount === BigInt(circle.contribution), `lock exactly one contribution (${circle.contribution}) as collateral`);
    const rep = this._rep(who);
    if (circle.min_completed > 0) {
      assert(rep.defaults === 0, "this circle requires a record with no defaults");
      assert(
        rep.circles_completed >= circle.min_completed,
        `this circle requires ${circle.min_completed} completed circle(s); you have ${rep.circles_completed}`
      );
    }
    circle.members.push(who);
    circle.collateral[who] = amount.toString();
    rep.circles_joined += 1;
    this.reputation.set(who, rep);
    near.log(`EVENT joined id=${circle.id} by=${who}`);
    if (circle.members.length === circle.size) this._start(circle);
  }

  // Shuffle the payout order with the block's random seed, so nobody (not even
  // the creator) picks who gets paid first.
  _start(circle) {
    const seed = near.randomSeed();
    const order = circle.members.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = (seed[i % seed.length] + seed[(i * 7) % seed.length] * 256) % (i + 1);
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    const now = near.blockTimestamp();
    circle.order = order;
    circle.status = "active";
    circle.started_at = now.toString();
    circle.round_deadline = (now + BigInt(circle.round_seconds) * NS).toString();
    near.log(`EVENT circle_started id=${circle.id} order=${order.join(",")}`);
  }

  _contribute(circle, who, amount) {
    assert(circle.status === "active", "circle is not active");
    assert(circle.members.includes(who), "not a member of this circle");
    assert(!circle.paid.includes(who), "already contributed this round");
    assert(amount === BigInt(circle.contribution), `contribute exactly ${circle.contribution}`);
    assert(near.blockTimestamp() <= BigInt(circle.round_deadline), "round deadline passed; call settle_round first");

    circle.paid.push(who);
    const rep = this._rep(who);
    rep.contributions_on_time += 1;
    addSaved(rep, circle.asset, amount);
    this.reputation.set(who, rep);
    near.log(`EVENT contributed id=${circle.id} round=${circle.round + 1} by=${who}`);

    if (circle.paid.length < circle.size) {
      this.circles.set(String(circle.id), circle);
      return null;
    }
    const pot = BigInt(circle.contribution) * BigInt(circle.size);
    return this._payout(circle, pot, [], BigInt(0));
  }

  // Pays the current round's recipient, advances the round, and on the final
  // round returns every member's unused collateral. Saves the circle.
  _payout(circle, pot, covered, shortfall) {
    const recipient = circle.order[circle.round];
    circle.payouts.push({
      round: circle.round + 1,
      to: recipient,
      amount: pot.toString(),
      covered_by_collateral: covered,
      shortfall: shortfall.toString(),
      at: near.blockTimestamp().toString(),
    });
    near.log(`EVENT payout id=${circle.id} round=${circle.round + 1} to=${recipient} amount=${pot}`);
    circle.round += 1;
    circle.paid = [];

    const transfers = [];
    if (pot > BigInt(0)) transfers.push([recipient, pot]);

    if (circle.round >= circle.size) {
      circle.status = "completed";
      circle.round_deadline = null;
      for (const m of circle.members) {
        const r = this._rep(m);
        r.circles_completed += 1;
        this.reputation.set(m, r);
        const back = BigInt(circle.collateral[m] || "0");
        if (back > BigInt(0)) transfers.push([m, back]);
        circle.collateral[m] = "0";
      }
      near.log(`EVENT circle_completed id=${circle.id}`);
    } else {
      // Next deadline follows the schedule, but every round always gets at
      // least one full period after the previous payout (no cascading misses
      // when a round was settled late).
      const period = BigInt(circle.round_seconds) * NS;
      const scheduled = BigInt(circle.started_at) + period * BigInt(circle.round + 1);
      const minimum = near.blockTimestamp() + period;
      circle.round_deadline = (scheduled > minimum ? scheduled : minimum).toString();
    }
    this.circles.set(String(circle.id), circle);

    // Each transfer is scheduled as its own receipt (NEAR does not allow
    // returning a joint promise). A transfer to a deleted account bounces back
    // to this contract, so funds are never lost.
    for (const [to, amount] of transfers) this._send(circle.asset, to, amount).build();
    return circle.payouts[circle.payouts.length - 1];
  }

  _send(asset, to, amount) {
    if (asset === NATIVE) return NearPromise.new(to).transfer(amount);
    return NearPromise.new(asset).functionCall(
      "ft_transfer",
      JSON.stringify({ receiver_id: to, amount: amount.toString(), memo: "SusuChain payout" }),
      ONE_YOCTO,
      FT_TRANSFER_GAS
    );
  }
}

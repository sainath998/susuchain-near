// tUSDC: a minimal NEP-141 (+NEP-148 metadata, NEP-145-style registration)
// test stablecoin for SusuChain demos on testnet. 6 decimals like USDC.
// Anyone can mint from the faucet (capped per call). TESTNET ONLY.
//
// Implements the parts of NEP-141 SusuChain relies on, including the
// ft_transfer_call -> ft_on_transfer -> ft_resolve_transfer refund flow.

import { NearBindgen, near, call, view, initialize, LookupMap, assert, NearPromise } from "near-sdk-js";

const GAS_FOR_RESOLVE = BigInt("30000000000000"); // 30 Tgas
const GAS_FOR_FT_ON_TRANSFER = BigInt("150000000000000"); // 150 Tgas (JS contracts need more)
const FAUCET_MAX = BigInt("1000000000"); // 1,000 tUSDC per call
const STORAGE_DEPOSIT = BigInt("1250000000000000000000"); // 0.00125 NEAR

@NearBindgen({ requireInit: true })
class TestUSDC {
  constructor() {
    this.balances = new LookupMap("b");
    this.total_supply = "0";
  }

  @initialize({})
  init() {
    this.total_supply = "0";
  }

  // ---------- NEP-145 (simplified) ----------
  @call({ payableFunction: true })
  storage_deposit({ account_id, registration_only }) {
    const id = account_id || near.predecessorAccountId();
    const deposit = near.attachedDeposit();
    if (this.balances.containsKey(id)) {
      if (deposit > BigInt(0)) NearPromise.new(near.predecessorAccountId()).transfer(deposit).build();
    } else {
      assert(deposit >= STORAGE_DEPOSIT, `attach at least ${STORAGE_DEPOSIT} yoctoNEAR`);
      this.balances.set(id, "0");
      const refund = deposit - STORAGE_DEPOSIT;
      if (refund > BigInt(0)) NearPromise.new(near.predecessorAccountId()).transfer(refund).build();
    }
    return { total: STORAGE_DEPOSIT.toString(), available: "0" };
  }

  @view({})
  storage_balance_of({ account_id }) {
    return this.balances.containsKey(account_id) ? { total: STORAGE_DEPOSIT.toString(), available: "0" } : null;
  }

  @view({})
  storage_balance_bounds() {
    return { min: STORAGE_DEPOSIT.toString(), max: STORAGE_DEPOSIT.toString() };
  }

  // ---------- faucet ----------
  /** Mint test tokens to the caller (auto-registers the caller). */
  @call({})
  faucet({ amount }) {
    const id = near.predecessorAccountId();
    const a = BigInt(amount);
    assert(a > BigInt(0) && a <= FAUCET_MAX, `faucet amount must be 1..${FAUCET_MAX}`);
    if (!this.balances.containsKey(id)) this.balances.set(id, "0");
    this._deposit(id, a);
    this.total_supply = (BigInt(this.total_supply) + a).toString();
    near.log(`EVENT_JSON:${JSON.stringify({ standard: "nep141", version: "1.0.0", event: "ft_mint", data: [{ owner_id: id, amount: a.toString() }] })}`);
  }

  // ---------- NEP-141 ----------
  @call({ payableFunction: true })
  ft_transfer({ receiver_id, amount, memo }) {
    assert(near.attachedDeposit() === BigInt(1), "requires exactly 1 yoctoNEAR");
    this._transfer(near.predecessorAccountId(), receiver_id, BigInt(amount), memo);
  }

  @call({ payableFunction: true })
  ft_transfer_call({ receiver_id, amount, memo, msg }) {
    assert(near.attachedDeposit() === BigInt(1), "requires exactly 1 yoctoNEAR");
    const sender = near.predecessorAccountId();
    const a = BigInt(amount);
    this._transfer(sender, receiver_id, a, memo);
    return NearPromise.new(receiver_id)
      .functionCall("ft_on_transfer", JSON.stringify({ sender_id: sender, amount: a.toString(), msg }), BigInt(0), GAS_FOR_FT_ON_TRANSFER)
      .then(
        NearPromise.new(near.currentAccountId()).functionCall(
          "ft_resolve_transfer",
          JSON.stringify({ sender_id: sender, receiver_id, amount: a.toString() }),
          BigInt(0),
          GAS_FOR_RESOLVE
        )
      );
  }

  @call({ privateFunction: true })
  ft_resolve_transfer({ sender_id, receiver_id, amount }) {
    const a = BigInt(amount);
    let unused = a; // if the receiver failed, refund everything
    try {
      const result = near.promiseResult(0);
      const parsed = JSON.parse(result);
      unused = BigInt(parsed);
      if (unused > a) unused = a;
    } catch (e) {
      unused = a;
    }
    if (unused > BigInt(0)) {
      const receiverBal = BigInt(this.balances.get(receiver_id) || "0");
      const refund = receiverBal < unused ? receiverBal : unused;
      if (refund > BigInt(0)) {
        this.balances.set(receiver_id, (receiverBal - refund).toString());
        this._deposit(sender_id, refund);
        near.log(`Refund ${refund} from ${receiver_id} to ${sender_id}`);
        return (a - refund).toString();
      }
    }
    return a.toString();
  }

  @view({})
  ft_balance_of({ account_id }) {
    return this.balances.get(account_id) || "0";
  }

  @view({})
  ft_total_supply() {
    return this.total_supply;
  }

  @view({})
  ft_metadata() {
    return {
      spec: "ft-1.0.0",
      name: "Test USDC (SusuChain testnet)",
      symbol: "tUSDC",
      icon: null,
      reference: null,
      reference_hash: null,
      decimals: 6,
    };
  }

  // ---------- internals ----------
  _deposit(id, a) {
    assert(this.balances.containsKey(id), `account ${id} is not registered`);
    this.balances.set(id, (BigInt(this.balances.get(id)) + a).toString());
  }

  _transfer(from, to, a, memo) {
    assert(from !== to, "sender and receiver must differ");
    assert(a > BigInt(0), "amount must be positive");
    const bal = BigInt(this.balances.get(from) || "0");
    assert(bal >= a, "insufficient balance");
    assert(this.balances.containsKey(to), `receiver ${to} is not registered`);
    this.balances.set(from, (bal - a).toString());
    this._deposit(to, a);
    near.log(`EVENT_JSON:${JSON.stringify({ standard: "nep141", version: "1.0.0", event: "ft_transfer", data: [{ old_owner_id: from, new_owner_id: to, amount: a.toString(), memo: memo || undefined }] })}`);
  }
}

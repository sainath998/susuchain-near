# SusuChain: savings circles without a treasurer, on NEAR

SusuChain runs a **rotating savings circle** (known as susu, tanda, chit fund, esusu, chama or ROSCA) as a NEAR smart contract. Every member pays the same amount each round, and the whole pot goes to one member per round until everyone has had a turn. In real life the circle depends on one person holding the cash. Here the contract holds it and:

- pays the pot out **automatically** the moment the last contribution of a round arrives,
- shuffles the **payout order with on-chain randomness**, so nobody picks who goes first,
- makes every member **lock one contribution as collateral**. If someone misses a deadline, **anyone** can settle the round: the missing share comes out of that member's collateral and the default is recorded,
- returns unused collateral when the circle completes,
- keeps a **portable savings record** per account (on-time payments, defaults, completed circles). A circle can require a clean record to join, which is how real circles manage the risk of a member who stops paying.

Circles work with **native NEAR or any NEP-141 token** (for example USDC). The testnet demo uses `tUSDC`, a 6-decimal test stablecoin with a public faucet.

| | |
|---|---|
| Live app (testnet) | https://sainath998.github.io/susuchain-near/ |
| Contract | [`susuchain.testnet`](https://testnet.nearblocks.io/address/susuchain.testnet) |
| Test stablecoin | [`tusdc-d0wm.testnet`](https://testnet.nearblocks.io/address/tusdc-d0wm.testnet) (NEP-141, 6 decimals, `faucet` method) |
| Hackathon tracks | Real-World Money (`realworld`), Social Money (`social`), Open Innovation (`open`) |

## Try it (about 3 minutes, testnet only)

1. Open the live app and click **"Try it on testnet: 1 click"**. You get a fresh testnet account with 10 NEAR from the public faucet, and its key stays in your browser. (Or click **Connect a NEAR wallet** and switch the wallet to testnet.) If the public faucet is rate-limiting your network, use a wallet instead.
2. Under **Your savings record**, click **Get 200 test USDC**. You will see a tUSDC balance.
3. In **Start a circle**, choose `tUSDC`, 25 per round, 4 members, **2 minutes (demo)**, then click **Create circle**. A card appears with you in seat 1 and 25 tUSDC of collateral held.
4. On the card, click **Fill 3 seats with test neighbours**. This creates three sub-accounts of *your* account (`name-xxxx.<you>.testnet`), funds them with test NEAR and tUSDC, and they join. The circle becomes **Round 1 of 4** and the payout order is shuffled on-chain (the ring and the numbered list show it).
5. Click **Neighbours pay**, then **Pay 25 tUSDC**. The last payment triggers the payout: the round-1 member's dot turns solid, **History** shows `Round 1: 100 tUSDC to …`, and the card moves to **Round 2**.
6. Click **…but one skips**, then pay your share. Wait for the 2-minute deadline. The badge turns **Settle due** and the skipper shows **missed**. Click **Settle round**. The pot is still paid in full; History shows `… covered by collateral`, and **Collateral held** drops by one contribution.
7. Your savings record now shows on-time payments. A member who missed a payment shows it in their record, and circles with an entry rule turn them away.

Circles already on testnet show every state: one completed, one mid-round, one with a default covered by collateral, a completed starter circle plus a reputation-gated circle, and an open circle anyone can join.

## How NEAR is used

| Feature | Where |
|---|---|
| Contract holds the pot and pays out with `Promise` transfers (NEAR) or `ft_transfer` (NEP-141) | `src/contract.js`, `_payout`, `_send` |
| NEP-141 receiver: `ft_transfer_call` with `msg = {"join": id}` or `{"contribute": id}`. Bad input panics, so the token contract refunds the sender in full | `ft_on_transfer` |
| `env.random_seed` decides the payout order when the circle fills | `_start` |
| Block timestamps give round deadlines; `settle_round` can be called by anyone after a deadline | `settle_round` |
| Reputation stored per named account, used to gate entry | `get_reputation`, `_join` |
| Sub-accounts (`name.you.testnet`) for the simulated neighbours on testnet | `web/src/near.js`, `addNeighbours` |
| Wallets via `@hot-labs/near-connect` (HOT, Meteor, MyNearWallet, Intear…) and `near-api-js` for the one-click testnet account | `web/src/near.js` |

## Contract API (`susuchain.testnet`)

| Method | Kind | Arguments | Notes |
|---|---|---|---|
| `create_circle` | call, payable | `name`, `asset` (`"near"` or token account), `contribution` (smallest units, string), `size` (2–12), `round_seconds` (≥60), `min_completed` | NEAR circles: attach exactly `contribution` to join your own circle in the same call. Returns the circle id. |
| `join_circle` | call, payable | `id` | NEAR circles. Attach exactly one contribution (the collateral). |
| `contribute` | call, payable | `id` | NEAR circles. Attach exactly one contribution, before the round deadline. |
| `ft_on_transfer` | NEP-141 | `msg`: `{"join":id}` or `{"contribute":id}` | Token circles, through `ft_transfer_call` on the token. |
| `settle_round` | call | `id` | Anyone, after the deadline. Covers missing shares from collateral and pays out. |
| `get_circle`, `get_circles`, `total_circles` | view | `id` / `from_index`, `limit` | Full circle state, including order, paid list, payouts, defaults and collateral. |
| `get_reputation` | view | `account_id` | `circles_joined`, `circles_completed`, `contributions_on_time`, `defaults`, `saved` per asset. |

Example with near-cli-rs:

```sh
near contract call-function as-read-only susuchain.testnet get_circle json-args '{"id":2}' network-config testnet now
```

## Build, test, run

Requires Node 22+.

```sh
npm install
# near-sdk-js and near-sandbox download their toolchains in postinstall scripts.
# If your npm blocks install scripts, run them once:
#   (cd node_modules/near-sdk-js && node lib/cli/post-install.js)
#   (cd node_modules/near-sandbox && node install.js)
npm run build        # -> build/susuchain.wasm, build/test_usdc.wasm (both also committed)
npm test             # 6 integration tests on a local NEAR sandbox (near-workspaces + ava)
npm run dev          # web app on http://localhost:5173 against the testnet contract
```

The tests in `test/susuchain.test.js` cover:

1. A full native-NEAR circle: every member receives the pot exactly once, and collateral is refunded.
2. Guardrails: wrong amount, paying twice, non-members, joining a full or started circle.
3. Collateral must be exactly one contribution, and you can join only once.
4. Missed deadline: anyone settles, collateral covers the share and the default is recorded. A second miss with no collateral left produces a recorded shortfall.
5. Reputation gate: a newcomer is rejected and a member with a completed circle is admitted.
6. A stablecoin circle over NEP-141 `ft_transfer_call`, including a refunded bad join. At the end, every member has their starting balance back and the contract holds 0 tokens.

`scripts/seed.mjs` replays realistic scenarios on testnet. It is what created the circles visible in the app.

## Design notes and limitations

- **Defaults.** Collateral covers one missed round per member. A second miss with no collateral left is paid out short and recorded as `shortfall`, and the member's record shows both defaults. Bigger collateral or reputation-gated circles are the intended mitigation. Late payers are not yet chased for the shortfall (see roadmap).
- **Randomness.** The order comes from the block's `random_seed`. That is fine for deciding who gets paid first in a savings circle, but it is not suitable for high-value lotteries.
- **Storage** is paid from the contract's balance. A production version would charge the creator a small storage deposit per circle.
- **Payouts** are scheduled as independent receipts. A transfer to a deleted account bounces back to the contract.
- **Testnet only and unaudited.** The contract is written in JavaScript (`near-sdk-js`).

## Roadmap

- Mainnet with native USDC, and gasless payments for members through meta-transactions (a relayer that only pays for calls to this contract)
- Pay in from any chain or token through NEAR Intents 1Click
- Recovering a shortfall from the defaulter's later payout, with optional late fees voted by the circle
- Circle treasuries on Sputnik DAO or Trezu for larger community funds, using the SusuChain record for access tiers
- Reminders, and a WhatsApp/SMS invite flow for members who never touch a wallet

## Hackathon disclosure

Built for NEAR HACKATHON (Nov 2026). All code in this repository, including the contract, the tests, the test token and the web app, was written during the hackathon window. The savings-circle idea was first prototyped the same week as a separate Stellar app ([sainath998/susuchain](https://github.com/sainath998/susuchain)), which used Stellar's built-in multisig. No code is shared with it. This NEAR version is a new design: a contract-enforced circle with collateral, deadlines, settlement, NEP-141 support and on-chain reputation. Third-party libraries: `near-sdk-js`, `near-api-js`, `@hot-labs/near-connect`, `near-workspaces`, `ava`, `vite`.

## License

MIT

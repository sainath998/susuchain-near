// Deletes the throwaway demo member accounts listed in .demo-accounts.json and
// sends their remaining test NEAR to a beneficiary. Testnet housekeeping only.
//   node scripts/reclaim.mjs <beneficiary.testnet>
import { readFileSync, writeFileSync } from "node:fs";
import { Account, JsonRpcProvider } from "near-api-js";

const beneficiary = process.argv[2];
if (!beneficiary) throw new Error("usage: node scripts/reclaim.mjs <beneficiary.testnet>");
const provider = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
const file = new URL("../.demo-accounts.json", import.meta.url);
const list = JSON.parse(readFileSync(file, "utf8"));
const left = [];
for (const { id, key } of list) {
  try {
    await new Account(id, provider, key).deleteAccount(beneficiary);
    console.log("deleted", id);
  } catch (e) {
    const msg = String(e?.message || e);
    if (/does not exist|doesn't exist|AccountDoesNotExist/i.test(msg)) { console.log("gone", id); continue; }
    console.log("kept", id, msg.slice(0, 120));
    left.push({ id, key });
  }
}
writeFileSync(file, JSON.stringify(left, null, 2));

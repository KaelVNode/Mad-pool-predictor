// lib/pay.js
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { OSMOSIS_TESTNET, TREASURY_ADDR as CFG_ADDR } from "./config.js";

const MNEMONIC = process.env.TREASURY_MNEMONIC || "";

// derive address dari mnemonic bila TREASURY_ADDR kosong
export async function getTreasuryAddress() {
  if (CFG_ADDR) return CFG_ADDR;
  if (!MNEMONIC) throw new Error("TREASURY_MNEMONIC missing");
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: OSMOSIS_TESTNET.bech32 || "osmo" });
  const [acc] = await wallet.getAccounts();
  return acc.address;
}

// serialize tx biar tidak paralel (node sering nolak nonce/gas)
let _q = Promise.resolve();
export async function sendFromTreasury(to, amountUosmo, memo = "MadPool payout") {
  if (!MNEMONIC) throw new Error("TREASURY_MNEMONIC missing");
  _q = _q.then(async () => {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: OSMOSIS_TESTNET.bech32 || "osmo" });
    const [acc] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(OSMOSIS_TESTNET.rpc, wallet);
    const fee = { amount: [{ denom: "uosmo", amount: "2200" }], gas: "220000" };
    const res = await client.sendTokens(acc.address, to, [{ denom: "uosmo", amount: String(amountUosmo) }], fee, memo);
    return res?.transactionHash || res?.hash || null;
  });
  return _q;
}

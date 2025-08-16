// lib/pay.js
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient } from "@cosmjs/stargate";
import { OSMOSIS_TESTNET } from "./config.js";

const MNEMONIC = process.env.TREASURY_MNEMONIC || "";

export async function getTreasuryAddress() {
  if (!MNEMONIC) throw new Error("TREASURY_MNEMONIC missing");
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: "osmo" });
  const [acc] = await wallet.getAccounts();
  return acc.address;
}

export async function sendFromTreasury(to, amountUosmo, memo = "MadPool payout") {
  if (!MNEMONIC) throw new Error("TREASURY_MNEMONIC missing");
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: "osmo" });
  const client = await SigningStargateClient.connectWithSigner(OSMOSIS_TESTNET.rpc, wallet);
  const [acc] = await wallet.getAccounts();
  const fee = { amount: [{ denom: "uosmo", amount: "2200" }], gas: "220000" }; // fee non-0 agar lolos broadcast
  const res = await client.sendTokens(acc.address, to, [{ denom: "uosmo", amount: String(amountUosmo) }], fee, memo);
  return res?.transactionHash || res?.hash || null;
}

// lib/config.js
export const OSMOSIS_TESTNET = {
  chainId: "osmo-test-5",
  rpc: "https://rpc.testnet.osmosis.zone",
  lcd: "https://lcd.testnet.osmosis.zone",
  bech32: "osmo",
};

// Ambil dari ENV kalau ada; biarkan kosong di client, nanti UI fetch via /api/treasury
export const TREASURY_ADDR = (process.env.TREASURY_ADDR ?? "").trim();

// Stake limits (uosmo)
export const BET_MIN_UOSMO = Number(process.env.BET_MIN_UOSMO ?? 10_000);
export const BET_MAX_UOSMO = Number(process.env.BET_MAX_UOSMO ?? 1_000_000);

// Payouts (default ON, 2x, fee 0 bp)
export const ENABLE_PAYOUTS = String(process.env.ENABLE_PAYOUTS ?? "true") === "true";
export const PAYOUT_MULTIPLIER = Number(process.env.PAYOUT_MULTIPLIER ?? 2);
export const HOUSE_FEE_BP = Number(process.env.HOUSE_FEE_BP ?? 0);

// Faucet (default OFF)
export const ENABLE_FAUCET = String(process.env.ENABLE_FAUCET ?? "false") === "true";
export const FAUCET_AMOUNT_UOSMO = Number(process.env.FAUCET_AMOUNT_UOSMO ?? 200_000);
export const FAUCET_COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS ?? 86_400_000);

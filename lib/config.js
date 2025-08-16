export const OSMOSIS_TESTNET = {
  chainId: "osmo-test-5",
  rpc: "https://rpc.testnet.osmosis.zone",
  lcd: "https://lcd.testnet.osmosis.zone",
  bech32: "osmo",
};

// cukup butuh satu env ini (opsional; fallback di bawah)
export const TREASURY_ADDR = process.env.TREASURY_ADDR || "osmo1sxj8p7ye2t6ytzkq04v4x8veqajg3dv6zgzvjy";

// batas stake uosmo
export const BET_MIN_UOSMO = 10_000;      // 0.01 OSMO
export const BET_MAX_UOSMO = 1_000_000;   // 1.00 OSMO

export const ENABLE_PAYOUTS = true;
export const PAYOUT_MULTIPLIER = 2;
export const HOUSE_FEE_BP = 0;

// Faucet config
export const ENABLE_FAUCET = process.env.ENABLE_FAUCET === "true";
export const FAUCET_AMOUNT_UOSMO = Number(process.env.FAUCET_AMOUNT_UOSMO ?? 200000); // 0.2 OSMO
export const FAUCET_COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS ?? 24 * 60 * 60 * 1000);

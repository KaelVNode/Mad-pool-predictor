// lib/keplrChains.js
// Dua jaringan: Cosmos Hub testnet & Osmosis testnet

export const CHAINS = {
  cosmos: {
    key: "cosmos",
    label: "Cosmos Hub Testnet",
    config: {
      chainId: "theta-testnet-001",
      chainName: "Cosmos Hub Testnet",
      rpc: "https://rpc.sentry-01.theta-testnet.polypore.xyz",
      rest: "https://rest.sentry-01.theta-testnet.polypore.xyz",
      bip44: { coinType: 118 },
      bech32Config: {
        bech32PrefixAccAddr: "cosmos",
        bech32PrefixAccPub: "cosmospub",
        bech32PrefixValAddr: "cosmosvaloper",
        bech32PrefixValPub: "cosmosvaloperpub",
        bech32PrefixConsAddr: "cosmosvalcons",
        bech32PrefixConsPub: "cosmosvalconspub",
      },
      currencies: [{ coinDenom: "ATOM", coinMinimalDenom: "uatom", coinDecimals: 6 }],
      feeCurrencies: [{ coinDenom: "ATOM", coinMinimalDenom: "uatom", coinDecimals: 6 }],
      stakeCurrency: { coinDenom: "ATOM", coinMinimalDenom: "uatom", coinDecimals: 6 },
      coinType: 118,
      features: ["stargate", "ibc-transfer", "no-legacy-stdTx", "cosmwasm"],
    },
  },

  osmosis: {
    key: "osmosis",
    label: "Osmosis Testnet",
    config: {
      chainId: "osmo-test-5",
      chainName: "Osmosis Testnet",
      rpc: "https://rpc.osmotest5.osmosis.zone",
      rest: "https://lcd.osmotest5.osmosis.zone",
      bip44: { coinType: 118 },
      bech32Config: {
        bech32PrefixAccAddr: "osmo",
        bech32PrefixAccPub: "osmopub",
        bech32PrefixValAddr: "osmovaloper",
        bech32PrefixValPub: "osmovaloperpub",
        bech32PrefixConsAddr: "osmovalcons",
        bech32PrefixConsPub: "osmovalconspub",
      },
      currencies: [{ coinDenom: "OSMO", coinMinimalDenom: "uosmo", coinDecimals: 6 }],
      feeCurrencies: [{ coinDenom: "OSMO", coinMinimalDenom: "uosmo", coinDecimals: 6 }],
      stakeCurrency: { coinDenom: "OSMO", coinMinimalDenom: "uosmo", coinDecimals: 6 },
      coinType: 118,
      features: ["stargate", "ibc-transfer", "no-legacy-stdTx", "cosmwasm"],
    },
  },
};

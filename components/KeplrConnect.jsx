"use client";

import { useEffect, useState } from "react";
import { CHAINS } from "@/lib/keplrChains";

function short(addr = "", pre = 10, suf = 6) {
  return addr ? `${addr.slice(0, pre)}…${addr.slice(-suf)}` : "";
}

export default function KeplrConnect({ defaultChain = "osmosis", onConnected }) {
  const [ready, setReady] = useState(false);
  const [chainKey, setChainKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pp_chain") || defaultChain;
    }
    return defaultChain;
  });
  const [addr, setAddr] = useState("");
  const chain = CHAINS[chainKey] || CHAINS.osmosis;

  useEffect(() => {
    setReady(typeof window !== "undefined" && !!window.keplr && !!window.getOfflineSignerAuto);
  }, []);

  async function connect() {
    try {
      if (!window.keplr) throw new Error("Keplr extension not found");

      // remember selection
      try { localStorage.setItem("pp_chain", chainKey); } catch {}

      // suggest + enable chain (idempotent)
      if (window.keplr.experimentalSuggestChain) {
        await window.keplr.experimentalSuggestChain(chain.config);
      }
      await window.keplr.enable(chain.config.chainId);

      const signer = await window.getOfflineSignerAuto(chain.config.chainId);
      const accounts = await signer.getAccounts();
      const bech32 = accounts?.[0]?.address || "";
      setAddr(bech32);

      onConnected?.({
        address: bech32,
        chainId: chain.config.chainId,
        chainKey,
        label: chain.label,
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to connect Keplr");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border-2 accent-border bg-transparent px-2 py-1 text-sm"
        value={chainKey}
        onChange={(e) => setChainKey(e.target.value)}
        title="Select testnet"
      >
        {Object.values(CHAINS).map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      {ready ? (
        addr ? (
          <span className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-1 text-xs">
            {short(addr)} · {chainKey}
          </span>
        ) : (
          <button
            className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-2 text-sm accent-hover"
            onClick={connect}
          >
            Connect Keplr
          </button>
        )
      ) : (
        <button
          className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-2 text-sm accent-hover"
          onClick={() => window.open("https://www.keplr.app/", "_blank", "noopener")}
        >
          Install Keplr
        </button>
      )}
    </div>
  );
}

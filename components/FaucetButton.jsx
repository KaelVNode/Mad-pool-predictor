"use client";
import { useState } from "react";

export default function FaucetButton({ address, className = "" }) {
  const [busy, setBusy] = useState(false);

  const disabled = !address?.startsWith("osmo") || busy;

  async function claim() {
    if (!address) return alert("Connect wallet dulu.");
    try {
      setBusy(true);
      const r = await fetch("/api/faucet/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }), // WAJIB: key = address
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Faucet failed");
      alert(
        `Faucet sent ${(Number(j.amount_uosmo) / 1e6).toFixed(3)} OSMO\n` +
        `tx: ${j.txhash ? j.txhash.slice(0, 10) + "…" : "(pending)"}`
      );
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={claim}
      disabled={disabled}
      title="Claim test OSMO"
      className={`inline-flex items-center gap-1 rounded-lg border-2 accent-border px-3 py-1.5 text-sm accent-hover ${className}`}
    >
      {busy ? "Claiming…" : "Claim Faucet"}
    </button>
  );
}

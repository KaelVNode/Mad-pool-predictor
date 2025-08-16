"use client";
import { useState } from "react";

export default function FaucetButton({ address, className = "" }) {
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    if (!address?.startsWith("osmo")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/faucet/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        alert(j?.error || "Faucet failed");
      } else {
        alert(`Faucet sent. tx: ${j.txhash || "pending"}`);
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  };

  const disabled = !address?.startsWith("osmo") || busy;

  return (
    <button
      type="button"
      onClick={claim}
      disabled={disabled}
      className={`${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      title="Claim 0.2 OSMO (24h)"
      aria-label="Claim faucet 0.2 OSMO"
    >
      {busy ? "Claiming..." : "Claim 0.2"}
    </button>
  );
}

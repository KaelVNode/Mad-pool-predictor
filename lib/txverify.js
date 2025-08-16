// lib/txverify.js
import { OSMOSIS_TESTNET, TREASURY_ADDR } from "./config.js";

export async function verifyBetDeposit({ txhash, fromAddress }) {
  if (!txhash) return { ok: false, error: "Missing txhash" };

  const url = `${OSMOSIS_TESTNET.lcd.replace(/\/$/, "")}/cosmos/tx/v1beta1/txs/${encodeURIComponent(txhash)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, error: `LCD ${res.status}` };

  const j = await res.json();
  const txResp = j?.tx_response;
  if (!txResp || txResp.code !== 0) return { ok: false, error: "Tx failed or not found" };

  // Tolak jika >10 menit
  const t = new Date(txResp.timestamp).getTime();
  if (isFinite(t) && Date.now() - t > 10 * 60 * 1000) return { ok: false, error: "Tx too old" };

  const msgs = j?.tx?.body?.messages || [];
  const sends = msgs.filter((m) => (m["@type"] || "").includes("MsgSend"));
  if (!sends.length) return { ok: false, error: "No MsgSend" };

  const match = sends.find((m) => {
    const from = m.from_address;
    const to = m.to_address;
    const amtU = Number((m.amount || []).find((a) => a.denom === "uosmo")?.amount || 0);
    return (!fromAddress || fromAddress === from) && to === TREASURY_ADDR && amtU > 0;
  });

  if (!match) return { ok: false, error: "Payment not matched to treasury" };

  const amountUosmo = Number((match.amount || []).find((a) => a.denom === "uosmo")?.amount || 0);
  const from = match.from_address;
  return { ok: true, from, amountUosmo, tx: txResp };
}

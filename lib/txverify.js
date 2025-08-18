// lib/txverify.js
import { OSMOSIS_TESTNET, TREASURY_ADDR } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function verifyBetDeposit({ txhash, fromAddress }) {
  if (!txhash) return { ok: false, error: "Missing txhash" };

  const lcd = (OSMOSIS_TESTNET.lcd || "").replace(/\/$/, "");
  const url = `${lcd}/cosmos/tx/v1beta1/txs/${encodeURIComponent(txhash)}`;

  // --- retry kecil krn LCD bisa telat index ---
  let j = null;
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) { j = await res.json(); break; }
    await sleep(1500); // tunggu 1.5s lalu coba lagi
  }

  const txResp = j?.tx_response;
  if (!txResp || Number(txResp.code) !== 0) {
    return { ok: false, error: "Tx failed or not found" };
  }

  // Tolak jika >10 menit
  const t = new Date(txResp.timestamp).getTime();
  if (Number.isFinite(t) && Date.now() - t > 10 * 60 * 1000) {
    return { ok: false, error: "Tx too old" };
  }

  const msgs = j?.tx?.body?.messages || [];
  const sends = msgs.filter((m) => String(m?.["@type"] || "").endsWith("MsgSend"));
  if (!sends.length) return { ok: false, error: "No MsgSend" };

  const wantFrom = String(fromAddress || "").toLowerCase();
  const wantTo = String(TREASURY_ADDR || "").toLowerCase();

  const match = sends.find((m) => {
    const from = String(m.from_address || "").toLowerCase();
    const to = String(m.to_address || "").toLowerCase();
    const amtU = Number((m.amount || []).find((a) => a.denom === "uosmo")?.amount || 0);
    const fromOk = !wantFrom || wantFrom === from; // kalau fromAddress dikirim, harus match
    return fromOk && to === wantTo && amtU > 0;
  });

  if (!match) return { ok: false, error: "Payment not matched to treasury" };

  const amountUosmo = Number((match.amount || []).find((a) => a.denom === "uosmo")?.amount || 0);
  const from = match.from_address;
  const memo = j?.tx?.body?.memo || "";

  return { ok: true, from, amountUosmo, memo, height: txResp.height, tx: txResp };
}

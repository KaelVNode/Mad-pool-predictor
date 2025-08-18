// utils.js — hardened helpers
export function clientIp(req) {
  const xff = req?.headers?.get?.("x-forwarded-for");
  const xri = req?.headers?.get?.("x-real-ip");
  const ip = (xff?.split(",")[0] ?? xri ?? "0.0.0.0").trim();
  return ip || "0.0.0.0";
}

// Human-readable amount formatting
export function formatAmount(denom, amount) {
  if (denom === "uosmo") {
    const n = Number(amount) / 1e6;
    return `${(Number.isFinite(n) ? n : 0).toFixed(3)} OSMO`;
  }
  const n = Number(amount);
  return `${Number.isFinite(n) ? n : 0} ${String(denom ?? "").toUpperCase()}`;
}

// Price direction with tolerance (bps = basis points)
export function directionFromPrices(start, final, epsBps = 5) {
  const a = Number(start), b = Number(final);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return "FLAT";
  const rel = Math.abs(b - a) / a;                   // selisih relatif
  const eps = Math.max(0, Number(epsBps)) / 10_000;  // bps -> fraction
  if (rel <= eps) return "FLAT";
  return b > a ? "UP" : "DOWN";
}

export function scoreDirectional(pred, start, final, epsBps = 5) {
  return pred === directionFromPrices(start, final, epsBps) ? 50 : 0;
}

export function scoreValue(pricePred, actual) {
  const p = Number(pricePred), a = Number(actual);
  if (!Number.isFinite(p) || !Number.isFinite(a) || a <= 0) return 0;
  return Math.max(0, 100 - (Math.abs(p - a) / a) * 1000);
}

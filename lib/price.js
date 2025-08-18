// lib/price.js
const BINANCE = "https://api.binance.com";
const CG = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3"; // ← pakai env bila ada

const BIN_PAIR = {
  ATOM: "ATOMUSDT",
  BTC:  "BTCUSDT",
  ETH:  "ETHUSDT",    
  SOL:  "SOLUSDT",
  BNB:  "BNBUSDT",
  XRP:  "XRPUSDT",
  ADA:  "ADAUSDT",
  DOGE: "DOGEUSDT",
};

const CG_ID = {
  ATOM: "cosmos",
  BTC:  "bitcoin",
  ETH:  "ethereum",
  SOL:  "solana",
  BNB:  "binancecoin",
  XRP:  "ripple",
  ADA:  "cardano",
  DOGE: "dogecoin",
};

// helper header CG (pakai key kalau ada)
function cgHeaders() {
  const key = process.env.COINGECKO_API_KEY || process.env.CG_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

// cache tipis biar nggak spam API
const mem = new Map();
async function getJSON(url, opts = {}) {
  const { ttl = 4000, headers } = opts;
  const now = Date.now();
  const hit = mem.get(url);
  if (hit && now - hit.t < ttl) return hit.v;
  const r = await fetch(url, { cache: "no-store", headers }); // ← headers masuk
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const v = await r.json();
  mem.set(url, { t: now, v });
  return v;
}

async function binancePriceAndSeries(symbol) {
  const pair = BIN_PAIR[symbol];
  if (!pair) throw new Error("no binance pair");
  const tk = await getJSON(`${BINANCE}/api/v3/ticker/price?symbol=${pair}`, { ttl: 2000 });
  const price = Number(tk?.price);
  let series = [];
  try {
    const kl = await getJSON(`${BINANCE}/api/v3/klines?symbol=${pair}&interval=5m&limit=288`, { ttl: 2000 });
    series = (kl || []).map(k => ({ t: Number(k[0]), v: Number(k[4]) }));
  } catch {}
  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "binance", fallback: false, stale: false };
}

async function coingeckoPriceAndSeries(symbol) {
  const id = CG_ID[symbol] || CG_ID.ATOM;
  const j = await getJSON(`${CG}/simple/price?ids=${id}&vs_currencies=usd`, { ttl: 3000, headers: cgHeaders() });
  const price = Number(j?.[id]?.usd);
  let series = [];
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 3600;
    const m = await getJSON(
      `${CG}/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${now}`,
      { ttl: 3000, headers: cgHeaders() }
    );
    series = (m?.prices || []).map(([ts, p]) => ({ t: Number(ts), v: Number(p) }));
  } catch {}
  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "coingecko", fallback: true, stale: false };
}

export async function getPriceUSD(symbol = "OSMO") {
  const sym = String(symbol).toUpperCase();
  try { return await binancePriceAndSeries(sym); } catch {}
  try { return await coingeckoPriceAndSeries(sym); } catch {}
  return { price: null, series: [], source: "stale", fallback: true, stale: true };
}

export async function getAtomPriceUSD() {
  const r = await getPriceUSD("ATOM");
  return { price: r.price, source: r.source };
}

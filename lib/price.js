// lib/price.js

// --- Konstanta endpoint ---
const BINANCE = "https://api.binance.com";
const CG = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";

// --- Pemetaan simbol ke pair/id ---
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

// --- Header CoinGecko: pilih Pro dulu, kalau tidak ada pakai Demo ---
function cgHeaders() {
  const pro = process.env.CG_PRO_API_KEY;
  const demo = process.env.CG_DEMO_KEY || process.env.COINGECKO_API_KEY || process.env.CG_API_KEY;
  if (pro)  return { "x-cg-pro-api-key": pro };
  if (demo) return { "x-cg-demo-api-key": demo };
  return {};
}

// --- Dedupe fetch inflight per URL + window revalidate ---
const _inflight = (globalThis.__inflight_fetch ||= new Map());
async function getJSON(url, { revalidate = 60, headers = {}, signal } = {}) {
  const key = `${url}|${revalidate}`;
  if (_inflight.has(key)) return _inflight.get(key);

  const p = (async () => {
    // Pakai Next.js fetch caching agar bisa di-cache di Vercel CDN/edge
    const res = await fetch(url, { next: { revalidate }, headers, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  })();

  _inflight.set(key, p);
  try { return await p; }
  finally { _inflight.delete(key); }
}

// --- Binance: harga + klines (5m), cukup revalidate 60s agar hemat ---
async function binancePriceAndSeries(symbol) {
  const pair = BIN_PAIR[symbol];
  if (!pair) throw new Error("no binance pair");

  const tk = await getJSON(
    `${BINANCE}/api/v3/ticker/price?symbol=${pair}`,
    { revalidate: 30 } // harga bisa 30s; naikkan kalau mau lebih hemat
  );
  const price = Number(tk?.price);

  let series = [];
  try {
    const kl = await getJSON(
      `${BINANCE}/api/v3/klines?symbol=${pair}&interval=5m&limit=288`,
      { revalidate: 60 }
    );
    series = (kl || []).map(k => ({ t: Number(k[0]), v: Number(k[4]) }));
  } catch { /* series opsional */ }

  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "binance", fallback: false, stale: false };
}

// --- CoinGecko: JANGAN fallback ke ATOM jika simbol tak dikenal ---
async function coingeckoPriceAndSeries(symbol) {
  const id = CG_ID[symbol];
  if (!id) throw new Error("unsupported symbol for coingecko");

  // Harga: cache 60s
  const j = await getJSON(
    `${CG}/simple/price?ids=${id}&vs_currencies=usd`,
    { revalidate: 60, headers: cgHeaders() }
  );
  const price = Number(j?.[id]?.usd);

  // Series 24h: cache 300s (lebih hemat)
  let series = [];
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 3600;
    const m = await getJSON(
      `${CG}/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${now}`,
      { revalidate: 300, headers: cgHeaders() }
    );
    series = (m?.prices || []).map(([ts, p]) => ({ t: Number(ts), v: Number(p) }));
  } catch { /* series opsional */ }

  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "coingecko", fallback: true, stale: false };
}

// --- API utama ---
// *Hapus default "OSMO"* agar tidak diam-diam salah simbol.
// Biarkan route handler yang menentukan default via query/ENV.
export async function getPriceUSD(symbol) {
  const sym = String(symbol || "").toUpperCase().trim();
  if (!sym) throw new Error("symbol required");

  // Coba Binance dulu (murah/cepat), lalu fallback ke CoinGecko (hemat kuota via cache)
  try { return await binancePriceAndSeries(sym); } catch {}
  try { return await coingeckoPriceAndSeries(sym); } catch {}

  // Gagal semua -> sinyal stale (route akan bikin series 2 titik jika perlu)
  return { price: null, series: [], source: "stale", fallback: true, stale: true };
}

// Util lama tetap boleh ada kalau dipakai tempat lain
export async function getAtomPriceUSD() {
  const r = await getPriceUSD("ATOM");
  return { price: r.price, source: r.source };
}
// lib/price.js

// --- Konstanta endpoint ---
const BINANCE = "https://api.binance.com";
const CG = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";

// --- Pemetaan simbol ke pair/id ---
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

// --- Header CoinGecko: pilih Pro dulu, kalau tidak ada pakai Demo ---
function cgHeaders() {
  const pro = process.env.CG_PRO_API_KEY;
  const demo = process.env.CG_DEMO_KEY || process.env.COINGECKO_API_KEY || process.env.CG_API_KEY;
  if (pro)  return { "x-cg-pro-api-key": pro };
  if (demo) return { "x-cg-demo-api-key": demo };
  return {};
}

// --- Dedupe fetch inflight per URL + window revalidate ---
const _inflight = (globalThis.__inflight_fetch ||= new Map());
async function getJSON(url, { revalidate = 60, headers = {}, signal } = {}) {
  const key = `${url}|${revalidate}`;
  if (_inflight.has(key)) return _inflight.get(key);

  const p = (async () => {
    // Pakai Next.js fetch caching agar bisa di-cache di Vercel CDN/edge
    const res = await fetch(url, { next: { revalidate }, headers, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  })();

  _inflight.set(key, p);
  try { return await p; }
  finally { _inflight.delete(key); }
}

// --- Binance: harga + klines (5m), cukup revalidate 60s agar hemat ---
async function binancePriceAndSeries(symbol) {
  const pair = BIN_PAIR[symbol];
  if (!pair) throw new Error("no binance pair");

  const tk = await getJSON(
    `${BINANCE}/api/v3/ticker/price?symbol=${pair}`,
    { revalidate: 30 } // harga bisa 30s; naikkan kalau mau lebih hemat
  );
  const price = Number(tk?.price);

  let series = [];
  try {
    const kl = await getJSON(
      `${BINANCE}/api/v3/klines?symbol=${pair}&interval=5m&limit=288`,
      { revalidate: 60 }
    );
    series = (kl || []).map(k => ({ t: Number(k[0]), v: Number(k[4]) }));
  } catch { /* series opsional */ }

  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "binance", fallback: false, stale: false };
}

// --- CoinGecko: JANGAN fallback ke ATOM jika simbol tak dikenal ---
async function coingeckoPriceAndSeries(symbol) {
  const id = CG_ID[symbol];
  if (!id) throw new Error("unsupported symbol for coingecko");

  // Harga: cache 60s
  const j = await getJSON(
    `${CG}/simple/price?ids=${id}&vs_currencies=usd`,
    { revalidate: 60, headers: cgHeaders() }
  );
  const price = Number(j?.[id]?.usd);

  // Series 24h: cache 300s (lebih hemat)
  let series = [];
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 24 * 3600;
    const m = await getJSON(
      `${CG}/coins/${id}/market_chart/range?vs_currency=usd&from=${from}&to=${now}`,
      { revalidate: 300, headers: cgHeaders() }
    );
    series = (m?.prices || []).map(([ts, p]) => ({ t: Number(ts), v: Number(p) }));
  } catch { /* series opsional */ }

  if (!Number.isFinite(price)) throw new Error("bad price");
  return { price, series, source: "coingecko", fallback: true, stale: false };
}

// --- API utama ---
// *Hapus default "OSMO"* agar tidak diam-diam salah simbol.
// Biarkan route handler yang menentukan default via query/ENV.
export async function getPriceUSD(symbol) {
  const sym = String(symbol || "").toUpperCase().trim();
  if (!sym) throw new Error("symbol required");

  // Coba Binance dulu (murah/cepat), lalu fallback ke CoinGecko (hemat kuota via cache)
  try { return await binancePriceAndSeries(sym); } catch {}
  try { return await coingeckoPriceAndSeries(sym); } catch {}

  // Gagal semua -> sinyal stale (route akan bikin series 2 titik jika perlu)
  return { price: null, series: [], source: "stale", fallback: true, stale: true };
}

// Util lama tetap boleh ada kalau dipakai tempat lain
export async function getAtomPriceUSD() {
  const r = await getPriceUSD("ATOM");
  return { price: r.price, source: r.source };
}

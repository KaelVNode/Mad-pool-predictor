// lib/price.js
import { setTimeout as delay } from "node:timers/promises";

/* ============================================================
   Fetch helper: timeout + retry + logging
   ============================================================ */
function logPriceInfo(msg, extra = {}) {
  try {
    // ringkas; kalau mau, ubah ke JSON.stringify({ ts: new Date().toISOString(), msg, ...extra })
    console.log(`[price] ${msg}`, extra);
  } catch {}
}
function logPriceWarn(source, url, err, attempt) {
  const msg = (err && (err.message || String(err))) || "unknown";
  console.warn(`[price] ${source} attempt#${attempt} failed: ${msg} :: ${url}`);
}

/**
 * fetchJSON(url, { timeoutMs, retries })
 * - Timeout via AbortController
 * - Retry exponential backoff + sedikit jitter
 */
async function fetchJSON(url, { timeoutMs = 3500, retries = 2, init = {} } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctl.signal, ...init });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      logPriceWarn("fetchJSON", url, err, attempt + 1);
      if (attempt === retries) throw err;
      const backoff = 200 * (2 ** attempt) + Math.floor(Math.random() * 50);
      await delay(backoff);
    } finally {
      clearTimeout(t);
    }
  }
}

/* ============================================================
   Sumber & konstanta
   ============================================================ */

// 1) Imperator (khusus ATOM)
const IMPERATOR_URL = "https://api-osmosis.imperator.co/tokens/v2/price/atom";

// 2) Binance (ATOM/BTC/ETH)
const BINANCE_BASE = "https://api.binance.com/api/v3/ticker/price?symbol=";
const BINANCE_SYMBOLS = {
  ATOM: "ATOMUSDT",
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  // OSMO tidak tersedia di endpoint ini
};

// 3) CoinGecko (fallback)
const CG_KEY = null; // isi jika punya: "coingecko-api-key-xxxx"
const CG_IDS_MAP = {
  ATOM: "cosmos",
  BTC: "bitcoin",
  ETH: "ethereum",
  OSMO: "osmosis",
};

// cache ringan in-memory
const LAST = {
  t: 0,
  symbol: null,
  price: null,
  source: null,
  fallback: false,
  series: [], // { t, price }
};

const SERIES_MAX = 120;  // ~2 menit kalau polling tiap 1s, sesuaikan dengan frekuensi kamu
const STALE_MS = 30_000; // data dianggap stale jika terakhir update > 30 dtk

function isGood(n) {
  return Number.isFinite(n) && n > 0;
}

/* ============================================================
   Inti: getPriceUSD(symbol)
   ============================================================ */
export async function getPriceUSD(symbol = "ATOM") {
  symbol = String(symbol || "ATOM").toUpperCase();
  let price = NaN;
  let source = null;
  let fallback = false;

  // 1) Imperator untuk ATOM dulu (cepat & spesifik Osmosis)
  if (symbol === "ATOM") {
    try {
      const data = await fetchJSON(IMPERATOR_URL, { timeoutMs: 3500, retries: 2 });
      const p = Number(data?.price ?? data?.[0]?.price);
      if (isGood(p)) { price = p; source = "imperator"; }
    } catch (err) {
      logPriceWarn("imperator", IMPERATOR_URL, err, "final");
    }
  }

  // 2) Binance (ATOM/BTC/ETH) — biasanya likuid & cepat
  if (!isGood(price)) {
    const bin = BINANCE_SYMBOLS[symbol];
    if (bin) {
      const url = `${BINANCE_BASE}${encodeURIComponent(bin)}`;
      try {
        const data = await fetchJSON(url, { timeoutMs: 3500, retries: 2 });
        const p = Number(data?.price);
        if (isGood(p)) { price = p; source = "binance"; }
      } catch (err) {
        logPriceWarn("binance", bin, err, "final");
      }
    }
  }

  // 3) CoinGecko fallback (semua simbol yang didukung)
  if (!isGood(price)) {
    const id = CG_IDS_MAP[symbol];
    if (id) {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
      const init = CG_KEY ? { headers: { "x-cg-pro-api-key": CG_KEY } } : {};
      try {
        const data = await fetchJSON(url, { timeoutMs: 4000, retries: 2, init });
        const p = Number(data?.[id]?.usd);
        if (isGood(p)) { price = p; source = "coingecko"; fallback = true; }
      } catch (err) {
        logPriceWarn("coingecko", id, err, "final");
      }
    }
  }

  // kalau masih gagal, coba pakai cache LAST agar UI tetap hidup
  let usedCache = false;
  if (!isGood(price)) {
    if (LAST.symbol === symbol && isGood(LAST.price)) {
      price = LAST.price;
      source = LAST.source || "cache";
      fallback = LAST.fallback || false;
      usedCache = true;
      logPriceInfo("using cached price", { symbol, price, source });
    }
  }

  // update cache/series jika ada harga baru (bukan dari cache)
  if (isGood(price) && !usedCache) {
    LAST.t = Date.now();
    LAST.symbol = symbol;
    LAST.price = price;
    LAST.source = source;
    LAST.fallback = fallback;
    (LAST.series ||= []).push({ t: LAST.t, price });
    if (LAST.series.length > SERIES_MAX) LAST.series = LAST.series.slice(-SERIES_MAX);
  }

  const stale = LAST?.t ? (Date.now() - LAST.t > STALE_MS) : true;
  return { price, series: LAST.series || [], fallback, source, stale };
}

/* ============================================================
   Bantuan: berdasarkan pool_id "1/2/3/4"
   ============================================================ */
const POOL_SYMBOL_MAP = { "1": "ATOM", "2": "BTC", "3": "ETH", "4": "OSMO" };
export async function getPriceUSDByPool(poolId = "1") {
  const sym = POOL_SYMBOL_MAP[String(poolId)] || "ATOM";
  return getPriceUSD(sym);
}

/* ============================================================
   Backward-compat
   ============================================================ */
export async function getAtomPriceUSD() {
  return getPriceUSD("ATOM");
}

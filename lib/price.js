// lib/price.js
import { setTimeout as delay } from "node:timers/promises";

// ====== Sumber harga (default, tanpa .env) ======
const IMPERATOR_URL =
  "https://api-osmosis.imperator.co/tokens/v2/price/atom"; // cuma dipakai untuk ATOM

const BINANCE_BASE = "https://api.binance.com/api/v3/ticker/price?symbol=";

const CG_KEY = null; // kalau nanti punya key, isi string-nya di sini

// ====== Map simbol / id ======
const CG_IDS_MAP = {
  ATOM: "cosmos",      // fallback id di CoinGecko
  BTC: "bitcoin",
  ETH: "ethereum",
  OSMO: "osmosis",
};

const BINANCE_SYMBOLS = {
  ATOM: "ATOMUSDT",
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  // OSMO tidak selalu ada di Binance → otomatis fallback ke CoinGecko
};

const POOL_SYMBOL_MAP = { "1": "ATOM", "2": "BTC", "3": "ETH", "4": "OSMO" };

// ====== Cache kecil untuk UI sparkline ======
const LAST = { price: null, at: 0, series: [] };
function isGood(n) { return Number.isFinite(n) && n > 0; }
function pushSeries(p) {
  const now = Date.now();
  LAST.series.push({ t: now, p: Number(p) });
  if (LAST.series.length > 200) LAST.series.shift();
}

// ====== API utama: ambil harga per simbol ======
export async function getPriceUSD(symbol = "ATOM") {
  symbol = String(symbol || "ATOM").toUpperCase();
  let price = NaN, source = "none", fallback = false, stale = false;

  // 1) Imperator khusus ATOM
  if (symbol === "ATOM") {
    try {
      const res = await fetch(IMPERATOR_URL, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const p = Number(data?.price ?? data?.[0]?.price);
        if (isGood(p)) { price = p; source = "imperator"; }
      }
    } catch {}
  }

  // 2) Binance (ATOM/BTC/ETH)
  if (!isGood(price)) {
    const bin = BINANCE_SYMBOLS[symbol];
    if (bin) {
      try {
        const res = await fetch(`${BINANCE_BASE}${bin}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const p = Number(data?.price);
          if (isGood(p)) { price = p; source = "binance"; }
        }
      } catch {}
    }
  }

  // 3) CoinGecko (semua)
  if (!isGood(price)) {
    try {
      const id = CG_IDS_MAP[symbol] || symbol.toLowerCase();
      const url = CG_KEY
        ? `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&x_cg_pro_api_key=${CG_KEY}`
        : `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const p = Number(data?.[id]?.usd);
        if (isGood(p)) { price = p; source = "coingecko"; fallback = true; }
      }
    } catch {}
  }

  // Tandai stale kalau cache lama
  const nowTs = Date.now();
  if (LAST.price !== null && nowTs - LAST.at > 60_000) stale = true;

  if (isGood(price)) {
    LAST.price = price;
    LAST.at = nowTs;
    pushSeries(price);
  }
  return { price, series: LAST.series, fallback, source, stale };
}

// Bantuan: ambil harga berdasarkan pool_id "1/2/3/4"
export async function getPriceUSDByPool(poolId = "1") {
  const sym = POOL_SYMBOL_MAP[String(poolId)] || "ATOM";
  return getPriceUSD(sym);
}

// Backward-compat (kalau ada kode lama masih manggil ini)
export async function getAtomPriceUSD() {
  return getPriceUSD("ATOM");
}

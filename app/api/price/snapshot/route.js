// app/api/price/snapshot/route.js
import { NextResponse } from "next/server";
import { getPriceUSD } from "@/lib/price";

// Cache di CDN/Edge selama 60 dtk, aman untuk demo & hemat kuota
export const dynamic = "force-static";
export const revalidate = 60;

// --- Rate limit sederhana (token bucket, per instance) ---
const _bucket = (globalThis.__cg_bucket ||= { tokens: 60, last: Date.now() });
function allow(ratePerMin = 30, burst = 60) {
  const now = Date.now();
  const refill = ((now - _bucket.last) / 60000) * ratePerMin;
  _bucket.tokens = Math.min(burst, _bucket.tokens + refill);
  _bucket.last = now;
  if (_bucket.tokens >= 1) { _bucket.tokens -= 1; return true; }
  return false;
}

// --- Dedupe inflight: cegah beberapa fetch identik nembak upstream bersamaan ---
const _inflight = (globalThis.__inflight_prices ||= new Map());
async function once(key, fn) {
  if (_inflight.has(key)) return _inflight.get(key);
  const p = (async () => {
    try { return await fn(); }
    finally { _inflight.delete(key); }
  })();
  _inflight.set(key, p);
  return p;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  // Ambil dari QS: ?symbol=... atau ?pair=...; kalau kosong, pakai ENV DEFAULT_SYMBOL
  const qs = searchParams.get("pair") || searchParams.get("symbol");
  const fallbackEnv = (process.env.DEFAULT_SYMBOL || "").toUpperCase().trim();
  const symbol = (qs || fallbackEnv).toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json(
      { ok: false, error: "Missing 'symbol' (set query ?symbol=XYZ atau ENV DEFAULT_SYMBOL)" },
      { status: 400, headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=30" } }
    );
  }

  // Optional guard: batasi simbol yang diizinkan via ENV (mis. "BTC,ETH,SOL")
  const allowList = (process.env.ALLOWED_SYMBOLS || "")
    .split(",")
    .map(s => s.toUpperCase().trim())
    .filter(Boolean);
  if (allowList.length > 0 && !allowList.includes(symbol)) {
    return NextResponse.json(
      { ok: false, error: `Symbol '${symbol}' tidak diizinkan`, allowed: allowList },
      { status: 400, headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=30" } }
    );
  }

  // Rate limit ringan untuk meredam spike
  if (!allow(30, 60)) {
    return NextResponse.json(
      { ok: false, error: "Rate limited" },
      { status: 429, headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=30" } }
    );
  }

  // Fetch harga (didedupe per symbol)
  const out = await once(`price:${symbol}`, () => getPriceUSD(symbol));
  const price = Number.isFinite(Number(out?.price)) ? Number(out.price) : null;

  // Jika provider sudah mengembalikan series, pakai; kalau kosong, fallback 2 titik datar
  let series = Array.isArray(out?.series) ? out.series : [];
  if (series.length === 0 && Number.isFinite(price)) {
    const t = Date.now();
    series = [{ t: t - 60_000, v: price }, { t, v: price }];
  }

  return NextResponse.json(
    {
      ok: true,
      symbol,
      price,
      current: price,
      series,
      source: out?.source || null,
      fallback: !!out?.fallback,
      stale: !!out?.stale,
    },
    {
      headers: {
        // Kunci penghemat kuota: cache edge 60 dtk + SWR 5 menit
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

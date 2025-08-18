// app/api/price/snapshot/route.js  (yang sudah kamu punya)
import { NextResponse } from "next/server";
import { getPriceUSD } from "@/lib/price";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("pair") || searchParams.get("symbol") || "OSMO").toUpperCase();

  const out = await getPriceUSD(symbol);
  const price = Number.isFinite(Number(out?.price)) ? Number(out.price) : null;

  // jika provider sudah mengembalikan series, pakai apa adanya; kalau kosong baru fallback 2 titik
  let series = Array.isArray(out?.series) ? out.series : [];
  if (series.length === 0 && Number.isFinite(price)) {
    const t = Date.now();
    series = [{ t: t - 60_000, v: price }, { t, v: price }];
  }

  return NextResponse.json({
    ok: true,
    symbol,
    price,
    current: price,
    series,
    source: out?.source || null,
    fallback: !!out?.fallback,
    stale: !!out?.stale,
  }, { headers: { "Cache-Control": "no-store" } });
}

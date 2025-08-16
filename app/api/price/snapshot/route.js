import { NextResponse } from "next/server";
import { getPriceUSD } from "@/lib/price";

// query: ?pair=ATOM|BTC|ETH|OSMO
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const pair = (searchParams.get("pair") || "ATOM").toUpperCase();
    const snap = await getPriceUSD(pair); // { price, series?, source, fallback, stale }
    const out = {
      current: Number(snap?.price ?? 0),
      series: Array.isArray(snap?.series) ? snap.series : [],
      source: snap?.source || null,
      fallback: !!snap?.fallback,
      stale: !!snap?.stale,
    };
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

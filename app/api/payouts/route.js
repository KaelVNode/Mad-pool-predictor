import { NextResponse } from "next/server";
import { read } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await read();
    const payouts = db.payouts || [];

    // urutkan terbaru dulu
    payouts.sort((a, b) => new Date(b.paid_at || 0) - new Date(a.paid_at || 0));

    return NextResponse.json({
      ok: true,
      count: payouts.length,
      payouts,
    });
  } catch (e) {
    console.error("GET /api/payouts error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || String(e) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getOrStartCurrentRound, settleIfNeeded } from "@/lib/db";

export const runtime = "nodejs";          // ⬅️ tambahkan baris ini
export const dynamic = "force-dynamic";   // (opsional) tidak di-cache  

export async function GET() {
  try {
    await settleIfNeeded();
    const r = await getOrStartCurrentRound();
    return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[/api/round/current] error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

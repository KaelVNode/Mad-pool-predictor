import { NextResponse } from "next/server";
import { getOrStartCurrentRound, settleIfNeeded } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await settleIfNeeded();
    const round = await getOrStartCurrentRound();
    return NextResponse.json(round);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

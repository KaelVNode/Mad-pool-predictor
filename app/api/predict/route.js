import { NextResponse } from "next/server";
import { upsertPlayer, addPrediction } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { roundId, username, pricePred } = await req.json();
    if (!roundId || !(Number(pricePred) > 0)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const p = await upsertPlayer(username || "anon");
    await addPrediction(p.id, roundId, Number(pricePred));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

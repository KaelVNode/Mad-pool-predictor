import { NextResponse } from "next/server";
import { upsertPlayer, addPredictionDir } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { roundId, username, direction } = await req.json();
    if (!roundId || !direction) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const p = await upsertPlayer(username || "anon");
    await addPredictionDir(p.id, roundId, String(direction).toUpperCase());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

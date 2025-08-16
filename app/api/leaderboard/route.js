import { NextResponse } from "next/server";
import { leaderboard } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await leaderboard({ days: 7 });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

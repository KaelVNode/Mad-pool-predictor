import { NextResponse } from "next/server";
import { listEvents } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = Number(searchParams.get("hours") ?? 24);
    const limit = Number(searchParams.get("limit") ?? 50);
    const events = await listEvents({ hours, limit });
    return NextResponse.json(events);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

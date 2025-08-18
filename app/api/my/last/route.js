import { NextResponse } from "next/server";
import { lastResultForName } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").trim();
    if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
    const res = await lastResultForName(username);
    return NextResponse.json(res || {});
  } catch (e) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

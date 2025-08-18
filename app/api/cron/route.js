// app/api/settle/cron/route.js
import { NextResponse } from "next/server";
import { settleIfNeeded } from "@/lib/db";

export const runtime = "nodejs";       // butuh Node runtime (akses fs di lib/db)
export const dynamic = "force-dynamic";

export async function GET(req) {
  // Proteksi sederhana pakai secret
  const secret = process.env.CRON_SECRET || "";
  const headerKey = req.headers.get("x-cron-key");
  const queryKey = new URL(req.url).searchParams.get("key");
  if (secret && headerKey !== secret && queryKey !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const settled = await settleIfNeeded();  // auto-settle semua ronde yang sudah lewat
    return NextResponse.json({ ok: true, settled, at: new Date().toISOString() });
  } catch (e) {
    console.error("[cron] settle error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

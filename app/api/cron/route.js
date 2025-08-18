// app/api/settle/cron/route.js
import { NextResponse } from "next/server";
import { settleIfNeeded } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const secret = process.env.CRON_SECRET || "";

  // ⭐ cron Vercel akan selalu kirim header ini
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  // opsi manual test
  const headerKey = req.headers.get("x-cron-key");
  const queryKey  = new URL(req.url).searchParams.get("key");

  if (secret && !(isVercelCron || headerKey === secret || queryKey === secret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const settled = await settleIfNeeded();
    return NextResponse.json({ ok: true, settled, at: new Date().toISOString() });
  } catch (e) {
    console.error("[cron] settle error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}

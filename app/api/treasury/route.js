// app/api/treasury/route.js
import { NextResponse } from "next/server";
import { TREASURY_ADDR } from "@/lib/config";
import { getTreasuryAddress } from "@/lib/pay";

export async function GET() {
  try {
    const addr = TREASURY_ADDR || await getTreasuryAddress();
    if (!addr) return NextResponse.json({ error: "Treasury not configured" }, { status: 500 });
    return NextResponse.json({ address: addr });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

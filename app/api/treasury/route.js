import { NextResponse } from "next/server";
import { TREASURY_ADDR } from "@/lib/config";

export async function GET() {
  // simple JSON: dipakai HomeClient utk menampilkan/tujuan kirim
  return NextResponse.json({ address: TREASURY_ADDR ?? null });
}

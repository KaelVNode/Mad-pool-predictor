import { settleRound } from "@/lib/db";

export const runtime = "nodejs";          // ⬅️ tambahkan baris ini
export const dynamic = "force-dynamic";   // (opsional) tidak di-cache

export async function POST(_req, { params }) {
  try {
    // Final price is computed internally by settleRound based on the round's pair
    const round = await settleRound(params.roundId);
    return Response.json({ ok: true, round });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Settle failed" }),
      { status: 400 },
    );
  }
}

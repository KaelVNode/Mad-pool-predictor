import { settleRound } from "@/lib/db";
import { getAtomPriceUSD } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  try {
    // Pakai harga live ATOM/USD (konsisten dgn UI & start price)
    const { price } = await getAtomPriceUSD();
    const actual = Number(price);
    if (!Number.isFinite(actual) || actual <= 0) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch live price" }),
        { status: 502 },
      );
    }

    const round = await settleRound(params.roundId, actual);
    return Response.json({ ok: true, round, actual });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Settle failed" }),
      { status: 400 },
    );
  }
}

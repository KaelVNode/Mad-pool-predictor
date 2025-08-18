// app/api/bet/ticket/route.js
import { NextResponse } from "next/server";
import { createBetTicket, upsertPlayer, read } from "@/lib/db";
import { verifyBetDeposit } from "@/lib/txverify";
import { BET_MIN_UOSMO, BET_MAX_UOSMO } from "@/lib/config";

export async function POST(req) {
  try {
    const { roundId, username, from, txhash } = await req.json();
    if (!roundId || !from || !txhash) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Cek apakah sudah pernah attach (by round + from) -> 409
    const db = await read();
    const already =
      (db.tickets || []).find(t => t.round_id === roundId && (t.from || "").toLowerCase() === from.toLowerCase()) ||
      (db.bets || []).find(b => b.round_id === roundId && (b.from || "").toLowerCase() === from.toLowerCase());
    if (already) {
      return NextResponse.json({ ok: true, ticket: already }, { status: 409 });
    }

    const v = await verifyBetDeposit({ txhash, fromAddress: from });
    if (!v.ok) {
      return NextResponse.json({ error: v.error ?? "Verify failed" }, { status: 400 });
    }

    const amt = Number(v.amountUosmo || 0);
    if (amt < Number(BET_MIN_UOSMO) || amt > Number(BET_MAX_UOSMO)) {
      return NextResponse.json({ error: "Stake out of range" }, { status: 400 });
    }

    const player = await upsertPlayer(username || from || "anon");
    const ticket = await createBetTicket({
      roundId,
      playerId: player.id,
      fromAddr: v.from,
      amountUosmo: amt,
      txhash,
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

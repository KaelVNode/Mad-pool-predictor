import { NextResponse } from "next/server";
import { ENABLE_FAUCET, FAUCET_AMOUNT_UOSMO, FAUCET_COOLDOWN_MS } from "@/lib/config";
import { getLastFaucetClaim, recordFaucetClaim } from "@/lib/db";
import { sendFromTreasury } from "@/lib/pay";

// simple in-memory rate limit per-IP (dev only)
const IP_BUCKET = new Map(); // ip -> ts
const MIN_GAP_MS = 3000;

export const dynamic = "force-dynamic";

function clientIp(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}

export async function POST(req) {
  try {
    if (!ENABLE_FAUCET) {
      return NextResponse.json({ ok: false, error: "Faucet disabled" }, { status: 403 });
    }

    const { address } = await req.json();
    const addr = String(address || "").trim();

    if (!/^osmo1[0-9a-z]{10,}$/.test(addr)) {
      return NextResponse.json({ ok: false, error: "Invalid Osmosis address" }, { status: 400 });
    }
    if (!(Number(FAUCET_AMOUNT_UOSMO) > 0)) {
      return NextResponse.json({ ok: false, error: "Invalid faucet amount" }, { status: 500 });
    }

    // basic IP throttle
    const ip = clientIp(req);
    const now = Date.now();
    const last = IP_BUCKET.get(ip) || 0;
    if (now - last < MIN_GAP_MS) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }
    IP_BUCKET.set(ip, now);

    // cooldown per address
    const prev = await getLastFaucetClaim(addr);
    if (prev && now - Number(prev.last_claim_at || 0) < FAUCET_COOLDOWN_MS) {
      const nextAt = Number(prev.last_claim_at) + FAUCET_COOLDOWN_MS;
      return NextResponse.json({
        ok: false,
        error: "Cooldown",
        next_claim_at: new Date(nextAt).toISOString(),
        ms_left: Math.max(0, nextAt - now),
      }, { status: 429 });
    }

    // send from treasury
    const memo = "Faucet 0.2 OSMO";
    const hash = await sendFromTreasury(addr, Number(FAUCET_AMOUNT_UOSMO), memo);

    const rec = await recordFaucetClaim(addr, Number(FAUCET_AMOUNT_UOSMO), hash || null);

    return NextResponse.json({
      ok: true,
      txhash: hash || null,
      amount_uosmo: Number(FAUCET_AMOUNT_UOSMO),
      next_claim_at: new Date(Number(rec.last_claim_at) + FAUCET_COOLDOWN_MS).toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
// scripts/settle-cron.mjs
// Jalankan: node scripts/settle-cron.mjs --once
// atau     : node scripts/settle-cron.mjs --loop 30   (tiap 30 detik)

import { listExpiredUnsettled, settleRound } from "../lib/db.js";
import { getPoolPriceUSD } from "../lib/price.js";

const args = new Map(
  process.argv
    .slice(2)
    .map((a, i, arr) =>
      a.startsWith("--")
        ? [
            a.replace(/^--/, ""),
            arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true",
          ]
        : null,
    )
    .filter(Boolean),
);
const poolId = args.get("pool") || "1";
const once = args.has("once");
const loopSec = Number(args.get("loop") || 0);

async function sweepOnce() {
  const overdue = await listExpiredUnsettled(poolId);
  if (!overdue.length) return { settled: 0 };
  let ok = 0;
  for (const rid of overdue) {
    try {
      const price = await getPoolPriceUSD(poolId);
      await settleRound(rid, price);
      ok++;
      console.log(`[settled] ${rid} @ ${price}`);
    } catch (e) {
      console.warn(`[settle-failed] ${rid}:`, e?.message || e);
    }
  }
  return { settled: ok };
}

(async () => {
  if (once || !loopSec) {
    const r = await sweepOnce();
    console.log("done:", r);
    process.exit(0);
  } else {
    console.log(`Looping every ${loopSec}s (pool ${poolId})`);

    while (true) {
      await sweepOnce().catch((e) =>
        console.warn("[loop-error]", e?.message || e),
      );
      await new Promise((r) => setTimeout(r, loopSec * 1000));
    }
  }
})();

// scripts/settle.js (ESM)
import {
  listExpiredUnsettled,
  getCurrentRound,
  settleRound,
} from "../lib/db.js";
import { getAtomPriceUSD } from "../lib/price.js";

function argMap() {
  const m = new Map();
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v =
        process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
          ? process.argv[++i]
          : true;
      m.set(k, v);
    }
  }
  return m;
}

async function priceOrDefault() {
  try {
    const { price } = await getAtomPriceUSD(); // konsisten dengan UI & start price
    if (Number.isFinite(price) && price > 0) return Number(price);
  } catch {}
  const fallback = Number(process.env.BASE_PRICE_USD || 1);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
}

async function settleById(id) {
  const p = await priceOrDefault();
  const r = await settleRound(id, p);
  console.log(`[settled] ${id} @ ${r.price_final}`);
}

(async () => {
  const args = argMap();

  if (args.has("sweep")) {
    const ids = await listExpiredUnsettled("1");
    if (!ids.length) return console.log("no overdue rounds.");
    for (const id of ids) {
      try {
        await settleById(id);
      } catch (e) {
        console.warn(`[fail] ${id}:`, e?.message || e);
      }
    }
    return;
  }

  if (args.has("current")) {
    const r = await getCurrentRound("1");
    await settleById(r.id);
    return;
  }

  if (args.has("id")) {
    await settleById(String(args.get("id")));
    return;
  }

  console.log(
    "Usage: node scripts/settle.js --sweep | --current | --id <roundId>",
  );
})();

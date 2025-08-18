import fs from "node:fs/promises";
import path from "node:path";
import { getAtomPriceUSD, getPriceUSD } from "./price.js";
import { sendFromTreasury } from "./pay.js";
import { PAYOUT_MULTIPLIER, HOUSE_FEE_BP, ENABLE_PAYOUTS } from "./config.js";
import { formatAmount, directionFromPrices, scoreValue, scoreDirectional } from "./utils.js";

// ---------------- Paths & store helpers ----------------
const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE = path.join(DATA_DIR, "store.json");

const now = () => Date.now();
const toISO = (t) => new Date(t).toISOString();
const id = () =>
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 6);

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function atomicWrite(file, json) {
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(json, null, 2), "utf8");
  // retry kecil untuk Windows
  for (let i = 0; i < 3; i++) {
    try { await fs.rename(tmp, file); return; }
    catch (e) { await new Promise(r => setTimeout(r, 50)); }
  }
  // terakhir, fallback: write langsung (tidak ideal, tapi mencegah 500)
  await fs.writeFile(file, JSON.stringify(json, null, 2), "utf8");
}

export async function read() {
  await ensureDir();
  try {
    const buf = await fs.readFile(STORE, "utf8");
    const db = JSON.parse(buf);
    db.rounds ||= [];
    db.players ||= [];
    db.predictions ||= [];
    db.predictions_dir ||= [];
    db.events ||= [];
    db.tickets ||= [];
    db.bets ||= [];
    db.payouts ||= [];
    db.faucet_claims ||= [];
    db.meta ||= {};
    return db;
  } catch (e) {
    // file hilang -> init baru
    if (e.code === "ENOENT") {
      const empty = {
        rounds: [],
        players: [],
        predictions: [],
        predictions_dir: [],
        events: [],
        tickets: [],
        bets: [],
        payouts: [],
        faucet_claims: [],
        meta: {},
      };
      await atomicWrite(STORE, empty);
      return empty;
    }
    // JSON korup / error lain -> backup & reinit
    try {
      await fs.rename(STORE, STORE + ".corrupt." + Date.now());
    } catch { }
    const empty = {
      rounds: [],
      players: [],
      predictions: [],
      predictions_dir: [],
      events: [],
      tickets: [],
      bets: [],
      payouts: [],
      faucet_claims: [],
      meta: {},
    };
    await atomicWrite(STORE, empty);
    return empty;
  }
}

export async function write(db) {
  await ensureDir();
  await atomicWrite(STORE, db);
  return db;
}

function pushEvent(db, ev) {
  (db.events ||= []).push({
    t: ev?.t ?? now(),
    type: ev?.type ?? "Log",
    text: ev?.text ?? "",
    rid: ev?.rid ?? null,
    meta: ev?.meta ?? null,
  });
}

// ---------------- Rounds ----------------
const ROUND_MIN_MIN = Number(process.env.ROUND_MIN_MIN ?? 2);
const ROUND_MIN_MAX = Number(process.env.ROUND_MIN_MAX ?? 10);


const PAIR_LIST = (process.env.PAIRS
  ? process.env.PAIRS.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
  : ["ATOM", "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"]);

// mapping otomatis: "1" -> PAIR_LIST[0], dst
const PAIR_TO_POOL = Object.fromEntries(PAIR_LIST.map((p, i) => [p, String(i + 1)]));
const POOL_TO_PAIR = Object.fromEntries(PAIR_LIST.map((p, i) => [String(i + 1), p]));

function findActiveRound(db) {
  const t = now();
  return (db.rounds || []).find((r) => !r.settled && new Date(r.end_at).getTime() > t) || null;
}

async function createRound(db, opts = {}) {
  const durationMin = Math.max(
    1,
    Number.isFinite(Number(opts?.durationMin))
      ? Number(opts.durationMin)
      : Math.floor(Math.random() * (ROUND_MIN_MAX - ROUND_MIN_MIN + 1)) + ROUND_MIN_MIN
  );

  const last1 = db.rounds?.at(-1)?.pair ?? null;
  const last2 = db.rounds?.at(-2)?.pair ?? null;

  // siapkan kandidat yang tidak sama dengan 1–2 ronde terakhir
  let candidates = PAIR_LIST.slice();
  if (last1) candidates = candidates.filter(p => p !== last1);
  if (last2 && candidates.length > 1) candidates = candidates.filter(p => p !== last2);

  // pilih dari candidates jika ada; fallback ke PAIR_LIST
  const pool = candidates.length ? candidates : PAIR_LIST;
  const pair = pool[Math.floor(Math.random() * pool.length)] || "ATOM";
  const poolId = PAIR_TO_POOL[pair] || "1";

  const t0 = now();
  const t1 = t0 + durationMin * 60 * 1000;

  let startPrice = Number(opts?.startPrice);
  if (!Number.isFinite(startPrice)) {
    try {
      const gp = await getPriceUSD(pair);
      const p = Number(gp?.price);
      startPrice = Number.isFinite(p) && p > 0 ? p : 1; // default aman
    } catch {
      startPrice = 1;
    }
  }

  const r = {
    id: id(),
    pair,
    pool_id: poolId,
    start_at: toISO(t0),
    end_at: toISO(t1),
    duration_min: durationMin,
    start_price: startPrice,
    price_final: null,
    settled: false,
    direction: null,
  };
  (db.rounds ||= []).push(r);

  pushEvent(db, {
    t: t0,
    type: "Round",
    text: `New round ${r.id.slice(0, 6)} • pair ${pair} • duration ${durationMin}m`,
    rid: r.id,
    meta: { pair, pool_id: poolId, duration_min: durationMin },
  });
  if (Number.isFinite(Number(r.start_price))) {
    pushEvent(db, {
      t: t0,
      type: "Price",
      text: `Start price $${Number(r.start_price).toFixed(4)} (pair ${pair} / pool #${r.pool_id})`,
      rid: r.id,
    });
  }
  await write(db);
  return r;
}

export async function getCurrentRound() {
  const db = await read();
  const active = findActiveRound(db);
  if (active) return active;
  return await createRound(db);
}

export async function getOrStartCurrentRound() {
  const db = await read();
  const active = findActiveRound(db);
  if (active) return active;
  return await createRound(db);
}

// ---------------- Submission lock (≤ 10s) ----------------
const SUBMIT_LOCK_MS = 10 * 1000; // 10 seconds
function isSubmitClosed(r) {
  const end = new Date(r.end_at).getTime();
  const left = end - Date.now();
  return left <= SUBMIT_LOCK_MS;
}

// ---------------- Players ----------------
export async function upsertPlayer(username, ip = "0.0.0.0") {
  const db = await read();
  const name = String(username || "anon").trim().slice(0, 64) || "anon";
  let p =
    (db.players || []).find(
      (x) => (x.username || "").toLowerCase() === name.toLowerCase()
    ) || null;
  if (!p) {
    p = { id: id(), username: name, ip, created_at: toISO(now()) };
    db.players.push(p);
    pushEvent(db, { type: "Player", text: `New player "${name}"`, meta: { username: name } });
    await write(db);
  }
  return p;
}

// ---------------- Predictions ----------------
export async function addPrediction(playerId, roundId, pricePred) {
  const db = await read();
  const r = (db.rounds || []).find((x) => x.id === roundId);
  if (!r) throw new Error("Round not found");
  if (r.settled || isSubmitClosed(r)) throw new Error("Submissions are closed for this round (≤10s left).");

  const existed = (db.predictions || []).find((x) => x.round_id === roundId && x.player_id === playerId);
  if (existed) {
    existed.price_pred = Number(pricePred);
    existed.t = now();
  } else {
    (db.predictions ||= []).push({
      id: id(),
      round_id: roundId,
      player_id: playerId,
      price_pred: Number(pricePred),
      t: now(),
    });
  }

  const who = db.players.find((p) => p.id === playerId)?.username || "anon";
  pushEvent(db, { type: "Predict", text: `Value by "${who}" @ $${Number(pricePred).toFixed(4)} (${r.id.slice(0, 6)})`, rid: roundId });
  await write(db);
  return true;
}

export async function addPredictionDir(playerId, roundId, direction) {
  const db = await read();
  const r = (db.rounds || []).find((x) => x.id === roundId);
  if (!r) throw new Error("Round not found");
  if (r.settled || isSubmitClosed(r)) throw new Error("Submissions are closed for this round (≤10s left).");

  const dir = String(direction || "").toUpperCase();
  if (!["UP", "DOWN", "FLAT"].includes(dir)) throw new Error("Invalid direction");

  const existed = (db.predictions_dir || []).find((x) => x.round_id === roundId && x.player_id === playerId);
  if (existed) {
    existed.direction = dir;
    existed.t = now();
  } else {
    (db.predictions_dir ||= []).push({
      id: id(),
      round_id: roundId,
      player_id: playerId,
      direction: dir,
      t: now(),
    });
  }

  const who = db.players.find((p) => p.id === playerId)?.username || "anon";
  pushEvent(db, { type: "Direction", text: `Direction by "${who}" → ${dir} (${r.id.slice(0, 6)})`, rid: roundId });
  await write(db);
  return true;
}

export async function getPredictionDir(roundId, playerId) {
  const db = await read();
  return (db.predictions_dir || []).find((p) => p.round_id === roundId && p.player_id === playerId) || null;
}

// ---------------- Bet tickets ----------------
/**
 * Create (or return existing) bet ticket
 * @param {Object} p
 * @param {string} p.roundId
 * @param {string} p.playerId
 * @param {string} p.fromAddr
 * @param {number} p.amountUosmo
 * @param {string} p.txhash
 */
export async function createBetTicket({ roundId, playerId, fromAddr, amountUosmo, txhash }) {
  const db = await read();
  const r = (db.rounds || []).find((x) => x.id === roundId);
  if (!r) throw new Error("Round not found");

  // 1) Tolak/ambil tiket yang SUDAH ADA untuk player ini di round ini (idempotent)
  const existedByPlayer = findTicketByRoundAndPlayer(db, roundId, playerId, fromAddr);
  if (existedByPlayer) {
    return { ticket: existedByPlayer, duplicated: true };
  }

  // 2) Masih jaga-jaga de-dupe berdasarkan txhash
  const existedByTx = (db.tickets || []).find((t) => t.txhash === txhash);
  if (existedByTx) {
    return { ticket: existedByTx, duplicated: true };
  }

  const t = {
    id: id(),
    round_id: roundId,
    player_id: playerId || null,
    from: fromAddr,
    stake_uosmo: Number(amountUosmo || 0),
    txhash: String(txhash || ""),
    t: Date.now(),
  };

  (db.tickets ||= []).push(t);

  const amountOsmo = (Number(t.stake_uosmo) / 1e6).toFixed(3);
  const short = String(fromAddr || "").slice(0, 8) + "…" + String(fromAddr || "").slice(-6);
  pushEvent(db, {
    t: t.t,
    type: "Bet",
    text: `Bet attached ${amountOsmo} OSMO by ${short}`,
    rid: roundId,
    meta: { stake_uosmo: t.stake_uosmo, from: fromAddr, txhash: t.txhash },
  });

  await write(db);
  return { ticket: t, duplicated: false };
}

// ---------------- Settlement ----------------
export async function settleRound(roundId) {
  const db = await read();
  const r = (db.rounds || []).find((x) => x.id === roundId);
  if (!r) throw new Error("Round not found");
  if (r.settled) return r;

  let final = NaN;
try {
  const out = await getPriceUSD(r.pair || POOL_TO_PAIR[String(r.pool_id)] || "ATOM");
  final = Number(out?.price);
} catch { }
  if (!Number.isFinite(final)) {
    const out = await getAtomPriceUSD();
    final = Number(out?.price);
  }

  r.price_final = Number.isFinite(final) ? final : null;
  r.settled = true;

  // Direction (toleransi bps)
  const start = Number(r.start_price ?? NaN);
  const epsBps = Number(process.env.FLAT_EPS_BPS || 5);
  const went = directionFromPrices(start, final, epsBps);
  r.direction = went;

  // Value score (match the formula shown in UI)
  const vals = (db.predictions || []).filter((x) => x.round_id === r.id);
  for (const pv of vals) {
    pv.points = scoreValue(pv.price_pred, final);
  }

  // Direction score (+50 if correct, 0 otherwise)
  const dirs = (db.predictions_dir || []).filter((x) => x.round_id === r.id);
  for (const pd of dirs) {
    pd.points = scoreDirectional(pd.direction, r.start_price, final, Number(process.env.FLAT_EPS_BPS || 5));
  }

  pushEvent(db, {
    type: "Settled",
    text: `Settled ${r.id.slice(0, 6)} • pair ${r.pair} • final $${Number(final).toFixed(4)} • went ${went}${went === "FLAT" ? ` (≤${epsBps}bps)` : ""}`,
    rid: r.id,
  });

  // Winner list (directional winners: points > 0)
  const winners = dirs
    .filter((d) => Number(d.points) > 0)
    .map((d) => (db.players || []).find((p) => p.id === d.player_id)?.username || "anon");

  if (winners.length > 0) {
    const names = winners.slice(0, 5).join(", ") + (winners.length > 5 ? ` +${winners.length - 5} more` : "");
    pushEvent(db, { type: "Winner", text: `Winners: ${names}`, rid: r.id });
  } else {
    pushEvent(db, { type: "Winner", text: "No winners this round", rid: r.id });
  }

  // Convert tickets -> bets (LOCKED) so payout can see them
  convertTicketsToBets(db, r.id);

  await write(db);
  await payoutWinners(r); // akan bayar pemenang dari db.bets


  // prune after settlement
  await vacuum({ keepDays: 7, maxEvents: 2000 });
  return r;
}

export async function settleIfNeeded() {
  const db = await read();
  const t = now();
  const expired = (db.rounds || []).filter((r) => !r.settled && new Date(r.end_at).getTime() <= t);
  for (const r of expired) {
    await settleRound(r.id);
  }
  return expired.length;
}

// ---------------- Optional payout (uses db.bets; safe if empty) ----------------
async function payoutWinners(round) {
  if (!ENABLE_PAYOUTS) return 0; // toggle via env

  const db = await read();

  // Tentukan pemenang dari direction prediction (points > 0)
  const dirs = (db.predictions_dir || []).filter((d) => d.round_id === round.id);
  const winnersSet = new Set(dirs.filter((d) => Number(d.points) > 0).map((d) => d.player_id));

  // Ambil bet untuk ronde ini yang bisa dibayar:
  // - status LOCKED (baru) atau WON (retry setelah gagal)
  // - bukan PAID (hindari double pay)
  const bets = (db.bets || []).filter(
    (b) => b.round_id === round.id && (b.status === "LOCKED" || b.status === "WON") && b.status !== "PAID"
  );

  for (const b of bets) {
    // Bukan pemenang ➜ LOST
    if (!winnersSet.has(b.player_id)) {
      b.status = "LOST";
      continue;
    }

    const gross = Math.floor(Number(b.stake_uosmo) * (PAYOUT_MULTIPLIER || 2));
    const fee = Math.floor(gross * (HOUSE_FEE_BP || 0) / 10000);
    const net = Math.max(0, gross - fee);

    try {
      // Hindari double-pay defensif
      if (b.status === "PAID" || b.payout_txhash) continue;

      const memo = `Payout ${String(round.id).slice(0, 6)}`;
      const hash = await sendFromTreasury(b.from, net, memo);

      b.status = "PAID";
      b.payout_uosmo = net;
      b.payout_txhash = hash || null;
      b.paid_at = new Date().toISOString();

      // Log payout terpisah (audit trail)
      (db.payouts ||= []).push({
        id: id(),
        round_id: round.id,
        player_id: b.player_id || null,
        to: b.from,
        amount_uosmo: net,
        txhash: hash || null,
        paid_at: b.paid_at,
      });

      pushEvent(db, {
        type: "Payout",
        text: `Paid ${formatAmount("uosmo", net)} to ${String(b.from || "").slice(0, 8)}… (${round.id.slice(0, 6)})`,
        rid: round.id,
        meta: { to: b.from, net, txhash: hash },
      });

    } catch (e) {
      // Tandai siap retry
      b.status = "WON";
      b.payout_uosmo = net;
      pushEvent(db, {
        type: "PayoutFail",
        text: `Pending payout ${formatAmount("uosmo", net)} to ${String(b.from || "").slice(0, 8)}… (retry)`,
        rid: round.id,
        meta: { to: b.from, net, error: e?.message || String(e) },
      });
    }
  }

  await write(db);
}

// ---------------- Leaderboard ----------------
export async function leaderboard({ days = 7 } = {}) {
  const db = await read();
  const cutoff = now() - Number(days) * 24 * 60 * 60 * 1000;

  const rounds = (db.rounds || []).filter((r) => r.settled && new Date(r.end_at).getTime() >= cutoff);
  const totals = new Map();

  for (const pv of db.predictions || []) {
    const r = rounds.find((x) => x.id === pv.round_id);
    if (!r) continue;
    totals.set(pv.player_id, (totals.get(pv.player_id) || 0) + Number(pv.points ?? 0));
  }
  for (const pd of db.predictions_dir || []) {
    const r = rounds.find((x) => x.id === pd.round_id);
    if (!r) continue;
    totals.set(pd.player_id, (totals.get(pd.player_id) || 0) + Number(pd.points ?? 0));
  }

  const rows = [...totals.entries()].map(([player_id, score]) => {
    const player = (db.players || []).find((p) => p.id === player_id)?.username || "anon";
    return { player_id, username: player, score: Number(score) };
  });

  rows.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
  return rows.slice(0, 100);
}

// ---------------- Events ----------------
export async function listEvents({ hours = 24, limit = 50 } = {}) {
  const db = await read();
  const since = now() - Number(hours) * 60 * 60 * 1000;
  const out = (db.events || [])
    .filter((e) => (e?.t || 0) >= since)
    .sort((a, b) => (b?.t || 0) - (a?.t || 0))
    .slice(0, Number(limit));
  return out;
}

export async function clearEvents({ before = null } = {}) {
  const db = await read();
  if (before != null) {
    const ts = Number(before);
    db.events = (db.events || []).filter((e) => (e?.t || 0) >= ts);
  } else {
    db.events = [];
  }
  await write(db);
  return db.events.length;
}

// ---------------- Last result by username ----------------
export async function lastResultForName(username) {
  const db = await read();
  const name = String(username || "").trim().toLowerCase();
  if (!name) return null;

  const player = (db.players || []).find((p) => (p.username || "").toLowerCase() === name) || null;
  if (!player) return null;

  const myRounds = (db.rounds || [])
    .filter((r) => r.settled)
    .filter((r) => {
      const hasVal = (db.predictions || []).some((x) => x.round_id === r.id && x.player_id === player.id);
      const hasDir = (db.predictions_dir || []).some((x) => x.round_id === r.id && x.player_id === player.id);
      return hasVal || hasDir;
    })
    .sort((a, b) => new Date(b.end_at) - new Date(a.end_at));

  const r = myRounds[0];
  if (!r) return null;

  const pv = (db.predictions || []).find((x) => x.round_id === r.id && x.player_id === player.id);
  const pd = (db.predictions_dir || []).find((x) => x.round_id === r.id && x.player_id === player.id);

  const start = Number(r.start_price ?? NaN);
  const final = Number(r.price_final ?? NaN);
  const epsBps = Number(process.env.FLAT_EPS_BPS || 5);
  const went = directionFromPrices(start, final, epsBps);

  return {
    round_id: r.id,
    pair: r.pair,
    pool_id: r.pool_id,
    start_price: start,
    price_final: Number.isFinite(final) ? final : null,
    direction_actual: went,
    price_pred: pv?.price_pred ?? null,
    price_points: pv?.points ?? 0,
    direction_pred: pd?.direction ?? null,
    direction_points: pd?.points ?? 0,
  };
}

export async function getLastFaucetClaim(addr) {
  const db = await read();
  const rec = (db.faucet_claims || []).find(x => x.addr === addr);
  return rec ? { ...rec } : null;
}

export async function recordFaucetClaim(addr, amount_uosmo, txhash) {
  const db = await read();
  let rec = (db.faucet_claims || []).find(x => x.addr === addr);
  const now = Date.now();
  if (!rec) {
    rec = { addr, last_claim_at: now, count: 1, total_uosmo: Number(amount_uosmo) || 0 };
    (db.faucet_claims ||= []).push(rec);
  } else {
    rec.last_claim_at = now;
    rec.count = (rec.count || 0) + 1;
    rec.total_uosmo = Number(rec.total_uosmo || 0) + Number(amount_uosmo || 0);
  }
  // event log kecil
  pushEvent(db, {
    type: "Faucet",
    text: `Faucet paid ${amount_uosmo} uosmo to ${String(addr).slice(0, 8)}…`,
    meta: { to: addr, amount_uosmo, txhash },
  });
  await write(db);
  return rec;
}

// ---------------- Vacuum ----------------
export async function vacuum({ keepDays = 7, maxEvents = 2000, dropOldSettled = true } = {}) {
  const db = await read();
  const cutoff = now() - Number(keepDays) * 24 * 60 * 60 * 1000;

  db.events = (db.events || []).filter((e) => (e?.t || 0) >= cutoff);
  if (db.events.length > maxEvents) {
    db.events.sort((a, b) => (b?.t || 0) - (a?.t || 0));
    db.events = db.events.slice(0, maxEvents);
  }

  if (dropOldSettled) {
    db.rounds = (db.rounds || []).filter((r) => {
      const t = new Date(r.end_at || 0).getTime();
      return !r.settled || t >= cutoff;
    });
    const alive = new Set((db.rounds || []).map((r) => r.id));
    db.predictions = (db.predictions || []).filter((p) => alive.has(p.round_id));
    db.predictions_dir = (db.predictions_dir || []).filter((p) => alive.has(p.round_id));
    if (db.bets) db.bets = db.bets.filter((b) => alive.has(b.round_id));
  }

  await write(db);
  return { events: db.events.length, rounds: db.rounds.length };
}

function convertTicketsToBets(db, roundId) {
  const tickets = (db.tickets || []).filter(t => t.round_id === roundId);
  if (!tickets.length) return 0;

  db.bets ||= [];
  let created = 0;

  for (const t of tickets) {
    // de-dupe by txhash per round
    const exists = (db.bets || []).some(b => b.round_id === roundId && b.txhash === t.txhash);
    if (exists) continue;

    // --- Find player_id if missing ---
    let pid = t.player_id || null;

    // (a) username === address
    if (!pid) {
      const p = (db.players || []).find(
        x => (x.username || "").toLowerCase() === String(t.from || "").toLowerCase()
      );
      if (p) pid = p.id;
    }

    // (b) ada prediksi di ronde yang username-nya sama dengan address
    if (!pid) {
      const cand = (db.predictions_dir || [])
        .filter(d => d.round_id === roundId)
        .map(d => {
          const u = (db.players || []).find(p => p.id === d.player_id)?.username || "";
          return { player_id: d.player_id, username: u };
        })
        .find(x => x.username.toLowerCase() === String(t.from || "").toLowerCase());
      if (cand) pid = cand.player_id;
    }
    // --- end resolve pid ---

    db.bets.push({
      id: id(),
      round_id: roundId,
      player_id: pid,            // <— sekarang terisi
      from: t.from,
      stake_uosmo: Number(t.stake_uosmo) || 0,
      txhash: t.txhash || null,
      status: "LOCKED",
      created_at: toISO(now()),
    });
    created++;
  }

  if (created > 0) {
    pushEvent(db, {
      type: "Bet",
      text: `Locked ${created} bet(s) from attached tickets`,
      rid: roundId,
      meta: { created },
    });
  }
  return created;
}

// cari tiket milik player (atau fromAddr) pada round tertentu
function findTicketByRoundAndPlayer(db, roundId, playerId, fromAddr) {
  db.tickets ||= [];
  return db.tickets.find(t =>
    t.round_id === roundId &&
    (t.player_id === playerId || (!t.player_id && t.from === fromAddr))
  ) || null;
}


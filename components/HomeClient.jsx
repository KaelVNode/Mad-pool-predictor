"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Timer, Trophy, FlaskConical, ArrowUp, ArrowDown, ExternalLink, Wallet, X, Check, Loader2, Minus, CheckCircle2 } from "lucide-react";
import EventPanel from "@/components/EventPanel";
import { OSMOSIS_TESTNET, BET_MIN_UOSMO, BET_MAX_UOSMO } from "@/lib/config";
import FaucetButton from "@/components/FaucetButton";
import { StargateClient } from "@cosmjs/stargate";
import SocialLinks from "@/components/SocialLinks";
import { formatAmount } from "@/lib/utils";


/* ========= Badges ========= */
function MSBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="https://www.madscientists.io/" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs transition accent-chip" title="Mad Scientists">
        <FlaskConical size={14} />
        <span>Mad Scientists</span>
        <ExternalLink size={12} className="opacity-70" />
      </a>
      <a href="https://x.com/madscientists_x" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs transition accent-chip" title="Follow @madscientists_x">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5">
          <path fill="currentColor" d="M18.244 2H21.5l-7.5 8.57L23.5 22h-7.372l-5.77-6.897L3.5 22H.244l8.214-9.385L.5 2h7.372l5.208 6.224L18.244 2Zm-1.29 18h2.02L7.62 4H5.5l11.454 16Z" />
        </svg>
        <span>@madscientists_x</span>
      </a>
      <a href="https://x.com/madscientists_x/status/1954975519243468808" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs transition accent-chip" title="Theme: Open Build, Everything is an Experiment">
        🧪 Theme: Open Build
      </a>
      <SocialLinks className="hidden md:flex ml-2" />
    </div>
  );
}

/* ========= Splash ========= */
function SplashOverlay({ booting, text = "Loading…" }) {
  return (
    <div className={"fixed inset-0 z-[100] grid place-items-center bg-black/90 backdrop-blur-sm transition-opacity duration-300 " +
      (booting ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
      <div className="flex flex-col items-center gap-4">
        <img src="/images/potion.png" alt="Loading" className="w-20 h-20 animate-spin" style={{ animationDuration: "3s" }} />
        <div className="text-lg font-semibold tracking-wide">Mad Pool Predictor</div>
        <SocialLinks className="hidden md:flex ml-2" />
        <div className="text-xs text-zinc-400">{text}</div>
      </div>
    </div>
  );
}

function ConfirmStakeModal({ open, onClose, onConfirm, amountUosmo = 0, treasury = "", busy = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="w-[92vw] max-w-md rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Confirm Bet Stake</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 hover:bg-white/10 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <p className="opacity-80">You are about to send:</p>
          <div className="font-mono text-base">
            {(Number(amountUosmo) / 1e6).toFixed(3)} <span className="opacity-80">OSMO</span>
          </div>
          <p className="opacity-80">to treasury address:</p>
          <div className="font-mono break-all">{treasury || "—"}</div>
          <p className="text-[11px] opacity-60">Network: Osmosis Testnet • Fee ~220k gas</p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border-2 accent-border px-3 py-2 text-sm accent-hover disabled:opacity-50"
          >
            {busy ? (<><Loader2 className="animate-spin" size={16} /> Processing…</>) : (<><Check size={16} /> Confirm & Pay</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==== Utils ====
function Countdown({ to, startAt, onZero, barHeight = 6, timeClass = "text-sm" }) {
  const toMs = typeof to === "number" ? to : new Date(to).getTime();
  const startMs = startAt ? (typeof startAt === "number" ? startAt : new Date(startAt).getTime()) : null;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [toMs, startMs]);

  const left = Math.max(0, toMs - now);
  const total = startMs ? (toMs - startMs) : 60 * 60 * 1000;
  const progress = startMs
    ? Math.min(1, Math.max(0, (now - startMs) / Math.max(total, 1)))
    : Math.min(1, Math.max(0, 1 - left / Math.max(total, 1)));

  useEffect(() => { if (left <= 0) onZero?.(); }, [left, onZero]);

  const colorClass = progress < 0.66 ? "bg-green-500" : progress < 0.9 ? "bg-yellow-500" : "bg-red-500";

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return hh > 0
      ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      {/* progress bar */}
      <div
        className="w-full bg-zinc-800 rounded-full overflow-hidden"
        style={{ height: barHeight }}   // <— tinggi bar dinamis
      >
        <div
          className={`transition-[width] duration-150 ease-linear ${colorClass}`}
          style={{ width: `${progress * 100}%`, height: "100%" }}   // <— pakai 100% agar ikut barHeight
          aria-hidden
        />
      </div>

      {/* sisa waktu */}
      <div className={`mt-1 ${timeClass} tabular-nums text-right`}>
        <span className={left <= 15000 ? "text-red-400" : left <= 60000 ? "text-yellow-300" : ""}>
          {fmt(left)}
        </span>
      </div>
    </div>
  );
}

function Sparkline({ data = [], height = 40, domainKey }) {
  const points = useMemo(() => {
    // normalisasi data (pakai v/p/price/value)
    let arr = (data || [])
      .map(d => ({ t: Number(d.t), v: Number(d.v ?? d.p ?? d.price ?? d.value) }))
      .filter(d => Number.isFinite(d.t) && Number.isFinite(d.v));

    if (arr.length === 0) return "";

    // kalau cuma 1 titik, duplikat jadi garis datar
    if (arr.length === 1) {
      const { t, v } = arr[0];
      arr = [{ t: t - 60_000, v }, { t, v }]; // 1 menit ke kiri
    }

    const xs = arr.map(d => d.t);
    const ys = arr.map(d => d.v);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = 200, h = height, pad = 2;
    const mapX = t => pad + ((t - minX) / Math.max(maxX - minX, 1)) * (w - pad * 2);
    const mapY = v => h - (pad + ((v - minY) / Math.max(maxY - minY, 1)) * (h - pad * 2));

    return arr.map(d => `${mapX(d.t)},${mapY(d.v)}`).join(" ");
  }, [data, height, domainKey]);

  return (
    <svg width="200" height={height} viewBox={`0 0 200 ${height}`} className="opacity-90 text-[var(--ms-accent)]">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

function PriceSourceBadge({ snap, small = false }) {
  const src = snap?.source, fallback = !!snap?.fallback, stale = !!snap?.stale;
  let text = "Base";
  let cls = `px-2 ${small ? "py-[1px] text-[10px]" : "py-0.5 text-xs"} rounded-full border-2`;
  if (src === "imperator") { text = "Live"; cls += " bg-emerald-500/15 text-emerald-300 border-emerald-500/30"; }
  else if (src === "binance") { text = "Binance"; cls += " bg-cyan-500/15 text-cyan-300 border-cyan-500/30"; }
  else if (src === "coingecko") { text = "CoinGecko"; cls += " bg-amber-500/15 text-amber-300 border-amber-500/30"; }
  else if (src === "stale") { text = "Stale"; cls += " bg-zinc-500/15 text-zinc-300 border-zinc-500/30"; }
  else { text = "Base"; cls += " bg-rose-500/15 text-rose-300 border-rose-500/30"; }
  const tips = [src ? `source: ${src}` : null, fallback ? "fallback" : null, stale ? "cached (≤10m)" : null].filter(Boolean).join(" • ");
  return <span className={cls} title={tips || undefined}>{text}</span>;
}

function MiniChartResult({ result, snap }) {
  if (!result) return null;
  const pred = result.your_pred ?? result.price_pred ?? null;
  const act = result.price_final ?? null;
  if (pred == null || act == null) return null;
  const errPct = Math.abs(pred - act) / (act || 1) * 100;
  const max = Math.max(pred, act);
  const widthPct = (v) => `${(v / (max || 1)) * 100}%`;
  return (
    <div className="bg-black/20 rounded-xl p-4 mt-4 border-2 accent-border">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Your last result</div>
        <PriceSourceBadge snap={snap} small />
      </div>
      <div className="text-xs opacity-70 mb-2">Round {String(result.round_id).slice(0, 6)}</div>
      <div className="space-y-2">
        <div className="text-sm">Predicted: <span className="font-mono">{pred}</span></div>
        <div className="text-sm">Actual: <span className="font-mono">{act}</span></div>
        <div className="w-full bg-white/10 rounded h-2 overflow-hidden">
          <div className="bg-white/60 h-2" style={{ width: widthPct(pred) }} />
        </div>
        <div className="w-full bg-white/10 rounded h-2 overflow-hidden">
          <div className="bg-white h-2" style={{ width: widthPct(act) }} />
        </div>
        <div className="text-sm mt-1">Error: <span className="font-mono">{errPct.toFixed(2)}%</span></div>
      </div>
    </div>
  );
}

function ScoringCard() {
  return (
    <div className="rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-center">
        <h3 className="text-lg font-semibold neon-text text-center">How to Earn Points</h3>
      </div>
      <div className="h-px w-full bg-white/20" />
      <div>
        <span className="px-2 py-1 text-xs font-bold bg-green-700 rounded">Reward</span>
        <pre className="bg-black/50 border border-emerald-400/30 rounded-lg p-2 text-emerald-100 text-xs font-mono whitespace-pre-wrap break-words overflow-hidden">{`If your prediction is correct, you will receive <b>2x your stake</b> as reward..`}</pre>
      </div>
      <div>
        <span className="px-2 py-1 text-xs font-bold bg-green-700 rounded">Directional</span>
        <pre className="bg-black/50 border border-emerald-400/30 rounded-lg p-2 text-emerald-100 text-xs font-mono whitespace-pre-wrap break-words overflow-hidden">{`+50 points if you correctly predict the UP/DOWN direction compared to the start price.`}</pre>
      </div>
      <div className="mt-4">
        <span className="px-2 py-1 text-xs font-bold bg-green-700 rounded">Value</span>
        <p className="mt-1 text-sm">
          <pre className="bg-black/50 border border-emerald-400/30 rounded-lg p-2 text-emerald-100 text-xs font-mono whitespace-pre-wrap break-words overflow-hidden">{`max(0, 100 - (|pred - actual| / actual) × 1000)`}</pre>
        </p>
      </div>
      <p className="text-[11px] opacity-70">Price source: Osmosis (Imperator) → Binance/CoinGecko fallback.</p>
    </div>
  );
}

function LeaderboardCard({ rows = [] }) {
  const fmt = (v) => { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : "0.00"; };
  const medal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "");
  const rowTone = (i) => i === 0 ? "bg-yellow-400/10 text-yellow-200" : i === 1 ? "bg-slate-300/10 text-slate-200" : i === 2 ? "bg-amber-700/15 text-amber-200" : "";
  return (
    <section className="rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold flex items-center gap-2"><Trophy size={18} /> Leaderboard (7d)</h2>
        <span className="text-[11px] opacity-70">updated live</span>
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-emerald-400/20">
        <table className="w-full text-sm">
          <thead className="bg-emerald-400/5 text-emerald-200">
            <tr className="[&>th]:py-2 [&>th]:px-3">
              <th className="w-10 text-left">#</th>
              <th className="text-left">User</th>
              <th className="text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="py-4 px-3 text-center opacity-70">No scores yet.</td></tr>
            ) : rows.map((b, i) => (
              <tr key={`${b.player}-${i}`} className={`border-t accent-hr hover:bg-emerald-400/10 transition-colors ${rowTone(i)}`}>
                <td className="py-2 px-3 tabular-nums font-medium">{i + 1} {medal(i)}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-300/20 ring-1 ring-emerald-400/40 text-[11px] font-semibold" title={b.player}>
                      {(b.player || "A").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{b.player}</span>
                    {Array.isArray(b.badges) && b.badges.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="ml-1 inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] border-emerald-400/40 text-emerald-200">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{fmt(b.total ?? b.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RunnerLine({ className = "" }) {
  return <div className={`ms-runner ${className}`} />;
}

/* ========================= Page ========================= */
export default function HomeClient() {
  const [round, setRound] = useState(null);
  const [price, setPrice] = useState("");
  const [name, setName] = useState(""); // diisi saat connect
  const [msg, setMsg] = useState("");
  const [board, setBoard] = useState([]);
  const [snap, setSnap] = useState(null);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);
  const [predictedModes, setPredictedModes] = useState({ value: false, direction: false });
  const prevRoundIdRef = useRef(null);

  // Keplr state
  const [isKeplrReady, setIsKeplrReady] = useState(false);
  const [connected, setConnected] = useState(false);

  // Treasury addr (server-derived)
  const [treasuryAddr, setTreasuryAddr] = useState("");
  // Balance state
  const [balance, setBalance] = useState(null);
  const [balBusy, setBalBusy] = useState(false);

  // Betting state
  const [stake, setStake] = useState("0.100"); // OSMO
  const [betTicket, setBetTicket] = useState(null);
  const REQUIRE_BET_BEFORE_SUBMIT = true;

  // Splash
  const [booting, setBooting] = useState(true);
  const [bootStage, setBootStage] = useState("Loading…");
  const initialLoadRef = useRef(true);

  const hasTicket = !!betTicket;  // true kalau sudah attach bet di round ini

  // Detect Keplr
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof window !== "undefined" && window.keplr && window.getOfflineSignerAuto) {
        setIsKeplrReady(true);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  // Fetch treasury address (display & payment target)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/treasury", { cache: "no-store" }).then(x => x.json());
        if (r?.address) setTreasuryAddr(r.address);
      } catch { }
    })();
  }, []);

  const load = async () => {
    setBootStage("Fetching data…");

    const r = await fetch("/api/round/current", { cache: "no-store" }).then(x => x.json()).catch(() => null);
    if (r) {
      setRound(r);
      if (prevRoundIdRef.current !== r.id) {
        setPredictedModes({ value: false, direction: false });
        setBetTicket(null);
        prevRoundIdRef.current = r.id;
      }
    }

    const pairFromRound = r?.pair ?? "ATOM";

    const [lbRaw, s, res] = await Promise.all([
      fetch("/api/leaderboard", { cache: "no-store" }).then(x => x.json()).catch(() => []),
      fetch(`/api/price/snapshot?pair=${encodeURIComponent(pairFromRound)}`, { cache: "no-store" }).then(x => x.json()).catch(() => null),
      name ? fetch(`/api/my/last?username=${encodeURIComponent(name)}`, { cache: "no-store" }).then(x => x.json()).catch(() => null) : Promise.resolve(null),
    ]);

    if (Array.isArray(lbRaw)) {
      const mapped = lbRaw.map(x => {
        const username = x.username ?? x.user ?? x.player ?? "anon";
        const scoreNum = typeof x.score === "number" ? x.score : Number(x.total ?? 0);
        const badges = x.badges || (x.first ? ["First Submit"] : []);
        return { player: username, total: Number.isFinite(scoreNum) ? scoreNum : 0, badges };
      });
      setBoard(mapped);
    } else setBoard([]);

    if (s) {
      setSnap({
        current: s.current ?? s.price ?? 0,
        series: Array.isArray(s.series) ? s.series.map(d => ({ t: d.t, v: d.v ?? d.p ?? d.value ?? d.price })) : [],
        source: s.source || null, fallback: !!s.fallback, stale: !!s.stale,
      });
    }

    if (res?.price_final) setLast(res);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try { setBootStage("Fetching data…"); await load(); }
      finally {
        if (alive && initialLoadRef.current) {
          initialLoadRef.current = false;
          setTimeout(() => setBooting(false), 300);
        }
      }
    })();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [name]); // kalau wallet berubah, update last result

  const pair = useMemo(() => round?.pair || "ATOM", [round?.pair]);

  // chartData untuk sparkline
  const chartData = useMemo(() => {
    const arr = Array.isArray(snap?.series) ? snap.series : [];
    const p = Number(snap?.current ?? round?.start_price);

    if (arr.length === 0 && Number.isFinite(p)) {
      const t = Date.now();
      return [{ t: t - 60_000, v: p }, { t, v: p }];
    }
    return arr;
  }, [snap?.series, snap?.current, round?.start_price, round?.id]);

  // ==== Keplr ====
  const connectKeplr = async () => {
    setMsg("");
    try {
      if (!isKeplrReady) { setMsg("Keplr not found"); return; }
      const chainId = OSMOSIS_TESTNET.chainId;
      if (window.keplr.experimentalSuggestChain && OSMOSIS_TESTNET.suggest) {
        try { await window.keplr.experimentalSuggestChain(OSMOSIS_TESTNET.suggest); } catch { }
      }
      await window.keplr.enable(chainId);
      const offlineSigner = await window.getOfflineSignerAuto(chainId);
      const accounts = await offlineSigner.getAccounts();
      const addr = accounts?.[0]?.address;
      if (!addr) throw new Error("No account");
      setName(addr);
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setMsg(e?.message || "Connect failed");
    }
  };

  // ---- Balance fetcher ----
  const fetchBalance = useCallback(async () => {
    if (!name?.startsWith("osmo")) { setBalance(null); return; }
    try {
      setBalBusy(true);
      const c = await StargateClient.connect(OSMOSIS_TESTNET.rpc);
      const b = await c.getBalance(name, "uosmo");
      setBalance(Number(b?.amount || 0) / 1e6);
    } catch (e) {
      console.error("[balance] fetch failed:", e);
    } finally {
      setBalBusy(false);
    }
  }, [name]);

  // helper: konversi stake -> uosmo (integer)
  const uosmoFromStake = () => Math.round(Number(stake) * 1e6);

  // helper: validasi sebelum buka modal/pay
  function validateBeforePay() {
    if (hasTicket) return "Bet already attached for this round.";
    if (!round?.id) return "Round not ready";
    if (!connected) return "Connect Keplr first";
    if (!isKeplrReady) return "Keplr not found";
    if (!treasuryAddr) return "Treasury not ready";

    const minU = Number(BET_MIN_UOSMO || 0);
    const maxU = Number(BET_MAX_UOSMO || Number.MAX_SAFE_INTEGER);
    const uosmo = uosmoFromStake();

    if (!Number.isFinite(uosmo) || uosmo <= 0) return "Invalid stake";
    if (uosmo < minU) return `Min stake ${minU} uosmo`;
    if (uosmo > maxU) return `Max stake ${maxU} uosmo`;
    return null; // valid
  }

  const openConfirm = () => {
    const err = validateBeforePay();
    if (err) { setMsg(err); return; }
    setConfirmOpen(true);
  };


  const confirmAndPay = async () => {
    const err = validateBeforePay();
    if (err) { setMsg(err); return; }

    setModalBusy(true);
    const ok = await payStakeAndAttach();
    setModalBusy(false);

    if (ok) setConfirmOpen(false);  // tutup modal hanya kalau sukses
  };

  // ==== Pay stake & attach bet ====
  async function payStakeAndAttach() {
    setMsg("");

    if (betTicket) {                      // sudah ada tiket
      setMsg("Bet already attached for this round.");
      return true;
    }
    if (!round?.id) { setMsg("Round not ready"); return false; }
    if (!connected) { setMsg("Connect Keplr first"); return false; }
    if (!isKeplrReady) { setMsg("Keplr not found"); return false; }
    if (!treasuryAddr) { setMsg("Treasury not ready"); return false; }

    const minU = Number(BET_MIN_UOSMO || 0);
    const maxU = Number(BET_MAX_UOSMO || Number.MAX_SAFE_INTEGER);
    const uosmo = Math.round(Number(stake) * 1e6);

    if (!Number.isFinite(uosmo) || uosmo <= 0) { setMsg("Invalid stake"); return false; }
    if (uosmo < minU) { setMsg(`Min stake ${minU} uosmo`); return false; }
    if (uosmo > maxU) { setMsg(`Max stake ${maxU} uosmo`); return false; }

    setBusy(true);
    try {
      const chainId = OSMOSIS_TESTNET.chainId;
      const rpc = OSMOSIS_TESTNET.rpc;
      await window.keplr.enable(chainId);
      const { SigningStargateClient } = await import("@cosmjs/stargate");
      const offlineSigner = await window.getOfflineSignerAuto(chainId);
      const accounts = await offlineSigner.getAccounts();
      const from = accounts?.[0]?.address;
      if (!from) throw new Error("No account");

      const client = await SigningStargateClient.connectWithSigner(rpc, offlineSigner);
      const fee = { amount: [{ denom: "uosmo", amount: "0" }], gas: "220000" };
      const res = await client.sendTokens(from, treasuryAddr, [{ denom: "uosmo", amount: String(uosmo) }], fee, "MadPool bet stake");

      const txhash = res?.transactionHash || res?.hash;
      if (!txhash) throw new Error("No txhash");

      const attach = await fetch("/api/bet/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, username: name || from, txhash, from })
      });
      const aj = await attach.json().catch(() => ({}));

      if (attach.status === 409) {        // duplikat untuk ronde ini → anggap sukses
        setBetTicket(aj.ticket);
        setMsg("Bet already attached for this round.");
        return true;
      }
      if (!attach.ok) throw new Error(aj.error || "Attach failed");

      setBetTicket(aj.ticket || { txhash, stake_uosmo: uosmo });
      setMsg(`Bet attached: ${formatAmount("uosmo", aj.ticket?.stake_uosmo ?? uosmo)} • tx ${String(txhash).slice(0, 10)}…`);
      await fetchBalance();
      return true;

    } catch (e) {
      setMsg(e?.message || "Payment failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // ==== Submit predictions ====
  const submitValue = async () => {
    if (busy || predictedModes.value || !round?.id) return;
    if (new Date(round.end_at).getTime() - Date.now() <= 10_000) {
      setMsg("Submissions are closed for this round (last 10 seconds).");
      return;
    }
    if (REQUIRE_BET_BEFORE_SUBMIT && !betTicket) {
      setMsg("Please pay stake & attach bet first.");
      return;
    }

    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, username: name || "anon", pricePred: Number(price) })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(j.error || "Error");
      else { setMsg(`Directional ${direction} submitted!`); setPredictedModes(m => ({ ...m, value: true })); load(); }
    } finally { setBusy(false); }
  };

  const submitDirectional = async (direction) => {
    if (busy || predictedModes.direction || !round?.id) return;
    if (new Date(round.end_at).getTime() - Date.now() <= 10_000) {
      setMsg("Submissions are closed for this round (last 10 seconds).");
      return;
    }
    if (REQUIRE_BET_BEFORE_SUBMIT && !betTicket) {
      setMsg("Please pay stake & attach bet first.");
      return;
    }

    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/predict-directional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, username: name || "anon", direction })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(j.error || "Error");
      else { setMsg(<>Directional {direction} submitted!</>); setPredictedModes(m => ({ ...m, direction: true })); load(); }
    } finally { setBusy(false); }
  };

  if (!round) {
    return (<><SplashOverlay booting={booting} text={bootStage} /><main className="p-8 text-center">Loading…</main></>);
  }

  const endAt = typeof round.end_at === "number" ? round.end_at : new Date(round.end_at).getTime();

  return (
    <>
      <SplashOverlay booting={booting} text={bootStage} />
      <ConfirmStakeModal
        open={confirmOpen}
        onClose={() => !modalBusy && setConfirmOpen(false)}
        onConfirm={confirmAndPay}
        amountUosmo={Math.round(Number(stake) * 1e6) || 0}
        treasury={treasuryAddr}
        busy={modalBusy}
      />
      <main className="container mx-auto p-6 grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <section className="lg:col-span-2 space-y-6">
          {/* Header */}
        </section>
        <div className="lg:col-span-3">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold flex items-center gap-2 neon-text">
                <FlaskConical size={24} /> Mad Pool Predictor
              </h1>
              <a
                className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-1 text-sm accent-hover"
                href="https://github.com/KaelVNode/Mad-pool-predictor"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Chip wallet */}
              {connected && name?.startsWith("osmo") && (
                <span
                  className="inline-flex items-center gap-1 rounded-lg border-2 accent-border px-3 py-1.5 text-sm"
                  title={name}
                >
                  {`${name.slice(0, 8)}…${name.slice(-4)}`}
                </span>
              )}

              {/* Balance chip */}
              {connected && (
                <span
                  className="inline-flex items-center gap-1 rounded-lg border-2 accent-border px-3 py-1.5 text-sm"
                  title="OSMO Balance"
                >
                  Balance: {balance == null ? "…" : `${balance.toFixed(3)} OSMO`}
                  <button
                    type="button"
                    onClick={fetchBalance}
                    disabled={balBusy}
                    className="ml-2 text-xs underline disabled:opacity-50"
                    title="Refresh balance"
                  >
                    {balBusy ? "Refreshing…" : "Refresh"}
                  </button>
                </span>
              )}

              {/* Faucet */}
              {connected && (
                <FaucetButton
                  address={name}
                  className="inline-flex items-center gap-1 rounded-lg border-2 accent-border px-3 py-1.5 text-sm accent-hover"
                />
              )}

              {/* Connect */}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border-2 accent-border px-3 py-1.5 text-sm accent-hover"
                onClick={connectKeplr}
                title="Connect Keplr (Osmosis Testnet)"
              >
                <Wallet size={16} />
                {connected && name?.startsWith("osmo")
                  ? "Connected"
                  : (isKeplrReady ? "Connect Keplr" : "Install Keplr")}
              </button>
            </div>
          </header>
        </div>
        <div className="lg:col-span-3">
          <MSBadge />
        </div>

        <section className="lg:col-span-2 space-y-6">

          {/* Snapshot */}
          {/* Snapshot — no animated bar */}
          <section className="rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-70 flex items-center gap-2">
                  {pair}/USD (current) <PriceSourceBadge snap={snap} />
                </div>
                <div className="text-2xl font-semibold">
                  {snap?.current ? `$${Number(snap.current).toFixed(4)}` : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-70">24h</div>
                <div className="flex justify-end">
                  <Sparkline
                    data={chartData}
                    height={40}
                    domainKey={`${pair}-${round?.id || ""}`}
                  />
                </div>
              </div>
            </div>
          </section>
          {/* Round card */}
          <section className="rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-70 flex items-center gap-2">Round <PriceSourceBadge snap={snap} /></div>
                <div className="text-xl font-semibold">{String(round.id).slice(0, 6)} • Pool #{round.pool_id} ({pair}/USD)</div>
                {round.start_price != null && (
                  <div className="text-xs opacity-70 mt-1">Start price: ${Number(round.start_price).toFixed(4)}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm opacity-50 flex items-center gap-2 justify-end"><Timer size={16} /> Ends in</div>
                <Countdown
                  to={endAt}
                  startAt={round.start_at}
                  onZero={async () => {
                    const cur = round.id;
                    for (let i = 0; i < 12; i++) {
                      await load();
                      if (prevRoundIdRef.current !== cur) break;
                      await new Promise(r => setTimeout(r, 800));
                    }
                  }}
                />
              </div>
            </div>

            <div className="border-t accent-hr my-3 w-full" />

            {/* Stake & ticket */}
            <div className="md:col-span-3">
              <label className="text-sm opacity-80">Stake (OSMO) — pay first, then submit prediction</label>
              <div className="mt-1 flex gap-2 items-center">
                <input
                  className="w-40 rounded-lg border-2 accent-border bg-transparent px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  type="number"
                  step="0.001"
                  min="0"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  disabled={busy || hasTicket}   // ⬅️ tambahkan hasTicket
                />
                <button
                  onClick={openConfirm}
                  disabled={busy || !round?.id || !connected || !treasuryAddr || hasTicket}
                  className={`inline-flex items-center rounded-lg border-2 accent-border px-3 py-2 text-sm accent-hover transition
              ${hasTicket ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={
                    hasTicket
                      ? "Bet already attached for this round"
                      : connected
                        ? "Send OSMO and attach bet"
                        : "Connect Keplr first"
                  }
                >
                  {hasTicket ? (
                    <><CheckCircle2 size={16} className="mr-1" /> Attached</>
                  ) : (
                    <><Wallet size={16} className="mr-1" /> Pay & Attach Bet</>
                  )}
                </button>
                {!betTicket ? (
                  <span className="text-xs px-2 py-1 rounded border border-rose-400/40 text-rose-300">No ticket attached</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded border border-emerald-400/40 text-emerald-300">
                    Ticket: {formatAmount("uosmo", betTicket?.stake_uosmo ?? 0)}
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60 mt-1">
                Min: {formatAmount("uosmo", BET_MIN_UOSMO)} •
                {" "}Max: {formatAmount("uosmo", BET_MAX_UOSMO)} •
                {" "}Treasury: {treasuryAddr ? `${treasuryAddr.slice(0, 8)}…${treasuryAddr.slice(-4)}` : "—"}
              </p>
            </div>

            <div className="border-t accent-hr my-3 w-full" />

            {/* Forms */}
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <div className="md:col-span-2 space-y-3">
                <label className="text-sm opacity-80">Your wallet</label>
                <input
                  className="w-full rounded-lg border-2 accent-border bg-transparent px-3 py-2 text-sm"
                  type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Connect Keplr"
                />

                <label className="text-sm opacity-80">Predict price at T+24h (USD)</label>
                <input
                  className="w-full rounded-lg border-2 accent-border bg-transparent px-3 py-2 text-sm"
                  type="number" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8.8888"
                />

                <button
                  className="inline-flex items-center rounded-lg border-2 accent-border px-3 py-2 text-sm accent-hover disabled:opacity-50 transition"
                  onClick={submitValue}
                  disabled={
                    busy ||
                    predictedModes.value ||
                    !round?.id ||
                    !(Number(price) > 0) ||
                    (REQUIRE_BET_BEFORE_SUBMIT && !betTicket)
                  }
                  title={REQUIRE_BET_BEFORE_SUBMIT && !betTicket ? "Pay & attach bet first" : "Submit price prediction"}
                >
                  Submit Prediction
                </button>
                <div className="mt-2">
                  <div className="inline-flex w-full md:w-auto overflow-hidden rounded-xl border-2 accent-border">
                    <button
                      onClick={() => submitDirectional("UP")}
                      disabled={busy || predictedModes.direction || !round?.id || (REQUIRE_BET_BEFORE_SUBMIT && !betTicket)}
                      title={REQUIRE_BET_BEFORE_SUBMIT && !betTicket ? "Pay & attach bet first" : "Submit UP"}
                      className="flex-1 px-3 py-2 text-sm inline-flex items-center justify-center gap-1 hover:bg-white/10 disabled:opacity-50 border-r-2 accent-border"
                    >
                      <ArrowUp size={16} /> <span className="font-medium">UP</span>
                    </button>

                    <button
                      onClick={() => submitDirectional("DOWN")}
                      disabled={busy || predictedModes.direction || !round?.id || (REQUIRE_BET_BEFORE_SUBMIT && !betTicket)}
                      title={REQUIRE_BET_BEFORE_SUBMIT && !betTicket ? "Pay & attach bet first" : "Submit DOWN"}
                      className="flex-1 px-3 py-2 text-sm inline-flex items-center justify-center gap-1 hover:bg-white/10 disabled:opacity-50 border-r-2 accent-border"
                    >
                      <ArrowDown size={16} /> <span className="font-medium">DOWN</span>
                    </button>

                    <button
                      onClick={() => submitDirectional("FLAT")}
                      disabled={busy || predictedModes.direction || !round?.id || (REQUIRE_BET_BEFORE_SUBMIT && !betTicket)}
                      title={REQUIRE_BET_BEFORE_SUBMIT && !betTicket ? "Pay & attach bet first" : "Submit FLAT"}
                      className="flex-1 px-3 py-2 text-sm inline-flex items-center justify-center gap-1 hover:bg-white/10 disabled:opacity-50"
                    >
                      <Minus size={16} /> <span className="font-medium">FLAT</span>
                    </button>
                  </div>
                </div>
                {/* message area */}
                {msg && (
                  <div
                    className={`mt-2 inline-flex items-center gap-2 text-[13px] ${/(fail|error|invalid|min|max|closed|not)/i.test(String(msg)) ? "text-rose-300" : "text-emerald-300"
                      }`}
                    role="status"
                    aria-live="polite"
                  >
                    {/(fail|error|invalid|min|max|closed|not)/i.test(String(msg)) ? (
                      <X size={16} className="opacity-80" />
                    ) : (
                      <CheckCircle2 size={16} className="opacity-80" />
                    )}
                    <span className="opacity-85">{msg}</span>
                  </div>
                )}

                {/* aturan kecil */}
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
                  One prediction per mode (value & directional) per round. Submissions close last 10s before end. Basic rate limit: 1 per 30s.
                </div>

                {predictedModes.direction && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] border-emerald-400/40 text-emerald-300">
                    <CheckCircle2 size={14} /> Directional submitted
                  </span>
                )}
              </div>

              <ScoringCard />
            </div>

            <MiniChartResult result={last} snap={snap} />
          </section>

          <LeaderboardCard rows={board} />

          <footer className="mt-2 text-center text-xs opacity-100">
            Built for{" "}
            <a className="underline hover:opacity-200" href="https://x.com/madscientists_x/status/1954975519243468808" target="_blank" rel="noopener noreferrer">
              Mad Scientists — Open Build
            </a>. Submit via their Discord ticket. See{" "}
            <a className="underline" href="https://www.madscientists.io/maduniversity" target="_blank" rel="noopener noreferrer">
              Mad University
            </a>.
          </footer>
        </section>

        {/* Right: Event Log */}
        <aside className="lg:col-span-1">
          <EventPanel snap={snap} limit={11} />
        </aside>
      </main >
    </>
  );
}

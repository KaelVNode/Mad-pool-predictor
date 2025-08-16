"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, RefreshCw, Filter } from "lucide-react";

/* ============ helpers ============ */
const FILTERS = [
  { key: "1h",  label: "Last 1h",  hours: 1 },
  { key: "24h", label: "Last 24h", hours: 24 },
  { key: "7d",  label: "Last 7d",  hours: 24 * 7 },
  { key: "all", label: "All",      hours: 0 },
];

function fmtTime(isoOrMs) {
  try {
    const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return String(isoOrMs ?? "");
  }
}

// fallback deteksi type bila field ev.type tidak ada/kurang rapi
function detectType(ev) {
  const t = (ev?.type || "").toString();
  if (t) return t;
  const s = (ev?.text || "").toLowerCase();
  if (s.startsWith("new round")) return "Round";
  if (s.startsWith("start price")) return "Price";
  if (s.startsWith("settled round")) return "Settled";
  if (s.includes("predicted")) return "Direction";
  if (s.includes("player")) return "Player";
  return "Event";
}

function typeClass(type) {
  switch (String(type)) {
    case "Round":     return "text-purple-300";
    case "Price":     return "text-emerald-300";
    case "Settled":   return "text-amber-300";
    case "Direction": return "text-cyan-300";
    case "Player":    return "text-pink-300";
    default:          return "text-white";
  }
}

function badgeClass(type) {
  switch (String(type)) {
    case "Round":     return "border-purple-400/40 text-purple-200";
    case "Price":     return "border-emerald-400/40 text-emerald-200";
    case "Settled":   return "border-amber-400/40 text-amber-200";
    case "Direction": return "border-cyan-400/40 text-cyan-200";
    case "Player":    return "border-pink-400/40 text-pink-200";
    default:          return "border-white/40 text-white";
  }
}

/* ============ component ============ */
export default function EventPanel({
  limit = 10,
  hours = 24,
  snap,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterKey, setFilterKey] = useState(hours === 1 ? "1h" : hours === 0 ? "all" : "24h");
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  // track event yang sudah terlihat + yang perlu di-highlight sekali
  const seenRef = useRef(new Set());      // semua key yang sudah pernah muncul
  const [highlightKeys, setHighlightKeys] = useState(new Set()); // yang lagi highlight

  const activeFilter = useMemo(
    () => FILTERS.find(f => f.key === filterKey) || FILTERS[1],
    [filterKey]
  );

  // bikin key stabil per event
  const makeKey = (ev, i) => `${ev.t ?? ""}::${ev.text ?? ""}::${detectType(ev)}::${i}`;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const hrs = activeFilter.hours;
      const q = new URLSearchParams();
      if (hrs > 0) q.set("hours", String(hrs));
      q.set("limit", String(limit > 0 ? limit : 10));
      const res = await fetch(`/api/events?${q.toString()}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      const arr = Array.isArray(j?.events) ? j.events : Array.isArray(j) ? j : [];

      // deteksi mana yang baru
      const newHighlights = new Set();
      arr.forEach((ev, i) => {
        const k = makeKey(ev, i);
        if (!seenRef.current.has(k)) {
          newHighlights.add(k);
        }
      });

      setRows(arr);

      if (newHighlights.size > 0) {
        // update seen + highlight; hilangkan highlight setelah 2.2s
        const nextSeen = new Set(seenRef.current);
        newHighlights.forEach(k => nextSeen.add(k));
        seenRef.current = nextSeen;

        setHighlightKeys(prev => {
          const next = new Set(prev);
          newHighlights.forEach(k => next.add(k));
          return next;
        });

        setTimeout(() => {
          setHighlightKeys(prev => {
            const next = new Set(prev);
            newHighlights.forEach(k => next.delete(k));
            return next;
          });
        }, 2200);
      }

      // auto scroll top kalau sebelumnya udah di top
      requestAnimationFrame(() => {
        if (boxRef.current && boxRef.current.scrollTop <= 4) {
          boxRef.current.scrollTop = 0;
        }
      });
    } catch (e) {
      setError(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function onClear() {
    if (!confirm("Clear events?")) return;
    try {
      await fetch("/api/events", { method: "DELETE" });
      seenRef.current = new Set();
      setHighlightKeys(new Set());
      await load();
    } catch (e) {
      setError(e?.message || "Failed to clear");
    }
  }

  useEffect(() => { load(); }, [filterKey, limit]);

  useEffect(() => {
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [filterKey, limit]);

  return (
    <aside className="rounded-2xl border-2 accent-border bg-[var(--ms-card)] neon-glow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-lg neon-text">Event Log</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="appearance-none bg-transparent border-2 accent-border rounded-lg px-3 py-1 pr-8 text-sm accent-hover"
              value={filterKey}
              onChange={e => setFilterKey(e.target.value)}
            >
              {FILTERS.map(f => (
                <option key={f.key} value={f.key} className="bg-black">
                  {f.label}
                </option>
              ))}
            </select>
            <Filter className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 border-2 accent-border rounded-lg px-2 py-1 text-sm accent-hover disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 border-2 accent-border rounded-lg px-2 py-1 text-sm accent-hover"
            title="Clear all events"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 mb-2 border border-red-500/40 rounded p-2 bg-red-500/5">
          {error}
        </div>
      )}

      <div
        ref={boxRef}
        className="max-h-[70vh] overflow-auto space-y-2 pr-1
                   [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
      >
        {rows.length === 0 ? (
          <div className="text-sm opacity-70">{loading ? "Loading…" : "No events yet."}</div>
        ) : (
          rows.map((ev, i) => {
            const ty = detectType(ev);
            const tStr = fmtTime(ev.t);
            const key = makeKey(ev, i);
            const isNew = highlightKeys.has(key);

            return (
              <div
                key={key}
                className={[
                  "rounded-xl border accent-hr bg-black/30 p-2 transition",
                  "border-l-2 accent-border",
                  "event-enter",
                  isNew ? "event-highlight" : ""
                ].join(" ")}
              >
                <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                  <span className="font-mono">{tStr}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-[1px] rounded-full border ${badgeClass(ty)}`}>
                    {ty}
                  </span>
                </div>
                <div className={`text-sm leading-snug ${typeClass(ty)}`}>{ev.text}</div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

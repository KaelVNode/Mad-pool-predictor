"use client";

import { useEffect, useMemo, useState } from "react";

// Komponen kartu ronde dengan badge pair + countdown
export default function RoundCard(props) {
  // kompatibel dengan prop lama/baru
  const r = props.round || props.r || {};
  const startAt = useMemo(() => new Date(r.start_at || Date.now()), [r.start_at]);
  const endAt = useMemo(() => new Date(r.end_at || Date.now()), [r.end_at]);

  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const leftMs = Math.max(0, endAt.getTime() - nowTs);
  const left = leftMs / 1000;
  const fmt = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const pair = r?.pair || ({ "1":"ATOM","2":"BTC","3":"ETH","4":"OSMO" }[String(r?.pool_id)] || "ATOM");

  return (
    <div className="card rounded-xl border p-4 shadow-sm">
      <div className="mb-2 flex items-center">
        <h3 className="text-lg font-semibold">
          Round {r?.id ? String(r.id).slice(0, 6) : "?"}
        </h3>
        {pair ? (
          <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
            {pair}
          </span>
        ) : null}
        <div className="ml-auto text-sm text-gray-500">
          {Number.isFinite(left) ? fmt(left) : "00:00:00"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-gray-50 p-3">
          <div className="text-gray-500">Start</div>
          <div className="font-medium">
            {r?.start_price != null ? `$${Number(r.start_price).toFixed(4)}` : "-"}
          </div>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <div className="text-gray-500">Ends</div>
          <div className="font-medium">
            {endAt.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {r?.settled ? (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-sm">
          <div className="text-gray-500">Final</div>
          <div className="font-semibold">
            {r?.price_final != null ? `$${Number(r.price_final).toFixed(4)}` : "-"}{" "}
            <span className="ml-2 inline-block rounded px-2 py-0.5 text-xs">
              {r?.direction || "FLAT"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

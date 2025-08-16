// components/ScoringCard.jsx
export default function ScoringCard() {
  return (
    <div className="card">
      <div className="score-card">
        <div className="score-title">Scoring</div>
        <ul className="score-list">
          <li>
            <span className="k">Value:</span>
            <span>max(0, 100 − |pred − actual| × 10)</span>
            <span className="desc block">
              {" "}
              (error absolut dikali 10, bukan persentase)
            </span>
          </li>
          <li>
            <span className="k">Directional:</span>
            <span>+50 points jika menebak arah (UP/DOWN) vs </span>
            <span className="k">start price</span>.
          </li>
        </ul>
        <div className="src-note">
          Price source: Osmosis (Imperator) ▸ Binance/CoinGecko fallback.
        </div>
      </div>
    </div>
  );
}

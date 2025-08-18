# Mad Pool Predictor

A tiny price–prediction game for crypto pairs with on‑chain style payouts on **Osmosis Testnet**.  
Rounds rotate through a configurable list of symbols. Live prices come from **Binance** (primary) with **CoinGecko** as fallback. Players attach a small OSMO stake, submit *directional* (UP/DOWN/FLAT) and/or *value* predictions, and scores are settled automatically.

---

## Features

- **Live price source**: Binance → CoinGecko fallback (unified format).
- **Configurable pairs** via `PAIRS=ATOM,BTC,ETH,...` in env.
- **Anti-repeat** pair selection (won’t pick the last 1–2 pairs again).
- **Fast rounds**: min/max duration from env (e.g. 1 minute for testing).
- **Two scoring modes**:  
  - *Directional*: +50 if direction matches (UP/DOWN/FLAT) with tolerance `FLAT_EPS_BPS`.  
  - *Value*: `max(0, 100 - (|pred-actual|/actual) × 1000)`.
- **Stake & payout** (optional): 2× payout from treasury with house fee (bps).
- **Faucet** (optional) to seed test wallets.
- **Single-file datastore** (`data/store.json`) with resilient writes.
- **Clean UI** with Keplr connect, progress bar, sparkline, and event log.

---

## Requirements

- **Node.js 18+** (built‑in `fetch` is required; do not install `node-fetch`).
- Yarn or npm.
- A funded **Osmosis Testnet** treasury wallet if you enable payouts.

---

## Quick Start

1) **Clone & install**
```bash
git clone <your-fork-or-repo-url> mad-pool-predictor
cd mad-pool-predictor
npm i   # or: yarn
```

2) **Create `.env.local`** (example)
```ini
# --- Treasury (Osmosis testnet) ---
TREASURY_ADDR=osmo1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TREASURY_MNEMONIC="your twelve or twenty-four words here"

# --- Price providers ---
COINGECKO_API_KEY=your-cg-key-optional
COINGECKO_BASE=https://api.coingecko.com/api/v3

# --- Game toggles ---
ENABLE_PAYOUTS=true
PAYOUT_MULTIPLIER=2
HOUSE_FEE_BP=0

ENABLE_FAUCET=true
FAUCET_AMOUNT_UOSMO=200000      # 0.2 OSMO
FAUCET_COOLDOWN_MS=86400000     # 24h

# --- Scoring tolerance ---
# 0 = any small delta is UP/DOWN; 5 = FLAT if |Δ| <= 5 bps
FLAT_EPS_BPS=0

# --- Round duration (minutes) ---
ROUND_MIN_MIN=1
ROUND_MIN_MAX=1

# --- Available pairs for rotation ---
PAIRS=ATOM,BTC,ETH,SOL,BNB,XRP,ADA,DOGE

# --- Client ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3) **Run**
```bash
npm run dev
# open http://localhost:3000
```

> **Tip:** For clean testing, delete `data/store.json` before starting to reset rounds and history.

---

## How It Works

### Price pipeline
`lib/price.js`
- Tries **Binance** first (`/api/v3/ticker/price` and `/api/v3/klines?interval=5m&limit=288`).
- Falls back to **CoinGecko** (`/simple/price` and `market_chart/range`).
- Returns a unified shape:
```ts
{ price: number|null, series: Array<{t:number,v:number}>, source: "binance"|"coingecko"|"stale", fallback: boolean, stale: boolean }
```
- If the series is empty but a `price` is present, the `/api/price/snapshot` route injects **two points** (flat line) so the sparkline always renders.

### Rounds
`lib/db.js`
- Duration randomly chosen between `ROUND_MIN_MIN..ROUND_MIN_MAX` minutes.
- Pair rotation reads `PAIRS` from env and avoids picking the last 1–2 pairs again.
- Start price = latest `getPriceUSD(pair)` when the round is created.
- **Submission lock**: last **10s** before `end_at` (server‑enforced).
- Settlement:
  - Final price = current `getPriceUSD(pair)` at/after expiry.
  - Direction = `directionFromPrices(start, final, FLAT_EPS_BPS)`.
  - Value points use the formula shown above.

> **Important:** Make sure the random pick uses the *filtered* candidate list. In `createRound` the selection should be:
```diff
- const pair = PAIR_LIST[Math.floor(Math.random() * PAIR_LIST.length)] || "ATOM";
+ const pair = candidates[Math.floor(Math.random() * candidates.length)] || "ATOM";
```

### Scoring details
- **Directional**: `+50` if your `UP/DOWN/FLAT` matches the actual direction.  
  `FLAT_EPS_BPS=0` means any non‑zero move is UP/DOWN; increase it to allow tiny moves to count as FLAT.
- **Value**: `scoreValue(pred, actual)` = `max(0, 100 - (|pred-actual|/actual) × 1000)`.

### Bets, Tickets & Payouts
- Users send OSMO to `TREASURY_ADDR` (Keplr prompt). The app then calls `/api/bet/ticket` to **attach** the tx as a bet ticket for the current round.
- On settlement, tickets are converted to **LOCKED bets**. Winners receive `stake × PAYOUT_MULTIPLIER − fee` from the treasury (`sendFromTreasury`).
- Set `ENABLE_PAYOUTS=false` to disable transfers entirely (safe in dev).

### Faucet
- Optional faucet to fund test wallets. Controlled by:
  - `ENABLE_FAUCET`, `FAUCET_AMOUNT_UOSMO`, `FAUCET_COOLDOWN_MS`.
- Writes claim record to `data/store.json` for simple rate‑limiting.

---

## Public API (server)

- `GET /api/round/current` – return the active round (starts one if none).
- `POST /api/predict` – body: `{ roundId, username, pricePred }`.
- `POST /api/predict-directional` – body: `{ roundId, username, direction }` with direction in `["UP","DOWN","FLAT"]`.
- `GET /api/price/snapshot?pair=ATOM` – returns unified `{ price, series, source, fallback, stale }`.
- `GET /api/leaderboard` – top scores (7d).
- `GET /api/my/last?username=...` – your last settled result.
- `POST /api/bet/ticket` – attach a bet ticket after sending OSMO (expects `{ roundId, username, txhash, from }`).
- `GET /api/treasury` – the treasury address.
- (Optional) `POST /api/faucet` – if included in your project.

> All routes are **no‑cache** to ensure fresh state in the client.

---

## Client (high level)

- **HomeClient** polls `/api/round/current` and `/api/price/snapshot` every ~10s.
- Snapshot card shows the current price, source badge, and 24h sparkline (flat line injected if needed).
- **Stake gating**: by default, users must *pay & attach* a bet before they can submit predictions.
- **Countdown**: colored progress bar with 10s submission lock near the end.
- **Event panel** shows round creation, starts, settlements, winners, payouts.

---

## Testing Tips

- Set `ROUND_MIN_MIN=1` and `ROUND_MIN_MAX=1` to test quick rounds.
- Set `FLAT_EPS_BPS=0` if you want “any tiny move” to count as UP/DOWN (no FLAT).
- To reset everything: **stop dev server**, delete `data/store.json`, then start again.
- If you changed `PAIRS`, also delete `data/store.json` so the new rotation starts cleanly.

---

## Troubleshooting

- **`Cannot resolve 'node-fetch'`**  
  Use **Node 18+** which provides global `fetch`. Remove any `import 'node-fetch'` lines.

- **Sparkline looks flat**  
  That’s expected when the fallback injects two identical points to ensure the chart renders; live series will appear once klines are fetched.

- **“Submissions are closed…”**  
  The server blocks new submissions during the last **10s** of each round.

- **“Winners but no payout”**  
  Ensure:
  - `ENABLE_PAYOUTS=true`,
  - Treasury mnemonic is correct & funded (on **Osmosis Testnet**),
  - `HOUSE_FEE_BP` is set as desired,
  - Your RPC/network in the client is reachable.

- **Windows file locks**  
  Writes are done with a temp file + `rename` retry and final fallback to reduce `EBUSY` issues.

---

## Security & Notes

- This is **demo/experimental** code. Do not use with real funds.
- Treasury mnemonic in `.env.local` is for **local testing** only.
- No warranties. Audit before deploying anywhere public.

---

## License

MIT — see `LICENSE` (or choose your preferred license).

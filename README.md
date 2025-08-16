# Mad Pool Predictor

A prediction game where players guess the future ATOM/USD price at T+24h. The system fetches live prices from multiple sources and manages game rounds automatically.

## Features

- **Live Price Feed** — Pulls from Imperator, Binance, and CoinGecko (with fallback and caching).
- **Automatic Rounds** — Starts and settles rounds automatically.
- **Leaderboard** — Ranks players based on prediction accuracy.
- **Event Log** — Displays the last 10 game events.
- **Responsive UI** — Built with Tailwind CSS for desktop and mobile.

## Requirements

- Node.js 18+
- npm or yarn
- Git

## Installation

```bash
git clone https://github.com/KaelVNode/Mad-pool-predictor.git
cd Mad-pool-predictor
npm install
```

## Running the App

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

You can deploy to any Node.js-friendly hosting such as:
- Vercel
- Railway
- Render

## 📡 API Endpoints
- **`POST /api/predict-directional`** → Submit price direction prediction.
- **`POST /api/predict-numeric`** → Submit numeric price prediction.
- **`GET /api/round/current`** → Get current round & leaderboard.
- **`GET /api/events`** → Get latest event list.

## 📜 License
MIT License © 2025 [KaelVNode](https://github.com/KaelVNode)

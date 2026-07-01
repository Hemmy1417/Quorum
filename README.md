# Quorum

A five-agent AI investment committee that runs on-chain on GenLayer Studionet.

Pick an asset, choose your risk tolerance, hit convene. Five agents pull live price data, argue, vote, and one of them (the Risk Manager) can veto the whole thing. The Chair writes the final call to chain. It's paper trading — every wallet starts with 100,000 fictional USDT and positions settle against the same price the committee saw.

- Live: [quorum-v1.vercel.app](https://quorum-v1.vercel.app)
- Contract: [`0xe743f116b928d8c3405d2A442e1Bf61746CA3C38`](https://studio.genlayer.com/?import-contract=0xe743f116b928d8c3405d2A442e1Bf61746CA3C38)
- Chain: GenLayer Studionet (id `61999`)

## The agents

| | Role | Brief |
|--|--|--|
| 📈 | Technical Analyst | Reads price action — trend, momentum, support, resistance. |
| 📰 | News Analyst | Macro, sentiment, ETF flow, anything narrative-driven. |
| 🧮 | Quant Analyst | Asks whether price is stretched and what regime we're in. |
| 🛡️ | Risk Manager | Holds the veto. Can freeze a trade no matter how the vote went. |
| ⚖️ | Execution Agent (Chair) | Sums it all up and calls the final decision. |

The three analysts go first, in isolation. Then the Risk Manager looks at the vote tally and position size and decides whether to greenlight or veto. If cleared, the Chair writes a binding verdict. All five agents run inside the contract, not on a backend somewhere.

## How a session runs

1. `gl.nondet.web.render` pulls live prices from CoinGecko
2. Three analyst agents each return a structured vote (BUY / HOLD / SELL + confidence)
3. The Risk Manager audits the average confidence against the requested position size
4. The Chair synthesises everything into a final call
5. The session, the debate, and any resulting paper trade are written to chain

Each agent call is wrapped in `gl.eq_principle.prompt_comparative`. That's how the validator network reaches agreement on non-deterministic LLM output — every validator re-runs the call and the principle decides whether their answers are close enough. End-to-end a session takes 1–3 minutes on Studionet.

## What lives where

```
contracts/
  quorom.py              The contract. Five agents, paper portfolio, leaderboard.

api/
  src/index.ts           Express + Firebase Admin on Railway.
  src/routes/auth.ts     EIP-191 signature → Firebase custom token.
  src/routes/wallet.ts   Encrypted custodial wallet for email users.

web/
  app/                   Next.js 16 App Router pages.
  lib/quorum.ts          Read/write helpers (checksums addresses before reads).
  lib/wallet.tsx         Provider for both auth paths.
  app/globals.css        Design tokens.
```

## Auth

Two ways in:

- **Bring your own wallet** — MetaMask or any EIP-6963 provider. You sign a message, the API issues a Firebase custom token, you're in. We add Studionet to the wallet automatically if it's missing.
- **Email + password** — Firebase auth, the API generates a wallet for you and keeps the key encrypted (AES-256-CBC). You can export the key any time from the Compliance page.

Either way you end up with the same `genlayer-js` client and the same on-chain identity.

## Running it locally

```bash
# frontend
cd web
cp .env.local.example .env.local   # fill in the values from below
npm install
npm run dev                        # localhost:3000

# api (only needed if you want the email auth path)
cd api
npm install
npm run dev                        # localhost:3001
```

`.env.local` for the web app:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe743f116b928d8c3405d2A442e1Bf61746CA3C38
NEXT_PUBLIC_API_URL=https://quorum-production-0043.up.railway.app
NEXT_PUBLIC_NETWORK=studionet

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

`.env` for the API:

```
PORT=3001
FRONTEND_URL=https://your-vercel-url.vercel.app
ENCRYPTION_SECRET=<32-byte hex>
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

## Deploying

- **Contract** — paste `contracts/quorom.py` into the GenLayer Studio editor and deploy. Drop the resulting address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- **API** — Railway, root directory `api/`. Set the env vars above. Once the frontend is up, put the Vercel URL into `FRONTEND_URL` so CORS lets it through.
- **Frontend** — Vercel, root directory `web/`. Copy every `NEXT_PUBLIC_*` var into the project settings.

## What's on-chain and what isn't

| | Where |
|--|--|
| Price fetch during a session | on-chain (`gl.nondet.web.render`) |
| Each agent's LLM call | on-chain, inside `eq_principle` |
| Sessions, portfolios, leaderboard | on-chain (`TreeMap`) |
| Live tickers on the landing page | off-chain (CoinGecko, client-side, cosmetic) |
| Email auth + custodial key storage | off-chain (Firebase + Railway) |
| The paper trades themselves | on-chain |

## Paper trading

This is a sandbox. Every wallet starts with 100,000 fictional USDT. Positions settle against the price the committee fetched. No real funds are ever moved, and every page that talks about trades says so.

## Stack

- GenLayer (`py-genlayer 0.2.16`)
- `genlayer-js` for reads, writes, and receipt polling
- Next.js 16 (Turbopack), React 19, Tailwind 4, TypeScript
- Firebase Auth, Firebase Admin on Railway
- ethers v6 for signing and key derivation
- Vercel for hosting

## Other things we built on GenLayer

- [Credence](https://credencev2.vercel.app) — on-chain identity verification
- [Aegis](https://aegis-safu.vercel.app) — AI-arbitrated freelance escrow
- [Delphi](https://delphi-markets.vercel.app) — AI-resolved prediction markets
- [Apex](https://apex-wan.vercel.app) — AI Game Master tower-climb game

Quorum is the first one of these where the contract runs multiple agents and reconciles them all through the validator network in a single transaction.

## License

MIT.

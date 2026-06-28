# QUORUM

> **The Autonomous AI Investment Committee.**
> Five specialized AI agents debate, vote, and reach a transparent paper-trading decision — fully on-chain, fully auditable, no oracle, no server.

Live: [quorum.vercel.app](https://quorum.vercel.app) · Contract: [`0x69f8212a897Ae6FB9aD9a7C1AB87d1dF0609B9FA`](https://studio.genlayer.com/?import-contract=0x69f8212a897Ae6FB9aD9a7C1AB87d1dF0609B9FA) · GenLayer Studionet (chain `61999`)

---

## What it is

QUORUM is a GenLayer Intelligent Contract that runs a five-agent AI committee on every trade request. Each agent has a role and a personality. They run in sequence inside the contract, their outputs are reconciled by GenLayer's validator network via the equivalence principle, and the final verdict — together with the full debate transcript — is written to chain.

There is no off-chain oracle for prices. There is no centralized backend deciding outcomes. The AI deliberation **is** the contract.

## Why it matters

Most "AI agent" demos run the LLM off-chain and write the result to a smart contract, taking on the user as a trust customer. GenLayer makes that pattern obsolete: the LLM calls themselves run inside the contract, every validator re-runs them, and the equivalence principle is what closes consensus. QUORUM is the first thing we've built that actually leans on this — five sequential `eq_principle.prompt_comparative` calls per session, on real live market data fetched on-chain.

The veto pattern goes one step further. Most multi-agent demos average their votes; QUORUM has a hard-coded Risk Manager role that can override the majority based on policy. That's a real governance idea, not just chrome.

## The Committee

| | Agent | Keywords | Personality |
|--|--|--|--|
| 📈 | **Technical Analyst** | RSI · MACD · EMA · S/R | Chart purist — structure over noise, opens the case |
| 📰 | **News Analyst** | sentiment · ETF · macro | Momentum chaser — reads the room, trusts the tape |
| 🧮 | **Quant Analyst** | probability · statistics | Cold and mathematical — fades stretched extremes |
| 🛡️ | **Risk Manager** | drawdown · volatility · exposure | Paranoid guardian — holds the veto, protects capital |
| ⚖️ | **Execution Agent** (Chair) | synthesis · decision | The chairman — weighs the room, calls the verdict |

The Risk Manager holds an absolute veto. If they freeze the session, no trade executes regardless of the analysts' vote.

## How a session runs

```
       ┌───────────────────────────────────────────────────────────┐
       │ 1.  Market Scan      gl.nondet.web.render (CoinGecko)     │
       │     ↓                                                     │
       │ 2.  Debate           Technical → News → Quant analysts    │
       │     ↓                each agent: prompt_comparative       │
       │ 3.  Voting           BUY / HOLD / SELL with confidence    │
       │     ↓                                                     │
       │ 4.  Risk Review      Risk Manager audits + can VETO       │
       │     ↓                                                     │
       │ 5.  Execution        Chair synthesises and writes verdict │
       └───────────────────────────────────────────────────────────┘
```

Every step is wrapped in `gl.eq_principle.prompt_comparative` so the validator network reconciles the non-deterministic outputs before consensus closes. End-to-end settlement takes 1–3 minutes on Studionet.

## Architecture

```
contracts/quorom.py         GenLayer Intelligent Contract (Python, v0.2.16)
   ├─ TreeMap session storage
   ├─ Paper-trading portfolio per address ($100k starting equity)
   ├─ Leaderboard, history, per-asset stats
   └─ Five eq_principle wrappers, one per agent

api/                        Express + Firebase Admin SDK on Railway
   ├─ POST /auth/wallet     EIP-191 signature → custom token mint
   ├─ POST /wallet/create   server-custodied wallet for email users
   ├─ POST /wallet/export   AES-256-CBC encrypted key export
   └─ CORS allowlist        localhost + Vercel origin

web/                        Next.js 16 App Router (Turbopack), React 19
   ├─ /                     Landing — live BTC/ETH/SOL ticker, 5-step explainer
   ├─ /console              Committee Ballot, Risk Review, Debate Timeline, Trade Config
   ├─ /chamber              Past session deep-dives with full debate transcripts
   ├─ /portfolio            Equity, open positions, win/loss, trade history
   ├─ /history              Compact list of every session, grouped by asset
   └─ /compliance           Protocol stats, contract metadata, leaderboard, key export
```

## Auth — both paths supported

- **Injected wallet** (MetaMask, etc.) — EIP-6963 discovery, EIP-191 signature handed to the API for a Firebase custom token. We add Studionet to the user's wallet on the fly if it isn't already configured.
- **Email + password** — Firebase email/password sign-up; the API mints a fresh wallet, stores the private key AES-256-CBC encrypted server-side, and exposes a one-click export so users can take custody anytime.

Both paths produce the same on-chain address shape and the same `client` from `genlayer-js`.

## Project structure

```
Quorum/
├── contracts/
│   └── quorom.py              The Intelligent Contract
├── api/
│   └── src/
│       ├── index.ts           Express server + CORS
│       ├── routes/auth.ts     Wallet signature → Firebase custom token
│       ├── routes/wallet.ts   Create / export encrypted custodial wallet
│       └── lib/firebaseAdmin.ts
└── web/
    ├── app/                   Next.js App Router pages
    ├── components/            (none required — kept colocated)
    ├── lib/
    │   ├── config.ts          Chain config + env wiring
    │   ├── quorum.ts          Contract read/write helpers (checksums addresses)
    │   ├── wallet.tsx         WalletProvider — both auth paths
    │   ├── firebase.ts        Firebase client init
    │   └── types.ts           Session, Portfolio, Trade types
    └── app/globals.css        Design system (navy canvas, amber accent, Instrument Serif)
```

## Local development

```bash
# 1. Web app
cd web
cp .env.local.example .env.local   # then fill in the values below
npm install
npm run dev                        # http://localhost:3000

# 2. Custody API (optional — only needed for email auth path)
cd api
npm install
npm run dev                        # http://localhost:3001
```

### `.env.local` (web)

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x69f8212a897Ae6FB9aD9a7C1AB87d1dF0609B9FA
NEXT_PUBLIC_API_URL=https://quorum-production-0043.up.railway.app
NEXT_PUBLIC_NETWORK=studionet

NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

### `.env` (api)

```bash
PORT=3001
FRONTEND_URL=https://your-vercel-url.vercel.app
ENCRYPTION_SECRET=<32-byte hex>
FIREBASE_PROJECT_ID=…
FIREBASE_CLIENT_EMAIL=…
FIREBASE_PRIVATE_KEY=…
```

## Deployment

- **Contract** — deploy `contracts/quorom.py` via the GenLayer Studio UI. Copy the contract address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- **API** — Railway, root directory `api/`, no special build config needed. Set the env vars above. Add the production Vercel URL to `FRONTEND_URL` after the frontend deploys.
- **Frontend** — Vercel, root directory `web/`, framework auto-detected as Next.js. Copy every `NEXT_PUBLIC_*` env var into Vercel's project settings.

## What's on-chain vs off-chain

| | Where | Why |
|--|--|--|
| Market price fetch | **on-chain** (`gl.nondet.web.render`) | No oracle dependency |
| Each agent's LLM call | **on-chain** (`gl.nondet.exec_prompt` inside `eq_principle`) | Validator-reconciled |
| Sessions, portfolios, leaderboard | **on-chain** (`TreeMap` state) | Immutable, auditable |
| Live ticker on landing page | off-chain (CoinGecko, client-side) | UX only — no money depends on it |
| Email auth + custodial wallet | off-chain (Firebase + Railway) | Removes onboarding friction |
| Paper trading | on-chain | Real settlement against fetched price; **no real funds, ever** |

## Paper trading only

QUORUM is a paper-trading sandbox. Every wallet starts with 100,000 USDT of fictional capital. Positions are tracked on-chain against the price the committee fetched at the time of the vote. **No real funds are ever moved.** This is signposted on every page that mentions trades.

## Tech stack

- **GenLayer** Intelligent Contracts (Python, `py-genlayer 0.2.16`)
- **genlayer-js** for client-side reads, writes, and receipt polling
- **Next.js 16** App Router with Turbopack
- **React 19**, TypeScript, Tailwind v4
- **Firebase** Auth (email/password + custom tokens)
- **Railway** for the custody API
- **ethers v6** for EIP-191 signing and key derivation
- **Vercel** for the frontend

## Sibling projects on GenLayer

Built by the same team:

- [Credence](https://credencev2.vercel.app) — on-chain identity verification
- [Aegis](https://aegis-safu.vercel.app) — AI-arbitrated freelance escrow
- [Delphi](https://delphi-markets.vercel.app) — AI-resolved prediction markets
- [Apex](https://apex-wan.vercel.app) — AI Game Master tower-climb game

Each one uses GenLayer for a different domain. QUORUM is the first to use the validator network for **multi-agent debate**, not just a single LLM judgement.

## License

MIT.

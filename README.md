# ListingDesk — Telegraph Hackathon Season II, Mission 01 (Exchange)

An autonomous listings desk. Give it a token contract address; it buys
ranked intelligence through **Telegraph** — contract audit, sanctions screen,
holder concentration, price, liquidity depth, fraud risk, gas — and returns a
**signed listing risk memo** (`LIST` / `LIST_WITH_CONDITIONS` / `DO_NOT_LIST`)
with a cost line at the bottom.

Built for **Telegraph Hackathon Season II** (1 Nov – 1 Dec 2026), track
**Apps & Agents**, **Mission 01 — Exchange**: *"Check a token listing,
counterparty, or market-integrity question, with evidence from intelligence
bought through Telegraph."*

## What it does (one run)

```
$ node src/cli.js check --token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --chain base

Token     0x8335…02913 (base) — USDC
Verdict   LIST_WITH_CONDITIONS — 65/100
Transport direct (live miners, $0, NOT a purchase)
Cost      $0.0000 (0 paid asks)
```

Each run buys **8 intelligence checks in parallel** (one per intent, one per
miner ask in paid mode):

| # | Check | Intent | Miner (live catalog) |
|---|---|---|---|
| 1 | Contract audit | `SMART_CONTRACT_AUDIT_GENERAL` | GoPlus Security (id 200001, 804 served) |
| 2 | Sanctions screen | `SANCTIONS_SCREENING_MATCH_GENERAL` | OFAC SDN Entity Screen (id 78021, 952 served) |
| 3 | Holder count | `TOKEN_HOLDER_COUNT_GENERAL` | TxLens (id 9002, 2,917 served) |
| 4 | Holder count (cross-check) | `TOKEN_HOLDER_COUNT_GENERAL` | ChainWire (id 7302) |
| 5 | Price | `CRYPTO_PRICE_USD` | TxLens (id 9002) |
| 6 | Liquidity depth | `LIQUIDITY_DEPTH_VERIFY_GENERAL` | VerifyWire (id 7373) |
| 7 | Fraud risk | `FRAUD_RISK_GENERAL` | Telegraph Sentinel (id 501) |
| 8 | Gas (context) | `GAS_PRICE_GENERAL` | TxLens (id 9002) |

Scoring is deterministic and printed with the memo: honeypot = −60, sanctions
match = −60, top-10 holders > 50% = −20, mintable/proxy/taxes = warns, and so
on. See `src/score.js` — no judgement hidden in prose.

## Transports (how Telegraph is paid)

| Transport | Cost | What it is |
|---|---|---|
| `direct` (default) | $0 | Calls the **live miners' public endpoints**. Real answers from real miners, but **NOT a Telegraph purchase**. For development and demos only. The memo says so on its face. |
| `apikey` ✅ recommended | ~$0.01/ask | **Paid.** Asks the Telegraph node through your Anjoman account: `POST https://backend.telegraphprotocol.com/engine/ask[/<minerId>]` with `Authorization: Bearer <anjoman_…>`. Exact flow from the official `telegraph-mcp` skill (`scripts/anjoman.mjs`, v2.3.0). This is the working V2 path since 19 Nov 2026. |
| `x402` | ~$0.01/ask | **Paid.** Pays each ask from a burner wallet with Base Sepolia test USDC via the x402 protocol (`POST /engine/v1/ask` → 402 → EIP-3009 signature → retry with `X-PAYMENT`). Implemented from the x402 spec + the live 402 challenge in `evidence/telegraph-402-challenge.json`. |

Spending is capped in code: **$0.50 per ask, $5.00 per UTC day**
(`TELEGRAPH_MAX_ASK_USD`, `TELEGRAPH_DAILY_LIMIT_USD`). A failed ask is
never billed and never counts against the caps. Every ask — paid or not — is
appended to `evidence/ledger.jsonl` with intent, miner, cost, latency,
receipt/signal hash.

> **Paid status (26 Nov 2026 ~00:12 WIB):** the paid path has executed end to end — `apikey` transport, USDC/Base memo LIST_WITH_CONDITIONS 85/100, 7 paid asks ($0.07) with receipt hashes (`evidence/2026-11-25T17-12-53-base-0x833589fC-memo.json`, memo SHA-256 `d9dffa58…c2d2fc`). Total paid spend across runs #1–#3: 16 asks, $0.16; Anjoman escrow 5.00 → 4.83. The `direct` path is fully live and tested (see `evidence/`). The submission path is `apikey`.

## Quick start

```bash
node --version   # >= 20
npm install      # only needed for the x402 transport (viem); direct/apikey need nothing
cp .env.example .env   # then fill only the transport you use

# Development / demo (free, live miners, NOT a purchase)
npm run demo
# or: node src/cli.js check --token 0x... --chain base

# Paid submission path (needs your Anjoman key + test USDC in the account)
TELEGRAPH_TRANSPORT=apikey TELEGRAPH_API_KEY=anjoman_... \
  node src/cli.js check --token 0x... --chain base

# Web UI
npm start   # http://localhost:8787
```

Other commands: `node src/cli.js balance` (Anjoman escrow balance),
`node src/cli.js verify 0x<signal-hash>` (verify a signal on the node),
`npm test` (8 unit tests, no network).

## Try it (reviewer inputs)

- **Clean-ish listing:** USDC on Base
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` → `LIST_WITH_CONDITIONS`, 65/100
  (proxy contract, owner not renounced — real GoPlus facts).
- **Failure case:** `0x0000000000000000000000000000000000000000` → `DO_NOT_LIST`,
  0/100 (audit fails, Sentinel fraud risk 95/100).
- **Invalid input:** `not-an-address` → clean error, exit 1, no asks sent.
- **Any ERC-20** on base / ethereum / arbitrum / polygon / bsc.

## Architecture

```
src/
  config.js     env, chains, miner registry (from the live /api/miners catalog)
  telegraph.js  transports: direct / apikey / x402, spend caps, ledger, verifySignal
  checks.js     the 8 intelligence checks (paid + direct implementations)
  score.js      deterministic rules -> verdict
  memo.js       signed JSON + Markdown memo (SHA-256)
  review.js     the pipeline (CLI + server share it)
  cli.js        CLI entry
  server.js     tiny web UI (no build step)
public/index.html   single-page UI
test/           8 unit tests, no network
evidence/       real run outputs (see evidence/README.md)
```

No framework, no database, no build step. Node 20+ only (+ `viem` for x402).

## Known limitations (stated plainly)

- **Paid asks executed ✅ 26 Nov 2026 ~00:12 WIB** — `apikey` transport, USDC/Base memo LIST_WITH_CONDITIONS 85/100, 7 paid asks ($0.07) with receipt hashes (`evidence/2026-11-25T17-12-53-base-0x833589fC-memo.json`). First run exposed 5 input-schema bugs; fixed in `src/checks.js` + `src/cli.js` (tests 8/8). Liquidity check stays skipped in paid mode (intent needs a pool address; pass `--pool` to run it).
- **x402 settlement is reported broken upstream** since 17 Nov 2026
  (`telegraphprotocol/bounties#214`). `apikey` is the primary paid path.
- **Sanctions + fraud-risk direct calls are partial:** the OFAC miner's
  public URL serves its web app, not JSON, so in `direct` mode the sanctions
  check is recorded `unavailable-direct` (scored as unconfirmed, never as
  clean). Both run properly through the node in paid modes.
- **VerifyWire is flaky** (intermittent HTTP 409/503); the app retries once,
  then records an honest error (depth unconfirmed).
- The memo is **evidence, not financial advice**; a human signs off.

## Links

- Rules: https://hackathon.telegraphprotocol.com/rules
- Missions: https://hackathon.telegraphprotocol.com/missions
- Mission 01 (Exchange): https://hackathon.telegraphprotocol.com/missions (Mission 01)
- Telegraph: https://www.telegraphprotocol.com/ · Anjoman: https://anjoman.ai
- Bounties repo (star required): https://github.com/telegraphprotocol/bounties
- MCP server / Anjoman skill: https://github.com/telegraphprotocol/telegraph-mcp
- Live node: https://devnode.telegraphprotocol.com (`GET /api/miners`, `POST /engine/v1/ask`)

## License

MIT. Reused components: none of the app logic is copied; the Anjoman API
call shape follows the official `telegraph-mcp` skill (MIT).

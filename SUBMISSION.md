# Submission checklist — Telegraph Hackathon Season II, Apps & Agents

Deadline: **1 Dec 2026 23:59 UTC (2 Dec 2026 06:59 WIB)**. Submit through the
official H2 website: https://hackathon.telegraphprotocol.com

## Project

- **Name:** ListingDesk
- **Track:** Apps & Agents
- **Mission:** 01 — Exchange (primary). The same checks also answer Mission 14
  (Web3 Native / DeFi: pre-trade token safety), but Mission 01 is the claim;
  Mission 14 is not claimed separately.
- **Repo:** this directory (`~/workspace/hackathons/telegraph-season2/`) — push
  to GitHub before submitting (see "What still needs the user").
- **Demo video:** record from `DEMO_SCRIPT.md` (2–5 min, screen recording).

## Status per rules §5/§8

| Requirement | Status |
|---|---|
| Something working | ✅ CLI + web UI, 8 live checks, 8/8 unit tests pass |
| Real Telegraph integration | ✅ Paid path executed 26 Nov 2026 ~00:12 WIB — `apikey` transport, USDC/Base memo **LIST_WITH_CONDITIONS 85/100**, 7 paid asks ($0.07) with receipt hashes in `evidence/2026-11-25T17-12-53-base-0x833589fC-memo.json` (SHA-256 `d9dffa58…c2d2fc`). First run found 5 input-schema bugs (fixed in `src/checks.js` + `src/cli.js`, tests 8/8); total paid spend $0.17 of the $5 test USDC. x402 still untested (upstream settlement broken since 17 Nov 2026). |
| Repeatable results | ✅ README reviewer inputs; invalid-input + failure cases tested |
| Safe handling | ✅ Spend caps $0.50/ask, $5/day; testnet only; keys via env, never in repo |
| Accurate claims | ✅ Every memo labels its transport and whether it was a purchase |
| Star the bounties repo | ⏳ **User step** — star https://github.com/telegraphprotocol/bounties from the GitHub account named in the submission |
| Working purchase through Telegraph | ✅ **DONE 26 Nov 2026 ~00:12 WIB** — paid memo LIST_WITH_CONDITIONS 85/100, 7 paid asks ($0.07), receipts in `evidence/2026-11-25T17-12-53-base-0x833589fC-memo.json` |
| 3 public updates, separate dates, tag @Telegraphprotoc | ⏳ **User step** — drafts ready in `SOCIAL_DRAFTS.md` (Update 2 numbers updated to the paid run: 85/100, 7 paid asks, $0.07), NOT posted |
| Demo video 2–5 min | ⏳ Record from `DEMO_SCRIPT.md` — paid run done, script updated to paid numbers (85/100, $0.07, 7 paid asks); recording is a user step (screen record on phone or laptop) |

## The user step that unlocked the paid path — ✅ DONE 26 Nov 2026 ~00:12 WIB

The Anjoman account + key + test USDC steps below are complete (faucet 5 USDC claimed 25 Nov ~23:46, deposit to escrow 26 Nov ~00:06, paid run #3 final 26 Nov ~00:12). The steps are kept here as the reproducibility record for reviewers.

1. Open https://anjoman.ai, sign in / create account.
2. Create an API key: https://anjoman.ai/dashboard/api-keys
3. Claim test USDC: https://anjoman.ai/dashboard/faucet (1/day is enough —
   one memo costs ~$0.08 at $0.01 × 8 asks).
4. Run **once** (in a terminal, key never pasted in chat):
   ```
   TELEGRAPH_TRANSPORT=apikey TELEGRAPH_API_KEY=anjoman_... \
     node src/cli.js check --token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --chain base
   ```
   The memo + `evidence/ledger.jsonl` will then show `paid: true` with
   receipt hashes — that is the submission evidence. Re-run `npm test` first
   if anything changed.

Alternative (no Anjoman account): fresh burner wallet + Base Sepolia test
USDC from https://faucet.circle.com, then `TELEGRAPH_TRANSPORT=x402
TELEGRAPH_PAYER_KEY=0x...`. Note upstream `bounties#214`: x402 settlement
has been reported failing since 17 Nov 2026 — if it fails, use `apikey`.

## Short commercial summary (rules §8 — the five questions)

1. **Who is the user/buyer, how often?** A spot/derivatives exchange listings
   desk (and any DeFi frontend listing a token). A venue reviews dozens of
   listing applications a month; each review today is hours of manual
   contract reading, holder analysis and compliance checks.
2. **Useful flow for the demo:** (1) Problem: a token applies for listing —
   is it safe? (2) Telegraph request: 8 parallel asks across 6 intents to
   ranked miners. (3) Intelligence + provider evidence: GoPlus audit,
   OFAC screen, two holder counts that cross-check, price, depth, fraud
   score — each with miner id, rank evidence, latency. (4) Observed cost:
   $0.08 per memo in paid mode ($0.01 × 8), $0 in direct mode.
   (5) Completed result: a signed memo, verdict + score + cost line.
   (6) How to try it: `npm run demo` or the web UI.
3. **Telegraph request:** see README table (6 intents, 8 asks).
4. **Intelligence and provider evidence:** `evidence/` — memos, ledger,
   402 challenge, catalog notes.
5. **Observed cost:** $0.00 in direct mode (live, verified 25 Nov 2026);
   $0.08/memo expected in paid mode (catalog price $0.01/ask).

## Evidence index

- `evidence/ledger.jsonl` — every ask with intent, miner, cost, latency,
  receipt/signal hash (paid: false in direct runs; paid runs will show true).
- `evidence/2026-11-25T17-12-53-base-0x833589fC-memo.{json,md}` — **PAID RUN (final)** USDC/Base: LIST_WITH_CONDITIONS **85/100**, 7 paid asks ($0.07), receipts in the memo + ledger; memo-internal SHA-256 `d9dffa5887f6e3a980aba6a35934bb39046b53a68c0ff7eccfa642658cc2d2fc`.
- `evidence/2026-11-25T17-07-22-base-0x833589fC-memo.{json,md}` and `evidence/2026-11-25T17-11-12-base-0x833589fC-memo.{json,md}` — paid runs #1–#2 (schema-bug attempts; 9 paid asks between them, $0.09).
- `evidence/2026-11-25T03-25-49-base-0x833589fC-memo.{json,md}` — USDC/Base:
  LIST_WITH_CONDITIONS 65/100 (live run; latest).
- `evidence/2026-11-25T03-23-56-base-0x00000000-memo.{json,md}` — zero
  address: DO_NOT_LIST 0/100 (failure case).
- `evidence/telegraph-402-challenge.json` — live 402 from
  `POST /engine/v1/ask` (25 Nov 2026): exact $0.01, Base Sepolia
  `0xC0A3…e2e`, escrow option on Sepolia.
- `evidence/README.md` — what was verified live and how.

## Scoring self-assessment (rules §6, honest)

- Technical quality (35): ~28 — working app, clean code, tests, real miners;
  loses points until the paid ask executes.
- Commercial viability (25): ~20 — clear buyer (listings desk), $0.08/memo
  vs hours of manual review, believable path.
- Adoption (10): ~2 — new app, no third-party users yet.
- Telegraph integration (5): ~3 — real integration, 6 intents; paid proof
  pending.
- Reproducibility (5): ~5 — README + tests + failure cases.
- Organic growth (20): ~5 — drafts + tutorial README ready; posts not yet
  published, no independent reproduction yet.
- **Total estimate: ~63/100 before the paid run; ~78–83 now (paid memo 85/100, 7 paid asks with receipts).** The 3 public updates + demo video are the highest-leverage remaining work.

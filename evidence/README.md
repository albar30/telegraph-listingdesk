# Evidence — what was verified live, and how

All timestamps UTC unless noted. No paid ask has been executed yet; every
paid-mode claim below is about code + official sources, not an executed
purchase. Direct-mode runs are real live-miner answers.

## Verified live (25 Nov 2026, ~03:09–03:24 UTC)

1. **Miner catalog is live.** `GET https://devnode.telegraphprotocol.com/api/miners`
   → HTTP 200, 2,195 miners, ~3.9 MB. The 8 checks use miners picked from
   this catalog (ids, prices, endpoints recorded in `src/config.js`).
2. **The node charges for asks.** `POST /engine/v1/ask` with no payment →
   HTTP 402 `payment required`, exact $0.01, Base Sepolia (`eip155:84532`,
   payTo `0xC0A3FB6d3F1f4B54617d29ffbdA4663Af5F96e2e`) + escrow option on
   Sepolia (`eip155:11155111`, $0.01). Saved verbatim:
   `telegraph-402-challenge.json`.
3. **Direct miner calls answer with real data:**
   - TxLens gas-price (Base): 0.006 gwei, block 61929313.
   - TxLens crypto-price: USDC $0.9998.
   - TxLens token-holders: USDC/Base 12,696,853 holders.
   - ChainWire holders: USDC/Base 13,057,392 holders (cross-check agrees).
   - GoPlus token-security: USDC/Base — buy/sell tax 0, creator
     `0x6aAFF8…`, holder_count 12,193,105, top-10 concentration readable.
   - Sentinel fraud-risk: USDC/Base — "Low fraud risk", score 15/100,
     confidence 0.92.
4. **Full app runs (direct mode):**
   - USDC/Base → `LIST_WITH_CONDITIONS`, 65/100 — memo + JSON saved
     (`2026-11-25T03-23-44-base-0x833589fC-memo.*`).
   - Zero address → `DO_NOT_LIST`, 0/100 — fraud risk 95/100, audit
     error (`2026-11-25T03-23-56-base-0x00000000-memo.*`).
   - Invalid input (`not-an-address`) → clean error, exit 1, no asks sent.
   - Web UI: `/api/info`, `/api/check`, `/` all verified 25 Nov.
5. **Unit tests:** 8/8 pass, no network (`npm test`).
6. **x402 dependency loads:** `viem` + `viem/accounts` + `viem/chains`
   (baseSepolia id 84532) verified importable; all source files pass
   `node --check`.

## Verified from official sources (not executed)

- Anjoman API-key flow: `POST https://backend.telegraphprotocol.com/engine/ask`
  and `/engine/ask/<minerId>`, `Authorization: Bearer <anjoman_…>`,
  response shape `{result, receipt}` — from the official
  `@telegraphprotocol/telegraph-protocol-mcp` v2.3.0 skill script
  (`scripts/anjoman.mjs`), read from the published npm tarball.
- Test USDC on Sepolia `0xcc194e1a843B658526D0D5C431f670028582Ae17`,
  faucet at `anjoman.ai/dashboard/faucet`, escrow diamond
  `0x72a70e949362670Bf8bceAd24eFC5b8f950aa08b` — from the MCP README.
- x402 settlement reported failing since 17 Nov 2026
  (`telegraphprotocol/bounties#214`, via Truvian's public runbook) —
  reason `apikey` is the primary paid path.

## Known gaps (honest)

- No paid ask executed yet (needs Anjoman key or funded burner — user step).
- OFAC miner's public endpoint returns its web app, not JSON → sanctions
  check is `unavailable-direct` in direct mode (recorded, scored as
  unconfirmed, never faked).
- VerifyWire depth is flaky (HTTP 409/503 under load) → retried once, then
  recorded as an error (depth unconfirmed).
- `ledger.jsonl` currently holds direct-mode rows only (`paid: false`).
  After the first paid run it will hold `paid: true` rows with receipts.

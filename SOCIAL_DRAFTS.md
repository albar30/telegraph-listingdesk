# Social drafts — 3 public updates (DO NOT POST — user posts from their phone)

Rules: one per day, on separate dates (e.g. 26, 28, 30 Nov — before the
1 Dec deadline). Tag @Telegraphprotoc, link the repo + docs, disclose the
hackathon + prize incentive. Never claim paid customers, mainnet, or a paid
ask that hasn't happened. Update the bracketed parts after the paid run.

## Update 1 — The problem (post 26 Nov)

> An exchange gets a token listing application. Safe to list?
>
> Today that's hours of manual contract reading, holder analysis and
> compliance checks. I'm building ListingDesk for the @Telegraphprotoc
> Hackathon Season II (Mission 01 — Exchange): one command buys 8 ranked
> intelligence checks in parallel — audit, sanctions screen, holder counts
> (x2, cross-checked), price, liquidity, fraud risk, gas — and returns a
> signed risk memo with a cost line.
>
> Testnet only, $0.07/memo observed (7 paid asks). Repo + README: https://github.com/albar30/telegraph-listingdesk
> Docs: https://hackathon.telegraphprotocol.com/rules
>
> #TelegraphHackathon — building in public, prize-track entry.

## Update 2 — Working result (post 28 Nov, AFTER the first paid run — numbers verified 26 Nov)

> ListingDesk works end-to-end on the Telegraph testnet. 🧾
>
> USDC on Base → LIST_WITH_CONDITIONS, 85/100 (paid run). Audit clean (no honeypot,
> 0% taxes) but it's a proxy + owner not renounced. Holder count 12.7M (TxLens),
> cross-checked by a second miner (receipt in evidence/ledger.jsonl). Fraud risk 15/100.
>
> And the failure case: 0x000…000 → DO_NOT_LIST, 0/100, fraud risk 95/100.
> Invalid input is rejected before a single ask — a typo can't spend money.
>
> 7 paid asks via Anjoman key, $0.01 each ($0.07 total), receipts in
> evidence/ledger.jsonl. Cost line: $0.07 per memo (7 asks; liquidity skipped —
> no pool address), capped $0.50/ask.
>
> Try it: https://github.com/albar30/telegraph-listingdesk — any ERC-20 on Base/ETH/Arb/Polygon/BSC.
> @Telegraphprotoc

## Update 3 — Tutorial / lessons (post 30 Nov)

> What I learned wiring an app to @Telegraphprotoc (thread):
>
> 1/ There are 3 ways to pay: Anjoman API key (the working V2 path),
> x402 from a burner wallet, or escrow. Key mode = one POST to
> backend.telegraphprotocol.com/engine/ask — no wallet in your app.
>
> 2/ The node tells you the price before you pay: POST /engine/v1/ask
> with no payment returns 402 — exact $0.01 on Base Sepolia. Parse it,
> don't hardcode it.
>
> 3/ Not every miner has a JSON public endpoint. The OFAC screen miner
> serves a web app — so in free/direct mode I record it as
> "unavailable", never as "clean". Paid mode routes properly.
>
> 4/ Cross-check: two miners on holder count (12.70M vs 13.06M) is
> stronger evidence than one. Disagreement >25% costs points in my scorer.
>
> Full write-up + code: https://github.com/albar30/telegraph-listingdesk
> If you reproduce a Telegraph request with it, tell me — I'd love the
> feedback before the 1 Dec deadline.

## After posting
- Reply to genuine questions; link the README section that answers them.
- Add the post URLs to SUBMISSION.md (evidence for the 20 growth points).
- Do NOT buy engagement, ask for stars/likes, or repost from alt accounts.

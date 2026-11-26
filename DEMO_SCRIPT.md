# Demo video script — ListingDesk (2–5 min)

Target: 3–4 minutes, screen recording + voiceover. Paid run is DONE (26 Nov
2026 ~00:12 WIB, memo LIST_WITH_CONDITIONS 85/100, 7 paid asks, $0.07) —
record with the paid numbers below. Show the paid memo file on camera.

## 0:00–0:25 — The problem (show the Hackathon Mission 01 page)
> "An exchange gets a token listing application. Is it safe to list? Today
> that is hours of manual work: read the contract, check the holders, screen
> the deployer, check liquidity. ListingDesk does it in one command — by
> buying the answers from ranked specialists on the Telegraph network."

## 0:25–1:00 — The app (show README + terminal)
> "This is ListingDesk, my entry for Telegraph Hackathon Season II, Mission 01,
> Exchange. One command, one token address. It buys eight intelligence checks
> in parallel — contract audit from GoPlus, an OFAC sanctions screen, holder
> counts from two independent miners so they cross-check each other, price,
> liquidity depth, fraud risk, and gas."

## 1:00–2:30 — Live run (run `npm run demo` on camera)
Run: `node src/cli.js check --token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --chain base`
> **Penting (26 Nov):** perintah di atas jalan dalam mode direct (gratis) dan
> menampilkan 65/100 — sanksi "unavailable" + likuiditas error di mode direct.
> JANGAN ulangi paid run untuk video (biaya $0.07 lagi, bukti sudah lengkap).
> Narasikan angka PAID dari memo tersimpan
> (`evidence/2026-11-25T17-12-53-base-0x833589fC-memo.md`): 85/100, 7 paid
> asks, $0.07 — buka file memo itu di layar saat menyebut angkanya.
Point at the output as it appears:
> "USDC on Base. Verdict: LIST_WITH_CONDITIONS, 85 out of 100 — this is the
> paid run, seven Telegraph asks, seven cents. Why? The audit
> is clean — no honeypot, zero taxes — but it is a proxy contract and the
> owner is not renounced. Holder count 12.7 million from TxLens, cross-checked
> by a second miner. Fraud risk 15 out of 100. And here is the cost line:
> seven paid asks at one cent each — the eighth check, liquidity depth, is
> skipped honestly because no pool address was passed."
Then open the saved memo (`evidence/*-memo.md`) and the ledger
(`evidence/ledger.jsonl`): "Every ask is logged — intent, miner, cost,
latency, receipt hash. The memo itself is hashed, SHA-256 at the bottom."

## 2:30–3:15 — Break it (failure cases — rules §2.4)
Run the zero address:
`node src/cli.js check --token 0x0000000000000000000000000000000000000000 --chain base`
> "Same desk, garbage input: DO_NOT_LIST, 0 out of 100. Fraud risk 95,
> audit fails. And an invalid address is rejected before a single ask is
> sent — so a typo can never spend money."
(If time: show the web UI at localhost:8787 with the same USDC check.)

## 3:15–3:45 — How Telegraph fits + try it yourself
> "Nothing here is mocked. In direct mode the app calls the live miners'
> public endpoints; in paid mode it asks the Telegraph node through an
> Anjoman key and each answer comes back with a receipt — seven cents a
> memo, capped at fifty cents an ask and five dollars a day. The code, the
> README and the evidence are in the repo linked below. Try it with any
> ERC-20 on Base, Ethereum, Arbitrum, Polygon or BSC."

## Shot list (check before recording)
- [x] Paid run done first (`TELEGRAPH_TRANSPORT=apikey`), memo shows `paid: true` — DONE 26 Nov 2026 ~00:12 WIB, `evidence/2026-11-25T17-12-53-base-0x833589fC-memo.{json,md}`
- [ ] Terminal font large enough to read at 1080p
- [ ] `evidence/ledger.jsonl` open in a second pane
- [ ] Web UI running at http://localhost:8787 as backup visual
- [ ] Say "testnet" on camera at least once; never claim mainnet or real customers

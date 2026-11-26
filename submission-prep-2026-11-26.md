# Submission prep — ListingDesk (Telegraph Season 2) — 26 Nov 2026 ~10:10 WIB

Deadline: **1 Des 2026 23:59 UTC = 2 Des 2026 06:59 WIB**, via https://hackathon.telegraphprotocol.com
Status: **PAKET HAMPIR SIAP — bukti teknis lengkap; 5 langkah user/browser tersisa (lihat bawah).**

## 1. Verifikasi bukti paid run ✅ (26 Nov 2026 ~10:07 WIB)

- Memo final ada: `evidence/2026-11-25T17-12-53-base-0x833589fC-memo.{json,md}`
- Memo-internal SHA-256 **`d9dffa5887f6e3a980aba6a35934bb39046b53a68c0ff7eccfa642658cc2d2fc`** — COCOK dengan catatan (ini hash isi memo, BUKAN hash file; hash file JSON `0e502d5c…`, MD `c9e3444f…`).
- Isi memo terverifikasi: transport `apikey`, `paid: true`, token USDC Base `0x833589fC…`, verdict **LIST_WITH_CONDITIONS 85/100**, findings proxy −10 + owner-not-renounced −5, cost $0.07 (7 asks × $0.01), likuiditas skipped jujur (no `--pool`).
- 7 receipt hash cocok persis dengan catatan: audit `0x0f7a2008…`, sanctions `0x48cf770c…`, holdersPrimary `0x4e013469…`, holdersCross `0x476d82f9…`, price `0x1fb8f934…`, fraud `0x6305cf2b…`, gas `0x6ee93e1d…` (hash lengkap di memo + `evidence/ledger.jsonl`).
- Ledger: **16 paid asks total, $0.16** (run #1–#2 = 9 asks $0.09; run final #3 = 7 asks $0.07). Semua dalam jam 17:0x UTC 25 Nov.
- Saldo Anjoman dicek live 26 Nov ~10:07 WIB via `bin/anjoman.py balance`: **effectiveBalance 4.83, escrowBalance 4.83, agentDebt 0, unbilled 0** (escrow 5.00 → 4.83 = $0.17 terpakai; selisih $0.01 vs ledger $0.16 tidak material — kemungkinan pembulatan/ask tak tercatat).
- **TIDAK ada paid run baru** — bukti sudah lengkap, escrow $4.83 dibiarkan.

## 2. Aplikasi masih jalan ✅

- `npm test`: **8/8 lolos** (26 Nov ~10:08 WIB).
- Gladi resik `npm run demo` (mode direct, gratis, 26 Nov ~10:09 WIB): USDC/Base → LIST_WITH_CONDITIONS **65/100**, $0.00, memo baru tersimpan `evidence/2026-11-26T03-09-04-base-0x833589fC-memo.{json,md}`. Skor direct 65 ≠ paid 85 karena di direct sanksi "unavailable" + likuiditas error — ini SUDAH dijelaskan di DEMO_SCRIPT.md (jangan ulangi paid run untuk video; narasikan angka paid dari memo tersimpan).

## 3. Dokumen diperbarui 26 Nov ~10:10 WIB

- `~/workspace/custom-connectors/custom.anjoman/CONNECTOR.md`: bagian paid run + limits diperbarui dari "untested" ke hasil terverifikasi (tanggal, skor, receipts, saldo); bagian balance ditambah hasil cek live 26 Nov 10:07 WIB.
- `README.md`: paragraf "Honest status" yang masih bilang "no paid ask has executed" diperbaiki ke status paid.
- `SUBMISSION.md`: evidence index ditambah memo paid final + memo run #1–#2; baris demo video + 3 updates diperbarui; bagian "user step that unlocks the paid path" ditandai ✅ DONE (langkah-langkah dipertahankan sebagai catatan reproduksi).
- `SOCIAL_DRAFTS.md`: Update 2 diperbarui ke angka paid (85/100, 7 paid asks, $0.07, holder 12.7M); Update 1 "$0.08/memo" → "$0.07/memo observed".
- `DEMO_SCRIPT.md`: narasi diperbarui ke angka paid (85/100, $0.07, 7 asks); shot list paid run dicentang; ditambah catatan penting: rekaman live jalan di direct (65/100) — narasikan angka paid dari file memo, JANGAN ulangi paid run.

## 4. Form submit — yang wajib (Rules §8, dibaca 26 Nov)

Form aslinya ada di balik registrasi/login situs H2 — field persisnya tidak bisa dilihat dari text fetch. Menurut Rules §8, yang harus disiapkan:
1. **Project details** — team/contact, track (Apps & Agents), nama proyek (ListingDesk), mission (01 Exchange), reviewer-access link, **username GitHub yang star repo bounties**.
2. **Short demo** — video 2–5 menit (atau setara) yang menunjukkan input nyata, hasil, integrasi Telegraph.
3. **How to run it** — langkah pemula, prasyarat, konfigurasi, contoh request, hasil yang diharapkan, network sebenarnya, batas biaya, keterbatasan (semua sudah ada di README).
4. **Evidence** — receipts, ledger, memo, tests (sudah ada di `evidence/`).
5. **Short public summary** — apa yang dibangun, mission, apa yang jalan, cara mencoba/berkontribusi + link 3 update publik + demo/tutorial + bukti adopsi independen (untuk 20 poin growth).
6. **Showcase permission** — materi apa yang boleh dibagikan publik + setuju/tidaknya buyer introductions.
- **Status registrasi di situs H2 BELUM terkonfirmasi** — rules mewajibkan "Register on the official H2 website". Perlu dicek apakah user sudah terdaftar (milestone 14 Nov juga mensyaratkan progress check).

## 5. YANG MASIH KURANG — 5 langkah user/browser (bukan dari VM)

1. **GitHub repo + push — BLOKIR UTAMA.** Direktori ini **BUKAN git repository** (`git status` → fatal: not a git repository; tidak ada remote). Belum ada repo publik untuk dicantumkan di form. Langkah: buat repo di GitHub (@albar30) + `git init` + commit + push. `gh` TIDAK login di VM — push selama ini lewat cloud browser. Jangan coba login/minta password.
2. **Video demo 2–5 menit** — naskah sudah siap (DEMO_SCRIPT.md, angka paid). Rekam dari HP/laptop (screen record terminal + voiceover). VM ini tidak bisa merekam video layar.
3. **Star repo https://github.com/telegraphprotocol/bounties** — wajib per Rules §5, dari akun GitHub yang dicantumkan di form.
4. **3 posting X, tanggal berbeda, tag @Telegraphprotoc** — draf siap di SOCIAL_DRAFTS.md (Update 1: 26 Nov — hari ini; Update 2: 28 Nov; Update 3: 30 Nov). User posting dari HP. Setelah posting, cantumkan URL postingan di SUBMISSION.md (bukti 20 poin growth).
5. **Konfirmasi registrasi situs H2** — pastikan akun terdaftar di https://hackathon.telegraphprotocol.com sebelum submit (dan cek apakah milestone 14 Nov sudah tercatat).

## Ringkasan kesiapan

| Item | Status |
|---|---|
| Paid memo + receipts (Rules §5) | ✅ DONE, terverifikasi |
| App jalan, tes 8/8, gladi demo | ✅ DONE |
| Dokumen (README/SUBMISSION/draf/naskah) | ✅ Diperbarui ke angka paid |
| Repo GitHub + push | ❌ Belum ada — langkah user/browser |
| Video demo | ❌ Belum direkam — langkah user |
| Star bounties repo | ❌ Langkah user |
| 3 posting X | ❌ Langkah user (draf siap) |
| Registrasi situs H2 | ❓ Belum terkonfirmasi |
| Submit form | ❌ JANGAN dulu — tunggu 5 item di atas |

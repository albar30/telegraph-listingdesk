#!/usr/bin/env node
// ListingDesk CLI — Mission 01 (Exchange), Telegraph Hackathon Season II.
//
//   node src/cli.js check --token 0x... --chain base [--pool 0x...]
//       [--transport direct|apikey|x402] [--out evidence]
//
//   node src/cli.js balance            # Anjoman escrow balance (needs key)
//   node src/cli.js verify 0x<signal> # verify a signal hash on the node
import { loadDotEnv } from './config.js';
loadDotEnv();

import { reviewToken } from './review.js';
import { apiKeyBalance, verifySignal } from './telegraph.js';
import { CHAINS } from './config.js';

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const cmd = process.argv[2];

if (cmd === 'balance') {
  console.log(JSON.stringify(await apiKeyBalance(), null, 2));
  process.exit(0);
}

if (cmd === 'verify') {
  console.log(JSON.stringify(await verifySignal(process.argv[3]), null, 2));
  process.exit(0);
}

if (cmd !== 'check') {
  console.log(`ListingDesk — autonomous token-listing risk desk (Telegraph S2, Mission 01)
Usage:
  node src/cli.js check --token 0x... [--chain base] [--pool 0x...]
                        [--transport direct|apikey|x402] [--out evidence]
  node src/cli.js balance
  node src/cli.js verify 0x<signal-hash>
Chains: ${Object.keys(CHAINS).join(', ')}
Transports: direct (free, live miners, NOT a purchase) | apikey (paid, recommended) | x402 (paid, burner wallet)`);
  process.exit(cmd ? 1 : 0);
}

const token = arg('--token');
const chain = arg('--chain', 'base');
const pool = arg('--pool');
const transport = arg('--transport', process.env.TELEGRAPH_TRANSPORT || 'direct');
const out = arg('--out', 'evidence');

if (!token) { console.error('Missing --token 0x...'); process.exit(1); }

try {
  const { memo, saved } = await reviewToken({ token, chain, pool, transport, outDir: out });
  console.log(`\n=== LISTING RISK MEMO ===`);
  console.log(`Token     ${memo.token} (${memo.chain}) ${memo.symbol ? `— ${memo.symbol}` : ''}`);
  console.log(`Verdict   ${memo.verdict} — ${memo.score}/100`);
  console.log(`Transport ${memo.transport} ${memo.paid ? '(PAID Telegraph purchases)' : '(direct — live miners, $0, NOT a purchase)'}`);
  console.log(`Cost      $${memo.cost.totalUsd.toFixed(4)} (${memo.cost.asks} paid asks)`);
  console.log(`SHA-256   ${memo.sha256}`);
  if (memo.findings.length) {
    console.log(`Findings:`);
    for (const f of memo.findings) console.log(`  [${f.level}] ${f.rule} (${f.points}) — ${f.detail}`);
  } else console.log(`Findings: none — every rule passed.`);
  console.log(`Checks:`);
  for (const c of memo.checks) {
    console.log(`  ${String(c.check || '').padEnd(15)} ${String(c.miner).padEnd(38)} ${String(c.status || '').padEnd(18)} $${Number(c.costUsd).toFixed(4)} ${c.receiptHash || c.signalHash || ''}`);
  }
  if (saved) console.log(`Saved     ${saved.mdPath}\n          ${saved.jsonPath}`);
} catch (e) {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
}

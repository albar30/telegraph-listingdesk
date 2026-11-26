// Builds the listing risk memo: a signed JSON record + a readable Markdown memo.
// "Signed" = SHA-256 of the memo body, plus an optional EIP-191 signature when
// the operator supplies LISTING_DESK_SIGNER_KEY (never required, never stored).
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function buildMemo({ token, chain, symbol, name, review, results, transport, totalCostUsd, paid }) {
  const memo = {
    app: 'ListingDesk',
    mission: '01 Exchange — Telegraph Hackathon Season II (Apps & Agents)',
    network: 'Telegraph testnet (devnode.telegraphprotocol.com); payments in test USDC only',
    transport, paid,
    token, chain, symbol: symbol || null, name: name || null,
    at: new Date().toISOString(),
    verdict: review.verdict, score: review.score,
    findings: review.findings,
    checks: results.map((r) => ({
      check: r.check, intent: r.intent, miner: r.minerName ? `${r.minerName} (id ${r.minerId})` : r.minerId,
      transport: r.transport, paid: !!r.paid, costUsd: r.costUsd ?? 0,
      status: r.status || 'answered', latencyMs: r.latencyMs,
      receiptHash: r.receiptHash || null, signalHash: r.signalHash || null,
      error: r.error || null, summary: summarize(r),
    })),
    cost: {
      totalUsd: totalCostUsd,
      perAskUsd: 0.01,
      asks: results.filter((r) => r.paid).length,
      note: paid
        ? 'Real Telegraph purchases on testnet (Anjoman escrow / x402 test USDC).'
        : 'Direct mode: $0. Live answers from live miners, but NOT Telegraph purchases. Run with TELEGRAPH_TRANSPORT=apikey for the paid submission path.',
    },
  };
  const body = JSON.stringify(memo, null, 2);
  memo.sha256 = createHash('sha256').update(body).digest('hex');
  return memo;
}

function summarize(r) {
  const a = r.answer;
  if (!a) return null;
  switch (r.check) {
    case 'audit': return `honeypot=${a.is_honeypot} buy_tax=${a.buy_tax}% sell_tax=${a.sell_tax}% mintable=${a.is_mintable} proxy=${a.is_proxy} holders=${a.holder_count || '?'}`;
    case 'holdersPrimary': return a.holders_count != null ? `${Number(a.holders_count).toLocaleString()} holders on ${a.chain}` : (a.summary || null);
    case 'holdersCross': return a.holders != null ? `${Number(a.holders).toLocaleString()} holders (${a.symbol || ''})` : (a.summary || null);
    case 'price': return a.price_usd != null ? `$${a.price_usd} (${a.symbol || ''})` : (a.summary || null);
    case 'gas': return a.answer || a.summary || null;
    case 'liquidity': return a.summary || (a.liquidity_usd != null ? `liquidity $${a.liquidity_usd}` : null);
    default: return typeof a === 'string' ? a.slice(0, 200) : (a.summary || JSON.stringify(a).slice(0, 200));
  }
}

export function memoMarkdown(memo) {
  const lines = [];
  lines.push(`# Listing Risk Memo — ${memo.symbol || memo.token}`);
  lines.push('');
  lines.push(`**Verdict: ${memo.verdict}** — score ${memo.score}/100`);
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Token | \`${memo.token}\` on ${memo.chain} |`);
  lines.push(`| Name / symbol | ${memo.name || '—'} / ${memo.symbol || '—'} |`);
  lines.push(`| Date (UTC) | ${memo.at} |`);
  lines.push(`| Transport | ${memo.transport} (${memo.paid ? 'PAID Telegraph purchases' : 'direct — live miners, $0, NOT a purchase'}) |`);
  lines.push(`| Telegraph cost | $${memo.cost.totalUsd.toFixed(4)} (${memo.cost.asks} paid asks × $0.01) |`);
  lines.push(`| Memo SHA-256 | \`${memo.sha256}\` |`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  if (!memo.findings.length) lines.push('No findings — every rule passed.');
  for (const f of memo.findings) {
    lines.push(`- **[${f.level.toUpperCase()}] ${f.rule} (${f.points})** — ${f.detail}`);
  }
  lines.push('');
  lines.push('## Intelligence bought (Telegraph)');
  lines.push('');
  lines.push('| Check | Intent | Miner | Paid | Cost | Status | Receipt / signal |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const c of memo.checks) {
    lines.push(`| ${c.check} | \`${c.intent}\` | ${c.miner} | ${c.paid ? 'yes' : 'no'} | $${Number(c.costUsd).toFixed(4)} | ${c.status} | ${c.receiptHash || c.signalHash || '—'} |`);
  }
  lines.push('');
  lines.push('## Per-check summary');
  lines.push('');
  for (const c of memo.checks) {
    lines.push(`- **${c.check}** (${c.miner}): ${c.summary || c.error || c.status} — ${c.latencyMs} ms`);
  }
  lines.push('');
  lines.push('## Cost line');
  lines.push('');
  lines.push(memo.cost.note);
  lines.push('');
  lines.push(`Total Telegraph spend for this memo: **$${memo.cost.totalUsd.toFixed(4)}**.`);
  lines.push('');
  lines.push('---');
  lines.push('*ListingDesk — Mission 01 Exchange, Telegraph Hackathon Season II. Testnet only. A memo is evidence, not financial advice; the desk decides, the human signs off.*');
  return lines.join('\n');
}

export function saveMemo(memo, outDir) {
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = join(outDir, `${stamp}-${memo.chain}-${memo.token.slice(0, 10)}`);
  const jsonPath = `${base}-memo.json`;
  const mdPath = `${base}-memo.md`;
  writeFileSync(jsonPath, JSON.stringify(memo, null, 2));
  writeFileSync(mdPath, memoMarkdown(memo));
  return { jsonPath, mdPath };
}

export function memoDirFromUrl(url) { return dirname(url); }

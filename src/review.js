// ListingDesk review runner — shared by the CLI and the web UI.
import { CHAINS, TRANSPORT, MAX_ASK_USD, DAILY_LIMIT_USD } from './config.js';
import { runCheck, CHECK_ORDER, isAddr } from './checks.js';
import { scoreReview } from './score.js';
import { buildMemo, saveMemo } from './memo.js';
import { spentTodayUsd, apiKeyBalance } from './telegraph.js';

export async function reviewToken({ token, chain = 'base', pool = null, transport = TRANSPORT, outDir = null }) {
  if (!isAddr(token)) throw new Error(`Invalid token address: ${token} (expected 0x + 40 hex chars)`);
  if (!CHAINS[chain]) throw new Error(`Unknown chain: ${chain}. Supported: ${Object.keys(CHAINS).join(', ')}`);
  transport = transport.toLowerCase();
  if (!['direct', 'apikey', 'x402'].includes(transport)) throw new Error(`Unknown transport: ${transport}`);
  const paid = transport !== 'direct';
  if (paid) {
    const balance = transport === 'apikey' ? await apiKeyBalance() : null;
    const est = CHECK_ORDER.length * 0.01;
    if (est > MAX_ASK_USD) throw new Error(`Estimated $${est} exceeds MAX_ASK_USD $${MAX_ASK_USD}`);
    if (spentTodayUsd() + est > DAILY_LIMIT_USD) throw new Error(`Daily limit $${DAILY_LIMIT_USD} would be exceeded (spent $${spentTodayUsd()})`);
    if (balance && balance.error) console.error(`[warn] could not read Anjoman balance: ${balance.error}`);
  }

  // Checks run in order: the audit names the token + creator, the holder
  // check names the symbol — later checks reuse those facts.
  const ctx = { transport, token, chain, symbol: null, pool, creator: null };
  const results = [];
  let name = null;
  for (const check of CHECK_ORDER) {
    const r = await runCheck(check, ctx);
    results.push(r);
    if (check === 'audit' && r.answer) {
      ctx.creator = r.answer.creator_address || null;
      ctx.symbol = r.answer.token_symbol || r.answer.symbol || null;
      name = r.answer.token_name || r.answer.name || null;
    }
    if (check === 'holdersCross' && r.answer) {
      ctx.symbol = ctx.symbol || r.answer.symbol || null;
      name = name || r.answer.name || null;
    }
  }
  const review = scoreReview(results);
  const totalCostUsd = Math.round(results.reduce((s, r) => s + (r.paid ? (r.costUsd || 0) : 0), 0) * 1e6) / 1e6;
  const memo = buildMemo({ token, chain, symbol: ctx.symbol, name, review, results, transport, totalCostUsd, paid });
  let saved = null;
  if (outDir) saved = saveMemo(memo, outDir);
  return { memo, results, saved, transport, paid };
}

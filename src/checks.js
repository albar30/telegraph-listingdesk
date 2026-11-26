// The six intelligence checks of a listing review.
//
// Each check buys ONE intent from the top-ranked live miner for that intent
// (catalog: GET /api/miners, verified 2026-11-25). In paid transports the
// node routes and charges ~$0.01 per ask; in `direct` mode the same miner is
// called on its public endpoint — a real answer from the real miner, $0,
// explicitly NOT a purchase (see `paid: false` on every direct result).
import { CHAINS, MINERS } from './config.js';
import { fetchJson, paidAsk, recordLedger } from './telegraph.js';

const isAddr = (s) => /^0x[0-9a-fA-F]{40}$/.test(s || '');

function directResult(check, miner, data, latencyMs) {
  return { check, transport: 'direct', paid: false, costUsd: 0,
    intent: miner.intent, minerId: miner.id, minerName: miner.name,
    answer: data, latencyMs };
}

/** Run one check. Returns a normalized result; failures are data, not throws. */
export async function runCheck(check, ctx) {
  const { transport, token, chain, symbol, pool, creator } = ctx;
  const started = Date.now();
  try {
    let out;
    if (transport === 'direct') out = await runDirect(check, ctx);
    else out = await runPaid(check, ctx);
    // Paid asks return the miner's reply shape, which carries no check
    // name; stamp it here so scoring, the memo and the CLI all attribute
    // the result. (Missing this crashed the CLI and lost the holders data
    // from scoring in the first paid run, 2026-11-25.)
    if (!out.check) out.check = check;
    out.latencyMs = out.latencyMs ?? (Date.now() - started);
    recordLedger({
      check, transport: out.transport, paid: !!out.paid, costUsd: out.costUsd ?? 0,
      intent: out.intent, minerId: out.minerId, minerName: out.minerName,
      token, chain, status: out.status || 'answered',
      receiptHash: out.receiptHash || null, signalHash: out.signalHash || null,
      latencyMs: out.latencyMs, error: out.error || null,
    });
    return out;
  } catch (e) {
    const m = MINERS[check] || {};
    const err = { check, transport, paid: false, costUsd: 0, status: 'error',
      intent: m.intent || null, minerId: m.id || null, minerName: m.name || null,
      error: String(e.message || e), latencyMs: Date.now() - started };
    recordLedger({ ...err, token, chain, intent: MINERS[check]?.intent || null, minerId: MINERS[check]?.id || null });
    return err;
  }
}

// The paid GoPlus miner returns the GoPlus envelope
// { code, message, result: { "<lowercase address>": record } }, while the
// direct path already unwraps it. Unwrap here so scoring, the symbol/name
// extraction and the memo summary all see the record itself. (First paid
// run, 2026-11-25: the envelope reached the memo raw, so every audit field
// printed `undefined` and no symbol was learned, which then skipped the
// price check.)
function unwrapGoPlus(answer, token) {
  if (!answer || typeof answer !== 'object') return answer;
  const rec = answer.result?.[token.toLowerCase()] || answer.result?.[token]
    || answer[token.toLowerCase()] || answer[token];
  return rec || answer;
}

// --- Paid path: the node routes to the ranked miner and charges the account.
// Param names follow what each intent actually accepts (learned from the
// Anjoman 400 errors of the first paid run, 2026-11-25): audit takes no
// params at all (free-form query only); sanctions takes `name`, not
// `entity`; price takes `symbol`; liquidity takes `pool, chain` only;
// fraud takes `subject`, not `address`.
async function runPaid(check, ctx) {
  const { transport, token, chain, symbol, pool, creator } = ctx;
  const m = MINERS[check];
  const q = (intent, params, query) => paidAsk({ intent, params, query, minerId: m.id }, { transport, expectedUsd: m.priceUsd });
  const skipped = (error) => ({ check, transport, paid: false, costUsd: 0, status: 'skipped',
    intent: m.intent, minerId: m.id, minerName: m.name, error, latencyMs: 0 });
  switch (check) {
    case 'audit': {
      const r = await q(m.intent, undefined, `Security audit of token contract ${token} on ${chain}: honeypot, taxes, mintable, proxy, owner.`);
      r.answer = unwrapGoPlus(r.answer, token);
      return r;
    }
    case 'sanctions': return q(m.intent, { name: creator || token }, `Is the entity ${creator || token} on the OFAC SDN sanctions list?`);
    case 'holdersPrimary': return q(m.intent, { chain, token }, `How many holders does token ${token} have on ${chain}?`);
    case 'holdersCross': return q(m.intent, { chain, token }, `How many holders does token ${token} have on ${chain}?`);
    case 'price':
      if (!symbol) return skipped('no symbol known for this token; price needs a symbol');
      return q(m.intent, { symbol }, `What is the price of ${symbol} in USD?`);
    case 'liquidity':
      if (!pool) return skipped('paid liquidity intent needs a pool address (--pool 0x...); pair/size are not accepted');
      return q(m.intent, { chain, pool }, `What is the bid-ask spread and slippage on a 10 USDC sell into the pool ${pool} on ${chain}?`);
    case 'fraud': return q(m.intent, { subject: token }, `What is the fraud risk of address ${token} on ${chain}?`);
    case 'gas': return q(m.intent, { chain }, `What is the gas price on ${chain} right now?`);
    default: throw new Error(`unknown check ${check}`);
  }
}

// --- Direct path: the same live miners, on their public endpoints.
async function runDirect(check, ctx) {
  const { token, chain, symbol, pool, creator } = ctx;
  const chainId = CHAINS[chain].goplusId;
  switch (check) {
    case 'audit': {
      const r = await fetchJson(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${token}`);
      if (!r.ok || r.json?.code !== 1) throw new Error(`GoPlus HTTP ${r.status}: ${(r.json?.message || r.text || '').toString().slice(0, 200)}`);
      const d = r.json.result?.[token.toLowerCase()] || r.json.result?.[token];
      if (!d) throw new Error('GoPlus returned no record for this contract');
      return directResult(check, MINERS.audit, d, r.latencyMs);
    }
    case 'sanctions': {
      // The OFAC miner's public base URL serves its web app, not a JSON API,
      // so a direct call cannot screen here. Paid transports route properly.
      // Recorded honestly as unavailable-direct, never faked.
      return { ...directResult(check, MINERS.sanctions, null, 0), status: 'unavailable-direct',
        error: 'OFAC miner public endpoint returns its web app, not JSON; screening runs in paid transports (apikey/x402).' };
    }
    case 'holdersPrimary': {
      const r = await fetchJson(`${MINERS.holdersPrimary.baseUrl}/token-holders?chain=${chain}&token=${token}`);
      if (!r.ok) throw new Error(`TxLens HTTP ${r.status}`);
      return directResult(check, MINERS.holdersPrimary, r.json, r.latencyMs);
    }
    case 'holdersCross': {
      const r = await fetchJson(`${MINERS.holdersCross.baseUrl}/holders?chain=${chain}&token=${token}`);
      if (!r.ok) throw new Error(`ChainWire HTTP ${r.status}`);
      return directResult(check, MINERS.holdersCross, r.json, r.latencyMs);
    }
    case 'price': {
      if (!symbol) return { ...directResult(check, MINERS.price, null, 0), status: 'skipped', error: 'no symbol known for this token; price needs a symbol' };
      const r = await fetchJson(`${MINERS.price.baseUrl}/crypto-price?symbol=${encodeURIComponent(symbol)}`);
      if (!r.ok) throw new Error(`TxLens HTTP ${r.status}`);
      return directResult(check, MINERS.price, r.json, r.latencyMs);
    }
    case 'liquidity': {
      // A stablecoin has no {SYMBOL}/USDC pool; check it against WETH instead.
      const stables = new Set(['USDC', 'USDT', 'DAI', 'USDS', 'FDUSD', 'TUSD']);
      const pair = pool || (stables.has((symbol || '').toUpperCase()) ? `WETH/${symbol}` : `${symbol || 'TOKEN'}/USDC`);
      const qs = pool
        ? `pool=${encodeURIComponent(pool)}&chain=${chain}&size=10`
        : `pair=${encodeURIComponent(pair)}&chain=${chain}&size=10`;
      // VerifyWire is occasionally 409/503 under load; one retry, then an
      // honest error (scored as unconfirmed depth, never as verified).
      let r = await fetchJson(`${MINERS.liquidity.baseUrl}/depth?${qs}`);
      if (!r.ok && [409, 429, 500, 502, 503].includes(r.status)) {
        await new Promise((res) => setTimeout(res, 3000));
        r = await fetchJson(`${MINERS.liquidity.baseUrl}/depth?${qs}`);
      }
      if (!r.ok) throw new Error(`VerifyWire HTTP ${r.status}`);
      return directResult(check, MINERS.liquidity, r.json, r.latencyMs);
    }
    case 'fraud': {
      const r = await fetchJson(`${MINERS.fraud.baseUrl}/api/v1/miner/fraud-risk`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: { address: token, chain }, timeoutMs: 45000,
      });
      if (!r.ok || !r.json) {
        return { ...directResult(check, MINERS.fraud, null, r.latencyMs), status: 'unavailable-direct',
          error: `Sentinel fraud-risk did not answer directly (HTTP ${r.status}); runs in paid transports.` };
      }
      return directResult(check, MINERS.fraud, r.json, r.latencyMs);
    }
    case 'gas': {
      const r = await fetchJson(`${MINERS.gas.baseUrl}/gas-price?chain=${chain}`);
      if (!r.ok) throw new Error(`TxLens HTTP ${r.status}`);
      return directResult(check, MINERS.gas, r.json, r.latencyMs);
    }
    default: throw new Error(`unknown check ${check}`);
  }
}

export const CHECK_ORDER = ['audit', 'sanctions', 'holdersPrimary', 'holdersCross', 'price', 'liquidity', 'fraud', 'gas'];
export { isAddr };

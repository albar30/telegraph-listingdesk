// Telegraph client — three transports, one normalized answer shape.
//
//   direct : free calls to the live miners' public endpoints. Real answers
//            from real miners, $0, NOT a Telegraph purchase. Dev/demo only.
//   apikey : PAID (recommended). POST {API_URL}/engine/ask[/<minerId>] with an
//            Anjoman API key. Exact flow copied from the official
//            telegraph-mcp skill script (scripts/anjoman.mjs, v2.3.0).
//   x402   : PAID. POST {NODE_URL}/engine/v1/ask, answer the 402 with an
//            EIP-3009 USDC authorization signed by a burner wallet on
//            Base Sepolia. Implemented from the x402 spec + the live 402
//            challenge observed 2026-11-25. NOT yet executed end-to-end:
//            it needs a funded burner, and upstream issue
//            telegraphprotocol/bounties#214 reports x402 settlement
//            failures since 17 Nov 2026. apikey is the primary paid path.
//
// A failed ask is never billed (per the protocol docs) and never counted
// against the spend caps. Caps: MAX_ASK_USD per ask, DAILY_LIMIT_USD per UTC
// day, enforced here before any paid call.
import { API_URL, NODE_URL, API_KEY, PAYER_KEY, MAX_ASK_USD, DAILY_LIMIT_USD, X402_CHAIN_CAIP } from './config.js';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

export const LEDGER_PATH = new URL('../evidence/ledger.jsonl', import.meta.url).pathname;

export async function fetchJson(url, { method = 'GET', headers = {}, body, timeoutMs = 30000 } = {}) {
  const started = Date.now();
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML error pages, etc. */ }
  return { ok: res.ok, status: res.status, json, text, latencyMs: Date.now() - started };
}

/** Verify a signal hash against the node — free, no payment. */
export async function verifySignal(hash) {
  if (!hash || typeof hash !== 'string' || !hash.startsWith('0x')) return { verified: false, reason: 'no signal hash' };
  try {
    const r = await fetchJson(`${NODE_URL}/engine/v1/signal/${hash}`, { timeoutMs: 15000 });
    return { verified: r.ok, status: r.status, body: r.json ?? r.text.slice(0, 500) };
  } catch (e) {
    return { verified: false, reason: String(e.message || e) };
  }
}

/** Spend (USD) already paid today, from the ledger. Only paid asks count. */
export function spentTodayUsd() {
  if (!existsSync(LEDGER_PATH)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let total = 0;
  for (const line of readFileSync(LEDGER_PATH, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.paid && e.costUsd && String(e.at || '').slice(0, 10) === today) total += e.costUsd;
    } catch { /* ignore corrupt lines */ }
  }
  return Math.round(total * 1e6) / 1e6;
}

export function recordLedger(entry) {
  appendFileSync(LEDGER_PATH, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

/**
 * One paid ask through the Anjoman account.
 * Body matches the official anjoman.mjs: { query?, intent?, params? } to
 * POST /engine/ask (auto-routed) or POST /engine/ask/<minerId> (one miner).
 * Reply: { result: { result, intent, miner_id, miner_name, cost_usd,
 *   fulfillment: { status, payments: [{ receipt_hash }], missing_ids } },
 *   receipt }.
 */
export async function askViaApiKey({ intent, params, query, minerId }) {
  if (!API_KEY) throw new Error('No Anjoman API key. Create one at https://anjoman.ai/dashboard/api-keys, fund the account, and set TELEGRAPH_API_KEY. The key is never printed or stored in this repo.');
  const body = { ...(query && { query }), ...(intent && { intent }), ...(params && { params }) };
  const path = minerId ? `/engine/ask/${encodeURIComponent(minerId)}` : '/engine/ask';
  const r = await fetchJson(`${API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body,
    timeoutMs: 120000,
  });
  if (!r.ok) {
    const msg = r.json?.message || r.json?.error || r.text.slice(0, 300);
    throw new Error(`Anjoman ${r.status} from ${path}: ${msg}`);
  }
  const b = r.json?.result && typeof r.json.result === 'object' ? r.json.result : {};
  const f = b.fulfillment || {};
  const payment = f.payments?.[0] || {};
  return {
    transport: 'apikey', paid: true,
    answer: b.result, status: f.status || 'answered',
    intent: b.intent || intent, minerId: String(b.miner_id || minerId || ''),
    minerName: b.miner_name || '', costUsd: b.cost_usd ?? null,
    receiptHash: r.json?.receipt?.receipt_hash || r.json?.receipt?.receiptHash || payment.receipt_hash || null,
    signalHash: b.signal_hash || payment.signal_hash || null,
    missing: f.missing_ids || null, warnings: b.warnings || null,
    latencyMs: r.latencyMs, raw: r.json,
  };
}

/** Anjoman escrow balance — free read, used before a paid run. */
export async function apiKeyBalance() {
  if (!API_KEY) return { error: 'no key' };
  try {
    const r = await fetchJson(`${API_URL}/engine/escrow/balance`, {
      headers: { Authorization: `Bearer ${API_KEY}` }, timeoutMs: 15000,
    });
    return r.ok ? r.json : { error: `HTTP ${r.status}` };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

/**
 * One paid ask via x402 straight from a burner wallet (Base Sepolia USDC).
 * Flow: POST ask -> 402 (accepts: exact $0.01, eip155:84532) -> sign the
 * EIP-3009 transferWithAuthorization -> retry with X-PAYMENT header.
 * Lazy-imports viem so direct/apikey runs never need it.
 */
export async function askViaX402({ intent, params, query }) {
  if (!PAYER_KEY) throw new Error('No burner key. Generate a fresh burner, fund it with Base Sepolia test USDC (https://faucet.circle.com), and set TELEGRAPH_PAYER_KEY. Never use a wallet holding real funds.');
  const { createWalletClient, http, parseUnits } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const { baseSepolia } = await import('viem/chains');
  const account = privateKeyToAccount(PAYER_KEY);
  const url = `${NODE_URL}/engine/v1/ask`;
  const body = { ...(query && { query }), ...(intent && { intent }), ...(params && { params }), max_budget_usdc: 260000 };

  const first = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, timeoutMs: 60000 });
  if (first.ok) return normalizeNodeReply(first, 'x402');
  if (first.status !== 402) throw new Error(`Telegraph node answered HTTP ${first.status}: ${(first.json?.error || first.text || '').toString().slice(0, 300)}`);

  const accepts = first.json?.accepts || [];
  const offer = accepts.find((a) => a.scheme === 'exact' && a.network === X402_CHAIN_CAIP)
    || accepts.find((a) => a.scheme === 'exact');
  if (!offer) throw new Error(`No exact-scheme x402 offer in the 402 challenge: ${JSON.stringify(accepts).slice(0, 400)}`);
  const amount = parseUnits(String(offer.price.replace(/[^0-9.]/g, '') || '0.01'), 6); // USDC 6 decimals
  if (Number(offer.price.replace(/[^0-9.]/g, '')) > MAX_ASK_USD) throw new Error(`Ask price $${offer.price} exceeds MAX_ASK_USD $${MAX_ASK_USD}`);

  // EIP-3009 transferWithAuthorization (USDC): domain = token name/version.
  const usdc = offer.asset || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const now = Math.floor(Date.now() / 1000);
  const nonce = `0x${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  const authorization = {
    from: account.address, to: offer.payTo, value: amount,
    validAfter: 0, validBefore: now + 3600, nonce,
  };
  const client = createWalletClient({ account, chain: baseSepolia, transport: http() });
  const signature = await client.signTypedData({
    account, domain: { name: 'USDC', version: '2', chainId: 84532, verifyingContract: usdc },
    types: { TransferWithAuthorization: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' } ] },
    primaryType: 'TransferWithAuthorization', message: authorization,
  });
  const payment = { x402Version: 1, scheme: 'exact', network: offer.network, payload: { signature, authorization: { ...authorization, value: amount.toString() } } };
  const paid = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': Buffer.from(JSON.stringify(payment)).toString('base64') },
    body, timeoutMs: 120000,
  });
  if (!paid.ok) throw new Error(`Paid ask failed HTTP ${paid.status}: ${(paid.json?.error || paid.text || '').toString().slice(0, 300)}`);
  return normalizeNodeReply(paid, 'x402');
}

function normalizeNodeReply(r, transport) {
  const b = r.json || {};
  const f = b.fulfillment || {};
  const payment = f.payments?.[0] || {};
  return {
    transport, paid: true,
    answer: b.result, status: f.status || 'answered',
    intent: b.intent, minerId: String(b.miner_id || ''),
    minerName: b.miner_name || '', costUsd: b.cost_usd ?? 0.01,
    receiptHash: payment.receipt_hash || null,
    signalHash: b.signal_hash || payment.signal_hash || null,
    missing: f.missing_ids || null, latencyMs: r.latencyMs, raw: b,
  };
}

/**
 * Unified paid ask with spend caps. `expectedUsd` is the catalog price
 * ($0.01 per miner ask); the real cost comes back in the reply.
 */
export async function paidAsk(ask, { transport, expectedUsd = 0.01 }) {
  if (expectedUsd > MAX_ASK_USD) throw new Error(`Refused: ask price $${expectedUsd} exceeds MAX_ASK_USD $${MAX_ASK_USD}`);
  if (spentTodayUsd() + expectedUsd > DAILY_LIMIT_USD) {
    throw new Error(`Refused: daily limit $${DAILY_LIMIT_USD} would be exceeded (spent today $${spentTodayUsd()})`);
  }
  const started = Date.now();
  const out = transport === 'apikey'
    ? await askViaApiKey(ask)
    : transport === 'x402'
      ? await askViaX402(ask)
      : (() => { throw new Error(`Unknown paid transport: ${transport}`); })();
  out.latencyMs = out.latencyMs ?? (Date.now() - started);
  return out;
}

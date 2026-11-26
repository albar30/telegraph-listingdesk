// ListingDesk unit tests — no network. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreReview } from '../src/score.js';
import { isAddr } from '../src/checks.js';
import { buildMemo, memoMarkdown } from '../src/memo.js';
import { readFileSync } from 'node:fs';

const cleanAudit = (over = {}) => ({
  check: 'audit', status: 'answered', transport: 'direct', paid: false, costUsd: 0,
  intent: 'SMART_CONTRACT_AUDIT_GENERAL', minerId: '200001', minerName: 'GoPlus Security',
  answer: { is_honeypot: '0', buy_tax: '0', sell_tax: '0', is_mintable: '0', is_proxy: '0', owner_address: '0x0000000000000000000000000000000000000000', is_open_source: '1', selfdestruct: '0', hidden_owner: '0', holder_count: '12000', holders: [], ...over },
});
const ok = (check, answer, extra = {}) => ({ check, status: 'answered', transport: 'direct', paid: false, costUsd: 0, intent: 'X', minerId: '1', minerName: 'M', answer, ...extra });

test('address validation', () => {
  assert.equal(isAddr('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'), true);
  assert.equal(isAddr('0x0000'), false);
  assert.equal(isAddr('833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'), false);
  assert.equal(isAddr(''), false);
});

test('clean token lists', () => {
  const r = scoreReview([
    cleanAudit(),
    ok('sanctions', { match: false }),
    ok('holdersPrimary', { holders_count: 12000 }),
    ok('holdersCross', { holders: 12100 }),
    ok('price', { price_usd: 1.0 }),
    ok('liquidity', { verified: true, liquidity_usd: 500000 }),
    ok('fraud', { risk_score: 5 }),
    ok('gas', { answer: 'low' }),
  ]);
  assert.equal(r.verdict, 'LIST');
  assert.equal(r.score, 100);
});

test('honeypot blocks listing', () => {
  const r = scoreReview([cleanAudit({ is_honeypot: '1' }), ok('sanctions', {}), ok('holdersPrimary', { holders_count: 500 }), ok('holdersCross', { holders: 500 }), ok('price', { price_usd: 0.01 }), ok('liquidity', { verified: true, liquidity_usd: 1000 }), ok('fraud', { risk_score: 90 }), ok('gas', {})]);
  assert.equal(r.verdict, 'DO_NOT_LIST');
  assert.ok(r.findings.some((f) => f.rule === 'honeypot'));
});

test('top-10 concentration over 50% blocks listing', () => {
  const holders = Array.from({ length: 10 }, (_, i) => ({ address: `0x${i}`, percent: '6' }));
  const r = scoreReview([cleanAudit({ holders }), ok('sanctions', {}), ok('holdersPrimary', { holders_count: 5000 }), ok('holdersCross', { holders: 5000 }), ok('price', { price_usd: 2 }), ok('liquidity', { verified: true, liquidity_usd: 20000 }), ok('fraud', { risk_score: 10 }), ok('gas', {})]);
  assert.equal(r.verdict, 'DO_NOT_LIST');
  assert.ok(r.findings.some((f) => f.rule === 'holder-concentration'));
});

test('unavailable sanctions is warn, not fail', () => {
  const r = scoreReview([cleanAudit(), { check: 'sanctions', status: 'unavailable-direct', transport: 'direct', paid: false, costUsd: 0, error: 'x' }, ok('holdersPrimary', { holders_count: 12000 }), ok('holdersCross', { holders: 12000 }), ok('price', { price_usd: 1 }), ok('liquidity', { verified: true, liquidity_usd: 50000 }), ok('fraud', { risk_score: 5 }), ok('gas', {})]);
  assert.equal(r.verdict, 'LIST_WITH_CONDITIONS');
  assert.ok(r.findings.some((f) => f.rule === 'sanctions-unknown'));
});

test('fraud score scales: risk_score_100 and 0-1 risk_score', () => {
  const base = [cleanAudit(), ok('sanctions', {}), ok('holdersPrimary', { holders_count: 12000 }), ok('holdersCross', { holders: 12000 }), ok('price', { price_usd: 1 }), ok('liquidity', { verified: true, liquidity_usd: 50000 }), ok('gas', {})];
  const high = scoreReview([...base, ok('fraud', { risk_score_100: 85 })]);
  assert.equal(high.verdict, 'DO_NOT_LIST');
  const scaled = scoreReview([...base, ok('fraud', { risk_score: 0.9 })]);
  assert.equal(scaled.verdict, 'DO_NOT_LIST');
  const low = scoreReview([...base, ok('fraud', { risk_score_100: 15, risk_score: 0.15 })]);
  assert.equal(low.verdict, 'LIST');
});

test('memo carries cost line and hash', () => {
  const review = { verdict: 'LIST', score: 100, findings: [] };
  const memo = buildMemo({ token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', chain: 'base', symbol: 'USDC', name: 'USD Coin', review, results: [], transport: 'direct', totalCostUsd: 0, paid: false });
  assert.match(memo.sha256, /^[0-9a-f]{64}$/);
  assert.equal(memo.cost.totalUsd, 0);
  assert.match(memoMarkdown(memo), /Verdict: LIST/);
  assert.match(memoMarkdown(memo), /NOT a purchase/);
});

test('observed 402 challenge parses to a payable offer', () => {
  const challenge = JSON.parse(readFileSync(new URL('../evidence/telegraph-402-challenge.json', import.meta.url), 'utf8'));
  const offer = challenge.accepts.find((a) => a.scheme === 'exact' && a.network === 'eip155:84532');
  assert.ok(offer, 'Base Sepolia exact offer present');
  assert.equal(offer.price, '$0.01');
  assert.equal(offer.payTo, '0xC0A3FB6d3F1f4B54617d29ffbdA4663Af5F96e2e');
});

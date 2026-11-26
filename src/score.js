// Deterministic scoring of a listing review. No judgement calls hidden in
// prose: every point has a named rule, and the memo prints the rule with it.

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

export function scoreReview(results) {
  const byCheck = Object.fromEntries(results.map((r) => [r.check, r]));
  const findings = [];
  let score = 100;
  const penalize = (points, rule, detail, level) => {
    score -= points;
    findings.push({ rule, points: -points, level, detail });
  };

  // 1. Contract audit (GoPlus) — the heaviest weight.
  const a = byCheck.audit?.answer;
  if (byCheck.audit?.status === 'error') {
    penalize(25, 'audit-unavailable', 'Contract audit could not be fetched; listing cannot be approved blind.', 'fail');
  } else if (a) {
    if (a.is_honeypot === '1') penalize(60, 'honeypot', 'Honeypot flag set: buys succeed, sells fail.', 'fail');
    const buyTax = num(a.buy_tax), sellTax = num(a.sell_tax);
    if (buyTax !== null && buyTax > 10) penalize(25, 'buy-tax', `Buy tax ${buyTax}% exceeds the 10% desk limit.`, 'fail');
    if (sellTax !== null && sellTax > 10) penalize(25, 'sell-tax', `Sell tax ${sellTax}% exceeds the 10% desk limit.`, 'fail');
    if (buyTax !== null && buyTax > 0 && buyTax <= 10) penalize(5, 'buy-tax-small', `Buy tax ${buyTax}%.`, 'warn');
    if (sellTax !== null && sellTax > 0 && sellTax <= 10) penalize(5, 'sell-tax-small', `Sell tax ${sellTax}%.`, 'warn');
    if (a.is_mintable === '1') penalize(15, 'mintable', 'Owner can mint new supply.', 'warn');
    if (a.is_proxy === '1') penalize(10, 'proxy', 'Proxy contract: logic can change after listing.', 'warn');
    if (a.owner_address && a.owner_address !== '0x0000000000000000000000000000000000000000') {
      penalize(5, 'owner-not-renounced', `Owner is ${a.owner_address} (not renounced).`, 'warn');
    }
    if (a.can_take_back_ownership === '1') penalize(10, 'take-back-ownership', 'Ownership can be taken back.', 'warn');
    if (a.trading_cooldown === '1' || a.transfer_pausable === '1') penalize(10, 'trading-restriction', 'Trading can be paused or cooled down by the owner.', 'warn');
    if (a.is_open_source === '0') penalize(10, 'not-open-source', 'Contract source is not verified/open.', 'warn');
    if (a.selfdestruct === '1') penalize(40, 'selfdestruct', 'Contract can self-destruct.', 'fail');
    if (a.hidden_owner === '1') penalize(15, 'hidden-owner', 'Hidden owner detected.', 'warn');
  }

  // 2. Sanctions screen.
  const s = byCheck.sanctions;
  if (s?.status === 'error' || s?.status === 'unavailable-direct') {
    penalize(10, 'sanctions-unknown', 'Sanctions screen unavailable in this run; treat as unconfirmed, not as clean.', 'warn');
  } else if (s?.answer) {
    // A positive hit must be explicit: a true flag, or a phrase like
    // "match found" / "is listed". The bare word "match" also appears in
    // field names of a clean answer, so it must never count alone.
    const a = s.answer;
    const flagHit = a.matched === true || a.is_match === true || a.found === true || a.sanctioned === true || a.is_sanctioned === true;
    const txt = JSON.stringify(a).toLowerCase();
    const phraseHit = /(match found|matches found|is listed|listed on|sanctioned entity|sdn list)/.test(txt);
    if (flagHit || phraseHit) {
      penalize(60, 'sanctions-match', 'Possible sanctions-list match — see the miner answer.', 'fail');
    }
  }

  // 3. Holder concentration — two independent miners must roughly agree.
  const h1 = num(byCheck.holdersPrimary?.answer?.holders_count);
  const h2 = num(byCheck.holdersCross?.answer?.holders);
  const holders = h1 ?? h2;
  if (holders === null) {
    penalize(15, 'holders-unknown', 'Holder count could not be read from either miner.', 'warn');
  } else {
    if (holders < 100) penalize(30, 'holders-too-few', `Only ${holders} holders — no real market yet.`, 'fail');
    else if (holders < 1000) penalize(10, 'holders-few', `Only ${holders} holders.`, 'warn');
    if (h1 && h2) {
      const diff = Math.abs(h1 - h2) / Math.max(h1, h2);
      if (diff > 0.25) penalize(5, 'holders-disagree', `Miners disagree on holders (${h1.toLocaleString()} vs ${h2.toLocaleString()}).`, 'warn');
    }
  }
  const top = a?.holders || [];
  if (top.length) {
    const top10 = top.slice(0, 10).reduce((s, h) => s + (num(h.percent) || 0), 0);
    if (top10 > 50) penalize(20, 'holder-concentration', `Top 10 holders control ${top10.toFixed(1)}% of supply.`, 'fail');
    else if (top10 > 30) penalize(10, 'holder-concentration', `Top 10 holders control ${top10.toFixed(1)}% of supply.`, 'warn');
  }

  // 4. Price sanity.
  const p = num(byCheck.price?.answer?.price_usd);
  if (byCheck.price?.status === 'skipped') penalize(5, 'price-skipped', 'No symbol, so no price check ran.', 'warn');
  else if (p === null) penalize(10, 'price-unknown', 'No live price from the miner.', 'warn');

  // 5. Liquidity depth.
  const l = byCheck.liquidity?.answer;
  if (l && l.verified === false) {
    penalize(10, 'liquidity-unverified', `Liquidity could not be verified: ${String(l.summary || l.error || '').slice(0, 160)}`, 'warn');
  } else if (l && num(l.liquidity_usd) !== null) {
    if (num(l.liquidity_usd) < 10000) penalize(15, 'liquidity-thin', `Verified liquidity only $${num(l.liquidity_usd).toLocaleString()}.`, 'warn');
  } else if (byCheck.liquidity?.status === 'error') {
    penalize(10, 'liquidity-error', 'Liquidity check errored; depth is unconfirmed.', 'warn');
  }

  // 6. Fraud risk.
  const f = byCheck.fraud?.answer;
  // Sentinel returns risk_score_100 (0-100) and risk_score (0-1); other
  // miners may return score/risk on either scale. Normalise to 0-100.
  let fraudScore = num(f?.risk_score_100 ?? f?.score_100);
  if (fraudScore === null) {
    const raw = num(f?.risk_score ?? f?.score ?? f?.risk);
    fraudScore = raw === null ? null : (raw <= 1 ? raw * 100 : raw);
  }
  if (fraudScore !== null) {
    if (fraudScore >= 70) penalize(40, 'fraud-high', `Fraud risk score ${fraudScore}/100.`, 'fail');
    else if (fraudScore >= 40) penalize(15, 'fraud-medium', `Fraud risk score ${fraudScore}/100.`, 'warn');
  } else if (byCheck.fraud?.status === 'unavailable-direct' || byCheck.fraud?.status === 'error') {
    penalize(5, 'fraud-unknown', 'Fraud-risk check unavailable in this run; unconfirmed, not clean.', 'warn');
  }

  score = Math.max(0, Math.min(100, score));
  const fails = findings.filter((x) => x.level === 'fail');
  const warns = findings.filter((x) => x.level === 'warn');
  const verdict = fails.length ? 'DO_NOT_LIST' : warns.length ? 'LIST_WITH_CONDITIONS' : 'LIST';
  return { score, verdict, findings, fails: fails.length, warns: warns.length };
}

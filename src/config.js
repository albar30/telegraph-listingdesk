// ListingDesk configuration — Mission 01 (Exchange), Telegraph Hackathon S2.
// Testnet only. No mainnet chain, token, or payment is ever used here.
import { readFileSync, existsSync } from 'node:fs';

export const NODE_URL = process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com';
export const API_URL = process.env.TELEGRAPH_API_URL || 'https://backend.telegraphprotocol.com';
export const TRANSPORT = (process.env.TELEGRAPH_TRANSPORT || 'direct').toLowerCase();
export const API_KEY = process.env.TELEGRAPH_API_KEY || process.env.ANJOMAN_API_KEY || '';
export const PAYER_KEY = process.env.TELEGRAPH_PAYER_KEY || '';
export const MAX_ASK_USD = Number(process.env.TELEGRAPH_MAX_ASK_USD || 0.5);
export const DAILY_LIMIT_USD = Number(process.env.TELEGRAPH_DAILY_LIMIT_USD || 5.0);
export const PORT = Number(process.env.PORT || 8787);

// Chains the miners answer about (the *intelligence* subject). Payments always
// settle on testnets (Base Sepolia USDC for x402, Sepolia escrow for Anjoman).
export const CHAINS = {
  ethereum: { id: 1, goplusId: 1, label: 'Ethereum' },
  base: { id: 8453, goplusId: 8453, label: 'Base' },
  arbitrum: { id: 42161, goplusId: 42161, label: 'Arbitrum' },
  polygon: { id: 137, goplusId: 137, label: 'Polygon' },
  bsc: { id: 56, goplusId: 56, label: 'BNB Smart Chain' },
};

// Base Sepolia test USDC (Circle faucet token) — the x402 payment asset.
export const X402_USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const X402_CHAIN_CAIP = 'eip155:84532';

// The miners this app buys from, as listed in the live catalog
// GET https://devnode.telegraphprotocol.com/api/miners (verified 2026-11-25).
// min_price_usdc in the catalog is in micro-USDC: 10000 = $0.01 per ask.
export const MINERS = {
  audit: {
    intent: 'SMART_CONTRACT_AUDIT_GENERAL',
    id: '200001', name: 'GoPlus Security', priceUsd: 0.01,
    baseUrl: 'https://api.gopluslabs.io',
    endpoint: '/api/v1/token_security/{chainId}?contract_addresses={token}',
  },
  sanctions: {
    intent: 'SANCTIONS_SCREENING_MATCH_GENERAL',
    id: '78021', name: 'OFAC SDN Entity Screen', priceUsd: 0.01,
    baseUrl: 'https://omni-chat.13.237.89.59.sslip.io',
    endpoint: '/query?entity={entity}',
  },
  holdersPrimary: {
    intent: 'TOKEN_HOLDER_COUNT_GENERAL',
    id: '9002', name: 'TxLens', priceUsd: 0.01,
    baseUrl: 'https://telegraph-onchain-tx-lookup-miner.onrender.com',
    endpoint: '/token-holders?chain={chain}&token={token}',
  },
  holdersCross: {
    intent: 'TOKEN_HOLDER_COUNT_GENERAL',
    id: '7302', name: 'ChainWire Token Holder Count', priceUsd: 0.01,
    baseUrl: 'https://telegraph-chain.margyn.workers.dev',
    endpoint: '/holders?chain={chain}&token={token}',
  },
  price: {
    intent: 'CRYPTO_PRICE_USD',
    id: '9002', name: 'TxLens', priceUsd: 0.01,
    baseUrl: 'https://telegraph-onchain-tx-lookup-miner.onrender.com',
    endpoint: '/crypto-price?symbol={symbol}',
  },
  liquidity: {
    intent: 'LIQUIDITY_DEPTH_VERIFY_GENERAL',
    id: '7373', name: 'VerifyWire Liquidity Depth', priceUsd: 0.01,
    baseUrl: 'https://telegraph-verify.margyn.workers.dev',
    endpoint: '/depth?pair={pair}&chain={chain}&size={size}',
  },
  fraud: {
    intent: 'FRAUD_RISK_GENERAL',
    id: '501', name: 'Telegraph Sentinel Risk Intelligence', priceUsd: 0.01,
    baseUrl: 'https://telegraph-sentinel-ql8d.onrender.com',
    endpoint: '/api/v1/miner/fraud-risk',
  },
  gas: {
    intent: 'GAS_PRICE_GENERAL',
    id: '9002', name: 'TxLens', priceUsd: 0.01,
    baseUrl: 'https://telegraph-onchain-tx-lookup-miner.onrender.com',
    endpoint: '/gas-price?chain={chain}',
  },
};

export function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

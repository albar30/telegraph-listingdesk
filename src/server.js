// ListingDesk web UI — same review engine as the CLI, behind a small form.
// Serves public/index.html and two JSON endpoints. No build step.
import { loadDotEnv, PORT, TRANSPORT } from './config.js';
loadDotEnv();

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { reviewToken } from './review.js';

const INDEX = readFileSync(new URL('../public/index.html', import.meta.url));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(INDEX);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ app: 'ListingDesk', mission: '01 Exchange', transport: TRANSPORT, network: 'Telegraph testnet' }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/check') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { token, chain, pool, transport } = JSON.parse(body || '{}');
        const { memo } = await reviewToken({ token, chain: chain || 'base', pool: pool || null, transport: transport || TRANSPORT, outDir: 'evidence' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(memo));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/ledger') {
    const p = new URL('../evidence/ledger.jsonl', import.meta.url).pathname;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ledger: existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [] }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`ListingDesk on http://localhost:${PORT} (transport: ${TRANSPORT})`));

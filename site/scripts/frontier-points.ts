// Precompute the homepage efficient frontier and write src/data/frontier-points.json.
// Risk from src/data/frontier.json; expected returns market implied from the settings in src/data/frontier-config.ts.
// Run with: node --experimental-strip-types scripts/frontier-points.ts
import fs from 'node:fs';
import path from 'node:path';
import { covariance, frontier, impliedReturns, point } from '../src/components/home/frontier.ts';
import { MARKET_BY_ID, CASH, RISK_AVERSION, CAPS_BY_ID } from '../src/data/frontier-config.ts';

const here = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(fs.readFileSync(path.join(here, '../src/data/frontier.json'), 'utf8'));
const ids: string[] = data.assets.map((a: { id: string }) => a.id);
const S = covariance(data.assets.map((a: { vol: number }) => a.vol), data.corr);
const market = ids.map(id => MARKET_BY_ID[id]);
const mu = impliedReturns(S, market, RISK_AVERSION, CASH);
const caps = ids.map(id => CAPS_BY_ID[id] ?? 1);
const t0 = Date.now();
const mk = point(mu, S, market);
const F = frontier(mu, S, 61, caps, [mk.ret]);
const marketIndex = F.findIndex(p => Math.abs(p.ret - mk.ret) < 1e-9);
const r = (x: number) => Math.round(x * 1e6) / 1e6;
fs.writeFileSync(path.join(here, '../src/data/frontier-points.json'),
  JSON.stringify({ caps, market: marketIndex, points: F.map(p => ({ ret: r(p.ret), vol: r(p.vol), w: p.w.map(r), rc: p.rc.map(r) })) }) + '\n');
console.log(`frontier: ${F.length} points in ${Date.now() - t0} ms, market at ${marketIndex} (${r(mk.ret)} at ${r(mk.vol)}), ${r(F[0].ret)} at ${r(F[0].vol)} to ${r(F[F.length - 1].ret)} at ${r(F[F.length - 1].vol)}`);

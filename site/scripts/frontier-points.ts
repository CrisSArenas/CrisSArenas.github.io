// Precompute the homepage efficient frontier from src/data/frontier.json with the exact capped solver and write
// src/data/frontier-points.json. Run with: node --experimental-strip-types scripts/frontier-points.ts
import fs from 'node:fs';
import path from 'node:path';
import { covariance, frontier } from '../src/components/home/frontier.ts';

const here = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(fs.readFileSync(path.join(here, '../src/data/frontier.json'), 'utf8'));
const CAPS_BY_ID: Record<string, number> = { pe: 0.20, re: 0.15, hf: 0.15, em: 0.15 };
const mu = data.assets.map((a: { ret: number }) => a.ret);
const S = covariance(data.assets.map((a: { vol: number }) => a.vol), data.corr);
const caps = data.assets.map((a: { id: string }) => CAPS_BY_ID[a.id] ?? 1);
const t0 = Date.now();
const F = frontier(mu, S, 61, caps);
const r = (x: number) => Math.round(x * 1e6) / 1e6;
fs.writeFileSync(path.join(here, '../src/data/frontier-points.json'),
  JSON.stringify({ caps, points: F.map(p => ({ ret: r(p.ret), vol: r(p.vol), w: p.w.map(r), rc: p.rc.map(r) })) }) + '\n');
console.log(`frontier: ${F.length} points in ${Date.now() - t0} ms, ${r(F[0].ret)} at ${r(F[0].vol)} to ${r(F[F.length - 1].ret)} at ${r(F[F.length - 1].vol)}`);

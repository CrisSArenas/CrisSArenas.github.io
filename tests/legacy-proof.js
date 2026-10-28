// Proof that the math extracted into assets/js/pm-math.js reproduces the original demo pages
// exactly. The original code is read from the backup commit (bbdb266, tag of the site before
// the rebuild), the named functions and constants are lifted out of each page's script,
// evaluated in a sandbox, and compared with the library on identical inputs.
// Usage: node tests/legacy-proof.js
const { execSync } = require('child_process');
const vm = require('vm');
const path = require('path');
global.window = undefined;
require(path.join(__dirname, '../assets/js/pm-math.js'));
const PM = globalThis.PM;
const BASE = 'bbdb266';
const src = f => execSync(`git show ${BASE}:${f}`, { cwd: path.join(__dirname, '..'), maxBuffer: 1 << 26 }).toString();

// lift a top-level `function name(...) {...}` or `const|var|let name = ...;` out of a script
function lift(code, name) {
  let m = new RegExp(`(^|\\n)\\s*function ${name}\\s*\\(`).exec(code);
  let start;
  if (m) start = m.index + m[1].length;
  else {
    m = new RegExp(`(^|\\n)\\s*(const|var|let)\\s+([^;\\n]*?[\\s,])?${name}\\s*=`).exec(code);
    if (!m) throw new Error('not found: ' + name);
    start = m.index + m[1].length;
  }
  let i = code.indexOf(m[0].includes('function') ? '{' : '=', start), depth = 0, inStr = null;
  if (!m[0].includes('function')) { // const: read to the ';' at depth 0
    for (; i < code.length; i++) {
      const c = code[i];
      if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'" || c === '`') inStr = c;
      else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === ';' && depth === 0) return code.slice(start, i + 1).replace(/^\s*const\s/, 'var ').replace(/^\s*let\s/, 'var ');
    }
  }
  for (; i < code.length; i++) {
    const c = code[i];
    if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
    if (c === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2) + 1; continue; }
    if (c === '/' && code[i + 1] === '/') { i = code.indexOf('\n', i); continue; }
    if (c === '"' || c === "'" || c === '`') inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return code.slice(start, i + 1); }
  }
  throw new Error('unbalanced: ' + name);
}
function sandbox(code, names, extra) {
  const ctx = vm.createContext(Object.assign({ Math, Float64Array, Array, Object, JSON, Number, isFinite, isNaN, Infinity }, extra || {}));
  ctx.__code = code;
  names.forEach(n => load(ctx, n));
  return ctx;
}
// load a name into the sandbox, pulling in whatever it references until it evaluates
function load(ctx, name) {
  for (let k = 0; k < 60; k++) {
    try { vm.runInContext(lift(ctx.__code, name), ctx); return; }
    catch (e) { const m = /(\w+) is not defined/.exec(e.message); if (!m || m[1] === name) throw e; load(ctx, m[1]); }
  }
}
// call fn in the sandbox, lifting any missing dependency it hits
function call(ctx, fn) {
  for (let k = 0; k < 60; k++) {
    try { return fn(); }
    catch (e) { const m = /(\w+) is not defined/.exec(e.message); if (!m) throw e; load(ctx, m[1]); }
  }
}
const script = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

let checks = 0, fails = 0;
function same(a, b, what, tol = 0) {
  checks++;
  const bad = (x, y) => (typeof x === 'number' ? !(x === y || Math.abs(x - y) <= tol * Math.max(1, Math.abs(y)) || (isNaN(x) && isNaN(y))) : false);
  const walk = (x, y, p) => {
    if (x && typeof x === 'object') { for (const k of Object.keys(y)) if (walk(x[k], y[k], p + '.' + k)) return true; return false; }
    if (bad(x, y)) { console.log(`  FAIL ${what}${p}: legacy ${y}, library ${x}`); return true; }
    return false;
  };
  if (walk(a, b, '')) fails++;
}
function table(rows) { console.log(rows.map(r => '  ' + r.map(c => String(c).padEnd(16)).join('')).join('\n')); }

/* ---------- 1. Pacing and IRR (macro-regime-dashboard.html) ---------- */
{
  const code = script(src('macro-regime-dashboard.html'));
  const ctx = sandbox(code, ['solveIRR', 'STRAT']);
  const body = code.slice(code.indexOf('const data=[{y:0,cal:0,dist:0,nav:0,cf:0}]'), code.indexOf('const netIrr=solveIRR(lpCf),netTvpi=lpOut>0?lpDist/lpOut:0;') + 'const netIrr=solveIRR(lpCf),netTvpi=lpOut>0?lpDist/lpOut:0;'.length);
  const legacy = vm.runInContext(`(function(commit,RC,IP,L,G,B,Y){IP=Math.min(IP,L);${body}
    const fn=data[L].nav,td=data[L].dist,tvpi=calC>0?(td+fn)/calC:0,peak=-Math.min(0,...data.map(d=>d.cf));
    let be=null;for(let i=1;i<=L;i++){if(data[i].cf>=0){be=i;break;}}
    const irr=solveIRR(cfs),navPerCommit=commit>0?navYears/commit:0,ssPct=navPerCommit>0?STRAT[5]/navPerCommit:0;
    return {data,cfs,lpCf,netIrr,netTvpi,feeTot,tvpi,peak,be,irr,ssPct};})`, ctx);
  console.log('\n1. Takahashi-Alexander pacing, net-of-fee waterfall and IRR vs the original pacing panel');
  const rows = [['commit/rc/ip/L', 'net IRR old', 'net IRR new', 'TVPI old', 'TVPI new']];
  let n = 0;
  for (const commit of [50, 100, 250]) for (const rc of [0.2, 0.35, 0.6]) for (const ip of [3, 5, 7]) for (const L of [8, 12, 15]) for (const g of [0.05, 0.13, 0.25]) for (const bow of [1, 2.5, 4]) for (const y of [0, 0.05]) {
    const old = legacy(commit, rc, ip, L, g, bow, y);
    const f = PM.taFund({ commit, rc, ip, life: L, growth: g, bow, yieldFloor: y });
    const net = PM.taNetOfFees(f, { commit, mgmt: 0.02, carry: 0.2, pref: 0.08 });
    const sm = PM.taSummary(f, commit, 10);
    same({ data: f.data, cfs: f.cfs, lpCf: net.lpCf, netIrr: net.netIrr, netTvpi: net.netTvpi, feeTot: net.feeTot, tvpi: sm.tvpi, peak: sm.peakOutlay, be: sm.breakEvenYear, irr: sm.irr, ssPct: sm.ssPct },
      { data: old.data, cfs: old.cfs, lpCf: old.lpCf, netIrr: old.netIrr, netTvpi: old.netTvpi, feeTot: old.feeTot, tvpi: old.tvpi, peak: old.peak, be: old.be, irr: old.irr, ssPct: old.ssPct }, `pacing ${commit}/${rc}/${ip}/${L}/${g}/${bow}/${y}`);
    if (n++ % 400 === 0) rows.push([`${commit}/${rc}/${ip}/${L}`, (old.netIrr * 100).toFixed(6) + '%', (net.netIrr * 100).toFixed(6) + '%', old.tvpi.toFixed(6), sm.tvpi.toFixed(6)]);
  }
  table(rows);
  console.log(`  ${n} input combinations compared, every output identical (tolerance 0)`);
  for (const c of [[-1000, 300, 400, 500], [-100, 30, 30, 30, 30], [-10, -10, 5, 8, 12, 2]]) same(PM.irrLegacy(c), ctx.solveIRR(c), 'IRR ' + c);

  /* Brinson attribution: the original computeBrinson's attribution block, lifted verbatim and
     wrapped as a function of weights and returns (its inputs come from the dashboard's regime engine) */
  const fnSrc = lift(code, 'computeBrinson');
  const block = fnSrc.slice(fnSrc.indexOf('let alloc=0'), fnSrc.lastIndexOf('}'));
  const legacyB = vm.runInContext(`(function(wp,wb,rp,rb){${block}})`, vm.createContext({ Math }));
  console.log('\n2. Brinson attribution vs the original computeBrinson');
  const r = PM.mulberry32(9);
  let k = 0;
  for (; k < 500; k++) {
    const n = 8, raw = Array.from({ length: n }, () => r()), s1 = raw.reduce((a, b) => a + b, 0);
    const wb = raw.map(x => x / s1), wp = wb.map(x => Math.max(0, x + (r() - 0.5) * 0.08)), sp = wp.reduce((a, b) => a + b, 0);
    const wpn = wp.map(x => x / sp), rb = Array.from({ length: n }, () => (r() - 0.45) * 0.1), rp = rb.map(x => x + (r() - 0.5) * 0.02);
    const o = legacyB(wpn, wb, rp, rb), nw = PM.brinson(wpn, wb, rp, rb);
    same({ alloc: nw.alloc, sel: nw.sel, inter: nw.inter, total: nw.total, resid: nw.resid }, { alloc: o.alloc, sel: o.sel, inter: o.inter, total: o.total, resid: o.resid }, 'brinson ' + k);
  }
  console.log(`  ${k} random portfolios: allocation, selection, interaction, total and residual identical`);
}

/* ---------- 3. Optimizer (portfolio-optimizer.html) ---------- */
{
  const code = script(src('portfolio-optimizer.html'));
  const names = ['N', 'T', 'PATHS', 'MU_CMA', 'VOL_REPORTED', 'AUTOCORR', 'PRIV_I', 'PUB_I', 'CORR', 'CASH_I', 'MAX_CASH', 'A_EQ', 'A_GROWTH', 'ILLIQ_W', 'MIN_EQ_TARGET', 'MIN_GROWTH_TARGET',
    'IPS_LO', 'IPS_HI', 'rng32', 'volVec', 'corrMat', 'genData', 'eqFloor', 'growthFloor', 'boxVec', 'projBox', 'dot', 'projLE', 'projGE', 'illiqUsed', 'feasible', 'projOpt',
    'portMu', 'portVol', 'sharpe', 'riskContrib', 'pathStats', 'mvSolve', 'maxSharpeSolve', 'randomCloud', 'buildFrontier', 'PRESETS'];
  const ctx = sandbox(code, names);
  call(ctx, () => vm.runInContext("var APP={state:{seed:100,rf:.0375,policy:true,maxW:.35,targetVol:.11,illiq:.28,spend:.045,desmooth:true},data:null,fcache:null};APP.data=genData(APP.state.seed);", ctx));
  console.log('\n3. Optimizer vs the original Multi-Asset Portfolio Optimizer');
  const st = ctx.APP.state, N = 8;
  const mu = ctx.MU_CMA.map(m => m === null ? st.rf : m), vol = ctx.volVec(true), C = ctx.corrMat(true);
  const D = PM.opt.genPanel({ mu, vol, corr: C, T: 180, paths: 200, seed: 100 });
  let eq = D.panel.length === ctx.APP.data.panel.length;
  for (let i = 0; eq && i < D.panel.length; i++) if (D.panel[i] !== ctx.APP.data.panel[i]) eq = false;
  checks++; if (!eq) { fails++; console.log('  FAIL Monte Carlo panel'); }
  console.log(`  Monte Carlo panel: ${D.panel.length.toLocaleString()} simulated monthly returns, ${eq ? 'bit-for-bit identical' : 'DIFFERENT'}`);
  same(D.Sigma, ctx.APP.data.Sigma, 'Sigma');
  function projFor(pol, mxW, budget) {
    const B = ctx.boxVec(mxW, pol), le = [{ a: Array.from(ctx.ILLIQ_W), b: budget }];
    const ge = pol ? [{ a: Array.from(ctx.A_EQ), b: ctx.eqFloor(mxW) }, { a: Array.from(ctx.A_GROWTH), b: ctx.growthFloor(mxW, budget) }] : [];
    return PM.opt.makeProjector({ lo: B.lo, hi: B.hi, le, ge });
  }
  const rng = PM.mulberry32(5);
  let np = 0;
  for (const pol of [true, false]) for (const mxW of [0.25, 0.35, 0.5]) {
    st.policy = pol; st.maxW = mxW;
    const proj = projFor(pol, mxW, st.illiq);
    for (let k = 0; k < 25; k++) { const x = Array.from({ length: N }, () => rng() * 0.6 - 0.1); same(proj(x), ctx.projOpt(x, mxW, pol), 'projection'); np++; }
    const w0 = new Array(N).fill(1 / N);
    same(PM.opt.mvSolve(mu, D.Sigma, 3, proj, w0, 160), ctx.mvSolve(mu, ctx.APP.data.Sigma, 3, mxW, pol, w0, 160), 'mvSolve');
    same(PM.opt.maxSharpeSolve(mu, D.Sigma, st.rf, proj, w0, 200), ctx.maxSharpeSolve(mu, ctx.APP.data.Sigma, st.rf, mxW, pol, w0, 200), 'maxSharpe');
    ctx.APP.fcache = null;
    const oldF = ctx.buildFrontier(), newF = PM.opt.frontier(mu, D.Sigma, st.rf, proj, st.seed);
    same(newF.curve.map(p => [p.r, p.v]), oldF.curve.map(p => [p.r, p.v]), `frontier pol=${pol} cap=${mxW}`);
  }
  console.log(`  ${np} feasible-set projections, 6 mean-variance solves, 6 maximum-Sharpe solves and 6 full frontiers identical`);
  const w = [0.24, 0.13, 0.06, 0.15, 0.14, 0.06, 0.19, 0.03];
  same(PM.opt.pathStats(w, D, st.rf), ctx.pathStats(w), 'pathStats');
  same(PM.opt.riskContrib(w, D.Sigma), ctx.riskContrib(w, ctx.APP.data.Sigma), 'riskContrib');
  same(PM.opt.riskParity(D.Sigma, 7), ctx.PRESETS.riskparity(), 'risk parity');
  same(vol, ctx.VOL_REPORTED.map((v, i) => PM.desmoothedVol(v, ctx.AUTOCORR[i])), 'Geltner volatility');
  const ps = PM.opt.pathStats(w, D, st.rf);
  console.log(`  path statistics identical (VaR95 ${ps.var95.toFixed(4)}%, CVaR95 ${ps.cvar95.toFixed(4)}%, median max drawdown ${ps.mddMed.toFixed(4)}%), risk parity and de-smoothed vols identical`);
}

/* ---------- 4. Portable alpha (portable-alpha-simulator.html) ---------- */
{
  const code = script(src('portable-alpha-simulator.html'));
  const ctx = sandbox(code, ['mulberry32', 'makeNormal', 'REG', 'CRISIS_SHARE', 'MONTHS', 'TRADE_COST', 'structure', 'supportable', 'simulate', 'cumulative', 'calcStats', 'annComp', 'SWEEP_N', 'sweepCache', 'seedSweep']);
  console.log('\n4. Portable alpha engine vs the original Portable Alpha Simulator');
  let n = 0;
  for (const seed of [1, 42, 777]) for (const alphaAlloc of [0.3, 0.5, 0.8]) for (const stressFreq of [0, 0.15, 0.4]) for (const betaNotional of [0.8, 1, 1.3]) {
    const p = Object.assign({}, PM.pa.DEFAULT_PARAMS, { seed, alphaAlloc, stressFreq, betaNotional });
    const a = PM.pa.simulate(p), b = ctx.simulate(p);
    same(a, b, 'simulate ' + JSON.stringify({ seed, alphaAlloc, stressFreq, betaNotional }));
    same(PM.pa.calcStats(a.paRet, a.benchRets, p.cashRate), ctx.calcStats(b.paRet, b.benchRets, p.cashRate), 'calcStats');
    n++;
  }
  same(PM.pa.seedSweep(PM.pa.DEFAULT_PARAMS), ctx.seedSweep(PM.pa.DEFAULT_PARAMS), 'seedSweep');
  const s = PM.pa.calcStats(PM.pa.simulate(PM.pa.DEFAULT_PARAMS).paRet, PM.pa.simulate(PM.pa.DEFAULT_PARAMS).benchRets, 0.04);
  console.log(`  ${n} parameter sets: every monthly return, margin call, de-leveraging event and statistic identical; 96-seed sweep identical`);
  console.log(`  default programme: CAGR ${(s.cagr * 100).toFixed(4)}%, IR ${s.ir.toFixed(4)}, tracking error ${(s.te * 100).toFixed(4)}%`);
}

console.log(`\n${checks - fails} of ${checks} comparisons identical${fails ? `, ${fails} differ` : ''}`);
process.exit(fails ? 1 : 0);

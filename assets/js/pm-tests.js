/* =====================================================================
   pm-tests.js, known-answer tests for assets/js/pm-math.js.
   Browser: /tests.html and the model tests badge on every demo.
   Node: node tests/run.js
   Each test returns nothing on success and throws on failure.
   ===================================================================== */
(function (root) {
  'use strict';
  var PM = root.PM;
  var T = root.PMTests = { list: [] };
  T.add = function (group, name, fn, demo) { T.list.push({ group: group, name: name, fn: fn, demo: demo || group }); };
  function near(a, b, tol, what) {
    tol = tol == null ? 1e-9 : tol;
    if (!(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)))) throw new Error((what || 'value') + ': got ' + a + ', expected ' + b + ' (tol ' + tol + ')');
  }
  function ok(c, what) { if (!c) throw new Error(what || 'assertion failed'); }
  T.near = near; T.ok = ok;
  /** run(filter) -> {total, passed, failed, results}. filter: demo name, or a function */
  T.run = function (filter) {
    var res = [];
    T.list.forEach(function (t) {
      if (filter && (typeof filter === 'function' ? !filter(t) : (t.demo !== filter && t.group !== 'Core'))) return;
      var r = { group: t.group, name: t.name, demo: t.demo, ok: true, error: null }, t0 = Date.now();
      try { t.fn(PM); } catch (e) { r.ok = false; r.error = e.message; }
      r.ms = Date.now() - t0;
      res.push(r);
    });
    var passed = res.filter(function (r) { return r.ok; }).length;
    return { total: res.length, passed: passed, failed: res.length - passed, results: res };
  };

  /* ---------------- Core: cash flows ---------------- */
  T.add('Core', 'IRR of -100 then 110 is 10%', function () { near(PM.irr([-100, 110]), 0.10, 1e-10); });
  T.add('Core', 'IRR of -100, 0, 121 is 10%', function () { near(PM.irr([-100, 0, 121]), 0.10, 1e-10); });
  T.add('Core', 'IRR of -1000, 300, 400, 500 is 8.8963%', function () { near(PM.irr([-1000, 300, 400, 500]), 0.0889633947, 1e-8); });
  T.add('Core', 'IRR is NaN when flows never change sign', function () { ok(isNaN(PM.irr([-100, -5])), 'expected NaN'); });
  T.add('Core', 'IRR falls back to bisection for a deep loss', function () {
    var r = PM.irr([-100, 0, 0, 0, 0, 2]); near(PM.npv(r, [-100, 0, 0, 0, 0, 2]), 0, 1e-8, 'NPV at root'); near(r, Math.pow(0.02, 1 / 5) - 1, 1e-8);
  });
  T.add('Core', 'XIRR on a one-year round trip is 10%', function () {
    near(PM.xirr([{ date: new Date(Date.UTC(2025, 0, 1)), amount: -100 }, { date: new Date(Date.UTC(2026, 0, 1)), amount: 110 }]), 0.10, 1e-9);
  });
  T.add('Core', 'Legacy IRR solver matches the general solver', function () {
    [[-1000, 300, 400, 500], [-100, 20, 30, 40, 50], [-50, -50, 40, 40, 40]].forEach(function (c) { near(PM.irrLegacy(c), PM.irr(c), 1e-9); });
  });
  T.add('Core', 'TVPI, DPI and RVPI from hand-checked flows', function () {
    var m = PM.multiples([-60, -40, 30, 50], 70);
    near(m.tvpi, 1.5); near(m.dpi, 0.8); near(m.rvpi, 0.7);
  });
  T.add('Core', 'KS-PME equals 1 when fund flows replicate the index', function () {
    var idx = [100, 108, 97, 115, 124, 130], flows = [{ t: 0, amount: -50 }, { t: 1, amount: -50 }, { t: 3, amount: 50 * 115 / 100 }];
    var nav = 50 * 130 / 108 + 0;
    near(PM.ksPME(flows, idx, nav), 1, 1e-12);
  });
  T.add('Core', 'Direct Alpha is 0 when fund flows replicate the index', function () {
    var idx = [100, 108, 97, 115, 124, 130], flows = [{ t: 0, amount: -50 }, { t: 1, amount: -50 }, { t: 3, amount: 50 * 115 / 100 }];
    near(PM.directAlpha(flows, idx, 50 * 130 / 108), 0, 1e-9);
  });
  T.add('Core', 'Direct Alpha recovers a constant 2% excess per period', function () {
    var idx = [100, 105, 110, 104, 120], a = 0.02, flows = [{ t: 0, amount: -100 }];
    near(PM.directAlpha(flows, idx, 100 * (120 / 100) * Math.pow(1 + a, 4)), a, 1e-9);
  });
  /* ---------------- Core: smoothing ---------------- */
  T.add('Core', 'Geltner desmoothing round trip', function () {
    var rng = PM.mulberry32(7), z = PM.normalGen(rng), tru = [];
    for (var i = 0; i < 40; i++) tru.push(0.02 + 0.05 * z());
    var back = PM.geltnerDesmooth(PM.geltnerSmooth(tru, 0.6), 0.6);
    back.forEach(function (v, i) { near(v, tru[i], 1e-12, 'period ' + i); });
  });
  T.add('Core', 'Desmoothed volatility formula', function () { near(PM.desmoothedVol(0.10, 0.5), 0.10 * Math.sqrt(3)); });
  T.add('Core', 'GLM unsmoothing recovers the true series', function () {
    var rng = PM.mulberry32(11), z = PM.normalGen(rng), tru = [], th = [0.6, 0.3, 0.1];
    for (var i = 0; i < 60; i++) tru.push(0.01 + 0.03 * z());
    var back = PM.glmUnsmooth(PM.glmSmooth(tru, th), th);
    for (i = 2; i < 60; i++) near(back[i], tru[i], 1e-9, 'period ' + i);
  });
  T.add('Core', 'GLM theta recovered from its own autocorrelations', function () {
    var th = [0.6, 0.3, 0.1], S = 0.36 + 0.09 + 0.01, r1 = (0.6 * 0.3 + 0.3 * 0.1) / S, r2 = 0.06 / S;
    var est = PM.glmTheta(r1, r2); est.forEach(function (v, i) { near(v, th[i], 2e-3, 'theta' + i); });
  });
  T.add('Core', 'Cholesky reproduces the matrix', function () {
    var A = [[4, 2, 0.4], [2, 5, 1], [0.4, 1, 3]], L = PM.cholesky(A), LLt = PM.matMul(L, PM.transpose(L));
    A.forEach(function (r, i) { r.forEach(function (v, j) { near(LLt[i][j], v, 1e-12); }); });
  });
  T.add('Core', 'OLS recovers exact coefficients', function () {
    var X = [], y = [];
    for (var i = 0; i < 20; i++) { var a = Math.sin(i), b = Math.cos(i * 1.3); X.push([a, b]); y.push(0.5 + 2 * a - 1.5 * b); }
    var f = PM.ols(y, X); near(f.alpha, 0.5, 1e-10); near(f.beta[0], 2, 1e-10); near(f.beta[1], -1.5, 1e-10);
  });
  T.add('Core', 'Normal CDF and inverse at known points', function () {
    near(PM.normCdf(0), 0.5, 1e-9); near(PM.normCdf(1.959964), 0.975, 2e-7); near(PM.normInv(0.975), 1.959964, 1e-6); near(PM.normInv(0.5), 0, 1e-12);
  });
  T.add('Core', 'HAC standard error equals the plain one with zero lags', function () {
    var a = [0.01, -0.02, 0.03, 0.015, -0.005, 0.02, 0.01], n = a.length, m = PM.mean(a), g = 0;
    a.forEach(function (x) { g += (x - m) * (x - m); });
    near(PM.hacSE(a, 0), Math.sqrt(g / n / n), 1e-12);
  });
  T.add('Core', 'Capital call coverage and liquidity on a hand example', function () {
    near(PM.callCoverage(700, 300, 50), 2); ok(PM.callCoverage(10, 0, 0) === Infinity, 'no calls -> infinite');
    near(PM.liquidWithin([40, 30, 20, 10], [2, 5, 90, 365], 10), 70);
  });
  /* ---------------- Pacing ---------------- */
  T.add('Pacing', 'Takahashi-Alexander gross IRR equals NAV growth (identity)', function () {
    [0.05, 0.13, 0.3].forEach(function (g) { near(PM.irrLegacy(PM.taFund({ commit: 100, rc: 0.35, ip: 5, life: 12, growth: g, bow: 2.5, yieldFloor: 0 }).cfs), g, 1e-7, 'G=' + g); });
  }, 'Private Capital Lab');
  T.add('Pacing', 'Takahashi-Alexander called plus expired equals commitment', function () {
    var f = PM.taFund({ commit: 100, rc: 0.35, ip: 5, life: 12, growth: 0.13, bow: 2.5, yieldFloor: 0 });
    near(f.called + f.uncalledAtEnd, 100, 1e-12);
    near(f.calls[1], 35); near(f.calls[2], 22.75); near(f.called, 100 * (1 - Math.pow(0.65, 5)), 1e-12);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Steady state: equal annual commitments hold NAV per commitment constant', function () {
    var f = PM.taFund({ commit: 1, rc: 0.3, ip: 5, life: 10, growth: 0.1, bow: 2, yieldFloor: 0.05 });
    var program = function (year) { var s = 0; for (var v = 0; v <= year; v++) { var age = year - v; if (age >= 1 && age <= 10) s += f.nav[age]; } return s; };
    near(program(15), program(25), 1e-12, 'program NAV in two steady-state years'); near(program(20), f.navYears, 1e-12, 'equals the sum of one vintage NAVs');
  }, 'Private Capital Lab');

  var PO = { pub0: 735, funds: [{ unfunded: 80, nav: 100, age: 3 }, { unfunded: 60, nav: 80, age: 2 }, { unfunded: 10, nav: 52, age: 6 }], model: { rc: 0.3, ip: 5, life: 12, growth: 0.11, bow: 2.5 }, pubReturn: 0.065, spend: 0.045, years: 10, targetPct: 0.25, horizon: 4 };
  T.add('Pacing', 'Pacing plan puts the private share on target at the horizon', function () {
    var P = PM.priv.pacingPlan(PO), cs = [P[0].commit, P[0].commit, P[0].commit, P[0].commit];
    var rows = PM.priv.project(Object.assign({}, PO, { years: 4 }), cs);
    near(rows[3].pct, 0.25, 1e-6);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Monte Carlo with no volatility tracks the deterministic plan', function () {
    var P = PM.priv.pacingPlan(PO), mc = PM.priv.pacingMC(Object.assign({}, PO, { plan: P.map(function (r) { return r.commit; }), quarters: 40, seed: 1, paths: 20, pubMu: 0.065, pubVol: 0, privBeta: 0.6, privVol: 0, callVol: 0, distBeta: 0, band: [0.2, 0.3], liquidPctOfPublic: 0.7, coverageMin: 1 }));
    [3, 7, 11, 15, 19].forEach(function (q) { var y = (q + 1) / 4 - 1; ok(Math.abs(mc.pctQ.p50[q] - P[y].pct) < 0.006, 'year ' + (y + 1) + ': MC ' + mc.pctQ.p50[q] + ' plan ' + P[y].pct); });
  }, 'Private Capital Lab');
  T.add('Pacing', 'Reconciliation identity: opening + calls - distributions + gains = closing', function () {
    var r = PM.priv.rollForward({ opening: 31.4125, contributions: 1.85, distributions: 2.4, gains: 1.874 - 0.175 - 0.0425, closing: 32.519 });
    near(r.break, 0, 1e-9); near(PM.priv.rollForward({ opening: 22.15, contributions: 0.9, distributions: 1.35, gains: 0.73 - 0.08, closing: 23.05 }).break, 0.70, 1e-9);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Nowcast equals the reported NAV when the proxy return and cash flows are zero', function () {
    var n = PM.priv.nowcast({ nav: 42.5, flows: [], proxy: [0, 0], betas: [0.5, 0.3, 0.1], proxyBefore: [0, 0], alpha: 0, sigma: 0.04 });
    near(n.nav, 42.5, 1e-12);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Nowcast catch-up and stale-quarter roll on a hand example', function () {
    var n = PM.priv.nowcast({ nav: 100, flows: [{ q: 1, amount: 5 }], proxy: [-0.10], betas: [0.5, 0.3, 0.1], proxyBefore: [-0.05, 0.02], alpha: 0 });
    var catchUp = (0.3 + 0.1) * -0.05 + 0.1 * 0.02;
    near(n.nav, (100 * (1 + catchUp) + 5) * (1 - 0.09), 1e-12);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Distributed-lag nowcast fit recovers known betas', function () {
    var rng = PM.mulberry32(3), z = PM.normalGen(rng), px = [], nv = [];
    for (var t = 0; t < 80; t++) px.push(0.02 + 0.07 * z());
    for (t = 0; t < 80; t++) nv.push(0.01 + 0.5 * px[t] + 0.3 * (px[t - 1] || 0) + 0.1 * (px[t - 2] || 0) + 0.0001 * z());
    var f = PM.priv.nowcastFit(nv, px, 2);
    near(f.betas[0], 0.5, 2e-3); near(f.betas[1], 0.3, 2e-3); near(f.betas[2], 0.1, 2e-3);
  }, 'Private Capital Lab');
  T.add('Pacing', 'Evergreen gate never pays out above the redemption limit', function () {
    var req = [0.02, 0.15, 0.2, 0.25, 0.1, 0.02, 0, 0], ret = [0.01, -0.08, -0.04, 0.0, 0.02, 0.02, 0.02, 0.02];
    var e = PM.priv.evergreen({ nav0: 1000, sleevePct: 0.1, facility: 50, limitPct: 0.05, requests: req, returns: ret, sleeveReturn: 0.04, saleDiscount: 0.15, facilityRate: 0.07 });
    e.rows.forEach(function (r) { ok(r.paid <= r.cap + 1e-9, 'quarter ' + r.q + ' paid ' + r.paid + ' above limit ' + r.cap); });
    ok(e.rows.some(function (r) { return r.gated; }), 'stress should gate');
    near(PM.sum(e.rows.map(function (r) { return r.requested; })), PM.sum(e.rows.map(function (r) { return r.paid; })) + e.rows[e.rows.length - 1].queue, 1e-9);
  }, 'Private Capital Lab');
  /* ---------------- Allocation ---------------- */
  var SIG4 = [[0.0256, 0.0112, 0.0048, 0.0010], [0.0112, 0.0324, 0.0060, 0.0015], [0.0048, 0.0060, 0.0225, 0.0020], [0.0010, 0.0015, 0.0020, 0.0036]];
  var MU4 = [0.07, 0.08, 0.075, 0.04];
  T.add('Allocation', 'Optimizer weights sum to 1 and respect bounds', function () {
    var lo = [0.05, 0, 0.1, 0], hi = [0.5, 0.4, 0.45, 0.3], proj = PM.opt.makeProjector({ lo: lo, hi: hi, le: [{ a: [0, 1, 1, 0], b: 0.55 }] });
    [0, 2, 6].forEach(function (lam) {
      var w = PM.opt.mvSolve(MU4, SIG4, lam, proj, [0.25, 0.25, 0.25, 0.25], 300);
      near(PM.sum(w), 1, 1e-9, 'sum');
      w.forEach(function (v, i) { ok(v >= lo[i] - 1e-9 && v <= hi[i] + 1e-9, 'bound ' + i + ': ' + v); });
      ok(w[1] + w[2] <= 0.55 + 1e-6, 'group limit');
    });
    var ms = PM.opt.maxSharpeSolve(MU4, SIG4, 0.03, proj, [0.25, 0.25, 0.25, 0.25], 400);
    near(PM.sum(ms), 1, 1e-9, 'max Sharpe sum');
  }, 'Allocation Lab');
  T.add('Allocation', 'Box projection is exact on a hand example', function () {
    var w = PM.opt.projBox([0.7, 0.5, -0.2], [0, 0, 0], [0.6, 0.6, 0.6]);
    near(w[0], 0.6, 1e-9); near(w[1], 0.4, 1e-9); near(w[2], 0, 1e-9);
  }, 'Allocation Lab');
  T.add('Allocation', 'Brinson components sum to the active return', function () {
    var b = PM.brinson([0.5, 0.3, 0.2], [0.4, 0.4, 0.2], [0.10, 0.02, 0.05], [0.08, 0.03, 0.04]);
    near(b.alloc + b.sel + b.inter, 0.5 * 0.10 + 0.3 * 0.02 + 0.2 * 0.05 - (0.4 * 0.08 + 0.4 * 0.03 + 0.2 * 0.04), 1e-12);
    near(b.alloc, 0.1 * 0.08 - 0.1 * 0.03, 1e-12); near(b.sel, 0.4 * 0.02 + 0.4 * -0.01 + 0.2 * 0.01, 1e-12);
  }, 'Allocation Lab');
  T.add('Allocation', 'Black-Litterman with no views returns the equilibrium', function () {
    var w = [0.4, 0.3, 0.2, 0.1], bl = PM.opt.blackLitterman(SIG4, w, 2.5, 0.05, [], []);
    bl.mu.forEach(function (v, i) { near(v, 2.5 * PM.dot(SIG4[i], w), 1e-12); });
  }, 'Allocation Lab');
  T.add('Allocation', 'Black-Litterman with a near-certain view moves the view portfolio to the view', function () {
    var w = [0.4, 0.3, 0.2, 0.1], P = [[1, -1, 0, 0]], bl = PM.opt.blackLitterman(SIG4, w, 2.5, 0.05, P, [0.03], [1e-10]);
    near(bl.mu[0] - bl.mu[1], 0.03, 1e-6);
  }, 'Allocation Lab');
  T.add('Allocation', 'Total portfolio: active risk contributions sum to active volatility', function () {
    var t = PM.opt.tpa([0.5, 0.2, 0.2, 0.1], [0.6, 0, 0, 0.4], SIG4);
    near(PM.sum(t.ctrActive), t.activeVol, 1e-12);
  }, 'Allocation Lab');
  T.add('Allocation', 'Rebalancing trades net to zero and land inside the bands', function () {
    var r = PM.opt.rebalance([0.50, 0.20, 0.18, 0.12], [0.45, 0.25, 0.20, 0.10], [0.02, 0.02, 0.03, 0.02]);
    near(PM.sum(r.trade), 0, 1e-12); near(r.after[0], 0.47, 1e-12); near(r.after[1], 0.23, 1e-12);
  }, 'Allocation Lab');
  T.add('Allocation', 'Liquidity after stress is linear and matches a hand example', function () {
    var l = PM.opt.liquidAfterStress([0.5, 0.3, 0.2], [1, 0, 1], [-0.4, -0.2, 0.05]);
    near(l.value, 0.5 * 0.6 + 0.2 * 1.05, 1e-12); near(PM.dot(l.coeffs, [0.5, 0.3, 0.2]), l.value, 1e-12);
  }, 'Allocation Lab');
  T.add('Allocation', 'Candidate change that cuts risk and adds return dominates', function () {
    var c = PM.opt.candidate([0.6, 0.4], [-0.1, 0.1], [0.05, 0.06], [[0.04, 0], [0, 0.01]], [0.6, 0.4]);
    ok(c.dRet > 0 && c.dVol < 0 && c.ratio === Infinity, 'expected dominance');
  }, 'Allocation Lab');
  T.add('Allocation', 'Regime tilt is the probability-weighted tilt', function () {
    var t = PM.opt.regimeTilt([0.25, 0.75], [[0.02, -0.02], [-0.04, 0.04]], 0.5);
    near(t[0], 0.5 * (0.25 * 0.02 - 0.75 * 0.04), 1e-12); near(t[0] + t[1], 0, 1e-12);
  }, 'Allocation Lab');
  /* ---------------- Manager research ---------------- */
  var DEALS = [{ invested: 10, realized: 30, unrealized: 0 }, { invested: 10, realized: 15, unrealized: 0 }, { invested: 10, realized: 5, unrealized: 0 }, { invested: 20, realized: 10, unrealized: 18 }];
  T.add('Manager research', 'Concentration metrics match hand calculations', function () {
    var t = PM.mgr.trackRecord(DEALS);
    near(t.moic, 78 / 50); near(t.gains, 28); near(t.top1Share, 20 / 28); near(t.top3Share, (20 + 8 + 5) / 28);
    near(t.lossRatio, 10 / 50); near(t.exBest.moic, 48 / 40); near(t.realizedShare, 60 / 78);
  }, 'Manager Selection Copilot');
  T.add('Manager research', 'Value creation bridge adds up to the equity gain', function () {
    var d = [{ invested: 40, m0: 10, e0: 20, d0: 100, m1: 11, e1: 30, d1: 60 }], b = PM.mgr.valueBridge(d);
    near(b.ebitda, 10 * 10 * 0.4); near(b.multiple, 1 * 30 * 0.4); near(b.deleveraging, 40 * 0.4); near(b.total, (330 - 60 - 100) * 0.4); near(b.residual, 0, 1e-12);
  }, 'Manager Selection Copilot');
  T.add('Manager research', 'Constrained style regression recovers known style weights', function () {
    var rng = PM.mulberry32(21), z = PM.normalGen(rng), X = [], y = [], w = [0.5, 0.3, 0, 0.2];
    for (var t = 0; t < 120; t++) { var r = [0.01 + 0.045 * z(), 0.008 + 0.06 * z(), 0.004 + 0.02 * z(), 0.003 + 0.002 * z()]; X.push(r); y.push(PM.dot(w, r) + 0.0005 * z()); }
    var s = PM.mgr.styleWeights(y, X);
    s.w.forEach(function (v, i) { near(v, w[i], 0.02, 'style ' + i); }); near(PM.sum(s.w), 1, 1e-9); ok(s.w.every(function (v) { return v >= -1e-12; }), 'non-negative');
  }, 'Manager Selection Copilot');
  T.add('Manager research', 'Unsmoothing recovers a known underlying series within tolerance', function () {
    var rng = PM.mulberry32(5), z = PM.normalGen(rng), tru = [], th = [0.55, 0.3, 0.15];
    for (var i = 0; i < 240; i++) tru.push(0.006 + 0.03 * z());
    var obs = PM.glmSmooth(tru, th), est = PM.glmTheta(PM.autocorr(obs, 1), PM.autocorr(obs, 2)), back = PM.glmUnsmooth(obs, est);
    near(PM.std(back.slice(2)), PM.std(tru.slice(2)), 0.12, 'volatility of the unsmoothed series');
    ok(PM.corr(back.slice(2), tru.slice(2)) > 0.9, 'correlation with the true series ' + PM.corr(back.slice(2), tru.slice(2)));
  }, 'Manager Selection Copilot');
  T.add('Manager research', 'Clustering separates two clearly different groups', function () {
    var rng = PM.mulberry32(8), z = PM.normalGen(rng), f1 = [], f2 = [], S = [];
    for (var t = 0; t < 60; t++) { f1.push(z()); f2.push(z()); }
    for (var k = 0; k < 6; k++) S.push(f1.map(function (v, t) { return (k < 3 ? v : f2[t]) + 0.3 * z(); }));
    var ids = PM.mgr.cluster(S, 2); ok(ids[0] === ids[1] && ids[1] === ids[2] && ids[3] === ids[4] && ids[4] === ids[5] && ids[0] !== ids[3], 'ids ' + ids);
  }, 'Manager Selection Copilot');
  T.add('Manager research', 'Persistence matrix rows sum to one', function () {
    var m = PM.mgr.persistence([1, 1, 2, 3, 4, 4, 2, 3], [1, 2, 2, 4, 4, 3, 1, 3]);
    m.forEach(function (r) { near(PM.sum(r), 1, 1e-12); }); near(m[0][0], 0.5);
  }, 'Manager Selection Copilot');
  T.add('Fund terms', 'With no subscription line, IRR with and without the line is identical', function () {
    var d = function (y, m) { return new Date(Date.UTC(y, m, 1)); };
    var fl = [{ date: d(2020, 0), amount: -40 }, { date: d(2021, 5), amount: -30 }, { date: d(2024, 2), amount: 50 }, { date: d(2025, 11), amount: 60 }];
    near(PM.xirr(PM.terms.sublineAdjust(fl)), PM.xirr(fl), 1e-12);
  }, 'Fund Terms Auditor');
  T.add('Fund terms', 'Subscription line raises IRR and leaves the multiple unchanged', function () {
    var d = function (y, m) { return new Date(Date.UTC(y, m, 1)); };
    var fl = [{ date: d(2021, 0), amount: -40, investDate: d(2020, 3) }, { date: d(2021, 9), amount: -30, investDate: d(2021, 0) }, { date: d(2024, 2), amount: 50 }, { date: d(2025, 11), amount: 60 }];
    ok(PM.xirr(fl) > PM.xirr(PM.terms.sublineAdjust(fl)), 'line should lift IRR');
    near(PM.multiples(fl.map(function (f) { return f.amount; })).tvpi, PM.multiples(PM.terms.sublineAdjust(fl).map(function (f) { return f.amount; })).tvpi, 1e-12);
  }, 'Fund Terms Auditor');
  /* ---------------- Multi-strategy ---------------- */
  T.add('Multi-strategy', 'ERC weights give equal risk contributions', function () {
    var w = PM.opt.erc(SIG4), rc = PM.opt.riskContrib(w, SIG4);
    rc.forEach(function (x) { near(x, 25, 1e-6); }); near(PM.sum(w), 1, 1e-12);
  }, 'Multi-Strategy Builder');
  T.add('Multi-strategy', 'Portable alpha engine is deterministic for a seed', function () {
    var a = PM.pa.simulate(PM.pa.DEFAULT_PARAMS), b = PM.pa.simulate(PM.pa.DEFAULT_PARAMS);
    a.paRet.forEach(function (v, i) { near(v, b.paRet[i], 0); }); ok(a.paRet.length === 180, '180 months');
  }, 'Multi-Strategy Builder');

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);

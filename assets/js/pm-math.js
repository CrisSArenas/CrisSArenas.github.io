/* =====================================================================
   pm-math.js, the shared math library for every demo on the site.
   Plain script, no build step. Browser: window.PM. Node: module.exports.
   Conventions unless a function says otherwise:
     - rates and returns are decimals (0.08 = 8%)
     - cash flows are signed from the LP's point of view:
       contributions (calls, fees) negative, distributions positive
     - periodic cash flow arrays are indexed by period t = 0, 1, 2, ...
     - dates are JavaScript Date objects (UTC), year fraction = days / 365
   Every function is covered by the tests in assets/js/pm-tests.js,
   run in the browser on /tests.html and from Node with tests/run.js.
   ===================================================================== */
(function (root) {
  'use strict';
  var PM = root.PM = root.PM || {};
  if (typeof module !== 'undefined' && module.exports) module.exports = PM;

  /* ------------------------------------------------------------------
     Random numbers
     ------------------------------------------------------------------ */

  /** mulberry32(seed) -> function returning uniforms in [0, 1).
      32-bit state, used by every demo so a seed reproduces a run exactly. */
  PM.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  /** normalGen(rng) -> function returning standard normal draws.
      Box-Muller, caching the second draw (same as the portable alpha simulator). */
  PM.normalGen = function (rng) {
    var spare = null;
    return function () {
      if (spare !== null) { var s = spare; spare = null; return s; }
      var u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      var m = Math.sqrt(-2 * Math.log(u));
      spare = m * Math.sin(2 * Math.PI * v);
      return m * Math.cos(2 * Math.PI * v);
    };
  };

  /* ------------------------------------------------------------------
     Basic statistics and linear algebra
     ------------------------------------------------------------------ */
  PM.sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  PM.mean = function (a) { return a.length ? PM.sum(a) / a.length : NaN; };
  /** sample variance (n - 1) */
  PM.variance = function (a) {
    var m = PM.mean(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return a.length > 1 ? s / (a.length - 1) : 0;
  };
  PM.std = function (a) { return Math.sqrt(PM.variance(a)); };
  PM.cov = function (a, b) {
    var ma = PM.mean(a), mb = PM.mean(b), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
    return a.length > 1 ? s / (a.length - 1) : 0;
  };
  PM.corr = function (a, b) { var d = PM.std(a) * PM.std(b); return d > 0 ? PM.cov(a, b) / d : 0; };
  /** lag-k autocorrelation, standard estimator (sum over overlapping pairs / total sum of squares) */
  PM.autocorr = function (a, k) {
    k = k || 1;
    var m = PM.mean(a), num = 0, den = 0;
    for (var i = 0; i < a.length; i++) { den += (a[i] - m) * (a[i] - m); if (i >= k) num += (a[i] - m) * (a[i - k] - m); }
    return den > 0 ? num / den : 0;
  };
  /** quantile with linear interpolation, q in [0, 1] */
  PM.quantile = function (a, q) {
    var s = a.slice().sort(function (x, y) { return x - y; }), p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
    return s[lo] + (s[hi] - s[lo]) * (p - lo);
  };
  /** covariance matrix of columns. rows: array of observations, each an array of k values */
  PM.covMatrix = function (rows) {
    var k = rows[0].length, n = rows.length, m = [], C = [];
    for (var j = 0; j < k; j++) { var s = 0; for (var i = 0; i < n; i++) s += rows[i][j]; m.push(s / n); }
    for (var a = 0; a < k; a++) {
      C.push([]);
      for (var b = 0; b < k; b++) { var t = 0; for (var r = 0; r < n; r++) t += (rows[r][a] - m[a]) * (rows[r][b] - m[b]); C[a].push(t / (n - 1)); }
    }
    return C;
  };
  PM.corrFromCov = function (C) {
    return C.map(function (r, i) { return r.map(function (v, j) { return v / Math.sqrt(C[i][i] * C[j][j]); }); });
  };
  PM.matVec = function (M, v) { return M.map(function (r) { var s = 0; for (var i = 0; i < v.length; i++) s += r[i] * v[i]; return s; }); };
  PM.dot = function (a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  PM.transpose = function (M) { return M[0].map(function (_, j) { return M.map(function (r) { return r[j]; }); }); };
  PM.matMul = function (A, B) {
    var Bt = PM.transpose(B);
    return A.map(function (r) { return Bt.map(function (c) { return PM.dot(r, c); }); });
  };
  /** Cholesky factor L (lower) of a symmetric positive definite matrix; null if not PD */
  PM.cholesky = function (A) {
    var n = A.length, L = [];
    for (var i = 0; i < n; i++) L.push(new Array(n).fill(0));
    for (i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
      var s = A[i][j];
      for (var k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) { if (s <= 0) return null; L[i][i] = Math.sqrt(s); }
      else L[i][j] = s / L[j][j];
    }
    return L;
  };
  /** solve A x = b by Gauss-Jordan elimination with partial pivoting */
  PM.solve = function (A, b) {
    var n = A.length, M = A.map(function (r, i) { return r.slice().concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      var d = M[c][c];
      if (Math.abs(d) < 1e-14) return null;
      for (var j = c; j <= n; j++) M[c][j] /= d;
      for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c]; if (f) for (j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(function (r) { return r[n]; });
  };
  PM.inverse = function (A) {
    var n = A.length;
    return PM.transpose(A.map(function (_, i) { var e = new Array(n).fill(0); e[i] = 1; return PM.solve(A, e); }));
  };
  /** ordinary least squares with intercept. y: n, X: n x k. Returns {alpha, beta[], resid[], r2, se[], t[]} */
  PM.ols = function (y, X) {
    var n = y.length, Z = X.map(function (r) { return [1].concat(r); }), k = Z[0].length;
    var ZtZ = [], Zty = [];
    for (var a = 0; a < k; a++) {
      ZtZ.push([]); var s2 = 0;
      for (var b = 0; b < k; b++) { var s = 0; for (var i = 0; i < n; i++) s += Z[i][a] * Z[i][b]; ZtZ[a].push(s); }
      for (i = 0; i < n; i++) s2 += Z[i][a] * y[i];
      Zty.push(s2);
    }
    var coef = PM.solve(ZtZ, Zty);
    var resid = y.map(function (v, i) { return v - PM.dot(Z[i], coef); });
    var my = PM.mean(y), sst = 0, sse = 0;
    for (i = 0; i < n; i++) { sst += (y[i] - my) * (y[i] - my); sse += resid[i] * resid[i]; }
    var s2e = sse / Math.max(1, n - k), inv = PM.inverse(ZtZ);
    var se = inv.map(function (r, j) { return Math.sqrt(Math.max(0, r[j] * s2e)); });
    return { alpha: coef[0], beta: coef.slice(1), coef: coef, resid: resid, r2: sst > 0 ? 1 - sse / sst : 0, se: se, t: coef.map(function (c, j) { return se[j] > 0 ? c / se[j] : 0; }) };
  };

  /* ------------------------------------------------------------------
     Cash flow math: NPV, IRR, multiples, PME
     ------------------------------------------------------------------ */

  /** npv(rate, cfs) = sum_t cfs[t] / (1 + rate)^t, periodic */
  PM.npv = function (rate, cfs) {
    var s = 0;
    for (var t = 0; t < cfs.length; t++) s += cfs[t] * Math.pow(1 + rate, -t);
    return s;
  };

  /** irrLegacy(cfs): Newton-Raphson on NPV exactly as the original pacing demo
      (start 10%, 200 iterations, step tolerance 1e-9, rate clamped to [-90%, 500%]).
      Kept so the extracted pacing model reproduces the old page to the last digit. */
  PM.irrLegacy = function (cfs) {
    var r = 0.10;
    for (var iter = 0; iter < 200; iter++) {
      var npv = 0, dnpv = 0;
      for (var t = 0; t < cfs.length; t++) {
        var df = Math.pow(1 + r, -t);
        npv += cfs[t] * df;
        dnpv -= t * cfs[t] * df / (1 + r);
      }
      if (Math.abs(dnpv) < 1e-12) break;
      var nr = r - npv / dnpv;
      if (!isFinite(nr)) break;
      if (Math.abs(nr - r) < 1e-9) { r = nr; break; }
      r = Math.max(-0.9, Math.min(5, nr));
    }
    return r;
  };

  /** generic root finder on f over a rate: Newton-Raphson from a guess, falling back to
      bisection on [lo, hi] when Newton fails to converge or leaves the bracket.
      f(r) returns [value, derivative]. Returns NaN if no sign change exists in the bracket. */
  function rootRate(f, guess, lo, hi) {
    var r = guess;
    for (var i = 0; i < 100; i++) {
      var fd = f(r), v = fd[0], d = fd[1];
      if (Math.abs(v) < 1e-10) return r;
      if (!isFinite(d) || Math.abs(d) < 1e-14) break;
      var nr = r - v / d;
      if (!isFinite(nr) || nr <= lo || nr >= hi) break;
      if (Math.abs(nr - r) < 1e-12) return nr;
      r = nr;
    }
    var a = lo, b = hi, fa = f(a)[0], fb = f(b)[0];
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return NaN;
    for (i = 0; i < 300; i++) {
      var m = (a + b) / 2, fm = f(m)[0];
      if (Math.abs(fm) < 1e-12 || (b - a) / 2 < 1e-13) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  PM.rootRate = rootRate;

  /** irr(cfs): periodic IRR, the rate r with sum_t cfs[t] (1 + r)^-t = 0.
      Newton-Raphson from 10%, bisection fallback on (-99.99%, 10,000%).
      Returns NaN when the flows have no sign change. */
  PM.irr = function (cfs, guess) {
    var pos = false, neg = false;
    cfs.forEach(function (c) { if (c > 0) pos = true; if (c < 0) neg = true; });
    if (!pos || !neg) return NaN;
    return rootRate(function (r) {
      var v = 0, d = 0;
      for (var t = 0; t < cfs.length; t++) { var df = Math.pow(1 + r, -t); v += cfs[t] * df; d -= t * cfs[t] * df / (1 + r); }
      return [v, d];
    }, guess == null ? 0.1 : guess, -0.9999, 100);
  };

  function yearFrac(d0, d) { return (d - d0) / 86400000 / 365; }
  PM.yearFrac = yearFrac;

  /** xnpv(rate, flows): flows = [{date, amount}], discounting by actual days / 365 from the first date */
  PM.xnpv = function (rate, flows) {
    var d0 = flows[0].date, s = 0;
    flows.forEach(function (f) { s += f.amount * Math.pow(1 + rate, -yearFrac(d0, f.date)); });
    return s;
  };

  /** xirr(flows): dated IRR (annual, actual/365). Newton with bisection fallback. */
  PM.xirr = function (flows, guess) {
    var fl = flows.slice().sort(function (a, b) { return a.date - b.date; });
    var pos = fl.some(function (f) { return f.amount > 0; }), neg = fl.some(function (f) { return f.amount < 0; });
    if (!pos || !neg) return NaN;
    var d0 = fl[0].date, ts = fl.map(function (f) { return yearFrac(d0, f.date); });
    return rootRate(function (r) {
      var v = 0, d = 0;
      for (var i = 0; i < fl.length; i++) { var df = Math.pow(1 + r, -ts[i]); v += fl[i].amount * df; d -= ts[i] * fl[i].amount * df / (1 + r); }
      return [v, d];
    }, guess == null ? 0.1 : guess, -0.9999, 100);
  };

  /** multiples from LP cash flows and current NAV.
      paidIn = -sum(negative flows), distributed = sum(positive flows).
      TVPI = (distributed + nav) / paidIn, DPI = distributed / paidIn, RVPI = nav / paidIn */
  PM.multiples = function (amounts, nav) {
    var pi = 0, di = 0;
    amounts.forEach(function (a) { if (a < 0) pi -= a; else di += a; });
    nav = nav || 0;
    return { paidIn: pi, distributed: di, nav: nav, tvpi: pi > 0 ? (di + nav) / pi : NaN, dpi: pi > 0 ? di / pi : NaN, rvpi: pi > 0 ? nav / pi : NaN };
  };

  /** Kaplan-Schoar PME. flows: [{t, amount}] (t indexes into index[]), nav at the last index point.
      KS-PME = (sum D_t * I_T / I_t + NAV_T) / (sum C_t * I_T / I_t). 1.0 means the fund matched the index. */
  PM.ksPME = function (flows, index, nav) {
    var T = index.length - 1, IT = index[T], c = 0, d = 0;
    flows.forEach(function (f) { var g = IT / index[f.t]; if (f.amount < 0) c += -f.amount * g; else d += f.amount * g; });
    return (d + (nav || 0)) / c;
  };

  /** Direct Alpha (Gredil, Griffiths and Stucke 2014): compound every flow to the final date
      with the index, then take the IRR of the compounded stream (NAV added at the end).
      Periodic rate per index step; 0 means the fund matched the index. */
  PM.directAlpha = function (flows, index, nav) {
    var T = index.length - 1, IT = index[T], cf = new Array(T + 1).fill(0);
    flows.forEach(function (f) { cf[f.t] += f.amount * IT / index[f.t]; });
    cf[T] += nav || 0;
    return PM.irr(cf);
  };

  /* ------------------------------------------------------------------
     Smoothed returns
     ------------------------------------------------------------------ */

  /** Geltner (1993) desmoothing of an appraisal-based return series:
      r_true_t = (r_obs_t - rho * r_obs_{t-1}) / (1 - rho). First value is returned as observed. */
  PM.geltnerDesmooth = function (obs, rho) {
    return obs.map(function (r, t) { return t === 0 ? r : (r - rho * obs[t - 1]) / (1 - rho); });
  };
  /** inverse of geltnerDesmooth: r_obs_t = (1 - rho) r_true_t + rho r_obs_{t-1} */
  PM.geltnerSmooth = function (tru, rho) {
    var out = [];
    tru.forEach(function (r, t) { out.push(t === 0 ? r : (1 - rho) * r + rho * out[t - 1]); });
    return out;
  };
  /** desmoothed volatility from a reported volatility and first-order autocorrelation:
      sigma_true = sigma_reported * sqrt((1 + rho) / (1 - rho))  (as in the optimizer demo) */
  PM.desmoothedVol = function (vol, rho) { return vol * Math.sqrt((1 + rho) / (1 - rho)); };

  /** Getmansky, Lo and Makarov (2004) smoothing: R_obs_t = sum_j theta_j R_{t-j}, sum theta = 1.
      glmSmooth applies it; glmUnsmooth inverts it recursively given theta. */
  PM.glmSmooth = function (r, theta) {
    return r.map(function (_, t) { var s = 0; for (var j = 0; j < theta.length; j++) s += theta[j] * (t - j >= 0 ? r[t - j] : r[0]); return s; });
  };
  PM.glmUnsmooth = function (obs, theta) {
    var out = [];
    obs.forEach(function (o, t) {
      var s = o;
      for (var j = 1; j < theta.length; j++) s -= theta[j] * (t - j >= 0 ? out[t - j] : (t === 0 ? o : out[0]));
      out.push(s / theta[0]);
    });
    return out;
  };
  /** theta implied by the observed lag-1 and lag-2 autocorrelations for an MA(2) smoothing
      profile with i.i.d. true returns: rho1 = (t0 t1 + t1 t2)/S, rho2 = t0 t2 / S, S = sum t^2.
      Solved by a fine grid search over the simplex, then refined. */
  PM.glmTheta = function (rho1, rho2) {
    function err(t1, t2) {
      var t0 = 1 - t1 - t2; if (t0 <= 0) return 1e9;
      var S = t0 * t0 + t1 * t1 + t2 * t2;
      var e1 = (t0 * t1 + t1 * t2) / S - rho1, e2 = (t0 * t2) / S - rho2;
      return e1 * e1 + e2 * e2;
    }
    var best = [0, 0], be = err(0, 0);
    for (var a = 0; a <= 0.6; a += 0.005) for (var b = 0; b <= 0.4 && a + b < 0.95; b += 0.005) { var e = err(a, b); if (e < be) { be = e; best = [a, b]; } }
    var step = 0.0025;
    for (var it = 0; it < 60; it++) {
      var imp = false;
      [[step, 0], [-step, 0], [0, step], [0, -step]].forEach(function (d) {
        var c = [Math.max(0, best[0] + d[0]), Math.max(0, best[1] + d[1])], e2 = err(c[0], c[1]);
        if (e2 < be) { be = e2; best = c; imp = true; }
      });
      if (!imp) step /= 2;
    }
    return [1 - best[0] - best[1], best[0], best[1]];
  };
  /** annualized Sharpe ratio from periodic returns */
  PM.sharpe = function (r, rf, periods) {
    periods = periods || 12; rf = rf || 0;
    var ex = r.map(function (x) { return x - rf / periods; }), s = PM.std(ex);
    return s > 0 ? PM.mean(ex) / s * Math.sqrt(periods) : 0;
  };

  /* ------------------------------------------------------------------
     Takahashi and Alexander (2002) commitment model
     ------------------------------------------------------------------ */

  /** taFund(p): one fund under the Takahashi-Alexander model, annual steps, exactly as the
      original pacing demo. p = {commit, rc, ip, life, growth, bow, yieldFloor}
        C_t   = rc x uncalled            for t <= ip, else 0   (start of year t)
        NAV_t = (NAV_{t-1} + C_t) x (1 + growth)
        D_t   = max(yieldFloor, (t / life)^bow) x NAV_t
      Returns per-year arrays (index 0..life): calls, dists, nav, navPrev, cumulative data,
      and the gross LP cash flow stream cfs (contribution booked at t-1, distribution at t). */
  PM.taFund = function (p) {
    var commit = p.commit, RC = p.rc, L = p.life, G = p.growth, B = p.bow, Y = p.yieldFloor || 0;
    var IP = Math.min(p.ip, L);
    var data = [{ y: 0, cal: 0, dist: 0, nav: 0, cf: 0 }], cfs = new Array(L + 1).fill(0);
    var yrC = new Array(L + 1).fill(0), yrD = new Array(L + 1).fill(0), navPrev = new Array(L + 1).fill(0), navArr = new Array(L + 1).fill(0);
    var uncalled = commit, calC = 0, distC = 0, nav = 0, navYears = 0;
    for (var y = 1; y <= L; y++) {
      navPrev[y] = nav;
      var C = (y <= IP) ? RC * uncalled : 0; uncalled -= C; calC += C; cfs[y - 1] -= C; yrC[y] = C;
      nav = (nav + C) * (1 + G);
      var D = Math.max(Y, Math.pow(y / L, B)) * nav;
      nav -= D; distC += D; cfs[y] += D; navYears += nav; yrD[y] = D; navArr[y] = nav;
      data.push({ y: y, cal: calC, dist: distC, nav: nav, cf: distC - calC });
    }
    return { ip: IP, life: L, calls: yrC, dists: yrD, nav: navArr, navPrev: navPrev, cfs: cfs, data: data, called: calC, distributed: distC, navYears: navYears, uncalledAtEnd: uncalled };
  };

  /** taNetOfFees(fund, terms): LP net cash flows after a management fee and a European
      whole-fund waterfall with full GP catch-up, exactly as the original pacing demo.
      terms = {commit, mgmt (on commitment during ip, on prior NAV after), carry, pref}.
      Returns {lpCf, netIrr (legacy solver), netTvpi, feeTot, gpCarry}. */
  PM.taNetOfFees = function (f, t) {
    var L = f.life, IP = f.ip, MGMT = t.mgmt, CARRY = t.carry, PREF = t.pref, commit = t.commit;
    var lpCf = new Array(L + 1).fill(0);
    var unreturned = 0, prefOwed = 0, lpPref = 0, gpCarry = 0, lpDist = 0, lpOut = 0, feeTot = 0;
    for (var y = 1; y <= L; y++) {
      var fee = MGMT * (y <= IP ? commit : f.navPrev[y]); feeTot += fee;
      var contrib = f.calls[y] + fee;
      lpCf[y - 1] -= contrib; lpOut += contrib;
      prefOwed += PREF * unreturned;
      unreturned += contrib;
      var d = f.dists[y];
      var t1 = Math.min(d, unreturned); unreturned -= t1; d -= t1;
      var t2 = Math.min(d, Math.max(0, prefOwed - lpPref)); lpPref += t2; d -= t2;
      var catchUp = lpPref * CARRY / (1 - CARRY);
      var t3 = Math.min(d, Math.max(0, catchUp - gpCarry)); gpCarry += t3; d -= t3;
      gpCarry += CARRY * d;
      var lpGet = t1 + t2 + (1 - CARRY) * d;
      lpCf[y] += lpGet; lpDist += lpGet;
    }
    return { lpCf: lpCf, netIrr: PM.irrLegacy(lpCf), netTvpi: lpOut > 0 ? lpDist / lpOut : 0, feeTot: feeTot, gpCarry: gpCarry, lpOut: lpOut, lpDist: lpDist };
  };

  /** taSummary(fund): the metrics the original pacing panel reported:
      gross TVPI, peak cumulative outlay, break-even year, gross IRR (= growth by construction),
      and the steady-state annual commitment as a % of total assets for a target private weight:
      ssPct = targetPct / (navYears / commit) (navYears = sum of year-end NAV over the fund life).
      peakOutlay is positive (the deepest cumulative net cash flow, sign flipped). */
  PM.taSummary = function (f, commit, targetPct) {
    var fn = f.data[f.data.length - 1].nav, calC = f.called, td = f.distributed;
    var tvpi = calC > 0 ? (td + fn) / calC : 0;
    var peak = -Math.min.apply(null, [0].concat(f.data.map(function (d) { return d.cf; })));
    var be = null; for (var i = 1; i < f.data.length; i++) if (f.data[i].cf >= 0) { be = i; break; }
    var navPerCommit = commit > 0 ? f.navYears / commit : 0;
    return { tvpi: tvpi, peakOutlay: peak, breakEvenYear: be, irr: PM.irrLegacy(f.cfs), navPerCommit: navPerCommit, ssPct: navPerCommit > 0 ? targetPct / navPerCommit : 0 };
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Portable alpha engine. Copied verbatim from the original Portable
   Alpha Simulator (commit bbdb266, lines 381-585) so the Multi-Strategy
   Builder's portable alpha tab reproduces it exactly. See
   tests/legacy-proof.js for the line-by-line comparison.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM;
  /* ---------- seeded PRNG ---------- */
  function mulberry32(seed){
    return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  }
  function makeNormal(rng){
    var spare=null;
    return function(){if(spare!==null){var v=spare;spare=null;return v;}
    var u1=Math.max(rng(),1e-15),u2=rng(),r=Math.sqrt(-2*Math.log(u1));
    spare=r*Math.sin(2*Math.PI*u2);return r*Math.cos(2*Math.PI*u2);};
  }

  /* ---------- regimes (monthly parameters, stylised on 2008 / 2022) ----------
     aDrift : multiplier on the calm expected alpha (IR x vol / 12)
     aShock : additional alpha drift in units of the monthly alpha sigma
     aVol   : multiplier on alpha volatility      aBeta : multiplier on alpha beta
     imMult : multiplier on exchange initial margin (clearing houses raise performance bonds
              in stress: CME lifted E-mini requirements by roughly 60% between Feb and Mar 2020)
     sprMult: multiplier on the implied futures financing spread (roll richness widens in stress)
     basMult: multiplier on the futures-versus-index basis noise
     exit   : monthly probability of returning to calm (1 / mean duration)      */
  var REG={
    calm:  {label:'Calm',      eqMu: 0.0110,eqSig:0.037,bdMu: 0.0045,bdSig:0.013,corr: 0.10,aDrift:1.00,aShock: 0.0,aVol:1.0,aBeta:1.0,imMult:1.0,sprMult:1.0,basMult:1.0,exit:0},
    crisis:{label:'Crisis',    eqMu:-0.0300,eqSig:0.070,bdMu: 0.0060,bdSig:0.018,corr:-0.35,aDrift:0.00,aShock:-0.4,aVol:2.0,aBeta:1.5,imMult:1.6,sprMult:2.5,basMult:3.0,exit:1/12},
    rate:  {label:'Rate shock',eqMu:-0.0100,eqSig:0.050,bdMu:-0.0120,bdSig:0.018,corr: 0.60,aDrift:0.25,aShock: 0.0,aVol:1.3,aBeta:1.5,imMult:1.25,sprMult:1.5,basMult:1.8,exit:1/9}
  };
  var CRISIS_SHARE=0.55;   /* share of stress months that are crises; the rest are rate shocks */
  var MONTHS=180;
  /* futures execution cost per unit of notional traded (calendar spread + impact), by regime */
  var TRADE_COST={calm:0.0005,crisis:0.0020,rate:0.0010};

  /* target capital structure at a rebalance date: initial margin grossed up for the haircut */
  function structure(p){
    var N=p.betaNotional,A=p.alphaAlloc;
    var im=p.marginReq*N/Math.max(1-p.haircut,0.01);
    var free=(1-A)-im;
    return{N:N,A:A,im:im,free:free,freePos:Math.max(0,free),structShort:Math.max(0,-free)};
  }
  /* largest futures notional a given pool of haircut T-bill collateral can margin */
  function supportable(cashAvail,imRate,haircut){
    if(imRate<=0)return Math.max(0,cashAvail)*1e6;
    return Math.max(0,cashAvail)*Math.max(1-haircut,0.01)/imRate;
  }

  /* Stateful simulation. The collateral account is a real balance: variation margin is paid out of
     it every month, it is not topped up from the alpha sleeve until the sleeve's redemption window
     opens, and when the balance can no longer margin the position the programme is forced to cut
     futures notional. That forced de-leveraging - selling beta at the low and re-buying it later -
     is the failure mode that closed most 2008-vintage portable-alpha programmes. */
  function simulate(p){
    var M=MONTHS,rng=mulberry32(p.seed),norm=makeNormal(rng),st=structure(p);
    var sf=Math.min(Math.max(p.stressFreq,0),0.6);
    var pCr=sf>0?CRISIS_SHARE*sf*REG.crisis.exit/(1-sf):0;
    var pRt=sf>0?(1-CRISIS_SHARE)*sf*REG.rate.exit/(1-sf):0;
    var reg='calm',regimes=[],baseRet=[],paRet=[],eqRets=[],benchRets=[],sleeveRets=[],calls=[],delevs=[],notl=[],cushion=[];
    var comp={cash:[],betaEx:[],fin:[],roll:[],basis:[],alphaGross:[],fees:[],liq:[]};
    var rfMo=p.cashRate/12,rollMo=p.rollCost/12,dragMo=p.drag/12,mgmtMo=p.mgmtFee/12;
    var sigMo=p.alphaVol/Math.sqrt(12),muMo=p.alphaIR*p.alphaVol/12;
    var N=st.N,A=st.A,hc=Math.max(1-p.haircut,0.01),liqEvery=Math.max(1,Math.round(p.sleeveLiq));
    /* dollar balances, NAV starts at 1. Futures carry no book value: their P&L settles into cash. */
    var nav=1,sleeve=A,cash=1-A,sleeveUnit=1,hwmUnit=1;
    var notional=Math.min(N,supportable(cash,p.marginReq,p.haircut));
    for(var m=0;m<M;m++){
      var u=rng();
      if(reg==='calm'){if(u<pCr)reg='crisis';else if(u<pCr+pRt)reg='rate';}
      else if(u<REG[reg].exit)reg='calm';
      regimes.push(reg);
      var rg=REG[reg],navPrev=nav,nOld=notional,tcost=TRADE_COST[reg]||0.0005;
      var sprMo=p.finSpread*rg.sprMult/12;
      var z1=norm(),z2=norm(),z3=norm(),z4=norm();
      var eqR=rg.eqMu+rg.eqSig*z1;
      var bdR=rg.bdMu+rg.bdSig*(rg.corr*z1+Math.sqrt(1-rg.corr*rg.corr)*z2);
      var benchR=p.eqWeight*eqR+(1-p.eqWeight)*bdR;
      eqRets.push(eqR);benchRets.push(benchR);baseRet.push(benchR);

      /* futures prices embed financing at Rf, so the mark-to-market driver is bench - Rf */
      var futExc=benchR-rfMo,basisR=p.basisSig*rg.basMult*z3;

      /* Variation margin settles daily, not monthly. Sample the intra-month low of the futures
         P&L exactly from the Brownian bridge that ends at futExc:
         min = (R - sqrt(R^2 - 2*sig^2*ln U))/2,  U ~ U(0,1)  (standard bridge-minimum sampler). */
      var w=p.eqWeight;
      var vB=w*w*rg.eqSig*rg.eqSig+(1-w)*(1-w)*rg.bdSig*rg.bdSig+2*w*(1-w)*rg.corr*rg.eqSig*rg.bdSig;
      vB=Math.max(vB,1e-12);
      var u5=Math.min(Math.max(rng(),1e-12),1-1e-12);
      var trough=(futExc-Math.sqrt(futExc*futExc-2*vB*Math.log(u5)))/2;

      /* margin test at the intra-month low, with the clearing house raising margin in stress */
      var imRate=Math.min(p.marginReq*rg.imMult,0.5);
      var facility=Math.max(0,p.buffer*navPrev);   /* committed one-month credit line, sized to the buffer */
      var cashLow=cash+nOld*trough,draw=0,tradeCost=0,cut=0,forced=false,call=false;
      if(cashLow<imRate*nOld/hc-1e-12){
        call=true;
        draw=Math.min(imRate*nOld/hc-cashLow,facility);
        if(cashLow+draw<imRate*nOld/hc-1e-12){
          forced=true;
          var maxN=supportable(cashLow+draw,imRate,p.haircut);
          cut=Math.max(0,nOld-maxN);notional=Math.max(0,nOld-cut);tradeCost+=cut*tcost;
        }
      }
      var nNew=notional,nAvg=(nOld+nNew)/2;
      /* full notional into the trough, the surviving notional on the way back out */
      var betaEx=nOld*trough+nNew*(futExc-trough);
      var fin=-nAvg*sprMo,roll=-nAvg*rollMo,basis=nAvg*basisR;

      /* collateral account: T-bill yield; a negative balance is funded at Rf + spread + 100 bp */
      var cashInt=cash*rfMo;
      var liq=(cash<0?cash*(sprMo+0.01/12):0)-draw*(rfMo+sprMo+0.01/12)-tradeCost;

      /* alpha sleeve: hedge-fund style stream, gross of fees, then mgmt + perf fee above HWM */
      var decay=Math.max(0,1-p.alphaDecay*(m/12));
      var aMu=muMo*decay*rg.aDrift+rg.aShock*sigMo;
      var aEx=aMu+sigMo*rg.aVol*z4;
      var aBeta=p.alphaBeta*rg.aBeta;
      var gross=rfMo+aEx+aBeta*(eqR-rfMo);
      var unitPre=sleeveUnit*(1+gross-mgmtMo),perfRet=0,unitPost=unitPre;
      if(unitPre>hwmUnit){var fee=p.perfFee*(unitPre-hwmUnit);perfRet=fee/sleeveUnit;unitPost=unitPre-fee;hwmUnit=unitPost;}
      var netSleeve=unitPost/sleeveUnit-1;sleeveUnit=unitPost;
      sleeveRets.push(netSleeve);
      var alphaGross=sleeve*gross,fees=-sleeve*(mgmtMo+perfRet+dragMo);

      cash=cash+cashInt+betaEx+fin+roll+basis+liq;
      sleeve=sleeve*(1+netSleeve-dragMo);

      /* month-end re-test: spread, roll and basis bite after the trough */
      var maxN2=supportable(cash+draw,imRate,p.haircut);
      if(maxN2<notional-1e-12){
        call=true;forced=true;
        var cut2=notional-maxN2;notional=maxN2;
        var tc2=cut2*tcost;cash-=tc2;liq-=tc2;tradeCost+=tc2;cut+=cut2;
      }
      nav=cash+sleeve;

      /* rebalance to target weights only when the sleeve's redemption window opens */
      if((m+1)%liqEvery===0&&nav>0){
        var tSleeve=A*nav,tCash=nav-tSleeve;
        var tN=Math.min(N*nav,supportable(tCash,imRate,p.haircut));
        var rc=Math.abs(tN-notional)*tcost;
        notional=tN;sleeve=tSleeve;cash=tCash-rc;liq-=rc;nav=cash+sleeve;
      }
      if(nav<1e-6)nav=1e-6;

      paRet.push(nav/navPrev-1);
      calls.push(call);delevs.push(cut>1e-9);
      notl.push(navPrev>0?nOld/navPrev:0);
      cushion.push(nav>0?(cash-imRate*notional/hc)/nav:0);
      comp.cash.push(cashInt/navPrev);comp.betaEx.push(betaEx/navPrev);comp.fin.push(fin/navPrev);
      comp.roll.push(roll/navPrev);comp.basis.push(basis/navPrev);
      comp.alphaGross.push(alphaGross/navPrev);comp.fees.push(fees/navPrev);comp.liq.push(liq/navPrev);
    }
    return{baseRet:baseRet,paRet:paRet,benchRets:benchRets,eqRets:eqRets,sleeveRets:sleeveRets,regimes:regimes,
      calls:calls,delevs:delevs,notl:notl,cushion:cushion,comp:comp,months:M,st:st};
  }

  function cumulative(rets){var c=[1];for(var i=0;i<rets.length;i++)c.push(c[c.length-1]*(1+rets[i]));return c;}

  function calcStats(rets,bench,rf){
    var n=rets.length,yrs=n/12,cum=cumulative(rets),fv=cum[cum.length-1];
    var cagr=Math.pow(fv,1/yrs)-1;
    var mean=0;for(var i=0;i<n;i++)mean+=rets[i];mean/=n;
    var vari=0;for(i=0;i<n;i++)vari+=(rets[i]-mean)*(rets[i]-mean);vari/=(n-1);
    var vol=Math.sqrt(vari)*Math.sqrt(12);
    var sharpe=vol>0?(mean*12-rf)/vol:0;
    var peak=cum[0],maxDD=0,ddSeries=[0];
    for(i=1;i<cum.length;i++){peak=Math.max(peak,cum[i]);var dd=(cum[i]-peak)/peak;ddSeries.push(dd);maxDD=Math.min(maxDD,dd);}
    var te=null,ir=null,beta=null,active=null;
    if(bench){
      var ex=[];for(i=0;i<n;i++)ex.push(rets[i]-bench[i]);
      var exMean=0;for(i=0;i<n;i++)exMean+=ex[i];exMean/=n;
      var exVar=0;for(i=0;i<n;i++)exVar+=(ex[i]-exMean)*(ex[i]-exMean);exVar/=(n-1);
      te=Math.sqrt(exVar)*Math.sqrt(12);active=exMean*12;ir=te>0?active/te:0;
      var bMean=0;for(i=0;i<n;i++)bMean+=bench[i];bMean/=n;
      var cov=0,bVar=0;
      for(i=0;i<n;i++){cov+=(rets[i]-mean)*(bench[i]-bMean);bVar+=(bench[i]-bMean)*(bench[i]-bMean);}
      beta=bVar>0?cov/bVar:1;
    }
    var worst12=Infinity;
    for(i=0;i<=n-12;i++){var c12=1;for(var j=0;j<12;j++)c12*=(1+rets[i+j]);worst12=Math.min(worst12,c12-1);}
    return{cagr:cagr,mean:mean,vol:vol,sharpe:sharpe,maxDD:maxDD,te:te,ir:ir,beta:beta,active:active,worst12:worst12,cum:cum,ddSeries:ddSeries};
  }

  function annComp(arr){var s=0;for(var i=0;i<arr.length;i++)s+=arr[i];return s/(arr.length/12);}

  /* Path uncertainty. The headline chart is ONE draw of a 15-year path; on a 3.3% tracking error
     the standard error of a 15-year active return is close to 0.9%/y, so a single path says very
     little. Re-run the same programme on a fixed block of alternative seeds and report the spread.
     The block is independent of the user's seed, so it does not move when the shown path changes. */
  var SWEEP_N=96,sweepCache={key:null,res:null};
  function seedSweep(p){
    var key='',k;for(k in p){if(k!=='seed')key+=k+':'+p[k]+';';}
    if(sweepCache.key===key)return sweepCache.res;
    var act=[],i,j;
    for(i=0;i<SWEEP_N;i++){
      var pp={};for(k in p)pp[k]=p[k];pp.seed=1000+i;
      var sm=simulate(pp),ex=0,n=sm.months;
      for(j=0;j<n;j++)ex+=sm.paRet[j]-sm.benchRets[j];
      act.push(ex/n*12);
    }
    act.sort(function(a,b){return a-b;});
    var win=0;for(i=0;i<act.length;i++)if(act[i]>0)win++;
    function qt(f){return act[Math.min(act.length-1,Math.max(0,Math.round(f*(act.length-1))))];}
    var res={n:SWEEP_N,p10:qt(0.10),med:qt(0.50),p90:qt(0.90),win:win/act.length};
    sweepCache.key=key;sweepCache.res=res;return res;
  }

  PM.pa = { mulberry32: mulberry32, makeNormal: makeNormal, REG: REG, CRISIS_SHARE: CRISIS_SHARE, MONTHS: MONTHS, TRADE_COST: TRADE_COST,
    structure: structure, supportable: supportable, simulate: simulate, cumulative: cumulative, calcStats: calcStats, annComp: annComp, seedSweep: seedSweep, SWEEP_N: SWEEP_N,
    /* the original page's default inputs, already converted to decimals the way its getParams did */
    DEFAULT_PARAMS: { seed: 42, cashRate: 0.04, stressFreq: 0.15, eqWeight: 0.60, betaNotional: 1.00, finSpread: 0.0035, rollCost: 0.0005, basisSig: 0.0010,
      alphaAlloc: 0.50, alphaVol: 0.06, alphaIR: 1.00, alphaBeta: 0.15, mgmtFee: 0.015, perfFee: 0.20, alphaDecay: 0.01, drag: 0.0015, marginReq: 0.06, haircut: 0.02, buffer: 0.05, sleeveLiq: 3 } };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Portfolio construction: projections, mean-variance, maximum Sharpe,
   frontier, Monte Carlo panel and path statistics. Generic over N
   assets; the algorithms are those of the original Multi-Asset
   Portfolio Optimizer (commit bbdb266), proven equal on its own inputs
   in tests/legacy-proof.js.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, O = PM.opt = {};

  /** rng32Legacy(seed): the optimizer demo's PRNG. It is a truncated mulberry32 (the second
      mixing step and the final xor-shift are missing), so it is statistically weaker than
      PM.mulberry32. It is kept, unchanged, only so the extracted optimizer reproduces the old
      page's numbers exactly; new code uses PM.mulberry32. */
  O.rng32Legacy = function (s) {
    return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); return ((t += t < 0 ? 0x100000000 : 0) >>> 0) / 4294967296; };
  };
  function dot(a, w) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i] * w[i]; return t; }

  /** exact Euclidean projection of x onto {lo <= w <= hi, sum w = 1}, by bisection on the shift */
  O.projBox = function (x, lo, hi) {
    var n = x.length, a = Math.min.apply(null, x) - 2, b = Math.max.apply(null, x) + 2;
    var f = function (th) { var s = 0; for (var i = 0; i < n; i++) s += Math.min(hi[i], Math.max(lo[i], x[i] - th)); return s; };
    for (var k = 0; k < 80; k++) { var m = (a + b) / 2; if (f(m) > 1) a = m; else b = m; }
    var th = (a + b) / 2;
    return x.map(function (v, i) { return Math.min(hi[i], Math.max(lo[i], v - th)); });
  };
  /** projection onto the halfspace a'w <= b (projLE) or a'w >= b (projGE) */
  O.projLE = function (w, a, b) { var s = dot(a, w); if (s <= b + 1e-12) return w; var nn = dot(a, a) || 1, k = (s - b) / nn; return w.map(function (v, i) { return v - k * a[i]; }); };
  O.projGE = function (w, a, b) { var s = dot(a, w); if (s >= b - 1e-12) return w; var nn = dot(a, a) || 1, k = (b - s) / nn; return w.map(function (v, i) { return v + k * a[i]; }); };

  /** makeProjector({lo, hi, le:[{a, b}], ge:[{a, b}], iters}) -> function(w) projecting onto
      box + budget + linear constraints by alternating projections (all sets convex). */
  O.makeProjector = function (c) {
    var le = c.le || [], ge = c.ge || [], iters = c.iters || 80;
    function feasible(w) {
      for (var i = 0; i < w.length; i++) if (w[i] < c.lo[i] - 1e-7 || w[i] > c.hi[i] + 1e-7) return false;
      if (Math.abs(PM.sum(w) - 1) > 1e-6) return false;
      for (i = 0; i < le.length; i++) if (dot(le[i].a, w) > le[i].b + 1e-6) return false;
      for (i = 0; i < ge.length; i++) if (dot(ge[i].a, w) < ge[i].b - 1e-6) return false;
      return true;
    }
    var proj = function (w) {
      var x = O.projBox(w, c.lo, c.hi);
      for (var it = 0; it < iters; it++) {
        if (feasible(x)) break;
        le.forEach(function (k) { x = O.projLE(x, k.a, k.b); });
        ge.forEach(function (k) { x = O.projGE(x, k.a, k.b); });
        x = O.projBox(x, c.lo, c.hi);
      }
      return x;
    };
    proj.feasible = feasible;
    return proj;
  };

  O.portMu = function (w, mu) { return w.reduce(function (s, v, i) { return s + v * mu[i]; }, 0); };
  O.portVol = function (w, S) { var v = 0, n = w.length; for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) v += w[i] * S[i][j] * w[j]; return Math.sqrt(Math.max(0, v)); };
  O.sharpe = function (w, mu, S, rf) { var v = O.portVol(w, S); return v > 1e-8 ? (O.portMu(w, mu) - rf) / v : 0; };
  /** risk contribution of each asset, in percent of portfolio variance (Euler allocation) */
  O.riskContrib = function (w, S) {
    var n = w.length, sw = [];
    for (var i = 0; i < n; i++) { var s = 0; for (var j = 0; j < n; j++) s += S[i][j] * w[j]; sw[i] = s; }
    var t = w.reduce(function (s, v, i) { return s + v * sw[i]; }, 0) || 1;
    return w.map(function (v, i) { return v * sw[i] / t * 100; });
  };

  /** mvSolve: maximise lam * mu'w - w'Sigma w over the projector's set, projected gradient,
      step 1 / (2 trace Sigma). lam = 0 gives minimum variance. */
  O.mvSolve = function (mu, S, lam, proj, w0, iters) {
    var n = mu.length, w = proj(w0), L = 0;
    for (var i = 0; i < n; i++) L += S[i][i];
    var eta = 1 / (2 * L);
    for (var it = 0; it < iters; it++) {
      var g = [];
      for (i = 0; i < n; i++) { var s = 0; for (var j = 0; j < n; j++) s += S[i][j] * w[j]; g[i] = lam * mu[i] - 2 * s; }
      w = proj(w.map(function (v, k) { return v + eta * g[k]; }));
    }
    return w;
  };
  /** maxSharpeSolve: projected ascent on the Sharpe gradient mu/sigma - (mu'w - rf) Sigma w / sigma^3,
      with a linearly decaying step; returns the best point visited. */
  O.maxSharpeSolve = function (mu, S, rf, proj, w0, iters) {
    var n = mu.length, w = proj(w0), bw = w, bs = O.sharpe(w, mu, S, rf), sc = 0;
    for (var i = 0; i < n; i++) sc += S[i][i];
    var eta0 = 0.5 * Math.sqrt(sc);
    for (var it = 0; it < iters; it++) {
      var sg = [], v = 0;
      for (i = 0; i < n; i++) { var s = 0; for (var j = 0; j < n; j++) s += S[i][j] * w[j]; sg[i] = s; v += w[i] * s; }
      var sd = Math.sqrt(Math.max(1e-12, v)), ex = O.portMu(w, mu) - rf, g = [];
      for (i = 0; i < n; i++) g[i] = mu[i] / sd - ex * sg[i] / (sd * sd * sd);
      var step = eta0 * (1 - it / iters);
      w = proj(w.map(function (x, k) { return x + step * g[k]; }));
      var s2 = O.sharpe(w, mu, S, rf); if (s2 > bs) { bs = s2; bw = w; }
    }
    return bw;
  };
  /** random feasible portfolios (normalised exponential draws, projected) */
  O.randomCloud = function (mu, S, proj, seed, n) {
    var sr = O.rng32Legacy(seed), pts = [], N = mu.length;
    for (var k = 0; k < n; k++) {
      var u = [], t = 0;
      for (var i = 0; i < N; i++) { u[i] = -Math.log(Math.max(1e-10, sr())); t += u[i]; }
      var w = proj(u.map(function (x) { return x / t; }));
      pts.push({ w: w, r: O.portMu(w, mu), v: O.portVol(w, S) * 100 });
    }
    return pts;
  };
  /** efficient frontier: a 48-point lambda sweep (warm-started), plus the minimum-variance and
      maximum-Sharpe points seeded from a random cloud; returns the upper envelope sorted by risk.
      Volatility v is in percent. */
  O.frontier = function (mu, S, rf, proj, seed, opts) {
    opts = opts || {};
    var N = mu.length, pts = O.randomCloud(mu, S, proj, seed + 888, opts.cloud || 1400);
    var K = opts.K || 48, LAM_MAX = opts.lamMax || 9, cand = [], warm = new Array(N).fill(1 / N);
    for (var k = 0; k < K; k++) { var u = k / (K - 1); warm = O.mvSolve(mu, S, LAM_MAX * u * u, proj, warm, 160); cand.push(warm); }
    var cl = null, cv = 1e9, cs = null, cbs = -1e9;
    pts.forEach(function (p) { if (p.v < cv) { cv = p.v; cl = p.w; } var sh = (p.r - rf) / (p.v / 100 || 1e-6); if (sh > cbs) { cbs = sh; cs = p.w; } });
    cand.push(O.mvSolve(mu, S, 0, proj, cl, 400));
    cand.push(O.maxSharpeSolve(mu, S, rf, proj, cs, 400));
    var all = cand.map(function (w) { return { w: w, r: O.portMu(w, mu), v: O.portVol(w, S) * 100 }; });
    all.sort(function (a, b) { return a.v - b.v || b.r - a.r; });
    var curve = [], best = -1e9;
    all.forEach(function (p) { if (p.r > best + 1e-9) { best = p.r; curve.push(p); } });
    return { pts: pts, curve: curve };
  };
  /** covariance from vols and a correlation matrix: Sigma_ij = C_ij sigma_i sigma_j */
  O.covFromCorr = function (vol, C) { return vol.map(function (vi, i) { return vol.map(function (vj, j) { return C[i][j] * vi * vj; }); }); };

  /** Monte Carlo panel: paths x T months x N assets of log-normal monthly returns with
      E[r_month] = mu/12 exactly, correlated through the Cholesky factor of C (the optimizer
      demo's generator, same draw order). Returns {panel (Float64Array), returns (path 1), Sigma}. */
  O.genPanel = function (o) {
    var N = o.mu.length, T = o.T, P = o.paths, rng = O.rng32Legacy(o.seed);
    var bm = function () { var u = Math.max(1e-10, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    var C = o.corr, vol = o.vol, L = [];
    for (var i = 0; i < N; i++) { L[i] = []; for (var j = 0; j <= i; j++) { var s = 0; for (var k = 0; k < j; k++) s += L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(Math.max(1e-12, C[i][i] - s)) : (C[i][j] - s) / (L[j][j] || 1e-12); } for (j = i + 1; j < N; j++) L[i][j] = 0; }
    var mu_m = o.mu.map(function (m) { return Math.log(1 + m / 12); }), vol_m = vol.map(function (v) { return v / Math.sqrt(12); });
    var panel = new Float64Array(P * T * N);
    for (var p = 0; p < P; p++) for (var t = 0; t < T; t++) {
      var z = []; for (i = 0; i < N; i++) z[i] = bm();
      var off = (p * T + t) * N;
      for (i = 0; i < N; i++) { var e = 0; for (j = 0; j <= i; j++) e += L[i][j] * z[j]; panel[off + i] = Math.exp(mu_m[i] - 0.5 * vol_m[i] * vol_m[i] + vol_m[i] * e) - 1; }
    }
    var rets = [];
    for (t = 0; t < T; t++) { var r = []; for (i = 0; i < N; i++) r.push(panel[t * N + i]); rets.push(r); }
    return { panel: panel, returns: rets, Sigma: O.covFromCorr(vol, C), N: N, T: T, paths: P };
  };
  /** path statistics of weights w over every path-month of a panel: monthly VaR and CVaR
      (95, 99, in percent, positive = loss), median and 95th percentile max drawdown, worst
      12 months (5th percentile), annualised downside deviation, terminal wealth percentiles. */
  O.pathStats = function (w, D, rf) {
    var pan = D.panel, N = D.N, T = D.T, P = D.paths;
    var rp = new Float64Array(P * T), mdds = [], w12s = [], terms = [], hist = new Float64Array(T + 1);
    for (var p = 0; p < P; p++) {
      var wl = 1, pk = 1, mdd = 0, base = p * T; hist[0] = 1;
      for (var t = 0; t < T; t++) {
        var r = 0, o = (base + t) * N; for (var i = 0; i < N; i++) r += w[i] * pan[o + i];
        rp[base + t] = r; wl *= (1 + r); hist[t + 1] = wl;
        if (wl > pk) pk = wl;
        var d = (pk - wl) / pk; if (d > mdd) mdd = d;
      }
      mdds.push(mdd * 100); terms.push(wl);
      var w12 = 0; for (t = 12; t <= T; t++) { var x = hist[t] / hist[t - 12] - 1; if (x < w12) w12 = x; }
      w12s.push(w12 * 100);
    }
    var srt = Float64Array.from(rp).sort();
    var q = function (a) { return srt[Math.max(0, Math.min(srt.length - 1, Math.floor(a * srt.length)))]; };
    var es = function (a) { var k = Math.max(1, Math.floor(a * srt.length)), s = 0; for (var i = 0; i < k; i++) s += srt[i]; return s / k; };
    var rfm = Math.pow(1 + rf, 1 / 12) - 1, ds = 0;
    for (i = 0; i < rp.length; i++) { var dd = Math.min(0, rp[i] - rfm); ds += dd * dd; }
    var pc = function (a, x) { a.sort(function (u, v) { return u - v; }); return a[Math.max(0, Math.min(a.length - 1, Math.floor(x * a.length)))]; };
    return { var95: -q(0.05) * 100, var99: -q(0.01) * 100, cvar95: -es(0.05) * 100, cvar99: -es(0.01) * 100,
      mddMed: pc(mdds, 0.5), mddP95: pc(mdds, 0.95), worst12: pc(w12s, 0.05),
      downDev: Math.sqrt(ds / rp.length * 12), termMed: pc(terms, 0.5), termP5: pc(terms, 0.05), termP95: pc(terms, 0.95) };
  };
  /** equal risk contribution across the first m assets (damped fixed point, as the optimizer's
      risk parity preset; assets from index m on get zero) */
  O.riskParity = function (S, m) {
    var N = S.length, M = m == null ? N : m, w = new Array(N).fill(0);
    for (var i = 0; i < M; i++) w[i] = 1 / M;
    for (var it = 0; it < 400; it++) {
      var sw = [], tot = 0;
      for (i = 0; i < M; i++) { var s = 0; for (var j = 0; j < M; j++) s += S[i][j] * w[j]; sw[i] = s; tot += w[i] * s; }
      if (tot < 1e-14) break;
      var t = tot / M, sum = 0;
      for (i = 0; i < M; i++) { w[i] = Math.max(1e-6, w[i] * Math.pow(t / Math.max(1e-14, w[i] * sw[i]), 0.15)); sum += w[i]; }
      for (i = 0; i < M; i++) w[i] /= sum;
    }
    return w;
  };
  /** equal risk contribution, solved to tight tolerance (Newton-free multiplicative updates
      with step 0.5 until every risk share is within tol of 1/N) */
  O.erc = function (S, tol) {
    tol = tol || 1e-10;
    var N = S.length, w = S.map(function (r, i) { return 1 / Math.sqrt(S[i][i]); }), s0 = PM.sum(w);
    w = w.map(function (x) { return x / s0; });
    for (var it = 0; it < 5000; it++) {
      var rc = O.riskContrib(w, S).map(function (x) { return x / 100; }), err = 0;
      rc.forEach(function (x) { err = Math.max(err, Math.abs(x - 1 / N)); });
      if (err < tol) break;
      w = w.map(function (x, i) { return x * Math.pow((1 / N) / rc[i], 0.5); });
      var s = PM.sum(w); w = w.map(function (x) { return x / s; });
    }
    return w;
  };

  /** Black-Litterman posterior expected returns.
      pi = delta Sigma w_mkt;  mu = [(tau Sigma)^-1 + P' Omega^-1 P]^-1 [(tau Sigma)^-1 pi + P' Omega^-1 Q].
      If omega is omitted, Omega = diag(P tau Sigma P') (He and Litterman). Returns {pi, mu, omega}. */
  O.blackLitterman = function (S, wMkt, delta, tau, P, Q, omega) {
    var pi = PM.matVec(S, wMkt).map(function (x) { return delta * x; });
    if (!P || !P.length) return { pi: pi, mu: pi.slice(), omega: [] };
    var tS = S.map(function (r) { return r.map(function (v) { return v * tau; }); });
    var Om = omega || P.map(function (p) { return PM.dot(p, PM.matVec(tS, p)); });
    var tSi = PM.inverse(tS), Pt = PM.transpose(P);
    var OmiP = P.map(function (p, k) { return p.map(function (v) { return v / Om[k]; }); });
    var A = tSi.map(function (r, i) { return r.map(function (v, j) { var s = v; for (var k = 0; k < P.length; k++) s += Pt[i][k] * OmiP[k][j]; return s; }); });
    var b = PM.matVec(tSi, pi).map(function (v, i) { var s = v; for (var k = 0; k < P.length; k++) s += Pt[i][k] * Q[k] / Om[k]; return s; });
    return { pi: pi, mu: PM.solve(A, b), omega: Om };
  };

  /** resampled efficient frontier (Michaud): draw nSim samples of T months from N(mu/12, S/12),
      re-estimate mu and Sigma, solve the frontier at the same return ranks, average the weights.
      Returns {weights: [K x N], points: [{r, v}] on the true inputs}. */
  O.resampledFrontier = function (mu, S, proj, o) {
    o = o || {};
    var N = mu.length, K = o.K || 12, nSim = o.nSim || 40, T = o.T || 120, rng = PM.mulberry32(o.seed || 1), z = PM.normalGen(rng);
    var L = PM.cholesky(S.map(function (r) { return r.map(function (v) { return v / 12; }); }));
    var acc = []; for (var k = 0; k < K; k++) acc.push(new Array(N).fill(0));
    for (var s = 0; s < nSim; s++) {
      var rows = [];
      for (var t = 0; t < T; t++) {
        var e = []; for (var i = 0; i < N; i++) e[i] = z();
        rows.push(mu.map(function (m, i) { var v = m / 12; for (var j = 0; j <= i; j++) v += L[i][j] * e[j]; return v; }));
      }
      var mh = mu.map(function (_, i) { return PM.mean(rows.map(function (r) { return r[i]; })) * 12; });
      var Sh = PM.covMatrix(rows).map(function (r) { return r.map(function (v) { return v * 12; }); });
      var warm = new Array(N).fill(1 / N);
      for (k = 0; k < K; k++) {
        var u = k / (K - 1);
        warm = O.mvSolve(mh, Sh, 9 * u * u, proj, warm, 120);
        for (i = 0; i < N; i++) acc[k][i] += warm[i] / nSim;
      }
    }
    var weights = acc.map(function (w) { return proj(w); });
    return { weights: weights, points: weights.map(function (w) { return { w: w, r: O.portMu(w, mu), v: O.portVol(w, S) }; }) };
  };

  /** Brinson-Hood-Beebower attribution. alloc = sum (wp - wb) rb, selection = sum wb (rp - rb),
      interaction = sum (wp - wb)(rp - rb). total is computed independently as rp_tot - rb_tot,
      so alloc + sel + inter = total is a real check (as in the original macro dashboard). */
  PM.brinson = function (wp, wb, rp, rb) {
    var alloc = 0, sel = 0, inter = 0, rpTot = 0, rbTot = 0, rows = [];
    for (var i = 0; i < wb.length; i++) {
      var a = (wp[i] - wb[i]) * rb[i], s = wb[i] * (rp[i] - rb[i]), x = (wp[i] - wb[i]) * (rp[i] - rb[i]);
      alloc += a; sel += s; inter += x; rpTot += wp[i] * rp[i]; rbTot += wb[i] * rb[i];
      rows.push({ alloc: a, sel: s, inter: x });
    }
    var total = rpTot - rbTot;
    return { alloc: alloc, sel: sel, inter: inter, total: total, resid: (alloc + sel + inter) - total, rpTot: rpTot, rbTot: rbTot, rows: rows };
  };

  /** total portfolio approach: marginal contribution of a candidate to total risk and to
      active risk against a reference portfolio. Returns {vol, activeVol, mctr[], ctrActive[]} where
      ctrActive_i = (w - wRef)_i (Sigma (w - wRef))_i / activeVol. */
  O.tpa = function (w, wRef, S) {
    var a = w.map(function (v, i) { return v - wRef[i]; });
    var Sa = PM.matVec(S, a), Sw = PM.matVec(S, w), vol = O.portVol(w, S), av = O.portVol(a, S);
    return { vol: vol, activeVol: av, mctr: Sw.map(function (x) { return vol > 0 ? x / vol : 0; }), ctrActive: a.map(function (x, i) { return av > 0 ? x * Sa[i] / av : 0; }) };
  };
  /** trades back to target within a tolerance band: assets outside [target - band, target + band]
      are traded back to the band edge (or to target if toTarget), funded pro rata from the rest. */
  O.rebalance = function (w, target, band, toTarget) {
    var n = w.length, trade = new Array(n).fill(0), net = 0;
    for (var i = 0; i < n; i++) {
      var lo = target[i] - band[i], hi = target[i] + band[i];
      if (w[i] > hi) trade[i] = (toTarget ? target[i] : hi) - w[i];
      else if (w[i] < lo) trade[i] = (toTarget ? target[i] : lo) - w[i];
      net += trade[i];
    }
    if (Math.abs(net) > 1e-12) {
      var free = []; for (i = 0; i < n; i++) if (trade[i] === 0) free.push(i);
      var tot = free.reduce(function (s, k) { return s + w[k]; }, 0) || 1;
      free.forEach(function (k) { trade[k] = -net * w[k] / tot; });
    }
    return { trade: trade, after: w.map(function (v, i) { return v + trade[i]; }), turnover: trade.reduce(function (s, t) { return s + Math.abs(t); }, 0) / 2 };
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Inference helpers, copied verbatim from the Alpha Signal Discovery
   Engine (commit bbdb266, lines 549-580): Newey-West HAC standard
   error, normal CDF (Abramowitz and Stegun 7.1.26) and inverse normal
   CDF (Acklam). Used by the manager research tools.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, mean = PM.mean;
  function hacLag(n,h){var b=Math.floor(4*Math.pow(n/100,2/9));return Math.max(0,Math.max(h-1,b))}
  function hacSE(a,lag){
    var n=a.length;if(n<3)return 0;
    var m=mean(a),i,l,g0=0;
    for(i=0;i<n;i++){var d=a[i]-m;g0+=d*d}g0/=n;
    var v=g0;
    for(l=1;l<=lag&&l<n;l++){
      var gl=0;for(i=l;i<n;i++)gl+=(a[i]-m)*(a[i-l]-m);gl/=n;
      v+=2*(1-l/(lag+1))*gl;
    }
    if(v<g0*.05)v=g0*.05;   // guard against a degenerate HAC estimate
    return Math.sqrt(v/n);
  }
  // Normal CDF (Abramowitz & Stegun 7.1.26) and inverse CDF (Acklam's rational fit)
  function normCdf(x){
    var sg=x<0?-1:1,z=Math.abs(x)/Math.SQRT2,tt=1/(1+.3275911*z);
    var y=1-(((((1.061405429*tt-1.453152027)*tt)+1.421413741)*tt-.284496736)*tt+.254829592)*tt*Math.exp(-z*z);
    return .5*(1+sg*y);
  }
  function normInv(p){
    if(p<=0)return -8;if(p>=1)return 8;
    var A=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239],
        B=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1],
        C=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
        D=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996,3.754408661907416],q,r;
    if(p<.02425){q=Math.sqrt(-2*Math.log(p));
      return(((((C[0]*q+C[1])*q+C[2])*q+C[3])*q+C[4])*q+C[5])/((((D[0]*q+D[1])*q+D[2])*q+D[3])*q+1)}
    if(p>1-.02425){q=Math.sqrt(-2*Math.log(1-p));
      return -(((((C[0]*q+C[1])*q+C[2])*q+C[3])*q+C[4])*q+C[5])/((((D[0]*q+D[1])*q+D[2])*q+D[3])*q+1)}
    q=p-.5;r=q*q;
    return(((((A[0]*r+A[1])*r+A[2])*r+A[3])*r+A[4])*r+A[5])*q/(((((B[0]*r+B[1])*r+B[2])*r+B[3])*r+B[4])*r+1);
  }
  /** hacLag(n, h): Newey-West lag, at least h - 1 for overlapping h-period returns.
      hacSE(a, lag): HAC standard error of the mean of a.  normCdf(x), normInv(p). */
  PM.hacLag = hacLag; PM.hacSE = hacSE; PM.normCdf = normCdf; PM.normInv = normInv;
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Liquidity and capital call coverage (used by Agentic Portfolio
   Monitoring and the Private Capital Lab).
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM;
  /** share of the portfolio (same units as weights) sellable within d days */
  PM.liquidWithin = function (weights, liqDays, d) { return weights.reduce(function (a, w, i) { return a + (liqDays[i] <= d ? w : 0); }, 0); };
  /** capital call coverage = liquid assets / (unfunded commitments + calls already noticed).
      Infinity when nothing is owed. */
  PM.callCoverage = function (liquidValue, unfunded, pending) { var c = unfunded + (pending || 0); return c > 0 ? liquidValue / c : Infinity; };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Private markets program: pacing to a target, pacing under
   uncertainty, NAV nowcasting, roll-forward reconciliation,
   semi-liquid (evergreen) fund redemptions.
   All amounts in $m; quarterly steps where noted.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, P = PM.priv = {};

  /** navPerDollar(model, ages): NAV per $1 committed at each age (years) under the
      Takahashi-Alexander model, e.g. [0, nav(age1), ...]; the curve every plan builds on. */
  P.navCurve = function (m) {
    var f = PM.taFund({ commit: 1, rc: m.rc, ip: m.ip, life: m.life, growth: m.growth, bow: m.bow, yieldFloor: m.yieldFloor || 0 });
    return { nav: f.nav, calls: f.calls, dists: f.dists };
  };

  /** RD(age): Takahashi-Alexander distribution rate at a fund age (years) */
  function rd(m, age) { return age >= m.life ? 1 : Math.max(m.yieldFloor || 0, Math.pow(Math.max(0, age) / m.life, m.bow)); }
  P.distRate = rd;

  /** project(o, commits): deterministic annual projection of a program under the
      Takahashi-Alexander rules, applied to every fund from its current state.
      o = {pub0, funds: [{unfunded, nav, age}], model, pubReturn, spend, years}
      commits[y] is committed at the start of year y + 1 as a new fund of age 0.
      Each year, for each fund: age += 1; call = rc x unfunded while age <= ip;
      NAV = (NAV + call)(1 + growth); dist = RD(age) x NAV.
      Public assets: pub = pub (1 + pubReturn) - calls + dists - spend x (pub + NAV) at the start of the year.
      Returns per-year rows {year, commit, calls, dists, net, nav, unfunded, pub, assets, pct}. */
  P.project = function (o, commits) {
    var m = o.model, funds = o.funds.map(function (f) { return { unf: f.unfunded, nav: f.nav, age: f.age }; });
    var pub = o.pub0, rows = [];
    for (var y = 1; y <= o.years; y++) {
      var c = commits[y - 1] || 0;
      if (c > 0) funds.push({ unf: c, nav: 0, age: 0 });
      var navStart = PM.sum(funds.map(function (f) { return f.nav; })), spend = o.spend * (pub + navStart);
      var calls = 0, dists = 0, nav = 0, unf = 0;
      funds.forEach(function (f) {
        f.age += 1;
        var call = f.age <= m.ip ? m.rc * f.unf : 0; f.unf -= call; calls += call;
        f.nav = (f.nav + call) * (1 + m.growth);
        var d = rd(m, f.age) * f.nav; f.nav -= d; dists += d;
        nav += f.nav; unf += f.unf;
      });
      pub = pub * (1 + o.pubReturn) - calls + dists - spend;
      rows.push({ year: y, commit: c, calls: calls, dists: dists, net: dists - calls, nav: nav, unfunded: unf, pub: pub, assets: pub + nav, pct: nav / (pub + nav) });
    }
    return rows;
  };

  /** pacingPlan(o): annual commitments that reach and hold a target private allocation.
      o = project() inputs plus {targetPct, horizon (years)}.
      Year t's commitment c_t is found by bisection so that, committing c_t in every year from t to
      t + horizon - 1 on top of the commitments already chosen, the projected private share at the end
      of year t + horizon - 1 equals the target (zero if the target is met without committing).
      Returns the projection under the chosen commitments. */
  P.pacingPlan = function (o) {
    var Y = o.years, H = o.horizon || 4, chosen = [];
    for (var t = 0; t < Y; t++) {
      var pctWith = function (c) {
        var cs = chosen.slice(); for (var k = t; k < t + H; k++) cs[k] = c;
        var rows = P.project(Object.assign({}, o, { years: t + H }), cs);
        return rows[t + H - 1].pct;
      };
      var lo = 0, hi = (o.pub0 + PM.sum(o.funds.map(function (f) { return f.nav; }))) * 0.5;
      if (pctWith(0) >= o.targetPct) { chosen.push(0); continue; }
      for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (pctWith(mid) < o.targetPct) lo = mid; else hi = mid; }
      chosen.push((lo + hi) / 2);
    }
    return P.project(o, chosen);
  };

  /** pacingMC(o): quarterly Monte Carlo of the same program with shocks.
      o = project() inputs plus {plan: [annual commitments], quarters, seed, paths, pubMu, pubVol,
          privBeta, privVol, callVol, distBeta, band: [lo, hi], liquidPctOfPublic, coverageMin}
      Quarterly rates are the annual model rates converted exactly ((1 + g)^(1/4) - 1 and so on), so
      with every volatility at zero the median path matches project() up to quarterly compounding.
      Shocks are lognormal so that the median compound growth of public assets is pubMu and of private NAV
      is the model growth (the deterministic plan's rates): log(1 + r_pub) = log(1 + pubMu)/4 + pubVol/2 z1,
      log(1 + r_priv) = log(1 + growth)/4 + privBeta pubVol/2 z1 + privVol/2 z2; call rate x lognormal(callVol);
      distribution rate x (1 + distBeta x 4 x the public shock).
      Returns quantile bands of private share and net cash flow, and the share of paths that breach the
      upper band, or where liquid public assets fall below coverageMin x unfunded, in any quarter. */
  P.pacingMC = function (o) {
    var m = o.model, rng = PM.mulberry32(o.seed), z = PM.normalGen(rng), Q = o.quarters, out = { pct: [], net: [] };
    var gq = Math.pow(1 + m.growth, 0.25) - 1, rcq = 1 - Math.pow(1 - m.rc, 0.25), breach = 0, short = 0;
    for (var p = 0; p < o.paths; p++) {
      var pub = o.pub0, pct = [], net = [], br = false, sf = false;
      var pool = o.funds.map(function (f) { return { unf: f.unfunded, nav: f.nav, age: f.age }; });
      for (var q = 1; q <= Q; q++) {
        if ((q - 1) % 4 === 0) { var yr = (q - 1) / 4; if (o.plan[yr] > 0) pool.push({ unf: o.plan[yr], nav: 0, age: 0 }); }
        var zp = z(), zi = z(), zc = z();
        var lp = Math.log(1 + o.pubMu) / 4, rPub = Math.exp(lp + o.pubVol / 2 * zp) - 1, ex = Math.exp(o.pubVol / 2 * zp) - 1;
        var rPriv = Math.exp(Math.log(1 + gq) + o.privBeta * o.pubVol / 2 * zp + o.privVol / 2 * zi) - 1;
        var shock = Math.exp(o.callVol * zc - 0.5 * o.callVol * o.callVol);
        var navStart = 0; pool.forEach(function (f) { navStart += f.nav; });
        var spend = o.spend / 4 * (pub + navStart), calls = 0, dists = 0, nav = 0, unfunded = 0;
        pool.forEach(function (f) {
          f.age += 0.25;
          var c = f.age <= m.ip + 1e-9 ? f.unf * Math.min(1, rcq * shock) : 0; f.unf -= c; calls += c;
          f.nav = Math.max(0, (f.nav + c) * (1 + rPriv));
          var dq = 1 - Math.pow(1 - Math.min(0.999999, rd(m, Math.ceil(f.age - 1e-9))), 0.25);   // the annual rate of the fund year being spanned
          dq = Math.max(0, Math.min(1, dq * (1 + o.distBeta * ex * 4)));
          var d = f.nav * dq; f.nav -= d; dists += d;
          nav += f.nav; unfunded += f.unf;
        });
        pub = pub * (1 + rPub) - calls + dists - spend;
        var pv = nav / (pub + nav);
        pct.push(pv); net.push(dists - calls);
        if (pv > o.band[1]) br = true;
        if (pub * o.liquidPctOfPublic < unfunded * o.coverageMin) sf = true;
      }
      out.pct.push(pct); out.net.push(net);
      if (br) breach++; if (sf) short++;
    }
    var qs = function (arr) {
      var res = { p10: [], p25: [], p50: [], p75: [], p90: [] };
      for (var q = 0; q < Q; q++) {
        var col = arr.map(function (r) { return r[q]; });
        res.p10.push(PM.quantile(col, 0.1)); res.p25.push(PM.quantile(col, 0.25)); res.p50.push(PM.quantile(col, 0.5)); res.p75.push(PM.quantile(col, 0.75)); res.p90.push(PM.quantile(col, 0.9));
      }
      return res;
    };
    out.breachProb = breach / o.paths; out.shortfallProb = short / o.paths;
    out.pctQ = qs(out.pct); out.netQ = qs(out.net);
    return out;
  };

  /** nowcastFit(navRet, proxyRet, lags): distributed-lag regression of reported quarterly NAV
      returns on the public proxy, r_nav_t = a + b0 r_t + b1 r_t-1 + ... + bL r_t-L + e.
      Smoothed marks spread a market move over several quarters, so the sum of the b's is the
      fund's economic beta. Returns {alpha, betas[], beta (sum), r2, sigma, n}. */
  P.nowcastFit = function (navRet, proxyRet, lags) {
    var L = lags == null ? 2 : lags, y = [], X = [];
    for (var t = L; t < navRet.length; t++) {
      var row = []; for (var j = 0; j <= L; j++) row.push(proxyRet[t - j]);
      y.push(navRet[t]); X.push(row);
    }
    if (y.length < L + 4) return null;
    var f = PM.ols(y, X);
    return { alpha: f.alpha, betas: f.beta, beta: PM.sum(f.beta), r2: f.r2, sigma: PM.std(f.resid), n: y.length };
  };
  /** nowcast(o): roll the last reported NAV forward to today.
      o = {nav, flows: [{q, amount}] (contributions positive, distributions negative, q = quarters after
      the NAV date), proxy: [proxy returns for each quarter after the NAV date], betas: [b0..bL],
      proxyBefore: [r at the NAV quarter, r one quarter earlier, ...], alpha, sigma}
      Two parts: (1) catch-up, the lagged response to proxy returns already in the past at the NAV date
      that the reported mark has not yet absorbed: sum_j>=1 sum_i>=j b_i r_(navQ-j+1);
      (2) each stale quarter k: NAV_k = (NAV_k-1 + flows_k)(1 + alpha + B r_k), B = sum of betas.
      Band: +/- 1.645 sigma sqrt(quarters stale + 1).  If betas is omitted, o.beta is used for (2) only.
      With zero proxy returns, zero alpha and no flows the nowcast equals the reported NAV. */
  P.nowcast = function (o) {
    var betas = o.betas || [o.beta], B = PM.sum(betas), before = o.proxyBefore || [], catchUp = 0;
    for (var j = 1; j < betas.length; j++) { var w = 0; for (var i = j; i < betas.length; i++) w += betas[i]; catchUp += w * (before[j - 1] || 0); }
    var nav = o.nav * (1 + catchUp), k = o.proxy.length, path = [o.nav, nav];
    for (var q = 0; q < k; q++) {
      var fl = 0; (o.flows || []).forEach(function (f) { if (f.q === q + 1) fl += f.amount; });
      nav = (nav + fl) * (1 + (o.alpha || 0) + B * o.proxy[q]);
      path.push(nav);
    }
    var band = 1.645 * (o.sigma || 0) * Math.sqrt(k + 1);
    return { nav: nav, lo: nav * (1 - band), hi: nav * (1 + band), path: path, quarters: k, catchUp: catchUp, beta: B };
  };

  /** rollForward(s): capital account identity. opening + contributions - distributions + gains
      (net of fees, income and expenses) = closing. Returns {expected, break} with break = closing - expected. */
  P.rollForward = function (s) {
    var exp = s.opening + s.contributions - s.distributions + s.gains;
    return { expected: exp, break: s.closing - exp };
  };

  /** evergreen(o): quarterly simulation of a semi-liquid private markets fund.
      o = {nav0, sleevePct (liquid sleeve share of NAV), facility (credit line, $m), limitPct (quarterly
      redemption limit, share of NAV), requests: [share of NAV requested each quarter], returns: [private
      asset return each quarter], sleeveReturn, saleDiscount (haircut on forced private sales),
      subscriptions: [share of NAV], facilityRate (annual)}
      Each quarter: new requests join the queue; paid = min(queue, limitPct x NAV); paid from the
      sleeve, then the facility, then forced sales of private assets at the discount. Unpaid requests
      stay queued (the fund is gated). Returns per-quarter rows and totals. */
  P.evergreen = function (o) {
    var priv = o.nav0 * (1 - o.sleevePct), sleeve = o.nav0 * o.sleevePct, drawn = 0, queue = 0, rows = [], forcedTot = 0, lossTot = 0;
    for (var q = 0; q < o.requests.length; q++) {
      priv *= 1 + o.returns[q]; sleeve *= 1 + (o.sleeveReturn || 0) / 4;
      var interest = drawn * (o.facilityRate || 0) / 4; sleeve -= interest;
      var nav = priv + sleeve - drawn;
      var subs = (o.subscriptions ? o.subscriptions[q] || 0 : 0) * nav; sleeve += subs; nav += subs;
      var req = o.requests[q] * nav; queue += req;
      var cap = o.limitPct * nav, pay = Math.min(queue, cap), need = pay;
      var fromSleeve = Math.min(sleeve, need); sleeve -= fromSleeve; need -= fromSleeve;
      var fromFac = Math.min(Math.max(0, o.facility - drawn), need); drawn += fromFac; need -= fromFac;
      var sold = need / (1 - o.saleDiscount); var loss = sold - need;
      if (sold > priv) { sold = priv; need = sold * (1 - o.saleDiscount); pay = fromSleeve + fromFac + need; loss = sold - need; }
      priv -= sold; forcedTot += sold; lossTot += loss;
      queue -= pay;
      var navAfter = priv + sleeve - drawn;
      rows.push({ q: q + 1, nav: nav, requested: req, cap: cap, paid: pay, queue: queue, fromSleeve: fromSleeve, fromFacility: fromFac, forcedSale: sold, saleLoss: loss, drawn: drawn, sleeve: sleeve, navAfter: navAfter, gated: queue > 1e-9, paidPctOfNav: nav > 0 ? pay / nav : 0 });
    }
    return { rows: rows, forcedSales: forcedTot, saleLoss: lossTot, finalNav: rows.length ? rows[rows.length - 1].navAfter : o.nav0, maxQueue: Math.max.apply(null, rows.map(function (r) { return r.queue; }).concat([0])) };
  };

  /** quarterly dated cash flows -> {irr (annual, XIRR), tvpi, dpi, rvpi, ksPme, directAlpha (annualised)}.
      flows: [{q, amount}] LP view (calls negative), nav at the last quarter, index: proxy level per quarter. */
  P.fundMetrics = function (flows, nav, index, startDate) {
    var d0 = startDate || Date.UTC(2015, 0, 1), Q = index ? index.length - 1 : Math.max.apply(null, flows.map(function (f) { return f.q; }));
    var dated = flows.map(function (f) { return { date: new Date(d0 + f.q * 91.3125 * 86400000), amount: f.amount }; });
    dated.push({ date: new Date(d0 + Q * 91.3125 * 86400000), amount: nav });
    var m = PM.multiples(flows.map(function (f) { return f.amount; }), nav);
    var res = { irr: PM.xirr(dated), tvpi: m.tvpi, dpi: m.dpi, rvpi: m.rvpi, paidIn: m.paidIn, distributed: m.distributed };
    if (index) {
      var fl = flows.map(function (f) { return { t: f.q, amount: f.amount }; });
      res.ksPme = PM.ksPME(fl, index, nav);
      var da = PM.directAlpha(fl, index, nav);
      res.directAlpha = isFinite(da) ? Math.pow(1 + da, 4) - 1 : NaN;
    }
    return res;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Allocation helpers: stress, liquidity after stress, candidate
   investments under a total portfolio approach, regime tilts.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, O = PM.opt;
  /** stressReturn(w, shocks): portfolio return under per-asset shocks (sum w_i s_i) */
  O.stress = function (w, shocks) { return PM.dot(w, shocks); };
  /** liquidAfterStress(w, liquid, shocks): value of the liquid sleeve after a stress, per $1 of
      starting portfolio: sum over liquid assets of w_i (1 + s_i). Linear in w, so it can be a
      constraint: liquidAfterStress(w) >= required. Returns {value, coeffs} (coeffs = the linear form). */
  O.liquidAfterStress = function (w, liquid, shocks) {
    var a = w.map(function (_, i) { return liquid[i] ? 1 + shocks[i] : 0; });
    return { value: PM.dot(a, w), coeffs: a };
  };
  /** candidate(w, dw, mu, S, wRef): judge a change dw (sums to zero) by its effect on the total
      portfolio and on active risk against a reference portfolio.
      Returns {dRet, dVol, dActive, ratio}: ratio = dRet / dVol when risk rises (return earned per
      unit of added risk); when risk falls and return rises the change dominates (ratio = Infinity). */
  O.candidate = function (w, dw, mu, S, wRef) {
    var w2 = w.map(function (v, i) { return v + dw[i]; });
    var r1 = O.portMu(w, mu), r2 = O.portMu(w2, mu), v1 = O.portVol(w, S), v2 = O.portVol(w2, S);
    var a1 = O.tpa(w, wRef, S).activeVol, a2 = O.tpa(w2, wRef, S).activeVol;
    var dRet = r2 - r1, dVol = v2 - v1;
    return { w: w2, dRet: dRet, dVol: dVol, dActive: a2 - a1, ratio: dVol > 1e-12 ? dRet / dVol : (dRet >= 0 ? Infinity : -Infinity) };
  };
  /** regimeTilt(probs, tilts, conviction): tactical tilt as the probability-weighted sum of
      per-regime tilt vectors, scaled by conviction in [0, 1]. Tilts should each sum to zero. */
  O.regimeTilt = function (probs, tilts, conviction) {
    var n = tilts[0].length, t = new Array(n).fill(0);
    probs.forEach(function (p, k) { for (var i = 0; i < n; i++) t[i] += p * tilts[k][i]; });
    return t.map(function (x) { return x * (conviction == null ? 1 : conviction); });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Manager research: deal-level track records, value creation,
   returns-based style analysis, clustering, bootstrap skill tests,
   persistence. And fund terms: subscription line adjustment.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, M = PM.mgr = {}, TR = PM.terms = PM.terms || {};

  /** deal value = realized + unrealized; gain = value - invested; MOIC = value / invested */
  function dv(d) { return d.realized + d.unrealized; }
  /** trackRecord(deals): {invested, value, moic, gains, lossRatio, dispersion, top1Share, top3Share,
      realizedShare, exBest: {moic, gains}, deals: [...with moic and gain]}.
      lossRatio = invested capital in deals with MOIC < 1 / total invested.
      topNShare = share of total gains from the N largest gains (gains, not value, so losses count).
      dispersion = standard deviation of deal MOICs (sample). exBest removes the deal with the largest gain. */
  M.trackRecord = function (deals) {
    var inv = 0, val = 0, lossInv = 0, real = 0, rows = deals.map(function (d) { var v = dv(d); return Object.assign({}, d, { value: v, moic: v / d.invested, gain: v - d.invested }); });
    rows.forEach(function (d) { inv += d.invested; val += d.value; real += d.realized; if (d.moic < 1) lossInv += d.invested; });
    var gains = val - inv, byGain = rows.slice().sort(function (a, b) { return b.gain - a.gain; });
    var share = function (n) { return gains !== 0 ? PM.sum(byGain.slice(0, n).map(function (d) { return d.gain; })) / gains : NaN; };
    var best = byGain[0], exInv = inv - best.invested, exVal = val - best.value;
    return { invested: inv, value: val, moic: val / inv, gains: gains, lossRatio: lossInv / inv, dispersion: PM.std(rows.map(function (d) { return d.moic; })),
      top1Share: share(1), top3Share: share(3), realizedShare: real / val, best: best, exBest: { moic: exVal / exInv, gains: exVal - exInv, invested: exInv }, deals: rows };
  };
  /** dealIrr(d): gross IRR from entry and exit dates (exit = asOf for unrealized), single in/out flow */
  M.dealIrr = function (d, asOf) {
    var t = ((d.exit || asOf) - d.entry) / (365 * 86400000);
    return t > 0 ? Math.pow(dv(d) / d.invested, 1 / t) - 1 : NaN;
  };
  /** valueBridge(deals): equity value creation split into EBITDA growth, multiple expansion and
      deleveraging, summed over deals. For a deal: EV = multiple x EBITDA, equity = EV - net debt.
        EBITDA growth  = (E1 - E0) x m0
        multiple       = (m1 - m0) x E1
        deleveraging   = D0 - D1
      These add up to equity1 - equity0 exactly. Scaled to the LP's share by invested / equity0. */
  M.valueBridge = function (deals) {
    var g = 0, mx = 0, dl = 0, tot = 0;
    deals.forEach(function (d) {
      var eq0 = d.m0 * d.e0 - d.d0, eq1 = d.m1 * d.e1 - d.d1, s = eq0 > 0 ? d.invested / eq0 : 0;
      var a = (d.e1 - d.e0) * d.m0 * s, b = (d.m1 - d.m0) * d.e1 * s, c = (d.d0 - d.d1) * s;
      g += a; mx += b; dl += c; tot += (eq1 - eq0) * s;
    });
    return { ebitda: g, multiple: mx, deleveraging: dl, total: tot, residual: g + mx + dl - tot };
  };

  /** styleWeights(y, X): returns-based style analysis (Sharpe 1992). Minimise ||y - Xw||^2 subject to
      w >= 0 and sum w = 1, by projected gradient onto the simplex (exact Euclidean projection) with
      a fixed step 1 / L (L = largest eigenvalue bound, trace of X'X). Returns {w, r2, residual}. */
  M.styleWeights = function (y, X, iters) {
    var n = y.length, k = X[0].length, XtX = [], Xty = [];
    for (var a = 0; a < k; a++) { XtX.push([]); var s2 = 0; for (var b = 0; b < k; b++) { var s = 0; for (var i = 0; i < n; i++) s += X[i][a] * X[i][b]; XtX[a].push(s); } for (i = 0; i < n; i++) s2 += X[i][a] * y[i]; Xty.push(s2); }
    var L = 0; for (a = 0; a < k; a++) L += XtX[a][a];
    var w = new Array(k).fill(1 / k), lo = new Array(k).fill(0), hi = new Array(k).fill(1);
    for (var it = 0; it < (iters || 4000); it++) {
      var g = XtX.map(function (r, j) { return PM.dot(r, w) - Xty[j]; });
      w = PM.opt.projBox(w.map(function (v, j) { return v - g[j] / L; }), lo, hi);
    }
    var fit = X.map(function (r) { return PM.dot(r, w); }), res = y.map(function (v, i) { return v - fit[i]; });
    var my = PM.mean(y), sst = 0, sse = 0; y.forEach(function (v, i) { sst += (v - my) * (v - my); sse += res[i] * res[i]; });
    return { w: w, r2: sst > 0 ? 1 - sse / sst : 0, residual: res };
  };

  /** cluster(series, k): average-linkage hierarchical clustering on distance 1 - correlation,
      cut at k clusters. Returns an array of cluster ids (0..k-1) in input order. */
  M.cluster = function (series, k) {
    var n = series.length, D = [];
    for (var i = 0; i < n; i++) { D.push([]); for (var j = 0; j < n; j++) D[i].push(i === j ? 0 : 1 - PM.corr(series[i], series[j])); }
    var cl = series.map(function (_, i) { return [i]; });
    var dist = function (a, b) { var s = 0; a.forEach(function (x) { b.forEach(function (y) { s += D[x][y]; }); }); return s / (a.length * b.length); };
    while (cl.length > k) {
      var bi = 0, bj = 1, bd = 1e9;
      for (i = 0; i < cl.length; i++) for (j = i + 1; j < cl.length; j++) { var d = dist(cl[i], cl[j]); if (d < bd) { bd = d; bi = i; bj = j; } }
      cl[bi] = cl[bi].concat(cl[bj]); cl.splice(bj, 1);
    }
    var ids = new Array(n);
    cl.sort(function (a, b) { return Math.min.apply(null, a) - Math.min.apply(null, b); }).forEach(function (c, ci) { c.forEach(function (x) { ids[x] = ci; }); });
    return ids;
  };

  /** bootstrapAlpha(y, X, o): skill vs luck. OLS alpha and its t-stat, and a stationary block
      bootstrap of the residuals under the null of zero alpha: share of bootstrap t-stats at or above
      the observed one (one-sided p-value). o = {n (draws), block (mean block length), seed}. */
  M.bootstrapAlpha = function (y, X, o) {
    o = o || {};
    var fit = PM.ols(y, X), T = y.length, res = fit.resid, rng = PM.mulberry32(o.seed || 1), B = o.n || 500, L = o.block || 6, ge = 0, ts = [];
    var fitted0 = X.map(function (r) { return PM.dot(r, fit.beta); });
    for (var b = 0; b < B; b++) {
      var ys = [], i = Math.floor(rng() * T);
      for (var t = 0; t < T; t++) { if (rng() < 1 / L) i = Math.floor(rng() * T); ys.push(fitted0[t] + res[i]); i = (i + 1) % T; }
      var f = PM.ols(ys, X); ts.push(f.t[0]); if (f.t[0] >= fit.t[0]) ge++;
    }
    return { alpha: fit.alpha, t: fit.t[0], beta: fit.beta, r2: fit.r2, p: (ge + 1) / (B + 1), tDist: ts };
  };

  /** quartiles of values (1 = top) */
  M.quartile = function (values) {
    var s = values.slice().sort(function (a, b) { return b - a; });
    return values.map(function (v) { var r = s.indexOf(v) / values.length; return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4; });
  };
  /** persistence(q1, q2): 4x4 transition matrix, row = quartile in period 1, share landing in each quartile in period 2 */
  M.persistence = function (q1, q2) {
    var m = [0, 0, 0, 0].map(function () { return [0, 0, 0, 0]; }), c = [0, 0, 0, 0];
    q1.forEach(function (a, i) { m[a - 1][q2[i] - 1]++; c[a - 1]++; });
    return m.map(function (r, i) { return r.map(function (x) { return c[i] ? x / c[i] : 0; }); });
  };

  /** sublineAdjust(flows): LP cash flows as if capital had been called on the investment date
      instead of being bridged by a subscription line. flows: [{date, amount, investDate?}] where a call
      carries investDate when the GP drew on the line first. Returns the rebuilt flows. The fee for
      the line is left in the rebuilt calls (it is part of the cost either way). */
  TR.sublineAdjust = function (flows) {
    return flows.map(function (f) { return f.amount < 0 && f.investDate ? { date: f.investDate, amount: f.amount } : { date: f.date, amount: f.amount }; })
      .sort(function (a, b) { return a.date - b.date; });
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ------------------------------------------------------------------
   Fund terms: management fee recomputation and carry waterfalls.
   ------------------------------------------------------------------ */
(function (root) {
  'use strict';
  var PM = root.PM, TR = PM.terms = PM.terms || {};
  /** mgmtFee(q): one quarter's management fee for an LP.
      q = {inIP (bool), commitment (fund), netInvested (fund, at quarter start), rateIP, ratePost,
           lpShare, portfolioFees (fund-level transaction, monitoring and directors' fees in the quarter),
           offsetPct}
      gross = (inIP ? rateIP x commitment : ratePost x netInvested) / 4 x lpShare
      offset = offsetPct x portfolioFees x lpShare (never more than gross); net = gross - offset */
  TR.mgmtFee = function (q) {
    var gross = (q.inIP ? q.rateIP * q.commitment : q.ratePost * q.netInvested) / 4 * q.lpShare;
    var offset = Math.min(gross, (q.offsetPct || 0) * (q.portfolioFees || 0) * q.lpShare);
    return { gross: gross, offset: offset, net: gross - offset };
  };
  function yrs(a, b) { return (b - a) / (365 * 86400000); }
  /** european(events, t): whole-fund waterfall over dated LP contributions and gross distributions.
      events: [{date, contribution} | {date, distribution}] (positive amounts). t = {pref, carry, catchUp}
      Tiers on each distribution: (1) return of contributed capital; (2) preferred return, compounding
      annually on unreturned capital and unpaid pref; (3) GP catch-up at rate catchUp (1 = full) until the
      GP holds carry x (pref paid + catch-up); (4) split (1 - carry) / carry.
      Returns {lp, gp, rows: [{date, amount, lp, gp, tiers}], unreturned, prefOwed}. */
  TR.european = function (events, t) {
    var ev = events.slice().sort(function (a, b) { return a.date - b.date; });
    var unret = 0, prefDue = 0, prefPaid = 0, gpCU = 0, lp = 0, gp = 0, last = ev.length ? ev[0].date : 0, rows = [];
    ev.forEach(function (e) {
      var g = Math.pow(1 + t.pref, yrs(last, e.date)) - 1;
      prefDue += (unret + prefDue) * g; last = e.date;
      if (e.contribution) { unret += e.contribution; return; }
      var d = e.distribution, a = Math.min(d, unret); unret -= a; d -= a;
      var b = Math.min(d, prefDue); prefDue -= b; prefPaid += b; d -= b;
      /* catch-up: GP receives catchUp of each dollar until gp = carry x (prefPaid + gp) */
      var target = t.carry * prefPaid / (1 - t.carry), need = Math.max(0, target - gpCU), c = 0;
      if (need > 0 && d > 0) { var take = Math.min(d, need / (t.catchUp || 1)); c = take * (t.catchUp || 1); var lpc = take - c; gpCU += c; lp += lpc; d -= take; }
      var split = d * t.carry, lpLast = d - split;
      var lpRow = a + b + lpLast + (rows.length ? 0 : 0), gpRow = c + split;
      lp += a + b + lpLast; gp += gpRow;
      rows.push({ date: e.date, amount: e.distribution, lp: e.distribution - gpRow, gp: gpRow, tiers: { capital: a, pref: b, catchUp: c, split: split } });
    });
    return { lp: lp, gp: gp, rows: rows, unreturned: unret, prefOwed: prefDue };
  };
  /** american(deals, t): deal-by-deal waterfall. deals: [{invested, proceeds, years}] with years
      the holding period. Each realized deal returns its own capital and a pref compounded over its own
      hold, then catch-up and split, with no netting of losses on other deals (hence clawback risk).
      Returns {gp, lp, byDeal}. */
  TR.american = function (deals, t) {
    var gp = 0, lp = 0, by = deals.map(function (d) {
      var r = TR.european([{ date: 0, contribution: d.invested }, { date: d.years * 365 * 86400000, distribution: d.proceeds }], t);
      gp += r.gp; lp += r.lp; return { gp: r.gp, lp: r.lp };
    });
    return { gp: gp, lp: lp, byDeal: by };
  };
})(typeof window !== 'undefined' ? window : globalThis);

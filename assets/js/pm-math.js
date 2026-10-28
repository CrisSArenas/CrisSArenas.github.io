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

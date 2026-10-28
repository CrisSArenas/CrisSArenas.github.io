/* =====================================================================
   pm-ui.js, shared demo components (plain script, no build step).
   Exposes window.UI. Components: tabs, SVG charts, KPI tiles with
   "Explain this number", tables registered for CSV export, agent log,
   tamper-evident audit log, approval cards, document viewer with
   citations, assumptions register, export menu, local data drop zone,
   work counters, evaluation helpers, model tests badge.
   Nothing here makes a network call with user data.
   ===================================================================== */
(function (global) {
  'use strict';
  var UI = {};

  /* ---------- DOM helpers ---------- */
  UI.$ = function (s, r) { return (r || document).querySelector(s); };
  UI.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.el = function (tag, attrs) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  };
  function resolve(el) { return typeof el === 'string' ? document.querySelector(el) : el; }
  UI.resolve = resolve;

  /* ---------- number formatting ---------- */
  var F = UI.fmt = {};
  function fixed(x, d) {
    if (x == null || !isFinite(x)) return '–';
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;   // no negative zero
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  F.num = function (x, d) { return fixed(x, d == null ? 1 : d); };
  F.int = function (x) { return fixed(x, 0); };
  F.pct = function (x, d) { return (x == null || !isFinite(x)) ? '–' : fixed(x * 100, d == null ? 1 : d) + '%'; };
  F.spct = function (x, d) { return (x == null || !isFinite(x)) ? '–' : (x > 0 ? '+' : '') + fixed(x * 100, d == null ? 1 : d) + '%'; };
  F.pp = function (x, d) { return (x == null || !isFinite(x)) ? '–' : (x > 0 ? '+' : '') + fixed(x * 100, d == null ? 1 : d) + ' pp'; };
  F.bps = function (x) { return (x == null || !isFinite(x)) ? '–' : fixed(x * 1e4, 0) + ' bps'; };
  F.mult = function (x, d) { return (x == null || !isFinite(x)) ? '–' : fixed(x, d == null ? 2 : d) + 'x'; };
  F.money = function (x, d, unit) {
    if (x == null || !isFinite(x)) return '–';
    var dd = d == null ? 1 : d, s = x < 0 && Math.abs(x) >= 0.5 * Math.pow(10, -dd) ? '-' : '';
    return s + '$' + fixed(Math.abs(x), dd) + (unit == null ? 'm' : unit);
  };
  F.date = function (d) { return d instanceof Date ? d.toISOString().slice(0, 10) : String(d); };

  /* ---------- tabs ---------- */
  UI.tabs = function (root, onChange) {
    root = resolve(root);
    var btns = UI.$$('.tabs > button', root);
    function show(id, focus) {
      btns.forEach(function (b) {
        var on = b.getAttribute('data-tab') === id;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        var p = document.getElementById(b.getAttribute('data-tab'));
        if (p) p.hidden = !on;
        if (on && focus) b.focus();
      });
      if (onChange) onChange(id);
    }
    var tablist = UI.$('.tabs', root);
    tablist.setAttribute('role', 'tablist');
    btns.forEach(function (b, i) {
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', b.getAttribute('data-tab'));
      var p = document.getElementById(b.getAttribute('data-tab'));
      if (p) { p.setAttribute('role', 'tabpanel'); p.classList.add('tab-panel'); }
      b.addEventListener('click', function () { show(b.getAttribute('data-tab')); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var j = (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length;
        show(btns[j].getAttribute('data-tab'), true);
      });
    });
    var first = btns.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || btns[0];
    show(first.getAttribute('data-tab'));
    return { show: show };
  };

  /* ---------- range controls with live output ---------- */
  UI.bindRange = function (input, fmt, onInput) {
    input = resolve(input);
    var out = input.parentElement.querySelector('output') || (input.id && document.querySelector('output[for="' + input.id + '"]'));
    function upd() { if (out) out.textContent = fmt ? fmt(+input.value) : input.value; }
    input.addEventListener('input', function () { upd(); if (onInput) onInput(+input.value); });
    upd();
    return input;
  };
  UI.debounce = function (fn, ms) {
    var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 120); };
  };

  /* ---------- charts (SVG, colors from CSS variables) ---------- */
  function niceStep(span, n) {
    var raw = span / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function ticks(lo, hi, n) {
    if (!(hi > lo)) { hi = lo + 1; }
    var st = niceStep(hi - lo, n || 5), a = Math.floor(lo / st) * st, out = [];
    for (var v = a; v <= hi + st * 1e-9; v += st) out.push(+v.toFixed(12));
    if (out[0] > lo) out.unshift(out[0] - st);
    return out;
  }
  function col(c, i) { return 'var(--' + (c || ('s' + ((i % 6) + 1))) + ')'; }
  UI.chart = {};

  /* line / area / band chart
     opts: { xs:[], series:[{name, ys:[], color:'s1', dash, width, area}], bands:[{name, lo:[], hi:[], color}],
             xFmt, yFmt, height, yMin, yMax, hlines:[{y, label}], vlines:[{x, label}], legend } */
  UI.chart.line = function (el, o) {
    el = resolve(el);
    var W = o.width || 760, H = o.height || 280, m = { l: 56, r: 16, t: 14, b: 30 };
    var xs = o.xs, n = xs.length, all = [];
    (o.series || []).forEach(function (s) { s.ys.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); });
    (o.bands || []).forEach(function (b) { b.lo.concat(b.hi).forEach(function (v) { if (isFinite(v)) all.push(v); }); });
    (o.hlines || []).forEach(function (h) { all.push(h.y); });
    var lo = o.yMin != null ? o.yMin : Math.min.apply(null, all), hi = o.yMax != null ? o.yMax : Math.max.apply(null, all);
    if (o.zero !== false && o.yMin == null && lo > 0 && lo < hi * 0.35) lo = 0;
    var yt = ticks(lo, hi, 5); lo = yt[0]; hi = yt[yt.length - 1];
    var x0 = xs[0], x1 = xs[n - 1];
    var X = function (x) { return m.l + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (W - m.l - m.r); };
    var Y = function (y) { return m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b); };
    var yf = o.yFmt || function (v) { return F.num(v, 0); }, xf = o.xFmt || String;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.label || 'Chart') + '">';
    s += '<g class="grid">' + yt.map(function (v) { return '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; }).join('') + '</g>';
    s += '<g>' + yt.map(function (v) { return '<text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + UI.esc(yf(v)) + '</text>'; }).join('') + '</g>';
    var every = Math.max(1, Math.ceil(n / (o.xTicks || 8)));
    s += '<g>' + xs.map(function (x, i) { return (i % every && i !== n - 1) ? '' : '<text x="' + X(x) + '" y="' + (H - 8) + '" text-anchor="middle">' + UI.esc(xf(x)) + '</text>'; }).join('') + '</g>';
    if (lo < 0 && hi > 0) s += '<line class="zero" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
    (o.bands || []).forEach(function (b, i) {
      var p = xs.map(function (x, k) { return X(x) + ',' + Y(b.hi[k]); }).concat(xs.slice().reverse().map(function (x, k) { return X(x) + ',' + Y(b.lo[n - 1 - k]); }));
      s += '<polygon points="' + p.join(' ') + '" style="fill:' + col(b.color, i) + ';opacity:' + (b.opacity || 0.16) + '"/>';
    });
    (o.series || []).forEach(function (sr, i) {
      var pts = [];
      sr.ys.forEach(function (v, k) { if (v != null && isFinite(v)) pts.push(X(xs[k]).toFixed(1) + ',' + Y(v).toFixed(1)); });
      if (sr.area) s += '<polygon points="' + X(xs[0]) + ',' + Y(Math.max(lo, 0)) + ' ' + pts.join(' ') + ' ' + X(xs[n - 1]) + ',' + Y(Math.max(lo, 0)) + '" style="fill:' + col(sr.color, i) + ';opacity:.14"/>';
      s += '<polyline points="' + pts.join(' ') + '" style="fill:none;stroke:' + col(sr.color, i) + ';stroke-width:' + (sr.width || 2) + (sr.dash ? ';stroke-dasharray:' + sr.dash : '') + '"/>';
      if (sr.dots) sr.ys.forEach(function (v, k) { if (isFinite(v)) s += '<circle cx="' + X(xs[k]) + '" cy="' + Y(v) + '" r="3" style="fill:' + col(sr.color, i) + '"/>'; });
    });
    (o.hlines || []).forEach(function (h) {
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(h.y) + '" y2="' + Y(h.y) + '" style="stroke:var(--' + (h.color || 'negative') + ');stroke-dasharray:5 4"/>';
      if (h.label) s += '<text x="' + (W - m.r - 4) + '" y="' + (Y(h.y) - 5) + '" text-anchor="end" style="fill:var(--' + (h.color || 'negative') + ')">' + UI.esc(h.label) + '</text>';
    });
    (o.vlines || []).forEach(function (v) {
      s += '<line x1="' + X(v.x) + '" x2="' + X(v.x) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" style="stroke:var(--muted);stroke-dasharray:3 3"/>';
      if (v.label) s += '<text x="' + (X(v.x) + 4) + '" y="' + (m.t + 10) + '">' + UI.esc(v.label) + '</text>';
    });
    s += '<line class="cursor" x1="0" x2="0" y1="' + m.t + '" y2="' + (H - m.b) + '" style="stroke:var(--border-strong);display:none"/>';
    s += '<rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + (W - m.l - m.r) + '" height="' + (H - m.t - m.b) + '" style="fill:transparent"/></svg>';
    el.classList.add('chart');
    el.innerHTML = s + legend(o) + '<div class="chart-tip"></div>';
    var svg = el.querySelector('svg'), tip = el.querySelector('.chart-tip'), cur = svg.querySelector('.cursor');
    svg.querySelector('.hit').addEventListener('mousemove', function (e) {
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, k = 0, best = 1e9;
      xs.forEach(function (x, i) { var d = Math.abs(X(x) - px); if (d < best) { best = d; k = i; } });
      cur.setAttribute('x1', X(xs[k])); cur.setAttribute('x2', X(xs[k])); cur.style.display = '';
      var rows = (o.series || []).map(function (sr, i) { return '<div class="row"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;background:' + col(sr.color, i) + '"></i>' + UI.esc(sr.name) + '</span><b>' + UI.esc((o.tipFmt || yf)(sr.ys[k])) + '</b></div>'; });
      (o.bands || []).forEach(function (b) { if (b.name) rows.push('<div class="row"><span>' + UI.esc(b.name) + '</span><b>' + UI.esc((o.tipFmt || yf)(b.lo[k])) + ' to ' + UI.esc((o.tipFmt || yf)(b.hi[k])) + '</b></div>'); });
      tip.innerHTML = '<b>' + UI.esc(xf(xs[k])) + '</b>' + rows.join('');
      tip.style.display = 'block';
      var left = (X(xs[k]) / W) * r.width + 12;
      if (left > r.width - 190) left -= 210;
      tip.style.left = left + 'px'; tip.style.top = '8px';
    });
    svg.querySelector('.hit').addEventListener('mouseleave', function () { tip.style.display = 'none'; cur.style.display = 'none'; });
  };

  function legend(o) {
    if (o.legend === false) return '';
    var items = (o.series || []).map(function (s, i) { return { n: s.name, c: col(s.color, i), dash: s.dash }; })
      .concat((o.bands || []).filter(function (b) { return b.name; }).map(function (b, i) { return { n: b.name, c: col(b.color, i), band: 1 }; }));
    if (items.length < 2 && !o.forceLegend) return '';
    return '<div class="chart-legend">' + items.map(function (it) {
      return '<span><i style="background:' + it.c + (it.band ? ';height:8px;opacity:.35' : '') + '"></i>' + UI.esc(it.n) + '</span>';
    }).join('') + '</div>';
  }

  /* bar chart. opts: { categories:[], series:[{name, values:[], color}], stacked, horizontal, yFmt, height, signColors } */
  UI.chart.bar = function (el, o) {
    el = resolve(el);
    var cats = o.categories, ser = o.series, nC = cats.length, nS = ser.length;
    var horiz = !!o.horizontal;
    var W = o.width || 760, H = o.height || (horiz ? Math.max(160, 26 * nC + 50) : 280);
    var m = horiz ? { l: o.labelWidth || 150, r: o.values ? 56 : 24, t: 10, b: 28 } : { l: 56, r: 12, t: o.values ? 28 : 14, b: 42 };
    var vals = [];
    if (o.stacked) {
      cats.forEach(function (c, k) {
        var p = 0, q = 0; ser.forEach(function (s) { var v = s.values[k] || 0; if (v >= 0) p += v; else q += v; });
        vals.push(p, q);
      });
    } else ser.forEach(function (s) { s.values.forEach(function (v) { vals.push(v); }); });
    vals.push(0);
    var lo = o.min != null ? o.min : Math.min.apply(null, vals), hi = o.max != null ? o.max : Math.max.apply(null, vals);
    var vt = ticks(lo, hi, 5); lo = vt[0]; hi = vt[vt.length - 1];
    var yf = o.yFmt || function (v) { return F.num(v, 0); };
    var plotLen = horiz ? (W - m.l - m.r) : (H - m.t - m.b), bandLen = horiz ? (H - m.t - m.b) : (W - m.l - m.r);
    var V = function (v) { return (v - lo) / (hi - lo) * plotLen; };
    var bw = bandLen / nC, inner = o.stacked ? bw * 0.62 : bw * 0.74 / nS;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.label || 'Bar chart') + '"><g class="grid">';
    vt.forEach(function (v) {
      s += horiz ? '<line x1="' + (m.l + V(v)) + '" x2="' + (m.l + V(v)) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/>'
        : '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b - V(v)) + '" y2="' + (H - m.b - V(v)) + '"/>';
    });
    s += '</g><g>';
    vt.forEach(function (v) {
      s += horiz ? '<text x="' + (m.l + V(v)) + '" y="' + (H - 8) + '" text-anchor="middle">' + UI.esc(yf(v)) + '</text>'
        : '<text x="' + (m.l - 8) + '" y="' + (H - m.b - V(v) + 4) + '" text-anchor="end">' + UI.esc(yf(v)) + '</text>';
    });
    s += '</g>';
    var z = V(0);
    cats.forEach(function (c, k) {
      var base = (horiz ? m.t : m.l) + bw * k, pos = 0, neg = 0;
      ser.forEach(function (sr, i) {
        var v = sr.values[k]; if (v == null || !isFinite(v)) return;
        var a, b, off;
        if (o.stacked) { if (v >= 0) { a = pos; pos += v; b = pos; } else { a = neg; neg += v; b = neg; } off = base + (bw - inner) / 2; }
        else { a = 0; b = v; off = base + bw * 0.13 + inner * i; }
        var p1 = V(Math.min(a, b)), p2 = V(Math.max(a, b));
        var color = o.signColors ? (v >= 0 ? 'var(--positive)' : 'var(--negative)') : (sr.colors ? col(sr.colors[k]) : col(sr.color, i));
        var title = '<title>' + UI.esc(c + (nS > 1 ? ', ' + sr.name : '') + ': ' + yf(v)) + '</title>';
        s += horiz ? '<rect x="' + (m.l + p1) + '" y="' + off + '" width="' + Math.max(1, p2 - p1) + '" height="' + inner + '" rx="2" style="fill:' + color + '">' + title + '</rect>'
          : '<rect x="' + off + '" y="' + (H - m.b - p2) + '" width="' + inner + '" height="' + Math.max(1, p2 - p1) + '" rx="2" style="fill:' + color + '">' + title + '</rect>';
        if (o.values && !o.stacked) {
          s += horiz ? '<text x="' + (m.l + (v >= 0 ? p2 + 4 : p1 - 4)) + '" y="' + (off + inner / 2 + 4) + '" text-anchor="' + (v >= 0 ? 'start' : 'end') + '" style="fill:var(--text)">' + UI.esc(yf(v)) + '</text>'
            : '<text x="' + (off + inner / 2) + '" y="' + (H - m.b - p2 - 4) + '" text-anchor="middle" style="fill:var(--text)">' + UI.esc(yf(v)) + '</text>';
        }
      });
      s += horiz ? '<text x="' + (m.l - 8) + '" y="' + (base + bw / 2 + 4) + '" text-anchor="end" style="fill:var(--text)">' + UI.esc(c) + '</text>'
        : '<text x="' + (base + bw / 2) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + UI.esc(c) + '</text>';
    });
    s += horiz ? '<line x1="' + (m.l + z) + '" x2="' + (m.l + z) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" style="stroke:var(--muted)"/>'
      : '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b - z) + '" y2="' + (H - m.b - z) + '" style="stroke:var(--muted)"/>';
    s += '</svg>';
    el.classList.add('chart');
    el.innerHTML = s + legend(o);
  };

  /* waterfall: steps [{label, value}] with a total bar at the end */
  UI.chart.waterfall = function (el, o) {
    el = resolve(el);
    var steps = o.steps, W = o.width || 760, H = o.height || 280, m = { l: 56, r: 12, t: 30, b: 46 };
    var run = o.start || 0, pts = [run];
    steps.forEach(function (s) { run += s.value; pts.push(run); });
    var lo = Math.min.apply(null, pts.concat([0])), hi = Math.max.apply(null, pts);
    var vt = ticks(lo, hi, 5); lo = vt[0]; hi = vt[vt.length - 1];
    var yf = o.yFmt || function (v) { return F.num(v, 1); };
    var Y = function (v) { return m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b); };
    var n = steps.length + (o.total ? 1 : 0) + (o.start ? 1 : 0), bw = (W - m.l - m.r) / n;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.label || 'Waterfall') + '"><g class="grid">';
    vt.forEach(function (v) { s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; });
    s += '</g>';
    vt.forEach(function (v) { s += '<text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + UI.esc(yf(v)) + '</text>'; });
    var k = 0, acc = o.start || 0;
    function bar(label, a, b, color, val) {
      var x = m.l + bw * k + bw * 0.15, w = bw * 0.7;
      s += '<rect x="' + x + '" y="' + Y(Math.max(a, b)) + '" width="' + w + '" height="' + Math.max(1, Math.abs(Y(a) - Y(b))) + '" rx="2" style="fill:' + color + '"><title>' + UI.esc(label + ': ' + yf(val)) + '</title></rect>';
      s += '<text x="' + (x + w / 2) + '" y="' + (Y(Math.max(a, b)) - 4) + '" text-anchor="middle" style="fill:var(--text)">' + UI.esc(yf(val)) + '</text>';
      s += '<text x="' + (x + w / 2) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + UI.esc(label) + '</text>';
      k++;
    }
    if (o.start) bar(o.startLabel || 'Start', 0, acc, 'var(--s4)', acc);
    steps.forEach(function (st) { bar(st.label, acc, acc + st.value, st.value >= 0 ? 'var(--s1)' : 'var(--negative)', st.value); acc += st.value; });
    if (o.total) bar(o.totalLabel || 'Total', 0, acc, 'var(--s2)', acc);
    s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" style="stroke:var(--muted)"/></svg>';
    el.classList.add('chart');
    el.innerHTML = s;
  };

  /* scatter: points [{x, y, label, color, r}] */
  UI.chart.scatter = function (el, o) {
    el = resolve(el);
    var P = o.points, W = o.width || 760, H = o.height || 300, m = { l: 56, r: 16, t: 14, b: 36 };
    var xsv = P.map(function (p) { return p.x; }), ysv = P.map(function (p) { return p.y; });
    var xt = ticks(o.xMin != null ? o.xMin : Math.min.apply(null, xsv), o.xMax != null ? o.xMax : Math.max.apply(null, xsv), 6);
    var yt = ticks(o.yMin != null ? o.yMin : Math.min.apply(null, ysv), o.yMax != null ? o.yMax : Math.max.apply(null, ysv), 5);
    var X = function (v) { return m.l + (v - xt[0]) / (xt[xt.length - 1] - xt[0]) * (W - m.l - m.r); };
    var Y = function (v) { return m.t + (1 - (v - yt[0]) / (yt[yt.length - 1] - yt[0])) * (H - m.t - m.b); };
    var xf = o.xFmt || function (v) { return F.num(v, 1); }, yf = o.yFmt || function (v) { return F.num(v, 1); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.label || 'Scatter') + '"><g class="grid">';
    yt.forEach(function (v) { s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; });
    s += '</g>';
    yt.forEach(function (v) { s += '<text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + UI.esc(yf(v)) + '</text>'; });
    xt.forEach(function (v) { s += '<text x="' + X(v) + '" y="' + (H - 16) + '" text-anchor="middle">' + UI.esc(xf(v)) + '</text>'; });
    if (o.xLabel) s += '<text x="' + ((W + m.l) / 2) + '" y="' + (H - 1) + '" text-anchor="middle">' + UI.esc(o.xLabel) + '</text>';
    if (o.line) s += '<polyline points="' + o.line.map(function (p) { return X(p.x) + ',' + Y(p.y); }).join(' ') + '" style="fill:none;stroke:var(--s2);stroke-width:2"/>';
    P.forEach(function (p, i) {
      s += '<circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="' + (p.r || 5) + '" style="fill:' + col(p.color || 's1') + ';opacity:.9"><title>' + UI.esc((p.label ? p.label + ': ' : '') + xf(p.x) + ', ' + yf(p.y)) + '</title></circle>';
      if (p.label && o.labels) s += '<text x="' + (X(p.x) + 7) + '" y="' + (Y(p.y) + 4) + '" style="fill:var(--text)">' + UI.esc(p.label) + '</text>';
    });
    s += '</svg>';
    el.classList.add('chart');
    el.innerHTML = s;
  };

  /* heatmap: rows x cols matrix */
  UI.chart.heat = function (el, o) {
    el = resolve(el);
    var R = o.rows, C = o.cols, M = o.matrix, cw = o.cell || 56, lw = o.labelWidth || 120, top = 26;
    var W = lw + cw * C.length + 6, H = top + 30 * R.length + 6;
    var lo = o.min != null ? o.min : -1, hi = o.max != null ? o.max : 1;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.esc(o.label || 'Heatmap') + '">';
    C.forEach(function (c, j) { s += '<text x="' + (lw + cw * j + cw / 2) + '" y="16" text-anchor="middle">' + UI.esc(c) + '</text>'; });
    R.forEach(function (r, i) {
      s += '<text x="' + (lw - 8) + '" y="' + (top + 30 * i + 19) + '" text-anchor="end" style="fill:var(--text)">' + UI.esc(r) + '</text>';
      C.forEach(function (c, j) {
        var v = M[i][j], t = Math.max(-1, Math.min(1, (2 * (v - lo) / (hi - lo)) - 1));
        var fill = t >= 0 ? 'var(--s1)' : 'var(--s2)';
        s += '<rect x="' + (lw + cw * j + 1) + '" y="' + (top + 30 * i + 1) + '" width="' + (cw - 2) + '" height="28" rx="3" style="fill:' + fill + ';opacity:' + (0.12 + 0.75 * Math.abs(t)).toFixed(2) + '"><title>' + UI.esc(r + ' / ' + c + ': ' + (o.fmt || F.num)(v, 2)) + '</title></rect>';
        s += '<text x="' + (lw + cw * j + cw / 2) + '" y="' + (top + 30 * i + 19) + '" text-anchor="middle" style="fill:var(--text)">' + UI.esc((o.fmt || function (x) { return F.num(x, 2); })(v)) + '</text>';
      });
    });
    el.classList.add('chart');
    el.innerHTML = s + '</svg>';
  };

  /* ---------- Explain this number ---------- */
  var openPop = null;
  function closePop() { if (openPop) { openPop.remove(); openPop = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
  document.addEventListener('click', function (e) { if (openPop && !openPop.contains(e.target) && !e.target.classList.contains('explain-btn')) closePop(); });
  /* spec: { title, formula, inputs:[{name, value, src:'assumption'|'computed'|'document', note, cite:{doc,page,line}}], result } */
  UI.explain = function (btn, specFn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var was = openPop && openPop._btn === btn;
      closePop();
      if (was) return;
      var sp = typeof specFn === 'function' ? specFn() : specFn;
      var srcName = { assumption: 'Assumption', computed: 'Computed', document: 'Document' };
      var rows = (sp.inputs || []).map(function (r) {
        var src = r.src || 'computed';
        var cite = r.cite ? ' ' + UI.citeHTML(r.cite) : '';
        return '<tr><td>' + UI.esc(r.name) + '<div class="src src-' + (src === 'assumption' ? 'assume' : src === 'document' ? 'doc' : 'calc') + '">' + (srcName[src] || src) + (r.note ? ': ' + UI.esc(r.note) : '') + cite + '</div></td><td class="v">' + UI.esc(r.value) + '</td></tr>';
      }).join('');
      var pop = UI.el('div', { class: 'explain-pop', role: 'dialog', 'aria-label': 'How this number is computed' });
      pop.innerHTML = '<button class="explain-btn close" aria-label="Close">Close</button><h4>' + UI.esc(sp.title) + '</h4>' +
        (sp.formula ? '<div class="formula">' + UI.esc(sp.formula) + '</div>' : '') +
        (rows ? '<table>' + rows + (sp.result != null ? '<tr><td><b>Result</b></td><td class="v"><b>' + UI.esc(sp.result) + '</b></td></tr>' : '') + '</table>' : '') +
        (sp.note ? '<p class="src" style="margin-top:8px">' + UI.esc(sp.note) + '</p>' : '');
      document.body.appendChild(pop);
      pop._btn = btn;
      var r = btn.getBoundingClientRect(), pw = pop.offsetWidth;
      var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pw - 16);
      pop.style.left = Math.max(window.scrollX + 16, left) + 'px';
      pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
      pop.querySelector('.close').addEventListener('click', closePop);
      openPop = pop;
    });
    return btn;
  };
  UI.explainBtn = function (specFn, label) {
    return UI.explain(UI.el('button', { class: 'explain-btn', type: 'button', text: label || 'Explain', 'aria-label': 'Explain this number' }), specFn);
  };

  /* ---------- KPI tiles ---------- */
  /* items: [{id, label, value, sub, tone:'good'|'bad', explain: fn}] */
  UI.kpis = function (el, items) {
    el = resolve(el);
    el.classList.add('kpis');
    el.innerHTML = '';
    items.forEach(function (it) {
      var lab = UI.el('div', { class: 'k-label' }, UI.el('span', { text: it.label }));
      if (it.explain) lab.appendChild(UI.explainBtn(it.explain));
      var t = UI.el('div', { class: 'kpi' + (it.tone ? ' ' + it.tone : ''), id: it.id ? 'kpi-' + it.id : null },
        lab, UI.el('div', { class: 'k-val', text: it.value }), it.sub ? UI.el('div', { class: 'k-sub', text: it.sub }) : null);
      el.appendChild(t);
    });
  };

  /* ---------- tables, registered for CSV export ---------- */
  UI.tables = {};
  /* o: { id, name, columns:[{key, label, num, fmt, cls(row)}], rows:[], foot:{}, footExplain:{key: fn}, rowAttr } */
  UI.table = function (el, o) {
    el = resolve(el);
    UI.tables[o.id] = o;
    var h = '<div class="table-wrap"><table class="data" id="tbl-' + o.id + '"><thead><tr>' +
      o.columns.map(function (c) { return '<th' + (c.num ? ' class="n"' : '') + ' scope="col">' + UI.esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>';
    o.rows.forEach(function (r) {
      h += '<tr>' + o.columns.map(function (c) {
        var v = r[c.key], txt = c.fmt ? c.fmt(v, r) : (v == null ? '' : v);
        var cls = [c.num ? 'n' : '', c.cls ? c.cls(v, r) : ''].join(' ').trim();
        return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + (c.html ? txt : UI.esc(txt)) + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody>';
    if (o.foot) {
      h += '<tfoot><tr>' + o.columns.map(function (c) {
        var v = o.foot[c.key]; var txt = v == null ? '' : (c.fmt && typeof v === 'number' ? c.fmt(v, o.foot) : v);
        return '<td' + (c.num ? ' class="n"' : '') + ' data-k="' + c.key + '">' + UI.esc(txt) + '</td>';
      }).join('') + '</tr></tfoot>';
    }
    el.innerHTML = h + '</table></div>';
    if (o.foot && o.footExplain) {
      Object.keys(o.footExplain).forEach(function (k) {
        var td = el.querySelector('tfoot td[data-k="' + k + '"]');
        if (td) { td.appendChild(document.createTextNode(' ')); td.appendChild(UI.explainBtn(o.footExplain[k])); }
      });
    }
  };

  /* ---------- CSV ---------- */
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  UI.toCSV = function (columns, rows) {
    return [columns.map(function (c) { return csvCell(c.label); }).join(',')].concat(rows.map(function (r) {
      return columns.map(function (c) { var v = r[c.key]; return csvCell(typeof v === 'number' ? +v.toPrecision(12) : v); }).join(',');
    })).join('\n');
  };
  UI.parseCSV = function (text) {
    var rows = [], row = [], cell = '', q = false, i = 0, c;
    text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.length > 1 || (r[0] || '').trim() !== ''; });
    rows = rows.filter(function (r) { return (r[0] || '').charAt(0) !== '#'; });
    if (!rows.length) return { header: [], rows: [] };
    var header = rows[0].map(function (h) { return h.trim(); });
    return {
      header: header,
      rows: rows.slice(1).map(function (r) { var o = {}; header.forEach(function (h, k) { o[h] = (r[k] || '').trim(); }); return o; })
    };
  };
  UI.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    var a = UI.el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- export menu (7.7) ---------- */
  /* o: { demo, slug, source: fn -> string, tables: fn -> [ids] (default all), audit: fn -> object, report: label } */
  UI.exportMenu = function (el, o) {
    el = resolve(el);
    el.classList.add('export');
    var btn = UI.el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', text: 'Export' });
    var menu = UI.el('div', { class: 'export-menu', role: 'menu' });
    el.innerHTML = ''; el.appendChild(btn); el.appendChild(menu);
    function header(kind) {
      return ['# ' + o.demo + ' (' + kind + ')', '# Data: ' + o.source(), '# Generated: ' + new Date().toISOString(), '# Not investment advice. Fictional entities.'];
    }
    function build() {
      var ids = o.tables ? o.tables() : Object.keys(UI.tables);
      var h = '<div class="grp">Tables (CSV)</div>';
      ids.forEach(function (id) { if (UI.tables[id]) h += '<button role="menuitem" data-csv="' + id + '">' + UI.esc(UI.tables[id].name || id) + '</button>'; });
      h += '<button role="menuitem" data-csv="*">All tables in one file</button><div class="grp">Audit</div><button role="menuitem" data-json="1">Audit log (JSON)</button>' +
        '<div class="grp">Report</div><button role="menuitem" data-print="1">' + UI.esc(o.report || 'One-page report (PDF)') + '</button>';
      menu.innerHTML = h;
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); build(); var open = el.classList.toggle('open'); btn.setAttribute('aria-expanded', open); });
    document.addEventListener('click', function (e) { if (!el.contains(e.target)) { el.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      el.classList.remove('open');
      if (b.dataset.csv) {
        var ids = b.dataset.csv === '*' ? (o.tables ? o.tables() : Object.keys(UI.tables)) : [b.dataset.csv];
        var body = ids.filter(function (id) { return UI.tables[id]; }).map(function (id) {
          var t = UI.tables[id], rows = t.rows.slice(); if (t.foot) rows.push(t.foot);
          return (ids.length > 1 ? '# Table: ' + (t.name || id) + '\n' : '') + UI.toCSV(t.columns, rows);
        }).join('\n\n');
        UI.download(o.slug + '-' + (b.dataset.csv === '*' ? 'tables' : b.dataset.csv) + '.csv', header('CSV').join('\n') + '\n' + body);
      } else if (b.dataset.json) {
        var payload = { demo: o.demo, data: o.source(), generated: new Date().toISOString(), note: 'Simulation of the pipeline over synthetic documents. Not investment advice.', audit: o.audit ? o.audit() : [] };
        UI.download(o.slug + '-audit-log.json', JSON.stringify(payload, null, 2), 'application/json');
      } else if (b.dataset.print) {
        if (o.beforePrint) o.beforePrint();
        window.print();
      }
    });
  };

  /* ---------- tamper-evident audit log ---------- */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  UI.fnv = fnv;
  UI.Audit = function (el) {
    this.el = resolve(el); this.entries = []; this.head = '00000000';
  };
  UI.Audit.prototype.push = function (actor, action, detail) {
    var e = { seq: this.entries.length + 1, actor: actor, action: action, detail: detail || '', prev: this.head };
    e.hash = fnv(e.prev + '|' + e.seq + '|' + e.actor + '|' + e.action + '|' + JSON.stringify(e.detail));
    this.head = e.hash; this.entries.push(e); this.render();
    return e;
  };
  UI.Audit.prototype.verify = function () {
    var prev = '00000000';
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      var h = fnv(prev + '|' + e.seq + '|' + e.actor + '|' + e.action + '|' + JSON.stringify(e.detail));
      if (e.prev !== prev || e.hash !== h) return i;
      prev = e.hash;
    }
    return -1;
  };
  UI.Audit.prototype.clear = function () { this.entries = []; this.head = '00000000'; this.render(); };
  UI.Audit.prototype.toJSON = function () { return { head: this.head, intact: this.verify() === -1, entries: this.entries }; };
  UI.Audit.prototype.render = function () {
    if (!this.el) return;
    var bad = this.verify();
    this.el.innerHTML = '<div class="agent-log" aria-live="polite">' + (this.entries.length ? this.entries.map(function (e, i) {
      return '<div class="le"><span class="t">#' + e.seq + '</span><span class="a">' + UI.esc(e.actor) + '</span><span class="st ' + (bad !== -1 && i >= bad ? 'blocked' : 'ok') + '">' + e.hash + '</span><span class="msg">' + UI.esc(e.action + (e.detail ? ': ' + (typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)) : '')) + '</span></div>';
    }).join('') : '<div class="le"><span class="t">-</span><span class="msg" style="grid-column:2/-1">No entries yet.</span></div>') + '</div>' +
      '<p class="eval-note">' + (bad === -1 ? 'Chain intact: each entry hashes the one before it (FNV-1a), so editing any past entry breaks every later hash.' : 'Chain broken at entry #' + (bad + 1) + '.') + '</p>';
  };

  /* ---------- agent log ---------- */
  UI.AgentLog = function (el, opts) {
    this.el = resolve(el); this.entries = []; this.clock = (opts && opts.start) || Date.UTC(2026, 0, 15, 9, 0, 0);
    this.el.classList.add('agent-log'); this.el.setAttribute('aria-live', 'polite');
  };
  UI.AgentLog.prototype.add = function (agent, status, msg, details, ms) {
    this.clock += ms || 380;
    var e = { t: new Date(this.clock).toISOString().slice(11, 19), agent: agent, status: status, msg: msg, details: details || null };
    this.entries.push(e);
    var label = { ok: 'ok', blocked: 'blocked', approval: 'needs approval', info: 'info' }[status] || status;
    var row = UI.el('div', { class: 'le' }, UI.el('span', { class: 't', text: e.t }), UI.el('span', { class: 'a', text: agent, title: agent }), UI.el('span', { class: 'st ' + status, text: label }));
    if (details) {
      var d = UI.el('details', null, UI.el('summary', { text: msg }), UI.el('pre', { text: typeof details === 'string' ? details : JSON.stringify(details, null, 2) }));
      row.appendChild(d);
    } else row.appendChild(UI.el('span', { class: 'msg', text: msg }));
    this.el.appendChild(row);
    this.el.scrollTop = this.el.scrollHeight;
    return e;
  };
  UI.AgentLog.prototype.clear = function () { this.entries = []; this.el.innerHTML = ''; };

  /* run steps one after another so the reader can follow the control flow.
     steps: [{agent, run: () => ({status, msg, details}) | [..]}] */
  UI.runSteps = function (log, steps, done, delay) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var d = reduce ? 0 : (delay == null ? 140 : delay), i = 0;
    function next() {
      if (i >= steps.length) { if (done) done(); return; }
      var st = steps[i++], out = st.run();
      (Array.isArray(out) ? out : [out]).forEach(function (r) { if (r) log.add(st.agent, r.status || 'ok', r.msg, r.details); });
      if (d) setTimeout(next, d); else next();
    }
    next();
  };

  /* ---------- document viewer and citations ---------- */
  /* docs: { id: { title, kind, pages: [[line, ...], ...] } }; cite: {doc, page, line} (1-based) */
  UI.citeHTML = function (c, label) {
    var bad = c.bad ? ' bad' : '';
    return '<button type="button" class="cite' + bad + '" data-cite="' + UI.esc(c.doc + '|' + c.page + '|' + c.line) + '">' + UI.esc(label || (c.short || c.doc) + ' p' + c.page + ' l' + c.line) + '</button>';
  };
  UI.DocViewer = function (el, docs) {
    this.el = resolve(el); this.docs = docs; this.cur = null;
    this.el.classList.add('doc-viewer');
    var ids = Object.keys(docs), self = this;
    this.el.innerHTML = '<div class="dv-head"><label class="sr-only" for="' + this.el.id + '-sel">Document</label><select class="field" id="' + this.el.id + '-sel">' +
      ids.map(function (id) { return '<option value="' + id + '">' + UI.esc(docs[id].title) + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-ghost btn-sm" data-p="-1" type="button" aria-label="Previous page">Prev</button><span class="dv-pn mono"></span><button class="btn btn-ghost btn-sm" data-p="1" type="button" aria-label="Next page">Next</button></div>' +
      '<div class="dv-page" tabindex="0"></div><div class="dv-foot">Synthetic document for a fictional entity. Click any citation to open its source line.</div>';
    this.sel = this.el.querySelector('select');
    this.sel.addEventListener('change', function () { self.open(self.sel.value, 1); });
    UI.$$('[data-p]', this.el).forEach(function (b) {
      b.addEventListener('click', function () { if (self.cur) self.open(self.cur.doc, self.cur.page + (+b.dataset.p)); });
    });
    UI.DocViewer.active = this;
    UI.DocViewer.all.push(this);
    if (ids.length) this.open(ids[0], 1);
  };
  UI.DocViewer.all = [];
  UI.DocViewer.prototype.open = function (doc, page, line) {
    var d = this.docs[doc]; if (!d) return false;
    page = Math.max(1, Math.min(d.pages.length, page || 1));
    this.cur = { doc: doc, page: page };
    this.sel.value = doc;
    this.el.querySelector('.dv-pn').textContent = 'p ' + page + '/' + d.pages.length;
    var box = this.el.querySelector('.dv-page');
    box.innerHTML = d.pages[page - 1].map(function (l, i) {
      var cls = 'dv-line' + (l.charAt(0) === '#' ? ' h' : l.charAt(0) === '|' ? ' tbl' : '') + (line === i + 1 ? ' hl' : '');
      return '<div class="' + cls + '" data-ln="' + (i + 1) + '">' + UI.esc(l.charAt(0) === '#' ? l.replace(/^#+\s*/, '') : l) + '</div>';
    }).join('');
    if (line) {
      var hl = box.querySelector('.hl');
      if (!hl) return false;
      box.scrollTop = Math.max(0, hl.offsetTop - box.clientHeight / 3);
    }
    return true;
  };
  UI.DocViewer.prototype.line = function (doc, page, line) {
    var d = this.docs[doc]; if (!d || !d.pages[page - 1]) return null;
    var l = d.pages[page - 1][line - 1]; return l == null ? null : l;
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cite]');
    if (!b || !UI.DocViewer.active) return;
    var p = b.getAttribute('data-cite').split('|'), v = UI.DocViewer.active, scope = b.closest('.dv-scope');
    if (scope) UI.DocViewer.all.forEach(function (x) { if (scope.contains(x.el)) v = x; });
    if (v.open(p[0], +p[1], +p[2])) {
      var r = v.el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) v.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });


  /* ---------- citation validator ----------
     Generalised from the alternative-data platform's validator: a citation must resolve to a
     document, page and line, the cited line must contain the value, and a drafted claim must
     carry at least one resolving citation or it is blocked. */
  UI.numbersIn = function (line) {
    var out = [], re = /(\(?)-?\$?\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\)?\s?(%|bps|x|m\b|mm\b|million|bn|billion|k\b)?/gi, m;
    while ((m = re.exec(line))) {
      var v = parseFloat((m[2] + (m[3] || '')).replace(/,/g, ''));
      if (m[1] === '(' && /\)/.test(m[0])) v = -v;
      if (/^-/.test(m[0].replace('(', '').trim())) v = -Math.abs(v);
      out.push({ v: v, unit: (m[4] || '').toLowerCase() });
    }
    return out;
  };
  /* does the cited line contain value? unit: 'pct' (0.0175 matches 1.75%), 'money' (in millions:
     1.25 matches $1,250,000 or 1.25m), 'num', 'mult', 'bps', 'text' */
  UI.lineHas = function (line, value, unit, tol) {
    if (line == null) return false;
    if (unit === 'text') return String(line).toLowerCase().indexOf(String(value).toLowerCase()) !== -1;
    tol = tol == null ? 0.0051 : tol;
    var nums = UI.numbersIn(line);
    return nums.some(function (n) {
      var c = [n.v];
      if (unit === 'pct') c = n.unit === 'bps' ? [n.v / 1e4] : [n.v / 100];
      else if (unit === 'bps') c = n.unit === '%' ? [n.v * 100] : [n.v];
      else if (unit === 'money') c = (n.unit === 'm' || n.unit === 'mm' || n.unit === 'million') ? [n.v] : (n.unit === 'bn' || n.unit === 'billion') ? [n.v * 1000] : n.unit === 'k' ? [n.v / 1000] : [n.v / 1e6, n.v / 1e3, n.v];
      if (unit === 'money') return c.some(function (x) { return Math.abs(Math.abs(x) - Math.abs(value)) <= 1e-6 + 1e-4 * Math.abs(value); });
      return c.some(function (x) { return Math.abs(x - value) <= tol * Math.max(1, Math.abs(value)) * (unit === 'pct' ? 0.01 : 1); });
    });
  };
  /* field: {value, unit, cite:{doc,page,line}} -> {ok, reason} */
  UI.validateField = function (docs, f) {
    if (!f.cite) return { ok: false, reason: 'no citation' };
    var d = docs[f.cite.doc];
    if (!d) return { ok: false, reason: 'cited document ' + f.cite.doc + ' does not exist' };
    var pg = d.pages[f.cite.page - 1];
    if (!pg) return { ok: false, reason: 'page ' + f.cite.page + ' does not exist' };
    var ln = pg[f.cite.line - 1];
    if (ln == null) return { ok: false, reason: 'line ' + f.cite.line + ' does not exist' };
    if (f.value != null && !UI.lineHas(ln, f.value, f.unit || 'num')) return { ok: false, reason: 'cited line does not contain ' + f.value };
    return { ok: true, reason: 'resolves' };
  };
  /* claims: [{id, text, cites:[{doc,page,line}]}] -> {passed:[], blocked:[{claim, reason}]} */
  UI.validateClaims = function (docs, claims) {
    var passed = [], blocked = [];
    claims.forEach(function (c) {
      if (!c.cites || !c.cites.length) { blocked.push({ claim: c, reason: 'uncited claim' }); return; }
      var bad = c.cites.map(function (ct) { return UI.validateField(docs, { cite: ct }); }).filter(function (r) { return !r.ok; });
      if (bad.length) blocked.push({ claim: c, reason: bad[0].reason }); else passed.push(c);
    });
    return { passed: passed, blocked: blocked };
  };

  /* ---------- approval cards ---------- */
  /* items: [{id, title, severity:'high'|'med'|'low', evidence (html), cites:[], state}] */
  UI.approvals = function (el, items, opts) {
    el = resolve(el); opts = opts || {};
    el.classList.add('approvals');
    function render() {
      el.innerHTML = '';
      if (!items.length) { el.innerHTML = '<p class="muted">Nothing waiting for review.</p>'; return; }
      items.forEach(function (it) {
        var st = it.state || 'pending';
        var card = UI.el('div', { class: 'approval sev-' + (it.severity || 'med') + (st !== 'pending' ? ' ' + st : '') });
        card.innerHTML = '<div class="ap-head"><span class="ap-title">' + UI.esc(it.title) + '</span><span class="ap-state">' + (st === 'pending' ? 'Needs approval' : st) + '</span></div>' +
          '<div class="ap-ev">' + (it.evidence || '') + '</div>';
        var acts = UI.el('div', { class: 'ap-acts' });
        (it.cites || []).forEach(function (c) { acts.insertAdjacentHTML('beforeend', UI.citeHTML(c)); });
        if (st === 'pending') {
          acts.appendChild(UI.el('button', { class: 'btn btn-primary btn-sm', type: 'button', text: opts.approveLabel || 'Approve', onclick: function () { decide(it, 'approved'); } }));
          acts.appendChild(UI.el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: opts.rejectLabel || 'Reject', onclick: function () { decide(it, 'rejected'); } }));
        } else {
          acts.appendChild(UI.el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Undo', onclick: function () { decide(it, 'pending'); } }));
        }
        card.appendChild(acts);
        el.appendChild(card);
      });
    }
    function decide(it, st) {
      it.state = st;
      if (opts.audit) opts.audit.push('human reviewer', st === 'pending' ? 'reopened' : st, it.id + ' ' + it.title);
      render();
      if (opts.onChange) opts.onChange(items, it);
    }
    render();
    return { render: render, items: items, decideAll: function (st) { items.forEach(function (it) { if ((it.state || 'pending') === 'pending') decide(it, st); }); } };
  };

  /* ---------- assumptions register ---------- */
  /* rows: [{id, label, value, unit, source, min, max, step, scale}] ; scale displays value*scale */
  UI.assumptions = function (el, rows, onChange) {
    el = resolve(el);
    UI.tables.assumptions = { id: 'assumptions', name: 'Assumptions register', columns: [{ key: 'label', label: 'Assumption' }, { key: 'value', label: 'Value' }, { key: 'unit', label: 'Unit' }, { key: 'source', label: 'Source' }], rows: rows };
    var h = '<div class="table-wrap assump"><table class="data"><thead><tr><th>Assumption</th><th class="n">Value</th><th>Unit</th><th>Default</th><th>Source</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var sc = r.scale || 1;
      if (r.def == null) r.def = r.value;
      h += '<tr><td>' + UI.esc(r.label) + '</td><td class="n"><input class="field" type="number" aria-label="' + UI.esc(r.label) + '" data-id="' + r.id + '" value="' + +(r.value * sc).toPrecision(6) + '"' +
        (r.min != null ? ' min="' + r.min * sc + '"' : '') + (r.max != null ? ' max="' + r.max * sc + '"' : '') + ' step="' + (r.step || 'any') + '"></td><td>' + UI.esc(r.unit || '') +
        '</td><td class="n">' + +(r.def * sc).toPrecision(6) + '</td><td class="src">' + UI.esc(r.source || '') + '</td></tr>';
    });
    el.innerHTML = h + '</tbody></table></div>';
    UI.$$('input', el).forEach(function (inp) {
      inp.addEventListener('change', function () {
        var r = rows.filter(function (x) { return x.id === inp.dataset.id; })[0], sc = r.scale || 1, v = +inp.value;
        if (!isFinite(v)) { inp.value = r.value * sc; return; }
        if (r.min != null) v = Math.max(r.min * sc, v);
        if (r.max != null) v = Math.min(r.max * sc, v);
        inp.value = v; r.value = v / sc;
        if (onChange) onChange(r.id, r.value);
      });
    });
    return { set: function (id, v) { var inp = el.querySelector('input[data-id="' + id + '"]'); var r = rows.filter(function (x) { return x.id === id; })[0]; if (inp && r) { r.value = v; inp.value = +(v * (r.scale || 1)).toPrecision(6); } } };
  };
  UI.A = function (rows) { var o = {}; rows.forEach(function (r) { o[r.id] = r.value; }); return o; };

  /* ---------- data drop zone (7.6), local only ---------- */
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function loadXLSX(cb) {
    if (global.XLSX) return cb();
    var s = UI.el('script', { src: XLSX_URL });
    s.onload = function () { cb(); }; s.onerror = function () { cb(new Error('Could not load the spreadsheet reader. Save the sheet as CSV and try again.')); };
    document.head.appendChild(s);
  }
  /* o: { title, columns:[{name, desc, required}], template, parse: (rows, header) -> {errors:[], data, summary}, onData(data, meta), onReset() } */
  UI.dropZone = function (el, o) {
    el = resolve(el);
    el.classList.add('dropzone');
    var inputId = (el.id || 'dz') + '-file';
    el.innerHTML = '<div class="dz-row"><strong>' + UI.esc(o.title || 'Use your own data') + '</strong><span class="local-banner">Your data stays in this browser tab.</span></div>' +
      '<p class="muted" style="font-size:.86rem;margin:6px 0">Drop a CSV or XLSX file here, or <label for="' + inputId + '" style="text-decoration:underline;cursor:pointer;color:var(--link)">choose a file</label>. It is parsed in JavaScript on this page; nothing is uploaded or stored.' +
      (o.template ? ' <a href="' + o.template + '" download>Download the template</a>.' : '') + '</p>' +
      '<input type="file" id="' + inputId + '" accept=".csv,.xlsx,.xls,text/csv" class="sr-only">' +
      '<div class="dz-cols">Columns: ' + o.columns.map(function (c) { return UI.esc(c.name) + (c.required === false ? ' (optional)' : '') + (c.desc ? ' = ' + UI.esc(c.desc) : ''); }).join('; ') + '</div>' +
      '<div class="dz-msg"></div><div class="dz-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm dz-reset" hidden>Back to the synthetic data</button></div>';
    var msg = el.querySelector('.dz-msg'), reset = el.querySelector('.dz-reset'), inp = el.querySelector('input[type=file]');
    function fail(errs) { msg.innerHTML = '<ul class="dz-errors">' + errs.map(function (e) { return '<li>' + UI.esc(e) + '</li>'; }).join('') + '</ul>'; }
    function handleRows(parsed, name) {
      var need = o.columns.filter(function (c) { return c.required !== false; }).map(function (c) { return c.name; });
      var miss = need.filter(function (n) { return parsed.header.indexOf(n) === -1; });
      if (miss.length) return fail(['Missing column' + (miss.length > 1 ? 's' : '') + ': ' + miss.join(', ') + '. Found: ' + (parsed.header.join(', ') || 'none') + '.']);
      if (!parsed.rows.length) return fail(['The file has a header row but no data rows.']);
      var res = o.parse(parsed.rows, parsed.header);
      if (res.errors && res.errors.length) return fail(res.errors.slice(0, 8).concat(res.errors.length > 8 ? ['…and ' + (res.errors.length - 8) + ' more.'] : []));
      msg.innerHTML = '<p class="dz-ok">Loaded ' + UI.esc(name) + ': ' + UI.esc(res.summary || (parsed.rows.length + ' rows')) + '. Every figure on the page now uses your file.</p>';
      reset.hidden = false;
      o.onData(res.data, { name: name });
    }
    function readFile(f) {
      if (!f) return;
      if (/\.xlsx?$/i.test(f.name)) {
        loadXLSX(function (err) {
          if (err) return fail([err.message]);
          var fr = new FileReader();
          fr.onload = function () {
            try {
              var wb = global.XLSX.read(new Uint8Array(fr.result), { type: 'array', cellDates: true });
              var csv = global.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { dateNF: 'yyyy-mm-dd' });
              handleRows(UI.parseCSV(csv), f.name);
            } catch (e) { fail(['Could not read the spreadsheet: ' + e.message]); }
          };
          fr.readAsArrayBuffer(f);
        });
      } else {
        var fr = new FileReader();
        fr.onload = function () { try { handleRows(UI.parseCSV(String(fr.result)), f.name); } catch (e) { fail(['Could not read the file: ' + e.message]); } };
        fr.readAsText(f);
      }
    }
    inp.addEventListener('change', function () { readFile(inp.files[0]); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { el.addEventListener(t, function (e) { e.preventDefault(); el.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { el.addEventListener(t, function (e) { e.preventDefault(); el.classList.remove('over'); }); });
    el.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });
    reset.addEventListener('click', function () { msg.innerHTML = ''; reset.hidden = true; if (o.onReset) o.onReset(); });
  };

  /* parsing helpers for dropped files */
  UI.parse = {
    num: function (s) { if (s == null) return NaN; s = String(s).replace(/[$,\s]/g, ''); if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1); if (s === '') return NaN; return +s; },
    date: function (s) {
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s).trim());
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim());
      if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
      return null;
    }
  };

  /* ---------- work counters and evaluation ---------- */
  UI.counters = function (el, c) {
    el = resolve(el);
    el.classList.add('counters');
    var items = [['docs', 'Documents read'], ['fields', 'Fields extracted'], ['checks', 'Checks run'], ['flags', 'Breaks or flags raised'], ['review', 'Sent for human review']];
    el.innerHTML = items.map(function (it) { return '<div><div class="c-n">' + F.int(c[it[0]] || 0) + '</div><div class="c-l">' + it[1] + '</div></div>'; }).join('');
  };
  /* compare extracted values against hand-labelled truth.
     extracted / truth: { key: {value, cite?} } ; tol relative */
  UI.evaluate = function (extracted, truth, tol) {
    tol = tol == null ? 1e-6 : tol;
    var keys = Object.keys(truth), correct = 0, cited = 0, wrong = [];
    keys.forEach(function (k) {
      var e = extracted[k], t = truth[k].value;
      var ok = e != null && (typeof t === 'number' ? Math.abs(e.value - t) <= tol * Math.max(1, Math.abs(t)) : String(e.value).trim().toLowerCase() === String(t).trim().toLowerCase());
      if (ok) correct++; else wrong.push(k);
      if (e && e.cite) cited++;
    });
    return { n: keys.length, correct: correct, accuracy: keys.length ? correct / keys.length : 0, coverage: keys.length ? cited / keys.length : 0, wrong: wrong };
  };
  /* flags: [{id, raised:bool}] truth: {id: true|false} -> detection and false flag rate */
  UI.evalFlags = function (raisedIds, truthIds, candidates) {
    var tp = raisedIds.filter(function (id) { return truthIds.indexOf(id) !== -1; }).length;
    var fp = raisedIds.length - tp;
    var negatives = candidates - truthIds.length;
    return { detected: tp, seeded: truthIds.length, detection: truthIds.length ? tp / truthIds.length : 1, falseFlags: fp, falseFlagRate: negatives > 0 ? fp / negatives : 0, candidates: candidates };
  };

  /* ---------- model tests badge ---------- */
  UI.testsBadge = function (el, filter) {
    el = resolve(el);
    var a = UI.el('a', { class: 'tests-badge', href: '/tests.html' }, UI.el('span', { class: 'dot' }), UI.el('span', { text: 'Model tests: running' }));
    el.parentNode.replaceChild(a, el);
    function run() {
      try {
        var r = global.PMTests.run(filter);
        a.classList.add(r.failed ? 'fail' : 'pass');
        a.lastChild.textContent = 'Model tests: ' + r.passed + ' of ' + r.total + ' passed';
      } catch (e) { a.classList.add('fail'); a.lastChild.textContent = 'Model tests: could not run'; }
    }
    if (global.PMTests) run();
    else {
      var pending = UI.testsBadge.queue = UI.testsBadge.queue || [];
      pending.push(run);
      if (pending.length === 1) {
        var s = UI.el('script', { src: '/assets/js/pm-tests.js' });
        s.onload = function () { pending.forEach(function (f) { f(); }); };
        s.onerror = function () { a.lastChild.textContent = 'Model tests: unavailable'; };
        document.body.appendChild(s);
      }
    }
  };

  /* ---------- seed control ---------- */
  UI.seed = function (input, onChange) {
    input = resolve(input);
    input.addEventListener('change', function () {
      var v = Math.max(1, Math.min(999999, Math.round(+input.value) || 1));
      input.value = v; onChange(v);
    });
    return +input.value;
  };

  global.UI = UI;
})(typeof window !== 'undefined' ? window : this);

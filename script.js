/* Homepage behaviour: research figure and the AI systems results row. */
(function () {
  'use strict';

  /* Sharpe by method, Table 2 of Sanchez Arenas (2026), mean and std over 3 seeds */
  var svg = document.getElementById('researchSharpeChart');
  if (svg) {
    var METHODS = [
      { id: 'RAT-CARD', g: 'star' }, { id: 'RAT-CREM', g: 'neural' }, { id: 'LSTM', g: 'neural' }, { id: 'MLP', g: 'neural' },
      { id: 'Equal Weight', g: 'trad' }, { id: 'Min Variance', g: 'trad' }, { id: 'Risk Parity', g: 'trad' }, { id: 'HRP', g: 'trad' }, { id: 'GMM-MVO', g: 'trad' }
    ];
    var SHARPE = {
      A: { 'RAT-CARD': [0.822, 0.397], 'RAT-CREM': [0.992, 0.430], 'LSTM': [1.125, 0.449], 'MLP': [0.874, 0.463], 'Equal Weight': [0.294, 0.400], 'Min Variance': [0.818, 0.275], 'Risk Parity': [0.641, 0.335], 'HRP': [0.538, 0.225], 'GMM-MVO': [0.444, 0.426] },
      B: { 'RAT-CARD': [0.692, 0.316], 'RAT-CREM': [0.779, 0.326], 'LSTM': [0.746, 0.325], 'MLP': [0.747, 0.263], 'Equal Weight': [0.162, 0.201], 'Min Variance': [0.500, 0.277], 'Risk Parity': [0.414, 0.235], 'HRP': [0.260, 0.219], 'GMM-MVO': [0.489, 0.403] },
      C: { 'RAT-CARD': [0.450, 0.542], 'RAT-CREM': [0.667, 0.453], 'LSTM': [0.808, 0.349], 'MLP': [0.293, 0.486], 'Equal Weight': [-0.306, 0.350], 'Min Variance': [0.345, 0.385], 'Risk Parity': [0.029, 0.392], 'HRP': [-0.111, 0.353], 'GMM-MVO': [0.579, 0.366] }
    };
    var COLOR = { star: 'var(--s1)', neural: 'var(--s2)', trad: 'var(--s4)' };
    var NS = 'http://www.w3.org/2000/svg';
    var el = function (t, a, txt) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
    var W = 560, H = 330, L = 112, R = 40, T = 10, B = 34, XMIN = -0.6, XMAX = 1.6;
    var x = function (v) { return L + (v - XMIN) / (XMAX - XMIN) * (W - L - R); };
    var rowH = (H - T - B) / METHODS.length;
    var draw = function (dgp) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      [-0.5, 0, 0.5, 1, 1.5].forEach(function (v) {
        svg.appendChild(el('line', { x1: x(v), x2: x(v), y1: T, y2: H - B, style: 'stroke:var(' + (v === 0 ? '--muted' : '--border') + ')' }));
        svg.appendChild(el('text', { x: x(v), y: H - B + 15, 'text-anchor': 'middle', style: 'fill:var(--muted);font:500 10px var(--sans)' }, v.toFixed(1)));
      });
      svg.appendChild(el('text', { x: (L + W - R) / 2, y: H - 3, 'text-anchor': 'middle', style: 'fill:var(--muted);font:500 10px var(--sans)' }, 'Sharpe ratio (annualized, test set)'));
      METHODS.forEach(function (m, i) {
        var d = SHARPE[dgp][m.id], mean = d[0], sd = d[1], cy = T + rowH * i + rowH / 2, bh = Math.min(16, rowH * 0.6);
        var x0 = x(Math.min(0, mean)), x1 = x(Math.max(0, mean));
        var g = el('g', { tabindex: 0, 'aria-label': m.id + ' Sharpe ' + mean.toFixed(2) + ' plus or minus ' + sd.toFixed(2) });
        g.appendChild(el('title', {}, m.id + ': ' + mean.toFixed(3) + ' ± ' + sd.toFixed(3)));
        g.appendChild(el('rect', { x: x0, y: cy - bh / 2, width: Math.max(1, x1 - x0), height: bh, rx: 2, style: 'fill:' + COLOR[m.g] }));
        var e0 = x(mean - sd), e1 = x(mean + sd);
        [[e0, e1, cy, cy], [e0, e0, cy - 4, cy + 4], [e1, e1, cy - 4, cy + 4]].forEach(function (c) { g.appendChild(el('line', { x1: c[0], x2: c[1], y1: c[2], y2: c[3], style: 'stroke:var(--text);opacity:.55' })); });
        g.appendChild(el('text', { x: L - 8, y: cy + 4, 'text-anchor': 'end', style: 'fill:var(--text);font:' + (m.g === 'star' ? 600 : 500) + ' 11px var(--sans)' }, m.id));
        g.appendChild(el('text', { x: Math.max(x1, e1) + 5, y: cy + 4, style: 'fill:var(--muted);font:500 10px var(--sans)' }, mean.toFixed(2)));
        svg.appendChild(g);
      });
      svg.appendChild(el('line', { x1: L - 4, x2: W - R, y1: T + rowH * 4, y2: T + rowH * 4, style: 'stroke:var(--border-strong);stroke-dasharray:3 4' }));
    };
    draw('A');
    document.querySelectorAll('.seg [data-dgp]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.seg [data-dgp]').forEach(function (b) { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn ? 'true' : 'false'); });
        draw(btn.dataset.dgp);
      });
    });
  }

  /* AI systems results, from the evaluation panels of every demo (assets/data/eval-results.js) */
  var box = document.getElementById('aiResults');
  if (box && window.EVAL_RESULTS && window.EVAL_RESULTS.length) {
    var R = window.EVAL_RESULTS, n = 0, acc = 0, cov = 0, seeded = 0, caught = 0, ff = 0;
    R.forEach(function (r) { n += r.fields; acc += r.accuracy * r.fields; cov += r.coverage * r.fields; seeded += r.seeded; caught += r.detected; ff += r.falseFlagRate; });
    var pct = function (x) { return (Math.round(x * 1000) / 10) + '%'; };
    var tiles = [[pct(acc / n), 'Extraction accuracy'], [pct(cov / n), 'Citation coverage'], [caught + ' of ' + seeded, 'Planted issues caught'], [pct(ff / R.length), 'False-flag rate']];
    box.innerHTML = tiles.map(function (t) { return '<div class="r"><div class="v">' + t[0] + '</div><div class="l">' + t[1] + '</div></div>'; }).join('');
    var note = document.getElementById('aiResultsNote');
    if (note) note.textContent = 'Across ' + R.length + ' demos and ' + n + ' hand-labeled fields. Each demo recomputes its own numbers when it loads.';
  }
})();

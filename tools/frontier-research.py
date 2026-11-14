# Long-run statistics for the nine-asset total-portfolio frontier: annualised arithmetic mean return, volatility and
# a full correlation matrix, calendar years 1995-2024, annual total returns in US dollars.
# Sources, judgement calls and the raw series are documented in tools/frontier-research.md.
#
# Usage:
#   python3 tools/frontier-research.py                  computes from the annual series embedded below and writes
#                                                       site/src/data/frontier.json
#   python3 tools/frontier-research.py --raw DL ALM     also re-derives the annual series from the downloaded raw files
#                                                       (DL = folder with the Bloomberg/Gerber/HFR/Damodaran files,
#                                                       ALM = data/ folder of github.com/alm0421/alm0421), checks they
#                                                       match the embedded tables, and prints a monthly cross-check.
import csv, datetime as dt, json, math, os, sys

import numpy as np

YEARS = list(range(1995, 2025))

# ---------------------------------------------------------------------------------------------------------------
# Annual total returns in percent, 1995..2024 (30 values each). See the .md for where each block comes from.
# ---------------------------------------------------------------------------------------------------------------
SERIES = {
    # S&P 500 total return index (^SP500TR, year-end to year-end)
    'useq': [37.58, 22.96, 33.36, 28.58, 21.04, -9.10, -11.89, -22.10, 28.68, 10.88, 4.91, 15.79, 5.49, -37.00, 26.46,
             15.06, 2.11, 16.00, 32.39, 13.69, 1.38, 11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29, 25.02],
    # MSCI EAFE net total return USD (M1EA monthly levels 1995-2020; MSCI factsheet 2021-2024)
    'intl': [11.21, 6.05, 1.78, 20.00, 26.96, -14.17, -21.44, -15.94, 38.59, 20.25, 13.54, 26.34, 11.17, -43.38, 31.78,
             7.75, -12.14, 17.32, 22.78, -4.90, -0.81, 1.00, 25.03, -13.79, 22.01, 7.82, 11.26, -14.45, 18.24, 3.82],
    # MSCI Emerging Markets net total return USD (monthly levels 1995-2020; MSCI factsheet 2021-2024)
    'em': [-6.95, 3.91, -13.41, -27.52, 66.49, -30.83, -2.62, -6.17, 55.82, 25.55, 34.00, 32.14, 39.42, -53.33, 78.51,
           18.88, -18.42, 18.22, -2.60, -2.19, -14.92, 11.19, 37.28, -14.57, 18.42, 18.31, -2.54, -20.09, 9.83, 7.50],
    # Bloomberg US Treasury total return (LUATTRUU)
    'gov': [18.35, 2.70, 9.57, 10.03, -2.56, 13.52, 6.75, 11.79, 2.24, 3.54, 2.79, 3.08, 9.01, 13.74, -3.57,
            5.87, 9.81, 1.99, -2.75, 5.05, 0.84, 1.04, 2.31, 0.86, 6.86, 8.00, -2.32, -12.46, 4.05, 0.58],
    # Bloomberg US Corporate investment grade total return (LUACTRUU)
    'ig': [22.25, 3.28, 10.23, 8.57, -1.96, 9.08, 10.31, 10.12, 8.24, 5.39, 1.68, 4.30, 4.56, -4.94, 18.68,
           9.00, 8.15, 9.82, -1.53, 7.46, -0.68, 6.11, 6.42, -2.51, 14.54, 9.89, -1.04, -15.76, 8.52, 2.13],
    # Bloomberg US Corporate High Yield total return (LF98TRUU)
    'hy': [19.17, 11.35, 12.76, 1.87, 2.39, -5.86, 5.28, -1.41, 28.97, 11.13, 2.74, 11.85, 1.87, -26.16, 58.21,
           15.12, 4.98, 15.81, 7.44, 2.45, -4.47, 17.13, 7.50, -2.08, 14.32, 7.11, 5.28, -11.19, 13.45, 8.19],
    # NCREIF Property Index (NPI) total return, appraisal based (desmoothed below)
    're_reported': [7.54, 10.31, 13.91, 16.24, 11.36, 12.24, 7.28, 6.74, 8.99, 14.48, 20.06, 16.59, 15.84, -6.46, -16.86,
                    13.11, 14.26, 10.54, 10.99, 11.82, 13.33, 7.97, 6.96, 6.72, 6.42, 1.60, 17.70, 5.52, -7.94, 0.59],
    # HFRI Fund Weighted Composite (monthly HFR download compounded 1995-2023; HFR full-year release for 2024)
    'hf': [21.50, 21.10, 16.79, 2.62, 31.29, 4.98, 4.62, -1.44, 19.55, 9.05, 9.27, 12.89, 9.95, -19.03, 20.01,
           10.24, -5.25, 6.37, 9.14, 2.98, -1.11, 5.46, 8.58, -4.75, 10.48, 11.83, 10.16, -4.15, 7.53, 9.80],
    # Cross-check only: FTSE Nareit All Equity REITs total return
    'reit': [15.27, 35.27, 20.26, -17.50, -4.62, 26.37, 13.93, 3.82, 37.13, 31.58, 12.16, 35.06, -15.69, -37.73, 27.99,
             27.95, 8.28, 19.70, 2.86, 28.03, 2.83, 8.63, 8.67, -4.04, 28.66, -5.12, 41.30, -24.95, 11.36, 4.92],
}
NPI_1994 = 6.39  # needed as r_{t-1} for the 1995 desmoothed value

# Private equity: no annual Cambridge Associates series was readable from this sandbox, so the class is built from
# published estimates (see .md):
PE_IRR_25Y = 0.127      # CA US Private Equity Index, 25-year pooled net IRR to 30 Jun 2024
PE_VOL_REPORTED = 0.095 # T. Rowe Price (Panariello and Priestley, 2024), reported annualised volatility
PE_VOL_DESMOOTHED_TRP = 0.163  # same study, unsmoothed with optimal lag lengths, Jun 2005 - Jun 2023
# Used on the site: the more conservative estimate implied by a market beta near 1.0 (Couts, Goncalves and Rossi,
# Review of Financial Studies, 2024), about 23%. With 16.3% private equity would look safer than public equity
# while earning more, which no desmoothing study supports once leverage and beta are accounted for.
PE_VOL_DESMOOTHED = 0.23
PE_CORR_USEQ = 0.80     # same study, unsmoothed correlation with public equities

IDS = ['useq', 'intl', 'em', 'gov', 'ig', 'hy', 'pe', 're', 'hf']
META = {
    'useq': ('US equities', 'US equities', 'growth'),
    'intl': ('International developed equities', 'Intl developed', 'growth'),
    'em': ('Emerging market equities', 'Emerging markets', 'growth'),
    'gov': ('Government bonds', 'Treasuries', 'defensive'),
    'ig': ('Investment-grade credit', 'IG credit', 'defensive'),
    'hy': ('High yield', 'High yield', 'credit'),
    'pe': ('Private equity', 'Private equity', 'growth'),
    're': ('Real estate', 'Real estate', 'real'),
    'hf': ('Hedge funds', 'Hedge funds', 'alternatives'),
}


def ac1(x):
    x = np.asarray(x, float); d = x - x.mean()
    return float((d[1:] * d[:-1]).sum() / (d * d).sum())


def geltner(r, rho, r_prev):
    """First-order Geltner: r_true_t = (r_t - rho r_{t-1}) / (1 - rho)."""
    lagged = np.concatenate([[r_prev], r[:-1]])
    return (r - rho * lagged) / (1 - rho)


def geo(x):
    return float(np.prod(1 + np.asarray(x)) ** (1 / len(x)) - 1)


def nearest_psd(c):
    """Higham-style projection: clip negative eigenvalues, rescale to unit diagonal."""
    w, v = np.linalg.eigh(c)
    c2 = v @ np.diag(np.clip(w, 1e-8, None)) @ v.T
    d = np.sqrt(np.diag(c2)); return c2 / np.outer(d, d)


def compute():
    R = {k: np.array(v) / 100 for k, v in SERIES.items()}
    for k, v in R.items():
        assert len(v) == 30, k
    npi = R['re_reported']
    rho_re = ac1(npi)
    R['re'] = geltner(npi, rho_re, NPI_1994 / 100)
    liquid = ['useq', 'intl', 'em', 'gov', 'ig', 'hy', 're', 'hf']
    X = np.column_stack([R[k] for k in liquid])
    C8 = np.corrcoef(X, rowvar=False)
    # Appraisal-based real estate lags listed markets by about a year, which first-order Geltner desmoothing does
    # not remove. Its correlations therefore add the lagged cross-covariance (Dimson, 1979):
    # corr = [cov(RE_t, X_t) + cov(RE_t, X_{t-1})] / (sd(RE) sd(X)), on the desmoothed series.
    ire = liquid.index('re'); re = R['re']
    for j, k in enumerate(liquid):
        if k == 're': continue
        x = R[k]
        c0 = np.cov(re, x, ddof=1)[0, 1]
        c1 = np.cov(re[1:], x[:-1], ddof=1)[0, 1]
        C8[ire, j] = C8[j, ire] = (c0 + c1) / (re.std(ddof=1) * x.std(ddof=1))
    # Private equity row: one-factor link through US equities, corr(PE, X) = rho_PE,US x corr(US, X).
    # This is a valid (PSD) extension: PE = rho Z_US + sqrt(1 - rho^2) e, with e independent of everything else.
    i_us = liquid.index('useq')
    pe_row = PE_CORR_USEQ * C8[i_us]
    order = IDS
    C = np.eye(9)
    idx = {k: i for i, k in enumerate(liquid)}
    for a, ka in enumerate(order):
        for b, kb in enumerate(order):
            if ka == 'pe' and kb == 'pe': C[a, b] = 1
            elif ka == 'pe': C[a, b] = pe_row[idx[kb]]
            elif kb == 'pe': C[a, b] = pe_row[idx[ka]]
            else: C[a, b] = C8[idx[ka], idx[kb]]
    stats = {}
    for k in liquid:
        stats[k] = dict(ret=float(R[k].mean()), vol=float(R[k].std(ddof=1)), geo=geo(R[k]), ac1=ac1(R[k]))
    # NPI: report the reported-series mean (Geltner leaves the arithmetic mean unchanged in expectation)
    stats['re']['ret'] = float(npi.mean())
    stats['re_reported'] = dict(ret=float(npi.mean()), vol=float(npi.std(ddof=1)), geo=geo(npi), ac1=rho_re)
    stats['reit'] = dict(ret=float(R['reit'].mean()), vol=float(R['reit'].std(ddof=1)), geo=geo(R['reit']), ac1=ac1(R['reit']))
    # PE arithmetic mean: the 25-year IRR is a geometric-type figure; add half the REPORTED variance to get the
    # arithmetic mean of the reported series, which Geltner-style desmoothing preserves.
    stats['pe'] = dict(ret=PE_IRR_25Y + 0.5 * PE_VOL_REPORTED ** 2, vol=PE_VOL_DESMOOTHED, geo=PE_IRR_25Y, ac1=float('nan'))
    Cr = np.round(C, 2)
    eig_raw, eig_round = np.linalg.eigvalsh(C), np.linalg.eigvalsh(Cr)
    fixed = False
    if eig_round.min() < 0:
        Cr = np.round(nearest_psd(Cr), 2); fixed = True
    return R, stats, C, Cr, eig_raw, eig_round, fixed, rho_re


def report(R, stats, C, Cr, eig_raw, eig_round, fixed, rho_re):
    print(f'NPI lag-1 autocorrelation (annual, 1995-2024) rho = {rho_re:.3f}')
    print(f'{"id":6}{"arith":>8}{"geo":>8}{"vol":>8}{"ac1":>7}')
    for k in IDS + ['re_reported', 'reit']:
        s = stats[k]
        print(f'{k:6}{100*s["ret"]:8.2f}{100*s["geo"]:8.2f}{100*s["vol"]:8.2f}{s["ac1"]:7.2f}')
    print('correlation (rounded):'); print('      ' + ''.join(f'{k:>6}' for k in IDS))
    for k, row in zip(IDS, Cr):
        print(f'{k:6}' + ''.join(f'{v:6.2f}' for v in row))
    print('eigenvalues unrounded:', np.round(eig_raw, 4)); print('eigenvalues rounded:', np.round(eig_round, 4))
    print('nearest-PSD fix applied:', fixed)
    print('corr(REIT, X) cross-check:', {k: round(float(np.corrcoef(R['reit'], R[k])[0, 1]), 2) for k in IDS if k != 'pe'})


SOURCES = [
    ('useq', 'S&P 500 total return index (S&P Dow Jones Indices, Yahoo Finance ^SP500TR daily closes as mirrored in github.com/alm0421/alm0421 data/prices/^SP500TR.csv); identical to the SPX TR column of the Bloomberg monthly file in github.com/itsthecai/Enhanced-Gerber data/prcs.csv for 1995-2020', 'Calendar years 1995-2024, annual total returns from year-end index levels.'),
    ('intl', 'MSCI EAFE net total return USD: Bloomberg M1EA monthly levels (github.com/itsthecai/Enhanced-Gerber data/prcs.csv) for 1995-2020; MSCI EAFE Index (USD) factsheet annual net returns (msci.com/documents/10199/822e3d18-16fb-4d23-9295-11bc9e07b8ba) for 2021-2024', 'Calendar years 1995-2024, annual. Net (after withholding tax) returns.'),
    ('em', 'MSCI Emerging Markets net total return USD: Bloomberg monthly levels (github.com/itsthecai/Enhanced-Gerber data/prcs.csv) for 1995-2020; MSCI Emerging Markets Index (USD) net factsheet (msci.com/documents/10199/255599/msci-emerging-markets-index-usd-net.pdf) for 2021-2024', 'Calendar years 1995-2024, annual. Net returns.'),
    ('gov', 'Bloomberg US Treasury Index total return (LUATTRUU), Bloomberg terminal export mirrored in github.com/taka9999/Regime_switching_model_to_fixed_income data/luattruu.csv', 'Calendar years 1995-2024, annual from year-end levels.'),
    ('ig', 'Bloomberg US Corporate (investment grade) Index total return (LUACTRUU), Bloomberg export mirrored in github.com/taka9999/Regime_switching_model_to_fixed_income data/luactruu.csv', 'Calendar years 1995-2024, annual from year-end levels.'),
    ('hy', 'Bloomberg US Corporate High Yield Index total return (LF98TRUU), Bloomberg export mirrored in github.com/taka9999/Regime_switching_model_to_fixed_income data/lf98truu.csv (matches the LF98TRUU column of the Enhanced-Gerber file)', 'Calendar years 1995-2024, annual from year-end levels.'),
    ('pe', 'Published estimates, not a computed series: return from the Cambridge Associates US Private Equity Index 25-year pooled net IRR to 30 Jun 2024 (12.7%, CA benchmark statistics); desmoothed volatility 16.3% (reported 9.5%) and desmoothed correlation 0.80 with public equities from T. Rowe Price, Panariello and Priestley, "A Closer Look at the Diversification Potential of Private Assets" (March 2024, quarterly data Jun 2005 - Jun 2023, unsmoothed with optimal lag lengths)', 'No annual CA series was obtainable here. Arithmetic return = 12.7% IRR + half the reported variance. Correlations with the other classes are 0.80 x the US-equity correlation (one-factor assumption).'),
    ('re', 'NCREIF Property Index (NPI) total return: ncreif.org property-index returns table (1978-2010 annual values as transcribed in github.com/puppetjoy/portfolio portfolio0.m; 2011-2024 from NCREIF quarterly tables and NCREIF/industry releases, see tools/frontier-research.md)', 'Calendar years 1995-2024, annual. Geltner-desmoothed (first order, rho = annual lag-1 autocorrelation of the NPI) before computing volatility and correlations; return is the arithmetic mean of the reported NPI. FTSE Nareit All Equity REITs used as a cross-check only.'),
    ('hf', 'HFRI Fund Weighted Composite Index (HFR): monthly returns from an HFR index download mirrored in github.com/digital-hub-insights/dh-labs-public (1990-2023), compounded to calendar years; 2024 = +9.8% from HFR full-year release (hfr.com, 24 Jan 2025)', 'Calendar years 1995-2024, annual. Not desmoothed (annual lag-1 autocorrelation reported in the notes).'),
]


def write_json(stats, Cr, path):
    assets = [dict(id=k, name=META[k][0], short=META[k][1], group=META[k][2],
                   ret=round(stats[k]['ret'], 4), vol=round(stats[k]['vol'], 4)) for k in IDS]
    out = {'window': '1995-2024, calendar-year total returns in USD (annual); private equity from published estimates',
           'assets': assets, 'corr': [[float(f'{v:.2f}') for v in row] for row in Cr],
           'sources': [dict(id=i, source=s, note=n) for i, s, n in SOURCES]}
    with open(path, 'w') as f:
        json.dump(out, f, indent=1); f.write('\n')


# ---------------------------------------------------------------------------------------------------------------
# Optional: rebuild the annual series from the raw downloads and run a monthly cross-check
# ---------------------------------------------------------------------------------------------------------------
def mdy(s):
    m, d, y = s.split(' ')[0].split('/'); return dt.date(int(y), int(m), int(d))


def month_end(series):
    out = {}
    for d in sorted(series): out[(d.year, d.month)] = series[d]
    return out


def from_raw(dl, alm):
    lv = {}
    for k, f in [('gov', 'luat.csv'), ('ig', 'luac.csv'), ('hy', 'lf98.csv')]:
        s = {}
        for row in csv.reader(open(os.path.join(dl, f), encoding='utf-8-sig')):
            if len(row) > 1 and '/' in row[0] and row[0][:1].isdigit():
                try: s[mdy(row[0])] = float(row[1])
                except ValueError: pass
        lv[k] = month_end(s)
    g = list(csv.DictReader(open(os.path.join(dl, 'gerber.csv'))))
    for k, col in [('intl', 'M1EA'), ('em', 'EM'), ('reit', 'FNERTR')]:
        lv[k] = month_end({mdy(r['Date']): float(r[col]) for r in g})
    lv['useq'] = month_end({dt.date.fromisoformat(r['date']): float(r['adj_close'])
                           for r in csv.DictReader(open(os.path.join(alm, 'prices', '^SP500TR.csv')))})
    hfm = {}
    for r in csv.DictReader(open(os.path.join(dl, 'hfr_dl.csv'))):
        d = dt.date.fromisoformat(r['Date']); hfm[(d.year, d.month)] = float(r[list(r)[1]])
    # annual check
    for k in ['useq', 'intl', 'em', 'gov', 'ig', 'hy', 'reit']:
        for i, y in enumerate(YEARS):
            if (y, 12) in lv[k] and (y - 1, 12) in lv[k]:
                a = 100 * (lv[k][(y, 12)] / lv[k][(y - 1, 12)] - 1)
                assert abs(a - SERIES[k][i]) < 0.006, (k, y, a, SERIES[k][i])
    for i, y in enumerate(YEARS[:-1]):
        a = 100 * (math.prod(1 + hfm[(y, m)] for m in range(1, 13)) - 1)
        assert abs(a - SERIES['hf'][i]) < 0.006, ('hf', y, a)
    print('raw files reproduce the embedded annual series')
    # monthly cross-check, Jan 1995 - Dec 2020 (common window of the monthly files)
    months = [(y, m) for y in range(1995, 2021) for m in range(1, 13)]
    def mret(k):
        out = []
        for (y, m) in months:
            p = (y, m - 1) if m > 1 else (y - 1, 12)
            out.append(lv[k][(y, m)] / lv[k][p] - 1)
        return np.array(out)
    keys = ['useq', 'intl', 'em', 'gov', 'ig', 'hy', 'reit']
    M = {k: mret(k) for k in keys}; M['hf'] = np.array([hfm[ym] for ym in months]); keys.append('hf')
    print('monthly 1995-2020: annualised arithmetic mean (12 x mean), vol (sqrt12 x sd), lag-1 autocorr')
    for k in keys:
        print(f'  {k:5} {1200*M[k].mean():6.2f} {100*math.sqrt(12)*M[k].std(ddof=1):6.2f} {ac1(M[k]):5.2f}')
    Cm = np.corrcoef(np.column_stack([M[k] for k in keys]), rowvar=False)
    print('       ' + ''.join(f'{k:>6}' for k in keys))
    for k, row in zip(keys, Cm): print(f'  {k:5}' + ''.join(f'{v:6.2f}' for v in row))


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, '..', 'site', 'src', 'data', 'frontier.json')
    res = compute(); report(*res)
    write_json(res[1], res[3], out)
    print('wrote', os.path.normpath(out))
    if len(sys.argv) >= 4 and sys.argv[1] == '--raw':
        from_raw(sys.argv[2], sys.argv[3])

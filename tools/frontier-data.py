# Annualised return, volatility and correlation for the homepage frontier, computed from monthly historical series.
# Sources (public datasets mirrored on GitHub under github.com/datasets):
#   US equities    S&P 500 total return (price plus dividends), Shiller data, datasets/s-and-p-500
#   US Treasuries  total return of a 10-year par bond from the monthly 10-year yield, datasets/bond-yields-us-10y
#   Gold           monthly gold price in US dollars, datasets/gold-prices
#   Commodities    IMF all-commodity price index, datasets/commodity-prices
# Common window: every month all four series exist (Feb 1992 to Jun 2017). Returns are arithmetic, annualised as
# 12 x the monthly mean. All four series are monthly averages of daily values, which understates volatility and puts
# positive autocorrelation into monthly changes (Working, 1960). The covariance is therefore annualised with the first
# lag added back, 12 x (G0 + G1 + G1'), which restores the variance of the underlying daily series for an averaged
# random walk. Writes site/src/data/frontier.json.
# Usage: python3 tools/frontier-data.py tools/data/frontier   (the four source CSV files are kept there)
import csv, json, math, os, sys

d = sys.argv[1]
def rows(f): return list(csv.DictReader(open(os.path.join(d, f))))
def month(s): return s[:7]

sp = {month(r['Date']): (float(r['SP500']), float(r['Dividend'] or 0)) for r in rows('datasets_s-and-p-500_main_data_data.csv')}
y10 = {month(r['Date']): float(r['Rate']) / 100 for r in rows('datasets_bond-yields-us-10y_main_data_monthly.csv') if r['Rate']}
gold = {month(r['Date']): float(r['Price']) for r in rows('datasets_gold-prices_main_data_monthly.csv') if r['Price']}
com = {month(r['Date']): float(r['All Commodity Price Index']) for r in rows('datasets_commodity-prices_main_data_commodity-prices.csv') if r['All Commodity Price Index'] not in ('', 'nan')}

def bond_price(c, y, n):  # price per 1 of a bond paying coupon c (annual rate, semiannual) with n years left, at yield y
    k = round(n * 2); r = y / 2
    return sum(c / 2 / (1 + r) ** i for i in range(1, k + 1)) + 1 / (1 + r) ** k if k > 0 else 1.0

months = sorted(set(sp) & set(y10) & set(gold) & set(com))
R = {k: [] for k in ('eq', 'tsy', 'gold', 'cmd')}
used = []
for a, b in zip(months, months[1:]):
    (pa, da), (pb, db) = sp[a], sp[b]
    if pa <= 0 or pb <= 0 or db <= 0: continue
    R['eq'].append((pb + db / 12) / pa - 1)                       # Shiller dividends are annual rates
    ya, yb = y10[a], y10[b]
    R['tsy'].append(bond_price(ya, yb, 10 - 1 / 12) - 1 + ya / 12)  # bought at par, coupon accrues one month, repriced
    R['gold'].append(gold[b] / gold[a] - 1)
    R['cmd'].append(com[b] / com[a] - 1)
    used.append(b)

n = len(used)
keys = ['eq', 'tsy', 'gold', 'cmd']
mean = lambda x: sum(x) / len(x)
def cov(x, y, lag=0):
    mx, my = mean(x), mean(y)
    return sum((x[t] - mx) * (y[t - lag] - my) for t in range(lag, len(x))) / (len(x) - 1)
S = [[12 * (cov(R[a], R[b]) + cov(R[a], R[b], 1) + cov(R[b], R[a], 1)) for b in keys] for a in keys]
vol = [math.sqrt(S[i][i]) for i in range(len(keys))]
out = {
  'window': [used[0], used[-1]], 'months': n,
  'assets': [{ 'id': k, 'ret': round(12 * mean(R[k]), 4), 'vol': round(vol[i], 4) } for i, k in enumerate(keys)],
  'corr': [[round(S[i][j] / (vol[i] * vol[j]), 2) for j in range(len(keys))] for i in range(len(keys))]
}
json.dump(out, open(os.path.join(os.path.dirname(__file__), '..', 'site', 'src', 'data', 'frontier.json'), 'w'), indent=1)
print(json.dumps(out))

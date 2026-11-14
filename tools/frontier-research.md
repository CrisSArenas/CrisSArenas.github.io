# Frontier inputs: research record

Statistics for the nine-asset total-portfolio frontier in `site/src/data/frontier.json`, computed by
`tools/frontier-research.py`. Window: calendar years 1995 to 2024 (30 annual total returns, USD). Private equity is the
exception: it uses published estimates (see judgement call 1).

## How the data was gathered

The session could reach GitHub and a web search tool only. Direct fetches of the publishers' sites (NYU Stern,
Novel Investor, Wikipedia, FRED, NCREIF, HFR, MSCI, Cambridge Associates) were blocked by the sandbox's network policy.
So every series below comes from one of:

- a mirror of a primary data file on GitHub, checked against a second independent copy where one exists, or
- a figure published by the index provider and confirmed through web search results that quote that publication.

Several GitHub files that looked useful were rejected because they are not real data. They are hand-written or
"approximated" quarterly series, with comments like "Approximated from Cambridge Associates published benchmark data":
`Drakeral/Portfolio-Tail-Risk-and-Stress-Testing-Framework data/given/*.py`, `davidtey/fe5211_project`, and
`JoshGutierrez56/Cap-Rate-Decomposition` ncreif_npi.csv. None of them was used.

## Sources

| Class | Source | URL | What was taken |
|---|---|---|---|
| US equities | S&P 500 Total Return index (^SP500TR), daily closes from Yahoo Finance, mirrored in alm0421/alm0421 | https://github.com/alm0421/alm0421 (data/prices/^SP500TR.csv) | Year-end levels 1994 to 2024, giving annual returns. They match the official S&P figures (for example 2008 -37.00, 2024 25.02) |
| US equities (check) | Bloomberg monthly levels (SPX TR) used in the Gerber-statistic replication | https://github.com/itsthecai/Enhanced-Gerber (data/prcs.csv) | 1995-2020, identical to the above |
| US equities (check) | Damodaran, Historical Returns (histretSP), mirrored with source header | https://github.com/raei-2748/caplet-investment (keel/library/insight_v1/scripts/data/D3/damodaran_histretSP_1928_2025.csv); original https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html | Cross-check only. Damodaran's own S&P computation is 0.0-0.5 pp off the official numbers each year |
| Intl developed | MSCI EAFE net TR USD (Bloomberg M1EA), monthly levels | https://github.com/itsthecai/Enhanced-Gerber (data/prcs.csv) | Annual 1995-2020 |
| Intl developed | MSCI EAFE Index (USD) factsheet, annual net performance | https://www.msci.com/documents/10199/822e3d18-16fb-4d23-9295-11bc9e07b8ba | 2021 11.26, 2022 -14.45, 2023 18.24, 2024 3.82. The exact values were confirmed in search results quoting the factsheet |
| Intl developed (check) | MSCI EAFE annual net returns 1970-2010, transcribed in puppetjoy/portfolio | https://github.com/puppetjoy/portfolio (portfolio0.m) | Identical for 1995-2010. Ken French "Developed ex US" market return (alm0421 data/factors) used as a loose check |
| Emerging markets | MSCI EM net TR USD, Bloomberg monthly levels | https://github.com/itsthecai/Enhanced-Gerber (data/prcs.csv) | Annual 1995-2020. The column is the net series: 2008 -53.33, 2009 78.51, 2017 37.28 |
| Emerging markets | MSCI Emerging Markets Index (USD) net factsheet | https://www.msci.com/documents/10199/255599/msci-emerging-markets-index-usd-net.pdf | 2021 -2.54, 2022 -20.09, 2023 9.83, 2024 7.50. Search results quoting the factsheet confirmed these to one decimal (-2.5, -20.1, 9.8, 7.5) |
| Government bonds | Bloomberg US Treasury Index TR (LUATTRUU), Bloomberg terminal export | https://github.com/taka9999/Regime_switching_model_to_fixed_income (data/luattruu.csv) | Year-end levels 1994-2024 |
| IG credit | Bloomberg US Corporate Index TR (LUACTRUU), Bloomberg export | same repo (data/luactruu.csv) | Year-end levels 1994-2024 |
| High yield | Bloomberg US Corporate High Yield TR (LF98TRUU), Bloomberg export | same repo (data/lf98truu.csv) | Year-end levels 1994-2024. Identical to the LF98TRUU column of the Gerber file for 1995-2020 |
| Real estate | NCREIF Property Index (NPI) total return, annual 1978-2010, transcribed from ncreif.org property-index-returns page | https://github.com/puppetjoy/portfolio (portfolio0.m) | 1994 (6.39) and 1995-2010 |
| Real estate | NCREIF quarterly NPI table (epitest.ncreif.org/property-index-returns.aspx), compounded in search results | https://epitest.ncreif.org/property-index-returns.aspx | 2011 14.26, 2012 10.54, 2013 10.99, 2014 11.82, 2015 13.33 |
| Real estate | NCREIF and industry releases quoting the NPI | GlobeSt / RealNex 2017 (2016 = 7.97, "4.74 income, 3.10 appreciation"); IREI / MBA 2018 (2017 "just under 7%", used 6.96); DWS US Property Performance Monitor 4Q19 (2018 6.7, 2019 6.4); WealthManagement.com (2020 1.6); Capital Economics (2021 17.7); PA SERS 4Q22 real estate review (2022 5.5); NCREIF attribution webinar March 2024 (2023 -7.9); NIC blog and L&G Real Estate Pulse Q1 2025 (2024 0.59 / 0.6, Expanded NPI) | 2016-2024. Two-decimal values are the published NPI figures, and the sources listed confirm them to the precision shown |
| Real estate (check) | FTSE Nareit All Equity REITs TR. Bloomberg monthly FNERTR (Gerber file) for 1995-2020, and Nareit AnnualReturns.xlsx as transcribed in RemarkRemedy/fireplanner for 1995-2024 | https://github.com/itsthecai/Enhanced-Gerber ; https://github.com/RemarkRemedy/fireplanner (frontend/src/lib/data/historicalReturnsFull.ts); original https://www.reit.com/data-research/reit-indexes/annual-index-values-returns | Cross-check only. The two copies agree for every year 1995-2020 |
| Hedge funds | HFRI Fund Weighted Composite, monthly returns (HFR index download, Jan 2024 vintage) | https://github.com/digital-hub-insights/dh-labs-public (index_ror_perf_download-2899_1705242702.csv) | Monthly 1990-2023, compounded to calendar years. 1995 21.50, 1996 21.10 and 1997 16.79 match HFR's 2024 Media Reference Guide |
| Hedge funds | HFR press release, 24 Jan 2025 ("Hedge fund assets surge to record...") | https://www.hfr.com/media/market-commentary/hedge-fund-assets-surge-to-record-as-trump-administration-takes-office/ | 2024 = +9.8% |
| Private equity | Cambridge Associates US PE Index benchmark statistics, 30 Jun 2024, as quoted in search results | https://www.cambridgeassociates.com/insight/us-pe-vc-benchmark-commentary-calendar-year-2024/ (and CA benchmark books) | 25-year pooled net IRR 12.7% (20-year 14.5%, 10-year 15.0%). CY2024 index return 8.1% (not used) |
| Private equity | T. Rowe Price, Panariello and Priestley, "A Closer Look at the Diversification Potential of Private Assets", March 2024 | https://www.troweprice.com/content/dam/gdx/pdfs/2024-q1/a-closer-look-at-the-diversification-benefits-of-private-assets.pdf | PE, quarterly Jun 2005 to Jun 2023: reported volatility 9.5%, unsmoothed volatility 16.3%, correlation with public equities 0.8 both before and after unsmoothing (unsmoothing with optimal lag lengths) |
| Private equity (context) | Couts, Goncalves and Rossi, "Unsmoothing Returns of Illiquid Funds", Review of Financial Studies 37(7), 2024 | https://doi.org/10.1093/rfs/hhae006 | Average buyout fund: market beta about 1.0, total risk about 33% a year (fund level). Not used in the numbers. It shows that simple unsmoothing may understate PE risk (see judgement call 1) |

## Raw annual series (percent)

NPI is reported (appraisal) and NPI-d is Geltner-desmoothed. REIT (FTSE Nareit All Equity) is a cross-check only.

| Year | S&P 500 | EAFE | EM | UST | IG | HY | NPI | NPI-d | HFRI | REIT |
|---|---|---|---|---|---|---|---|---|---|---|
| 1995 | 37.58 | 11.21 | -6.95 | 18.35 | 22.25 | 19.17 | 7.54 | 8.13 | 21.50 | 15.27 |
| 1996 | 22.96 | 6.05 | 3.91 | 2.70 | 3.28 | 11.35 | 10.31 | 11.73 | 21.10 | 35.27 |
| 1997 | 33.36 | 1.78 | -13.41 | 9.57 | 10.23 | 12.76 | 13.91 | 15.76 | 16.79 | 20.26 |
| 1998 | 28.58 | 20.00 | -27.52 | 10.03 | 8.57 | 1.87 | 16.24 | 17.44 | 2.62 | -17.50 |
| 1999 | 21.04 | 26.96 | 66.49 | -2.56 | -1.96 | 2.39 | 11.36 | 8.85 | 31.29 | -4.62 |
| 2000 | -9.10 | -14.17 | -30.83 | 13.52 | 9.08 | -5.86 | 12.24 | 12.69 | 4.98 | 26.37 |
| 2001 | -11.89 | -21.44 | -2.62 | 6.75 | 10.31 | 5.28 | 7.28 | 4.73 | 4.62 | 13.93 |
| 2002 | -22.10 | -15.94 | -6.17 | 11.79 | 10.12 | -1.41 | 6.74 | 6.46 | -1.44 | 3.82 |
| 2003 | 28.68 | 38.59 | 55.82 | 2.24 | 8.24 | 28.97 | 8.99 | 10.15 | 19.55 | 37.13 |
| 2004 | 10.88 | 20.25 | 25.55 | 3.54 | 5.39 | 11.13 | 14.48 | 17.30 | 9.05 | 31.58 |
| 2005 | 4.91 | 13.54 | 34.00 | 2.79 | 1.68 | 2.74 | 20.06 | 22.93 | 9.27 | 12.16 |
| 2006 | 15.79 | 26.34 | 32.14 | 3.08 | 4.30 | 11.85 | 16.59 | 14.81 | 12.89 | 35.06 |
| 2007 | 5.49 | 11.17 | 39.42 | 9.01 | 4.56 | 1.87 | 15.84 | 15.45 | 9.95 | -15.69 |
| 2008 | -37.00 | -43.38 | -53.33 | 13.74 | -4.94 | -26.16 | -6.46 | -17.91 | -19.03 | -37.73 |
| 2009 | 26.46 | 31.78 | 78.51 | -3.57 | 18.68 | 58.21 | -16.86 | -22.20 | 20.01 | 27.99 |
| 2010 | 15.06 | 7.75 | 18.88 | 5.87 | 9.00 | 15.12 | 13.11 | 28.50 | 10.24 | 27.95 |
| 2011 | 2.11 | -12.14 | -18.42 | 9.81 | 8.15 | 4.98 | 14.26 | 14.85 | -5.25 | 8.28 |
| 2012 | 16.00 | 17.32 | 18.22 | 1.99 | 9.82 | 15.81 | 10.54 | 8.63 | 6.37 | 19.70 |
| 2013 | 32.39 | 22.78 | -2.60 | -2.75 | -1.53 | 7.44 | 10.99 | 11.22 | 9.14 | 2.86 |
| 2014 | 13.69 | -4.90 | -2.19 | 5.05 | 7.46 | 2.45 | 11.82 | 12.25 | 2.98 | 28.03 |
| 2015 | 1.38 | -0.81 | -14.92 | 0.84 | -0.68 | -4.47 | 13.33 | 14.11 | -1.11 | 2.83 |
| 2016 | 11.96 | 1.00 | 11.19 | 1.04 | 6.11 | 17.13 | 7.97 | 5.22 | 5.46 | 8.63 |
| 2017 | 21.83 | 25.03 | 37.28 | 2.31 | 6.42 | 7.50 | 6.96 | 6.44 | 8.58 | 8.67 |
| 2018 | -4.38 | -13.79 | -14.57 | 0.86 | -2.51 | -2.08 | 6.72 | 6.60 | -4.75 | -4.04 |
| 2019 | 31.49 | 22.01 | 18.42 | 6.86 | 14.54 | 14.32 | 6.42 | 6.27 | 10.48 | 28.66 |
| 2020 | 18.40 | 7.82 | 18.31 | 8.00 | 9.89 | 7.11 | 1.60 | -0.88 | 11.83 | -5.12 |
| 2021 | 28.71 | 11.26 | -2.54 | -2.32 | -1.04 | 5.28 | 17.70 | 25.97 | 10.16 | 41.30 |
| 2022 | -18.11 | -14.45 | -20.09 | -12.46 | -15.76 | -11.19 | 5.52 | -0.74 | -4.15 | -24.95 |
| 2023 | 26.29 | 18.24 | 9.83 | 4.05 | 8.52 | 13.45 | -7.94 | -14.85 | 7.53 | 11.36 |
| 2024 | 25.02 | 3.82 | 7.50 | 0.58 | 2.13 | 8.19 | 0.59 | 4.97 | 9.80 | 4.92 |

NPI 1994 = 6.39, used as the lagged value for the 1995 desmoothed figure.

## Method

1. Annual total return for each year = year-end level / prior year-end level - 1. For HFRI it is the product of the 12
   monthly returns. Running `python3 tools/frontier-research.py --raw <downloads> <alm0421 data dir>` re-derives every
   series from the raw files and asserts that it matches the table above.
2. Return = arithmetic mean of the 30 annual returns. Volatility = sample standard deviation (n - 1). Correlation =
   Pearson correlation of the 30 annual returns. All nine classes (eight series plus the private equity construction)
   share the same 1995-2024 window, so the matrix is not a mixed-window matrix.
3. Real estate desmoothing uses first-order Geltner on the annual NPI:
   `r_true_t = (r_t - rho * r_{t-1}) / (1 - rho)`, where rho is the lag-1 autocorrelation of the annual NPI over
   1995-2024 (0.339). Volatility and correlations use the desmoothed series. The return is the arithmetic mean of the
   reported NPI (8.60%). Geltner leaves the arithmetic mean unchanged in expectation, and the desmoothed sample mean
   is also 8.60%.
4. Private equity is built from published estimates. Volatility is 23% (see judgement call 1; the T. Rowe Price
   desmoothed figure of 16.3% is kept in the script as a record). Correlation with US equities is
   0.80. Correlation with every other class is 0.80 x that class's correlation with US equities. This equals modelling
   desmoothed PE as 0.80 x (standardised US equities) plus independent noise, so the extended matrix stays positive
   semidefinite. Return = 12.7% (CA 25-year IRR) + 0.5 x 0.095^2 = 13.15%, which is the arithmetic mean of the reported
   series. Desmoothing preserves that mean, the same convention as for real estate.
5. Real estate correlations add the lag-1 cross-covariance to the contemporaneous one (a Dimson-style adjustment, see
   judgement call 2): corr = (cov(re_t, x_t) + cov(re_t, x_{t-1})) / (sd(re) sd(x)).
6. PSD check. Eigenvalues of the rounded 9x9 matrix are 0.034, 0.041, 0.173, 0.222, 0.292, 0.504, 0.845, 1.672 and
   5.218, all positive. No nearest-PSD fix was needed.
7. Rounding: returns and volatilities to 4 decimals, correlations to 2.

## Final table (1995-2024, annual)

| id | Class | Arithmetic mean | Geometric | Volatility | Annual lag-1 autocorr |
|---|---|---|---|---|---|
| useq | US equities (S&P 500 TR) | 12.58% | 10.92% | 18.34% | 0.02 |
| intl | MSCI EAFE (net, USD) | 6.79% | 5.08% | 18.30% | -0.17 |
| em | MSCI EM (net, USD) | 8.64% | 4.74% | 29.32% | -0.29 |
| gov | Bloomberg US Treasury | 4.36% | 4.18% | 6.22% | 0.00 |
| ig | Bloomberg US Corporate IG | 5.68% | 5.43% | 7.30% | -0.10 |
| hy | Bloomberg US Corporate HY | 7.84% | 7.00% | 13.98% | -0.24 |
| pe | Private equity (published estimates) | 13.15% | 12.70% (IRR) | 23.00% | n/a |
| re | NCREIF NPI, Geltner-desmoothed | 8.60% | 7.87% | 11.37% | 0.14 |
| hf | HFRI Fund Weighted Composite | 8.02% | 7.57% | 9.81% | -0.12 |
| (check) | NPI as reported | 8.60% | 8.29% | 8.01% | 0.34 |
| (check) | FTSE Nareit All Equity REITs | 11.41% | 9.59% | 19.43% | -0.15 |

Correlation matrix:

|  | useq | intl | em | gov | ig | hy | pe | re | hf |
|---|---|---|---|---|---|---|---|---|---|
| useq | 1.00 | 0.81 | 0.45 | -0.11 | 0.44 | 0.66 | 0.80 | 0.74 | 0.75 |
| intl | 0.81 | 1.00 | 0.77 | -0.31 | 0.31 | 0.69 | 0.65 | 0.69 | 0.75 |
| em | 0.45 | 0.77 | 1.00 | -0.37 | 0.26 | 0.69 | 0.36 | 0.44 | 0.72 |
| gov | -0.11 | -0.31 | -0.37 | 1.00 | 0.58 | -0.17 | -0.09 | 0.03 | -0.14 |
| ig | 0.44 | 0.31 | 0.26 | 0.58 | 1.00 | 0.65 | 0.35 | 0.47 | 0.39 |
| hy | 0.66 | 0.69 | 0.69 | -0.17 | 0.65 | 1.00 | 0.52 | 0.53 | 0.65 |
| pe | 0.80 | 0.65 | 0.36 | -0.09 | 0.35 | 0.52 | 1.00 | 0.60 | 0.60 |
| re | 0.74 | 0.69 | 0.44 | 0.03 | 0.47 | 0.53 | 0.60 | 1.00 | 0.76 |
| hf | 0.75 | 0.75 | 0.72 | -0.14 | 0.39 | 0.65 | 0.60 | 0.76 | 1.00 |

## Monthly cross-check (Jan 1995 to Dec 2020, liquid series only)

The monthly files run only to 2020, so this check is not the headline. Annualised as 12 x mean and sqrt(12) x sd:
S&P 11.19 / 15.09, EAFE 6.48 / 16.32, EM 8.25 / 22.35, UST 5.25 / 4.34, IG 6.57 / 5.50, HY 7.69 / 8.71,
REIT 11.68 / 19.17, HFRI 7.84 / 6.94. Selected monthly correlations: S&P-EAFE 0.84, S&P-EM 0.73, EAFE-EM 0.81,
S&P-UST -0.25, S&P-HY 0.65, S&P-HFRI 0.78, S&P-REIT 0.58, UST-IG 0.58.

## Sanity checks

- S&P 500 geometric return is 10.92%, inside the expected 10-11%.
- EAFE geometric return is 5.08%, inside the expected 5-6%.
- EM volatility (29.3%) is above developed markets (18.3%), as expected. It is higher than the monthly-based 22.4%
  because annual returns include two extreme years (1999 +66%, 2009 +79%), and calendar-year sampling with 30 points
  is noisy.
- Treasury volatility is 6.2% annual. That is slightly above the 4-6% guide. The monthly-annualised figure is 4.3%.
  The gap comes from 1995 (+18.4%) and 2022 (-12.5%) and from mild multi-month momentum in bond returns.
- HY correlation with US equities is 0.66, inside the expected 0.6-0.7.
- PE volatility (23%, beta-implied) is well above the reported 9.5% and the simple desmoothed 16.3%. Desmoothed NPI volatility (11.4%) is above the
  reported 8.0%.
- US equities vs EM annual correlation is 0.45, which looks low. The monthly figure over 1995-2020 is 0.73. Over
  1995-1998 and 2013-2015 the US rose while EM fell, so the annual correlation really is lower over this window. With 30
  observations its standard error is about 0.15.
- HFRI annual volatility (9.8%) is above the monthly-annualised 6.9%, because HFRI monthly returns are positively
  autocorrelated (lag-1 0.24, stale pricing). Annual sampling partly absorbs that.

## Judgement calls

1. **Private equity is not a computed series.** No calendar-year Cambridge Associates series could be read from this
   sandbox. Volatility and the equity correlation come from T. Rowe Price (2024). The return is the CA 25-year IRR to
   mid-2024. That window covers about 1999-2024, not 1995-2024. Including the late 1990s would probably raise the
   figure. Correlations other than with US equities use a one-factor assumption. Two cautions:
   - On these inputs PE dominates US equities: a higher return, lower volatility and correlation 0.80. An optimiser will
     load heavily on PE unless it is capped.
   - Couts, Goncalves and Rossi (RFS 2024) find that simple unsmoothing understates PE systematic risk. Their buyout
     beta is about 1.0. With a 0.80 correlation, that implies a PE volatility of about 18.3% / 0.80 = 23%.
   **Applied:** the site uses 23% (`PE_VOL_DESMOOTHED = 0.23`). With it PE no longer dominates US equities, and the
   site also caps PE at 20% of the portfolio.

   If an annual CA series becomes available (CA benchmark books list quarterly index returns since 1986), replace the
   construction with Geltner on that series.
2. **Real estate desmoothing is first order and annual.** It is the method the brief asked for, with
   rho = 0.339 estimated from the data. The annual NPI lags listed markets by about a year: corr(desmoothed NPI_t,
   S&P_{t-1}) = 0.52 and corr(NPI_t, REIT_{t-1}) = 0.58. A first-order filter does not remove that lag, so the
   contemporaneous correlations of real estate with equities (0.21) and credit (-0.15) are probably too low. The listed
   REIT cross-check has correlation 0.50 with US equities and 0.60 with HY.
   **Applied:** real estate correlations include the lag-1 cross-covariance (method step 5). That moves the real
   estate correlation with US equities from 0.21 to 0.74 and with HY from -0.15 to 0.53, in line with the view that
   private real estate is equity-like risk reported with a delay.
3. **The 2024 NPI figure is the Expanded NPI headline (0.59%).** NCREIF moved to the Expanded NPI in 2024, and the
   Classic NPI figure could not be confirmed. The 2016-2024 values are published NPI figures confirmed by secondary
   sources quoting NCREIF, mostly to one decimal.
4. **2021-2024 EAFE and EM values come from MSCI factsheets**, spliced onto the Bloomberg monthly file (1995-2020).
   Both are MSCI net USD series, so the splice is consistent.
5. **The HFRI vintage is January 2024**, and 2024 is HFR's January 2025 full-year figure (+9.8%). HFRI revises recent
   months for a few months after first publication. Hedge funds were not desmoothed: their annual lag-1
   autocorrelation is -0.12.
6. **Government bonds use the Bloomberg US Treasury index**, the broad Treasury market with duration of about 5-6
   years, not a 10-year bond. Damodaran's constant-maturity 10-year series has a 4.75% mean and is more volatile (9.45% annual) over the same window.
7. **Annual rather than monthly data.** Annual data was chosen so that all nine classes share one frequency and one
   window, and because appraisal-based series are not available monthly. Annual correlations from 30 points are noisy,
   so the monthly cross-check above should be read alongside them.
8. **Position caps on the site.** The frontier on the homepage holds every class between zero and a cap: private
   equity at most 20%, real estate, hedge funds and emerging markets at most 15% each. These are typical policy limits
   for illiquid or concentrated sleeves, not estimates. The caps live in `site/src/data/home.ts` and
   `site/scripts/frontier-points.ts`, which must agree (a unit test checks the shipped points against a fresh solve).

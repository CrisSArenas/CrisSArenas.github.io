/* Synthetic sleeve mandates for the Multi-Strategy Builder. Every manager and number is fictional.
   Written by hand as text, one excerpt per sleeve. The hand-set ground truth is in assets/data/msb-labels.js. */
window.MSB_DOCS = {
  'mandate-els': { title: 'Quillmere Equity Partners, sleeve mandate', kind: 'mandate', pages: [[
    '# Quillmere Equity Partners | Equity long/short sleeve mandate (excerpt)',
    'Fictional manager. Strategy: fundamental equity long/short, North America and Europe.',
    'Target volatility: 10% a year.',
    'Net equity beta: between 0.2 and 0.5.',
    'Factor exposures: no systematic style tilts; returns are expected to come from stock selection.',
    'Liquidity: quarterly, with 45 days notice.',
    'Fees: management fee 1.5% a year; performance fee 20% over a high-water mark, no hurdle.',
    'Expenses: borne by the manager, no pass-through.'
  ]] },
  'mandate-macro': { title: 'Tarsen Global Macro, sleeve mandate', kind: 'mandate', pages: [[
    '# Tarsen Global Macro | Global macro sleeve mandate (excerpt)',
    'Fictional manager. Strategy: discretionary global macro across rates, currencies and equity indices.',
    'Target volatility: 8% a year.',
    'Rates beta (duration): between -0.5 and 0.5.',
    'Trend exposure: discretionary positions only; no systematic trend following or momentum overlay.',
    'Liquidity: monthly, with 30 days notice.',
    'Fees: management fee 2.0% a year; performance fee 20% over a high-water mark, no hurdle.',
    'Expenses: borne by the manager, no pass-through.'
  ]] },
  'mandate-rv': { title: 'Brennoch Relative Value, sleeve mandate', kind: 'mandate', pages: [[
    '# Brennoch Relative Value | Relative value sleeve mandate (excerpt)',
    'Fictional manager. Strategy: fixed income and capital structure relative value.',
    'Target volatility: 5% a year.',
    'Rates beta (duration): neutral, between -0.1 and 0.1.',
    'Net equity beta: between -0.1 and 0.1.',
    'Liquidity: quarterly, with 60 days notice.',
    'Fees: management fee 0% a year; performance fee 20% over a high-water mark, no hurdle.',
    'Expenses: pass-through, estimated at 3.5% of NAV a year (staff, data, technology and financing).'
  ]] },
  'mandate-credit': { title: 'Ostvale Credit, sleeve mandate', kind: 'mandate', pages: [[
    '# Ostvale Credit | Credit sleeve mandate (excerpt)',
    'Fictional manager. Strategy: long-biased corporate credit, high yield and loans.',
    'Target volatility: 6% a year.',
    'Credit spread beta: between 0.4 and 0.8.',
    'Net equity beta: below 0.2.',
    'Liquidity: quarterly, with 90 days notice.',
    'Fees: management fee 1.25% a year; performance fee 15% over a hurdle of 5% a year.',
    'Expenses: borne by the manager, no pass-through.'
  ]] },
  'mandate-quant': { title: 'Veyl Systematic, sleeve mandate', kind: 'mandate', pages: [[
    '# Veyl Systematic | Quant sleeve mandate (excerpt)',
    'Fictional manager. Strategy: systematic equity market neutral, multi-factor.',
    'Target volatility: 8% a year.',
    'Factor exposures: momentum, value and quality, rebalanced monthly; net equity beta near zero.',
    'Net equity beta: between -0.1 and 0.1.',
    'Liquidity: monthly, with 30 days notice.',
    'Fees: management fee 1.0% a year; performance fee 20% over a high-water mark, no hurdle.',
    'Expenses: pass-through, estimated at 1.5% of NAV a year (data and technology).'
  ]] }
};

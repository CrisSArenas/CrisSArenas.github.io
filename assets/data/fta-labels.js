/* Hand-labeled ground truth for the Fund Terms Auditor documents (assets/data/fta-docs.js), kept apart
   from the documents and the page code. How the labels were set: each value
   was read by hand from the document text at the page and line given. Rates as decimals, money in
   $ millions, LP share unless the line says fund level. The correct figures under `issues` were worked
   by hand from the LPA terms and the report lines, not by the page's code. Nothing here is generated. */
window.FTA_LABELS = {
  fields: {
    'lpa': {
      commitments: { value: 1200, page: 1, line: 2, how: 'read: Total commitments: $1,200 million' },
      feeIP: { value: 0.02, page: 1, line: 5, how: 'read: 2.0% of total Commitments during the Investment Period' },
      feePost: { value: 0.015, page: 1, line: 6, how: 'read: 1.5% of Net Invested Capital after it' },
      feeBasisPost: { value: 'net invested capital', page: 1, line: 6, how: 'read: of Net Invested Capital' },
      ipYears: { value: 5, page: 1, line: 9, how: 'read: ends on the fifth anniversary of the Initial Closing Date' },
      offsetPct: { value: 1.0, page: 1, line: 12, how: 'read: reduced by 100% of the Partnership\'s share' },
      waterfall: { value: 'european', page: 2, line: 1, how: 'read: whole-fund waterfall' },
      pref: { value: 0.08, page: 2, line: 4, how: 'read: preferred return of 8%' },
      catchUp: { value: 1.0, page: 2, line: 6, how: 'read: 100% to the General Partner (full catch-up)' },
      carry: { value: 0.20, page: 2, line: 6, how: 'read: until it has received 20%' }
    },
    'rpt-q3-2025': {
      nic: { value: 765, page: 1, line: 6, how: 'read: $765,000,000 (fund level)' },
      gross: { value: 0.16875, page: 1, line: 7, how: 'read: $168,750' },
      portfolioFees: { value: 1.6, page: 1, line: 8, how: 'read: $1,600,000 (fund level)' },
      offset: { value: 0.06, page: 1, line: 9, how: 'read: ($60,000)' },
      net: { value: 0.10875, page: 1, line: 10, how: 'read: $108,750' }
    },
    'rpt-q4-2025': {
      nic: { value: 765, page: 1, line: 6, how: 'read: $765,000,000 (fund level)' },
      gross: { value: 0.107578, page: 1, line: 7, how: 'read: $107,578' },
      portfolioFees: { value: 0.9, page: 1, line: 8, how: 'read: $900,000 (fund level)' },
      offset: { value: 0.03375, page: 1, line: 9, how: 'read: ($33,750)' },
      net: { value: 0.073828, page: 1, line: 10, how: 'read: $73,828' }
    },
    'rpt-q1-2026': {
      nic: { value: 670, page: 1, line: 6, how: 'read: $670,000,000 (fund level)' },
      gross: { value: 0.094219, page: 1, line: 7, how: 'read: $94,219' },
      portfolioFees: { value: 2.8, page: 1, line: 8, how: 'read: $2,800,000 (fund level)' },
      offset: { value: 0.047109, page: 1, line: 9, how: 'read: ($47,109)' },
      net: { value: 0.04711, page: 1, line: 10, how: 'read: $47,110' }
    },
    'rpt-q2-2026': {
      nic: { value: 600, page: 1, line: 6, how: 'read: $600,000,000 (fund level)' },
      gross: { value: 0.084375, page: 1, line: 7, how: 'read: $84,375' },
      portfolioFees: { value: 0.6, page: 1, line: 8, how: 'read: $600,000 (fund level)' },
      offset: { value: 0.0225, page: 1, line: 9, how: 'read: ($22,500)' },
      net: { value: 0.061875, page: 1, line: 10, how: 'read: $61,875' },
      contributions: { value: 44.631563, page: 1, line: 16, how: 'read: $44,631,563' },
      distributions: { value: 25.875, page: 1, line: 17, how: 'read: $25,875,000' },
      nav: { value: 24.9375, page: 1, line: 18, how: 'read: $24,937,500 before accrued carry' },
      accruedCarry: { value: 1.236187, page: 1, line: 21, how: 'read: $1,236,187' },
      netIrr: { value: 0.033, page: 1, line: 25, how: 'read: Net IRR 3.3%' },
      netTvpi: { value: 1.11, page: 1, line: 25, how: 'read: Net TVPI 1.11x' },
      dpi: { value: 0.58, page: 1, line: 25, how: 'read: DPI 0.58x' }
    }
  },
  kinds: { 'lpa': 'lpa', 'rpt-q3-2025': 'report', 'rpt-q4-2025': 'report', 'rpt-q1-2026': 'report', 'rpt-q2-2026': 'report' },
  /* planted breaks, and every other check that should stay quiet. Worked by hand. */
  issues: {
    'fee:rpt-q3-2025': { seeded: true, correct: 0.107578, how: 'planted: the investment period ended 15 Oct 2024, so the fee is 1.5% x $765m / 4 x 3.75% = $107,578; the report charges 1.5% x $1,200m / 4 x 3.75% = $168,750, the post-period rate on commitments' },
    'fee:rpt-q4-2025': { seeded: false, correct: 0.107578, how: '1.5% x $765m / 4 x 3.75% = $107,578, ties' },
    'fee:rpt-q1-2026': { seeded: false, correct: 0.094219, how: '1.5% x $670m / 4 x 3.75% = $94,219, ties' },
    'fee:rpt-q2-2026': { seeded: false, correct: 0.084375, how: '1.5% x $600m / 4 x 3.75% = $84,375, ties' },
    'offset:rpt-q3-2025': { seeded: false, correct: 0.06, how: '100% x $1.6m x 3.75% = $60,000, ties' },
    'offset:rpt-q4-2025': { seeded: false, correct: 0.03375, how: '100% x $0.9m x 3.75% = $33,750, ties' },
    'offset:rpt-q1-2026': { seeded: true, correct: 0.094219, how: 'planted: 100% x $2.8m x 3.75% = $105,000, capped at the gross fee of $94,219; the report offsets only half, $47,109' },
    'offset:rpt-q2-2026': { seeded: false, correct: 0.0225, how: '100% x $0.6m x 3.75% = $22,500, ties' },
    'nic:rpt-q3-2025': { seeded: false, how: 'cost of unrealized deals at 1 Jul 2025 in the cash flow ledger: $765m, ties' },
    'nic:rpt-q4-2025': { seeded: false, how: '$765m at 1 Oct 2025, ties' },
    'nic:rpt-q1-2026': { seeded: false, how: '$670m at 1 Jan 2026 after the December 2025 exit, ties' },
    'nic:rpt-q2-2026': { seeded: false, how: '$600m at 1 Apr 2026 after the March 2026 exit, ties' },
    'carry:rpt-q2-2026': { seeded: true, correct: 0, how: 'planted: the report accrues 20% of all net gains ($6.18m x 20% = $1,236,187) with no preferred return. Under the whole-fund waterfall LPs have $50.81m of value on $44.63m contributed, short of capital plus the 8% preferred return, so nothing is due to the GP' },
    'perf:rpt-q2-2026': { seeded: false, how: 'the GP\'s 1.11x net TVPI and 0.58x DPI tie to its own contributions, distributions, NAV and accrued carry; the number is consistent with the wrong carry, not a separate error' }
  }
};

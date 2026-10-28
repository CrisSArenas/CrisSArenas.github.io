// Run every math test from Node against the same files the browser loads.
// Usage: node tests/run.js [filter]
global.window = undefined;
const PM = require('../assets/js/pm-math.js');
globalThis.PM = PM;
const T = require('../assets/js/pm-tests.js');
const r = T.run(process.argv[2]);
let group = '';
for (const x of r.results) {
  if (x.group !== group) { group = x.group; console.log('\n' + group); }
  console.log(`  ${x.ok ? 'pass' : 'FAIL'}  ${x.name}${x.ok ? '' : '\n        ' + x.error}`);
}
console.log(`\n${r.passed} of ${r.total} passed`);
process.exit(r.failed ? 1 : 0);

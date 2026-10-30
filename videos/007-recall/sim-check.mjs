// Print the episode 07 memory experiment (the numbers the film uses).
//   node videos/007-recall/sim-check.mjs
import { runMemory, recall, TEST_DAY, N_WORDS } from './sim.js';

const res = runMemory();
for (const r of res) {
  const on = (d) => r.onAt(d);
  console.log(
    `${r.key} ${r.name.padEnd(8)} days ${r.days.join(',').padEnd(10)} kept ${r.kept}/${N_WORDS} on day ${TEST_DAY} ` +
      `(expected ${r.expected.toFixed(1)}), lapses at reviews ${r.lapses}, median stability ${r.medianS.toFixed(1)} d; ` +
      `still on just before day 1 / 7 / 15 / 30: ${on(0.999)} / ${on(6.999)} / ${on(14.999)} / ${on(29.999)}`,
  );
}
// The test must agree with the picture: a word counted as kept is lit on day 30.
for (const r of res) {
  const mism = r.words.filter((x) => x.remembered !== (x.periods.at(-1).u < recall(TEST_DAY - x.periods.at(-1).day, x.periods.at(-1).S))).length;
  console.log(`${r.key}: picture vs test mismatches ${mism}`);
}
console.log('check: R(S, S) =', recall(5, 5).toFixed(4), '(must be 0.9)');

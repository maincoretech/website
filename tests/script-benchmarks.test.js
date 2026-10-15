import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const evidence = JSON.parse(readFileSync(new URL('../static/benchmarks/script-comparison.json', import.meta.url), 'utf8'));
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

test('published script measurements reconcile with all independent process samples', () => {
  assert.equal(evidence.results.length, 8);
  for (const result of evidence.results) {
    assert.equal(result.raw_files.length, 3);
    const processMedians = result.raw_files.map(file => {
      const raw = evidence.raw_samples[file].find(row => row.stage === result.stage);
      assert.equal(raw.engine, result.engine);
      assert.equal(raw.actions ?? raw.units, result.units);
      assert.equal(raw.samples_ns.length, 10);
      assert(raw.samples_ns.every(value => Number.isFinite(value) && value > 0));
      return median(raw.samples_ns) / 1e6;
    });
    assert.deepEqual(result.process_medians_ms, processMedians);
    assert.equal(result.median_ms, median(processMedians));
    assert.deepEqual(result.process_range_ms, [Math.min(...processMedians), Math.max(...processMedians)]);
  }
});

test('cross-parser comparison contains only matching text counts and parse stages', () => {
  for (const count of [10000, 100000]) {
    const rows = evidence.results.filter(row => row.stage === 'parse' && row.units === count);
    assert.deepEqual(rows.map(row => row.engine).sort(), ['keine', 'tyranoscript']);
    assert(rows.every(row => row.unit === 'text_records'));
    for (const row of rows) for (const file of row.raw_files) {
      assert.equal(evidence.raw_samples[file].find(sample => sample.stage === 'parse').validated_all_texts, true);
    }
  }
  assert(evidence.results.filter(row => row.stage.startsWith('core_')).every(row => row.engine === 'keine'));
});

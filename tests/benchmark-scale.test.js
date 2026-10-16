import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonScale, rankedMeasurements } from '../src/lib/site/benchmark-scale.js';
const rows = values => values.map(value => ({ value }));

test('ranking is ascending, preserves ties and inputs, and omits missing values', () => {
  const input = rows([8, 2, null, 2, NaN, 0, -1]);
  const before = structuredClone(input);
  assert.deepEqual(rankedMeasurements(input).map(({ value, rank }) => [value, rank]), [[0, 1], [2, 2], [2, 2], [8, 4]]);
  assert.deepEqual(input, before);
});

test('ordinary ranges stay linear and extremes compress without changing data', () => {
  const ordinary = comparisonScale(rows([1, 10]));
  assert.equal(ordinary.compressed, false);
  assert.equal(ordinary.percent(1), 10);
  const input = rows([0, .01, .1, 1, 130]);
  const before = structuredClone(input);
  const scale = comparisonScale(input);
  assert.equal(scale.compressed, true);
  assert.equal(scale.percent(0), 0);
  assert.equal(scale.percent(130), 100);
  assert.ok(scale.percent(.01) > 7);
  const widths = input.map(row => scale.percent(row.value));
  assert.ok(widths.every((value, i) => i === 0 || value > widths[i - 1]));
  assert.deepEqual(input, before);
});

test('threshold, linear override and unit conversion are deterministic', () => {
  assert.equal(comparisonScale(rows([1, 19.99])).compressed, false);
  assert.equal(comparisonScale(rows([1, 20])).compressed, true);
  const scale = comparisonScale(rows([.01, 130]), true);
  assert.equal(scale.compressed, false);
  assert.equal(scale.percent(.01), 100 * .01 / 130);
  assert.equal(comparisonScale(rows([.01, 130])).percent(.01), comparisonScale(rows([10, 130000])).percent(10));
});

test('empty, missing, zero and equal values remain finite without invented lengths', () => {
  for (const values of [[], [null, undefined, NaN, Infinity, -1], [0, 0], [5, 5]]) {
    const scale = comparisonScale(rows(values));
    assert.equal(scale.compressed, false);
    assert.equal(scale.percent(0), 0);
    assert.equal(scale.percent(null), 0);
    assert.ok(Number.isFinite(scale.percent(5)));
  }
});

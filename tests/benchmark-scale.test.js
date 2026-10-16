import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonScale, comparisonSeries, seriesMeasurements } from '../src/lib/site/benchmark-scale.js';
const rows = values => values.map(value => ({ value }));

test('shared legend deduplicates identities and preserves first-seen order', () => {
  const input = [{ rows: [
    { id: 'a', label: 'A', pattern: 'dots', value: 8 },
    { id: 'b', label: 'B', value: 2 },
    { id: 'missing', value: null },
  ] }, { rows: [
    { id: 'b', label: 'B', value: 0 },
    { id: 'c', label: 'C', value: 2 },
    { id: 'invalid', value: -1 },
  ] }];
  const before = structuredClone(input);
  const series = comparisonSeries(input);
  assert.deepEqual(series.map(row => row.id), ['a', 'b', 'c']);
  assert.equal(series[0].pattern, 'dots');
  assert.deepEqual(input, before);
});

test('metrics follow shared identity order without inventing missing values or ranks', () => {
  const series = ['a', 'b', 'c'].map(id => ({ id }));
  const input = [{ id: 'c', value: 2 }, { id: 'b', value: NaN }, { id: 'a', value: 0 }];
  const before = structuredClone(input);
  assert.deepEqual(seriesMeasurements(input, series), [{ id: 'a', value: 0 }, { id: 'c', value: 2 }]);
  assert.deepEqual(input, before);
  assert.deepEqual(seriesMeasurements([{ id: 'c', value: 8 }, { id: 'a', value: 8 }], series).map(row => row.id), ['a', 'c']);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archiveCharts, nativeCharts, embeddedCharts } from '../src/lib/site/benchmark-data.js';

const raw = file => readFileSync(new URL(`../static/benchmarks/${file}.json`, import.meta.url), 'utf8');
const archives = JSON.parse(raw('resource-archives'));
const native = JSON.parse(raw('webgalk-native'));
// Independent recomputation of the published aggregate, not the UI helper.
const mid = values => { const a = values.toSorted((a, b) => a - b); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };

test('all nine resource variants retain three validated equal-payload process runs', () => {
  assert.equal(archives.rows.length, 9);
  assert.equal(new Set(archives.rows.map(row => row.id)).size, 9);
  for (const row of archives.rows) {
    assert.equal(row.runs.length, 3);
    for (const run of row.runs) {
      assert.equal(run.files, 624);
      assert.equal(run.verified_files, 624);
      assert.equal(run.raw_bytes, 28 * 1024 * 1024);
      assert.equal(run.verified_ranges ?? run.verified_random_full_files, 2000);
    }
  }
});

test('archive aggregates, first trajectories and ranges reconcile with raw samples', () => {
  for (const row of archives.rows) {
    for (const key of ['open_ms', 'sequential_ms', 'random_2000_4k_ms', 'random_2000_full_file_ms']) {
      if (row.metrics[key] === null) { assert(row.runs.every(run => run[key] === undefined)); continue; }
      const values = row.runs.map(run => { assert.equal(run[key].length, 10); assert(run[key].every(v => Number.isFinite(v) && v > 0)); return mid(run[key]); });
      assert.deepEqual(row.metrics[key].process_values, values);
      assert.equal(row.metrics[key].median, mid(values));
      assert.deepEqual(row.metrics[key].range, [Math.min(...values), Math.max(...values)]);
    }
    assert.equal(row.metrics.archive_mib.median, mid(row.runs.map(run => run.archive_bytes)) / 1048576);
    if (row.metrics.first_2000_4k_ms) assert.equal(row.metrics.first_2000_4k_ms.median, mid(row.runs.map(run => run.random_2000_4k_ms[0])));
  }
});

test('charts exclude unavailable metrics and keep full-file and range workloads separate', () => {
  const charts = archiveCharts(archives);
  charts.primary.forEach(chart => assert.equal(chart.rows.length, 9));
  charts.range.forEach(chart => { assert.equal(chart.rows.length, 7); assert(chart.rows.every(row => !['suika-arc', 'ons-nsa'].includes(row.id))); });
  assert.deepEqual(charts.full[0].rows.map(row => row.id), ['suika-arc', 'ons-nsa']);
  assert(archives.rows.filter(row => row.metrics.pack_ms === null).every(row => ['letsgal-lgpak', 'ons-nsa'].includes(row.id)));
  assert.equal(archives.coverage.length, 2);
  assert(archives.coverage.every(entry => entry.status.startsWith('未测')));
});

test('native aggregates use exactly the accepted foreground and audio samples', () => {
  assert.equal(native.workloads.length, 4);
  for (const row of native.workloads) {
    assert.equal(row.samples.length, 18);
    assert(row.samples.every(sample => sample.foreground));
    assert.equal(row.samples.filter(sample => sample.audio_active).length, ['audio', 'mix'].includes(row.name) ? 18 : 0);
    const groups = [0, 1, 2].map(window => row.samples.filter(sample => sample.window === window));
    assert(groups.every(group => group.length === 6));
    assert.equal(row.cpu_percent, mid(groups.map(group => group.reduce((s, row) => s + row.cpu_percent, 0) / 6)));
    assert.equal(row.rss_mib, mid(groups.map(group => mid(group.map(row => row.rss_mib)))));
  }
  assert.deepEqual(nativeCharts(native).map(chart => chart.id), ['cpu_percent', 'rss_mib']);
  assert.equal(native.tests.regression_failed, 2);
  assert(native.unavailable.frame_time);
});

test('embedded legacy reader remains separate from the current archive reader', () => {
  assert.equal(native.embedded.length, 4);
  for (const chart of embeddedCharts(native)) assert.equal(chart.rows.length, 4);
  assert.equal(archives.rows.filter(row => row.id.startsWith('embedded-')).length, 0);
});

test('public evidence omits local home paths and benchmark key material', () => {
  for (const file of ['resource-archives', 'webgalk-native']) {
    const text = raw(file);
    assert(!text.includes('/Users/'));
    assert(!/"(?:cek|root_key|private_key|pids)"\s*:/.test(text));
  }
});

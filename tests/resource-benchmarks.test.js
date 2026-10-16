import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { archiveCharts, nativeCharts, embeddedCharts } from '../src/lib/site/benchmark-data.js';

const raw = file => readFileSync(new URL(`../static/benchmarks/${file}.json`, import.meta.url), 'utf8');
const archives = JSON.parse(raw('resource-archives'));
const native = JSON.parse(raw('webgalk-native'));
// Independent recomputation of the published aggregate, not the UI helper.
const mid = values => { const a = values.toSorted((a, b) => a - b); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };

test('checked-in measurement harness matches the published source fingerprint', () => {
  const source = readFileSync(new URL('../scripts/benchmarks/encrypted-fair.rs', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), archives.provenance['archive-probe/src/bin/encrypted-fair.rs']);
});

test('only encrypted variants are published, with three validated equal-payload runs', () => {
  assert.deepEqual(archives.rows.map(row => row.id).sort(), ['hakutaku', 'hexz-lz4-encrypted', 'hexz-zstd-encrypted']);
  assert.deepEqual(archives.references.map(row => row.id), ['letsgal-lgpak']);
  for (const row of [...archives.rows, ...archives.references]) {
    assert.equal(row.encrypted, true);
    assert.equal(row.runs.length, 3);
    for (const run of row.runs) {
      assert.equal(run.files, 624);
      assert.equal(run.verified_files, 624);
      assert.equal(run.raw_bytes, 28 * 1024 * 1024);
      assert.equal(run.verified_ranges ?? run.verified_random_full_files, 2000);
    }
  }
});

test('archive aggregates and ranges reconcile with raw samples', () => {
  for (const row of [...archives.rows, ...archives.references]) {
    const keys = row.id === 'letsgal-lgpak' ? ['open_ms', 'sequential_ms', 'random_2000_4k_ms'] : ['sequential_fresh_ms', 'random_fresh_2000_4k_ms', 'random_reused_2000_4k_ms'];
    for (const key of keys) {
      const values = row.runs.map(run => { assert.equal(run[key].length, 10); assert(run[key].every(v => Number.isFinite(v) && v > 0)); return mid(run[key]); });
      assert.deepEqual(row.metrics[key].process_values, values);
      assert.equal(row.metrics[key].median, mid(values));
      assert.deepEqual(row.metrics[key].range, [Math.min(...values), Math.max(...values)]);
    }
    assert.equal(row.metrics.archive_mib.median, mid(row.runs.map(run => run.archive_bytes)) / 1048576);
    if (row.metrics.first_2000_4k_ms) assert.equal(row.metrics.first_2000_4k_ms.median, mid(row.runs.map(run => run.random_2000_4k_ms[0])));
  }
});

test('controlled charts exclude plaintext, whole-memory reference and unequal opening work', () => {
  const original = structuredClone(archives);
  const charts = archiveCharts(archives);
  assert.deepEqual(charts.primary.map(chart => chart.id), ['archive_mib', 'sequential_fresh_ms']);
  assert.deepEqual(charts.range.map(chart => chart.id), ['random_fresh_2000_4k_ms', 'random_reused_2000_4k_ms']);
  [...charts.primary, ...charts.range].forEach(chart => {
    assert.equal(chart.rows.length, 3);
    assert.deepEqual(chart.rows.map(row => row.id), ['hakutaku', 'hexz-zstd-encrypted', 'hexz-lz4-encrypted']);
    for (const row of chart.rows) assert.equal(row.value, archives.rows.find(source => source.id === row.id).metrics[chart.id].median);
    assert(chart.rows.every(row => row.id !== 'letsgal-lgpak'));
  });
  assert.equal(archives.coverage.length, 2);
  assert(archives.coverage.every(entry => entry.status.startsWith('未测')));
  assert.deepEqual(archives, original);
});

test('controlled runs use matched nominal budgets, explicit reuse warm-up and rotated orders', () => {
  for (const row of archives.rows) {
    assert.deepEqual(row.runs.map(run => run.process), [1, 2, 3]);
    assert.deepEqual(row.runs.map(run => run.position).sort(), [0, 1, 2]);
    for (const run of row.runs) {
      assert.equal(run.cache_payload_budget_bytes, 64 * 1024 * 1024);
      assert.equal(run.prefetch, false);
      assert.equal(run.reused_warmup_rounds, 1);
      assert.equal(run.encrypted, true);
      assert.equal(run.open_ms, undefined);
    }
  }
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
  assert.equal(native.embedded.length, 2);
  assert(native.embedded.every(row => row.variant.endsWith('/true')));
  for (const chart of embeddedCharts(native)) assert.equal(chart.rows.length, 2);
  assert.equal(archives.rows.filter(row => row.id.startsWith('embedded-')).length, 0);
});

test('public evidence omits local home paths and benchmark key material', () => {
  for (const file of ['resource-archives', 'webgalk-native']) {
    const text = raw(file);
    assert(!text.includes('/Users/'));
    assert(!/"(?:cek|root_key|private_key|pids)"\s*:/.test(text));
    assert(!/"encrypted"\s*:\s*false/.test(text));
    assert(!/"variant"\s*:\s*"[^"]*\/false"/.test(text));
    assert(!/"id"\s*:\s*"(?:[^"\n]*-plain|renpy-rpa|suika-arc|ons-nsa)"/.test(text));
  }
});

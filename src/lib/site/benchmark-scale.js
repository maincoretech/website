// One identity/order per comparison group, independent of metric values.
export function comparisonSeries(charts) {
  const series = new Map();
  for (const chart of charts) {
    for (const row of chart.rows) {
      if (!Number.isFinite(row.value) || row.value < 0 || series.has(row.id)) continue;
      const { id, label, compactLabel, pattern } = row;
      series.set(id, { id, label, compactLabel, pattern });
    }
  }
  return [...series.values()];
}

export function seriesMeasurements(rows, series) {
  const values = new Map(rows.filter(row => Number.isFinite(row.value) && row.value >= 0).map(row => [row.id, row]));
  return series.flatMap(item => values.has(item.id) ? [{ ...values.get(item.id) }] : []);
}

// log1p retains a real zero and is invariant to unit changes when scaled by the
// smallest positive value. It never changes the underlying measurements.
export function comparisonScale(rows, forceLinear = false) {
  const values = rows.map(row => row.value).filter(value => Number.isFinite(value) && value >= 0);
  const positive = values.filter(value => value > 0);
  const max = Math.max(0, ...values);
  const min = positive.length ? Math.min(...positive) : 0;
  const compressible = min > 0 && max / min >= 20;
  const compressed = compressible && !forceLinear;
  return {
    max, compressible, compressed,
    percent(value) {
      if (!Number.isFinite(value) || value <= 0 || max === 0) return 0;
      const bounded = Math.min(value, max);
      return 100 * (compressed ? Math.log1p(bounded / min) / Math.log1p(max / min) : bounded / max);
    }
  };
}

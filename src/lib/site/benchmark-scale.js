// Presentation only: keep measurements and ordering unchanged. log1p retains
// a real zero and is invariant to unit changes when scaled by the smallest value.
export function rankedMeasurements(rows) {
  const sorted = rows.filter(row => Number.isFinite(row.value) && row.value >= 0)
    .map(row => ({ ...row })).sort((a, b) => a.value - b.value);
  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row.value !== sorted[index - 1].value) rank = index + 1;
    return { ...row, rank };
  });
}

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

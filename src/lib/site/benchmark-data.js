export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const range = metric => metric.range.map(value => value.toFixed(3)).join('–');
const archiveChart = (evidence, id, label, unit = 'ms', digits = 2) => ({
  id, label, unit, digits,
  rows: evidence.rows.filter(row => Number.isFinite(row.metrics[id]?.median)).map(row => ({
    id: row.id, label: row.label, version: row.version, pattern: row.pattern,
    value: row.metrics[id].median,
    detail: `${row.protection} · 进程统计范围 ${range(row.metrics[id])} ${unit} · ${row.note}`
  }))
});

export function archiveCharts(evidence) {
  return {
    primary: [
      archiveChart(evidence, 'archive_mib', '资源包体积', 'MiB'),
      archiveChart(evidence, 'open_ms', '原生打开耗时'),
      archiveChart(evidence, 'sequential_ms', '28 MiB 完整读取')
    ],
    range: [
      archiveChart(evidence, 'first_2000_4k_ms', '2000 × 4 KiB · 首次轨迹'),
      archiveChart(evidence, 'random_2000_4k_ms', '2000 × 4 KiB · 十轮中位数')
    ],
    full: [archiveChart(evidence, 'random_2000_full_file_ms', '2000 次随机整文件读取')]
  };
}

export function nativeCharts(evidence) {
  const labels = { idle: '静态对白', motion: '连续位移', audio: 'BGM', mix: 'BGM + 环境音' };
  const patterns = { idle: 'solid', motion: 'diagonal', audio: 'dots', mix: 'cross' };
  return [
    { id: 'cpu_percent', label: '进程组 CPU', unit: '%', digits: 2 },
    { id: 'rss_mib', label: '进程组内存', unit: 'MiB', digits: 1 }
  ].map(chart => ({ ...chart, rows: evidence.workloads.map(row => ({
    id: row.name, label: labels[row.name], value: row[chart.id], version: evidence.version,
    pattern: patterns[row.name], detail: '独立场景补测 · 非因果增量比较'
  })) }));
}

export function embeddedCharts(evidence) {
  const definitions = [
    { id: 'open_ms', label: '内置 hexz · 打开', unit: 'ms', digits: 2 },
    { id: 'sequential_ms', label: '内置 hexz · 28 MiB 完整读取', unit: 'ms', digits: 2 },
    { id: 'random_2000_full_file_ms', label: '内置 hexz · 2000 次整文件读取', unit: 'ms', digits: 2 }
  ];
  return definitions.map(chart => ({ ...chart, rows: evidence.embedded.map((row, i) => {
    const [, codec, encrypted] = row.variant.split('/');
    return {
      id: `embedded-${i}`, label: `${codec.toUpperCase()} · ${encrypted === 'true' ? '密码加密' : '明文'}`,
      version: 'WebGAL_k 内置读器 · Rust 1.96 opt-level=z', value: row.metrics[chart.id].median,
      pattern: ['solid', 'dots', 'diagonal', 'cross'][i], detail: encrypted === 'true' ? '打开耗时包含密码派生' : '不含密码派生'
    };
  }) }));
}

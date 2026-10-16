<script>
  import comparison from '../../../static/posts/keine-tday/summary.json';
  import evidence from '../../../static/benchmarks/preview-highlights.json';
  import { comparisonScale, rankedMeasurements } from './benchmark-scale.js';

  // Tone follows length order; a stable texture identifies each engine across metrics.
  const tones = ['#466170', '#577482', '#698895', '#7e9da9', '#96b3be', '#afcbd5', '#c9e2eb'];
  const patterns = { keine: 'solid', renpy: 'dots', suika: 'diagonal', webgal: 'horizontal', tyrano: 'dashes', letsgal: 'cross', onscripter: 'vertical' };
  const tone = (index, count) => tones[Math.round(index / Math.max(1, count - 1) * (tones.length - 1))];
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const runtimeCharts = [
    { id: 'cpu', label: '静态 CPU', unit: '%', digits: 2, rows: comparison.engines.map(e => ({ ...e, value: e.workloads.idle.cpu_percent })) },
    { id: 'rss', label: '静态内存', unit: 'MiB', digits: 1, rows: comparison.engines.map(e => ({ ...e, value: e.workloads.idle.rss_mib })) },
    { id: 'frame', label: '动态帧间隔 P95（Metal）', unit: 'ms', digits: 2, rows: [
      { id: 'keine', label: 'Kēne', version: evidence.keine.version, value: evidence.keine.motion_frame_p95_ms },
      { id: 'suika', label: 'Suika3', version: '26.07.13', value: median(evidence.keine.comparison.suika_metal_p95_ms) }
    ] }
  ];
  let { data = runtimeCharts, label = '同机引擎检查点对比', columns = 3 } = $props();
  let linearCharts = $state([]);
  const charts = $derived(data.map(chart => {
    const rows = rankedMeasurements(chart.rows);
    return { ...chart, scale: comparisonScale(rows, linearCharts.includes(chart.id)), rows };
  }));
  const valueLabel = (chart, row) => `${row.value.toFixed(chart.digits)} ${chart.unit}`;
  const shortLabel = row => row.label.replaceAll(' · ', ' ').replace('密码加密', '加密');
</script>

<div class="benchmark-comparison" aria-label={label}>
  <div class="comparison-columns" style:--columns={Math.min(columns, 2)}>
    {#each charts as chart}
      <figure>
        <figcaption>
          <span class="comparison-title">{chart.label}</span>
          <span class="comparison-direction">↓ 越低越好</span>
          <span class="comparison-scale">0 — {chart.scale.max.toFixed(chart.digits)} {chart.unit}
            {#if chart.scale.compressible}
              · {chart.scale.compressed ? '对数压缩 · 非线性' : '线性刻度'}
              <button type="button" class="scale-toggle"
                aria-label={`${chart.label}：切换为${chart.scale.compressed ? '线性刻度' : '对数压缩'}`}
                onclick={() => linearCharts = chart.scale.compressed ? [...linearCharts, chart.id] : linearCharts.filter(id => id !== chart.id)}
              >{chart.scale.compressed ? '切回线性' : '压缩显示'}</button>
            {/if}
          </span>
        </figcaption>
        <ol class="comparison-ranking" style:--count={chart.rows.length} aria-label={`${chart.label}，按实测值从低到高排列`}>
          {#each chart.rows as row, index}
            <li class="comparison-item" style:--amount={`${chart.scale.percent(row.value)}%`}
              aria-label={`第 ${row.rank} 位，${row.label} ${row.version}，${valueLabel(chart, row)}${row.detail ? `，${row.detail}` : ''}`}>
              <span class="rank-label" aria-hidden="true"><span class="rank-number">{row.rank.toString().padStart(2, '0')}</span>{shortLabel(row)}</span>
              <span class="rank-value" aria-hidden="true">{row.value.toFixed(chart.digits)}<small>{chart.unit}</small></span>
              <span class="rank-track" aria-hidden="true"><span class="comparison-fill" data-pattern={row.pattern ?? patterns[row.id] ?? 'solid'} style:--bar-tone={tone(chart.rows.length - 1 - index, chart.rows.length)}></span></span>
            </li>
          {/each}
        </ol>
      </figure>
    {/each}
  </div>
</div>

<style>
  .benchmark-comparison { margin: 14px 0 10px; }
  .comparison-columns { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 16px; }
  figure { margin: 0; min-width: 0; container-type: inline-size; }
  figcaption { color: #afc6d3; font: .74rem/1.5 var(--f-b); margin-bottom: 4px; }
  .comparison-title { display: block; }
  .comparison-direction { display: block; color: #abc3cf; font-size: .68rem; }
  .comparison-scale { display: block; color: #879ba8; font-size: .64rem; }
  .scale-toggle { margin-left: 6px; padding: 2px 4px; border: 0; background: transparent; color: #afc6d3; font: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .scale-toggle:hover { background: rgb(160 170 180 / 12%); }
  .comparison-ranking { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
  .comparison-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 8px; color: #b7ccd8; font: .72rem/1.4 var(--f-b); }
  .rank-label { min-width: 0; overflow-wrap: anywhere; }
  .rank-number { display: inline-block; min-width: 23px; color: #809aa8; font-variant-numeric: tabular-nums; }
  .rank-value { white-space: nowrap; font-variant-numeric: tabular-nums; color: #c9e2eb; }
  .rank-value small { margin-left: 4px; color: #8fa6b2; font-size: .85em; }
  .rank-track { grid-column: 1 / -1; display: block; height: 4px; margin-left: 23px; background: rgb(100 133 150 / 10%); }
  .comparison-fill { display: block; width: var(--amount); height: 100%; }
  [data-pattern] { --pattern-ink: rgb(7 15 20 / 85%); background-color: var(--bar-tone); }
  [data-pattern='dots'] { background-image: radial-gradient(circle, var(--pattern-ink) 1.5px, transparent 1.7px); background-size: 6px 6px; }
  [data-pattern='diagonal'] { background-image: repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  [data-pattern='horizontal'] { background-image: repeating-linear-gradient(0deg, var(--pattern-ink) 0 2px, transparent 2px 6px); }
  [data-pattern='dashes'] { background-image: radial-gradient(ellipse 3px 1px, var(--pattern-ink) 95%, transparent); background-size: 9px 6px; }
  [data-pattern='cross'] { background-image: repeating-linear-gradient(45deg, var(--pattern-ink) 0 2px, transparent 2px 9px), repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 9px); }
  [data-pattern='vertical'] { background-image: repeating-linear-gradient(90deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  [data-pattern='grid'] { background-image: repeating-linear-gradient(90deg, var(--pattern-ink) 0 1px, transparent 1px 6px), repeating-linear-gradient(0deg, var(--pattern-ink) 0 1px, transparent 1px 6px); }
  [data-pattern='checker'] { background-image: conic-gradient(var(--pattern-ink) 25%, transparent 0 50%, var(--pattern-ink) 0 75%, transparent 0); background-size: 8px 8px; }
  @container (min-width: 480px) {
    .comparison-ranking { grid-template-columns: repeat(var(--count), minmax(0, 1fr)); gap: 8px; padding-left: 130px; }
    .comparison-item { position: relative; display: block; height: 178px; }
    .rank-value { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: .68rem; }
    .rank-value small { display: none; }
    .rank-track { position: absolute; top: 20px; left: 50%; width: 10px; height: 42px; margin: 0; transform: translateX(-50%); }
    .comparison-fill { position: absolute; bottom: 0; width: 100%; height: var(--amount); }
    .rank-label { position: absolute; top: 69px; right: 50%; width: 160px; text-align: right; white-space: nowrap; transform: rotate(-35deg); transform-origin: top right; }
    .rank-number { min-width: 0; margin-right: 6px; }
  }
  @media (max-width: 900px) {
    .comparison-columns { grid-template-columns: 1fr; gap: 16px; }
    figcaption { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 10px; }
    .comparison-scale { flex-basis: 100%; }
  }
</style>

<script>
  import { msg } from '$lib/i18n/index.js';
  import comparison from '../../../static/posts/keine-tday/summary.json';
  import evidence from '../../../static/benchmarks/preview-highlights.json';
  import { comparisonScale, comparisonSeries, seriesMeasurements } from './benchmark-scale.js';

  const tones = ['#c9e2eb', '#afcbd5', '#96b3be', '#7e9da9', '#698895', '#577482', '#466170'];
  const patterns = { keine: 'solid', renpy: 'dots', suika: 'diagonal', webgal: 'horizontal', tyrano: 'dashes', letsgal: 'cross', onscripter: 'vertical' };
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
  const series = $derived(comparisonSeries(data).map((item, index, all) => ({
    ...item,
    pattern: item.pattern ?? patterns[item.id] ?? 'solid',
    tone: tones[Math.round(index / Math.max(1, all.length - 1) * (tones.length - 1))]
  })));
  const charts = $derived(data.map(chart => {
    const rows = seriesMeasurements(chart.rows, series);
    return {
      ...chart,
      scale: comparisonScale(rows, linearCharts.includes(chart.id)),
      rows: rows.map(row => ({ ...row, identity: series.find(item => item.id === row.id) }))
    };
  }));
  const valueLabel = (chart, row) => `${row.value.toFixed(chart.digits)} ${chart.unit}`;
  const shortLabel = row => row.label.replaceAll(' · ', ' ').replace('密码加密', '加密');
  const detailLabel = row => row.protection
    ? [$msg(row.protection), $msg('进程统计范围 {0}', {0: row.rangeLabel}), $msg(row.note)].join(' · ')
    : $msg(row.detail ?? '');
</script>

<div class="benchmark-comparison" aria-label={$msg(label)}>
  <ul class="comparison-legend" aria-label={$msg("公共图例")}>
    {#each series as item (item.id)}
      <li data-series={item.id}>
        <span class="series-swatch" data-pattern={item.pattern} style:--bar-tone={item.tone} aria-hidden="true"></span>
        <span>{$msg(item.compactLabel ?? shortLabel(item))}</span>
      </li>
    {/each}
  </ul>
  <div class="comparison-columns" style:--columns={columns} style:--compact-columns={Math.min(columns, 2)}>
    {#each charts as chart}
      <figure>
        <figcaption>
          <span class="comparison-title"><span class="full-title">{$msg(chart.label)}</span><span class="compact-title">{$msg(chart.compactLabel ?? chart.label)}</span></span>
          <span class="comparison-direction">{$msg("{0} · 越低越好", {0: $msg(chart.unit)})}</span>
        </figcaption>
        <ul class="comparison-values" aria-label={$msg("{0}，顺序与公共图例一致", {0: $msg(chart.label)})}>
          {#each chart.rows as row (row.id)}
            <li class="comparison-item" data-series={row.id} style:--amount={`${chart.scale.percent(row.value)}%`}
              aria-label={$msg("{0} {1}，{2}{3}", {0: $msg(row.label), 1: $msg(row.version ?? ''), 2: $msg(valueLabel(chart, row)), 3: row.detail ? ` · ${detailLabel(row)}` : ''})}>
              <span class="comparison-track" aria-hidden="true"><span class="comparison-fill" data-pattern={row.identity.pattern} style:--bar-tone={row.identity.tone}></span></span>
              <span class="comparison-value" aria-hidden="true">{$msg(row.value.toFixed(chart.digits))}</span>
            </li>
          {/each}
        </ul>
        <div class="comparison-scale" class:has-toggle={chart.scale.compressible}>
          <span class="scale-bounds">0 — {$msg(chart.scale.max.toFixed(chart.digits))}</span>
          {#if chart.scale.compressible}
            <span class="scale-mode">{$msg(chart.scale.compressed ? '对数压缩 · 非线性' : '线性刻度')}</span>
            <button type="button" class="scale-toggle"
              aria-label={$msg("{0}：切换为{1}", {0: $msg(chart.label), 1: $msg(chart.scale.compressed ? '线性刻度' : '对数压缩')})}
              onclick={() => linearCharts = chart.scale.compressed ? [...linearCharts, chart.id] : linearCharts.filter(id => id !== chart.id)}
            >{$msg(chart.scale.compressed ? '切回线性' : '压缩显示')}</button>
          {/if}
        </div>
      </figure>
    {/each}
  </div>
</div>

<style>
  .benchmark-comparison { margin: 14px 0 10px; }
  .comparison-legend { display: flex; flex-wrap: wrap; gap: 8px 20px; list-style: none; margin: 0 0 16px; padding: 0; color: #afc6d3; font: .74rem/1.5 var(--f-b); }
  .comparison-legend li { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
  .series-swatch { display: inline-block; width: 18px; height: 10px; flex: 0 0 auto; }
  .comparison-columns { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 16px; align-items: start; }
  figure { display: flex; flex-direction: column; margin: 0; min-width: 0; }
  figcaption { color: #afc6d3; font: .74rem/1.5 var(--f-b); margin-bottom: 8px; }
  .comparison-title { display: block; min-height: 3em; }
  .compact-title { display: none; }
  .comparison-direction { display: block; color: #abc3cf; font-size: .68rem; }
  .comparison-values { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .comparison-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 24px; color: #b7ccd8; font: .74rem/1.4 var(--f-b); }
  .comparison-value { min-width: 5ch; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: #c9e2eb; }
  .comparison-track { display: block; height: 6px; background: rgb(100 133 150 / 10%); }
  .comparison-fill { display: block; width: var(--amount); height: 100%; }
  .comparison-scale { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; margin-top: 8px; color: #879ba8; font: .64rem/1.5 var(--f-b); }
  .scale-toggle { padding: 2px 4px; border: 0; background: transparent; color: #afc6d3; font: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .scale-toggle:hover { background: rgb(160 170 180 / 12%); }
  [data-pattern] { --pattern-ink: rgb(7 15 20 / 85%); background-color: var(--bar-tone); }
  [data-pattern='dots'] { background-image: radial-gradient(circle, var(--pattern-ink) 1.5px, transparent 1.7px); background-size: 6px 6px; }
  [data-pattern='diagonal'] { background-image: repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  [data-pattern='horizontal'] { background-image: repeating-linear-gradient(0deg, var(--pattern-ink) 0 2px, transparent 2px 6px); }
  [data-pattern='dashes'] { background-image: radial-gradient(ellipse 3px 1px, var(--pattern-ink) 95%, transparent); background-size: 9px 6px; }
  [data-pattern='cross'] { background-image: repeating-linear-gradient(45deg, var(--pattern-ink) 0 2px, transparent 2px 9px), repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 9px); }
  [data-pattern='vertical'] { background-image: repeating-linear-gradient(90deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  [data-pattern='grid'] { background-image: repeating-linear-gradient(90deg, var(--pattern-ink) 0 1px, transparent 1px 6px), repeating-linear-gradient(0deg, var(--pattern-ink) 0 1px, transparent 1px 6px); }
  [data-pattern='checker'] { background-image: conic-gradient(var(--pattern-ink) 25%, transparent 0 50%, var(--pattern-ink) 0 75%, transparent 0); background-size: 8px 8px; }
  @media (max-width: 1100px) {
    .comparison-columns { grid-template-columns: repeat(var(--compact-columns), minmax(0, 1fr)); }
  }
  @media (max-width: 600px) {
    .full-title, .scale-bounds { display: none; }
    .compact-title { display: inline; }
    .comparison-legend { gap: 8px 14px; font-size: .78rem; }
    .comparison-columns { gap: 18px 14px; }
    .comparison-title { font-size: .8rem; }
    .comparison-direction { margin-top: 2px; color: #8fa6b2; }
    .comparison-item { gap: 6px; min-height: 26px; font-size: .78rem; }
    .comparison-scale:not(.has-toggle) { display: none; }
    .scale-toggle { min-height: 36px; padding: 6px 0; }
  }
</style>

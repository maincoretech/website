<script>
  import comparison from '../../../static/posts/keine-tday/summary.json';
  import evidence from '../../../static/benchmarks/preview-highlights.json';

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
  const charts = $derived(data.map(chart => ({ ...chart, max: Math.max(...chart.rows.map(row => row.value)), rows: [...chart.rows].sort((a, b) => b.value - a.value) })));
  let inspected = $state(null);
  const valueLabel = (chart, row) => `${row.value.toFixed(chart.digits)} ${chart.unit}`;
</script>

<div class="benchmark-comparison" aria-label={label}>
  <div class="comparison-columns" style:--columns={columns}>
    {#each charts as chart}
      <figure>
        <figcaption>
          <span class="comparison-title">{chart.label}</span>
          <span class="comparison-direction">↓ 越低越好</span>
          <span class="comparison-scale">0 — {chart.max.toFixed(chart.digits)} {chart.unit}</span>
        </figcaption>
        <div class="comparison-bars">
          {#each chart.rows as row, index}
            {@const key = `${chart.id}-${row.id}`}
            <button type="button" class="comparison-row" style:width={`${row.value / chart.max * 100}%`}
              aria-label={`${row.label} ${row.version}，${chart.label} ${valueLabel(chart, row)}，越低越好${row.detail ? `，${row.detail}` : ''}`}
              aria-expanded={inspected === key}
              onpointerenter={() => inspected = key} onpointerleave={() => inspected = null}
              onfocus={() => inspected = key} onblur={() => inspected = null}
              onclick={() => inspected = key} onkeydown={event => { if (event.key === 'Escape') { event.stopPropagation(); inspected = null; } }}>
              <span class="comparison-fill" data-pattern={row.pattern ?? patterns[row.id] ?? 'solid'} style:--bar-tone={tone(index, chart.rows.length)}></span>
            </button>
            <span class="comparison-tooltip" class:shown={inspected === key} aria-hidden="true">
              <span class="comparison-swatch" data-pattern={row.pattern ?? patterns[row.id] ?? 'solid'} style:--bar-tone={tone(index, chart.rows.length)}></span>
              <b>{row.label}</b><span>{valueLabel(chart, row)}</span><small>{row.version}</small>
              {#if row.detail}<small>{row.detail}</small>{/if}
            </span>
          {/each}
        </div>
      </figure>
    {/each}
  </div>
</div>

<style>
  .benchmark-comparison { margin: 20px 0 16px; }
  .comparison-columns { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 20px; }
  figure { margin: 0; min-width: 0; }
  figcaption { color: #afc6d3; font: .74rem/1.5 var(--f-b); margin-bottom: 4px; }
  .comparison-title { display: block; }
  .comparison-direction { display: block; color: #abc3cf; font-size: .68rem; }
  .comparison-scale { display: block; color: #879ba8; font-size: .64rem; }
  .comparison-bars { position: relative; height: 32px; isolation: isolate; }
  .comparison-row { position: absolute; inset: 0 auto 0 0; display: flex; align-items: center; height: 32px; padding: 0; border: 0; border-radius: 0; background: transparent; cursor: pointer; }
  .comparison-row:focus-visible { outline: 1px solid #87a8bc; outline-offset: 2px; }
  .comparison-fill { display: block; width: 100%; height: 14px; border-right: 1px solid #0b1216; box-sizing: border-box; transition: filter 200ms ease; }
  [data-pattern] { --pattern-ink: rgb(7 15 20 / 85%); background-color: var(--bar-tone); }
  [data-pattern='dots'] { background-image: radial-gradient(circle, var(--pattern-ink) 1.5px, transparent 1.7px); background-size: 6px 6px; }
  [data-pattern='diagonal'] { background-image: repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  [data-pattern='horizontal'] { background-image: repeating-linear-gradient(0deg, var(--pattern-ink) 0 2px, transparent 2px 6px); }
  [data-pattern='dashes'] { background-image: radial-gradient(ellipse 3px 1px, var(--pattern-ink) 95%, transparent); background-size: 9px 6px; }
  [data-pattern='cross'] { background-image: repeating-linear-gradient(45deg, var(--pattern-ink) 0 2px, transparent 2px 9px), repeating-linear-gradient(135deg, var(--pattern-ink) 0 2px, transparent 2px 9px); }
  [data-pattern='vertical'] { background-image: repeating-linear-gradient(90deg, var(--pattern-ink) 0 2px, transparent 2px 7px); }
  .comparison-swatch { flex: 0 0 24px; height: 14px; align-self: center; }
  .comparison-row:is(:hover, :focus-visible) .comparison-fill { filter: brightness(1.15); }
  .comparison-tooltip { position: absolute; left: 0; bottom: calc(100% + 3px); z-index: 5; display: flex; flex-wrap: wrap; gap: 3px 8px; width: max-content; max-width: 100%; padding: 7px 9px; box-sizing: border-box; border: 1px solid #405866; background: rgb(12 24 31 / 95%); color: #c5dae5; font: .72rem/1.4 var(--f-b); pointer-events: none; opacity: 0; transform: translateY(3px); transition: opacity 160ms ease, transform 160ms ease; }
  .comparison-tooltip.shown { opacity: 1; transform: translateY(0); }
  .comparison-tooltip small { flex-basis: 100%; font: .62rem/1.4 var(--f-m); overflow-wrap: anywhere; color: #9fb4c1; }
  @media (max-width: 600px) {
    .comparison-columns { grid-template-columns: 1fr; gap: 10px; }
    figcaption { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 10px; }
    .comparison-scale { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .comparison-fill, .comparison-tooltip { transition: none; } }
</style>

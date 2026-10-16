<script>
  import { msg } from '$lib/i18n/index.js';
  import evidence from '../../../static/benchmarks/preview-highlights.json';

  const { keine, machine } = evidence;
  const metrics = [
    { value: keine.idle_cpu_percent.toFixed(2), unit: '%', label: '静态阅读 CPU', detail: '100% = 一个逻辑核心' },
    { value: keine.idle_rss_mib.toFixed(1), unit: 'MiB', label: '静态阅读内存', detail: '进程组 RSS' },
    { value: keine.motion_frame_p95_ms.toFixed(2), unit: 'ms', label: '动态帧间隔 P95', detail: '连续位移 · Metal 追踪' }
  ];
</script>

<aside class="keine-metrics" aria-label={$msg("Kēne 历史性能实测")}>
  <p class="metrics-heading">{$msg("运行实测")} <span>Kēne {$msg(keine.version)}</span></p>
  <dl>
    {#each metrics as metric}
      <div>
        <dt>{$msg(metric.label)}</dt>
        <dd><strong>{$msg(metric.value)}</strong><span>{$msg(metric.unit)}</span></dd>
        <small>{$msg(metric.detail)}</small>
      </div>
    {/each}
  </dl>
  <p class="metrics-context">{$msg("{0} · {1} GiB · tday 1080p；历史版本实测，非完整游戏成绩。", {0: $msg(machine.chip), 1: $msg(machine.memory_gib)})} <a href="#keine-details">{$msg("测试条件与对比 →")}</a></p>
</aside>

<style>
  .keine-metrics { min-width: 0; padding-top: 16px; }
  .metrics-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin: 0 0 6px; color: #bcd4e0; font: .85rem/1.5 var(--f-b); }
  .metrics-heading span { color: #829eac; font: .75rem/1.7 var(--f-m); }
  dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: 0; }
  dl > div { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; padding: 6px 0; }
  dt { color: #afc6d3; font: .9rem/1.5 var(--f-b); }
  dd { display: flex; align-items: baseline; gap: 7px; margin: 4px 0; color: #c5dce6; }
  strong { font: 400 clamp(2.1rem, 3.5vw, 3.2rem)/1.1 var(--f-h); font-variant-numeric: tabular-nums; }
  dd span { font: .8rem/1.5 var(--f-m); color: #9ebdcc; }
  small, .metrics-context { color: #829eac; font: .7rem/1.7 var(--f-b); }
  .metrics-context { margin: 6px 0 0; text-wrap: pretty; }
  a { display: inline-block; padding-block: 4px; white-space: nowrap; }
  @media (max-width: 759px) {
    dl { gap: 12px; }
    dt { font-size: .72rem; }
    dd { gap: 4px; }
    strong { font-size: clamp(1.55rem, 6.5vw, 2.1rem); }
    dd span, small { font-size: .62rem; }
  }
</style>

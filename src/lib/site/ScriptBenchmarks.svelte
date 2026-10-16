<script>
  import evidence from '../../../static/benchmarks/script-comparison.json';

  const range = result => result.process_range_ms.map(value => value.toFixed(3)).join('–');
  const core = [
    { stage: 'core_comments', label: '10 万条非阻塞 Comment', detail: '轻负载 · 已安装 Program' },
    { stage: 'core_mixed_dialogue', label: '1000 轮赋值 / 条件 / 插值对白', detail: '通用 Action · 每轮 3 条 · 模拟推进' }
  ].map(item => ({ ...item, ...evidence.results.find(row => row.stage === item.stage) }));
</script>

<section class="script-benchmarks" aria-label="Core 脚本执行">
  <h3>脚本执行 · Core</h3>
  <p class="script-scope">Kēne {evidence.keine.version} · 不含解析 · 未测竞品执行</p>
  <dl class="benchmark-metrics core-metrics">
    {#each core as metric}
      <div>
        <dt>{metric.label}</dt>
        <dd><strong>{metric.median_ms.toFixed(3)}</strong><span>ms</span></dd>
        <small>越低越好 · {metric.detail}</small>
        <small>进程中位数范围 {range(metric)} ms</small>
      </div>
    {/each}
  </dl>
</section>

<style>
  .script-benchmarks { margin: 24px 0 20px; padding-top: 18px; border-top: 1px solid #314b58; }
  h3 { margin: 0; color: #b7ccd8; font: 400 .95rem/1.5 var(--f-b); }
  .script-scope { margin: 4px 0 12px; color: #8fa6b2; font: .68rem/1.5 var(--f-b); }
  .script-benchmarks :global(.core-metrics) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
</style>

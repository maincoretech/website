<script>
  import evidence from '../../../static/benchmarks/script-comparison.json';
  import BenchmarkComparison from './BenchmarkComparison.svelte';

  const range = result => result.process_range_ms.map(value => value.toFixed(3)).join('–');
  const charts = [10000, 100000].map(count => ({
    id: `parse-${count}`, label: `${count / 10000} 万条纯文本解析`, unit: 'ms', digits: 2,
    rows: ['keine', 'tyranoscript'].map(engine => {
      const result = evidence.results.find(row => row.engine === engine && row.stage === 'parse' && row.units === count);
      return {
        id: engine === 'keine' ? 'keine' : 'tyrano', label: engine === 'keine' ? 'Kēne' : 'TyranoScript',
        version: engine === 'keine' ? `${evidence.keine.version} / ${evidence.keine.commit.slice(0, 7)} · Rust` : `${evidence.tyranoscript.commit.slice(0, 7)} · Node ${evidence.tyranoscript.node}`,
        value: result.median_ms,
        detail: `进程中位数范围 ${range(result)} ms`
      };
    })
  }));
  const core = [
    { stage: 'core_comments', label: '10 万条非阻塞 Comment', detail: '轻负载 · 已安装 Program' },
    { stage: 'core_mixed_dialogue', label: '1000 轮赋值 / 条件 / 插值对白', detail: '通用 Action · 每轮 3 条 · 模拟推进' }
  ].map(item => ({ ...item, ...evidence.results.find(row => row.stage === item.stage) }));
</script>

<section class="script-benchmarks" aria-label="脚本解析与 Core 执行">
  <h3>脚本解析</h3>
  <p class="script-scope">Kēne Loader / TyranoScript · 相同文本，不同解析工作量</p>
  <BenchmarkComparison data={charts} label="纯文本解析路径对比" columns={2} />
  <h3>脚本执行 · Core</h3>
  <p class="script-scope">Kēne {evidence.keine.version} · 不含解析 · 未测竞品执行</p>
  <dl class="benchmark-metrics core-metrics">
    {#each core as metric}
      <div>
        <dt>{metric.label}</dt>
        <dd><strong>{metric.median_ms.toFixed(3)}</strong><span>ms</span></dd>
        <small>↓ 越低越好 · {metric.detail}</small>
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

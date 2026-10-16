<script>
  import evidence from '../../../static/benchmarks/webgalk-native.json';
  import BenchmarkComparison from './BenchmarkComparison.svelte';
  import { nativeCharts, embeddedCharts } from './benchmark-data.js';
  const native = nativeCharts(evidence);
  const embedded = embeddedCharts(evidence);
</script>

<section class="supplemental-benchmarks" aria-label="WebGAL_k 原生补测">
  <h3>WebGAL_k · 原生运行</h3>
  <p class="scope">hexz 后端 · 独立检查点 · 不混入历史引擎排行</p>
  <BenchmarkComparison data={native} columns={2} label="WebGAL_k 四种原生负载" />
  <p class="scope">100% CPU = 一个逻辑核 · RSS 含 WebKit · GPU / 呈现帧间隔未测</p>
  <h3>WebGAL_k · 内置资源读器 · 加密</h3>
  <p class="scope">旧版独立参考 · 仅比较同一读器的加密配置，不与下方新协议混排</p>
  <BenchmarkComparison data={embedded} label="WebGAL_k 内置 hexz 读器" />
</section>

<style>
  .supplemental-benchmarks { margin-top: 24px; padding-top: 18px; border-top: 1px solid #314b58; }
  h3 { margin: 0; color: #b7ccd8; font: 400 .95rem/1.5 var(--f-b); }
  .scope { margin: 4px 0 14px; color: #8fa6b2; font: .68rem/1.5 var(--f-b); }
</style>

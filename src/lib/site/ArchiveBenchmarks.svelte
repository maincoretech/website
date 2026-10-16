<script>
  import evidence from '../../../static/benchmarks/resource-archives.json';
  import BenchmarkComparison from './BenchmarkComparison.svelte';
  import { archiveCharts } from './benchmark-data.js';
  const charts = archiveCharts(evidence);
</script>

<section class="archive-benchmarks" aria-label="资源归档格式补测">
  <h3>资源归档格式</h3>
  <p class="scope">624 个合成文件 · 28 MiB · 各实现默认策略，不是同等安全与缓存条件排名</p>
  <BenchmarkComparison data={charts.primary} label="资源包体积与顺序读取" />
  <h4>区间读取</h4>
  <p class="scope">同一 4 KiB seek 轨迹 · 首次为暖文件系统 · 十轮保留句柄与默认缓存</p>
  <BenchmarkComparison data={charts.range} columns={2} label="资源包 4 KiB 区间读取" />
  <h4>整文件读取</h4>
  <p class="scope">Suika3 / ONS 原生整文件接口；读取字节量不同，不与上方区间读取横比</p>
  <BenchmarkComparison data={charts.full} columns={1} label="资源包整文件随机读取" />
</section>

<style>
  .archive-benchmarks { margin-top: 24px; padding-top: 18px; border-top: 1px solid #314b58; }
  h3, h4 { margin: 0; color: #b7ccd8; font: 400 .95rem/1.5 var(--f-b); }
  h4 { margin-top: 20px; font-size: .8rem; }
  .scope { margin: 4px 0 12px; color: #8fa6b2; font: .68rem/1.5 var(--f-b); }
</style>

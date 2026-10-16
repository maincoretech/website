<script>
  import evidence from '../../../static/benchmarks/resource-archives.json';
  import BenchmarkComparison from './BenchmarkComparison.svelte';
  import { archiveCharts } from './benchmark-data.js';
  const charts = archiveCharts(evidence);
</script>

<section class="archive-benchmarks" aria-label="资源归档格式补测">
  <h3>资源归档格式 · 加密读取</h3>
  <p class="scope desktop-scope">同一 28 MiB 合成负载 · 64 MiB 名义内容缓存 · 关闭预取 · 不含打开与密码派生</p>
  <p class="scope mobile-scope">624 个文件 · 28 MiB · 全部加密</p>
  <p class="scope desktop-scope">区间读取：同一 2000 × 4 KiB 轨迹 · 文件系统暖缓存 · 新会话每轮重开，复用会话先预热一轮</p>
  <BenchmarkComparison data={[...charts.primary, ...charts.range]} columns={4} label="资源包体积、顺序读取与 4 KiB 区间读取" />
  <p class="scope mobile-scope">区间读取：2000 × 4 KiB · 暖文件系统<br />新会话每轮重开；复用会话先预热。</p>
  <p class="scope desktop-scope">实测差值不代表统计显著性或同等安全等级；缓存实现、块布局与总内存仍不同。</p>
  <h4 class="desktop-scope">LGPAK · 独立参考</h4>
  <p class="scope desktop-scope">整包载入内存的加密读器，不与上方按需读取排名；历史样本与原生打开成本见「测试条件与数据」。</p>
  <p class="scope mobile-scope">安全与总内存不等价。LGPAK 单列，详见下方测试条件。</p>
</section>

<style>
  .archive-benchmarks { margin-top: 24px; padding-top: 18px; border-top: 1px solid #314b58; }
  h3, h4 { margin: 0; color: #b7ccd8; font: 400 .95rem/1.5 var(--f-b); }
  h4 { margin-top: 20px; font-size: .8rem; }
  .scope { margin: 4px 0 12px; color: #8fa6b2; font: .68rem/1.5 var(--f-b); }
  .mobile-scope { display: none; }
  @media (max-width: 600px) {
    .desktop-scope { display: none; }
    .mobile-scope { display: block; }
  }
</style>

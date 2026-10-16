<script>
  import evidence from '../../../static/benchmarks/preview-highlights.json';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import BenchmarkComparison from './BenchmarkComparison.svelte';
  import ScriptBenchmarks from './ScriptBenchmarks.svelte';
  import WebgalkBenchmarks from './WebgalkBenchmarks.svelte';
  import WebgalkMethod from './WebgalkMethod.svelte';
  import ArchiveBenchmarks from './ArchiveBenchmarks.svelte';
  import ArchiveMethod from './ArchiveMethod.svelte';
  let { product } = $props();
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const reduction = (before, after) => ((1 - median(after) / median(before)) * 100).toFixed(1);
  const k = evidence.keine;
  const h = evidence.hakutaku;
  const metrics = {
    keine: [
      { value: k.idle_cpu_percent.toFixed(2), unit: '%', label: '静态阅读 CPU', detail: '100% = 一个逻辑核心' },
      { value: k.idle_rss_mib.toFixed(1), unit: 'MiB', label: '静态阅读内存', detail: '进程组 RSS 中位数' },
      { value: k.motion_frame_p95_ms.toFixed(2), unit: 'ms', label: '动态帧间隔 P95', detail: '连续位移 · 系统 Metal 追踪' }
    ],
    hakutaku: [
      { value: median(h.catalog_open_ms).toFixed(2), unit: 'ms', label: '10 万资源目录打开', detail: '已预热文件系统缓存' },
      { value: reduction(h.audio_seek_v1_ms, h.audio_seek_v2_ms), unit: '% ↓', label: '随机音频读取耗时', detail: 'v1 → v2 · 合成 seek 轨迹' },
      { value: reduction(h.catalog_snapshot_v1_bytes, h.catalog_snapshot_v2_bytes), unit: '% ↓', label: '10 万资源快照体积', detail: 'v1 → v2 · 同一目录负载' }
    ]
  };
</script>

<section class="benchmark-highlights" aria-label={product === 'keine' ? 'Kēne 实测数据' : 'Hakutaku 实测数据'}>
  <dl class="benchmark-metrics">
    {#each metrics[product] as metric}
      <div>
        <dt>{metric.label}</dt>
        <dd><strong>{metric.value}</strong><span>{metric.unit}</span></dd>
        <small>{metric.detail}</small>
      </div>
    {/each}
  </dl>
  {#if product === 'keine'}
    <BenchmarkComparison /><WebgalkBenchmarks /><ScriptBenchmarks />
  {:else}
    <ArchiveBenchmarks />
  {/if}
  <p class="benchmark-device">{evidence.machine.chip} · {evidence.machine.memory_gib} GiB · {evidence.machine.os}</p>
  <div class="benchmark-method">
    <Disclosure label="测试条件与数据">
    <p>同组图表共用图例、纹理和排列顺序，不再按指标分别排名。最大值与最小正值相差至少 20 倍时，默认按 log(1 + 数值 / 最小正值) 压缩条长，保留零点，但长度不表示线性倍数；可切回线性。数值始终显示原始实测结果，差值不代表统计显著性或整体引擎优劣。</p>
    {#if product === 'keine'}
      <p>2026-10-14（北京时间），0.16.0 / 83b00c2 的历史实测，不代表最新版成绩。release 构建，tday 开发文件系统检查点，1920 × 1080；预热 10 秒，连续采样 3 × 30 秒，取三段统计中位数。不是三次独立启动，也不代表完整游戏或打包后的资源读取表现。</p>
      <p>RSS 包含主进程与观察到的子进程，可能重复计入共享页，不含 WindowServer 和驱动开销。帧间隔来自独立 Metal 追踪，不是输入延迟；没有测量功耗或续航。</p>
      <p>对比沿用 2026-10-12–13 的其他引擎数据：同一机器与检查点协议，但不是完整游戏等价性测试，也不是完整游戏排名。LetsGal 为 Studio 导出前端，ONS 使用私有依赖与预缩放 PNG。帧间隔仅比较相同连续位移负载下的 Kēne 和 Suika3 系统 Metal 呈现；其他引擎的时钟或负载不同，不混入 Chromium 反馈、Ren’Py draw 完成计数或 ONS 分步位移。</p>
      <p>阅读图表：同机对比，各项独立细条，共用零点，各指标单独定标。名次、名称和数值直接显示；宽图斜排名称，窄图横排。数值从小到大对应由浅到深的蓝灰色；同一引擎在各图中使用相同纹理，Kēne 为实心、Ren’Py 为圆点、Suika3 为斜线、WebGAL 为横线、TyranoScript 为短划线、LetsGal 为交叉网格、ONS 为竖线。这三项指标均为越低越好，版本与测试口径见下方原始记录。</p>
      <a href="/posts/keine-tday/summary.json" target="_blank" rel="noopener noreferrer">引擎版本与对比原始汇总 ↗</a>
      <p>脚本数据为 2026-10-16（北京时间）的独立补测：Kēne 0.16.3 / d636898，Rust 1.99.0 release / LTO / 单 codegen unit；TyranoScript 固定源码 c8dbfd4 的 parseScenario 入口，在 Node 24.22.0 / V8 13.6 下运行，不是上面运行时图表中的 602c 发行包或 Electron 实测。每种引擎和规模各启 3 次进程，交替顺序；每阶段预热 5 次、测量 10 次，取三次进程中位数的中位数。范围表示进程中位数的最小 / 最大值，不是置信区间。</p>
      <p>页面仅展示 Core 执行数据。Loader 解析对照仍保留在原始数据文件中：相同的 1 万 / 10 万条文本，但解析器输出、语义诊断和字符串所有权不同，不作为整体引擎排名。</p>
      <p>计时使用暖内存输入，含分配，不含生成 / 读盘、完整输出验证与结果释放。Core 排除 State / Program 初始化与释放；混合负载每轮为通用字符串表达式的赋值、条件 Comment、插值 Say，立即模拟推进，不是严格 EYS 编译 AST 吞吐。未测竞品纯执行、媒体、UI、渲染、冷启动或功耗；桌面后台负载未隔离。</p>
      <a href="/benchmarks/script-comparison.json" target="_blank" rel="noopener noreferrer">脚本原始样本、来源与复现命令 ↗</a>
      <p>另保留 2026-10-11 的 0.14.3 历史优化前后记录。历史 Criterion 计时包含输出释放、采样方式不同，不能把历史与本次数值之差称作版本提速。</p>
      <a href="/benchmarks/script-history.json" target="_blank" rel="noopener noreferrer">历史解析优化对照 ↗</a>
      <WebgalkMethod />
    {:else}
      <p>2026-10-13 UTC，0.2.0 集成工作树与已保留的 v1 基线，Rust 1.99.0。三次进程运行交替测试，文件系统缓存已预热；目录耗时为三组七轮中位数的中位数，音频为三组五轮中位数的中位数。</p>
      <p>音频测试使用 tday 实际素材上的合成 4 KiB seek 轨迹：{median(h.audio_seek_v1_ms).toFixed(3)} → {median(h.audio_seek_v2_ms).toFixed(3)} ms，不是播放延迟。后端读取调用由 2,175 增至 3,600；该真实素材集的快照由 42,113 增至 73,907 字节，顺序读取耗时基本不变。快照缩小的数字仅属于另一组 10 万资源目录测试。</p>
      <a href={h.documentation} target="_blank" rel="noopener noreferrer">完整协议与取舍 ↗</a>
      <ArchiveMethod />
    {/if}
    <a href="/benchmarks/preview-highlights.json" target="_blank" rel="noopener noreferrer">数值、口径与来源记录 ↗</a>
    </Disclosure>
  </div>
</section>

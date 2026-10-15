---
title: Kēne 的架构设计：为什么它能轻快地运行故事
date: 2026-10-14
author: maincore
description: 从剧本内核、原生渲染、休眠调度到资源管理，用源码与 tday 实测解释 Kēne 的设计取舍
priority: 4
category: tech
---

<script>
  import benchmark from '../../../static/posts/keine-tday/summary.json';
  const current = benchmark.engines.find((engine) => engine.id === 'keine');
  const previous = benchmark.previous_keine;
  const metal = benchmark.keine_metal;
  const workloads = [
    { id: 'idle', label: '静态阅读' },
    { id: 'motion', label: '连续位移' },
    { id: 'audio', label: 'BGM 单轨' },
    { id: 'mix', label: 'BGM + 环境声' }
  ];
  const layers = [
    { id: 'engine', name: 'Engine', role: '原生宿主与呈现', path: 'src/runtime · scene · render · ui · storage', detail: '把输入交给 Core，把 State 中的舞台与媒体状态同步到 Bevy，管理窗口、音视频、GPU 和存储的生命周期。' },
    { id: 'loader', name: 'Loader', role: '工程输入与内容边界', path: 'crates/loader', detail: '解析 Eiyashou，读取配置和资源，提供诊断与编译格式，把不同输入整理成 Core 能消费的 Program。兼容工程的特殊字段留在 adapter 内。' },
    { id: 'core', name: 'Core', role: '剧本语义与确定性执行', path: 'crates/core', detail: '定义 Action、Program、State，执行表达式、分支、对白与等待语义。它不依赖 Bevy，不拥有窗口、GPU 或音频设备。' }
  ];
  let selected = $state('core');
  let layer = $derived(layers.find((item) => item.id === selected));
  const fmt = (value, digits = 2) => value.toFixed(digits);
  const cpuDrop = ((1 - current.workloads.motion.cpu_percent / previous.workloads.motion.cpu_percent) * 100).toFixed(1);
</script>

<svelte:head>
  <title>Kēne 的架构设计：为什么它能轻快地运行故事 · maincore</title>
  <meta name="description" content="从 Core、Loader、Engine 的分层，到按需唤醒、原生渲染与有界资源预取，用源码和 tday 实测介绍 Kēne 0.16.0 的架构设计。" />
</svelte:head>

<div class="architecture-hero">
  <span class="eyebrow">KĒNE 0.16.0 / ARCHITECTURE NOTES</span>
  <h2>故事的节奏，<br />也是引擎的节奏。</h2>
  <p>阅读时等待，演出时更新，切换场景时准备下一组资源。Kēne 把这些不同的工作交给明确的模块，让每一层只承担自己的成本。</p>
  <div class="hero-metrics">
    <div><strong>{fmt(current.workloads.idle.cpu_percent)}<small>% CPU</small></strong><span>静态阅读检查点</span></div>
    <div><strong>{fmt(metal.current.fps)}<small>FPS</small></strong><span>动态场景实际呈现</span></div>
    <div><strong>{fmt(metal.current.p95_ms)}<small>ms P95</small></strong><span>动态帧间隔</span></div>
  </div>
  <p class="hero-note">tday · M5 Pro · macOS · 1920 × 1080。CPU 100% 表示一个逻辑核心；帧数据来自独立系统 Metal 追踪。</p>
</div>

Kēne 是基于 Rust、Bevy 与 wgpu 的原生视觉小说引擎，配有基于 GPUI 的 Editor。它的设计围绕视觉小说的实际工作展开：剧本按交互点推进，舞台在需要时更新，作者的源文档与玩家的运行状态各有自己的归属。

本文对应 **0.16.0 / 83b00c2091bb** 的源码。架构说明来自实现，性能数字来自 tday 检查点实测；两者结合解释设计意图，具体节省了多少仍需单项对照测试。

## 一、把剧本语义放在最内层

Kēne 的主要依赖方向是 **Engine → Loader → Core**，箭头指向被依赖的模块。Core、Loader 和 Editor–Engine 的 authoring 协议都不依赖 Bevy；图形框架留在需要窗口和呈现的边界。

<figure class="architecture-figure">
  <figcaption><span>01 / DEPENDENCIES</span><strong>点击一层，查看它承担的职责</strong></figcaption>
  <div class="dependency-layers" role="group" aria-label="架构模块">
    {#each layers as item, index}
      <button type="button" class:selected={selected === item.id} aria-pressed={selected === item.id} onclick={() => selected = item.id}>
        <strong>{item.name}</strong><span>{item.role}</span>
      </button>
      {#if index < layers.length - 1}<span class="dependency-arrow" aria-hidden="true">↓ 依赖</span>{/if}
    {/each}
  </div>
  <div class="layer-detail" aria-live="polite"><code>{layer.path}</code><p>{layer.detail}</p></div>
  <p class="figure-note">Authoring 是 Editor 与 Engine 共用的协议 crate；Media 负责有界 WebP 解码，二者按职责独立组织。</p>
</figure>

Core 定义三种关键数据：**Action** 描述剧本动作，**Program** 保存整理后的剧本，**State** 保存执行游标、变量、舞台和等待状态。它决定“下一句是什么”和“现在为什么停下来”；原生宿主负责把这些状态变成画面、声音与交互。

这一边界让剧本语义可以脱离窗口单独测试，也让原生工程与兼容输入共用同一个执行模型。格式适配留在 Loader，运行时不需要到处识别作者工程的特殊字段。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/lib.rs">Core</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/loader/src/lib.rs">Loader</a>。

## 二、先整理剧本，再按交互点执行

开发时，Loader 将 Eiyashou 源码解析为 typed Program；正式发行时，Engine 加载编译后的 Program。资源引用和诊断在装载边界处理，日常推进直接消费已经整理好的动作。

<figure class="architecture-figure">
  <figcaption><span>02 / EXECUTION</span><strong>内容向内整理，呈现由宿主接手</strong></figcaption>
  <ol class="execution-flow">
    <li><strong>工程输入</strong><span>源码 / 配置 / 编译内容</span></li>
    <li><strong>Loader</strong><span>解析、诊断、资源解析</span></li>
    <li><strong>Program + State</strong><span>Core 执行到交互或演出等待点</span></li>
    <li><strong>原生宿主</strong><span>同步舞台，呈现画面与声音</span></li>
  </ol>
  <p class="figure-note">玩家点击、做出选择或等待演出结束后，宿主再恢复剧本推进；这条流程并不要求每帧重新解析源码。</p>
</figure>

Core 的 step 会连续处理可立即执行的动作，遇到对白、选项、输入确认或阻塞演出时返回相应等待结果。**剧本推进与画面刷新因此有不同的节奏**：立绘动画可以逐帧插值，一句对白却可以一直停在同一个执行位置。

执行时通过共享的 Program 引用借用 Action，再更新 State，避免为每个动作复制整份剧本。存档检查点也按执行边界处理；会产生无法直接保存的瞬态演出时，宿主额外保留动作前的可恢复状态。这些路径减少重复工作，但本轮 bench 没有单独量出它们的贡献。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/runtime/step.rs">Core step</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/script/driver.rs">原生执行驱动</a>。

## 三、静态阅读时，让窗口循环真正等待

视觉小说中，画面不变的时间往往比演出时间长。Kēne 的 Runtime 根据当前工作判断处于 Active、Loading、Idle 或 Background，并据此调整窗口更新方式。

<figure class="architecture-figure">
  <figcaption><span>03 / SCHEDULING</span><strong>持续演出与静态等待，采用不同的更新节奏</strong></figcaption>
  <div class="scheduler">
    <section><span class="mode-label">ACTIVE</span><strong>还有呈现工作</strong><p>文字、动画、自动推进与 UI 动效需要更新。macOS 活跃状态按显示器刷新节奏安排更新。</p></section>
    <div class="schedule-divider" aria-hidden="true">↕</div>
    <section><span class="mode-label">IDLE</span><strong>画面已经稳定</strong><p>窗口循环进入响应式等待；输入、Editor 消息与最近的定时任务决定下一次唤醒。</p></section>
  </div>
</figure>

等待也需要管理时钟。静态状态下，虚拟时间可以暂停；持久化使用真实时间，把下一次写入期限交给 Runtime。恢复演出时，宿主处理休眠前积压的渲染时间戳，避免把整段阅读等待算进新动画的第一帧。

音频播放同样不必让静态画面持续重绘。逻辑播放器与物理输出流分开管理，设备恢复由 worker 处理；恢复结果可以唤醒宿主。这种分工让音频生命周期与画面循环各按需要工作。

**tday 静态检查点的 CPU 实测为 {fmt(current.workloads.idle.cpu_percent)}%，BGM 单轨为 {fmt(current.workloads.audio.cpu_percent)}%，BGM 与环境声同播为 {fmt(current.workloads.mix.cpu_percent)}%。** 这些低占用结果与按需唤醒的设计相符；它们描述对应检查点，没有测量功耗或电池续航。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/platform.rs">Runtime 调度</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md#音频输出">音频设计</a>。

## 四、让原生渲染路径减少重复工作

Engine 用 Bevy 组织舞台与 UI，通过 wgpu 完成原生图形呈现。**1920 × 1080 是统一设计空间**，窗口缩放和留黑边的转换由同一处管理，背景、立绘、普通 UI 与弹窗沿用一致的坐标规则。

舞台、普通 UI 与对话覆盖层按顺序在同一个中间目标合成，只有最后一个活动相机把目标输出到窗口。前面的相机继续绘制自己的内容，但跳过重复的最终复制。

<figure class="architecture-figure">
  <figcaption><span>04 / COMPOSITION</span><strong>固定合成顺序，共用一个输出目标</strong></figcaption>
  <div class="composition">
    <div class="render-layers"><span>场景 / 背景 / 立绘</span><span>普通 UI</span><span>对话 / 弹窗覆盖层</span></div>
    <div class="render-target"><strong>共同中间目标</strong><span>最后一个活动相机输出</span><span aria-hidden="true">↓</span><strong>原生窗口</strong></div>
  </div>
  <p class="figure-note">这里描述的是合成与输出职责，仍保留各层绘制和特效所需的工作。</p>
</figure>

普通背景 Fade / Crossfade 在满足条件时，可以合并为一次双纹理绘制；遇到变换、滤镜、遮罩或交错图层时沿用原路径。新管线和纹理绑定准备好后才替换原绘制，避免为减少开销而破坏画面完整性。这个设计针对背景转场，不能拿立绘位移测试来证明它的单项收益。

本次连续位移的系统 Metal 追踪测得 **{fmt(metal.current.fps)} FPS**，帧间隔 **P95 / P99 均为 {fmt(metal.current.p95_ms)} ms**。它展示整个动态检查点的表现；渲染追踪本身可能改变调度，也不能证明全程没有掉帧。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/platform.rs">相机输出</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/background/crossfade.rs">背景合并绘制</a>。

## 五、资源按当前需要准备，并给预取设边界

Loader 提供有序、只读的内容挂载；后挂载可以覆盖先挂载，但路径始终限定在挂载根内。Runtime 通过统一内容接口读取工程与发行资源，不依赖当前工作目录四处找文件。

当前舞台需要的资源优先处理。普通预测预取只保留前 **8 个不同资源**，最多进行 **1 个投机加载**；非关键预取另有 **128 MiB** 的保留预算。超出预算的内容可以延后，当前显示和作者明确要求阻塞等待的内容有不同优先级。

这让加载开销集中在附近的演出。图片按角色解码，Opus 与视频按各自的流式路径读取；正式发行使用 WebP / Ogg Opus 和 Hakutaku v2，资源随机读取不需要先把整包解密到磁盘。

**tday 四个检查点的进程组 RSS 中位数分别为 210.5、212.2、218.5 与 233.8 MiB。** 这只是本次素材与状态下的结果。128 MiB 约束的是非关键预取保留量，不包含当前舞台、所有在途解码及 GPU / codec 开销，也不是整个进程的内存上限。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/assets.rs">资源计划</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md">内容与发行合同</a>。

## 六、Editor 保持一份源码，Preview 使用独立进程

Editor 的 Text、Blocks 与 Inspector 编辑同一份源文档。Blocks 是源码的结构投影，字段修改作用于准确的 source range；无法理解的语法可以保留并只读显示。命令字段来自 Loader，补全和 Inspector 共用规则。

<figure class="architecture-figure">
  <figcaption><span>05 / AUTHORING</span><strong>创作状态与运行状态，跨进程协作</strong></figcaption>
  <div class="authoring-flow">
    <section><strong>Editor / GPUI</strong><span>源文档 → Text / Blocks / Inspector</span><span>编辑、撤销、保存与诊断</span></section>
    <div class="protocol-link"><strong>版本化 authoring 协议</strong><span>文档快照 / 补丁 / 执行定位 ↓</span><span>执行位置 / 有界状态快照 ↑</span></div>
    <section><strong>Preview / Engine</strong><span>独立原生进程与窗口</span><span>装载 Program，执行并呈现</span></section>
  </div>
</figure>

协议携带会话 generation、request ID 与文档 revision。旧会话和过期文档请求可以在边界被拒绝，执行位置与诊断也对应明确的文档版本。预览可以使用未保存内容，源文件不必为了每次查看而落盘。

游戏存档保存的是运行状态，而作者编辑的是源文档。存档要求 Program fingerprint 匹配；设置、已读、画廊和 profile 独立保存，不随读档一起倒退。明确这些归属，可以避免把编辑器状态、玩家进度与临时 Preview 混在一起。实现入口：<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/authoring/src/lib.rs">Authoring 协议</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/editor.md#单一源码">Editor 单一源码</a>、<a href="https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/model/state.rs">存档恢复</a>。

## 七、bench 告诉我们哪些设计达到了预期

“快”在这里有具体含义：稳定画面占用较少 CPU，持续演出能按屏幕节奏呈现，资源占用在实际素材下可测。下面是 **Kēne 0.16.0** 的四种负载，数值直接读取同一份保留数据。

<figure class="architecture-figure">
  <figcaption><span>06 / TDAY BENCH</span><strong>每种负载分别启动一个进程</strong></figcaption>
  <div class="bench-readout">
    {#each workloads as item}
      <div class="workload-row"><strong>{item.label}</strong><span>{fmt(current.workloads[item.id].cpu_percent)}% CPU</span><span>{fmt(current.workloads[item.id].rss_mib, 1)} MiB RSS</span></div>
    {/each}
  </div>
  <div class="bench-compare"><span>连续位移 CPU：0.15.5 → 0.16.0</span><strong>−{cpuDrop}%</strong><span>{fmt(previous.workloads.motion.cpu_percent)}% → {fmt(current.workloads.motion.cpu_percent)}%</span></div>
</figure>

同素材、同协议下，新版连续位移 CPU 观察值降低 **{cpuDrop}%**，系统呈现的帧间隔 P95 从 **{fmt(metal.previous.p95_ms)} ms** 降到 **{fmt(metal.current.p95_ms)} ms**。同时，平均 GPU 帧耗时从 **{fmt(metal.previous.gpu_mean_ms)} ms 增至 {fmt(metal.current.gpu_mean_ms)} ms**，动态 RSS 从 **{fmt(previous.workloads.motion.rss_mib, 1)} MiB 增至 {fmt(current.workloads.motion.rss_mib, 1)} MiB**。新版的变化需要一起看。

源码能解释哪些重复工作被避免，bench 能验证整个检查点的结果。**这轮没有逐项关闭休眠、改变渲染路径或切换预取策略做消融测试**；版本与测量日期也不同，因此无法给某个设计分配“贡献了多少百分比”，也不把 Rust 或原生架构本身当成普遍更快的证明。

<details class="measurement-details">
  <summary>测试条件、比较范围与下载数据</summary>
  <p>测试机：Apple M5 Pro，15 个逻辑核心，24 GiB 内存，macOS 27.0.1 / ARM64。Kēne 0.16.0 复测于 2026-10-14（北京时间），画面区域为 1920 × 1080。</p>
  <p>tday 教室背景、两张立绘与中文对白构成检查点。连续位移每个方向 300 ms，线性往返。各负载先预热 10 秒，再连续采样 3 × 30 秒，每 5 秒记录 CPU / RSS；显示三段统计的中位数，三段并非独立启动样本。RSS 包含主进程与观察到的子进程，可能重复计入共享页；WindowServer 与驱动开销不归入引擎。</p>
  <p>帧间隔来自另一次系统 Metal 逐帧追踪。音频比较使用统一的 44.1 kHz 双声道 Vorbis 开发兼容素材，区别于正式发行的 Opus。未获得功耗、独占显存、输入延迟或本轮其他平台的运行结果。</p>
  <p>下载的全引擎汇总还保留上轮六条其他运行路径：LetsGal 是 Studio 导出前端，ONScripter 使用私有依赖、预缩放 PNG 与分步位移。不同渲染时钟与未完成的全剧情等价性不构成统一排名。</p>
  <div class="download-links"><a href="/posts/keine-tday/summary.json" download="keine-tday-summary.json">汇总 JSON ↓</a><a href="/posts/keine-tday/all-engines.csv" download="keine-tday-all-engines.csv">完整对比 CSV ↓</a></div>
</details>

Kēne 的设计取舍集中在几个地方：让执行内核保持明确，让原生宿主掌握呈现和唤醒，让创作工具围绕源文档工作，让资源与存储拥有清晰的生命周期。实测提供了检查这些取舍的起点；后续仍需分别验证更多演出、发行包和目标设备。

<div class="article-links"><a href="https://github.com/maincoretech/keine">查看 Kēne 源码 ↗</a><a href="/blog/eiyashou">Eiyashou 语言</a><a href="/blog/keine-development-and-release">开发与发布指南</a></div>

<style>
  .architecture-hero { margin: 4px 0 28px; padding: 28px; background: #244959; border-top: 4px solid #86b6bf; border-radius: 3px; color: #e4edf0; }
  .eyebrow { font: .74rem var(--f-m); letter-spacing: .07em; color: #bedbe0; }
  .architecture-hero h2 { margin: 18px 0 14px; padding: 0; border: 0; font: 700 clamp(1.55rem, 4vw, 2.2rem)/1.45 var(--f-b); color: #eff7f8; }
  .architecture-hero p { color: #d2e1e6; }
  .hero-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #70929f; }
  .hero-metrics strong { display: block; color: #edf7f8; font: 400 1.8rem var(--f-m); }
  .hero-metrics small { font-size: .67rem; margin-left: 4px; }
  .hero-metrics span { display: block; font-size: .75rem; line-height: 1.6; margin-top: 6px; }
  .architecture-hero .hero-note { margin: 20px 0 0; color: #c0d4dc; font-size: .73rem; }
  .architecture-figure { margin: 20px 0; padding: 20px; min-width: 0; background: #dce8ed; border: 1px solid #a7c0cc; border-radius: 3px; }
  .architecture-figure figcaption { display: grid; gap: 6px; margin-bottom: 18px; }
  .architecture-figure figcaption > span { font: .73rem var(--f-m); color: #52798e; letter-spacing: .08em; }
  .architecture-figure figcaption strong { font-size: .96rem; }
  .dependency-layers { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: stretch; }
  .dependency-layers button { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 12px 16px; text-align: left; color: #36576a; background: #cfdee5; border: 1px solid #9cb8c6; font: inherit; cursor: pointer; border-radius: 2px; }
  .dependency-layers button strong { font-size: 1rem; }
  .dependency-layers button span { font-size: .8rem; }
  .dependency-layers button.selected { background: #235e77; border-color: #235e77; color: #edf7f8; }
  .dependency-layers button.selected strong { color: inherit; }
  .dependency-layers button:hover { border-color: #477e98; }
  .dependency-layers button:focus-visible, .article-links a:focus-visible { outline: 2px solid #548faa; outline-offset: 3px; }
  .dependency-arrow { text-align: center; font-size: .72rem; padding: 6px; color: #5d7a89; }
  .layer-detail { min-height: 108px; margin-top: 18px; border-top: 1px solid #b4cbd5; padding-top: 12px; }
  .layer-detail code { display: inline-block; margin: 0; max-width: 100%; overflow-wrap: anywhere; font-size: .76rem; }
  .layer-detail p, .architecture-figure .figure-note { font-size: .8rem; }
  .architecture-figure .figure-note { margin: 14px 0 0; color: #536d7c; }
  .execution-flow { list-style: none; counter-reset: stage; display: grid; gap: 8px; margin: 0; padding: 0; }
  .execution-flow li { counter-increment: stage; display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 4px 12px; margin: 0; padding: 11px 12px; border-left: 2px solid #739dae; background: #ccdee6; }
  .execution-flow li::before { content: counter(stage, decimal-leading-zero); grid-row: span 2; font: .8rem var(--f-m); color: #5d8092; padding-top: 3px; }
  .execution-flow strong { font-size: .85rem; }
  .execution-flow li span { font-size: .77rem; }
  .scheduler { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); align-items: stretch; gap: 12px; }
  .scheduler section { padding: 12px; border-top: 3px solid #749aaa; background: #ccdee6; }
  .mode-label { display: block; font: .75rem var(--f-m); color: #52798e; margin-bottom: 10px; }
  .scheduler strong { font-size: .88rem; }
  .scheduler p { font-size: .8rem; }
  .schedule-divider { align-self: center; text-align: center; color: #618394; }
  .composition { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: center; }
  .render-layers { display: grid; gap: 7px; }
  .render-layers span { padding: 12px; border-left: 3px solid #739dae; background: #ccdee6; font-size: .82rem; }
  .render-target { display: grid; gap: 8px; padding: 16px 12px; border: 1px solid #9cb8c6; text-align: center; font-size: .8rem; }
  .authoring-flow { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .authoring-flow section { display: grid; gap: 9px; padding: 14px; background: #ccdee6; border-left: 3px solid #739dae; font-size: .8rem; }
  .authoring-flow strong { font-size: .88rem; }
  .protocol-link { display: grid; gap: 5px; padding: 8px 14px; font-size: .75rem; color: #52798e; }
  .workload-row { display: grid; grid-template-columns: minmax(0, 1.1fr) repeat(2, minmax(0, 1fr)); gap: 8px; align-items: baseline; padding: 12px 0; border-bottom: 1px solid #b4cbd5; font-size: .8rem; }
  .workload-row span { text-align: right; font: .82rem var(--f-m); font-variant-numeric: tabular-nums; }
  .bench-compare { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; margin-top: 18px; font-size: .8rem; }
  .bench-compare strong { font: 400 2rem var(--f-m); color: #235e77; }
  .measurement-details { margin: 18px 0; padding: 16px; background: #dce8ed; font-size: .85rem; }
  .measurement-details summary { cursor: pointer; font-weight: 700; color: #33586b; }
  .download-links, .article-links { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 16px; font-size: .85rem; }
  .article-links { border-top: 2px solid #8daebd; padding-top: 18px; }
  .article-links a { padding: 9px 12px; border: 1px solid #91acba; border-radius: 2px; }
  .article-links a:first-child { color: #edf7f8; background: #235e77; border-color: #235e77; }
  @media (max-width: 600px) {
    .scheduler, .composition { grid-template-columns: minmax(0, 1fr); }
    .schedule-divider { padding: 2px; }
    .architecture-figure { padding: 15px 12px; }
  }
  @media (max-width: 520px) {
    .architecture-hero { padding: 22px 18px; }
    .hero-metrics { grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .hero-metrics > div { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .hero-metrics strong { font-size: 1.65rem; }
    .hero-metrics span { text-align: right; }
    .dependency-layers button { flex-wrap: wrap; padding: 10px 12px; }
    .workload-row { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
    .workload-row strong { grid-column: 1 / -1; }
    .workload-row span { text-align: left; font-size: .78rem; }
  }
</style>

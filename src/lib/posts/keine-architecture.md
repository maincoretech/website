---
title: Kēne 的架构
date: 2026-10-14
author: maincore
description: 从等玩家翻页讲起，看看 Kēne 怎样推进剧本、刷新画面和播放声音
priority: 4
category: tech
titleEn: "Kēne Architecture"
descriptionEn: "How Kēne advances scripts, renders scenes, and plays audio while waiting for the player."
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
  const fmt = (value, digits = 2) => value.toFixed(digits);
  const cpuDrop = ((1 - current.workloads.motion.cpu_percent / previous.workloads.motion.cpu_percent) * 100).toFixed(1);
</script>

读视觉小说时，玩家可以在一句对白上停很久。背景音乐还在播，镜头也可能还在动。如果这一幕已经完全静下来，窗口就可以等到下一次输入再更新。Kēne 把剧本推进、画面刷新和声音播放分开调度，三件事可以按各自的节奏跑。

下面写的是 **0.16.0 / 83b00c2091bb** 的实现，文末附上同一版本的性能记录。Engine 用 Rust、Bevy 和 wgpu，桌面 Editor 用 GPUI。

## 模块分工

从一次点击往回看，Engine 先把输入交给 Core。Core 根据已经加载的剧本算出下一步，Engine 再把结果画出来。这份可执行剧本由 Loader 准备，三层的依赖方向是 **Engine → Loader → Core**。

| 模块 | 职责 | 位置 |
| --- | --- | --- |
| Core | 定义 Action、Program、State，执行表达式、分支、对白和等待 | `crates/core` |
| Loader | 解析脚本、读取配置与资源、生成诊断和 Program；处理兼容格式 | `crates/loader` |
| Engine | 把输入交给 Core，将 State 同步到 Bevy，管理窗口、音视频、GPU 和存储 | `src/runtime`、`scene`、`render`、`ui`、`storage` |

这样写分支和存档测试时，可以直接跑剧本逻辑，省去启动窗口。Core、Loader 和 Editor 与 Engine 共用的 authoring 协议都不依赖 Bevy。兼容其他工程用到的字段留在 Loader 的适配器里，WebP 的有界解码则由 Media crate 处理。

Core 把一条动作叫作 Action，整理后的整部剧本是 Program。读到哪一句、变量是什么、舞台上有什么、眼下在等什么，这些运行时信息都放在 State 里。 [Core 源码](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/lib.rs) · [Loader 源码](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/loader/src/lib.rs)

## 剧本推进

开发时，Loader 把 Eiyashou 源码解析成 Program。正式包已经带着编译结果，启动时直接加载就行。执行器借用 Program 里的 Action，只更新 State。

比如切进教室，剧本可以一口气设置背景、摆好立绘，然后停在第一句对白。`step` 会一直执行到这类等待点。对白、选项、输入确认和阻塞演出都可能让它停下来，等玩家操作或演出结束，Engine 再继续叫它往下走。于是立绘可以继续移动，剧本仍停在同一句。

存档也沿着这些执行边界保存。遇到无法直接保存的瞬态演出，宿主会留一份动作开始前可以恢复的状态。 [Core 的 `step`](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/runtime/step.rs) · [Engine 的执行驱动](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/script/driver.rs)

## 窗口调度与音频

一句话还在打字，或者画面里有动画、自动推进、UI 动效，窗口就还有活要干。在 macOS 上，活跃窗口按显示器的刷新节奏更新。画面稳定后，窗口可以等下一次输入、Editor 消息或定时任务。Runtime 用 Active、Loading、Idle 和 Background 区分这些状态。

阅读时可以暂停演出用的虚拟时间，需要持久化的计时仍用真实时间。恢复时会处理积压的渲染时间戳，不让等待期间的时间一下子塞进动画第一帧。

背景音乐可以照常播放。逻辑播放器和音频设备的输出流分开管理，设备恢复由 worker 处理，完成后再唤醒宿主。这样一张静止画面可以留在屏幕上，音频设备继续拿数据。 [Runtime 调度](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/platform.rs) · [音频设计](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md#音频输出)

## 渲染与资源加载

画面和 UI 都在 **1920 × 1080** 的设计空间里排，窗口缩放和黑边统一算一次。渲染先把舞台、普通 UI、对话和弹窗按顺序画进中间目标，再由最后一个活动相机输出到窗口，省去重复复制成品画面的开销。

普通背景做 Fade 或 Crossfade，符合条件时可以用两张纹理一次画完。碰到变换、滤镜、遮罩或交错图层，就沿用原来的绘制路径。新管线和纹理准备好之后才切换。

加载资源时，先照顾正在演的这一幕。向前预取最多挑 **8 个不同资源**，同时最多跑 **1 个投机加载**。非关键预取最多保留 **128 MiB**，当前舞台、在途解码、GPU 和编解码器的开销另计。

开发工程和发行包共用读取接口。Loader 按顺序挂载只读内容，后挂载的同路径资源覆盖前面的，路径仍受挂载根约束。图片按用途解码，Opus 和视频边读边用。正式发行采用 WebP、Ogg Opus 和 Hakutaku v2，游戏可以按需读取包里的内容。 [背景转场](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/background/crossfade.rs) · [资源加载计划](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/assets.rs) · [架构约定](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md)

## Editor 与 Preview

在 Blocks 里改一个字段，最终改的是 Text 里对应的那段源码。三种编辑方式共用这份文档，补全和 Inspector 也从 Loader 读同一套参数定义。Blocks 遇到无法识别的语法会保留原文，显示为只读。

打开 Preview 时，用来跑游戏的是独立的原生进程。Editor 把当前文档的快照和改动发过去，所以未保存的内容也能预览。Preview 回报执行位置与状态。协议用会话 generation、request ID 和文档 revision 避免旧会话或过期文档的请求混进来。

玩家存档记的是游戏走到哪里，读档时会检查 Program fingerprint。设置、已读记录、画廊和 profile 各自保存，读档只恢复游戏的运行状态。 [Authoring 协议](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/authoring/src/lib.rs) · [Editor 的单一源码设计](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/editor.md#单一源码) · [存档恢复](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/model/state.rs)

## 性能实测

用同一段教室场景分别测静止、持续位移和播放声音时的负载。下表是 2026-10-14 跑的 Kēne 0.16.0，测试机为 Apple M5 Pro、15 个逻辑核心、24 GiB 内存，系统为 macOS 27.0.1 / ARM64，画面为 1920 × 1080。

<table>
  <thead><tr><th>负载</th><th>CPU</th><th>RSS</th></tr></thead>
  <tbody>{#each workloads as item}<tr><th>{item.label}</th><td>{fmt(current.workloads[item.id].cpu_percent)}%</td><td>{fmt(current.workloads[item.id].rss_mib, 1)} MiB</td></tr>{/each}</tbody>
</table>

同样的素材和采样流程，0.16.0 跑连续位移时，CPU 从 0.15.5 的 **{fmt(previous.workloads.motion.cpu_percent)}%** 降到 **{fmt(current.workloads.motion.cpu_percent)}%**，下降 **{cpuDrop}%**。另一次 Metal 追踪测得 **{fmt(metal.current.fps)} FPS**，P95 帧间隔从 **{fmt(metal.previous.p95_ms)} ms** 降到 **{fmt(metal.current.p95_ms)} ms**，P99 也是 **{fmt(metal.current.p99_ms)} ms**。

这次 CPU 下来了，另外两项却涨了。平均 GPU 帧耗时从 **{fmt(metal.previous.gpu_mean_ms)} ms** 升到 **{fmt(metal.current.gpu_mean_ms)} ms**，连续位移时的 RSS 从 **{fmt(previous.workloads.motion.rss_mib, 1)} MiB** 升到 **{fmt(current.workloads.motion.rss_mib, 1)} MiB**。

### 测试条件

- 检查点包含教室背景、两张立绘与中文对白；位移为每个方向 300 ms 的线性往返。
- 每种负载单独启动，预热 10 秒，连续采样 3 × 30 秒，每 5 秒记录 CPU / RSS，取三段统计中位数。三段不是三次独立启动。
- 100% CPU 表示一个逻辑核心。RSS 合计主进程和观察到的子进程，可能重复计入共享页，不含 WindowServer 与驱动。
- 帧间隔来自另一次系统 Metal 追踪，追踪本身可能影响调度。音频使用 44.1 kHz 双声道 Vorbis 开发素材，不是正式发行的 Opus。
- 未测功耗、独占显存、输入延迟和其他平台；也没有逐项关闭调度、渲染或预取功能做对照，不能把版本差值归因于某一个设计。

原始汇总里还能看到六条历史测试路径，适合查某个负载当时怎么跑。LetsGal 用的是 Studio 导出前端，ONScripter 用了私有依赖、预缩放的 PNG 和分步位移。各自的渲染时钟不同，整部剧情也没有逐条做等价性验证。

[汇总 JSON](/posts/keine-tday/summary.json) · [完整 CSV](/posts/keine-tday/all-engines.csv)

相关：[Kēne 源码](https://github.com/maincoretech/keine)、[Eiyashou 语法](/blog/eiyashou)、[开发与发布](/blog/keine-development-and-release)。

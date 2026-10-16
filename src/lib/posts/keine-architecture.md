---
title: Kēne 的架构
date: 2026-10-14
author: maincore
description: Core、Loader、原生渲染、休眠调度与资源管理
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
  const fmt = (value, digits = 2) => value.toFixed(digits);
  const cpuDrop = ((1 - current.workloads.motion.cpu_percent / previous.workloads.motion.cpu_percent) * 100).toFixed(1);
</script>

Kēne 用 Rust、Bevy 和 wgpu 运行视觉小说，Editor 使用 GPUI。剧本按交互点推进，画面按需要刷新，两者不共用一套更新节奏。

本文记录 **0.16.0 / 83b00c2091bb** 的实现和 tday 测试，不代表最新版。

## 模块分工

依赖方向是 **Engine → Loader → Core**。

| 模块 | 职责 | 位置 |
| --- | --- | --- |
| Core | 定义 Action、Program、State，执行表达式、分支、对白和等待 | `crates/core` |
| Loader | 解析脚本、读取配置与资源、生成诊断和 Program；处理兼容格式 | `crates/loader` |
| Engine | 把输入交给 Core，将 State 同步到 Bevy，管理窗口、音视频、GPU 和存储 | `src/runtime`、`scene`、`render`、`ui`、`storage` |

Core、Loader 和 Editor–Engine 共用的 authoring 协议都不依赖 Bevy，剧本逻辑可以脱离窗口测试。外部工程的特殊字段留在 Loader 的适配器里。Media crate 单独负责有界 WebP 解码。

Core 中，Action 是一个动作，Program 是整理后的剧本，State 保存执行位置、变量、舞台和等待状态。

源码：[Core](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/lib.rs)、[Loader](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/loader/src/lib.rs)。

## 剧本推进

开发时由 Loader 把 Eiyashou 源码解析成 Program；发行时直接加载编译结果，不必每帧解析源码。

Core 的 `step` 连续处理可立即执行的动作，遇到对白、选项、输入确认或阻塞演出时返回等待结果。玩家操作或演出结束后，Engine 再恢复推进。因此，立绘可以持续移动，剧本仍停在同一句对白。

执行器借用 Program 中的 Action，只修改 State。存档按执行边界保存；遇到不能直接保存的瞬态演出，宿主保留动作前的可恢复状态。

源码：[Core step](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/runtime/step.rs)、[执行驱动](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/script/driver.rs)。

## 窗口调度与音频

Runtime 按工作状态切换 Active、Loading、Idle 或 Background。文字、动画、自动推进和 UI 动效需要更新；画面稳定后，窗口循环等待输入、Editor 消息或定时任务唤醒。macOS 活跃状态按显示器刷新节奏更新。

休眠时可以暂停虚拟时间，持久化计时仍使用真实时间。恢复演出时会处理积压的渲染时间戳，避免把阅读等待算进动画第一帧。

逻辑播放器与物理音频流分开管理，设备恢复交给 worker，完成后唤醒宿主。播放 BGM 不要求静态画面一直重绘。

源码：[Runtime 调度](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/runtime/platform.rs)、[音频设计](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md#音频输出)。

## 渲染与资源加载

场景和 UI 使用统一的 **1920 × 1080** 设计空间，窗口缩放和留黑边由同一处转换。舞台、普通 UI、对话与弹窗依次画入中间目标，最后一个活动相机输出到窗口，避免重复复制最终画面。

普通背景 Fade / Crossfade 在满足条件时合并为一次双纹理绘制；有变换、滤镜、遮罩或交错图层时仍走原路径。新管线和纹理准备好后才切换。

Loader 按顺序挂载只读内容，后挂载覆盖先挂载，路径不能越出挂载根。开发工程与发行资源使用同一读取接口。

当前舞台优先加载。预测预取只保留前 **8 个不同资源**，同时最多 **1 个投机加载**；非关键预取保留量上限为 **128 MiB**。这不是整个进程的内存上限，不包含当前舞台、所有在途解码和 GPU / codec 开销。

图片按用途解码，Opus 和视频走流式读取。正式发行使用 WebP、Ogg Opus 和 Hakutaku v2，不需要先把整包解密到磁盘。

源码：[背景转场](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/background/crossfade.rs)、[资源计划](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/src/scene/assets.rs)、[架构约定](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/architecture.md)。

## Editor 与 Preview

Text、Blocks 和 Inspector 编辑同一份源码。Blocks 根据源码生成结构视图，字段修改写回对应范围；无法识别的语法保留为只读。补全和 Inspector 共用 Loader 的参数定义。

Preview 是独立原生进程，通过 authoring 协议接收文档快照、补丁和执行请求，返回执行位置与状态。协议携带会话 generation、request ID 和文档 revision，用来拒绝旧会话或过期文档的请求。未保存内容也可以预览。

玩家存档保存运行状态，要求 Program fingerprint 匹配。设置、已读、画廊和 profile 独立保存，不随读档回退。

源码：[Authoring 协议](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/authoring/src/lib.rs)、[Editor](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/editor.md#单一源码)、[存档恢复](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/crates/core/src/model/state.rs)。

## tday 实测

以下数据来自 2026-10-14 的 Kēne 0.16.0。测试机为 Apple M5 Pro、15 个逻辑核心、24 GiB 内存、macOS 27.0.1 / ARM64，画面为 1920 × 1080。

<table>
  <thead><tr><th>负载</th><th>CPU</th><th>RSS</th></tr></thead>
  <tbody>{#each workloads as item}<tr><th>{item.label}</th><td>{fmt(current.workloads[item.id].cpu_percent)}%</td><td>{fmt(current.workloads[item.id].rss_mib, 1)} MiB</td></tr>{/each}</tbody>
</table>

同素材、同协议下，连续位移 CPU 从 0.15.5 的 **{fmt(previous.workloads.motion.cpu_percent)}%** 降至 **{fmt(current.workloads.motion.cpu_percent)}%**，降幅 **{cpuDrop}%**。Metal 追踪得到 **{fmt(metal.current.fps)} FPS**，P95 / P99 帧间隔均为 **{fmt(metal.current.p95_ms)} ms**，此前 P95 为 **{fmt(metal.previous.p95_ms)} ms**。

同时，平均 GPU 帧耗时从 **{fmt(metal.previous.gpu_mean_ms)} ms** 增至 **{fmt(metal.current.gpu_mean_ms)} ms**，动态 RSS 从 **{fmt(previous.workloads.motion.rss_mib, 1)} MiB** 增至 **{fmt(current.workloads.motion.rss_mib, 1)} MiB**。

### 测试条件

- 检查点包含教室背景、两张立绘与中文对白；位移为每个方向 300 ms 的线性往返。
- 每种负载单独启动，预热 10 秒，连续采样 3 × 30 秒，每 5 秒记录 CPU / RSS，取三段统计中位数。三段不是三次独立启动。
- 100% CPU 表示一个逻辑核心。RSS 合计主进程和观察到的子进程，可能重复计入共享页，不含 WindowServer 与驱动。
- 帧间隔来自另一次系统 Metal 追踪，追踪本身可能影响调度。音频使用 44.1 kHz 双声道 Vorbis 开发素材，不是正式发行的 Opus。
- 未测功耗、独占显存、输入延迟和其他平台；也没有逐项关闭调度、渲染或预取功能做对照，不能把版本差值归因于某一个设计。

原始汇总还包含六条历史引擎路径。LetsGal 是 Studio 导出前端，ONScripter 使用私有依赖、预缩放 PNG 和分步位移。不同渲染时钟和未验证的全剧情差异，不适合排成统一名次。

[汇总 JSON](/posts/keine-tday/summary.json) · [完整 CSV](/posts/keine-tday/all-engines.csv)

相关：[Kēne 源码](https://github.com/maincoretech/keine)、[Eiyashou 语法](/blog/eiyashou)、[开发与发布](/blog/keine-development-and-release)。

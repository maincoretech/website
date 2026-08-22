---
title: Hakutaku｜另一个资源包格式
date: 2026-08-22
priority: 6
---

## Hakutaku v1

[Hakutaku](https://github.com/maincoretech/hakutaku) 是为视觉小说设计的认证式资源格式。一个完整的结构由签名快照 `game.haku` 与若干不可变、内容寻址的 `.taku` 数据段组成

在保留随机读取和流式播放能力的同时，提供签名与完整加密能力。

v1 固定使用 AES-256-GCM、Ed25519 与 BLAKE3

针对脚本、UI、立绘、背景、短语音、BGM 和视频提供 Hot、Normal、Transient、Streaming 四种访问策略

相较于 Hexz 使用的 LRU 缓存，Hakutaku 改用有界 CLOCK 缓存。

Kēne 0.8.1（提交 `4df5e17804d0`）在 Windows/x86_64、8 个逻辑线程、Intel UHD Graphics 620 的设备上，从 E: 机械硬盘读取 205.3 MiB Hakutaku 负载：Hot 首次访问为 **102.2 MiB/s**，CLOCK 重复访问为 **849.8 MiB/s**；Normal probation 为 **18.3 MiB/s**，CLOCK resident 为 **1,023.1 MiB/s**；512 次随机 4 KiB seek 则由首次访问的 **405 IOPS** 提升至重复访问的 **5,151 IOPS**。报告未记录硬盘具体型号，也未强制清空操作系统与硬盘缓存，因此这些数字反映实际端到端重复访问，而不是隔离的 LRU/CLOCK 算法 A/B。

在 Apple M5 Pro、24 GB 内存、macOS 27.0 的 warm filesystem cache 测试中：

- 32 MiB 流式资源顺序读取约 **1,640 MiB/s**
- 100,000 项资源目录打开耗时 **17.169 ms**
- 100,000 项目录内 1,000 次随机路径查找耗时 **0.523 ms**，后端读取为 **0 bytes**
- 100,000 项未修改工程使用开发缓存重建耗时由 **4.974 s** 降至 **2.031 s**
- 16 MiB 重复逻辑内容最终产生约 **4.004 MiB** 加密段数据

完整设计、访问策略与 benchmark 见[技术文章](/blog/hakutaku)。

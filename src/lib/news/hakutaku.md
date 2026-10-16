---
title: Hakutaku｜另一个资源包格式
date: 2026-08-22
priority: 6
---

[Hakutaku](https://github.com/maincoretech/hakutaku) 是面向视觉小说的资源格式。这次介绍 v1：一个签名快照 `game.haku`，配上若干可跨版本复用的 `.taku` 数据段。

它使用 AES-256-GCM、Ed25519 和 BLAKE3，支持加密、发行者认证、随机读取和增量构建。脚本、图片、短语音和流媒体分别采用 Hot、Normal、Transient、Streaming 策略，控制分块和缓存。

在 Apple M5 Pro、24 GB 内存、macOS 27.0 的预热文件系统缓存测试中，32 MiB 流式资源顺序读取约 1,640 MiB/s，十万项资源目录打开耗时 17.169 ms。这些是特定负载的结果，不代表冷盘或其他设备的表现。

Kēne 0.8.1 也做了 Windows 机械硬盘测试。重复访问比首次访问快，但没有清空系统和硬盘缓存，不能据此判断 CLOCK 比 Hexz 的 LRU 更快。

设计、完整数据和测试条件见[技术文章](/blog/hakutaku)。

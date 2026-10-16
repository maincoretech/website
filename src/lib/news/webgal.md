---
title: WebGAL_k｜桌面端视觉小说引擎
date: 2026-06-18
priority: 1
---

WebGAL_k 基于 [WebGAL](https://github.com/OpenWebGAL/WebGAL)，用 [Tauri v2](https://v2.tauri.app) 打包桌面应用，用 [hexz](https://github.com/maincoretech/hexz_k) 将游戏资源装进单个 `.hxz` 文件。资源包可以复用未修改的数据，方便后续增量更新。

顺手把 yarn 换成了 bun，更新了 PixiJS 和 React，也做了一些性能调整。目前主要用于我们自己的游戏。

前期修改和测试基本由我（shiftz）完成，有问题欢迎提 issue。目标是先做好 Windows、macOS 和 Linux（AppImage）。移动端可以看看 [sli 分支](https://github.com/k43Lab/WebGAL_k_sli)：它在引入 hexz 和后续大改之前分出，更接近上游。

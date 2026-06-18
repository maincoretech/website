---
title: WebGAL_k — 桌面端视觉小说引擎
date: 2026-06-18
priority: 2
---

这是一个简单的介绍，是针对

### WebGAL_k

- 基于 [WebGAL](https://github.com/OpenWebGAL/WebGAL) / [Tauri v2](https://v2.tauri.app) / [hexz](https://github.com/maincoretech/hexz_k)，将游戏资源打包为单个 `.hxz` 归档。

- 当然也把~~慢得要死的~~yarn换成了bun

- 更新了pixijs和react，在此之上优化了一部分性能


### 与上游 WebGAL 差异

| 上游 | WebGAL_k |
|------|----------|
| asar 包 | .hxz 归档 |
| electron 打包 | Tauri 打包 |
| 全量重新部署 | .hxz 底层差量更新友好 |
| 可以使用图形化编辑器等等 | 只用于我们自己的游戏 |

### 写在最后

前期的几乎所有引擎修改是我（shiftz）引入和测试的，多有不足，还请积极针对相关功能提issue
目标从一开始就是先做好桌面端，也就是Windows/macOS/Linux（通过Appimage），移动端可以去看看隔壁的[sli版本](https://github.com/k43Lab/WebGAL_k_sli)，这个版本是在我引入hexz包和做了一大堆修改前分支的，所以相距上上游没那么远

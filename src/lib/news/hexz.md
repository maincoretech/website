---
title: hexz_k｜游戏资源打包工具
date: 2026-06-18
priority: 2
---

基于 [hexz](https://github.com/hexz-org/hexz) 的游戏资源打包工具，提供命令行和 egui 界面，支持 Windows、macOS 和 Linux。

~~it just work~~

## 命令

| 命令 | 说明 |
|------|------|
| `hexz pack <in> <out>` | 打包目录为 .hxz |
| `hexz list <archive>` | 列出所有文件 |
| `hexz read <archive> <path>` | 读取单个文件 |
| `hexz extract <archive>` | 解包所有文件 |
| `hexz show <archive>` | 查看元数据 |
| `hexz gui` | 启动 GUI 模式 |

可选 LZ4 / Zstd 压缩和 AES-256-GCM 加密，也可按需随机读取单个文件。

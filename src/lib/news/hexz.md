---
title: hexz_k — 游戏资源打包工具
date: 2026-06-18
priority: 1
---

## hexz_k

基于 [hexz](https://github.com/hexz-org/hexz) 归档格式的游戏资源打包工具，提供 CLI 和 GUI

~~it just work~~

### 命令

| 命令 | 说明 |
|------|------|
| `hexz pack <in> <out>` | 打包目录为 .hxz |
| `hexz list <archive>` | 列出所有文件 |
| `hexz read <archive> <path>` | 读取单个文件 |
| `hexz extract <archive>` | 解包所有文件 |
| `hexz show <archive>` | 查看元数据 |
| `hexz gui` | 启动 GUI 模式 |

### 特性

- **LZ4 / Zstd** 压缩可选
- **AES-256-GCM** 加密支持
- **O(1) 随机访问**，按需读取单文件
- **跨平台**：Windows / macOS / Linux
- GUI 基于 egui
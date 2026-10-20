# maincore.work

[English](README.md) | 简体中文

[maincore 官网](https://maincore.work)源码，包含项目介绍、性能对比、开发文章和交互式水面背景。

## 技术栈

- Svelte 5 + SvelteKit 2，通过 `adapter-static` 预渲染
- MDsveX：Markdown 文章与内嵌 Svelte 组件
- Three.js：水面场景与浮动物体
- MiniSearch：支持中文的全文搜索
- `@fontsource`：自托管字体

## 本地开发

安装 Bun 和 Node.js，然后运行：

```bash
bun install
bun run dev
```

## 检查与构建

```bash
node --test tests/*.test.js
bun run build
bun run preview
```

构建输出到 `build/`，包含 Brotli 预压缩资源。将该目录部署到静态托管服务即可；`preview` 用于在本地预览构建结果。

## 目录结构

- `src/routes/`：页面与路由数据
- `src/lib/site/`：站点布局、水面场景、项目演示与性能图表
- `src/lib/posts/`：已发布的 Markdown 文章
- `src/lib/news/`：已下线的动态源稿，仅留存参考，不发布或索引
- `src/lib/products.js`：项目目录
- `static/benchmarks/`：性能测试数据
- `static/posts/`：文章资源与相关数据
- `tests/`：水面运动、图表刻度与测试数据校验

性能数据只对应记录中的版本与测试条件，不代表引擎的综合排名。更新图表时，请同步维护原始测量数据与测试方法。

## 许可证

[网站代码：MIT](LICENSE-MIT) · [原创文章：CC BY-NC-ND 4.0](LICENSE-CONTENT.md)。

导入的 Kēne 和 Hakutaku 文档保留原许可，详见[适用范围](LICENSE)。

## 项目文档

`/docs/keine` 和 `/docs/hakutaku` 使用项目仓库的 Markdown 快照。
审阅源文档修改后，运行 `node scripts/sync-docs.mjs /path/to/dev`，
路径指向同时包含两个仓库的父目录；将正文和来源摘要一起提交。
正常构建只读取快照，不需要相邻仓库或联网。
`src/lib/docs/sources.json` 记录来源提交、正文摘要及是否包含未提交修改，发布前请核对。

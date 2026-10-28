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
bun run check
bun run preview
```

构建输出到 `build/`，包含 Brotli 预压缩资源。将该目录部署到静态托管服务即可；`preview` 用于在本地预览构建结果。

## 目录结构

- `src/routes/`：页面与路由数据
- `src/lib/site/`：站点布局、水面场景、项目演示与性能图表
- `src/lib/posts/`：已发布的 Markdown 文章
- `src/lib/news/`：旧动态源稿，发布为 `/archive/news` 历史归档，原 `/news` 地址永久重定向
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
`src/lib/docs/sources.json` 记录已提交来源、项目版本、文档修改日期和正文摘要，发布前请核对。


## 发布前检查与文档同步

- `bun run check`：单元测试、生产构建，以及生成页面的链接、锚点、分享元数据、站点地图、404 和文档来源检查。
- `bunx playwright install chromium webkit` 后运行 `bun run test:browser`：桌面 Chromium、手机尺寸 Chromium、WebKit 的导航、搜索、语言、目录、回退与 404 回归。可用 `PLAYWRIGHT_BROWSERS_PATH=node_modules/.cache/ms-playwright` 把浏览器放在项目内。
- GitHub 的 Website checks 在 PR 和 main 推送时运行，不自动发布。WebKit 测试不等于 iPhone 真机验收。Chromium 另测水面触摸按住、移动、松手、多指干扰与正文原生滚动；这项 CDP 回放在 WebKit 中明确跳过。
- Cloudflare 部署 `build/`，使用 `404-page` 与 `_redirects`。旧 `/news` 地址永久跳转到 `/archive/news`；归档明确标注历史内容。
- 发布后运行 `bun run check:live`，或手动触发 Check published website，检查真实的 301/404 状态与新页面。托管集成发送成功部署事件时也会触发。
- `node scripts/sync-docs.mjs /path/to/dev` 仅导入项目已提交 HEAD，并记录版本、修改日期、revision 和哈希；不带入其他任务的未提交修改。加 `--check` 可只检查是否过期。

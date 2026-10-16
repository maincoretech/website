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

[MIT](LICENSE)

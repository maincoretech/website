# maincore.work

maincore 官方站点，基于 SvelteKit + MDsveX 构建的静态博客。

## 技术栈

- **SvelteKit 2** + adapter-static（Brotli 预压缩）
- **MDsveX** — Markdown 文章 + frontmatter
- **MiniSearch** — 全文搜索（CJK 自定义分词）
- **@fontsource** — 自托管字体（Lato / Oswald / Roboto Condensed / Inconsolata）

## 开发

```bash
bun install
bun run dev
```

## 构建

```bash
bun run build
```

## License

MIT

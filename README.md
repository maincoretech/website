# maincore.work

English | [简体中文](README.zh-CN.md)

Source for the [maincore website](https://maincore.work): projects, benchmark comparisons, development articles, and an interactive water background.

## Stack

- Svelte 5 and SvelteKit 2, prerendered with `adapter-static`
- MDsveX for Markdown articles and embedded Svelte components
- Three.js for the water scene and floating models
- MiniSearch for full-text search, including Chinese text
- Self-hosted fonts from `@fontsource`

## Development

Install Bun and Node.js, then run:

```bash
bun install
bun run dev
```

## Checks and production build

```bash
node --test tests/*.test.js
bun run build
bun run preview
```

The static site is written to `build/`, including Brotli-precompressed assets. Deploy that directory to a static host. `preview` serves the production build locally.

## Source layout

- `src/routes/` — pages and route data
- `src/lib/site/` — site layout, water scene, product demos, and benchmark views
- `src/lib/posts/` — published Markdown articles
- `src/lib/news/` — retired news sources, kept for reference but not published or indexed
- `src/lib/products.js` — project catalog
- `static/benchmarks/` — benchmark evidence
- `static/posts/` — article assets and supporting data
- `tests/` — water-motion, chart-scale, and benchmark-data checks

Benchmark results describe the recorded versions and test conditions, not overall engine rankings. Keep the source measurements and methodology in sync when updating the charts.

## License

[Code: MIT](LICENSE-MIT) · [Articles: CC BY-NC-ND 4.0](LICENSE-CONTENT.md).

Imported Kēne and Hakutaku docs retain their original licenses; see [scope](LICENSE).

## Project documentation

`/docs/keine` and `/docs/hakutaku` use Markdown snapshots from the project repositories.
After reviewing source changes, run `node scripts/sync-docs.mjs /path/to/dev`
(the parent containing both repositories). Commit the updated content and source
hashes together. Normal builds use the snapshots and need no sibling checkout
or network access. `src/lib/docs/sources.json` records source revisions and
whether each snapshot includes uncommitted edits; review these before publishing.

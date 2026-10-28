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
bun run check
bunx playwright install chromium webkit
bun run test:browser
bun run preview
```

The static site is written to `build/`, including Brotli-precompressed assets. Deploy that directory to a static host. `preview` serves the production build locally.

## Source layout

- `src/routes/` — pages and route data
- `src/lib/site/` — site layout, water scene, product demos, and benchmark views
- `src/lib/posts/` — published Markdown articles
- `src/lib/news/` — historical news, published under `/archive/news`; old `/news` URLs redirect permanently
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
After reviewing committed source changes, run `node scripts/sync-docs.mjs /path/to/dev`
(the parent containing both repositories). Commit the updated content and source
hashes together. Normal builds use the snapshots and need no sibling checkout
or network access. `src/lib/docs/sources.json` records source revisions project versions, source modification dates and content hashes. Imports use committed
HEAD only, so unrelated working-tree edits never become published documentation.
Use `node scripts/sync-docs.mjs /path/to/dev --check` to detect source drift without writing.

## Release verification

`bun run check` runs unit tests, builds the site, and checks the generated HTML:
internal links and anchors, canonical/share metadata, sitemap, archive redirects,
404 output, share-card size and document provenance. Broken prerender routes fail the build.
The browser suite exercises download/docs navigation, search, language persistence,
nested contents, history/scroll restoration, old links and 404 at desktop/mobile sizes
in Chromium and desktop WebKit. WebKit coverage is not physical iPhone acceptance. Chromium also replays water touch holds, moves, releases, unrelated pointer releases and native reading-panel scrolling; this CDP-only case is explicitly skipped on WebKit.

The GitHub check workflow runs both gates on pull requests and main. It does not deploy.
Deploy `build/` through the existing Cloudflare setup; `wrangler.jsonc` selects
`404-page` and `static/_redirects` preserves legacy News addresses.
After deployment, run `bun run check:live` (or the manual published-site workflow).
Deployment success events also trigger the live check when the hosting integration emits them.
The live gate verifies actual HTTP 301/404 responses; Vite preview alone cannot validate CDN rules.

Browser binaries can stay inside the checkout with
`PLAYWRIGHT_BROWSERS_PATH=node_modules/.cache/ms-playwright` during install and tests.
For a local Chromium-only check with an existing Chrome installation:
`PW_USE_CHROME=1 bun run test:browser --project=chromium --project=mobile-chromium`.

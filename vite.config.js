import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, normalizePath } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from 'mdsvex';

// SvelteKit runs separate server and client builds in the same process.
const buildTime = (process.env.MAINCORE_BUILD_TIME ??= new Date().toISOString());
const metadataQuery = '?post-metadata';
const metadataPrefix = '\0maincore-post-metadata:';
const markdownDirectories = ['posts', 'news'].map((name) =>
  normalizePath(fileURLToPath(new URL(`./src/lib/${name}/`, import.meta.url)))
);
const metadataId = (path) => metadataPrefix + path + '.js';

export default defineConfig({
  plugins: [
    {
      name: 'post-metadata',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (!source.endsWith('.md' + metadataQuery)) return;
        const resolved = await this.resolve(source.slice(0, -metadataQuery.length), importer, { skipSelf: true });
        if (resolved) return metadataId(resolved.id);
      },
      async load(id) {
        if (!id.startsWith(metadataPrefix)) return;
        const path = id.slice(metadataPrefix.length, -'.js'.length);
        if (!markdownDirectories.some((dir) => path.startsWith(dir) && /^[^/\\]+\.md$/.test(path.slice(dir.length))))
          return;
        this.addWatchFile(path);
        const source = await readFile(path, 'utf8');
        const header = source.match(/^\uFEFF?---[^\S\r\n]*\r?\n[\s\S]*?^---[^\S\r\n]*(?=\r?$)/m);
        const parsed = header?.index === 0 ? await compile(header[0]) : undefined;
        return 'export default ' + JSON.stringify(parsed?.data?.fm ?? {});
      },
      handleHotUpdate({ file, server, modules }) {
        const metadata = server.moduleGraph.getModuleById(metadataId(file));
        if (metadata) return [...modules, metadata];
      }
    },
    sveltekit()
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime)
  }
});

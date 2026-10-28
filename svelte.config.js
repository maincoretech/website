import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import remarkComponents from './src/lib/markdown/remark-components.js';
import remarkDocs from './src/lib/markdown/remark-docs.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md', '.svx'],
  preprocess: [
    mdsvex({
      extensions: ['.md', '.svx'],
      remarkPlugins: [remarkDocs, remarkComponents]
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      precompress: 'br',
      strict: true
    }),
    inlineStyleThreshold: 30720,
    prerender: {
      handleHttpError: 'fail'
    }
  }
};

export default config;

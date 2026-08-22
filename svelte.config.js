import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import remarkComponents from './src/lib/markdown/remark-components.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md', '.svx'],
  preprocess: [
    mdsvex({
      extensions: ['.md', '.svx'],
      remarkPlugins: [remarkComponents]
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
      handleHttpError: 'warn'
    }
  }
};

export default config;

import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md', '.svx'],
  preprocess: [
    mdsvex({
      extensions: ['.md', '.svx']
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
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

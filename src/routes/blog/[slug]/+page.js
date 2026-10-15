import { error } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('@sveltejs/kit').EntryGenerator} */
export function entries() {
  const modules = import.meta.glob('$lib/posts/*.md');
  return Object.keys(modules).map((path) => {
    const slug = path.split('/').pop()?.replace('.md', '') ?? '';
    return { slug };
  });
}

/** Validate routes without shipping duplicate raw article bodies. */
export function load({ params }) {
  const modules = import.meta.glob('$lib/posts/*.md');
  if (!Object.keys(modules).some(path => path.endsWith('/' + params.slug + '.md'))) {
    error(404, '文章未找到。');
  }
  return {};
}

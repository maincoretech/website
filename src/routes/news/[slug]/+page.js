import { error } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('@sveltejs/kit').EntryGenerator} */
export function entries() {
  const modules = import.meta.glob('$lib/news/*.md');
  return Object.keys(modules).map((path) => {
    const slug = path.split('/').pop()?.replace('.md', '') ?? '';
    return { slug };
  });
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
  const modules = import.meta.glob('$lib/news/*.md', { query: '?raw', eager: true });
  let raw = '';
  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith(`/${params.slug}.md`)) { raw = mod.default; break; }
  }
  if (!raw) error(404, `News "${params.slug}" 未找到。`);

  const headings = [];
  const body = raw.replace(/---[\s\S]*?---/, '');
  for (const line of body.split('\n')) {
    const m = line.match(/^(#{2,3})\s+(.+)/);
    if (m) headings.push({ text: m[2].trim(), level: 'H' + m[1].length });
  }

  return { headings };
}

import { error } from '@sveltejs/kit';
export const prerender = true;
const modules = import.meta.glob('$lib/news/*.md');
export function entries() { return Object.keys(modules).map(path => ({ slug: path.split('/').pop().replace('.md', '') })); }
export async function load({ params }) {
  const key = Object.keys(modules).find(path => path.endsWith('/' + params.slug + '.md'));
  if (!key) error(404, 'Archived article not found');
  const { default: Content, metadata: meta } = await modules[key]();
  return { Content, meta, slug: params.slug };
}

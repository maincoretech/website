import { error, redirect } from '@sveltejs/kit';
export const prerender = true;
const modules = import.meta.glob('$lib/news/*.md');
export function entries() { return Object.keys(modules).map(path => ({ slug: path.split('/').pop().replace('.md', '') })); }
export function load({ params }) {
  if (!entries().some(item => item.slug === params.slug)) error(404, 'Archived article not found');
  redirect(301, '/archive/news/' + params.slug);
}

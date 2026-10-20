import { error } from '@sveltejs/kit';
import { docs, projects } from '$lib/docs/projects.js';
export const prerender = true;
const modules = import.meta.glob('$lib/docs/content/*/*.md');
export function entries() {
  return docs.map(doc => ({ project: doc.project, slug: doc.href.split('/')[3] }));
}
export async function load({ params }) {
  const doc = docs.find(d => d.project === params.project && (params.slug ? d.slug === params.slug : !d.href.split('/')[3]));
  if (!doc) error(404, 'Document not found');
  const key = Object.keys(modules).find(path => path.endsWith('/' + doc.project + '/' + doc.slug + '.md'));
  const { default: Content } = await modules[key]();
  return { doc, project: projects.find(p => p.id === doc.project), Content };
}

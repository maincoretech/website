import { error, redirect } from '@sveltejs/kit';
import { newsPosts } from '$lib/site/content.js';

export const prerender = true;
export const entries = newsPosts.entries;

export function load({ params }) {
  if (!newsPosts.has(params.slug)) error(404, 'Archived article not found');
  redirect(301, '/archive/news/' + params.slug);
}

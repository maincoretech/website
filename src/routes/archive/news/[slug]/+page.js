import { error } from '@sveltejs/kit';
import { newsPosts } from '$lib/site/content.js';

export const prerender = true;
export const entries = newsPosts.entries;

export async function load({ params }) {
  return (await newsPosts.load(params.slug)) ?? error(404, 'Archived article not found');
}

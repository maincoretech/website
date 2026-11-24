import { error } from '@sveltejs/kit';
import { blogPosts } from '$lib/site/content.js';

export const prerender = true;
export const entries = blogPosts.entries;

export async function load({ params }) {
  return (await blogPosts.load(params.slug)) ?? error(404, '文章未找到。');
}

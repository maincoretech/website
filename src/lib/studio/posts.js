import { architectureHref, blogPosts } from '$lib/site/content.js';

const posts = [...blogPosts.items].sort((a, b) => b.priority - a.priority || b.date.localeCompare(a.date));

export const latestPosts = posts.slice(0, 3);
export const featuredPost = posts.find(({ href }) => href === architectureHref) ?? posts[0];

const groups = new Map();
for (const post of posts) {
  if (post === featuredPost) continue;
  const year = post.date.slice(0, 4);
  if (!groups.has(year)) groups.set(year, []);
  groups.get(year).push(post);
}
export const postGroups = [...groups].sort(([a], [b]) => b.localeCompare(a));

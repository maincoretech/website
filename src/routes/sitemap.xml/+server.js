export const prerender = true;

import { siteConfig } from '$lib/siteConfig.js';
import { docs } from '$lib/docs/projects.js';
import { blogPosts, newsPosts } from '$lib/site/content.js';

/**
 * Sitemap XML — 自动扫描所有页面和博客
 */
export function GET() {
  const base = `https://${siteConfig.domain}`;

  const pages = ['/', '/works', '/product', '/product/keine', '/product/hakutaku', '/blog', '/about'];

  const contentUrls = [...newsPosts.items, ...docs, ...blogPosts.items].map(({ href }) => href);
  const urls = [...pages, '/docs', '/download/keine', '/archive/news', ...contentUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

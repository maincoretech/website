export const prerender = true;

import { siteConfig } from '$lib/siteConfig.js';
import { docs } from '$lib/docs/projects.js';

/**
 * Sitemap XML — 自动扫描所有页面和博客
 */
export async function GET() {
  const base = `https://${siteConfig.domain}`;

  const pages = ['/product', '/product/keine', '/product/hakutaku', '/blog', '/about'];

  const postModules = import.meta.glob('$lib/posts/*.md', { eager: true });
  const blogSlugs = Object.keys(postModules).map((p) => '/blog/' + p.split('/').pop()?.replace('.md', ''));

  const urls = [...pages, '/docs', '/license', ...docs.map(d => d.href), ...blogSlugs];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

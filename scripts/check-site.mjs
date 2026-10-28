// Audit the actual prerendered artifact, not only route source files.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { docs } from '../src/lib/docs/projects.js';
const root = resolve('build');
const origin = 'https://maincore.work';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(resolve(dir,e.name)) : [resolve(dir,e.name)]))).flat();
}
const files = await walk(root);
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
function attributes(raw) {
  return Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1],decode(m[2] ?? m[3])]));
}
const pages = new Map();
for (const path of files.filter(f => f.endsWith('.html'))) {
  const html = await readFile(path,'utf8');
  const tags = [...html.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g)].map(m => ({ tag:m[1], ...attributes(m[2]) }));
  const route = '/' + relative(root,path).replace(/(?:^index)?\.html$/, '');
  pages.set(route, { path, html, tags, ids: new Set(tags.map(t => t.id).filter(Boolean)) });
}
let links = 0;
const titles = new Map();
for (const [route,p] of pages) {
  if (p.tags.some(t => t['http-equiv']?.toLowerCase() === 'refresh')) continue;
  const title = decode(p.html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  assert.ok(title, route + ': missing title');
  const meta = name => p.tags.find(t => t.tag === 'meta' && (t.name === name || t.property === name))?.content;
  assert.ok(meta('description'), route + ': missing description');
  assert.equal(meta('og:title'), title, route + ': mismatched sharing title');
  assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(meta('og:image'),origin + '/social/maincore.png');
  const canonical = p.tags.find(t => t.rel === 'canonical')?.href;
  if (route === '/404') { assert.ok(meta('robots')?.includes('noindex')); assert.equal(canonical,undefined); }
  else {
    assert.equal(canonical,origin + (route === '/' ? '/product' : route), route + ': canonical');
    if (titles.has(title)) assert.equal(canonical,titles.get(title), route + ': duplicate page title');
    titles.set(title,canonical);
  }
  for (const tag of p.tags) {
    const href = tag.tag === 'a' ? tag.href : ['script','img'].includes(tag.tag) ? tag.src : tag.tag === 'link' && ['stylesheet','modulepreload','icon'].includes(tag.rel) ? tag.href : undefined;
    if (!href) continue;
    const url = new URL(href,origin + route);
    if (url.origin !== origin) continue;
    links++;
    const target = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
    const page = pages.get(target);
    if (page) {
      if (url.hash) assert.ok(page.ids.has(decodeURIComponent(url.hash.slice(1))),route + ': missing anchor ' + href);
    } else assert.ok(await stat(resolve(root,'.' + target)).then(s => s.isFile()).catch(() => false),route + ': missing target ' + href);
  }
}
const sitemap = await readFile(resolve(root,'sitemap.xml'),'utf8');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const path = new URL(match[1]).pathname;
  assert.ok(pages.has(path),'sitemap missing route: ' + path);
  assert.ok(!path.startsWith('/news') && path !== '/404','sitemap includes retired/error URL');
}
assert.ok((await readFile(resolve(root,'robots.txt'),'utf8')).includes('Sitemap: ' + origin + '/sitemap.xml'));
const redirects = await readFile(resolve(root,'_redirects'),'utf8');
assert.match(redirects,/^\/news \/archive\/news 301$/m);
assert.match(redirects,/^\/news\/:slug \/archive\/news\/:slug 301$/m);
for (const file of await readdir('src/lib/news')) assert.ok(pages.has('/archive/news/' + file.replace('.md','')));
const config = JSON.parse(await readFile('wrangler.jsonc','utf8'));
assert.equal(config.assets.not_found_handling,'404-page');
assert.ok(pages.get('/404').html.includes('404'));
const png = await readFile(resolve(root,'social/maincore.png'));
assert.equal(png.readUInt32BE(16),1200); assert.equal(png.readUInt32BE(20),630);
const sources = JSON.parse(await readFile('src/lib/docs/sources.json','utf8'));
for (const doc of docs) {
  const source = sources[doc.project + '/' + doc.slug];
  const content = await readFile('src/lib/docs/content/' + doc.project + '/' + doc.slug + '.md');
  assert.equal(createHash('sha256').update(content).digest('hex'),source.sha256);
  assert.equal(source.modified,false,'published docs must use a committed snapshot');
  assert.match(source.revision,/^[a-f0-9]{40}$/);
  assert.match(source.updated,/^\d{4}-\d{2}-\d{2}$/);
  assert.match(source.version,/^\d+\.\d+\.\d+/);
}
console.log('Verified ' + pages.size + ' HTML artifacts, ' + links + ' local references, metadata, archive redirects, 404, sharing image and ' + docs.length + ' document snapshots.');

// Read-only post-deploy checks. Run only after publishing this artifact.
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'https://maincore.work';
const get = path => fetch(new URL(path,base), { redirect:'manual', signal:AbortSignal.timeout(20000) });
for (const path of ['/product','/download/keine','/docs/keine','/blog','/archive/news','/robots.txt','/sitemap.xml','/social/maincore.png']) {
  const response = await get(path);
  assert.equal(response.status,200,path);
}
for (const slug of ['', '/keine', '/hakutaku', '/hexz', '/webgal', '/website-launch']) {
  const response = await get('/news' + slug);
  assert.equal(response.status,301,'legacy redirect /news' + slug);
  assert.equal(new URL(response.headers.get('location'),base).pathname,'/archive/news' + slug);
}
const missing = await get('/__maincore_missing_page_check');
assert.equal(missing.status,404,'unknown URL must not become a soft 404');
const body = await missing.text();
assert.ok(body.includes('404') && body.includes('/archive/news'),'404 must have usable navigation');
assert.match(body, /name="robots" content="noindex/);
console.log('Live routes, legacy 301s, sharing assets and real 404 verified: ' + base);

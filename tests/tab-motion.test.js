import test from 'node:test';
import assert from 'node:assert/strict';
import { docsZoomDirection, tabSlideDirection, tabSlideProgress } from '../src/lib/site/tab-motion.js';

test('docs zoom in and out consistently regardless of main navigation order', () => {
  for (const section of ['/', '/product', '/blog', '/about']) {
    assert.equal(docsZoomDirection(section, '/docs/'), 1);
    assert.equal(docsZoomDirection('/docs/keine/language', section), -1);
  }
  assert.equal(docsZoomDirection('/docs', '/docs/keine'), 1);
  assert.equal(docsZoomDirection('/docs/keine/language', '/docs'), -1);
  assert.equal(docsZoomDirection('/docs/keine/language', '/docs/keine/start'), 0);
  assert.equal(docsZoomDirection('/docs/keine/', '/docs/keine'), 0);
  assert.equal(docsZoomDirection('/blog', '/product'), 0);
});

test('main tabs slide in navigation order, including the home alias', () => {
  assert.equal(tabSlideDirection('/product', '/blog'), 1);
  assert.equal(tabSlideDirection('/about', '/blog'), -1);
  assert.equal(tabSlideDirection('/', '/about/'), 1);
  assert.equal(tabSlideDirection('/product', '/product'), 0);
  assert.equal(tabSlideDirection('/', '/product'), 0);
});

test('detail pages keep their existing transition', () => {
  assert.equal(tabSlideDirection('/product', '/product/keine'), 0);
  assert.equal(tabSlideDirection('/blog/article', '/about'), 0);
});

test('content motion starts slowly and settles without overshooting', () => {
  const points = tabSlideProgress();
  assert.equal(points[0], 0);
  assert.equal(points.at(-1), 1);
  assert(points[1] < .002);
  assert(points[10] - points[9] > points[1] * 10);
  for (let i = 1; i < points.length; i++) assert(points[i] >= points[i - 1] && points[i] <= 1);
  assert(1 - points.at(-2) < .001);
});

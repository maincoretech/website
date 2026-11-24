import test from 'node:test';
import assert from 'node:assert/strict';
import { docsZoomDirection } from '../src/lib/studio/route-motion.js';

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

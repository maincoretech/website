import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Third-party comments are not part of the site's functional gate.
  await page.route('https://giscus.app/**', route => route.abort());
});

test('docs has visible exits and opposite entry and exit slides', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.matches('.route-content') && !this.closest('[data-tab-slide-copy]')) {
        window.lastContentMotion = { frames, duration: options.duration };
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/about');
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await nav.getByRole('link', { name: 'docs', exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(nav).toHaveCount(0);
  await expect(page.locator('#site-content .docs-exit')).toBeInViewport();
  const enter = await page.evaluate(() => window.lastContentMotion);
  expect(enter.duration).toBe(360);
  expect(enter.frames[0].transform).toMatch(/^translate3d\([\d.]+px,/);
  // The wordmark must be just as clickable as the small icon.
  await page.locator('.site-brand-link .site-wordmark').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav).toBeVisible();
  const exit = await page.evaluate(() => window.lastContentMotion);
  expect(exit.duration).toBe(360);
  expect(exit.frames[0].transform).toMatch(/^translate3d\(-[\d.]+px,/);
  await page.goBack();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(nav).toHaveCount(0);
  await page.locator('#site-content .docs-exit').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-tab-slide-copy]')).toHaveCount(0);
  await page.goto('/docs/keine');
  await expect(nav).toHaveCount(0);
  await page.locator('#site-content .docs-exit').click();
  await expect(page).toHaveURL(/\/docs$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.site-brand-link').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-tab-slide-copy]')).toHaveCount(0);
});

test('download and documentation journey survives browser back and scroll restoration', async ({ page }) => {
  await page.goto('/product/keine');
  await page.getByRole('link',{name:'下载开发版 →',exact:true}).click();
  await expect(page).toHaveURL(/\/download\/keine$/);
  await expect(page.locator('.download-link')).toHaveCount(3);
  await page.goBack();
  await expect(page).toHaveURL(/\/product\/keine$/);
  await page.getByRole('link',{name:'编写剧本 Eiyashou'}).scrollIntoViewIfNeeded();
  const panel = page.locator('#site-content');
  // The browser may scroll a focused link again during click. Save the position
  // at activation, which is the position that navigation should restore.
  await page.getByRole('link',{name:'编写剧本 Eiyashou'}).evaluate(link => {
    link.addEventListener('click', () => {
      window.navigationScrollTop = document.getElementById('site-content').scrollTop;
    }, { once: true });
  });
  await page.getByRole('link',{name:'编写剧本 Eiyashou'}).click();
  await expect(page).toHaveURL(/\/docs\/keine\/language$/);
  const previous = await page.evaluate(() => window.navigationScrollTop);
  expect(previous).toBeGreaterThan(200);
  await page.goBack();
  await expect.poll(async () => Math.abs(await panel.evaluate(node => node.scrollTop) - previous)).toBeLessThan(8);
});

test('nested contents, anchors and cross-section navigation work on long documents', async ({ page }) => {
  await page.goto('/docs/keine/language');
  const toc = page.locator('.reading-toc');
  await expect(toc).toBeVisible();
  await toc.locator('summary').click();
  await expect(toc.locator('a.nested').first()).toBeVisible();
  const link = toc.locator('a.nested').first();
  const anchor = await link.getAttribute('href');
  await link.click();
  await expect.poll(() => decodeURIComponent(new URL(page.url()).hash)).toBe(anchor);
  await expect(toc).not.toHaveAttribute('open');
  await expect(toc.locator('summary')).toBeInViewport();
  await toc.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(toc).toHaveAttribute('open');
  await page.keyboard.press('Escape');
  await expect(toc).not.toHaveAttribute('open');
  await expect(toc.locator('summary')).toBeFocused();
  await expect(page.locator('#site-navigation')).toHaveCount(0);
  await page.locator('.site-brand-link').click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('navigation',{name:'主导航',exact:true}).getByRole('link',{name:'blog',exact:true}).click();
  await expect(page).toHaveURL(/\/blog$/);
});

test('search opens a document and the language preference survives reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox',{name:'搜索',exact:true}).fill('编辑器');
  const result = page.locator('.search-drop a').filter({hasText:'编辑与预览'});
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/docs\/keine$/);
  await expect(page.locator('.docs-meta')).toContainText('0.17.1');
  await page.getByRole('button',{name:'语言',exact:true}).click();
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('#site-navigation')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.getByRole('link',{name:'View source ↗'})).toHaveAttribute('href',/\/blob\/[a-f0-9]{40}\//);
});

test('retired News remains readable and missing URLs keep a real 404 status', async ({ page, request }) => {
  await page.goto('/news/keine');
  await expect(page).toHaveURL(/\/archive\/news\/keine$/);
  await expect(page.locator('.archive-notice')).toContainText('历史归档');
  await page.goto('/archive/news');
  await expect(page.locator('.entry-list a')).toHaveCount(5);
  const response = await request.get('/__missing_site_smoke');
  expect(response.status()).toBe(404);
  await page.goto('/__missing_site_smoke');
  await expect(page.getByRole('heading',{name:'404',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'历史动态',exact:true}).first()).toBeVisible();
});

test('main routes fit narrow screens and expose descriptive sharing metadata', async ({ page }) => {
  for (const path of ['/product','/download/keine','/docs/keine','/blog/keine-architecture','/archive/news']) {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content','https://maincore.work/social/maincore.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#site-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const navigation = page.getByRole('navigation',{name:'主导航',exact:true});
    if (path.startsWith('/docs')) await expect(navigation).toHaveCount(0);
    else await expect(navigation).toBeVisible();
  }
});


test('all downloads are reachable above the fold and installation details stay optional', async ({ page }) => {
  await page.goto('/download/keine');
  const downloads = page.locator('.download-link');
  for (let i = 0; i < 3; i++) await expect(downloads.nth(i)).toBeInViewport();
  await expect(page.locator('.install-help')).not.toHaveAttribute('open');
  await page.locator('.install-help summary').click();
  await expect(page.locator('.install-help')).toHaveAttribute('open');
  await expect(page.locator('.install-help')).toContainText('Apple');
});

test('navigation keeps live scenery and cleans up interrupted tab slides', async ({ page }) => {
  await page.goto('/product');
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await nav.getByRole('link', { name: 'blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await nav.getByRole('link', { name: 'product', exact: true }).click();
  await expect(page).toHaveURL(/\/product$/);
  await expect(page.locator('[data-tab-slide-copy]')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('.water-scene')).toHaveCount(1);
  await page.getByRole('link', { name: '了解 Kēne →', exact: true }).click();
  // No full-page snapshot may freeze the water while the content changes.
  expect(await page.evaluate(() => document.getAnimations().some(animation =>
    animation.effect?.pseudoElement?.startsWith('::view-transition')))).toBe(false);
  await expect(page.locator('.water-scene')).toHaveCount(1);
});


test('touch wake stays engaged while held and stops only when its own pointer ends', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium-only; shared wave math is covered by unit tests.');
  await page.addInitScript(() => {
    const names = new WeakMap();
    const prototype = WebGL2RenderingContext.prototype;
    const getLocation = prototype.getUniformLocation;
    const setVector = prototype.uniform3f;
    prototype.getUniformLocation = function(program, name) {
      const location = getLocation.call(this, program, name);
      if (location) names.set(location, name);
      return location;
    };
    prototype.uniform3f = function(location, x, y, z) {
      if (names.get(location) === 'flow') window.waterFlow = { x, y, z };
      return setVector.call(this, location, x, y, z);
    };
  });
  await page.goto('/product');
  await expect(page.locator('.water-scene')).toHaveAttribute('data-status', 'ready');
  const point = await page.evaluate(() => {
    const panel = document.querySelector('#site-content').getBoundingClientRect();
    const nav = document.querySelector('#site-navigation').getBoundingClientRect();
    return { x: innerWidth / 2, y: (panel.bottom + nav.top - 12) / 2 };
  });
  const input = await page.context().newCDPSession(page);
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
  await expect.poll(() => page.evaluate(() => window.waterFlow?.z)).toBe(.75);
  const initial = await page.evaluate(() => window.waterFlow);
  await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + 24, y: point.y, id: 1 }] });
  await expect.poll(() => page.evaluate(before => Math.hypot(window.waterFlow.x - before.x, window.waterFlow.y - before.y), initial)).toBeGreaterThan(.02);
  // Hold longer than the old 160 ms timeout. A second finger ending must not release it.
  await page.locator('.water-scene').dispatchEvent('pointerup', { pointerId: 99, pointerType: 'touch' });
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.waterFlow.z)).toBe(.75);
  await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.waterFlow.z)).toBe(0);
  // Water captures only bare scenery; dragging the reading surface still scrolls.
  const panel = await page.locator('#site-content').boundingBox();
  const x = panel.x + panel.width * .8;
  const y = panel.y + panel.height * .75;
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2 }] });
  for (let step = 1; step <= 8; step++) {
    await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 18, id: 2 }] });
    await page.waitForTimeout(16);
  }
  await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('#site-content').evaluate(node => node.scrollTop)).toBeGreaterThan(40);
  await input.detach();
});

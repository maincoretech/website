import { test, expect } from '@playwright/test';
import { materialSymbols } from '../../src/lib/studio/material-symbols.js';

test.beforeEach(async ({ page }) => {
  // Third-party comments are not part of the site's functional gate.
  await page.route('https://giscus.app/**', route => route.abort());
});

test('bottom navigation keeps its position during repeated hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover requires a mouse.');
  await page.goto('/product');
  const nav = page.locator('#site-navigation');
  await expect(nav.locator('a')).toHaveText(['product', 'docs', 'blog', 'about']);
  const about = nav.getByRole('link', { name: 'about', exact: true });
  const measure = () => about.evaluate(node => {
    const box = node.getBoundingClientRect();
    const text = node.querySelector('span').getBoundingClientRect();
    return [box.x, box.y, box.width, box.height, text.x, text.y, text.width, text.height];
  });
  const before = await measure();
  const box = await about.boundingBox();
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => about.evaluate(node => getComputedStyle(node, '::before').opacity)).toBe('1');
    expect(await measure()).toEqual(before);
    await page.mouse.move(box.x + box.width / 2, box.y - 20);
    await expect.poll(() => about.evaluate(node => getComputedStyle(node, '::before').opacity)).toBe('0');
    expect(await measure()).toEqual(before);
  }
});

for (const [route, selector] of [
  ['/product/keine', '#keine-source'],
  ['/product/hakutaku', '.hakutaku-flows .package-flow']
]) {
  test(`scroll reveal never hides already painted content or replays on ${route}`, async ({ page }) => {
    await page.addInitScript(selector => {
      window.scrollRevealStarts = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function(frames, options) {
        if (this.matches(selector)) window.scrollRevealStarts.push(getComputedStyle(this).opacity);
        return animate.call(this, frames, options);
      };
    }, selector);
    await page.goto(route);
    await expect(page.locator('.water-scene')).toHaveAttribute('data-status', 'ready');
    expect(await page.locator('#site-content').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    const target = page.locator(selector);
    await target.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.scrollRevealStarts)).toEqual(['0']);
    await expect.poll(() => target.evaluate(node => node.getAnimations().length)).toBe(0);
    await expect(target).toHaveCSS('opacity', '1');
    await page.locator('#site-content').evaluate(node => node.scrollTop = 0);
    await target.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollRevealStarts)).toEqual(['0']);
    await expect(target).toHaveCSS('opacity', '1');
    // Reduced motion must reveal sections that have not reached the viewport yet.
    await page.reload();
    await expect(page.locator('.water-scene')).toHaveAttribute('data-status', 'ready');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.scroll-reveal-pending')).toHaveCount(0);
    await expect(target).toHaveCSS('opacity', '1');
  });
}

test('docs has visible exits, and the legacy reading surface zooms from its center', async ({ page }) => {
  await page.addInitScript(() => {
    window.documentsMotion = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches('.reading-panel') && frames[0]?.transform?.startsWith('scale')) {
        window.documentsMotion.push(frames[0].transform);
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/product');
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await nav.getByRole('link', { name: 'docs', exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(nav).toHaveCount(0);
  await expect(page.locator('#site-content .docs-exit')).toBeInViewport();

  await expect.poll(() => page.evaluate(() => window.documentsMotion)).toEqual(['scale(.97)']);

  await page.locator('.site-brand-link .site-wordmark').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav.getByRole('link', { name: 'works', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(nav).toHaveCount(0);
  await page.locator('#site-content .docs-exit').click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/docs/keine');
  await expect(nav).toHaveCount(0);
  await page.locator('#site-content .docs-exit').click();
  await expect(page).toHaveURL(/\/docs$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.site-brand-link').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#site-content')).not.toHaveAttribute('aria-busy');
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
  await page.goto('/product');
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

test('studio search uses the restored index and supports keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '搜索', exact: true });
  await expect(input).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('编辑器');
  const results = page.locator('.studio-search .search-drop');
  await expect(results.getByRole('link').filter({ hasText: '编辑与预览' })).toBeVisible();
  await input.press('ArrowDown');
  await expect(results.getByRole('link').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(input).toBeFocused();
  await expect(results).toHaveAttribute('inert', '');
  await expect(results).toBeHidden();
  await input.fill('开发与发布指南');
  await expect(results.getByRole('link').first()).toHaveAttribute('href', '/blog/keine-development-and-release');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/blog\/keine-development-and-release$/);
  await expect(results).toBeHidden();
});

test('the blog directory is a sticky supporting pane or a compact disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blog/keine-development-and-release');
  const utilities = page.locator('.studio-utilities');
  const pane = utilities.locator('.reading-toc-side');
  const first = pane.getByRole('link').first();
  const chapter = pane.getByRole('link', { name: '正式打包', exact: true });
  const marker = pane.locator('.reading-marker.positioned');
  await expect(chapter).toBeVisible();
  await expect(marker).toBeVisible();
  const sibling = pane.getByRole('link', { name: '身份与密钥', exact: true });
  const dotInset = link => link.evaluate(el => parseFloat(getComputedStyle(el, '::before').insetInlineStart));
  expect(await dotInset(sibling) - await dotInset(chapter)).toBe(12);
  await expect(first).toHaveAttribute('aria-current', 'location');
  const firstDot = await first.evaluate(el => getComputedStyle(el, '::before').opacity);
  expect(firstDot).toBe('0');
  const prose = await page.locator('.studio-article .article-prose').boundingBox();
  const search = await utilities.getByRole('textbox').boundingBox();
  const outline = await pane.boundingBox();
  expect(prose.width).toBe(800);
  expect(search.x).toBe(outline.x);
  expect(search.x).toBeGreaterThan(prose.x + prose.width);
  expect(search.y).toBeLessThan(prose.y);
  await chapter.click();
  await expect(chapter).toHaveAttribute('aria-current', 'location');
  await expect(first).toHaveClass(/\bpassed\b/);
  await expect.poll(() => chapter.evaluate(row => {
    const mark = row.parentElement.querySelector('.reading-marker');
    const icon = mark.getBoundingClientRect();
    const tile = row.getBoundingClientRect();
    return Math.abs(icon.y + icon.height / 2 - (tile.y + tile.height / 2));
  })).toBeLessThan(1);
  expect((await marker.boundingBox()).x).toBeLessThan((await chapter.boundingBox()).x + 34);
  await expect.poll(async () => Math.round((await utilities.boundingBox()).y)).toBe(0);
  expect(Math.abs((await pane.boundingBox()).y - outline.y)).toBeLessThan(1);

  await page.locator('.studio-nav').getByRole('link', { name: 'blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(pane).toHaveCount(0);
  expect(await utilities.getByRole('textbox').boundingBox()).toEqual(search);
  await page.goBack();
  await expect(chapter).toHaveAttribute('aria-current', 'location');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(first).toHaveAttribute('aria-current', 'location');
  await expect(chapter).not.toHaveClass(/\bpassed\b/);
  await expect.poll(() => chapter.evaluate(el => Number(getComputedStyle(el, '::before').opacity)))
    .toBeGreaterThan(.5);

  await page.setViewportSize({ width: 1124, height: 780 });
  await expect(pane).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1024, height: 780 });
  await expect(pane).toHaveCount(0);
  await expect(page.locator('.reading-toc summary')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/blog/keine-development-and-release');
  const details = page.locator('.reading-toc');
  await expect(pane).toHaveCount(0);
  const before = await page.locator('.article-prose').evaluate(node => node.offsetTop);
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open');
  expect(await page.locator('.article-prose').evaluate(node => node.offsetTop)).toBe(before);
  await details.getByRole('link', { name: '工程与迁移', exact: true }).click();
  await expect(details).not.toHaveAttribute('open');
  await expect(page).toHaveURL(/#article-section-\d+$/);
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
  for (const path of ['/', '/works', '/blog', '/about', '/product', '/download/keine', '/docs/keine', '/blog/keine-architecture', '/archive/news']) {
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

test('the product explorer mounts one project and preserves its state across topic changes', async ({ page }) => {
  await page.goto('/product/hakutaku');
  const explorer = page.getByRole('region', { name: 'Hakutaku', exact: true });
  const performance = explorer.getByRole('button', { name: '性能', exact: true });
  const resources = explorer.getByRole('button', { name: '资源更新', exact: true });
  await expect(explorer.locator('.benchmark-highlights')).toHaveCount(1);
  await expect(performance).toHaveAttribute('aria-pressed', 'true');
  await resources.click();
  await explorer.getByRole('button', { name: '更新一次剧本' }).click();
  await expect(explorer.getByText('c8d2….taku')).toBeVisible();
  await performance.click();
  await resources.click();
  await expect(explorer.getByRole('button', { name: '还原版本' })).toHaveAttribute('aria-pressed', 'true');
});

test('toggle motion reverses on the next selection and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: '搜索', exact: true });
  const results = page.locator('.studio-search .search-drop');
  await input.fill('编辑器');
  await expect(results).toHaveCSS('transition-duration', '0.22s, 0.16s, 0s');
  await expect(results).toHaveCSS('opacity', '1');
  await input.evaluate(async (field) => {
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    field.click();
  });
  await expect(results).toHaveAttribute('data-open', 'true');
  await expect(results).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(results).toHaveCSS('transition-duration', /^0s(?:, 0s)*$/);
  await input.press('Escape');
  await expect(results).toBeHidden();
});

test('studio navigation keeps the same header across route changes and history', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '主导航', exact: true });
  await expect(nav.getByRole('link')).toHaveCount(3);
  const navSymbols = await nav.locator('svg path').evaluateAll(paths => paths.map(path => path.getAttribute('d')));
  expect(navSymbols).toEqual([materialSymbols.grid, materialSymbols.book, materialSymbols.info]);
  await nav.evaluate(node => { node.dataset.testInstance = 'original'; });
  const open = async (name) => {
    await nav.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/' + name + '$'));
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
  };
  await open('works');
  const sectionBox = await page.locator('.studio-main').boundingBox();
  const title = page.locator('.studio-watermark.is-current');
  await expect(title).toHaveText('works');
  if (page.viewportSize().width >= 840) await expect(title).toHaveCSS('writing-mode', 'vertical-rl');
  await expect(page.locator('.works-grid h2')).toHaveText(['Krose', 'Hakutaku', 'Kēne', 'DiscImage']);
  expect(await page.locator('.work-card').evaluateAll(cards => cards.map(card => card.href))).toEqual([
    'https://github.com/shiftz300/krose',
    'https://github.com/maincoretech/hakutaku',
    'https://github.com/maincoretech/keine',
    'https://github.com/shiftz300/discimage'
  ]);
  const arrows = await page.locator('.work-arrow path').evaluateAll(paths => paths.map(path => path.getAttribute('d')));
  expect(arrows).toEqual(Array(4).fill(materialSymbols.external));
  if (page.viewportSize().width >= 1080 && page.viewportSize().height >= 450) {
    const shell = await page.locator('.studio-shell').boundingBox();
    const rail = await page.locator('.studio-header').boundingBox();
    const grid = await page.locator('.works-grid').boundingBox();
    expect(Math.abs((grid.x - rail.x - rail.width) - (shell.x + shell.width - grid.x - grid.width))).toBeLessThan(1);
  }
  const insets = await page.locator('.work-card').evaluateAll(cards => cards.map(card => {
    const bounds = card.getBoundingClientRect();
    const arrow = card.querySelector('.work-arrow').getBoundingClientRect();
    const title = card.querySelector('h2').getBoundingClientRect();
    return [arrow.top - bounds.top, bounds.right - arrow.right, title.left - bounds.left];
  }));
  expect(insets).toEqual(Array.from({ length: 4 }, () => [18, 18, 18]));
  await open('blog');
  await expect(title).toHaveText('blog');
  const blogBox = await page.locator('.studio-main').boundingBox();
  expect([blogBox.x, blogBox.y, blogBox.width]).toEqual([sectionBox.x, sectionBox.y, sectionBox.width]);
  await open('about');
  await expect(title).toHaveText('about');
  const aboutBox = await page.locator('.studio-main').boundingBox();
  expect([aboutBox.x, aboutBox.y, aboutBox.width]).toEqual([sectionBox.x, sectionBox.y, sectionBox.width]);
  await expect(page.locator('.studio-build time')).toHaveAttribute('datetime', /^\d{4}-\d\d-\d\dT.*Z$/);
  await expect(page.locator('.studio-contact + section')).toBeVisible();
  await expect(page.locator('.timeline-event')).toHaveCount(5);
  await expect(nav).toHaveAttribute('data-test-instance', 'original');
  await expect(page.locator('.water-scene')).toHaveCount(0);
  await expect(page.locator('#site-content')).not.toHaveAttribute('aria-busy');
  await page.goBack();
  await expect(nav.getByRole('link', { name: 'blog', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: /Kēne 的架构/ }).first().click();
  await expect(page).toHaveURL(/\/blog\/keine-architecture$/);
  await expect(nav).toHaveAttribute('data-test-instance', 'original');
  await page.getByRole('link', { name: 'back to blog' }).click();
  await expect(page).toHaveURL(/\/blog$/);
});

test('section titles fit the desktop gutter and sit at the mobile top left', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 430, height: 932 },
    { width: 840, height: 450 },
    { width: 1080, height: 620 },
    { width: 1440, height: 900 },
    { width: 1600, height: 380 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(viewport);
    for (const section of ['works', 'blog', 'about']) {
      await page.goto('/' + section);
      const title = page.locator('.studio-watermark.is-current');
      await expect(title).toBeVisible();
      const edges = await title.evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        const search = document.querySelector('.studio-search').getBoundingClientRect();
        const logo = document.querySelector('.studio-brand img').getBoundingClientRect();
        const main = document.querySelector('.studio-main').getBoundingClientRect();
        return {
          textLeft: text.left, textRight: text.right, textTop: text.top, textBottom: text.bottom,
          titleTop: el.getBoundingClientRect().top, logoTop: logo.top,
          searchTop: search.top, searchLeft: search.left, searchCenter: search.top + search.height / 2,
          mainLeft: main.left, writingMode: getComputedStyle(el).writingMode,
          overflow: getComputedStyle(el).overflow
        };
      });
      expect(edges.textTop).toBeGreaterThanOrEqual(0);
      expect(edges.textBottom).toBeLessThan(viewport.height);
      expect(edges.overflow).toBe('visible');
      if (viewport.width >= 840) {
        expect(edges.writingMode).toBe('vertical-rl');
        expect(edges.titleTop).toBeCloseTo(edges.logoTop, 1);
        expect(edges.titleTop).toBeCloseTo(edges.searchTop, 1);
        expect(edges.textRight).toBeLessThanOrEqual(edges.mainLeft);
      } else {
        expect(edges.writingMode).toBe('horizontal-tb');
        expect(edges.textLeft).toBeCloseTo(edges.mainLeft, 0);
        expect(edges.textRight).toBeLessThan(edges.searchLeft);
        expect(Math.abs((edges.textTop + edges.textBottom) / 2 - edges.searchCenter)).toBeLessThan(3);
      }
    }
  }
});

test('studio keeps a compact desktop rail and adapts the same navigation to a narrow window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const header = page.locator('.studio-header');
  const nav = header.locator('.studio-nav');
  await expect(header).toHaveCSS('position', 'sticky');
  await expect(nav).toHaveCSS('flex-direction', 'column');
  const mainBox = await page.locator('.studio-main').boundingBox();
  const footerBox = await page.locator('.studio-footer').boundingBox();
  const railBox = await header.boundingBox();
  const shellBox = await page.locator('.studio-shell').boundingBox();
  expect(mainBox.width).toBe(960);
  expect(railBox.width).toBe(80);
  expect(footerBox.x).toBe(railBox.x + railBox.width);
  expect(footerBox.x + footerBox.width).toBe(shellBox.x + shellBox.width);
  await expect(page.locator('.studio-masthead')).toHaveCount(0);

  const works = nav.getByRole('link', { name: 'works', exact: true });
  await expect(works.locator('svg')).toHaveCSS('width', '24px');
  await expect(works).toHaveCSS('width', '56px');
  expect(await nav.evaluate(el => getComputedStyle(el, '::before').height)).toBe('56px');
  await expect(header.locator('.studio-brand img')).toHaveCSS('width', '36px');
  await works.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/works$/);
  await expect(works).toBeFocused();
  await expect(works).toHaveCSS('outline-style', 'none');
  await expect(works).toHaveCSS('background-color', 'rgb(180, 212, 243)');

  await nav.getByRole('link', { name: 'about', exact: true }).click();
  await expect.poll(() => nav.evaluate(node => {
    const item = node.querySelector('[aria-current]');
    const marker = getComputedStyle(node, '::before');
    return new DOMMatrix(marker.transform).m42 - (item.getBoundingClientRect().top - node.getBoundingClientRect().top);
  })).toBe(0);

  await nav.getByRole('link', { name: 'blog', exact: true }).click();
  await page.getByRole('link', { name: /Kēne 的架构/ }).first().click();
  await expect(page).toHaveURL(/\/blog\/keine-architecture$/);
  await expect(page.locator('#site-content')).not.toHaveAttribute('aria-busy');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  expect((await header.boundingBox()).y).toBe(0);

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(nav).toHaveCSS('flex-direction', 'row');
  await expect(works.locator('svg')).toHaveCSS('width', '20px');
  await expect(nav.getByRole('link', { name: 'blog', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => nav.evaluate(node => {
    const item = node.querySelector('[aria-current]');
    const marker = getComputedStyle(node, '::before');
    return new DOMMatrix(marker.transform).m41 - (item.getBoundingClientRect().left - node.getBoundingClientRect().left);
  })).toBe(0);
  await page.goto('/works');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await page.locator('.studio-footer').boundingBox()).width)
    .toBe((await page.locator('.studio-shell').boundingBox()).width);
});

test('studio navigation reuses its titles and stays responsive while an article loads', async ({ page }) => {
  await page.addInitScript(() => {
    window.transitions = 0;
    window.arrivals = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches('.studio-route-shade')) {
        window.arrivals.push({ duration: options.duration, withinViewport: parseFloat(getComputedStyle(this).maxHeight) <= innerHeight });
      }
      return animate.call(this, frames, options);
    };
    const start = document.startViewTransition?.bind(document);
    if (start) document.startViewTransition = (update) => {
      window.transitions++;
      return start(update);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nav = page.locator('.studio-nav');
  await nav.getByRole('link', { name: 'works' }).click();
  await expect(page).toHaveURL(/\/works$/);
  await expect(page.locator('.studio-watermark.is-current')).toHaveCSS('transition-duration', '0s');
  expect(await page.evaluate(() => window.arrivals)).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.studio-watermark').evaluateAll(titles => titles.forEach(title => { title.dataset.original = 'true'; }));
  await nav.getByRole('link', { name: 'blog' }).click();
  await expect(page.locator('.studio-watermark.is-current')).toHaveText('blog');
  await expect(page.locator('.studio-watermark[data-original="true"]')).toHaveCount(3);
  expect(await page.evaluate(() => window.arrivals)).toEqual([{ duration: 340, withinViewport: true }]);

  let release;
  const delay = new Promise(resolve => { release = resolve; });
  await page.route(/\/_app\/immutable\/(?:nodes|chunks)\//, async (route) => {
    await delay;
    await route.continue();
  });
  try {
    await page.getByRole('link', { name: /Kēne 开发与发布指南/ }).first().click();
    const main = page.locator('#site-content');
    await expect(main).toHaveAttribute('aria-busy', 'true');
    await expect(main.getByRole('heading', { name: 'blog', exact: true })).toBeAttached();
    await page.getByRole('textbox', { name: '搜索', exact: true }).focus();
    await expect(page.getByRole('textbox', { name: '搜索', exact: true })).toBeFocused();
    await nav.getByRole('link', { name: 'works' }).click();
    await expect(page).toHaveURL(/\/works$/);
    await expect(main).not.toHaveAttribute('aria-busy');
    await expect(page.locator('.studio-watermark.is-current')).toHaveText('works');
  } finally {
    release();
  }
  expect(await page.evaluate(() => window.transitions)).toBe(0);
  await expect(page.locator('.studio-route-shade')).toHaveCount(0);
});

test('rapid presses let the current ripple finish and respect reduced motion', async ({ page }) => {
  await page.goto('/');
  const works = page.getByRole('link', { name: 'works', exact: true });
  await expect.poll(() => works.evaluate(link => {
    const { left, top } = link.getBoundingClientRect();
    const press = () => link.dispatchEvent(new PointerEvent('pointerdown', {
      isPrimary: true, button: 0, pointerId: 1, clientX: left + 20, clientY: top + 20
    }));
    press();
    const original = link.querySelector('.studio-ink');
    if (!original) return [];
    press();
    press();
    if (original !== link.querySelector('.studio-ink')) return [];
    return [...link.querySelectorAll('.studio-ink')].map(layer => layer.getAnimations()[0].effect.getTiming().duration);
  })).toEqual([430, 430]);
  await expect(works.locator('.studio-ink')).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await works.dispatchEvent('pointerdown', { isPrimary: true, button: 0, pointerId: 1 });
  await expect(works.locator('.studio-ink')).toHaveCount(0);
  await works.click();
  await expect(page).toHaveURL(/\/works$/);
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
  // Use a long page: the compact Archive index may now fit without scrolling.
  await page.goto('/product/keine');
  await expect(page.locator('.water-scene')).toHaveAttribute('data-status', 'ready');
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

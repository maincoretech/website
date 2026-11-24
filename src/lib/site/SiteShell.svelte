<script>
  import { msg, t } from '$lib/i18n/index.js';
  import { onMount } from 'svelte';
  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import WaterScene from './WaterScene.svelte';
  import { siteConfig } from '$lib/siteConfig.js';
  import { motionAllowed, reducedMotionQuery } from '$lib/motion.js';
  import './site.css';
  import './hover.css';
  import './reading.css';

  let { children, pending } = $props();
  let panel;
  let waterScene = $state.raw(null);
  let pageHeading = $state.raw(null);
  let previousScrollTop = 0;
  let reducedMotion = $state(true);
  let showTop = $state(false);
  const scrollPositions = new Map();
  const sections = siteConfig.nav;
  const path = $derived($page.url.pathname.replace(/\/$/, '') || '/');
  const region = $derived(sections.find(section => path === section.href || path.startsWith(section.href + '/'))?.label ?? (path.startsWith('/archive/') ? 'blog' : 'product'));
  const docsPage = $derived(path === '/docs' || path.startsWith('/docs/'));
  const documentation = $derived(docsPage || path.startsWith('/download/') || path === '/404');
  const article = $derived(/^\/(blog|archive\/news)\/[^/]+/.test(path) || documentation);
  const detail = $derived((article && !documentation) || path.startsWith('/product/'));
  const backHref = $derived(path.startsWith('/archive/news/') ? '/archive/news' : path.startsWith('/blog/') ? '/blog' : path.startsWith('/product/') ? '/product' : '/');

  function onScroll() {
    const top = panel.scrollTop;
    waterScene?.scroll(top - previousScrollTop);
    previousScrollTop = top;
    showTop = top > 280;
  }
  function backToTop() {
    panel.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'instant' });
  }
  beforeNavigate(({ from }) => {
    if (from && panel) scrollPositions.set(from.url.pathname + from.url.search, panel.scrollTop);
  });
  afterNavigate(({ to, type }) => {
    // Restore the nested reader after the new page is mounted.
    if (!panel || !to || to.url.href !== $page.url.href) return;
    const top = type === 'popstate' ? scrollPositions.get(to.url.pathname + to.url.search) ?? 0 : 0;
    panel.scrollTop = top;
    if (to.url.hash) {
      let id;
      try { id = decodeURIComponent(to.url.hash.slice(1)); } catch { id = to.url.hash.slice(1); }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    } else if (type !== 'enter' && type !== 'popstate') (pageHeading ?? panel)?.focus({ preventScroll: true });
    previousScrollTop = panel.scrollTop;
    showTop = panel.scrollTop > 280;
  });
  onMount(() => {
    const media = matchMedia(reducedMotionQuery);
    const update = () => reducedMotion = media.matches;
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
</script>

<div class="site-shell" class:route-pending={pending} class:article-page={article} class:docs-page={docsPage}>
  <a class="skip-link" href="#site-content">{$msg("跳到内容")}</a>
  <div class="site-viewport">
    {#if !article}<WaterScene bind:this={waterScene} {region} still={reducedMotion} />{/if}
      <a class="site-brand site-brand-link" href="/" aria-label={$msg("maincore，返回首页")}>
        <img class="site-brand-logo" src="/favicon.png" width="42" height="42" alt="" />
        <span class="site-wordmark">maincore</span>
      </a>
    {#if !docsPage}<nav id="site-navigation" class="site-navigation" aria-label={$msg("主导航")}>
        {#each sections as section}
          <a href={section.href} class:active={region === section.label} aria-current={region === section.label ? 'page' : undefined}><span>{$t('nav.' + section.label)}</span></a>
        {/each}
    </nav>{/if}
    <main id="site-content" class="reading-panel content-surface" bind:this={panel} onscroll={onScroll} tabindex="-1" aria-busy={pending || undefined}>
      {#if detail && path !== '/product/keine'}<div class="reading-heading">
        <span class="page-section" tabindex="-1" bind:this={pageHeading}>{$t('nav.' + region)}</span>
        {#if path !== '/' && path !== '/product'}<a class="reading-back" href={backHref} aria-label={$msg(backHref === '/' ? $t('back.home') : '返回栏目')}>←</a>{/if}
      </div>{/if}
      <div class="route-content">
        {#if docsPage}<a class="docs-exit" href={path === '/docs' ? '/' : '/docs'}>← {path === '/docs' ? $t('back.home') : $msg('文档')}</a>{/if}
        {@render children()}
      </div>
    </main>
    <footer class="site-copyright">{$msg(siteConfig.copyright)}</footer>
    {#if showTop}<button class="site-back-top" aria-label={$t('a11y.back_to_top')} onclick={backToTop}>↑</button>{/if}
  </div>
  {#if path !== '/404'}<Header />{/if}
</div>

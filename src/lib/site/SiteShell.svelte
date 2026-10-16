<script>
  import { msg } from '$lib/i18n/index.js';
  import { onMount, tick } from 'svelte';
  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import WaterScene from './WaterScene.svelte';
  import { siteConfig } from '$lib/siteConfig.js';
  import { t } from '$lib/i18n/index.js';
  import { motionDuration } from '$lib/motion.js';
  import './site.css';
  import './hover.css';
  import './reading.css';

  let { children } = $props();
  let panel;
  let waterScene = $state.raw(null);
  let pageHeading;
  let previousScrollTop = 0;
  let reducedMotion = $state(true);
  let showTop = $state(false);
  const scrollPositions = new Map();
  const sections = siteConfig.nav;
  const path = $derived($page.url.pathname.replace(/\/$/, '') || '/');
  const region = $derived(sections.find(section => path === section.href || path.startsWith(section.href + '/'))?.label ?? 'product');
  const article = $derived(/^\/blog\/[^/]+/.test(path));
  const detail = $derived(article || path.startsWith('/product/'));
  const backHref = $derived(path.startsWith('/blog/') ? '/blog' : path.startsWith('/product/') ? '/product' : '/');

  function onScroll() {
    waterScene?.scroll(panel.scrollTop - previousScrollTop);
    previousScrollTop = panel.scrollTop;
    const next = panel.scrollTop > 280;
    if (next !== showTop) showTop = next;
  }
  function backToTop() {
    panel.scrollTo({ top: 0, behavior: motionDuration(200) ? 'smooth' : 'instant' });
  }
  beforeNavigate(({ from }) => {
    if (from && panel) scrollPositions.set(from.url.pathname + from.url.search, panel.scrollTop);
  });
  afterNavigate(async ({ to, type }) => {
    await tick();
    // Let the new reading width settle before restoring the nested scroll area.
    // Article and list routes use different widths, including during View Transitions.
    await new Promise(requestAnimationFrame);
    if (!panel || !to || to.url.href !== $page.url.href) return;
    const top = type === 'popstate' ? scrollPositions.get(to.url.pathname + to.url.search) ?? 0 : 0;
    panel.scrollTop = top;
    previousScrollTop = panel.scrollTop;
    showTop = panel.scrollTop > 280;
    if (to.url.hash) {
      let id;
      try { id = decodeURIComponent(to.url.hash.slice(1)); } catch { id = to.url.hash.slice(1); }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    } else if (type !== 'enter' && type !== 'popstate') (pageHeading ?? panel)?.focus({ preventScroll: true });
  });
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => reducedMotion = media.matches;
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
</script>

<svelte:head>
  <link rel="canonical" href={`https://${siteConfig.domain}${path === '/' ? '/product' : path}`} />
</svelte:head>

<div class="site-shell" class:article-page={article} class:wide-list={path === '/' || path === '/blog'}>
  <a class="skip-link" href="#site-content">{$msg("跳到内容")}</a>
  <div class="site-viewport">
    {#if !article}<WaterScene bind:this={waterScene} {region} still={reducedMotion} />{/if}
    <div class="site-brand">
      <a class="site-brand-link" href="/" aria-label={$msg("maincore，返回首页")}><img class="site-brand-logo" src="/favicon.png" width="42" height="42" alt="" /></a>
      <span class="site-wordmark">maincore</span>
    </div>
    {#if !article}
      <nav id="site-navigation" class="site-navigation" aria-label={$msg("主导航")}>
        {#each sections as section}
          <a href={section.href} class:active={region === section.label} aria-current={region === section.label ? 'page' : undefined}><span>{$t('nav.' + section.label)}</span></a>
        {/each}
      </nav>
    {/if}
    <main id="site-content" class="reading-panel content-surface" class:detail-reading={detail} bind:this={panel} onscroll={onScroll} tabindex="-1">
      {#if detail && path !== '/product/keine'}<div class="reading-heading">
        <span class="page-section" tabindex="-1" bind:this={pageHeading}>{$t('nav.' + region)}</span>
        {#if path !== '/' && path !== '/product'}<a class="reading-back" href={backHref} aria-label={$msg(backHref === '/' ? $t('back.home') : '返回栏目')}>←</a>{/if}
      </div>{/if}
      <div class="route-content">{@render children()}</div>
    </main>
    <footer class="site-copyright">{$msg(siteConfig.copyright)}</footer>
    {#if showTop}<button class="site-back-top" aria-label={$t('a11y.back_to_top')} onclick={backToTop}>↑</button>{/if}
  </div>
  <Header />
</div>

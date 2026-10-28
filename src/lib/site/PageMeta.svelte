<script>
  import { page } from '$app/stores';
  import { lang } from '$lib/i18n/index.js';
  import { siteConfig } from '$lib/siteConfig.js';
  let { title, description, article = false, date, noindex = false } = $props();
  const origin = 'https://' + siteConfig.domain;
  const path = $derived($page.url.pathname.replace(/\/$/, '') || '/');
  const url = $derived(origin + (path === '/' ? '/product' : path));
  const locale = $derived(({ zh: 'zh_CN', 'zh-Hant': 'zh_TW', en: 'en_US', ja: 'ja_JP' })[$lang]);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  {#if noindex}<meta name="robots" content="noindex, follow" />{:else}<link rel="canonical" href={url} />{/if}
  <meta property="og:site_name" content="maincore" />
  <meta property="og:type" content={article ? 'article' : 'website'} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:locale" content={locale} />
  <meta property="og:image" content={origin + '/social/maincore.png'} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="maincore — games & software" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={origin + '/social/maincore.png'} />
  {#if article && date}<meta property="article:published_time" content={new Date(date).toISOString()} />{/if}
</svelte:head>

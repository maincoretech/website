<script>
  import Giscus from '$lib/components/Giscus.svelte';
  import { t } from '$lib/i18n/index.js';
  import PageMeta from './PageMeta.svelte';
  import TableOfContents from './TableOfContents.svelte';
  let { meta = {}, articleKey, comments = true, children } = $props();
  let body = $state();
  const date = $derived(meta.date ? new Date(meta.date).toISOString().slice(0, 10) : '');
</script>

<PageMeta title={(meta.title ?? articleKey) + ' · maincore'} description={meta.description ?? meta.title ?? ''} article date={meta.date} />
<article class="site-article">
  <header class="article-heading">
    <h1>{meta.title ?? articleKey}</h1>
    <div class="article-meta-row"><span>{meta.author ?? ''}{meta.author && date ? ' · ' : ''}<time datetime={date || undefined}>{date}</time></span></div>
  </header>
  <TableOfContents {body} routeKey={articleKey} />
  <div class="section-body article-prose" bind:this={body}>{@render children()}</div>
  <p class="article-license">{$t('contentLicense.summary')} <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" rel="license">CC BY-NC-ND 4.0</a> · <a href="/license">{$t('contentLicense.details')}</a></p>
  {#if comments}{#key articleKey}<Giscus />{/key}{/if}
</article>
<style>.article-license { margin-block: 32px; padding-top: 18px; border-top: 1px solid #304650; color: #91aab8; font-size: .78rem; }</style>

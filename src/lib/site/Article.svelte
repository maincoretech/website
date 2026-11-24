<script>
  import Giscus from '$lib/components/Giscus.svelte';
  import PageMeta from './PageMeta.svelte';
  import TableOfContents from './TableOfContents.svelte';
  let { meta = {}, articleKey, comments = true, supportingToc = false, children } = $props();
  let body = $state();
  const date = $derived(meta.date ? new Date(meta.date).toISOString().slice(0, 10) : '');
</script>

<PageMeta title={(meta.titleEn ?? meta.title ?? articleKey) + ' · maincore'}
  description={meta.descriptionEn ?? meta.description ?? meta.titleEn ?? meta.title ?? articleKey} article date={meta.date} />
<article class="site-article">
  <header class="article-heading">
    <h1>{meta.title ?? articleKey}</h1>
    <div class="article-meta-row"><span>{meta.author ?? ''}{meta.author && date ? ' · ' : ''}<time datetime={date || undefined}>{date}</time></span></div>
  </header>
  <TableOfContents {body} routeKey={articleKey} supporting={supportingToc} />
  <div class="article-body">
    <div class="section-body article-prose" bind:this={body}>{@render children()}</div>
    <p class="article-license" lang="en"><a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" rel="license">CC BY-NC-ND 4.0</a></p>
    {#if comments}{#key articleKey}<Giscus />{/key}{/if}
  </div>
</article>
<style>.article-license { margin-block: 32px; padding-top: 18px; border-top: 1px solid #304650; color: #91aab8; font-size: .78rem; }</style>

<script>
  import { tick } from 'svelte';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import Giscus from '$lib/components/Giscus.svelte';
  import { t } from '$lib/i18n/index.js';
  import { motionDuration } from '$lib/motion.js';
  let { meta = {}, articleKey, children } = $props();
  let body;
  let headings = $state([]);
  const date = $derived(meta.date ? new Date(meta.date).toISOString().slice(0, 10) : '');
  $effect(() => {
    articleKey;
    let cancelled = false;
    tick().then(() => {
      if (cancelled || !body) return;
      headings = [...body.querySelectorAll('h2, h3')].map((node, index) => {
        node.id ||= `article-section-${index}`;
        return { id: node.id, text: node.textContent, nested: node.tagName === 'H3' };
      }).filter((heading) => !heading.nested);
    });
    return () => cancelled = true;
  });
  function jump(id) {
    const node = document.getElementById(id);
    node?.scrollIntoView({ behavior: motionDuration(200) ? 'smooth' : 'instant', block: 'start' });
  }
</script>

<svelte:head>
  <title>{meta.title ?? articleKey} · maincore</title>
  <meta name="description" content={meta.description ?? meta.title ?? ''} />
</svelte:head>

<article class="site-article">
  <header class="article-heading">
    <h1>{meta.title ?? articleKey}</h1>
    <div class="article-meta-row"><span>{meta.author ?? ''}{meta.author && date ? ' · ' : ''}<time datetime={date || undefined}>{date}</time></span></div>
  </header>
  {#if headings.length >= 4}
    <div class="article-toc"><Disclosure label={$t('sidebar.toc')}><nav aria-label={$t('sidebar.toc')}>
      {#each headings as heading}<a href={`#${heading.id}`} onclick={(event) => { event.preventDefault(); jump(heading.id); }}>{heading.text}</a>{/each}
    </nav></Disclosure></div>
  {/if}
  <div class="section-body article-prose" bind:this={body}>{@render children()}</div>
  {#key articleKey}<Giscus />{/key}
</article>

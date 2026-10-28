<script>
  import { tick } from 'svelte';
  import { t } from '$lib/i18n/index.js';
  let { body, routeKey } = $props();
  let headings = $state([]);
  let contents = $state.raw(null);
  function close() { if (contents) contents.open = false; }
  let summary = $state.raw(null);
  $effect(() => {
    routeKey;
    const target = body;
    let cancelled = false;
    close();
    tick().then(() => {
      if (cancelled || !target) return;
      headings = [...target.querySelectorAll('h2, h3')].map((node, index) => {
        node.id ||= 'article-section-' + index;
        return { id: node.id, text: node.textContent, nested: node.tagName === 'H3' };
      });
    });
    return () => cancelled = true;
  });
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && contents?.contains(event.target)) {
    close(); summary?.focus();
  }
}} />

{#if headings.length}
  <details class="reading-toc" bind:this={contents}>
    <summary bind:this={summary}>{$t('sidebar.toc')}</summary>
    <nav aria-label={$t('sidebar.toc')}>
      {#each headings as heading}
        <a class:nested={heading.nested} href={'#' + heading.id} onclick={close}>{heading.text}</a>
      {/each}
    </nav>
  </details>
{/if}

<style>
  .reading-toc { position: sticky; top: -10px; z-index: 5; margin-bottom: 24px; background: #101c23; border-block: 1px solid #304650; }
  summary { cursor: pointer; min-height: 44px; padding: 12px; font-size: .85rem; }
  summary:focus-visible { outline: 1px solid #a2c6d7; outline-offset: -2px; }
  nav { display: grid; max-height: min(50svh, 380px); overflow: auto; overscroll-behavior: contain; padding: 4px 8px 12px; }
  a { display: block; padding: 10px 12px; min-height: 40px; font-size: .84rem; line-height: 1.5; }
  a.nested { padding-inline-start: 28px; color: #9cb5c2; font-size: .8rem; }
</style>

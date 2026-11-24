<script>
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { t } from '$lib/i18n/index.js';
  import Icon from '$lib/studio/Icon.svelte';

  let { variant = 'legacy' } = $props();

  let query = $state('');
  let resultSet = $state.raw({ term: '', items: [] });
  let focused = $state(false);
  let input = $state();
  let resultsPanel = $state();
  let searchModule;
  let blurTimer;

  const componentId = $props.id();
  const id = componentId + '-results';
  const term = $derived(query.trim());
  const resultTerm = $derived(term || resultSet.term);
  const expanded = $derived(focused && Boolean(term));
  const shortcut = browser && /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K';

  function loadSearch() {
    searchModule ??= import('$lib/search.js').catch((error) => {
      searchModule = undefined;
      throw error;
    });
    return searchModule;
  }

  $effect(() => {
    const requested = term;
    let cancelled = false;
    if (requested) {
      loadSearch().then(
        ({ search }) => {
          if (!cancelled) resultSet = { term: requested, items: search(requested) };
        },
        () => {
          if (!cancelled) resultSet = { term: requested, items: [] };
        }
      );
    }
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    page.url.pathname;
    focused = false;
  });

  $effect(() => () => clearTimeout(blurTimer));

  function enter() {
    clearTimeout(blurTimer);
    focused = true;
    loadSearch().catch(() => {});
  }

  function exit(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    blurTimer = setTimeout(() => (focused = false), 150);
  }

  function handleKeys(event) {
    if (event.isComposing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.defaultPrevented) {
      event.preventDefault();
      input?.focus();
      enter();
      return;
    }
    if (event.target !== input && !resultsPanel?.contains(event.target)) return;
    if (event.key === 'Escape' && focused) {
      if (event.target !== input) input?.focus();
      focused = false;
      event.preventDefault();
    } else {
      moveBetweenResults(event);
    }
  }

  function moveBetweenResults(event) {
    if (!expanded || resultSet.term !== term) return;
    if (event.key === 'Enter' && event.target === input) {
      resultsPanel?.querySelector('a')?.click();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [...(resultsPanel?.querySelectorAll('a') ?? [])];
    if (!links.length) return;
    const index = links.indexOf(event.target);
    if (event.target !== input && index < 0) return;
    const next = index + (event.key === 'ArrowDown' ? 1 : -1);
    event.preventDefault();
    (next < 0 ? input : links[Math.min(next, links.length - 1)])?.focus();
  }
</script>

<svelte:window onkeydown={handleKeys} />

<div
  class="search-wrap"
  class:studio-search={variant === 'studio'}
  role="search"
  aria-label={$t('search.placeholder')}
  onfocusin={enter}
  onfocusout={exit}
>
  <div class="search-inner">
    {#if variant === 'studio'}<span class="search-symbol"><Icon name="search" /></span>{/if}
    <input
      bind:this={input}
      bind:value={query}
      type="text"
      inputmode="search"
      class="search-input"
      placeholder={$t('search.placeholder')}
      aria-label={$t('search.placeholder')}
      aria-controls={expanded ? id : undefined}
      aria-keyshortcuts="Meta+K Control+K"
      autocomplete="off"
      onclick={() => (focused = true)}
      oninput={() => (focused = true)}
    />
    {#if !focused && !term}<kbd class="kbd-hint" aria-hidden="true">{shortcut}</kbd>{/if}
  </div>
  <div class="search-drop expressive-popover" {id} bind:this={resultsPanel} data-open={expanded} inert={!expanded}>
    {#if resultTerm}
      {#if resultSet.term !== resultTerm}
        <span class="search-empty" role="status">{$t('search.loading')}</span>
      {:else if resultSet.items.length}
        <ul class="search-results" role="list">
          {#each resultSet.items as result (result.slug)}
            <li>
              <a href={result.slug} class="search-item" onclick={() => (focused = false)}>
                <span class="s-kind">{result.kind}</span>
                {#if result.hl.inTitle}
                  <span class="s-title">{@html result.hl.html}</span>
                {:else}
                  <span class="s-title">{result.title}</span>
                  <span class="s-snippet">{@html result.hl.html}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <span class="search-empty" role="status">{$t('search.no_results')}</span>
      {/if}
    {/if}
  </div>
</div>

<style>
  .search-wrap {
    position: relative;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    height: 100%;
  }
  .search-inner {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
  }
  .search-input {
    width: 170px;
    height: 100%;
    padding: 0 48px 0 8px;
    font: 0.9rem var(--f-b);
    color: var(--c-t);
    background: transparent;
    outline: none;
  }
  .kbd-hint {
    position: absolute;
    inset-inline-end: 10px;
    font: 0.72rem var(--f-b);
    pointer-events: none;
    white-space: nowrap;
  }
  .search-drop {
    position: absolute;
    inset-inline-end: 0;
    z-index: 150;
    width: 320px;
    max-width: 90vw;
    overflow-y: auto;
  }
  .search-results {
    list-style: none;
  }
  .search-item {
    display: block;
    padding: 10px 12px;
    font: 0.85rem/1.5 var(--f-b);
    color: var(--c-t);
    overflow-wrap: anywhere;
  }
  .s-kind {
    font-size: 0.72rem;
    white-space: nowrap;
    margin-inline-end: 5px;
  }
  .s-title {
    font-weight: 600;
  }
  .s-snippet {
    display: block;
    font-size: 0.78rem;
    margin-top: 2px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .search-empty {
    display: block;
    padding: 12px;
    font: 0.82rem var(--f-b);
  }

  .studio-search {
    display: block;
    width: min(100%, 260px);
    height: auto;
  }
  .studio-search .search-inner {
    height: 48px;
  }
  .studio-search .search-symbol {
    position: absolute;
    inset-inline-start: 14px;
    display: flex;
    color: var(--studio-muted);
    pointer-events: none;
  }
  .studio-search .search-input {
    width: 100%;
    padding-inline: 44px 54px;
    border: 0;
    border-radius: 24px;
    background: var(--studio-surface);
    color: var(--studio-on-surface);
    font: inherit;
  }
  .studio-search .search-input::placeholder {
    color: var(--studio-muted);
  }
  .studio-search .search-input:focus-visible {
    outline: 2px solid var(--studio-accent);
    outline-offset: 2px;
  }
  .studio-search .kbd-hint {
    inset-inline-end: 14px;
    color: var(--studio-subtle);
    font-family: inherit;
  }
  .studio-search .search-drop {
    inset-block-start: calc(100% + 8px);
    width: min(400px, calc(100vw - 40px));
    max-height: min(56svh, 440px);
    padding: 6px;
    border-radius: 20px;
    background: var(--studio-surface);
    box-shadow: 0 8px 28px rgb(0 0 0 / 28%);
    overscroll-behavior: contain;
  }
  .studio-search .search-item {
    padding: 12px;
    border-radius: 14px;
    color: var(--studio-on-surface);
    font:
      0.93rem/1.45 system-ui,
      sans-serif;
  }
  .studio-search .search-item:focus-visible {
    outline-offset: -2px;
    background: var(--studio-tonal);
  }
  .studio-search .s-kind {
    color: var(--studio-accent);
  }
  .studio-search .s-snippet {
    margin-top: 4px;
    color: var(--studio-muted);
    font-size: 0.83rem;
  }
  .studio-search :global(mark) {
    color: var(--studio-accent);
    background: var(--studio-tonal);
    border-radius: 2px;
  }
  @media (hover: hover) {
    .studio-search .search-item:hover {
      background: var(--studio-tonal);
    }
  }
  @media (pointer: coarse), (max-width: 480px) {
    .search-input {
      padding-inline-end: 8px;
    }
    .studio-search .search-input {
      padding-inline-end: 14px;
      font-size: 16px;
    }
    .kbd-hint {
      display: none;
    }
  }
</style>

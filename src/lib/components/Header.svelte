<script>
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n/index.js';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import { popup } from '$lib/motion.js';

  let query = $state('');
  let results = $state([]);
  let focused = $state(false);
  let inputEl = $state(null);
  let searchFn;
  let searchModulePromise;

  const isMac = browser && /Mac/i.test(navigator.platform);
  const isMobile = browser && /Mobi/i.test(navigator.userAgent);
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  let blurTimer;
  $effect(() => { $page.url.pathname; focused = false; });
  $effect(() => () => clearTimeout(blurTimer));

  function loadSearch() {
    searchModulePromise ??= import('$lib/search.js').then((mod) => {
      searchFn = mod.search;
      return searchFn;
    });
    return searchModulePromise;
  }

  async function doSearch() {
    if (!query.trim()) { results = []; return; }
    const term = query;
    const search = searchFn ?? await loadSearch();
    if (query !== term) return;
    results = search(term);
  }

  $effect(() => { doSearch(); });

  function blurSoon(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    blurTimer = setTimeout(() => focused = false, 150);
  }
  function focus() { inputEl?.focus(); }

  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); focus(); }
    if (e.key === 'Escape') { focused = false; inputEl?.blur(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header id="banner" aria-label="语言与搜索">
  <div id="masthead">
    <LanguageSwitcher />
    <span class="search-wrap" onfocusout={blurSoon}>
      <span class="search-inner">
        <input
          bind:this={inputEl}
          type="text"
          class="search-input"
          placeholder={$t('search.placeholder')}
          aria-label={$t('search.placeholder')}
          bind:value={query}
          onfocus={() => { clearTimeout(blurTimer); focused = true; loadSearch(); }}
        />
        {#if !focused && !query && !isMobile}
          <span class="kbd-hint">{shortcut}</span>
        {/if}
      </span>
      {#if focused && query}
        <div class="search-drop" transition:popup>
          {#if results.length > 0}
            {#each results as r}
              <a href={r.slug} class="search-item">
                <span class="s-kind">[{r.kind}]</span>
                {#if r.hl.inTitle}
                  <span class="s-title">{@html r.hl.html}</span>
                {:else}
                  <span class="s-title">{r.title}</span>
                  <span class="s-snippet">{@html r.hl.html}</span>
                {/if}
              </a>
            {/each}
          {:else}
            <span class="search-empty">{$t('search.no_results')}</span>
          {/if}
        </div>
      {/if}
    </span>
  </div>
</header>

<style>
  .search-wrap { position: relative; flex-shrink: 0; display: flex; align-items: center; height: 100%; }
  .search-inner { position: relative; display: flex; align-items: center; height: 100%; }
  .search-input { width: 170px; height: 100%; padding: 0 48px 0 8px; font: .9rem var(--f-b); color: var(--c-t); background: transparent; outline: none; }
  .kbd-hint { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font: .72rem var(--f-b); pointer-events: none; white-space: nowrap; line-height: 1; }
  .search-drop { position: absolute; right: 0; z-index: 150; width: 320px; max-width: 90vw; overflow-y: auto; }
  .search-item { display: block; padding: 10px 12px; font: .85rem/1.5 var(--f-b); color: var(--c-t); overflow-wrap: anywhere; }
  .s-kind { font-size: .72rem; white-space: nowrap; }
  .s-title { font-weight: 600; }
  .s-snippet { display: block; font-size: .78rem; margin-top: 2px; line-height: 1.5; overflow-wrap: anywhere; }
  .search-empty { display: block; padding: 10px 12px; font: .82rem var(--f-b); }
  @media (max-width: 480px) {
    .search-input { padding-right: 8px; font-size: .85rem; }
    .kbd-hint { display: none; }
  }
</style>

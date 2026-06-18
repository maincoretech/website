<script>
  import { page } from '$app/stores';
  import { siteConfig } from '$lib/siteConfig.js';
  import { search } from '$lib/search.js';
  import { browser } from '$app/environment';
  import { t } from '$lib/i18n/index.js';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let { ontoggle } = $props();

  let showHamburger = $derived(/^\/(blog|news)\/[^/]+/.test($page.url.pathname));

  let query = $state('');
  let results = $state([]);
  let focused = $state(false);
  let inputEl = $state(null);
  let headerHidden = $state(false);

  const isMac = browser && /Mac/i.test(navigator.platform);
  const isMobile = browser && /Mobi/i.test(navigator.userAgent);
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  let lastScrollY = $state(0);

  function onScroll() {
    const y = window.scrollY;
    if (y < 60) { headerHidden = false; }
    else if (y > lastScrollY + 5) { headerHidden = true; }
    else if (y < lastScrollY - 5) { headerHidden = false; }
    lastScrollY = y;
  }

  $effect(() => {
    if (!browser) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function doSearch() {
    if (!query.trim()) { results = []; return; }
    results = search(query);
  }

  $effect(() => { doSearch(); });

  function blurSoon() { setTimeout(() => focused = false, 150); }
  function focus() { inputEl?.focus(); }

  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); focus(); }
    if (e.key === 'Escape') { inputEl?.blur(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header id="banner" class:header-hidden={headerHidden}>
  <div id="masthead">
    {#if showHamburger}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="hamburger" onmousedown={(e) => { e.stopPropagation(); ontoggle?.(); }} onkeydown={(e) => e.key === 'Enter' && ontoggle?.()} role="button" tabindex="0" aria-label="菜单">☰</span>
    {/if}
    <div class="site-emboss">{siteConfig.domain}</div>
    <span class="spacer"></span>
    <LanguageSwitcher />
    <span class="search-wrap">
      <span class="search-inner">
        <input
          bind:this={inputEl}
          type="text"
          class="search-input"
          placeholder={$t('search.placeholder')}
          bind:value={query}
          onfocus={() => focused = true}
          onblur={blurSoon}
        />
        {#if !focused && !query && !isMobile}
          <span class="kbd-hint">{shortcut}</span>
        {/if}
      </span>
      {#if focused && query}
        <div class="search-drop">
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
  <div id="site-sections-bar">
    <nav id="site-section-links">
      {#each siteConfig.nav as item}
        <a href={item.href}>{$t('nav.' + item.label)}</a>
      {/each}
    </nav>
  </div>
</header>

{#if showHamburger && headerHidden}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span class="floating-hamburger" onclick={() => ontoggle?.()} onkeydown={(e) => e.key === 'Enter' && ontoggle?.()} role="button" tabindex="0" aria-label="菜单">☰</span>
{/if}

<style>
  .search-wrap { margin-right: 20px; flex-shrink: 0; display: flex; align-items: center; height: 100%; padding: 8px 0; }
  .hamburger {
    margin-left: 16px; cursor: pointer; font-size: 1rem; color: var(--c-t); opacity: .5;
    height: 36px; width: 36px; display: flex; align-items: center; justify-content: center;
    border-radius: 4px; user-select: none; transition: opacity .15s, background .15s;
  }
  .hamburger:hover { opacity: .85; background: var(--c-hv); }
  .floating-hamburger {
    position: fixed; top: 24px; left: 24px; z-index: 200;
    width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
    font-size: 1rem; color: rgba(60,75,90,.7);
    background: rgba(205,218,224,.75);
    box-shadow: 0 2px 8px rgba(0,0,0,.12);
    display: flex; align-items: center; justify-content: center;
    animation: float-in .2s ease;
    transition: background .15s;
    user-select: none;
  }
  @keyframes float-in { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
  .spacer { flex: 1; }
  .search-inner { position: relative; display: flex; align-items: center; height: 100%; }
  .search-input {
    width: 170px; height: 100%; padding: 0 50px 0 14px; border: 1px solid rgba(120,150,170,.25); border-radius: 5px;
    font: .9rem var(--f-b); color: var(--c-t); background: rgba(240,246,250,.7); outline: none;
    transition: width .25s ease, border-color .2s, background .2s;
  }
  .search-input:focus { border-color: var(--c-sh); background: rgba(235,242,248,.9); width: 220px; }
  .kbd-hint {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    font: .72rem var(--f-b); color: rgba(51,71,85,.2); pointer-events: none; white-space: nowrap; line-height: 1;
  }
  .search-drop {
    position: absolute; top: 100%; right: 0; z-index: 150; margin-top: 4px; margin-right: 4px; width: 320px;
    background: rgb(225,235,242); border: 1px solid #8aa0b0; border-radius: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,.12); max-height: 260px; overflow-y: auto; width: 320px; max-width: 90vw;
    animation: drop-in .18s ease;
  }
  @keyframes drop-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  .search-item { display: block; padding: 8px 12px; font: .85rem/1.4 var(--f-b); color: var(--c-t); overflow-wrap: anywhere; }
  .search-item:hover { background: var(--c-hv); }
  .s-kind { font-size: .72rem; color: rgb(100,120,135); white-space: nowrap; }
  .s-title { font-weight: 600; }
  .s-snippet { display: block; font-size: .78rem; color: rgba(51,71,85,.65); margin-top: 2px; line-height: 1.4; overflow-wrap: anywhere; }
  .s-snippet :global(mark) { background: #ff0; color: inherit; padding: 0 1px; border-radius: 2px; }
  .search-empty { display: block; padding: 8px 12px; font: .82rem var(--f-b); color: rgba(51,71,85,.5); }

  @media (max-width: 480px) {
    .search-wrap { margin-right: 1vw; padding: 6px 8px; margin-left: auto; }
    .search-input { width: 100%; padding: 0 12px; font-size: .85rem; border-radius: 4px; }
    .search-input:focus { width: 100%; }
    .search-drop { right: auto; left: 0; width: 100%; margin-right: 0; }
    .kbd-hint { display: none; }
  }
</style>


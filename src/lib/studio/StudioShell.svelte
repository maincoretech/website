<script>
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { setContext } from 'svelte';
  import { msg } from '$lib/i18n/index.js';
  import { siteConfig } from '$lib/siteConfig.js';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import Icon from './Icon.svelte';
  import { studioLinks, studioOutline, studioSection } from './navigation.js';
  import { pressFeedback } from './press-feedback.js';
  import './studio.css';

  let { children, pending } = $props();
  let main = $state();
  let outline = $state.raw();

  setContext(studioOutline, (snippet) => {
    outline = snippet;
    return () => { if (outline === snippet) outline = undefined; };
  });

  const section = $derived(studioSection(page.url.pathname));
  const selectedIndex = $derived(studioLinks.findIndex(({ href }) => section === href));
  const sectionTitle = $derived(page.url.pathname === section ? studioLinks[selectedIndex]?.label : undefined);
  const isIndex = $derived(page.url.pathname === '/' || Boolean(sectionTitle));
  const buildTime = __BUILD_TIME__;
  const buildTimeLabel = buildTime.slice(0, 16).replace('T', ' ') + ' UTC';

  afterNavigate(({ from, to, type }) => {
    if (main && !to?.url.hash && from?.url.pathname !== to?.url.pathname && type !== 'enter' && type !== 'popstate') {
      if (document.activeElement?.matches('.studio-nav a:focus-visible')) return;
      main.focus({ preventScroll: true });
    }
  });
</script>

<div class="studio" class:route-pending={pending}>
  <a class="studio-skip" href="#site-content">{$msg('跳到内容')}</a>
  <div class="studio-shell" class:studio-index={isIndex} class:studio-section-index={Boolean(sectionTitle)}>
    {#each studioLinks as { label } (label)}
      <span class="studio-watermark" class:is-current={sectionTitle === label} data-title={label} lang="en" aria-hidden="true">{label}</span>
    {/each}
    <header class="studio-header">
      <a href="/" class="studio-icon-button studio-press studio-brand" aria-label={$msg('maincore，返回首页')}
        title="maincore" use:pressFeedback data-sveltekit-preload-code="viewport">
        <img src="/favicon.png" alt="" width="32" height="32" />
      </a>
      <nav class="studio-nav" aria-label={$msg('主导航')} lang="en" data-sveltekit-preload-code="viewport"
        data-sveltekit-keepfocus class:has-selection={selectedIndex >= 0} style:--selected-index={Math.max(0, selectedIndex)}>
        {#each studioLinks as { href, label, icon } (href)}
          <a {href} class="studio-icon-button studio-press" aria-label={label}
            aria-current={section === href ? 'page' : undefined} use:pressFeedback={0.24}>
            <Icon name={icon} />
          </a>
        {/each}
      </nav>
    </header>

    <div class="studio-utilities">
      <SearchBox variant="studio" />
      {#if outline}{@render outline()}{/if}
    </div>

    <main id="site-content" class="studio-main" bind:this={main} tabindex="-1" aria-busy={pending || undefined}>
      {@render children()}
    </main>

    <footer class="studio-footer">
      <span>{siteConfig.copyright}</span>
      <span class="studio-build"><span lang="en">buildtime</span><time datetime={buildTime}>{buildTimeLabel}</time></span>
      <a href="https://github.com/maincoretech" class="studio-icon-button studio-press" aria-label="GitHub"
        title="GitHub" use:pressFeedback>
        <Icon name="github" size={17} />
      </a>
    </footer>
  </div>
</div>

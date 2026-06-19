<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.js';

  let { open, onclose } = $props();

  let headings = $derived($page.data?.headings ?? []);

  function close() { onclose?.(); }
</script>

{#if open}
  <div class="backdrop" onmousedown={close} role="presentation"></div>
{/if}

<aside class="drawer" class:open>
  <div id="current-page-navigation">
    <div id="navigation-header">
      <span class="navigation-title">{$t('sidebar.toc')}</span>
    </div>
    <div id="navigation-links">
      {#each headings as h, i}
        <div class="navigation-link toc-link" class:toc-h3={h.level === 'H3'}>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span onclick={() => { const el = document.querySelectorAll('.section-body h2, .section-body h3')[i]; el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); close(); }} onkeydown={(e) => e.key === 'Enter' && (() => { const el = document.querySelectorAll('.section-body h2, .section-body h3')[i]; el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); close(); })()} role="link" tabindex="0">{h.text}</span>
        </div>
      {/each}
    </div>
  </div>
</aside>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,.15); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: fade-in .15s ease; }
  @keyframes fade-in { from { opacity: 0 } }
  .drawer {
    position: fixed; top: 96px; bottom: 0; z-index: 160; width: 14vw; min-width: 180px;
    left: -260px; transform: scale(.92); transform-origin: left center;
    transition: left .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1);
  }
  .drawer.open { left: 0; transform: scale(1); }

  #current-page-navigation {
    margin-top: 54px; min-height: 300px; padding-bottom: 50px;
    background-image:
      linear-gradient(145deg, rgba(200,225,240,.4), rgba(175,195,205,.3) 25%, rgba(165,182,190,.09) 75%, rgba(198,220,230,.4)),
      linear-gradient(240deg, transparent 30%, rgba(175,195,205,.1) 48%, rgba(205,220,230,.13) 54%, rgba(165,182,190,.2) 60%, transparent 80%);
    box-shadow: 4px 2px 6px rgba(180,210,225,.5), -1px 0 5px rgba(180,210,225,.4);
  }
  #navigation-header {
    display: flex; justify-content: center; align-items: center; min-height: 40px; margin-bottom: 35px;
    background: var(--c-sh); box-shadow: 0 4px 10px rgba(64,64,64,.5);
  }
  #navigation-header .navigation-title {
    font: 300 1.2rem var(--f-h); color: rgb(204,218,230); letter-spacing: .15rem;
  }
  #navigation-links { display: flex; flex-direction: column; align-items: stretch; }
  .navigation-link { text-align: left; }
  .toc-link span { font-size: .85rem; padding: 5px 12px 5px 16px; cursor: pointer; display: block; }
  .toc-h3 { padding-left: 24px !important; font-size: .8rem !important; opacity: .85; }
</style>

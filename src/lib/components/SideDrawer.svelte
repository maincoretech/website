<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.js';

  let { open, onclose } = $props();

  let headings = $derived($page.data?.headings ?? []);

  function close() {
    onclose?.();
  }
</script>

<aside class="drawer" class:open>
  <div id="current-page-navigation">
    <div id="navigation-header">
      <span class="navigation-title">{$t('sidebar.toc')}</span>
    </div>
    <div id="navigation-links">
      {#each headings as h, i}
        <div class="navigation-link toc-link" class:toc-h3={h.level === 'H3'}>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            onclick={() => {
              const el = document.querySelectorAll('.section-body h2, .section-body h3')[i];
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              close();
            }}
            onkeydown={(e) =>
              e.key === 'Enter' &&
              (() => {
                const el = document.querySelectorAll('.section-body h2, .section-body h3')[i];
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                close();
              })()}
            role="link"
            tabindex="0">{h.text}</span
          >
        </div>
      {/each}
    </div>
  </div>
</aside>

<style>
  .drawer {
    --footer-clearance: 116px;
    position: fixed;
    top: 76px;
    bottom: var(--footer-clearance);
    left: 0;
    z-index: 160;
    width: 272px;
    max-width: 82vw;
    overflow-y: auto;
    background: linear-gradient(
      to bottom,
      rgba(205, 218, 224, 0.98) 0%,
      rgba(205, 218, 224, 0.98) 76%,
      rgba(205, 218, 224, 0.58) 90%,
      rgba(205, 218, 224, 0) 100%
    );
    border-right: 1px solid transparent;
    border-image: linear-gradient(to bottom, rgba(80, 110, 130, 0.24) 0 76%, transparent 100%) 1;
    transform: translateX(calc(-100% - 18px));
    transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .drawer.open {
    transform: translateX(0);
  }
  #current-page-navigation {
    min-height: 100%;
    padding-bottom: 24px;
  }
  #navigation-header {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 0 16px;
    background: var(--c-nav);
    border-bottom: 1px solid rgba(80, 110, 130, 0.2);
  }
  #navigation-header .navigation-title {
    font: 600 0.9rem var(--f-b);
    color: var(--c-t);
    letter-spacing: 0.08rem;
  }
  #navigation-links {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
  }
  .navigation-link {
    text-align: left;
  }
  .toc-link span {
    display: block;
    padding: 9px 18px;
    color: var(--c-t);
    font-size: 0.85rem;
    line-height: 1.4;
    cursor: pointer;
    border-left: 3px solid transparent;
  }
  .toc-link span:hover,
  .toc-link span:focus-visible {
    background: rgba(80, 120, 150, 0.14);
    border-left-color: rgba(16, 90, 140, 0.55);
    outline: none;
  }
  .toc-h3 span {
    padding-left: 32px;
    color: rgba(51, 71, 85, 0.78);
    font-size: 0.8rem;
  }
  @media (max-width: 640px) {
    .drawer {
      --footer-clearance: 88px;
      top: 74px;
    }
  }
  @media (max-width: 480px) {
    .drawer {
      --footer-clearance: 72px;
      top: 64px;
      width: 280px;
      max-width: 86vw;
    }
  }
</style>

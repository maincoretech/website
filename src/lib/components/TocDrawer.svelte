<script>
  import { onMount } from 'svelte';

  let { open, onclose } = $props();
  let headings = $state([]);
  let activeId = $state('');

  function build() {
    const container = document.querySelector('.section-body');
    if (!container) return;
    const hs = container.querySelectorAll('h2, h3, h4');
    headings = Array.from(hs).map((h, i) => {
      const id = h.id || `h-${i}`;
      h.id = id;
      return { id, level: +h.tagName[1], text: h.textContent };
    });
  }

  function onScroll() {
    const hs = document.querySelectorAll('.section-body h2, .section-body h3, .section-body h4');
    let cur = '';
    for (const h of hs) { if (h.getBoundingClientRect().top <= 120) cur = h.id; }
    activeId = cur;
  }

  onMount(() => {
    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  function close() { onclose?.(); }
</script>

{#if open}
  <div class="backdrop" onmousedown={close} role="presentation"></div>
{/if}

<aside class="drawer" class:open>
  <div class="toc-panel">
    <div class="toc-header">
      <span class="toc-header-title">目录</span>
    </div>
    <div class="toc-links">
      {#each headings as h}
        <a
          href="#{h.id}"
          class="toc-link toc-lv{h.level}"
          class:active={activeId === h.id}
          onclick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); close(); }}
        >{h.text}</a>
      {/each}
    </div>
  </div>
</aside>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,.15); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); animation: fade-in .15s ease; }
  @keyframes fade-in { from { opacity: 0 } }
  .drawer {
    position: fixed; top: 76px; bottom: 0; z-index: 160; width: 15vw; min-width: 200px;
    left: -280px; transform: scale(.92); transform-origin: left center;
    transition: left .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1);
  }
  .drawer.open { left: 0; transform: scale(1); }
  .toc-panel {
    margin-top: 54px; min-height: 300px; padding-bottom: 50px;
    background-image:
      linear-gradient(145deg, rgba(200,225,240,.4), rgba(175,195,205,.3) 25%, rgba(165,182,190,.09) 75%, rgba(198,220,230,.4)),
      linear-gradient(240deg, transparent 30%, rgba(175,195,205,.1) 48%, rgba(205,220,230,.13) 54%, rgba(165,182,190,.2) 60%, transparent 80%);
    box-shadow: 4px 2px 6px rgba(180,210,225,.5), -1px 0 5px rgba(180,210,225,.4);
  }
  .toc-header {
    display: flex; justify-content: center; align-items: center; min-height: 40px; margin-bottom: 24px;
    background: var(--c-sh); box-shadow: 0 4px 10px rgba(64,64,64,.5);
  }
  .toc-header-title {
    font: 300 1.2rem var(--f-h); color: rgb(204,218,230); letter-spacing: .15rem;
  }
  .toc-links { display: flex; flex-direction: column; align-items: stretch; padding: 0 12px; }
  .toc-link {
    padding: 6px 10px; font: .82rem/1.4 var(--f-b); color: rgba(51,71,85,.7);
    border-radius: 3px; transition: color .15s, background .15s;
    display: block; text-decoration: none;
  }
  .toc-link:hover { color: var(--c-l); background: var(--c-hv); }
  .toc-link.active { color: rgb(30,70,110); font-weight: 700; background: rgba(80,120,150,.15); }
  .toc-lv3 { padding-left: 24px; font-size: .78rem; }
  .toc-lv4 { padding-left: 36px; font-size: .74rem; }

  @media (max-width: 640px) {
    .drawer { width: 60vw; min-width: 180px; }
  }
</style>

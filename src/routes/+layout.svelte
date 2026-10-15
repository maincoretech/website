<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';
  import BackToTop from '$lib/components/BackToTop.svelte';
  import { onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { initLang } from '$lib/i18n/index.js';
  import { page } from '$app/stores';
  import { motionDuration, reveal } from '$lib/motion.js';

  let { children } = $props();

  let drawerOpen = $state(false);
  let routeTransition;
  let isPreview = $derived($page.url.pathname === '/preview' || $page.url.pathname.startsWith('/preview/'));

  onMount(initLang);

  onNavigate((navigation) => {
    drawerOpen = false;
    routeTransition?.skipTransition();
    if (!motionDuration(180)) return;
    if (!document.startViewTransition) {
      return () => reveal(document.querySelector('.home-preview, #toc-container'));
    }
    return new Promise((resolve) => {
      routeTransition = document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
      routeTransition.finished.catch(() => {});
      routeTransition.ready.catch(() => {});
      routeTransition.updateCallbackDone.catch(() => resolve());
    });
  });
</script>

{#if isPreview}
  {@render children()}
{:else}
<Header ontoggle={() => drawerOpen = !drawerOpen} />
<SideDrawer open={drawerOpen} onclose={() => drawerOpen = false} />

<div id="content-container">
  <main id="toc-container" style="view-transition-name: main-content">
    {@render children()}
  </main>
</div>

<BackToTop />
<Footer />
{/if}

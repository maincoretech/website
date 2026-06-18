<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import SideDrawer from '$lib/components/SideDrawer.svelte';
  import BackToTop from '$lib/components/BackToTop.svelte';
  import { onNavigate } from '$app/navigation';

  let { children } = $props();

  let drawerOpen = $state(false);

  onNavigate((navigation) => {
    drawerOpen = false;
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<Header ontoggle={() => drawerOpen = !drawerOpen} />
<SideDrawer open={drawerOpen} onclose={() => drawerOpen = false} />

<div id="content-container">
  <main id="toc-container" style="view-transition-name: main-content">
    {@render children()}
  </main>
</div>

<BackToTop />
<Footer />

<script>
  import '../app.css';
  import SiteShell from '$lib/site/SiteShell.svelte';
  import { onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { initLang } from '$lib/i18n/index.js';
  import { motionDuration, reveal } from '$lib/motion.js';

  let { children } = $props();

  let routeTransition;

  onMount(initLang);

  onNavigate((navigation) => {
    routeTransition?.skipTransition();
    if (!motionDuration(180)) return;
    if (!document.startViewTransition) {
      return () => reveal(document.querySelector('.route-content'));
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

<SiteShell>{@render children()}</SiteShell>

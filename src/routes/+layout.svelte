<script>
  import '../app.css';
  import SiteShell from '$lib/site/SiteShell.svelte';
  import { onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { initLang } from '$lib/i18n/index.js';
  import { motionDuration, reveal } from '$lib/motion.js';
  import { tabSlideDirection } from '$lib/site/tab-motion.js';
  import { prepareTabSlide } from '$lib/site/tab-slide.js';

  let { children } = $props();

  let routeTransition;
  let fallbackAnimation;
  let tabSlide;

  onMount(initLang);

  onNavigate((navigation) => {
    routeTransition?.skipTransition();
    routeTransition = undefined;
    tabSlide?.cancel();
    fallbackAnimation?.cancel();
    if (!motionDuration(180)) return;
    const direction = navigation.from && navigation.to
      ? tabSlideDirection(navigation.from.url.pathname, navigation.to.url.pathname) : 0;
    if (direction) {
      const current = prepareTabSlide(document.getElementById('site-content'), direction);
      tabSlide = current;
      if (current) {
        navigation.complete.catch(() => current.cancel());
        return () => { if (tabSlide === current) current.play(); };
      }
    }
    if (!document.startViewTransition) {
      return () => {
        const content = document.querySelector('.route-content');
        fallbackAnimation = reveal(content);
        fallbackAnimation?.finished.catch(() => {});
      };
    }
    return new Promise((resolve) => {
      routeTransition = document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
      const current = routeTransition;
      current.finished.catch(() => {}).finally(() => {
        if (routeTransition === current) {
          routeTransition = undefined;
        }
      });
      routeTransition.ready.catch(() => {});
      routeTransition.updateCallbackDone.catch(() => resolve());
    });
  });
</script>

<SiteShell>{@render children()}</SiteShell>

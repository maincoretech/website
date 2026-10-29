<script>
  import '../app.css';
  import SiteShell from '$lib/site/SiteShell.svelte';
  import { onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { initLang } from '$lib/i18n/index.js';
  import { motionDuration, reveal } from '$lib/motion.js';
  import { docsZoomDirection, tabSlideDirection } from '$lib/site/tab-motion.js';
  import { prepareTabSlide } from '$lib/site/tab-slide.js';

  let { children } = $props();

  let fallbackAnimation;
  let tabSlide;

  onMount(initLang);

  onNavigate((navigation) => {
    tabSlide?.cancel();
    fallbackAnimation?.cancel();
    if (!motionDuration(180)) return;
    const docsDirection = navigation.from && navigation.to
      ? docsZoomDirection(navigation.from.url.pathname, navigation.to.url.pathname) : 0;
    const direction = docsDirection || (navigation.from && navigation.to
      ? tabSlideDirection(navigation.from.url.pathname, navigation.to.url.pathname) : 0);
    if (direction) {
      const current = prepareTabSlide(document.getElementById('site-content'), direction,
        docsDirection ? { mode: 'zoom', duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' } : undefined);
      tabSlide = current;
      if (current) {
        navigation.complete.catch(() => current.cancel());
        return () => { if (tabSlide === current) current.play(); };
      }
    }
    return () => {
      const content = document.querySelector('.route-content');
      fallbackAnimation = reveal(content);
    };
  });
</script>

<SiteShell>{@render children()}</SiteShell>

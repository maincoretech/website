<script>
  import '../app.css';
  import { afterNavigate } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { onMount } from 'svelte';
  import { initLang } from '$lib/i18n/index.js';
  import SiteShell from '$lib/site/SiteShell.svelte';
  import StudioShell from '$lib/studio/StudioShell.svelte';
  import { usesStudioShell } from '$lib/studio/navigation.js';
  import { createRouteMotion } from '$lib/studio/route-motion.js';
  import '$lib/studio/route-motion.css';

  let { children } = $props();
  const pending = $derived(Boolean(navigating.to && navigating.to.url.pathname !== page.url.pathname));

  onMount(initLang);
  afterNavigate(createRouteMotion());
</script>

{#if usesStudioShell(page.url.pathname)}
  <StudioShell {pending}>{@render children()}</StudioShell>
{:else}
  <SiteShell {pending}>{@render children()}</SiteShell>
{/if}

<script>
  import { dev } from '$app/environment';
  import { onMount } from 'svelte';

  let container;

  function load() {
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'maincoretech/website');
    script.setAttribute('data-repo-id', 'R_kgDOS-pVJQ');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOS-pVJc4C_beO');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    const theme = dev
      ? 'dark'
      : window.location.origin + '/giscus-theme.css?v=5';
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    container.appendChild(script);
  }

  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !container.isConnected) return;
      observer.disconnect();
      load();
    }, { rootMargin: '240px' });
    observer.observe(container);
    return () => observer.disconnect();
  });
</script>

<div id="giscus-container" class="giscus" bind:this={container}></div>

<style>
  .giscus {
    margin-top: 40px;
    min-height: 100px;
  }
  .giscus :global(iframe) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
</style>

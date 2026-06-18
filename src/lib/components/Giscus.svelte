<script>
  import { browser, dev } from '$app/environment';

  let loaded = $state(false);

  $effect(() => {
    if (!browser || loaded) return;
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
    script.setAttribute('data-theme', dev ? 'light' : window.location.origin + '/giscus-theme.css?v=3');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    document.getElementById('giscus-container')?.appendChild(script);
    loaded = true;
  });
</script>

<div id="giscus-container" class="giscus"></div>

<style>
  .giscus { margin-top: 40px; min-height: 100px; }
</style>

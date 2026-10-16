<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { motionDuration } from '$lib/motion.js';
  let { region = 'product', still = false, paper = true } = $props();
  let host;
  let api = $state.raw(null);
  let status = $state('loading');
  export function scroll(delta) { api?.scroll(delta); }
  $effect(() => {
    api?.select(region);
  });
  $effect(() => {
    api?.setStill(still);
  });
  onMount(() => {
    let cancelled = false;
    import('./water-scene.js')
      .then(({ createWaterScene }) => {
        if (cancelled) return;
        api = createWaterScene(host, () => {
          status = 'failed';
          api?.dispose();
          api = null;
        }, { paper, onReady: () => {
          if (!cancelled && status === 'loading') status = 'ready';
        } });
      })
      .catch(() => {
        if (!cancelled) status = 'failed';
      });
    return () => {
      cancelled = true;
      api?.dispose();
    };
  });
</script>

<div class="water-scene" bind:this={host} data-status={status} out:fade|global={{ duration: motionDuration(320) }}>
  {#if status === 'failed'}
    <div class="water-fallback" role="status">
      <p>此设备暂时无法显示动态背景。</p>
      <small>页面内容仍可正常阅读。</small>
      <noscript>启用 JavaScript 后可以查看动态背景。</noscript>
    </div>
  {/if}
</div>

<script>
  import { onMount } from 'svelte';

  let { option, height = '150px', ariaLabel = '数据图表' } = $props();

  let host;
  let chart;
  let reduceMotion = false;

  function render(nextOption, replace = false) {
    chart?.setOption(reduceMotion ? { ...nextOption, animation: false } : nextOption, replace);
  }

  onMount(() => {
    let disposed = false;
    let observer;

    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    void import('$lib/charts/echarts-runtime.js').then(({ initSvgChart }) => {
      if (disposed) return;
      chart = initSvgChart(host);
      render(option);
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(host);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
      chart = undefined;
    };
  });

  $effect(() => {
    render(option, true);
  });
</script>

<div bind:this={host} class="echart" style:height role="img" aria-label={ariaLabel}></div>

<style>
  .echart {
    width: 100%;
    min-width: 0;
  }
</style>

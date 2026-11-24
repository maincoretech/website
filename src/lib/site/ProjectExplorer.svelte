<script>
  import { msg } from '$lib/i18n/index.js';
  import { products } from '$lib/products.js';
  import { transitionContent } from '$lib/motion.js';
  import { architectureHref } from './content.js';
  import BenchmarkHighlights from './BenchmarkHighlights.svelte';
  import KeineArchitecture from './KeineArchitecture.svelte';

  let { product, showMetrics = true } = $props();

  const id = $props.id();
  const catalog = products.flatMap((group) => group.items);
  const isKeine = $derived(product === 'keine');
  const name = $derived(isKeine ? 'Kēne' : 'Hakutaku');
  const project = $derived(catalog.find((item) => item.name === name));
  const details = $derived(isKeine ? '架构' : '资源更新');
  const articleHref = $derived(isKeine ? architectureHref : '/blog/hakutaku');

  let showPerformance = $state(true);
  let updated = $state(false);
  let panel;
  let segmentList;

  const segments = $derived([
    { label: '场景', hash: '6f2a' },
    { label: '剧本', hash: updated ? 'c8d2' : 'a20f', changed: updated },
    { label: '音频', hash: 'e93b' }
  ]);

  function selectView(performance) {
    if (showPerformance !== performance) {
      transitionContent(panel, () => {
        showPerformance = performance;
      });
    }
  }
</script>

<section class="project-explorer" aria-labelledby={`${id}-title`}>
  <h2 id={`${id}-title`} class="visually-hidden">{name}</h2>
  <nav class="project-topics" aria-label={$msg('{0} 内容分类', { 0: name })}>
    <button type="button" aria-pressed={showPerformance} aria-controls={id} onclick={() => selectView(true)}>
      {$msg('性能')}
    </button>
    <button type="button" aria-pressed={!showPerformance} aria-controls={id} onclick={() => selectView(false)}>
      {$msg(details)}
    </button>
  </nav>
  <div {id} bind:this={panel}>
    <div hidden={!showPerformance}><BenchmarkHighlights {product} {showMetrics} /></div>
    {#if isKeine}
      <div hidden={showPerformance}><KeineArchitecture /></div>
    {:else}
      <div hidden={showPerformance}>
        <div class="resource-toolbar">
          <span>game.haku <small>/ release {updated ? 2 : 1}</small></span>
          <button
            type="button"
            aria-pressed={updated}
            onclick={() =>
              transitionContent(segmentList, () => {
                updated = !updated;
              })}
          >
            {$msg(updated ? '还原版本' : '更新一次剧本')}
          </button>
        </div>
        <div class="segment-list" bind:this={segmentList}>
          {#each segments as segment (segment.label)}
            <div class="segment" class:changed={segment.changed}>
              <span class="segment-branch" aria-hidden="true">├─</span>
              <span class="segment-file">{segment.hash}….taku</span>
              <span class="segment-label">{$msg(segment.label)}</span>
              <span class="segment-status">{$msg(updated ? (segment.changed ? '＋ 新段' : '复用') : '已就绪')}</span>
            </div>
          {/each}
          <div class="segment segment-more">
            <span class="segment-branch" aria-hidden="true">└─</span><span class="segment-file">···</span>
          </div>
        </div>
      </div>
    {/if}
    <div class="project-actions">
      <a href={articleHref}>{$msg(isKeine ? '架构笔记 ↗' : '格式与设计 ↗')}</a>
      <a href={project.link} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </div>
  </div>
</section>

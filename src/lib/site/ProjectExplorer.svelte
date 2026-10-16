<script>
  import { msg } from '$lib/i18n/index.js';
  import EngineDemos from './EngineDemos.svelte';
  import { transitionContent } from '$lib/motion.js';
  import { products } from '$lib/products.js';
  let { active = true, product: selectedProduct = 'all', intro = true, includeLive = true, showMetrics = true } = $props();
  const projects = [
    { id: 'keine', label: 'Kēne', views: [{ id: 'performance', label: '性能' }, { id: 'architecture', label: '架构' }, { id: 'live', label: 'Live' }] },
    { id: 'hakutaku', label: 'Hakutaku', views: [{ id: 'performance', label: '性能' }, { id: 'resources', label: '资源更新' }] }
  ];
  let views = $state({ keine: 'performance', hakutaku: 'performance' });
  const catalog = products.flatMap(group => group.items);
  const panels = [];
  const panelId = $props.id();
  function selectView(product, id, index) {
    return transitionContent(panels[index], () => { views[product] = id; });
  }
</script>

<div class="project-explorer">
  {#if intro}<div class="project-switcher">
    <span class="project-root">{$msg("项目")}</span>
  </div>{/if}
  {#each projects as project, index}
    {#if selectedProduct === 'all' || selectedProduct === project.id}
    <section class="stacked-project" aria-labelledby={`${panelId}-${project.id}-title`}>
      <h2 class:visually-hidden={!intro} id={`${panelId}-${project.id}-title`}>{$msg(project.label)}</h2>
      {#if intro}<p class="project-description">{$msg(catalog.find(item => item.name === project.label)?.desc)}。</p>{/if}
      <nav class="project-topics" aria-label={$msg("{0} 内容分类", {0: $msg(project.label)})}>
        {#each project.views.filter(item => includeLive || item.id !== 'live') as item}
          <button type="button" class:active={views[project.id] === item.id} aria-pressed={views[project.id] === item.id} aria-controls={`${panelId}-${project.id}`} onclick={() => selectView(project.id, item.id, index)}>{$msg(item.label)}</button>
        {/each}
      </nav>
      <div id={`${panelId}-${project.id}`} bind:this={panels[index]}>
        <EngineDemos product={project.id} view={views[project.id]} {active} {showMetrics} intro={false} />
      </div>
    </section>
    {/if}
  {/each}
</div>

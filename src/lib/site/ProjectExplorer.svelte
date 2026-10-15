<script>
  import EngineDemos from './EngineDemos.svelte';
  import { transitionContent } from '$lib/motion.js';
  import { products } from '$lib/products.js';
  let { active = true } = $props();
  const projects = [
    { id: 'keine', label: 'Kēne', views: [{ id: 'architecture', label: '架构' }, { id: 'performance', label: '性能' }, { id: 'live', label: 'Live' }] },
    { id: 'hakutaku', label: 'Hakutaku', views: [{ id: 'performance', label: '性能' }, { id: 'resources', label: '资源更新' }] }
  ];
  let views = $state({ keine: 'architecture', hakutaku: 'performance' });
  const catalog = products.flatMap(group => group.items);
  const panels = [];
  const panelId = $props.id();
  function selectView(product, id, index) {
    return transitionContent(panels[index], () => { views[product] = id; });
  }
</script>

<div class="project-explorer">
  <div class="project-switcher">
    <span class="project-root">项目</span>
    <a href="#catalog" class="project-all">项目目录 ↓</a>
  </div>
  {#each projects as project, index}
    <section class="stacked-project" aria-labelledby={`${panelId}-${project.id}-title`}>
      <h2 id={`${panelId}-${project.id}-title`}>{project.label}</h2>
      <p class="project-description">{catalog.find(item => item.name === project.label)?.desc}。</p>
      <nav class="project-topics" aria-label={`${project.label} 内容分类`}>
        {#each project.views as item}
          <button type="button" class:active={views[project.id] === item.id} aria-pressed={views[project.id] === item.id} aria-controls={`${panelId}-${project.id}`} onclick={() => selectView(project.id, item.id, index)}>{item.label}</button>
        {/each}
      </nav>
      <div id={`${panelId}-${project.id}`} bind:this={panels[index]}>
        <EngineDemos product={project.id} view={views[project.id]} {active} intro={false} />
      </div>
    </section>
  {/each}
</div>

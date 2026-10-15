<script>
  import { products } from '$lib/products.js';
  import { t } from '$lib/i18n/index.js';
  import ProjectExplorer from '$lib/site/ProjectExplorer.svelte';
</script>
<svelte:head>
  <title>{$t('nav.product')} · maincore</title>
  <meta name="description" content={$t('pages.product.subtitle')} />
</svelte:head>
<h1 class="visually-hidden">{$t('nav.product')}</h1>
<ProjectExplorer />
<section id="catalog" class="catalog" aria-label="项目目录">
  {#each products.filter(group => group.items.some(item => !['Kēne', 'Hakutaku'].includes(item.name))) as group}
    <div class="catalog-group">
      <h2>{group.category}</h2>
      {#each group.items.filter(item => !['Kēne', 'Hakutaku'].includes(item.name)) as item}
        <a class="catalog-item" href={item.link} target="_blank" rel="noopener noreferrer">
          <strong>{item.name} ↗</strong><p>{item.desc}</p>
        </a>
      {/each}
    </div>
  {/each}
</section>

<script>
  import { msg } from '$lib/i18n/index.js';
  import { products } from '$lib/products.js';
  import '$lib/site/product.css';
</script>
<svelte:head>
  <title>maincore</title>
  <meta name="description" content={$msg("用 Kēne 制作视觉小说，用 Hakutaku 打包与更新游戏资源。了解 maincore 的开发工具、使用文档与实测数据。")} />
</svelte:head>
<div class="product-page project-overview">
<h1 class="visually-hidden">{$msg("maincore 产品")}</h1>
<div class="overview-projects">
  <section class="overview-project keine-hero" aria-labelledby="keine-product-title">
    <p class="product-eyebrow">{$msg("视觉小说引擎")}</p>
    <h2 id="keine-product-title">Kēne</h2>
    <p class="product-summary">{$msg("编写剧本、编辑演出、预览与打包。")}<br />{$msg("制作原生运行的视觉小说。")}</p>
    <p class="product-meta">Eiyashou · Editor · Preview</p>
    <div class="product-actions"><a class="primary-action" href="/product/keine">{$msg("了解 Kēne →")}</a></div>
  </section>
  <section class="overview-project" aria-labelledby="hakutaku-product-title">
    <p class="product-eyebrow">{$msg("游戏资源格式")}</p>
    <h2 id="hakutaku-product-title">Hakutaku</h2>
    <p class="product-summary">{$msg("加密存储、按需读取与增量更新。")}<br />{$msg("为引擎和工具组织游戏资源。")}</p>
    <p class="product-meta">{$msg("签名快照 · 数据段复用")}</p>
    <div class="product-actions"><a href="/product/hakutaku">{$msg("了解 Hakutaku →")}</a></div>
  </section>
</div>
<section id="catalog" class="catalog" aria-label={$msg("项目目录")}>
  {#each products.filter(group => group.items.some(item => !['Kēne', 'Hakutaku'].includes(item.name))) as group}
    <div class="catalog-group">
      <h2>{$msg(group.category)}</h2>
      {#each group.items.filter(item => !['Kēne', 'Hakutaku'].includes(item.name)) as item}
        <a class="catalog-item" href={item.link} target="_blank" rel="noopener noreferrer">
          <strong>{$msg(item.name)} ↗</strong><p>{$msg(item.desc)}</p>
        </a>
      {/each}
    </div>
  {/each}
</section>
</div>

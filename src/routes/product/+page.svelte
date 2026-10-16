<script>
  import { products } from '$lib/products.js';
  import ScriptPreview from '$lib/site/ScriptPreview.svelte';
  import '$lib/site/product.css';
</script>
<svelte:head>
  <title>maincore</title>
  <meta name="description" content="用 Kēne 制作视觉小说，用 Hakutaku 打包与更新游戏资源。了解 maincore 的开发工具、使用文档与实测数据。" />
</svelte:head>
<div class="product-page">
<h1 class="visually-hidden">maincore 产品</h1>
<section class="product-hero keine-hero" aria-labelledby="keine-product-title">
  <div>
    <p class="product-eyebrow">KĒNE / 视觉小说引擎</p>
    <h2 class="product-name" id="keine-product-title">Kēne</h2>
    <p class="product-promise">写下剧本，编排演出。<br />做出可以运行的视觉小说。</p>
    <p class="product-summary">用 Eiyashou 描述对白、场景与分支，在 Editor 与 Preview 中编辑和调试，再将作品打包分享。</p>
    <div class="product-actions"><a class="primary-action" href="/product/keine">了解 Kēne →</a><a href="/blog/keine-development-and-release">使用指南</a></div>
    <p class="product-meta">原生运行 · Rust / Bevy / wgpu</p>
  </div>
  <ScriptPreview />
</section>
<div class="product-benefits">
  <section><h3>编写故事</h3><p>用文本组织对白和选择，让分支与演出写在同一份剧本里。</p></section>
  <section><h3>编辑与预览</h3><p>在工作台中修改项目，通过 Preview 检查运行效果。</p></section>
  <section><h3>打包与分享</h3><p>导出试玩副本，或按正式发行流程构建引擎和资源包。</p></section>
</div>
<section class="product-secondary" aria-labelledby="hakutaku-product-title">
  <div><p class="product-eyebrow">HAKUTAKU / 游戏资源格式</p><h2 id="hakutaku-product-title">Hakutaku</h2><p class="product-summary">为视觉小说的图片、声音与剧本提供加密存储、按需读取和增量更新。</p><div class="product-actions"><a href="/product/hakutaku">了解 Hakutaku →</a><a href="https://github.com/maincoretech/hakutaku" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></div>
  <div><h3>更新内容，不必重新分发整包。</h3><p class="product-summary">签名快照描述一个发行版本，数据段保存实际资源。未改变的数据可以继续复用，需要的内容按块读取。</p><p class="product-note">面向引擎与工具开发者；下载、解码和播放由宿主处理。</p></div>
</section>
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
</div>

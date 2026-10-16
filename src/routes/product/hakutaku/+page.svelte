<script>
  import { msg } from '$lib/i18n/index.js';
  import HakutakuFlow from '$lib/site/HakutakuFlow.svelte';
  import ProjectExplorer from '$lib/site/ProjectExplorer.svelte';
  import '$lib/site/product.css';
</script>
<svelte:head>
  <title>{$msg("Hakutaku · 游戏资源格式 · maincore")}</title>
  <meta name="description" content={$msg("面向视觉小说的加密资源格式。用签名快照与可复用数据段组织游戏内容，支持随机访问与增量更新。")} />
</svelte:head>
<div class="product-page">
  <section class="product-hero" aria-labelledby="hakutaku-title">
    <div>
      <p class="product-eyebrow">VISUAL NOVEL RESOURCE FORMAT</p>
      <h1 class="product-name" id="hakutaku-title">Hakutaku</h1>
      <p class="product-promise">{$msg("按需读取，复用未变的资源。")}</p>
      <p class="product-summary">{$msg("将剧本、图片和声音组织成可认证的资源包，为引擎提供随机访问和增量更新所需的数据结构。")}</p>
      <div class="product-actions"><a class="primary-action" href="https://github.com/maincoretech/hakutaku" target="_blank" rel="noopener noreferrer">{$msg("查看项目与文档 ↗")}</a><a href="/blog/hakutaku">{$msg("格式设计")}</a></div>
    </div>
    <div class="archive-outline" aria-label={$msg("资源组织示意")}>
      <p>{$msg("一个发行版本")}</p>
      <h2>{$msg("签名快照")} <code>.haku</code></h2>
      <p>{$msg("目录、资源索引与数据段引用")}</p>
      <div class="archive-outline-segments"><span>{$msg("剧本")}</span><span>{$msg("图片")}</span><span>{$msg("音频")}</span></div>
      <h3>{$msg("资源数据段")} <code>.taku</code></h3>
      <p>{$msg("新版本可引用未改变的数据段，无需重复分发。")}</p>
    </div>
  </section>
  <HakutakuFlow />
  <section class="product-section" aria-labelledby="hakutaku-details">
    <h2 id="hakutaku-details">{$msg("性能与资源更新")}</h2>

    <div class="product-explore"><ProjectExplorer product="hakutaku" intro={false} /></div>
  </section>
</div>
<style>
  .archive-outline { border-block: 1px solid #466574; padding: 24px 0; color: #9ab6c5; }
  .archive-outline p { font: .85rem/1.8 var(--f-b); margin: 8px 0; }
  .archive-outline h2, .archive-outline h3 { font: 400 1.25rem/1.7 var(--f-b); color: #bfd8e4; margin: 12px 0; }
  .archive-outline code { font: .9rem var(--f-m); color: #8caebf; }
  .archive-outline-segments { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 28px 0 18px; }
  .archive-outline-segments span { padding: 16px 8px; border-left: 2px solid #7195a9; background: rgb(113 149 169 / 8%); font: .85rem var(--f-b); }
</style>

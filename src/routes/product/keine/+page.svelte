<script>
  import ProjectExplorer from '$lib/site/ProjectExplorer.svelte';
  import ScriptPreview from '$lib/site/ScriptPreview.svelte';
  import '$lib/site/product.css';
</script>
<svelte:head>
  <title>Kēne · 视觉小说引擎 · maincore</title>
  <meta name="description" content="用 Eiyashou 编写故事，在 Editor 与 Preview 中编辑和调试，构建原生视觉小说。查看 Kēne 使用指南、性能实测与架构。" />
</svelte:head>
<div class="product-page">
  <section class="product-hero keine-hero" aria-labelledby="keine-title">
    <div>
      <p class="product-eyebrow">NATIVE VISUAL NOVEL ENGINE</p>
      <h1 class="product-name" id="keine-title">Kēne</h1>
      <p class="product-promise">从剧本到可运行的作品。</p>
      <p class="product-summary">为视觉小说创作提供脚本、编辑、预览与打包工具。把对白、场景、声音和选择写进 Eiyashou，再交给原生引擎呈现。</p>
      <div class="product-actions"><a class="primary-action" href="https://github.com/maincoretech/keine/releases/tag/editor-latest" target="_blank" rel="noopener noreferrer">下载开发版 ↗</a><a href="/blog/keine-development-and-release">使用指南 →</a></div>
      <p class="product-meta">Editor + Preview Engine · 预发行版<br />当前以 macOS 验收为主；<a href="https://github.com/maincoretech/keine" target="_blank" rel="noopener noreferrer">构建要求与源码 ↗</a></p>
    </div>
    <ScriptPreview />
  </section>
  <div class="product-benefits">
    <section><h3>剧本就是入口</h3><p>对白、分支和场景指令由 Eiyashou 统一描述。先写一小段故事，再逐步加入演出。</p></section>
    <section><h3>边编辑，边检查</h3><p>Editor 提供文本、块与属性编辑；通过 Preview 调试项目，检查运行结果。</p></section>
    <section><h3>区分试玩与发行</h3><p>临时试玩可以导出独立副本；正式发行使用专用构建与加密资源包。</p></section>
  </div>
  <section class="product-section" aria-labelledby="keine-start">
    <h2 id="keine-start">开始制作</h2>
    <ol class="product-steps">
      <li><h3>获取开发工具</h3><p>下载包含配套 Preview Engine 的 Editor 开发版；需要自行构建时，查阅项目指南。</p><a href="https://github.com/maincoretech/keine/releases/tag/editor-latest" target="_blank" rel="noopener noreferrer">获取 Editor →</a></li>
      <li><h3>写下第一段剧本</h3><p>从场景和对白开始，再加入选择、背景与声音。</p><a href="/blog/eiyashou">Eiyashou 语法参考 →</a></li>
      <li><h3>预览，再打包</h3><p>先验证作品的运行效果，再选择试玩导出或正式发行流程。</p><a href="/blog/keine-development-and-release">查看导出流程 →</a></li>
    </ol>
    <p class="product-note">站内指南记录了对应版本；最新构建要求与支持范围以项目仓库为准。</p>
  </section>
  <section class="product-section" aria-labelledby="keine-details">
    <h2 id="keine-details">性能与实现</h2>
    <p>查看测量结果、模块分工和脚本示例。测试版本、条件与原始数据随图表列出。</p>
    <div class="product-explore"><ProjectExplorer product="keine" intro={false} /></div>
  </section>
  <section class="product-section">
    <h2>资源打包与更新</h2>
    <p>Kēne 的资源发行流程使用 Hakutaku。了解签名快照、数据段复用和按需读取。</p>
    <div class="product-actions"><a href="/product/hakutaku">了解 Hakutaku →</a><a href="/product">所有产品 →</a></div>
  </section>
</div>

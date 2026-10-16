<script>
  import { products } from '$lib/products.js';
  import EngineDemos from '$lib/site/EngineDemos.svelte';
  import { architectureHref } from '$lib/site/content.js';
  import '$lib/site/keine.css';
  const engine = products.flatMap(group => group.items).find(item => item.name === 'Kēne');
</script>
<svelte:head>
  <title>Kēne · 从一行剧本开始 · maincore</title>
  <meta name="description" content="探索 Kēne 的 Eiyashou 剧本、Core / Loader / Engine 架构，以及 Hakutaku 资源更新方式。" />
</svelte:head>
<div class="keine-content">
      <section class="keine-hero" aria-labelledby="keine-title">
        <div class="keine-wordmark">
          <span class="keine-kicker">NATIVE VISUAL NOVEL ENGINE</span>
          <h1 id="keine-title">Kēne<span>原生视觉小说引擎</span></h1>
        </div>
        <div class="keine-introduction">
          <h2>从一行剧本开始。</h2>
          <p>用 Eiyashou 写下对白、场景和选择。<br />让 Kēne 把它们呈现在原生的舞台上。</p>
          <p class="keine-stack">Rust · Bevy · wgpu</p>
          <div class="keine-actions">
            <a href="#live">看看怎么写 ↓</a>
            <a href={engine.link} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          </div>
        </div>
      </section>

      <nav class="keine-chapters" aria-label="Kēne 页面章节">
        <a href="#live"><small>01</small><span>Live 剧本</span></a>
        <a href="#architecture"><small>02</small><span>引擎架构</span></a>
        <a href="#resources"><small>03</small><span>资源更新</span></a>
      </nav>

      <div class="content-surface keine-experience">
        <EngineDemos standalone />
      </div>

      <section class="keine-reading" aria-labelledby="keine-reading-title">
        <h2 id="keine-reading-title">继续读下去</h2>
        <a href="/blog/eiyashou"><span>Eiyashou</span><small>语法与用例参考 ↗</small></a>
        <a href={architectureHref}><span>Kēne 架构笔记</span><small>从剧本执行到原生呈现 ↗</small></a>
        <a href="/blog/hakutaku"><span>Hakutaku</span><small>资源格式与设计 ↗</small></a>
      </section>


</div>

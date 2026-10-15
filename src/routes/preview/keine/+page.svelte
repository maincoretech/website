<script>
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import { products } from '$lib/products.js';
  import EngineDemos from '../EngineDemos.svelte';
  import GardenScene from '../GardenScene.svelte';
  import { architectureHref } from '../content.js';
  import '../preview.css';
  import './keine.css';
  import '../hover.css';

  const engine = products.flatMap(group => group.items).find(item => item.name === 'Kēne');
  let still = $state(false);
  let reducedMotion = $state(true);
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (reducedMotion = media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
</script>

<svelte:head>
  <title>Kēne · 从一行剧本开始 · maincore</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="探索 Kēne 的 Eiyashou 剧本、Core / Loader / Engine 架构，以及 Hakutaku 资源更新方式。" />
</svelte:head>

<div class="home-preview keine-preview">
  <a class="skip-link" href="#live">跳到交互演示</a>
  <main class="keine-page">
    <GardenScene region="product" still={still || reducedMotion} paper={false} />
    <div class="keine-mask" aria-hidden="true"></div>
    <div class="keine-content">
      <header class="keine-masthead">
        <a class="keine-brand" href="/preview" aria-label="maincore，返回首页">
          <img src="/favicon.png" alt="" width="35" height="35" />
          <span>maincore<small>games & software</small></span>
        </a>
        <a class="keine-back" href="/preview">← 返回首页</a>
      </header>

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

      <div class="preview-sheet keine-experience">
        <EngineDemos standalone />
      </div>

      <section class="keine-reading" aria-labelledby="keine-reading-title">
        <h2 id="keine-reading-title">继续读下去</h2>
        <a href="/blog/eiyashou"><span>Eiyashou</span><small>语法与用例参考 ↗</small></a>
        <a href={architectureHref}><span>Kēne 架构笔记</span><small>从剧本执行到原生呈现 ↗</small></a>
        <a href="/blog/hakutaku"><span>Hakutaku</span><small>资源格式与设计 ↗</small></a>
      </section>

      <footer class="keine-footer">
        <span>Kēne · maincore</span>
        <a href="/preview">回到首页 ↗</a>
      </footer>
    </div>
    <div class="keine-motion">
      <button type="button" disabled={reducedMotion} aria-pressed={still || reducedMotion}
        onclick={() => (still = !still)}>{still || reducedMotion ? '背景已静止' : '暂停背景'}</button>
    </div>
  </main>
  <Header />
</div>

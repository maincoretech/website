<script>
  import { onMount } from 'svelte';
  import { products } from '$lib/products.js';
  import { transitionContent } from '$lib/motion.js';
  import { architectureHref } from './content.js';
  let { view = 'all', active = true, standalone = false } = $props();
  const catalog = products.flatMap((group) => group.items);
  const engine = catalog.find((item) => item.name === 'Kēne');
  const archive = catalog.find((item) => item.name === 'Hakutaku');
  const examples = [
    {
      name: '第一幕',
      file: 'start.shou',
      source:
        '// Eiyashou · 你的第一幕\nscene start {\n  background(room, transition: fade(300ms)),\n  bgm(theme, fade: 500ms),\n\n  "雨停了。",\n  "从这里开始写你的故事。",\n\n  story.end()\n}'
    },
    {
      name: '分支选择',
      file: 'choices.shou',
      source:
        '// Eiyashou · 让故事有不同的方向\nscene start {\n  choice("去哪里？") {\n    "去屋顶": goto(rooftop),\n    "留在教室": goto(classroom)\n  }\n}\n\nscene rooftop { "风从楼顶吹过。" }\nscene classroom { "教室里很安静。" }'
    }
  ];
  const layers = [
    { name: 'Core', caption: '故事的逻辑', text: '执行对白、分支与等待，维护确定性的剧本状态。', path: 'crates/core' },
    {
      name: 'Loader',
      caption: '内容的入口',
      text: '解析 Eiyashou，读取配置与资源，把工程整理为可执行的 Program。',
      path: 'crates/loader'
    },
    {
      name: 'Engine',
      caption: '原生的舞台',
      text: '将剧本状态交给 Bevy，呈现画面、声音和交互。',
      path: 'src/runtime · scene · render'
    }
  ];
  let exampleIndex = $state(0);
  let replay = $state(0);
  let complete = $state(true);
  let paused = $state(false);
  let reducedMotion = $state(true);
  let mounted = $state(false);
  let demoVisible = $state(true);
  let pageVisible = $state(true);
  let layerIndex = $state(0);
  let updated = $state(false);
  let demoElement;
  let codeSurface;
  let architectureDetail;
  let resourceDemo;
  let example = $derived(examples[exampleIndex]);
  let layer = $derived(layers[layerIndex]);
  let codeLines = $derived(example.source.split('\n').map(tokens));
  let playing = $derived(active && (view === 'all' || view === 'live') && demoVisible && pageVisible && !paused);

  function tokens(text) {
    return text
      .split(/(\/\/.*$|"(?:\\.|[^"\\])*"|\b(?:scene|choice|goto|story\.end|background|bgm|fade)\b|\b\d+(?:ms|s)?\b)/g)
      .filter(Boolean)
      .map((value) => ({
        value,
        kind: value.startsWith('//')
          ? 'comment'
          : value.startsWith('"')
            ? 'string'
            : /^(scene|choice|goto|story\.end|background|bgm|fade)$/.test(value)
              ? 'keyword'
              : /^\d/.test(value)
                ? 'number'
                : ''
      }));
  }
  function selectExample(index) {
    return transitionContent(codeSurface, () => {
      exampleIndex = index;
      complete = reducedMotion;
      replay += 1;
      paused = false;
    });
  }
  function togglePlayback() {
    if (complete) {
      complete = reducedMotion;
      replay += 1;
      paused = false;
    } else paused = !paused;
  }
  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      reducedMotion = preference.matches;
      if (reducedMotion) complete = true;
    };
    updateMotion();
    complete = reducedMotion;
    mounted = true;
    const updateVisibility = () => (pageVisible = !document.hidden);
    updateVisibility();
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) =>
            entries.forEach((entry) => {
              if (entry.target === demoElement) demoVisible = entry.isIntersecting;
            })
          )
        : null;
    observer?.observe(demoElement);
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  });
</script>

<section hidden={view !== 'all' && view !== 'live'} id="live" class="preview-section" aria-labelledby="live-title">
        {#if standalone}<p class="demo-eyebrow">01 / EIYASHOU</p>{/if}
        <div class="section-heading">
          <h2 id="live-title" class="sec-title-box"><span class="sec-title-box__title">一小段故事</span></h2>
          <span class="section-aside">Eiyashou · live</span>
        </div>
        <div class="editor-window" bind:this={demoElement}>
          <div class="editor-tabs" role="group" aria-label="选择代码示例">
            {#each examples as item, index}<button
                type="button"
                class:active={exampleIndex === index}
                aria-pressed={exampleIndex === index}
                onclick={() => selectExample(index)}>{item.file}<small>{item.name}</small></button
              >{/each}
          </div>
          <div class="code-surface" bind:this={codeSurface}>
            <pre class="sr-only" aria-label="完整 Eiyashou 示例">{example.source}</pre>
            {#key replay}<div class="code-lines" class:revealing={mounted && !reducedMotion && !complete} style:--reveal-state={playing ? 'running' : 'paused'} aria-hidden="true">
              {#each codeLines as line, index}<div
                  class="code-line"
                >
                  <span class="line-number">{String(index + 1).padStart(2, '0')}</span><span class="line-code"
                    style:--reveal-delay={`${index * 95}ms`}
                    onanimationend={(event) => { if (event.animationName === 'code-reveal' && index === codeLines.length - 1) complete = true; }}
                    >{#each line as token}<span class={token.kind}>{token.value}</span
                      >{/each}</span
                  >
                </div>{/each}
            </div>{/key}
          </div>
          <div class="editor-controls">
            <span class="playback-state" aria-live="polite"
              >{complete ? '示例已显示' : paused ? '已暂停' : '正在展开'}</span
            >
            <button
                type="button"
                class="playback-button"
                disabled={reducedMotion}
                onclick={togglePlayback}
                aria-label={complete ? '重播代码动画' : paused ? '继续代码动画' : '暂停代码动画'}
                >{complete ? '重播' : paused ? '继续' : '暂停'}</button
              >
          </div>
        </div>
        <div class="demo-caption">
          {#if standalone}<small>此处为语法演示，不在浏览器中运行引擎。</small>{/if}
          <a href="/blog/eiyashou">语法与用例 ↗</a>
        </div>
      </section>

      <section hidden={view !== 'all' && view !== 'projects'} id="projects" class="preview-section" aria-labelledby="projects-title">
        <div class="section-heading" hidden={standalone}>
          <h2 id="projects-title" class="sec-title-box"><span class="sec-title-box__title">正在做的</span></h2>
          <a class="section-aside" href="/product">全部项目 ↗</a>
        </div>
        <article id="architecture" class="project-note">
          {#if standalone}
            <p class="demo-eyebrow">02 / ARCHITECTURE</p>
            <h3>从剧本到舞台。</h3>
            <p>点击一个模块，看看它在引擎中承担的工作。</p>
          {:else}
            <h3><a href="/preview/keine">Kēne</a></h3>
            <p>{engine.desc}。</p>
          {/if}
          <div class="architecture-demo">
            <div class="architecture-nodes" role="group" aria-label="查看 Kēne 架构层">
              {#each layers as item, index}<button
                  type="button"
                  class:active={index === layerIndex}
                  aria-pressed={index === layerIndex}
                  onclick={() => transitionContent(architectureDetail, () => (layerIndex = index))}><strong>{item.name}</strong><small>{item.caption}</small></button
                >{/each}
            </div>
            <div class="architecture-detail" aria-live="polite" bind:this={architectureDetail}>
              <span>{layer.path}</span>
              <p>{layer.text}</p>
            </div>
          </div>
          <div class="project-actions">
            {#if !standalone}<a href="/preview/keine">交互介绍 ↗</a>{/if}
            <a href={architectureHref}>架构笔记 ↗</a><a
              href={engine.link}
              target="_blank"
              rel="noopener noreferrer">GitHub ↗</a
            >
          </div>
        </article>
        <article id="resources" class="project-note">
          {#if standalone}<p class="demo-eyebrow">03 / RESOURCES</p>{/if}
          <h3>{standalone ? '只更新改变的那一部分。' : 'Hakutaku'}</h3>
          <p>{standalone ? "Hakutaku 用签名快照引用内容寻址的数据段。点击更新，查看新快照与旧数据的复用关系。" : archive.desc + "。"}</p>
          <div class="resource-demo" bind:this={resourceDemo}>
            <div class="resource-toolbar">
              <span>game.haku <small>/ v{updated ? '2' : '1'}</small></span><button
                type="button"
                aria-pressed={updated}
                onclick={() => transitionContent(resourceDemo, () => (updated = !updated))}>{updated ? '还原版本' : '更新一次剧本'}</button
              >
            </div>
            <div class="segment-list">
              {#each [{ label: '场景', hash: '6f2a' }, { label: '剧本', hash: updated ? 'c8d2' : 'a20f' }, { label: '音频', hash: 'e93b' }] as segment, index}<div
                  class="segment"
                  class:changed={updated && index === 1}
                >
                  <span class="segment-branch" aria-hidden="true">├─</span><span class="segment-file"
                    >{segment.hash}….taku</span
                  ><span class="segment-label">{segment.label}</span><span class="segment-status"
                    >{updated ? (index === 1 ? '＋ 新段' : '复用') : '已就绪'}</span
                  >
                </div>{/each}<div class="segment segment-more"><span class="segment-branch" aria-hidden="true">└─</span><span class="segment-file">···</span></div>
            </div>
          </div>
          <div class="project-actions">
            <a href="/blog/hakutaku">格式与设计 ↗</a><a href={archive.link} target="_blank" rel="noopener noreferrer"
              >GitHub ↗</a
            >
          </div>
        </article>
      </section>

<script>
  import { msg } from '$lib/i18n/index.js';
  import { onMount } from 'svelte';
  import { products } from '$lib/products.js';
  import { transitionContent } from '$lib/motion.js';
  import { architectureHref } from './content.js';
  import KeineArchitecture from './KeineArchitecture.svelte';
  import BenchmarkHighlights from './BenchmarkHighlights.svelte';
  let { view = 'all', product = 'all', active = true, standalone = false, intro = true, showMetrics = true } = $props();
  const instanceId = $props.id();
  const sectionId = name => product === 'all' ? name : `${instanceId}-${name}`;
  const revealStep = 95;
  const revealDuration = 480;
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

  let exampleIndex = $state(0);
  let replay = $state(0);
  let complete = $state(true);
  let reducedMotion = $state(true);
  let mounted = $state(false);
  let demoVisible = $state(true);
  let pageVisible = $state(true);
  let updated = $state(false);
  let demoElement;
  let codeSurface;
  let resourceDemo;
  let example = $derived(examples[exampleIndex]);
  let codeLines = $derived(example.source.split('\n').map(tokens));
  let playing = $derived(active && (view === 'all' || view === 'live') && demoVisible && pageVisible);

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
    });
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

<section hidden={view !== 'all' && view !== 'live'} id={sectionId('live')} class="demo-section" aria-labelledby={sectionId('live-title')}>
        {#if standalone}<p class="demo-eyebrow">01 / EIYASHOU</p>{/if}
        <div class="section-heading">
          <h2 id={sectionId('live-title')} class="sec-title-box"><span class="sec-title-box__title">{$msg("一小段故事")}</span></h2>
          <span class="section-aside">Eiyashou · live</span>
        </div>
        <div class="editor-window" bind:this={demoElement}
          style:--reveal-state={playing ? 'running' : 'paused'}
          style:--reveal-duration={`${revealDuration}ms`}
          style:--progress-duration={`${(codeLines.length - 1) * revealStep + revealDuration}ms`}>
          <div class="editor-tabs" role="group" aria-label={$msg("选择代码示例")}>
            {#each examples as item, index}<button
                type="button"
                class:active={exampleIndex === index}
                aria-pressed={exampleIndex === index}
                onclick={() => selectExample(index)}>{$msg(item.file)}<small>{$msg(item.name)}</small></button
              >{/each}
            {#key replay}<span class="code-progress" class:revealing={mounted && !reducedMotion && !complete} aria-hidden="true"></span>{/key}
          </div>
          <div class="code-surface" bind:this={codeSurface}>
            <pre class="sr-only" aria-label="完整 Eiyashou 示例">{example.source}</pre>
            {#key replay}<div class="code-lines" class:revealing={mounted && !reducedMotion && !complete} style:--reveal-state={playing ? 'running' : 'paused'} aria-hidden="true">
              {#each codeLines as line, index}<div
                  class="code-line"
                >
                  <span class="line-number">{String(index + 1).padStart(2, '0')}</span><span class="line-code"
                    style:--reveal-delay={`${index * revealStep}ms`}
                    onanimationend={(event) => { if (event.animationName === 'code-reveal' && index === codeLines.length - 1) complete = true; }}
                    >{#each line as token}<span class={token.kind}>{token.value}</span
                      >{/each}</span
                  >
                </div>{/each}
            </div>{/key}
          </div>
        </div>
        <div class="demo-caption">
          {#if standalone}<small>{$msg("此处为语法演示，不在浏览器中运行引擎。")}</small>{/if}
          <a href="/blog/eiyashou">{$msg("语法与用例 ↗")}</a>
        </div>
      </section>

      <section hidden={view === 'live'} id={sectionId('projects')} class="demo-section" aria-label={$msg("项目介绍")}>
        <div class="section-heading" hidden={standalone || product !== 'all'}>
          <h2 id={sectionId('projects-title')} class="sec-title-box"><span class="sec-title-box__title">{$msg("正在做的")}</span></h2>
          <a class="section-aside" href="/product">{$msg("全部项目 ↗")}</a>
        </div>
        <article id={sectionId('architecture')} class="project-note" hidden={product !== 'all' && product !== 'keine'}>
          {#if intro}
          {#if standalone}
            <p class="demo-eyebrow">02 / ARCHITECTURE</p>
            <h3>{$msg("从剧本到舞台。")}</h3>
            <p>{$msg("点击一个模块，看看它在引擎中承担的工作。")}</p>
          {:else}
            <h3><a href="/product/keine">Kēne</a></h3>
            <p>{$msg(engine.desc)}。</p>
          {/if}
          {/if}
          <div hidden={view !== 'all' && view !== 'performance'}><BenchmarkHighlights product="keine" {showMetrics} /></div>
          <div class="architecture-demo" hidden={view !== 'all' && view !== 'architecture' && view !== 'projects'}>
            <KeineArchitecture />
          </div>
          <div class="project-actions">
            {#if !standalone && intro}<a href="/product/keine">{$msg("交互介绍 ↗")}</a>{/if}
            <a href={architectureHref}>{$msg("架构笔记 ↗")}</a><a
              href={engine.link}
              target="_blank"
              rel="noopener noreferrer">GitHub ↗</a
            >
          </div>
        </article>
        <article id={sectionId('resources')} class="project-note" hidden={product !== 'all' && product !== 'hakutaku'}>
          {#if intro}
          {#if standalone}<p class="demo-eyebrow">03 / RESOURCES</p>{/if}
          <h3>{$msg(standalone ? '只更新改变的那一部分。' : 'Hakutaku')}</h3>
          <p>{$msg(standalone ? "Hakutaku 用签名快照引用内容寻址的数据段。点击更新，查看新快照与旧数据的复用关系。" : archive.desc + "。")}</p>
          {/if}
          <div hidden={view !== 'all' && view !== 'performance'}><BenchmarkHighlights product="hakutaku" /></div>
          <div class="resource-demo" bind:this={resourceDemo} hidden={view !== 'all' && view !== 'resources' && view !== 'projects'}>
            <div class="resource-toolbar">
              <span>game.haku <small>/ release {$msg(updated ? '2' : '1')}</small></span><button
                type="button"
                aria-pressed={updated}
                onclick={() => transitionContent(resourceDemo, () => (updated = !updated))}>{$msg(updated ? '还原版本' : '更新一次剧本')}</button
              >
            </div>
            <div class="segment-list">
              {#each [{ label: '场景', hash: '6f2a' }, { label: '剧本', hash: updated ? 'c8d2' : 'a20f' }, { label: '音频', hash: 'e93b' }] as segment, index}<div
                  class="segment"
                  class:changed={updated && index === 1}
                >
                  <span class="segment-branch" aria-hidden="true">├─</span><span class="segment-file"
                    >{$msg(segment.hash)}….taku</span
                  ><span class="segment-label">{$msg(segment.label)}</span><span class="segment-status"
                    >{$msg(updated ? (index === 1 ? '＋ 新段' : '复用') : '已就绪')}</span
                  >
                </div>{/each}<div class="segment segment-more"><span class="segment-branch" aria-hidden="true">└─</span><span class="segment-file">···</span></div>
            </div>
          </div>
          <div class="project-actions">
            <a href="/blog/hakutaku">{$msg("格式与设计 ↗")}</a><a href={archive.link} target="_blank" rel="noopener noreferrer"
              >GitHub ↗</a
            >
          </div>
        </article>
      </section>

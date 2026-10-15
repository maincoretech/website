<script>
  import { onMount, tick } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import GardenScene from './GardenScene.svelte';
  import EngineDemos from './EngineDemos.svelte';
  import { siteConfig } from '$lib/siteConfig.js';
  import { t } from '$lib/i18n/index.js';
  import AboutContent from '$lib/about.md';
  import { transitionContent } from '$lib/motion.js';
  import { postModules, architectureSlug } from './content.js';
  import './preview.css';
  import './hover.css';

  const articles = [architectureSlug, 'eiyashou', 'hakutaku']
    .map((slug) => ({ slug, ...postModules['/src/lib/posts/' + slug + '.md'] }))
    .filter((post) => post.title);
  const newsModules = import.meta.glob('/src/lib/news/*.md', { eager: true, import: 'metadata' });
  const news = Object.entries(newsModules)
    .map(([path, meta]) => ({ slug: path.split('/').pop().replace('.md', ''), ...meta }))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const dateText = (date) => String(date).slice(0, 10);
  const sections = siteConfig.nav.filter((section) => section.label !== 'news');
  let region = $state('news');
  let sceneRegion = $state('news');
  let stillScene = $state(false);
  let productView = $state('projects');
  let readingPanel;
  let productPanel;
  let sectionTitle;
  let homeTitle;
  const currentSection = $derived(sections.find((item) => item.label === region));
  async function visit(id) {
    sceneRegion = id;
    const finished = await transitionContent(readingPanel, async () => {
      region = id;
      await tick();
      readingPanel.scrollTop = 0;
    });
    if (finished) (id === 'news' ? homeTitle : sectionTitle)?.focus({ preventScroll: true });
    return finished;
  }
  function onKeydown(event) {
    if (event.key === 'Escape' && region !== 'news' && event.target?.tagName !== 'INPUT') {
      visit('news').then(finished => {
        if (finished) document.querySelector('.brand-home')?.focus();
      });
    }
  }
  let reducedMotion = $state(true);
  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => (reducedMotion = preference.matches);
    updateMotion();
    preference.addEventListener('change', updateMotion);
    return () => preference.removeEventListener('change', updateMotion);
  });
</script>

<svelte:window onkeydown={onKeydown} />
<svelte:head>
  <title>maincore · preview</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="maincore 的项目、开发动态与技术文章。" />
</svelte:head>

<div class="home-preview">
  <a class="skip-link" href="#garden-navigation">选择栏目</a>
  <main class="scene-page">
    <GardenScene region={sceneRegion} still={stillScene || reducedMotion} />
    <div class="garden-brand">
      <button type="button" class="brand-home" aria-label="返回预览首页" onclick={() => visit('news')}><img class="brand-logo" src="/favicon.png" width="42" height="42" alt="" /></button>
      <div>
        <h1>maincore</h1>
        <p>games & software</p>
      </div>
    </div>
    <div class="scene-tools">
      <button
        type="button"
        class="motion-toggle"
        aria-pressed={stillScene || reducedMotion}
        disabled={reducedMotion}
        aria-label={stillScene || reducedMotion ? '播放波纹与视差' : '暂停波纹与视差'}
        onclick={() => (stillScene = !stillScene)}>{stillScene || reducedMotion ? '静止' : '流动'}</button
      >
      <a class="preview-return" href="/">原站 ↗</a>
    </div>
    <nav id="garden-navigation" class="garden-navigation" aria-label="切换栏目">
      {#each sections as section}
        <button
          type="button"
          class:active={region === section.label}
          aria-pressed={region === section.label}
          aria-controls="garden-reading"
          onclick={() => visit(section.label)}
        >
          <span>{$t('nav.' + section.label)}</span>
        </button>
      {/each}
    </nav>
    <aside
      id="garden-reading"
      class="garden-reading preview-sheet"
      aria-label={currentSection ? $t('nav.' + currentSection.label) : '首页'}
      bind:this={readingPanel}
    >
      <div class="reading-heading" hidden={region === 'news'}>
        <h2 bind:this={sectionTitle} tabindex="-1">{currentSection ? $t('nav.' + currentSection.label) : ''}</h2>
        <button type="button" aria-label="回到首页" onclick={() => visit('news')}>←</button>
      </div>
      <div class="product-views" hidden={region !== 'product'} role="group" aria-label="项目内容">
        <button type="button" class:active={productView === 'projects'} aria-pressed={productView === 'projects'} aria-controls="projects" onclick={() => transitionContent(productPanel, () => (productView = 'projects'))}>项目</button>
        <button type="button" class:active={productView === 'live'} aria-pressed={productView === 'live'} aria-controls="live" onclick={() => transitionContent(productPanel, () => (productView = 'live'))}>Live 演示</button>
      </div>
      <div hidden={region !== 'product'} bind:this={productPanel}>
        <EngineDemos view={productView} active={region === 'product'} />
      </div>

      <section hidden={region !== 'blog'} id="writing" class="preview-section" aria-labelledby="writing-title">
        <div class="section-heading">
          <h2 id="writing-title" class="sec-title-box"><span class="sec-title-box__title">开发记录</span></h2>
          <a class="section-aside" href="/blog">去阳台看看 ↗</a>
        </div>
        <div class="preview-entries writing-list">
          {#each articles as article}<a class="preview-entry" href={'/blog/' + article.slug}
              ><span class="entry-title">{article.title}</span><time datetime={dateText(article.date)}
                >{dateText(article.date)}</time
              >
              <p>{article.description}</p></a
            >{/each}
        </div>
      </section>

      <section hidden={region !== 'news'} id="latest" class="preview-section" aria-labelledby="latest-title">
        <div class="section-heading">
          <h2 id="latest-title" class="sec-title-box" bind:this={homeTitle} tabindex="-1"><span class="sec-title-box__title">近况</span></h2>
          <a class="section-aside" href="/news">全部动态 ↗</a>
        </div>
        <div class="preview-entries">
          {#each news as item}<a class="preview-entry" href={'/news/' + item.slug}
              ><span class="entry-title">{item.title}</span><time datetime={dateText(item.date)}
                >{dateText(item.date)}</time
              ></a
            >{/each}
        </div>
      </section>

      <section hidden={region !== 'about'} id="about-preview" class="preview-section about-content">
        <AboutContent />
        <a class="about-more" href="/about">完整介绍 ↗</a>
      </section>

      <div class="reading-end"><span>maincore · 临时预览</span><a href="/about">关于我们 ↗</a></div>
    </aside>
    <noscript
      ><div class="no-script-links">
        <a href="/product">查看项目</a><a href="/blog">阅读文章</a><a href="/news">最新动态</a>
      </div></noscript
    >
  </main>
  <Header />
</div>

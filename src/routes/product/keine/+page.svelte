<script>
  import { msg } from '$lib/i18n/index.js';
  import ProjectExplorer from '$lib/site/ProjectExplorer.svelte';
  import KeineMetrics from '$lib/site/KeineMetrics.svelte';
  import { scrollReveal } from '$lib/site/scroll-reveal.js';
  import '$lib/site/product.css';

  const stageFeatures = [
    { title: '发言角色聚焦', description: '随对白切换立绘的明暗、缩放与模糊，不必逐句设置。' },
    { title: '立绘动画与染色', description: '定时眨眼、随打字切换口型，并根据背景调整立绘色调。' },
    { title: '镜头与舞台特效', description: '推拉、震动、图层视差，以及转场、遮罩和雨雪粒子。' },
    { title: '多轨演出', description: '在脚本时间轴上安排镜头、立绘、音效与粒子，配合关键帧控制节奏。' }
  ];
  const playerFeatures = ['存档与快速读档', '自动播放与已读快进', '历史对白与语音重播', 'CG 与音乐鉴赏', '背景、立绘与视频', 'BGM、音效与语音'];
  const runtimeFeatures = [
    { title: '静态画面', description: '等待阅读时按需刷新，音乐继续播放。' },
    { title: '资源预加载', description: '优先当前画面，限制后台预加载的数量与内存。' },
    { title: '音视频', description: '流式读取，不必把整段媒体载入内存。' }
  ];
  const releaseFeatures = [
    { title: '编译剧本', description: '打包时校验并编译，发行包无需携带 .shou 源文件。' },
    { title: '加密资源', description: 'Hakutaku 提供加密与签名，运行时直接读取所需片段。' },
    { title: '增量打包', description: '复用未改动的数据块，更新内容不必重发整套资源。' }
  ];
  const architectureHighlights = [
    { title: 'Pure Rust Core', text: '脚本执行核心用纯 Rust 实现，独立于 Bevy；编辑器与运行时也以 Rust 构建。' },
    { title: 'Typed IR', text: '脚本经过解析与校验，转为类型化 Program。发行版直接加载编译结果，不在运行时逐句解析源码。' },
    { title: 'Bevy / wgpu', text: '剧本状态与渲染分离，由 Bevy 调度场景，wgpu 对接原生 GPU 后端。' },
    { title: 'Native Editor', text: 'GPUI 编辑器通过版本化 IPC 连接独立的原生预览进程，共用同一套脚本与执行模型。' },
    { title: 'Multi-platform', text: 'Windows、macOS、Linux 桌面构建，共用 Core 与 Loader；另有实验性 Android 运行版，暂不支持视频。' },
    { title: 'Demand-driven', text: '按画面与输入需要唤醒，音频独立推进；资源预取有界，媒体流式读取。' }
  ];
</script>
<svelte:head>
  <title>{$msg("Kēne · 视觉小说引擎 · maincore")}</title>
  <meta name="description" content={$msg("Kēne 是带原生编辑器的视觉小说引擎。用 Eiyashou 编写剧情与多轨演出，内建立绘动画、镜头特效、原生预览和 Hakutaku 增量资源打包。")} />
</svelte:head>
<div class="product-page keine-product">
  <nav class="product-local-nav" aria-label={$msg("Kēne 页面导航")}>
    <a href="/product">{$msg("← 所有项目")}</a>
    <div><a href="#keine-features">{$msg("特点")}</a><a href="#keine-start">{$msg("开始制作")}</a><a href="#keine-details">{$msg("性能与架构")}</a></div>
  </nav>
  <section class="keine-intro keine-hero" aria-labelledby="keine-title">
    <div>
      <p class="product-eyebrow">{$msg("原生视觉小说引擎")}</p>
      <h1 class="product-name" id="keine-title">Kēne</h1>
      <p class="product-promise">{$msg("视觉小说引擎与编辑器")}</p>
      <p class="product-summary">{$msg("内建立绘动画、镜头与舞台特效。用 Eiyashou 编写剧情，在原生引擎里预览作品。")}</p>
      <div class="product-actions"><a class="primary-action" href="https://github.com/maincoretech/keine/releases/tag/editor-latest" target="_blank" rel="noopener noreferrer">{$msg("下载开发版 ↗")}</a><a href="/blog/keine-development-and-release">{$msg("使用指南 →")}</a></div>
      <p class="product-meta">Rust / Bevy / wgpu · <a href="https://github.com/maincoretech/keine" target="_blank" rel="noopener noreferrer">GitHub ↗</a></p>
      <p class="product-note">{$msg("预发行版")}</p>
    </div>
  </section>
  <KeineMetrics />
  <section id="keine-features" class="keine-features" aria-labelledby="keine-features-title">
    <h2 id="keine-features-title">{$msg("剧情与演出")}</h2>
    <div class="keine-feature-layout">
      <section id="keine-stage" class="keine-feature" aria-labelledby="keine-stage-title" use:scrollReveal>
        <header class="feature-heading">
          <h3 id="keine-stage-title">{$msg("Eiyashou 脚本")}</h3>
          <p>{$msg("对白、条件分支与演出写在同一份剧本里，支持变量、表达式和场景调用。")}</p>
          <a href="/blog/eiyashou">{$msg("了解脚本 →")}</a>
        </header>
        <dl class="stage-features">
          {#each stageFeatures as feature}
            <div><dt>{$msg(feature.title)}</dt><dd>{$msg(feature.description)}</dd></div>
          {/each}
        </dl>
      </section>
      <section id="keine-player" class="keine-feature" aria-labelledby="keine-player-title" use:scrollReveal>
        <h3 id="keine-player-title">{$msg("内建游戏功能")}</h3>
        <ul>{#each playerFeatures as feature}<li>{$msg(feature)}</li>{/each}</ul>
      </section>
      <section id="keine-source" class="keine-feature" aria-labelledby="keine-source-title" use:scrollReveal>
        <header class="feature-heading">
          <h3 id="keine-source-title">{$msg("文本与块编辑")}</h3>
          <a href="https://github.com/maincoretech/keine/blob/main/dev/docs/editor.md#单一源码" target="_blank" rel="noopener noreferrer">{$msg("编辑器 ↗")}</a>
        </header>
        <p>{$msg("直接写脚本，也可以拖动对白块、在面板里调参数。两种方式修改同一份源码，保留原有注释。")}</p>
      </section>
      <section id="keine-preview" class="keine-feature" aria-labelledby="keine-preview-title" use:scrollReveal={{ delay: 60 }}>
        <header class="feature-heading">
          <h3 id="keine-preview-title">{$msg("在实际引擎里预览")}</h3>
          <a href="https://github.com/maincoretech/keine/blob/main/dev/docs/editor.md#engine" target="_blank" rel="noopener noreferrer">{$msg("预览调试 ↗")}</a>
        </header>
        <p>{$msg("未保存的修改也能预览。选中指令可重建对应舞台，查看变量与错误；语法出错时保留上次有效画面。")}</p>
        <p class="product-note">{$msg("定位重建舞台，不还原此前的分支选择。")}</p>
      </section>
      <section id="keine-runtime" class="keine-feature" aria-labelledby="keine-runtime-title" use:scrollReveal>
        <header class="feature-heading">
          <h3 id="keine-runtime-title">{$msg("按需运行")}</h3>
          <a href="#keine-details">{$msg("性能实测 →")}</a>
        </header>
        <dl class="runtime-features">
          {#each runtimeFeatures as feature}
            <div><dt>{$msg(feature.title)}</dt><dd>{$msg(feature.description)}</dd></div>
          {/each}
        </dl>
      </section>
      <section id="keine-release" class="keine-feature" aria-labelledby="keine-release-title" use:scrollReveal>
        <header class="feature-heading">
          <h3 id="keine-release-title">{$msg("打包与内容更新")}</h3>
          <a href="https://github.com/maincoretech/keine/blob/main/dev/docs/release.md" target="_blank" rel="noopener noreferrer">{$msg("发行流程 ↗")}</a>
        </header>
        <ol class="release-features">
          {#each releaseFeatures as feature, index}
            <li><span class="feature-index" aria-hidden="true">{$msg(String(index + 1).padStart(2, '0'))}</span><div><h4>{$msg(feature.title)}</h4><p>{$msg(feature.description)}</p></div></li>
          {/each}
        </ol>
        <p class="product-note">{$msg("增量打包不含自动更新服务；加密不保证资源无法提取。")}</p>
      </section>
    </div>
  </section>
  <section class="product-section keine-start" aria-labelledby="keine-start">
    <h2 id="keine-start">{$msg("开始制作")}</h2>
    <div class="start-links">
      <a href="https://github.com/maincoretech/keine/releases/tag/editor-latest" target="_blank" rel="noopener noreferrer"><span>{$msg("下载编辑器")}</span><small>Editor + Preview Engine</small><span aria-hidden="true">↗</span></a>
      <a href="/blog/eiyashou"><span>{$msg("编写剧本")}</span><small>Eiyashou</small><span aria-hidden="true">→</span></a>
      <a href="/blog/keine-development-and-release"><span>{$msg("打包作品")}</span><small>{$msg("制作与发行指南")}</small><span aria-hidden="true">→</span></a>
    </div>
    <div class="product-license">
      <p>{$msg("可以免费使用 Kēne 制作并销售游戏，无需支付引擎版税。发行时需附带许可证及版权声明。")}</p>
      <p>{$msg("许可证不允许将 Kēne 引擎、编辑器或其修改版作为游戏引擎产品销售或商业化。")} <a href="https://github.com/maincoretech/keine/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">Defold License 1.0 ↗</a></p>
    </div>
  </section>
  <section class="product-section architecture-highlights" aria-labelledby="keine-architecture-highlights">
    <h2 id="keine-architecture-highlights">{$msg("技术架构")}</h2>
    <dl>
      {#each architectureHighlights as highlight, index}
        <div use:scrollReveal={{ delay: index % 3 * 60 }}><dt>{$msg(highlight.title)}</dt><dd>{$msg(highlight.text)}</dd></div>
      {/each}
    </dl>
    <p class="product-note">{$msg("Pure Rust 指脚本执行核心；媒体编解码和平台集成仍使用原生库。平台构建不代表所有设备均已验证。")}</p>
  </section>
  <section class="product-section" aria-labelledby="keine-details">
    <h2 id="keine-details">{$msg("性能与架构")}</h2>
    <div class="product-explore"><ProjectExplorer product="keine" intro={false} includeLive={false} showMetrics={false} /></div>
  </section>
  <aside class="keine-related">{$msg("资源包格式：")} <a href="/product/hakutaku">Hakutaku →</a></aside>
</div>

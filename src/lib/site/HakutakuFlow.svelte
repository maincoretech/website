<script>
  import { msg } from '$lib/i18n/index.js';
  import { scrollReveal } from './scroll-reveal.js';
  const lookup = [
    { code: 'Asset path', title: '资源路径', detail: '例如 scenes/start.shou' },
    { code: 'PathSlot → FileRecord', title: '查找文件', detail: '路径哈希探测，再核对完整路径；取得文件长度与块范围。' },
    { code: 'BlockMapPage → BlockRef', title: '定位数据块', detail: '按需加载并认证索引页，定位数据段及物理偏移。' },
    { code: '.taku → block', title: '读取与认证', detail: '校验块摘要，认证解密；仅在压缩时解压。' },
    { code: 'destination buffer', title: '返回所需字节', detail: '将请求区间写入缓冲区，不必解包整个文件。' }
  ];
  const reads = [
    { code: 'asset.read_at(offset, buf)', title: '单次区间读取', detail: '读取一次指定偏移。' },
    { code: 'asset.read_session()', title: '重复随机读取', detail: '复用句柄与解码缓冲，再调用 session.read_at。' },
    { code: 'asset.cursor()', title: '流式与跳转', detail: '通过 Read / Seek 接入音视频解码器。' }
  ];
</script>

<section class="hakutaku-flows product-section" aria-labelledby="haku-architecture-title">
  <h2 id="haku-architecture-title">{$msg("从打包到读取")}</h2>
  <figure class="package-flow" use:scrollReveal>
    <figcaption>{$msg("架构：打包工具与运行时分离")}</figcaption>
    <div class="package-lanes">
      <div class="package-lane">
        <h3>{$msg("制作端")}</h3><div class="flow-node"><strong>hakutaku-pack</strong><span>{$msg("源资源 + 发布者身份")}</span></div>
        <p class="flow-note">{$msg("签名私钥只留在制作端。")}</p>
      </div>
      <div class="package-lane">
        <h3>{$msg("发行内容")}</h3>
        <div class="flow-node"><strong>game.haku</strong><span>{$msg("签名快照 · 目录与索引页")}</span></div>
        <div class="flow-node segment-node"><strong>data/*.taku</strong><span>{$msg("不可变的加密数据块")}</span></div>
      </div>
      <div class="package-lane">
        <h3>{$msg("游戏运行端")}</h3><div class="flow-node"><strong>hakutaku-core</strong><span>{$msg("认证 · 索引 · 按需读取")}</span></div>
        <span class="flow-down" aria-hidden="true"></span><div class="flow-node"><strong>Engine</strong><span>{$msg("解码与播放")}</span></div>
      </div>
    </div>
    <p class="flow-note">{$msg("新快照可继续引用旧数据段。游戏只链接 Core，不携带打包器与签名私钥。")}</p>
  </figure>

  <figure use:scrollReveal>
    <figcaption>{$msg("索引流程：从路径到字节区间")}</figcaption>
    <ol class="lookup-flow">
      {#each lookup as step}<li><code>{$msg(step.code)}</code><strong>{$msg(step.title)}</strong><p>{$msg(step.detail)}</p></li>{/each}
    </ol>
    <p class="flow-note">{$msg("快照验签后才解密目录；运行时按需读取 BlockMapPage，不加载仅供打包复用的 ReusePage。")}</p>
  </figure>

  <figure use:scrollReveal>
    <figcaption>{$msg("常见调用流程")}</figcaption>
    <div class="api-entry">
      <div class="flow-node"><code>Package::open_directory(...)</code><span>{$msg("验证快照，载入目录")}</span></div>
      <span class="flow-down" aria-hidden="true"></span>
      <div class="flow-node"><code>package.asset(path)</code><span>{$msg("获取资源句柄，不读取整个资源")}</span></div>
    </div>
    <div class="api-branches">
      {#each reads as read}<div class="flow-node"><code>{$msg(read.code)}</code><strong>{$msg(read.title)}</strong><span>{$msg(read.detail)}</span></div>{/each}
    </div>
    <p class="flow-note">{$msg("缺少数据段时返回 SegmentUnavailable；下载、重试和媒体解码由宿主处理。")}</p>
  </figure>
  <p class="flow-links"><a href="https://github.com/maincoretech/hakutaku/blob/main/docs/FORMAT.md" target="_blank" rel="noopener noreferrer">{$msg("格式规范 ↗")}</a><a href="https://github.com/maincoretech/hakutaku" target="_blank" rel="noopener noreferrer">{$msg("API 与接入文档 ↗")}</a></p>
</section>

<style>
  .hakutaku-flows { --connector-color: #7096a7; min-width: 0; }
  figure { margin: 28px 0 36px 12px; }
  figcaption { color: #bdd5e2; font: 400 1.05rem/1.5 var(--f-b); margin-bottom: 20px; }
  .package-lanes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 40px; }
  .package-lane { position: relative; min-width: 0; }

  .package-lane + .package-lane > .flow-node:first-of-type::after {
    content: ''; position: absolute; pointer-events: none; top: 50%;
  }

  .package-lane + .package-lane > .flow-node:first-of-type::after {
    left: -25px; width: 8px; height: 8px; background: var(--connector-color); clip-path: polygon(0 0, 100% 50%, 0 100%); transform: translateY(-50%);
  }
  h3 { margin: 0 0 10px; font: .8rem/1.5 var(--f-b); color: #8caebf; }
  .flow-node { position: relative; min-width: 0; padding: 14px; border: 1px solid #35505e; background: rgb(113 149 169 / 5%); }
  .flow-node strong, .flow-node code, .flow-node span { display: block; }
  strong { font: 400 .9rem/1.5 var(--f-b); color: #bdd5e2; }
  code { color: #b4d2e0; font: .76rem/1.6 var(--f-m); overflow-wrap: anywhere; }
  .flow-node span, .lookup-flow p { margin: 6px 0 0; font: .78rem/1.7 var(--f-b); color: #93aebb; }
  .flow-node span, .lookup-flow p { padding-inline-start: 8px; }
  .segment-node { margin-top: 12px; border-style: dashed; }
  .flow-down { position: relative; display: block; align-self: center; width: 12px; height: 24px; margin: 4px auto; padding: 0; flex: none; pointer-events: none; }

  .flow-down::after { content: ''; position: absolute; bottom: 8px; left: 50%; width: 8px; height: 8px; background: var(--connector-color); clip-path: polygon(0 0, 100% 0, 50% 100%); transform: translateX(-50%); }
  .flow-note { color: #829eac; font: .73rem/1.75 var(--f-b); margin: 14px 0 0; padding-inline-start: 12px; }
  .lookup-flow { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 24px; }
  .lookup-flow li { position: relative; min-width: 0; border-top: 2px solid #527989; padding-top: 10px; }

  .lookup-flow li + li::after { content: ''; position: absolute; left: -18px; top: -5px; width: 8px; height: 8px; background: var(--connector-color); clip-path: polygon(0 0, 100% 50%, 0 100%); }
  .lookup-flow code { display: block; min-height: 3.2em; margin-bottom: 8px; }
  .api-entry { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #83a9bb; }
  .api-entry .flow-node { width: min(100%, 380px); box-sizing: border-box; }
  .api-branches { --branch-gap: 24px; position: relative; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: var(--branch-gap); padding-top: 28px; margin-top: 18px; }

  .api-branches .flow-node { position: relative; }

  .api-branches .flow-node::after { content: ''; position: absolute; top: -28px; left: 50%; width: 8px; height: 8px; background: var(--connector-color); clip-path: polygon(0 0, 100% 0, 50% 100%); transform: translateX(-50%); }
  .api-branches strong { margin-top: 8px; }
  .flow-links { display: flex; flex-wrap: wrap; gap: 12px 28px; font: .8rem/1.7 var(--f-b); }
  @media(max-width:900px) {
    .lookup-flow { grid-template-columns: 1fr; gap: 24px; }
    .lookup-flow li { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr); gap: 4px 18px; padding: 10px 0 0; }
    .lookup-flow code { min-height: 0; grid-row: span 2; margin: 0; }
    .lookup-flow p { margin: 0; }

    .lookup-flow li + li::after { left: 11.5px; top: -18px; clip-path: polygon(0 0, 100% 0, 50% 100%); }
  }
  @media(max-width:600px) {
    .package-lanes { grid-template-columns: 1fr; gap: 28px; }

    .package-lane + .package-lane > .flow-node:first-of-type::after { display: none; }

    .package-lane + .package-lane::after { content: ''; position: absolute; left: 50%; top: -18px; width: 8px; height: 8px; background: var(--connector-color); clip-path: polygon(0 0, 100% 0, 50% 100%); transform: translateX(-3.5px); }
    .api-entry { flex-direction: column; gap: 8px; align-items: stretch; }
    .api-entry .flow-node { flex: auto; }
    .api-branches { grid-template-columns: 1fr; gap: 14px; padding: 0 0 0 20px; margin-top: 22px; }


    .api-branches .flow-node::after { top: 23.5px; left: -15px; clip-path: polygon(0 0, 100% 50%, 0 100%); transform: none; }
  }
</style>

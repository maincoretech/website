<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import { msg } from '$lib/i18n/index.js';
  const packages = [
    { name: 'macOS', arch: 'Apple Silicon · M 系列', file: 'keine-editor-macos-arm64.zip' },
    { name: 'Windows', arch: 'Intel / AMD · x64', file: 'keine-editor-windows-x64.zip' },
    { name: 'Linux', arch: 'x64 · glibc 2.39+', file: 'keine-editor-linux-x64.zip' }
  ];
</script>
<PageMeta title={$msg('下载 Kēne') + ' · maincore'} description={$msg('选择平台、安装编辑器，并预览第一个剧本。')} />
<article class="download-page">
  <a class="back" href="/product/keine">← Kēne</a>
  <h1>{$msg('下载 Kēne')}</h1>
  <p class="intro">{$msg('Editor + Preview · 开发版，解压即用。')}</p>
  <div class="downloads">
    {#each packages as item}
      <a class="download-link" href={'https://github.com/maincoretech/keine/releases/download/editor-latest/' + item.file}>
        <span class="platform"><strong>{item.name}</strong><small>{$msg(item.arch)}</small></span>
        <span class="download-label">{$msg('下载 ZIP')} <span aria-hidden="true">↓</span></span>
      </a>
    {/each}
  </div>
  <ol class="quick-start" aria-label={$msg('第一次预览')}>
    <li><span aria-hidden="true">01</span><strong>{$msg('完整解压')}</strong><small>{$msg('保留整个文件夹')}</small></li>
    <li><span aria-hidden="true">02</span><strong>{$msg('打开 Editor')}</strong><small>{$msg('选择工程目录')}</small></li>
    <li><span aria-hidden="true">03</span><strong>{$msg('点击播放')}</strong><small>{$msg('预览你的剧本')}</small></li>
  </ol>
  <div class="help-links">
    <a href="/docs/keine/language#第一个剧本">{$msg('第一个剧本 →')}</a>
    <a href="https://github.com/maincoretech/keine/releases/tag/editor-latest">{$msg('版本说明 ↗')}</a>
  </div>
  <details class="install-help">
    <summary>{$msg('系统要求与启动帮助')}</summary>
    <ul>
      <li><strong>macOS</strong> — {$msg('适用于 M 系列 Mac；暂不提供 Intel Mac 预编译包。')} {$msg('启动')} <code>Kēne Editor.app</code>。</li>
      <li><strong>Windows</strong> — {$msg('启动')} <code>editor.exe</code>。<strong>Linux</strong> — {$msg('运行库基线为 Ubuntu 24.04 / glibc 2.39；需要图形桌面及显卡驱动。')} {$msg('启动')} <code>./editor</code>。</li>
      <li>{$msg('macOS 与 Windows 的最低系统版本尚未标定；以上是当前提供的处理器架构。Android 暂不提供编辑器。')}</li>
      <li>{$msg('macOS 包使用开发签名，未经 Apple 公证。首次打开被系统拦截时，核对下载来源后按系统的“隐私与安全性”提示处理。')}</li>
      <li>{$msg('Windows 与 Linux 请保留解压后的完整目录；不要单独移动 Editor、Engine 或随附运行库。')}</li>
      <li>{$msg('先确认下载包与处理器架构一致，并已完整解压。Preview 无法启动时，在 Editor 的 Output 中查看错误。')}</li>
    </ul>
    <p><a href="/docs/keine">{$msg('编辑与预览')}</a> · <a href="https://github.com/maincoretech/keine/issues">GitHub Issues ↗</a></p>
  </details>
</article>
<style>
  .download-page { max-width: 920px; margin-inline: auto; }
  .back { font-size: .85rem; }
  h1 { margin: 16px 0 8px; color: #c4d7e1; font: 400 2rem/1.3 var(--f-n); }
  .intro { margin: 0 0 24px; color: #94adba; font-size: .9rem; }
  .downloads { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .download-link { display: flex; flex-direction: column; gap: 22px; padding: 22px; border: 1px solid #536983; background: #1b2733; }
  .platform { display: grid; gap: 6px; }
  .platform strong { color: #d0e1e9; font: 400 1.4rem/1.2 var(--f-h); }
  .platform small { color: #94adba; font-size: .78rem; }
  .download-label { display: flex; gap: 16px; justify-content: space-between; align-items: center; font-size: .9rem; }
  .download-label > span { font-size: 1.35rem; }
  .quick-start { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 28px 0 20px; }
  .quick-start li { display: grid; gap: 3px; }
  .quick-start li > span { color: #7294a5; font: .75rem var(--f-m); }
  .quick-start strong { font-size: .9rem; font-weight: 400; }
  .quick-start small { font-size: .75rem; color: #94adba; }
  .help-links { display: flex; flex-wrap: wrap; gap: 4px 24px; }
  .help-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: .85rem; }
  .install-help { margin-top: 8px; border-top: 1px solid #304650; font-size: .82rem; color: #94adba; }
  summary { cursor: pointer; padding: 14px 0; min-height: 44px; }
  .install-help ul { padding-left: 20px; }
  .install-help li { margin-bottom: 12px; }
  @media(max-width: 640px) {
    .intro { margin-bottom: 18px; }
    .downloads { grid-template-columns: 1fr; gap: 8px; }
    .download-link { flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; }
    .platform strong { font-size: 1.2rem; }
    .download-label { gap: 10px; font-size: .8rem; white-space: nowrap; }
    .quick-start { gap: 8px; margin: 22px 0 12px; }
    .quick-start strong { font-size: .85rem; }
  }
</style>

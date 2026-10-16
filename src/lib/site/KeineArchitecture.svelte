<script>
  import { msg } from '$lib/i18n/index.js';
</script>

<figure class="keine-pipeline">
  <figcaption>{$msg('从剧本到原生画面')}</figcaption>
  <ol class="compile-flow">
    <li><strong>Eiyashou</strong><code>.shou</code><span>{$msg('剧情与演出')}</span></li>
    <li><strong>Loader</strong><code>parse → validate</code><span>{$msg('解析与校验')}</span></li>
    <li><strong>Typed IR</strong><code>Program / Action</code><span>{$msg('类型化指令')}</span></li>
  </ol>
  <div class="execution-flow">
    <div class="execution-node"><strong>Core · Pure Rust</strong><code>Program → State</code><span>{$msg('推进对白、分支与等待')}</span></div>
    <div class="state-bridge"><code>State → Engine</code><span aria-hidden="true">↕</span><small>{$msg('输入与完成事件返回 Core')}</small></div>
    <div class="execution-node"><strong>Engine · Bevy / wgpu</strong><span>{$msg('渲染与交互')}</span></div>
  </div>
  <div class="preview-flow"><strong>Editor · GPUI</strong><span><code>IPC ↔</code></span><strong>Preview Engine</strong></div>
  <p>{$msg('编辑器不替代运行时：预览在独立的原生引擎进程中执行。')}</p>
</figure>

<style>
  .keine-pipeline { margin: 16px 0; color: #a9c5d4; }
  figcaption { font: 400 1rem/1.5 var(--f-b); margin-bottom: 20px; }
  strong { display: block; font: 400 .9rem/1.5 var(--f-b); color: #c0d9e4; }
  code { display: block; font: .75rem/1.7 var(--f-m); overflow-wrap: anywhere; }
  li > span, .execution-node > span, small, p { font: .78rem/1.7 var(--f-b); }
  .compile-flow { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 32px; list-style: none; margin: 0; padding: 0; }
  .compile-flow li, .execution-node { position: relative; border: 1px solid #35505e; padding: 16px; min-width: 0; }
  .compile-flow li + li::before { content: '→'; position: absolute; left: -25px; top: 40%; }
  .execution-flow { position: relative; margin-top: 32px; }
  .execution-flow::before { content: '↓'; position: absolute; top: -30px; left: 83.33%; }
  .execution-node { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 24px; }
  .state-bridge { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 0; text-align: center; }
  .preview-flow { display: flex; align-items: center; justify-content: center; gap: 20px; border-block: 1px solid #35505e; padding: 14px 0; margin-top: 24px; }
  p { color: #8da9b8; margin: 10px 0 0; }
  @media(max-width:600px) {
    .compile-flow { grid-template-columns: 1fr; gap: 24px; }
    .compile-flow li + li::before { content: '↓'; left: 50%; top: -26px; }
    .execution-flow { width: 100%; margin-top: 24px; }
    .execution-flow::before { left: 50%; }
    .preview-flow { gap: 12px; }
    .preview-flow strong { font-size: .8rem; }
  }
</style>

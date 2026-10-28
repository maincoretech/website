<script>
  import PageMeta from '$lib/site/PageMeta.svelte';import { msg } from '$lib/i18n/index.js';</script>
<PageMeta title={$msg('内容与代码许可') + ' · maincore'} description={$msg("网站代码、原创文章与项目文档的许可范围。")} />
<article class="article-prose">
  <a href="/about">← maincore</a>
  <h1 class="site-page-title">{$msg('内容与代码许可')}</h1>
  <h2>{$msg('文章')}</h2>
  <p>{$msg('本站原创文章采用 CC BY-NC-ND 4.0。允许署名、非商业的原文转载；请保留作者、原文链接和许可声明。')}</p>
  <p>{$msg('发布改编或译文、商业使用，请另行取得许可。法律允许的引用等情形不受影响。')}</p>
  <p><a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" rel="license">CC BY-NC-ND 4.0 ↗</a></p>
  <h2>{$msg('网站代码')}</h2>
  <p>{$msg('网站实现代码采用 MIT。文章、项目文档和第三方素材不包含在这项授权中。')}</p>
  <h2>{$msg('项目文档')}</h2>
  <ul><li>Kēne · <a href="/docs/licenses/keine/LICENSE.txt">Defold License 1.0</a></li><li>Hakutaku · <a href="/docs/licenses/hakutaku/LICENSE-MIT.txt">MIT</a> / <a href="/docs/licenses/hakutaku/LICENSE-APACHE.txt">Apache-2.0</a></li></ul>
  <p>{$msg('项目文档保留原许可。引文、第三方图片与字体按原作者的许可使用；商标权不在授权范围内。')}</p>
  <p>{$msg('这份声明不撤回旧版本已经授出的使用权限。')}</p>
</article>

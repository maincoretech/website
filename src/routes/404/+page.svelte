<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import { msg } from '$lib/i18n/index.js';
</script>
<PageMeta title="404 · maincore" description={$msg('这个地址没有对应的页面。')} noindex />
<h1 class="site-page-title">404</h1>
<p class="site-intro">{$msg('这个地址没有对应的页面。')}</p>
<div class="article-prose">
  <p>{$msg('可以返回产品页，或在历史动态中查找旧内容。')}</p>
  <p><a href="/product">{$msg('产品')}</a> · <a href="/docs">{$msg('文档')}</a> · <a href="/blog">{$msg('博客')}</a> · <a href="/archive/news">{$msg('历史动态')}</a></p>
</div>

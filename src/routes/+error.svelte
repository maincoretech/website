<script>
  import { page } from '$app/stores';
  import { t, msg } from '$lib/i18n/index.js';
  import PageMeta from '$lib/site/PageMeta.svelte';
</script>
<PageMeta title={$page.status + ' · maincore'} description={$msg('这个地址没有对应的页面。')} noindex />
<h1 class="site-page-title">{$page.status}</h1>
<p class="site-intro">{$page.status === 404 ? $msg('这个地址没有对应的页面。') : $page.error?.message}</p>
<a href="/">← {$t('back.home')}</a> · <a href="/archive/news">{$msg('历史动态')}</a>

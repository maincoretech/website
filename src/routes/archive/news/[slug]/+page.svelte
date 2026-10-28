<script>
  import Article from '$lib/site/Article.svelte';
  import { msg } from '$lib/i18n/index.js';
  let { data } = $props();
</script>
<Article meta={data.meta} articleKey={'archive/' + data.slug} comments={false}>
  <aside class="archive-notice"><p>{$msg('历史归档：以下内容保留发布时的记录，不代表当前功能或版本。')}</p><a href={['keine','hakutaku'].includes(data.slug) ? '/product/' + data.slug : '/product#catalog'}>{$msg('查看当前项目 →')}</a></aside>
  <data.Content />
</Article>
<style>.archive-notice { padding: 12px 16px; border-left: 2px solid #7195a9; background: #172630; margin-bottom: 28px; }</style>

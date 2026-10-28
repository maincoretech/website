<script>
  import { msg } from '$lib/i18n/index.js';
  import PageMeta from '$lib/site/PageMeta.svelte';
  const modules = import.meta.glob('$lib/news/*.md', { eager: true });
  const posts = Object.entries(modules).map(([path, module]) => ({ ...module.metadata, slug: path.split('/').pop().replace('.md', '') })).sort((a,b) => new Date(b.date) - new Date(a.date));
</script>
<PageMeta title={$msg('历史动态') + ' · maincore'} description={$msg('旧版 News 的历史记录。产品现状请以产品页和当前文档为准。')} />
<h1 class="site-page-title">{$msg('历史动态')}</h1>
<p class="site-intro">{$msg('旧版 News 的历史记录。产品现状请以产品页和当前文档为准。')}</p>
<div class="entry-list">
  {#each posts as post}<a class="entry-link" href={'/archive/news/' + post.slug}><span class="entry-title">{post.title}</span><time datetime={new Date(post.date).toISOString().slice(0,10)}>{new Date(post.date).toISOString().slice(0,10)}</time></a>{/each}
</div>

<script>
  import { msg } from '$lib/i18n/index.js';
  import PageMeta from '$lib/site/PageMeta.svelte';
  import { newsPosts } from '$lib/site/content.js';
  const posts = [...newsPosts.items].sort((a, b) => b.date.localeCompare(a.date));
</script>
<PageMeta title="news archive · maincore" description="Past announcements and project updates from maincore." />
<h1 class="site-page-title">{$msg('历史动态')}</h1>
<p class="site-intro">{$msg('旧版 News 的历史记录。产品现状请以产品页和当前文档为准。')}</p>
<div class="entry-list">
  {#each posts as post (post.slug)}
    <a class="entry-link" href={post.href}>
      <span class="entry-title">{post.title}</span>
      {#if post.date}<time datetime={post.date}>{post.date}</time>{/if}
    </a>
  {/each}
</div>

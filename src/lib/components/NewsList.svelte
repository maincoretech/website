<script>
  import { t } from '$lib/i18n/index.js';

  const modules = import.meta.glob('$lib/news/*.md', { eager: true });

  const news = Object.entries(modules)
    .map(([path, mod]) => {
      const slug = path.split('/').pop()?.replace('.md', '') ?? '';
      const meta = mod.metadata ?? {};
      const d = meta.date ? new Date(meta.date) : null;
      return {
        slug,
        title: meta.title ?? slug,
        date: d ? d.toISOString().split('T')[0] : '',
        priority: meta.priority ?? 0
      };
    })
    .sort((a, b) => b.priority - a.priority || new Date(b.date) - new Date(a.date));
</script>

<svelte:head>
  <title>maincore · {$t('pages.news.section')}</title>
  <meta name="description" content={$t('pages.news.intro')} />
</svelte:head>
<section class="news-list">
  <h1 class="site-page-title">{$t('pages.news.section')}</h1>
  <div class="entry-list">
    {#each news as item}
      <a href="/news/{item.slug}" class="entry-link">
        <span class="entry-title">{item.title}</span>
        <time datetime={item.date}>{item.date}</time>
      </a>
    {/each}
  </div>
</section>

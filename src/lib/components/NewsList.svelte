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

<div id="toc-body">
  <div class="grad-bar grad-bar--toc sec-header">
    <div class="title">News</div>
    <div class="subtitle">{$t('pages.news.subtitle')}</div>
  </div>

  <div class="toc-section">
    <div class="section-title-box">
      <span class="sec-title-box__title">{$t('pages.news.section')}</span>
    </div>
    <div class="section-body">
      <p><strong>maincore</strong> — {$t('site.subtitle')}</p>
      <p>{$t('pages.news.intro')}</p>
    </div>
  </div>

  {#if news.length > 0}
    <div class="divider"></div>
    <div class="toc-entries">
      {#each news as item, i}
        <a href="/news/{item.slug}" class="toc-entry-box">
          <div class="title">{item.title}</div>
          <div class="metadata"><span class="date">{item.date}</span></div>
        </a>
        {#if i < news.length - 1}
          <div class="toc-entry-divider"></div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

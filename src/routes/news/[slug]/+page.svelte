<script>
  import { page } from '$app/stores';
  import { error } from '@sveltejs/kit';
  import { t } from '$lib/i18n/index.js';
  import { ArrowBack } from '$lib/icons.js';

  const modules = import.meta.glob('$lib/news/*.md', { eager: true });

  let contentState = $derived.by(() => {
    const slug = $page.params.slug;
    const match = Object.entries(modules).find(([p]) => p.endsWith(`/${slug}.md`));
    if (!match) error(404, `新闻 "${slug}" 未找到。`);
    const [, mod] = match;
    return { Content: mod.default, meta: mod.metadata ?? {} };
  });

  function fmtDate(d) { if(!d) return ''; const date = d instanceof Date ? d : new Date(d); return date.toISOString().split('T')[0]; }
</script>

<div id="toc-body">
  <div class="grad-bar grad-bar--toc sec-header">
    <div class="title">{contentState.meta.title ?? $page.params.slug}</div>
    <div class="subtitle">{contentState.meta.description ?? ''}</div>
  </div>

  <div class="article-meta-row">
    <a href="/" class="article-back">
      {@html ArrowBack}
      {$t('back.news')}
    </a>
    {#if contentState.meta.date}
      <div class="article-byline"><span class="article-date">{fmtDate(contentState.meta.date)}</span></div>
    {/if}
  </div>

  <article class="article-section">
    <div class="section-body"><contentState.Content /></div>
  </article>

  <div class="divider"></div>
  <div style="text-align:center;margin-top:40px">
    <a href="/" style="font:1rem var(--f-n, 'Roboto Condensed',serif);color:var(--c-l);display:inline-flex;align-items:center;gap:5px">
      {@html ArrowBack}
      {$t('back.news')}
    </a>
  </div>
</div>

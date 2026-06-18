<script>
  /**
   * 单篇博客文章页
   * URL: /blog/[slug]
   * 自动匹配 src/lib/posts/ 下的同名 .md 文件
   */
  import { page } from '$app/stores';
  import { error } from '@sveltejs/kit';
  import { t } from '$lib/i18n/index.js';
  import { ArrowBack } from '$lib/icons.js';

  const modules = import.meta.glob('$lib/posts/*.md', { eager: true });

  let contentState = $derived.by(() => {
    const slug = $page.params.slug;
    const match = Object.entries(modules).find(([p]) => p.endsWith(`/${slug}.md`));
    if (!match) error(404, `文章 "${slug}" 未找到。`);
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
    <a href="/blog" class="article-back">
      {@html ArrowBack}
      {$t('back.blog')}
    </a>

    {#if contentState.meta.date || contentState.meta.author}
      <div class="article-byline">
        {#if contentState.meta.author}
          <span class="article-author">{contentState.meta.author}</span>
        {/if}
        {#if contentState.meta.date}
          <span class="article-date">{fmtDate(contentState.meta.date)}</span>
        {/if}
      </div>
    {/if}
  </div>

  <article class="article-section">
    <div class="section-body">
      <contentState.Content />
    </div>
  </article>

  <div class="divider"></div>

  <div style="text-align: center; margin-top: 40px;">
    <a href="/blog" style="font-family: 'Roboto Condensed', serif; font-size: 1rem; color: rgb(60, 100, 140); display: inline-flex; align-items: center; gap: 5px;">
      {@html ArrowBack}
      {$t('back.blog')}
    </a>
  </div>
</div>

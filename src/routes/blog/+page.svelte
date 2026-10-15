<script>
  import { t } from '$lib/i18n/index.js';

  /**
   * 博客文章列表 — 从 src/lib/posts 目录下所有 .md 文件自动加载
   * 添加新文章: 在 src/lib/posts/ 下创建 .md 文件，包含 frontmatter 即可
   */
  const modules = import.meta.glob('$lib/posts/*.md', { eager: true });

  /** 格式化日期 */
  function fmtDate(d) {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().split('T')[0];
  }

  const posts = Object.entries(modules)
    .map(([path, mod]) => {
      const slug = path.split('/').pop()?.replace('.md', '') ?? '';
      const meta = mod.metadata ?? {};
      return {
        slug,
        title: meta.title ?? slug,
        date: fmtDate(meta.date),
        dateRaw: meta.date,
        author: meta.author ?? 'Water Studio',
        description: meta.description ?? '',
        category: meta.category ?? 'uncategorized',
        priority: meta.priority ?? 0
      };
    })
    .sort((a, b) => b.priority - a.priority || new Date(b.dateRaw) - new Date(a.dateRaw));

  /** 按分类分组 */
  const grouped = $derived.by(() => {
    const map = {};
    for (const post of posts) {
      (map[post.category] ??= []).push(post);
    }
    return Object.entries(map);
  });
</script>

<svelte:head>
  <title>{$t('nav.blog')} · maincore</title>
  <meta name="description" content={$t('pages.blog.subtitle')} />
</svelte:head>
<h1 class="site-page-title">{$t('pages.blog.subtitle')}</h1>
{#each grouped as [cat, catPosts]}
  <section class="list-section">
    <h2>{$t('cat.' + cat) || cat}</h2>
    <div class="preview-entries">
      {#each catPosts as post}
        <a href="/blog/{post.slug}" class="preview-entry">
          <span class="entry-title">{post.title}</span>
          <time datetime={post.date}>{post.date}</time>
          {#if post.description}<p>{post.description}</p>{/if}
        </a>
      {/each}
    </div>
  </section>
{/each}
{#if posts.length === 0}<p class="site-intro">{$t('pages.blog.empty')}</p>{/if}

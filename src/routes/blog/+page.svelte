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

  const catLabels = { design: '设计', tech: '技术', essay: '随笔', uncategorized: '未分类', tools: '工具', game: '游戏', business: '商业' };
</script>

<div id="toc-body">
  <div class="grad-bar grad-bar--toc sec-header">
    <div class="title">Blog</div>
    <div class="subtitle">{$t('pages.blog.subtitle')}</div>
  </div>

  {#each grouped as [cat, catPosts]}
    <div class="toc-section">
      <div class="section-title-box">
        <span class="section-title">{$t('cat.' + cat) || catLabels[cat] || cat}</span>
      </div>

      <div class="toc-entries">
        {#each catPosts as post, i}
          <a href="/blog/{post.slug}" class="toc-entry-box">
            <div class="title">{post.title}</div>
            <div class="metadata">
              <span class="date">{post.date}</span>
            </div>
          </a>
          {#if i < catPosts.length - 1}
            <div class="toc-entry-divider"></div>
          {/if}
        {/each}
      </div>
    </div>
  {/each}

  {#if posts.length === 0}
    <div class="notice">
      暂无文章。<br />
      在 <code class="code-inline">src/lib/posts/</code> 目录下创建 <code class="code-inline">.md</code> 文件即可自动渲染。
    </div>
  {/if}
</div>

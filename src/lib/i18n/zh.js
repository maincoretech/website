/** 中文翻译 */
const zh = {
  lang: 'zh',
  langLabel: '中文',

  nav: { news: 'news', product: 'product', blog: 'blog', about: 'about' },

  sidebar: {
    toc: '目录',
    news: '最新动态',
    home: '返回首页',
    all_posts: '全部文章',
    tech: '技术',
    essay: '随笔',
    all_products: '全部产品',
    about_us: '关于我们',
    product: '产品',
    blog: '博客',
    about: '关于'
  },

  pages: {
    news: { subtitle: '开发进度 & 最新动态', section: 'Latest', intro: '这里是 maincore 的官方站点，我们会在这里发布最新的开发进度、产品信息和各类文章。' },
    blog: { subtitle: '一些闲话', empty: '暂无文章。', empty_hint: '在 src/lib/posts/ 目录下创建 .md 文件即可自动渲染。' },
    product: { subtitle: '我们的产品' },
    about: { subtitle: '关于 maincore' }
  },

  search: { placeholder: '搜索', no_results: '无结果' },

  a11y: { menu: '菜单', back_to_top: '返回顶部' },

  error: { post_not_found: '文章未找到', news_not_found: '新闻未找到' },

  footer: {
    built_with: 'Built with SvelteKit & MDsveX.',
    design_inspired: 'Design inspired by gyan.dev'
  },

  back: { news: '返回 News', blog: '返回博客', home: '返回首页' },

  cat: { design: '设计', tech: '技术', essay: '随笔', uncategorized: '未分类', tools: '工具', game: '游戏', business: '商业' },

  site: { subtitle: 'games & software' }
};

export default zh;

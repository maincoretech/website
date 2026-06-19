/** 繁體中文翻譯 */
const zhHant = {
  lang: 'zh-Hant',
  langLabel: '繁體',

  nav: { news: 'news', product: 'product', blog: 'blog', about: 'about' },

  sidebar: {
    toc: '目錄',
    news: '最新動態',
    home: '返回首頁',
    all_posts: '全部文章',
    tech: '技術',
    essay: '隨筆',
    all_products: '全部產品',
    about_us: '關於我們',
    product: '產品',
    blog: '部落格',
    about: '關於'
  },

  pages: {
    news: { subtitle: '開發進度 & 最新動態', section: 'Latest', intro: '這裡是 maincore 的官方站點，我們會在這裡發布最新的開發進度、產品資訊和各類文章。' },
    blog: { subtitle: '一些閒話', empty: '暫無文章。', empty_hint: '在 src/lib/posts/ 目錄下建立 .md 檔案即可自動渲染。' },
    product: { subtitle: '我們的產品' },
    about: { subtitle: '關於 maincore' }
  },

  search: { placeholder: '搜尋', no_results: '無結果' },

  a11y: { menu: '選單', back_to_top: '返回頂部' },

  error: { post_not_found: '文章未找到', news_not_found: '新聞未找到' },

  footer: {
    built_with: 'Built with SvelteKit & MDsveX.',
    design_inspired: 'Design inspired by gyan.dev'
  },

  back: { news: '返回 News', blog: '返回部落格', home: '返回首頁' },

  cat: { design: '設計', tech: '技術', essay: '隨筆', uncategorized: '未分類', tools: '工具', game: '遊戲', business: '商業' },

  site: { subtitle: 'games & software' }
};

export default zhHant;

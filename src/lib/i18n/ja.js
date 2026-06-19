/** 日本語翻訳 */
const ja = {
  lang: 'ja',
  langLabel: '日本語',

  nav: { news: 'news', product: 'product', blog: 'blog', about: 'about' },

  sidebar: {
    toc: '目次',
    news: '最新情報',
    home: 'ホーム',
    all_posts: '全記事',
    tech: '技術',
    essay: 'エッセイ',
    all_products: '全製品',
    about_us: '私達について',
    product: '製品',
    blog: 'ブログ',
    about: '概要'
  },

  pages: {
    news: { subtitle: '開発状況 & 最新情報', section: 'Latest', intro: 'maincore 公式サイトです。開発の進捗、製品情報、各種記事を発信しています。' },
    blog: { subtitle: 'よもやま話', empty: '記事がありません。', empty_hint: 'src/lib/posts/ に .md ファイルを作成してください。' },
    product: { subtitle: '製品一覧' },
    about: { subtitle: 'maincore について' }
  },

  search: { placeholder: '検索', no_results: '結果なし' },

  a11y: { menu: 'メニュー', back_to_top: 'トップに戻る' },

  error: { post_not_found: '記事が見つかりません', news_not_found: 'ニュースが見つかりません' },

  footer: {
    built_with: 'Built with SvelteKit & MDsveX.',
    design_inspired: 'Design inspired by gyan.dev'
  },

  back: { news: 'ニュースに戻る', blog: '戻る', home: 'ホームに戻る' },

  cat: { design: 'デザイン', tech: '技術', essay: 'エッセイ', uncategorized: '未分類', tools: 'ツール', game: 'ゲーム', business: 'ビジネス' },

  site: { subtitle: 'games & software' }
};

export default ja;

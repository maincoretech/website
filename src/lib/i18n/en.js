/** English translations */
const en = {
  lang: 'en',
  langLabel: 'English',

  nav: { news: 'news', product: 'product', blog: 'blog', about: 'about' },

  sidebar: {
    toc: 'TOC',
    news: 'Latest',
    home: 'Home',
    all_posts: 'All Posts',
    tech: 'Tech',
    essay: 'Essays',
    all_products: 'All Products',
    about_us: 'About Us',
    product: 'Products',
    blog: 'Blog',
    about: 'About'
  },

  pages: {
    news: { subtitle: 'Updates & News', section: 'Latest', intro: 'Welcome to the maincore official site. Here we post development updates, product info, and articles.' },
    blog: { subtitle: 'Random Musings', empty: 'No posts yet.', empty_hint: 'Create a .md file in src/lib/posts/ to get started.' },
    product: { subtitle: 'Our Products' },
    about: { subtitle: 'About maincore' }
  },

  search: { placeholder: 'search', no_results: 'no results' },

  a11y: { menu: 'Menu', back_to_top: 'Back to top' },

  error: { post_not_found: 'Post not found', news_not_found: 'News not found' },

  footer: {
    built_with: 'Built with SvelteKit & MDsveX.',
    design_inspired: 'Design inspired by gyan.dev'
  },

  back: { news: 'Back to News', blog: 'Back', home: 'Home' },

  cat: { design: 'Design', tech: 'Technology', essay: 'Essays', uncategorized: 'Uncategorized', tools: 'Tools', game: 'Games', business: 'Business' },

  site: { subtitle: 'games & software' }
};

export default en;

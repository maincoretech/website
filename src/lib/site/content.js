function markdownCollection(directory, base, importers, metadata) {
  const pathFor = (slug) => '/src/lib/' + directory + '/' + slug + '.md';
  const items = Object.entries(metadata).map(([path, meta]) => {
    const slug = path.split('/').at(-1).slice(0, -3);
    const date = meta.date ? new Date(meta.date) : null;
    return {
      slug,
      href: base + '/' + slug,
      title: meta.title ?? slug,
      author: meta.author ?? '',
      description: meta.description ?? '',
      date: date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '',
      priority: meta.priority ?? 0
    };
  });

  return {
    items,
    entries: () => items.map(({ slug }) => ({ slug })),
    has: (slug) => Object.hasOwn(importers, pathFor(slug)),
    async load(slug) {
      const module = await importers[pathFor(slug)]?.();
      if (module) return { Content: module.default, meta: module.metadata, slug };
    }
  };
}

export const blogPosts = markdownCollection(
  'posts',
  '/blog',
  import.meta.glob('/src/lib/posts/*.md'),
  import.meta.glob('/src/lib/posts/*.md', { eager: true, query: '?post-metadata', import: 'default' })
);

export const newsPosts = markdownCollection(
  'news',
  '/archive/news',
  import.meta.glob('/src/lib/news/*.md'),
  import.meta.glob('/src/lib/news/*.md', { eager: true, query: '?post-metadata', import: 'default' })
);

export const architectureHref = blogPosts.has('keine-architecture')
  ? '/blog/keine-architecture'
  : '/blog/keine-development-and-release';

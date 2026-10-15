// Prefer the newer article when present, but keep this preview branch standalone.
export const postModules = import.meta.glob('/src/lib/posts/*.md', { eager: true, import: 'metadata' });
export const architectureSlug = postModules['/src/lib/posts/keine-architecture.md']
  ? 'keine-architecture'
  : 'keine-development-and-release';
export const architectureHref = '/blog/' + architectureSlug;

export const studioLinks = [
  { href: '/works', label: 'works', icon: 'grid' },
  { href: '/blog', label: 'blog', icon: 'book' },
  { href: '/about', label: 'about', icon: 'info' }
];

export const studioOutline = Symbol('studioOutline');

export function studioSection(path) {
  return studioLinks.find(({ href }) => path === href)?.href
    ?? (path.startsWith('/blog/') ? '/blog' : null);
}

export function usesStudioShell(path) {
  return path === '/' || studioSection(path) !== null;
}

import { posix } from 'node:path';
import { docs } from '../docs/projects.js';

// Plain repository Markdown is not Svelte source. Keep braces/HTML literal,
// retain GitHub-style section links, and resolve repository-relative links.
export default function remarkDocs() {
  return (tree, file) => {
    const match = String(file.filename ?? file.path ?? '').replaceAll('\\', '/').match(/\/docs\/content\/([^/]+)\/([^/]+)\.md$/);
    if (!match) return;
    const doc = docs.find(d => d.project === match[1] && d.slug === match[2]);
    if (!doc) return;
    const ids = new Map();
    const text = node => node.value ?? node.children?.map(text).join('') ?? '';
    function walk(node) {
      if (node.type === 'heading') {
        const base = text(node).toLowerCase().replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replaceAll(' ', '-');
        const count = ids.get(base) ?? 0;
        ids.set(base, count + 1);
        node.data = { ...node.data, hProperties: { id: base + (count ? '-' + count : '') } };
      }
      if (node.type === 'html') { node.type = 'text'; }
      if (node.type === 'text') node.value = node.value.replaceAll('{', '&#123;').replaceAll('}', '&#125;');
      if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && node.url && !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(node.url)) {
        const [relative, anchor] = node.url.split('#');
        const source = posix.normalize(posix.join(posix.dirname(doc.source), relative));
        const local = docs.find(d => d.project === doc.project && d.source === source);
        const prefix = node.type === 'image' ? 'https://raw.githubusercontent.com/maincoretech/' : 'https://github.com/maincoretech/';
        node.url = (local ? local.href : prefix + doc.project + (node.type === 'image' ? '/main/' : '/blob/main/') + source) + (anchor ? '#' + anchor : '');
      }
      node.children?.forEach(walk);
    }
    // The README's repository icon is redundant in the documentation header.
    tree.children = tree.children.filter(node => !(node.type === 'html' && /^<p align="center">[\s\S]*?<\/p>$/.test(node.value.trim())));
    walk(tree);
  };
}

/**
 * 搜索索引 — MiniSearch 全文搜索 + 高亮 (支持中文)
 */
import MiniSearch from 'minisearch';
import { docs as documents } from './docs/projects.js';
import { blogPosts } from './site/content.js';

/** 把中文按字符拆分，英文按空格拆分 */
function tokenize(s) {
  const tokens = [];
  let buf = '';
  for (const ch of s) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      if (buf) {
        tokens.push(buf.toLowerCase());
        buf = '';
      }
      tokens.push(ch);
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      buf += ch;
    } else {
      if (buf) {
        tokens.push(buf.toLowerCase());
        buf = '';
      }
    }
  }
  if (buf) tokens.push(buf.toLowerCase());
  return tokens;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function plainText(raw) {
  return raw
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*>\x60\[\]()!_\-|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const index = new MiniSearch({
  fields: ['title', 'text'],
  storeFields: ['title', 'slug', 'kind', 'text'],
  tokenize
});
const postSources = import.meta.glob('/src/lib/posts/*.md', { eager: true, query: '?raw', import: 'default' });
const documentSources = import.meta.glob('/src/lib/docs/content/*/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
});
index.addAll([
  ...blogPosts.items.map(({ slug, href, title }) => ({
    id: href,
    slug: href,
    title,
    kind: 'blog',
    text: plainText(postSources[`/src/lib/posts/${slug}.md`])
  })),
  ...documents.map(({ project, slug, title, href }) => ({
    id: href,
    slug: href,
    title: project + ' · ' + title,
    kind: 'docs',
    text: plainText(documentSources[`/src/lib/docs/content/${project}/${slug}.md`] ?? '')
  }))
]);

/** 匹配词高亮：优先标题，否则正文片段 */
function highlight(doc, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'gi');

  const mark = (value) =>
    value
      .split(re)
      .map((part, index) => (index % 2 ? '<mark>' + escapeHtml(part) + '</mark>' : escapeHtml(part)))
      .join('');

  if (doc.title.toLowerCase().includes(term.toLowerCase())) {
    return { inTitle: true, html: mark(doc.title) };
  }

  const t = doc.text || '';
  const idx = t.toLowerCase().indexOf(term.toLowerCase());
  const len = 80;
  if (idx >= 0) {
    const s = Math.max(0, idx - 30);
    const e = Math.min(t.length, idx + term.length + len);
    let frag = t.slice(s, e);
    if (s > 0) frag = '…' + frag;
    if (e < t.length) frag += '…';
    return { inTitle: false, html: mark(frag) };
  }
  return { inTitle: false, html: escapeHtml(t.slice(0, len)) + '…' };
}

export function search(term) {
  if (!term?.trim()) return [];
  const results = index.search(term, { boost: { title: 3 }, prefix: true, fuzzy: 0.2 });
  return results.map((r) => ({
    ...r,
    hl: highlight(r, term)
  }));
}

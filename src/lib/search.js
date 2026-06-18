/**
 * 搜索索引 — MiniSearch 全文搜索 + 高亮 (支持中文)
 */
import MiniSearch from 'minisearch';

/** 把中文按字符拆分，英文按空格拆分 */
function tokenize(s) {
  const tokens = [];
  let buf = '';
  for (const ch of s) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      if (buf) { tokens.push(buf.toLowerCase()); buf = ''; }
      tokens.push(ch);
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      buf += ch;
    } else {
      if (buf) { tokens.push(buf.toLowerCase()); buf = ''; }
    }
  }
  if (buf) tokens.push(buf.toLowerCase());
  return tokens;
}

let idx;

function build() {
  idx = new MiniSearch({
    fields: ['title', 'text'],
    storeFields: ['title', 'slug', 'kind', 'text'],
    tokenize
  });

  const postModules = import.meta.glob('$lib/posts/*.md', { eager: true, query: '?raw' });
  const newsModules = import.meta.glob('$lib/news/*.md', { eager: true, query: '?raw' });
  const docs = [];

  for (const [path, mod] of Object.entries(postModules)) {
    const slug = path.split('/').pop()?.replace('.md', '') ?? '';
    const raw = mod.default;
    const title = raw.match(/title:\s*(.+)/)?.[1] ?? slug;
    const text = raw.replace(/---[\s\S]*?---/, '').replace(/[#*>`\[\]()!_\-|~]/g, ' ').replace(/\s+/g, ' ').trim();
    docs.push({ id: `blog/${slug}`, title, text, slug: `/blog/${slug}`, kind: 'blog' });
  }

  for (const [path, mod] of Object.entries(newsModules)) {
    const slug = path.split('/').pop()?.replace('.md', '') ?? '';
    const raw = mod.default;
    const title = raw.match(/title:\s*(.+)/)?.[1] ?? slug;
    const text = raw.replace(/---[\s\S]*?---/, '').replace(/[#*>`\[\]()!_\-|~]/g, ' ').replace(/\s+/g, ' ').trim();
    docs.push({ id: `news/${slug}`, title, text, slug: `/news/${slug}`, kind: 'news' });
  }

  idx.addAll(docs);
}

build();

/** 匹配词高亮：优先标题，否则正文片段 */
function highlight(doc, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${esc})`, 'gi');

  if (doc.title.toLowerCase().includes(term.toLowerCase())) {
    return { inTitle: true, html: doc.title.replace(re, '<mark>$1</mark>') };
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
    return { inTitle: false, html: frag.replace(re, '<mark>$1</mark>') };
  }
  return { inTitle: false, html: t.slice(0, len) + '…' };
}

export function search(term) {
  if (!term?.trim()) return [];
  const results = idx.search(term, { boost: { title: 3 }, prefix: true, fuzzy: 0.2 });
  return results.map((r) => ({
    ...r,
    hl: highlight(r, term)
  }));
}



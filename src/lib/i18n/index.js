/**
 * i18n 核心 — 运行时语言切换，无路由前缀
 *
 * 用法：
 *   import { t, setLang, lang } from '$lib/i18n';
 *   {$t('nav.news')}  或  {$t('pages.news.subtitle')}
 *
 * 语言设置保存在 cookie + localStorage。
 */
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import zh from './zh.js';
import en from './en.js';
import ja from './ja.js';
import zhHant from './zh-Hant.js';

const dicts = { zh, en, ja, 'zh-Hant': zhHant };
const defaultLang = 'zh';
const cycle = ['zh', 'zh-Hant', 'ja', 'en'];

function getCookie(name) {
  if (!browser) return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value) {
  if (!browser) return;
  const d = new Date();
  d.setTime(d.getTime() + 365 * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function detectLang() {
  if (!browser) return defaultLang;
  const stored = localStorage.getItem('lang') || getCookie('lang');
  if (stored && dicts[stored]) return stored;
  const nav = navigator.language?.replace('-', '');
  for (const code of cycle) {
    if (nav.startsWith(code) || code.startsWith(nav)) return code;
  }
  return defaultLang;
}

/** 当前语言 store */
export const lang = writable(detectLang());

/** 当前翻译字典 (derived) */
export const dict = derived(lang, ($lang) => dicts[$lang] ?? dicts[defaultLang]);

/** 按路径取翻译值: $t('nav.news') */
export const t = derived(dict, ($dict) => (path) => {
  return path.split('.').reduce((o, k) => o?.[k], $dict) ?? path;
});

/** 切换语言 */
export function setLang(code) {
  if (!dicts[code]) return;
  lang.set(code);
  if (browser) {
    localStorage.setItem('lang', code);
    setCookie('lang', code);
  }
}

/** 同步获取当前语言（非响应式） */
export function currentLang() {
  return get(lang);
}

/**
 * 从当前字典中按路径取值
 *   t('nav.news') → translations[lang].nav.news
 */
export function translate(path) {
  const dict = _t;
  return path.split('.').reduce((o, k) => o?.[k], dict) ?? path;
}

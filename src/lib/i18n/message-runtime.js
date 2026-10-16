import { messages } from './messages.js';

export function resolveLanguage(code) {
  const normalized = String(code ?? '').toLowerCase().replaceAll('_', '-');
  if (/^zh-(hant|tw|hk|mo)(-|$)/.test(normalized)) return 'zh-Hant';
  if (/^zh(-|$)/.test(normalized)) return 'zh';
  if (/^ja(-|$)/.test(normalized)) return 'ja';
  if (/^en(-|$)/.test(normalized)) return 'en';
  return 'zh';
}

export function translateMessage(source, language, params = {}) {
  if (typeof source !== 'string') return source;
  const key = source.trim();
  if (!key) return source;
  const translated = messages[key]?.[language] ?? key;
  const result = translated.replace(/\{(\d+)\}/g, (token, index) =>
    Object.hasOwn(params, index) ? String(params[index]) : token);
  return source.slice(0, source.length - source.trimStart().length) + result + source.slice(source.trimEnd().length);
}

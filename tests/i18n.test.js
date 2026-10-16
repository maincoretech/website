import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { messages } from '../src/lib/i18n/messages.js';
import { resolveLanguage, translateMessage } from '../src/lib/i18n/message-runtime.js';

const placeholders = text => [...text.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();
test('every site message has all three translations and matching parameters', () => {
  assert.ok(Object.keys(messages).length > 300);
  for (const [source, translations] of Object.entries(messages)) {
    for (const language of ['en', 'ja', 'zh-Hant']) {
      assert.ok(translations[language]?.trim(), `${language}: ${source}`);
      assert.deepEqual(placeholders(translations[language]), placeholders(source), `${language}: ${source}`);
    }
    assert.equal(translateMessage(source, 'zh'), source);
  }
});
test('locale detection distinguishes Traditional Chinese and handles missing preferences', () => {
  for (const code of ['zh-TW', 'zh-Hant', 'zh-Hant-HK', 'zh_HK', 'zh-MO']) assert.equal(resolveLanguage(code), 'zh-Hant');
  for (const code of ['zh', 'zh-CN', 'zh-Hans']) assert.equal(resolveLanguage(code), 'zh');
  assert.equal(resolveLanguage('en-US'), 'en');
  assert.equal(resolveLanguage('ja-JP'), 'ja');
  assert.equal(resolveLanguage(undefined), 'zh');
  assert.equal(resolveLanguage('fr'), 'zh');
});
test('translation preserves measurements, whitespace and parameter values without recursive interpolation', () => {
  assert.equal(translateMessage(15.23, 'en'), 15.23);
  assert.equal(translateMessage(null, 'en'), null);
  assert.equal(translateMessage('  ', 'en'), '  ');
  assert.equal(translateMessage('  15.23 ms\n', 'ja'), '  15.23 ms\n');
  assert.equal(translateMessage('开始制作', 'en'), messages['开始制作'].en);
  assert.equal(translateMessage('场景', 'en'), 'Scene');
  assert.equal(translateMessage('Kēne {0} · 不含解析 · 未测竞品执行', 'en', {0:'{1}'}).includes('{1}'), true);
});
const files = [
  'routes/product/+page.svelte', 'routes/product/keine/+page.svelte',
  'routes/product/hakutaku/+page.svelte', 'routes/about/+page.svelte',
  'lib/site/ProjectExplorer.svelte', 'lib/site/EngineDemos.svelte',
  'lib/site/KeineMetrics.svelte', 'lib/site/BenchmarkHighlights.svelte',
  'lib/site/BenchmarkComparison.svelte', 'lib/site/ArchiveBenchmarks.svelte',
  'lib/site/ArchiveMethod.svelte', 'lib/site/ScriptBenchmarks.svelte',
  'lib/site/HakutakuFlow.svelte', 'lib/site/KeineArchitecture.svelte', 'lib/site/SiteShell.svelte'
];
test('explicit product/UI messages are covered and visible Chinese is not hardcoded', () => {
  function visit(node, file) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Attribute' && !['aria-label','title','alt','content','placeholder','label'].includes(node.name)) return;
    if (node.type === 'CallExpression' && node.callee?.name === '$msg' && node.arguments[0]?.type === 'Literal') {
      const source=node.arguments[0].value;
      if (typeof source==='string' && /[\u3400-\u9fff]/.test(source)) assert.ok(messages[source], `${file}: ${source}`);
    }
    if (node.name === 'pre' || node.attributes?.some(a=>a.name==='class' && a.value?.some?.(v=>v.data?.includes('code-lines')))) return;
    if (node.type==='Text') assert.ok(!/[\u3400-\u9fff]/.test(node.data), `${file}: ${node.data}`);
    for(const value of Object.values(node)) {
      if(Array.isArray(value)) value.forEach(child=>visit(child,file));
      else if(value && typeof value==='object') visit(value,file);
    }
  }
  for(const file of files) visit(parse(readFileSync(new URL('../src/'+file, import.meta.url),'utf8'),{modern:true}).fragment,file);
});
test('Kēne benchmarks exclude the unrelated standalone WebGAL blocks', () => {
  const source=readFileSync(new URL('../src/lib/site/BenchmarkHighlights.svelte',import.meta.url),'utf8');
  assert.ok(!source.includes('WebgalkBenchmarks'));
  assert.ok(!source.includes('WebgalkMethod'));
});

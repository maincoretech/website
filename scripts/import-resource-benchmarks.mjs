import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = process.argv[2];
assert(root, 'Usage: node scripts/import-resource-benchmarks.mjs <benchmark-directory>');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const median = a => { const b = [...a].sort((x, y) => x - y); return (b[Math.floor((b.length - 1) / 2)] + b[Math.floor(b.length / 2)]) / 2; };
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const original = read('summary.json');
const native = read('native-summary.json');
const measure = values => ({ median: median(values), process_values: values, range: [Math.min(...values), Math.max(...values)] });
const summarize = (runs, metadata, keys = ['open_ms', 'sequential_ms', 'random_2000_4k_ms']) => {
  assert.equal(runs.length, 3);
  const metrics = {};
  for (const run of runs) { assert.equal(run.files, 624); assert.equal(run.verified_files, 624); assert.equal(run.raw_bytes, 29360128); }
  for (const key of keys) {
    if (!runs.every(run => Array.isArray(run[key]))) { metrics[key] = null; continue; }
    runs.forEach(run => { assert.equal(run[key].length, 10); assert(run[key].every(v => Number.isFinite(v) && v >= 0)); });
    metrics[key] = measure(runs.map(run => median(run[key])));
    if (key === 'random_2000_4k_ms') metrics.first_2000_4k_ms = measure(runs.map(run => run[key][0]));
  }
  metrics.archive_mib = measure(runs.map(run => run.archive_bytes / 1048576));
  metrics.pack_ms = runs.every(run => Number.isFinite(run.pack_ms)) ? measure(runs.map(run => run.pack_ms)) : null;
  return { ...metadata, metrics, runs };
};
const hexzSource = `https://github.com/maincoretech/hexz_k/tree/${original.source.hexz}`;
const controlledRuns = [1, 2, 3].flatMap(i => fs.readFileSync(path.join(root, `encrypted-fair/raw/run-${i}.jsonl`), 'utf8').split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line)));
assert.equal(controlledRuns.length, 9);
const archiveRows = original.archives.filter(row => row.variant.startsWith('hakutaku/') || row.variant.endsWith('/true')).map(row => {
  const [name, codec] = row.variant.split('/');
  const haku = name === 'hakutaku';
  const id = haku ? 'hakutaku' : `hexz-${codec}-encrypted`;
  const runs = controlledRuns.filter(run => run.id === id);
  for (const run of runs) {
    assert.equal(run.encrypted, true); assert.equal(run.verified_ranges, 2000);
    assert.equal(run.cache_payload_budget_bytes, 67108864); assert.equal(run.prefetch, false);
    assert.equal(run.reused_warmup_rounds, 1);
  }
  return summarize(runs, {
    id, encrypted: true,
    label: haku ? 'Hakutaku' : `hexz · ${codec.toUpperCase()} · 密码加密`,
    version: '0.2.0', pattern: haku ? 'solid' : codec === 'lz4' ? 'cross' : 'vertical',
    source: haku ? `https://github.com/maincoretech/hakutaku/tree/${original.source.hakutaku}` : hexzSource,
    access: 'range', protection: haku ? '资源认证加密、发布者签名；传入原始密钥' : '密码加密；密码派生在计时外',
    note: haku ? '64 MiB 内容块缓存；保留原生准入策略及游标状态；2 MiB 元数据缓存' : '1024 × 64 KiB 块缓存；原生 mmap 读器；不额外触发打开时的首字节密码检查',
    compiler: original.compilers.archives, writer: '原生打包 API'
  }, ['sequential_fresh_ms', 'random_fresh_2000_4k_ms', 'random_reused_2000_4k_ms']);
});
const extra = [
  { file: 'lgpak', id: 'letsgal-lgpak', label: 'LetsGal · LGPAK', version: 'Studio 2.5.0 导出读器', pattern: 'dashes', source: null, access: 'range', protection: 'AES-GCM；传入测试用原始密钥，不含派生', writer: '格式兼容夹具；未计官方打包耗时', note: '原始导出读器；打开会将整个包读入内存；每个资源小于默认 1 MiB 分块' },
];
const references = [];
for (const metadata of extra) {
  const runs = [1, 2, 3].map(i => ({ process: i, ...read(`archive-extra/raw/${metadata.file}-${i}.json`) }));
  runs.forEach(run => assert.equal(run.verified_ranges ?? run.verified_random_full_files, 2000));
  const { file, ...publicMetadata } = metadata;
  references.push(summarize(runs, { ...publicMetadata, encrypted: true }));
}
const archives = {
  schema: 2, date: '2026-10-16', machine: original.machine,
  fixture: { files: 624, bytes: 29360128, kind: '确定性合成数据，不是真实游戏媒体', groups: '256 × 8 KiB 文本、48 × 256 KiB 二进制、192 × 64 KiB 二进制、128 × 16 KiB 文本', manifest_sha256: hash('archive-fixture.manifest') },
  method: { processes: 3, samples_per_process: 10, aggregate: '三次进程中位数的中位数；范围为进程中位数最小/最大值，非置信区间', cache: '文件系统暖缓存；内容块缓存名义预算均为 64 MiB；关闭预取。新会话每次重新打开并解析句柄，复用会话先跑一轮相同轨迹预热，再计十轮。', timing: '打开、密码派生、索引及句柄解析、逐字节结果对照在计时外；读取路径内的解密、解压和认证照常计入。完整读取与区间读取使用不同会话。', order: '三个进程轮换配置顺序，各配置分别位于第一、第二、第三位。', build: '同一 Rust 1.99.0 release 二进制：opt-level=3、LTO、codegen-units=1。LGPAK 为较早批次的独立 JS 参考。' },
  limitations: [
    '只发布加密资源包成绩。未加密或仅混淆的配置不进入图表、明细和公开样本。',
    '统一的是负载、读取协议、编译配置和名义内容缓存预算，不是等价安全等级或等价总内存；Hakutaku 保留发布者签名和资源认证。',
    'Hakutaku 的游标、块准入、元数据缓存与 hexz 的块布局、mmap 和缓存实现不同；实际驻留内存未测。',
    '624 个文件均使用 .bin 扩展名；不代表真实音视频的专门流式策略。背景应用未隔离。',
    '新会话仍为暖文件系统，不是冷磁盘；复用会话包含解密块和游标缓存命中，不是磁盘吞吐。',
    'LGPAK 会整包载入内存，使用格式兼容夹具与原始导出读器，单列历史参考，不混入受控读取比较。其十轮统计包含首轮，不套用上方新协议。',
    '不展示打开耗时横向排名：密码派生、签名校验、索引读取和整包载入不是同一工作量。差值未经过显著性检验。'
  ],
  rows: archiveRows, references,
  coverage: [
    { label: 'WebGAL 4.6.6', status: '未测专用容器', reason: '本轮未纳入对应的官方容器读写入口；散文件 / HTTP 路径不等价于资源包。', source: 'https://docs.openwebgal.com/en/getting-started.html' },
    { label: 'TyranoScript 602c', status: '未测专用容器', reason: '发行方式包含游戏数据目录；未将 ZIP 分发包或通用 Electron ASAR 作为专属格式成绩。', source: 'https://tyranoscript.com/usage/tutorial/complete' }
  ],
  provenance: Object.fromEntries(['archive-probe/src/bin/encrypted-fair.rs', 'lgpak-archive.cjs', 'generate-archive-fixture.rs'].map(file => [file, hash(file)]))
};
const nativePublic = {
  schema: 1, date: native.date, label: 'WebGAL_k', version: '0.1.4 · hexz 后端', commit: original.source.webgalk,
  source: `https://github.com/maincoretech/WebGAL_k/tree/${original.source.webgalk}`, machine: original.machine, viewport: native.viewport,
  method: '每种负载一次启动；采样前预热 10 秒，连续三个 30 秒窗口。CPU 为各窗口均值的中位数；RSS 为各窗口中位数的中位数。',
  limitations: ['100% CPU 为一个逻辑核；合计 app + WebKit XPC 的 RSS，可能重复计入共享页，不含 WindowServer。', '静态、位移、单轨、双轨全部通过 18/18 前台检查；音频两组通过 36/36 CoreAudio 输出检查。', '与历史其他引擎的场景布局、资源后端和日期不同，单独展示，不追加到旧引擎排行。', '位移自动推进脚本，静态停在对白；BGM 重采较晚，不能将场景间差值解释为动画/音频的因果开销。', '背景路径解析缺陷未修引擎，夹具显式使用 hexz:// 地址；BGM 实际增益 0.125，环境音 0.2。', '使用前台保持脚本；未计它的进程开销。未测冷启动、功耗与统一呈现帧率。'],
  unavailable: { frame_time: '本机缺少 xctrace / Metal 追踪', gpu: '未采集' },
  tests: { parser_passed: 25, embedded_passed: 7, hexz_passed: 17, regression_failed: 2, detail: '新增 changeBg / unlockCg 背景路径回归失败：枚举值 0 被真假判断跳过。隔离克隆绕过缺失 tsconfig 引用后运行测试；原 build 最后一步缺少 rimraf。' },
  workloads: native.workloads.map(row => {
    const raw = read(row.source);
    assert(raw.samples.every(s => s.foreground));
    return { name: row.name, cpu_percent: row.cpu_percent, rss_mib: row.rss_mib, windows: row.windows,
      samples: raw.samples.map(s => ({ window: s.window, cpu_percent: s.cpu_percent, rss_mib: s.rss_mib, foreground: s.foreground, audio_active: s.audio.some(a => a.output_active === 1) })) };
  }),
  embedded: original.embedded.filter(row => row.variant.endsWith('/true'))
};
fs.mkdirSync('static/benchmarks', { recursive: true });
fs.writeFileSync('static/benchmarks/resource-archives.json', JSON.stringify(archives, null, 2) + '\n');
fs.writeFileSync('static/benchmarks/webgalk-native.json', JSON.stringify(nativePublic, null, 2) + '\n');
console.log(`Imported ${archives.rows.length} archive variants and ${nativePublic.workloads.length} native workloads.`);

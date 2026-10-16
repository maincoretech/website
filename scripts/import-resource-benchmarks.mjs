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
const summarize = (runs, metadata) => {
  assert.equal(runs.length, 3);
  const metrics = {};
  for (const run of runs) { assert.equal(run.files, 624); assert.equal(run.verified_files, 624); assert.equal(run.raw_bytes, 29360128); }
  for (const key of ['open_ms', 'sequential_ms', 'random_2000_4k_ms', 'random_2000_full_file_ms']) {
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
const archiveRows = original.archives.map(row => {
  const [name, codec, encrypted] = row.variant.split('/');
  const haku = name === 'hakutaku';
  const secure = encrypted === 'true';
  return summarize(row.source_runs, {
    id: haku ? 'hakutaku' : `hexz-${codec}-${secure ? 'encrypted' : 'plain'}`,
    label: haku ? 'Hakutaku' : `hexz · ${codec.toUpperCase()} · ${secure ? '密码加密' : '明文'}`,
    version: '0.2.0', pattern: haku ? 'solid' : secure ? (codec === 'lz4' ? 'cross' : 'vertical') : (codec === 'lz4' ? 'diagonal' : 'dots'),
    source: haku ? `https://github.com/maincoretech/hakutaku/tree/${original.source.hakutaku}` : hexzSource,
    access: 'range', protection: haku ? '资源认证加密、发布者签名；传入原始密钥' : secure ? '密码加密；打开包含密码派生' : '无加密',
    note: haku ? '默认缓存；首次随机轨迹与重复轨迹分别列出' : '默认块策略；保留读取句柄',
    compiler: original.compilers.archives, writer: '原生打包 API'
  });
});
const extra = [
  { file: 'renpy', id: 'renpy-rpa', label: 'Ren’Py · RPA 3.0', version: '8.5.3', pattern: 'horizontal', source: 'https://www.renpy.org/release/8.5.3', access: 'range', protection: '索引混淆；非加密', writer: 'SDK 原始 Archive 类', note: '原生 RPAv3ArchiveHandler + SDL RWopsIO；索引压缩、数据未压缩' },
  { file: 'lgpak', id: 'letsgal-lgpak', label: 'LetsGal · LGPAK', version: 'Studio 2.5.0 导出读器', pattern: 'dashes', source: null, access: 'range', protection: 'AES-GCM；传入测试用原始密钥，不含派生', writer: '格式兼容夹具；未计官方打包耗时', note: '原始导出读器；打开会将整个包读入内存；每个资源小于默认 1 MiB 分块' },
  { file: 'suika', id: 'suika-arc', label: 'Suika3 · assets.arc', version: '4d9d0f3 / StratoHAL', pattern: 'grid', source: 'https://github.com/awemorris/suika3/tree/4d9d0f3961710734fdc59139d8f159ea6ed0918f', access: 'full', protection: '字节混淆；非认证加密', writer: '原生 hal_archive', note: '原生 stdfile 读器；无本次可用的直接 seek API，仅测整文件随机读取' },
  { file: 'ons', id: 'ons-nsa', label: 'ONScripter · NSA', version: '848a608 · 无压缩', pattern: 'checker', source: 'https://github.com/ogapee/onscripter/tree/848a60892e4d721459e8d1051e1b8fe45164c3e9', access: 'full', protection: '无压缩、无加密 NSA 条目', writer: '格式兼容夹具；未计官方打包耗时', note: '原生 NsaReader；不代表 SPB / NBZ / LZSS 压缩资源；仅整文件 API' }
];
for (const metadata of extra) {
  const runs = [1, 2, 3].map(i => ({ process: i, ...read(`archive-extra/raw/${metadata.file}-${i}.json`) }));
  runs.forEach(run => assert.equal(run.verified_ranges ?? run.verified_random_full_files, 2000));
  const { file, ...publicMetadata } = metadata;
  archiveRows.push(summarize(runs, publicMetadata));
}
const archives = {
  schema: 1, date: '2026-10-16', machine: original.machine,
  fixture: { files: 624, bytes: 29360128, kind: '确定性合成数据，不是真实游戏媒体', groups: '256 × 8 KiB 文本、48 × 256 KiB 二进制、192 × 64 KiB 二进制、128 × 16 KiB 文本', manifest_sha256: hash('archive-fixture.manifest') },
  method: { processes: 3, samples_per_process: 10, aggregate: '三次进程中位数的中位数；范围为进程中位数最小/最大值，非置信区间', cache: '完整内容校验预热文件系统；各实现默认缓存策略；随机读取保留句柄', order: '新增四格式：正序、逆序、正序。hexz / Hakutaku 为同日较早的独立批次。', build: 'C/C++: Apple Clang -O3；hexz / Hakutaku: Rust 1.99.0 opt-level=3；Ren’Py: SDK Python；LGPAK: Node 原始 JS 读器。' },
  limitations: [
    '同一合成负载，不是完整引擎或同等安全/同等缓存策略排名。背景应用未隔离。',
    '打开采用各读器原生行为：LGPAK 包含整包载入，密码 hexz 包含 KDF，其余主要为目录/索引读取；不能解释为同一种操作的优劣。',
    '2000 × 4 KiB 范围读取与 2000 次整文件读取分开。首次轨迹仍为暖文件系统，不是冷磁盘性能。',
    '重复轨迹取十轮中位数（含首轮），保留句柄与默认缓存；不得当作首次磁盘吞吐。',
    'NSA 与 LGPAK 使用格式兼容合成夹具并由原生读器逐字节核验，不将自写夹具构造器的耗时作为官方打包成绩。',
    '缺失测试不是零。Suika3/ONS 本轮没有等价范围 API；WebGAL/TyranoScript 未纳入对应的专用资源容器实现，不以通用 ZIP/ASAR 代替。'
  ],
  rows: archiveRows,
  coverage: [
    { label: 'WebGAL 4.6.6', status: '未测专用容器', reason: '本轮未纳入对应的官方容器读写入口；散文件 / HTTP 路径不等价于资源包。', source: 'https://docs.openwebgal.com/en/getting-started.html' },
    { label: 'TyranoScript 602c', status: '未测专用容器', reason: '发行方式包含游戏数据目录；未将 ZIP 分发包或通用 Electron ASAR 作为专属格式成绩。', source: 'https://tyranoscript.com/usage/tutorial/complete' }
  ],
  provenance: Object.fromEntries(['archive-probe/src/main.rs', 'renpy-archive.py', 'lgpak-archive.cjs', 'native-archive.cpp', 'generate-archive-fixture.rs'].map(file => [file, hash(file)]))
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
  embedded: original.embedded
};
fs.mkdirSync('static/benchmarks', { recursive: true });
fs.writeFileSync('static/benchmarks/resource-archives.json', JSON.stringify(archives, null, 2) + '\n');
fs.writeFileSync('static/benchmarks/webgalk-native.json', JSON.stringify(nativePublic, null, 2) + '\n');
console.log(`Imported ${archives.rows.length} archive variants and ${nativePublic.workloads.length} native workloads.`);

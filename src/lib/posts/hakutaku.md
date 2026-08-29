---
title: Hakutaku
date: 2026-08-22
author: maincore
description: 面向视觉小说的可认证、可随机访问资源格式
priority: 1
category: tech
---

视觉小说的资源负载很特别：几万到十万条语音、大量背景和立绘；脚本和 UI 不多，但要反复读取；BGM 和视频需要连续读，偶尔还要短距离 seek。

传统压缩格式很难同时把随机读取、局部更新、缓存控制和完整性验证都照顾到；面向大型通用游戏的资源架构又总带着网络层、线程池和复杂调度。Hakutaku 只做视觉小说真正用得到的那部分：

> 面向离线视觉小说，提供发行者认证、随机访问、流式读取和增量更新的资源格式。

下面说的是 Hakutaku **v1 格式**。参考实现版本是 `v0.1.7`，性能测试对应提交 `ce8fe3c`。

## 一个快照，一组不可变数据段

每个发行版本就是一个签名快照 `game.haku`，加上若干 `.taku` 数据段。

<figure class="haku-figure" aria-label="Hakutaku 发行目录结构">
  <figcaption>发行版本：一个签名快照，连着若干不可变数据段</figcaption>
  <div class="release-flow">
    <div class="snapshot"><strong>game.haku</strong><span>签名快照</span></div>
    <div class="connector">认证目录与段清单</div>
    <div class="segments">
      <strong>data/</strong>
      <div class="segment-list" aria-label="不可变数据段示例">
        <span class="segment-file">&lt;BLAKE3 SegmentId&gt;.taku</span>
        <span class="segment-file">&lt;BLAKE3 SegmentId&gt;.taku</span>
        <span class="segment-file segment-file--more" aria-label="更多数据段">…</span>
      </div>
      <small>内容寻址 · 不可变 · 可跨版本复用</small>
    </div>
  </div>
</figure>

`game.haku` 里有固定头、加密压缩目录、资源路径索引、文件到数据块的映射页、块复用信息、Required/Deferred 段清单，以及单调递增的 `release_sequence`。

`.taku` 数据段写入后不再改动，文件名取自完整文件的 BLAKE3 内容标识。新旧版本可以放心复用同一个段，安装器也能先部署 Required 段，Deferred 段等需要时再取。Hakutaku 提供认证过的安装清单和读取接口，下载、重试和网络策略交给引擎或启动器。

## 从发行者签名验证到每一个资源块

| 用途                         | 固定算法        |
| ---------------------------- | --------------- |
| 目录、页面、资源块加密认证   | AES-256-GCM     |
| 发行快照签名                 | Ed25519         |
| 内容寻址、密钥派生、签名承诺 | BLAKE3          |
| 可压缩资源                   | 独立 zstd frame |
| 已压缩媒体                   | RAW 加密块      |

<figure class="haku-figure" aria-label="Hakutaku 认证链">
  <figcaption>从发行者签名到实际资源块的认证链</figcaption>
  <div class="trust-flow">
    {#each ['Ed25519 发行者公钥', '签名 Header 与目录', 'AES-GCM 解密目录', '验证元数据页摘要', '验证资源块摘要', 'AES-GCM 解密资源块'] as step, i}
      <div class="trust-step"><span>{i + 1}</span><strong>{step}</strong></div>
      {#if i < 5}<div class="arrow">→</div>{/if}
    {/each}
  </div>
</figure>

快照签名在目录解密之前先验证。签名后的目录承诺了元数据页摘要，认证过的页面再承诺资源块密文摘要；校验一路从发行者身份连到目录、元数据页，最后落到实际读取的数据块。明文通过认证进入有界缓存后，后续读取直接复用，不用反复解密、重算摘要。

签名里的 `release_sequence` 用来防回滚：启动器记住已经接受过的最高序列，下次打开时把它作为最低允许值。低于这个值的旧快照，就算签名仍然合法，也会被拒绝。

## 按视觉小说的真实访问方式分类

Hakutaku 按访问类型给资源选读取和缓存策略。

<figure class="haku-figure" aria-label="视觉小说资源访问策略">
  <figcaption>访问提示同时影响缓存和读取行为，文件大小只是依据之一</figcaption>
  <div class="access-grid">
    <div class="access-cell"><strong>Hot</strong><span>脚本 · UI · 小配置</span><small>积极保留</small></div>
    <div class="access-cell"><strong>Normal</strong><span>背景 · 立绘 · 普通资源</span><small>第二次访问后缓存</small></div>
    <div class="access-cell"><strong>Transient</strong><span>短语音 · 短音效</span><small>一次性消费</small></div>
    <div class="access-cell"><strong>Streaming</strong><span>BGM · 长音频 · 视频</span><small>顺序流式读取</small></div>
  </div>
</figure>

| 访问类型  | 典型资源             | 参考分块策略                                           |
| --------- | -------------------- | ------------------------------------------------------ |
| Hot       | 小脚本、UI、小配置   | 单块，最大 32 KiB                                      |
| Normal    | 背景、立绘、普通资源 | FastCDC 32–512 KiB，平均约 128 KiB；超大资源固定 1 MiB |
| Transient | 短语音、短音效       | 固定 256 KiB                                           |
| Streaming | BGM、长音频、视频    | 固定 256 KiB                                           |

分类时先看媒体扩展名，再看文件大小。不足 32 KiB 的 `.opus` 语音仍按音频资源处理，不会落进 Hot 小文件规则。WebP、PNG、JPEG、AVIF、Opus、MP3、Ogg、FLAC 和常见视频容器直接写成 RAW 加密块，再压一次 zstd 通常省不了多少空间。

参考打包器为每种 Required/Deferred 与 AccessClass 组合单开数据段写入流，这样增量更新时短语音、流媒体和 Hot 数据不会互相牵扯。

## 为连续播放与短距离 seek 保留状态

只读一次的话，直接调 `Asset::read_at` 就够了。连续播放或者接第三方解码器、需要反复读时，保留 `AssetCursor`（标准 `Read + Seek`）或 `AssetReadSession`（offset-based 引擎接口）。它们会复用：

- 当前打开的数据段句柄；
- 密文与解压明文缓冲区；
- 已准备的密码学状态；
- 当前与前一个 Streaming 块。

前一个 Streaming 块专门留给解码器常见的短距离回跳。比如 `A → B → A`：前两步各做一次认证读取，回到 A 时直接复用游标里留好的数据。

引擎也可以调同步的 `prefetch_range`，把指定范围预先认证好，再交给自己的任务池。默认预算有 2 MiB 元数据页缓存、64 MiB 明文缓存、2 MiB 预取缓存、16 个闲置段句柄，以及 256 个 Normal 首次访问记录。

内存紧张时可以调低预算，也可以把可重建缓存全部关掉。

## 机械硬盘上的实际缓存表现

这部分数据来自 Kēne 0.8.1 的实机报告（提交 `4df5e17804d0`），报告里的 Hakutaku 后端与本文版本一致。测试机是 Windows 11 + Intel Core i5-8350U，通过 USB 外接 SATA HDD（Toshiba MQ01ABF050）模拟低性能存储。

<figure class="haku-figure" aria-label="机械硬盘首次访问与重复访问性能">
  <figcaption>机械硬盘上的 Hakutaku 实测</figcaption>
  <div class="metric-row">
    <div><strong>102.2 → 849.8</strong><span>MiB/s</span><small>Hot 首次访问 → CLOCK 重复访问</small></div>
    <div><strong>18.3 → 1,023.1</strong><span>MiB/s</span><small>Normal probation → CLOCK resident</small></div>
    <div><strong>405 → 5,151</strong><span>IOPS</span><small>512 × 4 KiB 随机 seek：首次 → 重复</small></div>
  </div>
</figure>

首次访问读取的数据范围互不重叠。测试没有人为清空 OS 或硬盘缓存，和日常使用条件一致。结果里能直接看到缓存生效前后的差别；增益也混着 OS 和硬盘缓存的贡献，不能全算到 CLOCK 头上。

## 为长期开发准备增量

有了不可变段，增量构建可以直接复用旧版本里仍然有效的加密块；相同内容放进兼容的类别时也会自动去重。密文不用重写，但源文件还是得读：20–40 GiB 语音的项目，每次重新分块、重算哈希，照样要等很久。

给本地开发用的 `--dev-cache` 会记录逻辑路径、文件大小、修改时间、可用的平台文件身份、认证过的分块元数据，以及所属项目和发行序列。

缓存损坏、过期或对不上时会被忽略。普通构建和完整构建仍然会重读全部源文件、验证暂存发行版本，再逐字节比对每项资源。

<figure class="haku-figure" aria-label="开发缓存构建耗时对比">
  <figcaption>工程未修改时：开发缓存与严格增量构建的对比</figcaption>
  <div class="chart-columns">
    <section class="chart-group">
      <header class="chart-group__header"><strong>10,000 assets</strong><span>缩短 53.1%</span></header>
      <HorizontalBarChart
        items={[
          { label: '严格增量', value: 341.594, display: '341.594 ms' },
          { label: '开发缓存', value: 160.139, display: '160.139 ms' }
        ]}
        ariaLabel="10,000 assets 构建耗时对比"
      />
    </section>
    <section class="chart-group">
      <header class="chart-group__header"><strong>100,000 assets</strong><span>缩短 59.2%</span></header>
      <HorizontalBarChart
        items={[
          { label: '严格增量', value: 4973.689, display: '4,973.689 ms' },
          { label: '开发缓存', value: 2031.202, display: '2,031.202 ms' }
        ]}
        ariaLabel="100,000 assets 构建耗时对比"
      />
    </section>
  </div>
</figure>

`--dev-cache` 把“确认源文件没变”和“重新读取几十 GiB 内容”拆开处理。缓存命中时跳过源文件的逐字节复核，所以它只适合本地迭代；正式发行用普通构建或 `--full`。完整重建还负责压实：按当前策略重写活动资源，并清理历史增量版本留下的未引用数据。

## Publisher Identity 与运行时材料分离

Publisher Identity 包含 content root key 和 Ed25519 私钥，有权签署新发行版本。Runtime Key Material 只留内容根密钥和公开验证密钥，能读取、能验证，但不能签名。

完整的 Publisher Identity 只有打包命令会加载；读取、列表、提取和验证工具拿到的都是 Runtime Key Material。打包器和 GUI 靠文件魔数识别身份文件，改了名的密钥文件也没法当作游戏资源导入。打包开始前还会检查输入目录与输出目录的嵌套关系。

Hakutaku 没把自己定位成无法破解的客户端 DRM。游戏运行时本来就有内容解密材料，能分析客户端的人还是可能把它提取出来。它的安全边界在发行者身份和资源完整性上：拿不到 Publisher Identity 里的 Ed25519 私钥，就生成不了能通过认证的新快照，也替换不掉已被签名承诺的资源块。

## 当前版本实测

下面的数字来自 Hakutaku `v0.1.7`（提交 `ce8fe3c`），Rust release/bench profile，2026-08-22 在 Apple M5 Pro、24 GB 内存、macOS 27.0 上单次实测。测试前文件系统缓存已经预热，所以它们适合看回归和架构表现，不代表目标设备上的冷存储性能。

### 32 MiB 流式资源

测试数据由程序确定性生成，形态接近 MP4、基本不可压缩。短距离 seek 命中内存时约 2,333 万次/秒；这个数主要反映相邻块认证完之后的内存复制速度，而不是存储 IOPS。

<figure class="haku-figure" aria-label="32 MiB 流式资源实测">
  <figcaption>32 MiB 不可压缩的类 MP4 测试数据</figcaption>
  <div class="metric-row">
    <div><strong>1,644.3</strong><span>MiB/s</span><small>256 KiB 顺序读取</small></div>
    <div><strong>6,578</strong><span>IOPS</span><small>随机 4 KiB 读取</small></div>
    <div><strong>0.056</strong><span>ms</span><small>签名快照打开</small></div>
  </div>
</figure>

| 指标                     |             实测 |
| ------------------------ | ---------------: |
| 完整打包及暂存验证       |       112.077 ms |
| 签名快照打开             |         0.056 ms |
| 128 KiB 顺序读取         |    1,635.8 MiB/s |
| 256 KiB 顺序读取         |    1,644.3 MiB/s |
| 10,000 次随机 4 KiB 读取 |       6,578 IOPS |
| 数据块数量               |              128 |
| 加密段体积               | 33,560,576 bytes |

### 10k 与 100k 资源目录

资源从 10k 涨到 100k，目录打开时间由 1.767 ms 增至 17.169 ms，基本跟着规模走；1,000 次随机路径查找只从 0.395 ms 增至 0.523 ms，因为查找全程都在认证过的内存目录里完成。

<figure class="haku-figure" aria-label="一万与十万资源目录性能">
  <figcaption>资源数扩大 10 倍时，打开与路径查找的变化</figcaption>
  <div class="chart-columns">
    <section class="chart-group">
      <header class="chart-group__header"><strong>进程内首次打开</strong></header>
      <HorizontalBarChart
        items={[
          { label: '10k', value: 1.767, display: '1.767 ms' },
          { label: '100k', value: 17.169, display: '17.169 ms' }
        ]}
        ariaLabel="进程内首次打开耗时"
      />
    </section>
    <section class="chart-group">
      <header class="chart-group__header"><strong>1,000 次随机路径查找</strong></header>
      <HorizontalBarChart
        items={[
          { label: '10k', value: 0.395, display: '0.395 ms' },
          { label: '100k', value: 0.523, display: '0.523 ms' }
        ]}
        ariaLabel="一千次随机路径查找耗时"
      />
    </section>
  </div>
  <p class="figure-note">两种规模下，1,000 次路径查找的后端读取均为 <strong>0 bytes</strong></p>
</figure>

| 指标                 | 10,000 assets | 100,000 assets |
| -------------------- | ------------: | -------------: |
| 首次严格打包         |    572.436 ms |   6,525.188 ms |
| 未修改严格增量构建   |    341.594 ms |   4,973.689 ms |
| 开发缓存命中         |    160.139 ms |   2,031.202 ms |
| 开发缓存相对严格增量 |      快 53.1% |       快 59.2% |
| 进程内首次打开       |      1.767 ms |      17.169 ms |
| 1,000 次随机路径查找 |      0.395 ms |       0.523 ms |
| 路径查找后端读取     |       0 bytes |        0 bytes |

### 典型 VN 读取放大

大一点的背景、立绘、BGM 和视频，后端读取量都接近理想的 `1×`。24 KiB 小语音偏高，因为 4 KiB 段头、元数据页和块认证这些固定开销，在小资源里占比更明显。

<figure class="haku-figure" aria-label="典型视觉小说资源读取放大">
  <figcaption>超过理想 1× 的额外后端读取量（横轴上限 35%）</figcaption>
  <HorizontalBarChart
    items={[
      { label: '背景', value: 2.2, display: '1.022× · +2.2%' },
      { label: '立绘', value: 2.2, display: '1.022× · +2.2%' },
      { label: '短语音', value: 30.7, display: '1.307× · +30.7%' },
      { label: 'BGM', value: 12.6, display: '1.126× · +12.6%' },
      { label: '视频', value: 6.3, display: '1.063× · +6.3%' }
    ]}
    max={35}
    height="176px"
    valueWidth={100}
    inset={4}
    alternate={false}
    ariaLabel="典型视觉小说资源额外读取量"
  />
</figure>

| 读取场景                    |     耗时 | Read amplification |
| --------------------------- | -------: | -----------------: |
| 512 KiB 背景完整读取        | 0.366 ms |             1.022× |
| 512 KiB 立绘完整读取        | 0.347 ms |             1.022× |
| 24 KiB 代表语音             | 0.050 ms |             1.307× |
| 4 MiB BGM 顺序读取并短 seek | 2.811 ms |             1.126× |
| 8 MiB 视频顺序读取并短 seek | 5.369 ms |             1.063× |

### 去重

<figure class="haku-figure" aria-label="重复内容去重效果">
  <figcaption>四份相同的 4 MiB 文件：逻辑内容与实际段数据</figcaption>
  <StackedBarChart
    items={[
      { label: '实际写入', value: 4.004, display: '4.004 MiB' },
      { label: '块复用', value: 11.996, display: '复用约 11.996 MiB' }
    ]}
    total={16}
    ariaLabel="16 MiB 逻辑内容中实际写入与复用数据占比"
  />
  <div class="dedup-summary"><strong>16 MiB</strong> 逻辑内容 <span>→</span> 减少 <strong>约 75%</strong></div>
</figure>

四份一模一样的 4 MiB 文件，逻辑上一共 16 MiB。实际只写入 26 个新块、复用 78 个引用，加密段数据为 4,198,816 bytes（约 4.004 MiB），比逻辑内容少约 75%。

## Hakutaku 的取舍

| Hakutaku                    | 留给引擎或平台的部分          |
| --------------------------- | ----------------------------- |
| 发行者认证与逐块完整性验证  | HTTP 客户端、下载器和重试策略 |
| 加密资源存储                | async runtime 与线程池        |
| 随机访问与顺序流式读取      | 音频、视频解码器              |
| 有界运行时缓存              | ECS 与大型游戏资产调度系统    |
| Required/Deferred 内容拆分  | 平台持久化与更新 UI           |
| 内容寻址、去重与增量更新    | 客户端 DRM                    |
| 本地开发构建缓存            | 何时加载、下载和播放的决策    |
| 跨桌面与移动平台的 I/O 抽象 | 网络传输协议                  |

边界划清之后，何时加载、从哪里下载、怎么播放归引擎；Hakutaku 负责确认资源确实来自发行者，并让读取方式贴近视觉小说的实际负载。

参考实现和完整规范见 <a href="https://github.com/maincoretech/hakutaku/blob/main/docs/FORMAT.md" target="_blank" rel="noopener noreferrer">FORMAT</a>、<a href="https://github.com/maincoretech/hakutaku/blob/main/docs/PERFORMANCE.md" target="_blank" rel="noopener noreferrer">PERFORMANCE</a> 与 <a href="https://github.com/maincoretech/hakutaku/blob/main/docs/SECURITY.md" target="_blank" rel="noopener noreferrer">SECURITY</a>。

<style>
  .haku-figure {
    --hf-primary: #6090a0;
    --hf-on-surface: #334755;
    --hf-on-muted: #506473;
    --hf-surface: rgba(215, 228, 235, 0.72);
    --hf-container: rgba(185, 210, 222, 0.52);
    --hf-container-high: rgba(200, 218, 228, 0.72);
    margin: 24px 0;
    padding: 18px;
    overflow: hidden;
    color: var(--hf-on-surface);
    background: var(--hf-surface);
    border-radius: 0;
  }

  .haku-figure figcaption {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    color: var(--hf-on-surface);
    font:
      600 1rem/1.35 'Roboto Condensed',
      'PingFang SC',
      'Hiragino Sans GB',
      sans-serif;
    letter-spacing: 0.015em;
  }

  .haku-figure figcaption::before {
    width: 4px;
    height: 22px;
    flex: 0 0 auto;
    content: '';
    background: var(--hf-primary);
    border-radius: 0;
    opacity: 0.82;
  }

  .release-flow,
  .trust-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .snapshot,
  .segments,
  .trust-step,
  .access-cell,
  .metric-row > div,
  .chart-group {
    background: var(--hf-container);
    border-radius: 6px;
  }

  .snapshot,
  .segments {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
  }

  .snapshot {
    min-width: 132px;
    text-align: center;
    background: rgba(96, 144, 160, 0.18);
  }

  .snapshot strong,
  .segments strong,
  .access-cell strong,
  .metric-row strong {
    color: var(--hf-primary);
  }

  .segments {
    min-width: 250px;
    font-family: var(--f-m);
  }

  .segment-list {
    display: grid;
    gap: 5px;
    margin: 4px 0;
  }

  .segment-file {
    display: block;
    padding: 6px 10px;
    color: var(--hf-on-surface);
    background: rgba(96, 144, 160, 0.14);
    border-radius: 3px;
    font-size: 0.8rem;
    line-height: 1.25;
    text-align: center;
  }

  .segment-file--more {
    color: var(--hf-primary);
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  .snapshot span,
  .segments small,
  .access-cell small,
  .metric-row small,
  .figure-note {
    color: var(--hf-on-muted);
    font-size: 0.75rem;
  }

  .connector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    color: var(--hf-on-muted);
    background: var(--hf-container-high);
    border-radius: 6px;
    font-size: 0.73rem;
    text-align: center;
  }

  .connector::after {
    color: var(--hf-primary);
    content: '→';
    font: 700 1rem var(--f-n);
  }

  .trust-flow {
    gap: 6px;
    flex-wrap: wrap;
  }

  .trust-step {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    padding: 8px 10px 8px 8px;
    font-size: 0.78rem;
  }

  .trust-step span {
    display: grid;
    width: 25px;
    height: 25px;
    place-items: center;
    flex: 0 0 auto;
    color: #f4f8fa;
    background: var(--hf-primary);
    border-radius: 50%;
    font: 600 0.72rem var(--f-m);
  }

  .trust-step strong {
    color: var(--hf-on-surface);
  }

  .arrow {
    color: var(--hf-primary);
    font: 700 0.9rem var(--f-n);
    opacity: 0.65;
  }

  .access-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .access-cell {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 94px;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    overflow: hidden;
  }

  .access-cell strong {
    font-family: var(--f-h);
  }
  .access-cell span {
    font-size: 0.8rem;
  }


  .chart-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .chart-group {
    min-width: 0;
    padding: 12px 12px 8px;
  }

  .chart-group__header {
    display: flex;
    min-height: 28px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 4px;
  }

  .chart-group__header strong {
    color: var(--hf-on-surface);
    font-size: 0.83rem;
  }

  .chart-group__header span {
    padding: 4px 8px;
    color: var(--hf-primary);
    background: rgba(96, 144, 160, 0.16);
    border-radius: 6px;
    font: 600 0.68rem var(--f-m);
    white-space: nowrap;
  }

  .metric-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    text-align: center;
  }

  .metric-row > div {
    display: grid;
    min-height: 110px;
    place-content: center;
    padding: 14px 10px;
  }

  .metric-row strong {
    font: 700 1.5rem/1 var(--f-h);
    font-variant-numeric: tabular-nums;
  }

  .metric-row span {
    margin: 5px 0 8px;
    color: var(--hf-on-muted);
    font: 0.72rem var(--f-m);
    letter-spacing: 0.04em;
  }

  .figure-note {
    width: fit-content;
    margin: 12px auto 0;
    padding: 6px 10px;
    background: var(--hf-container-high);
    border-radius: 6px;
    text-align: center;
  }

  .figure-note strong {
    color: var(--hf-primary);
    font-family: var(--f-m);
  }

  .dedup-summary {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 7px;
    margin-top: 2px;
    font-size: 0.86rem;
  }

  .dedup-summary strong {
    color: var(--hf-primary);
  }
  .dedup-summary span {
    color: var(--hf-on-muted);
  }


  @media (max-width: 700px) {
    .haku-figure {
      padding: 14px;
      border-radius: 0;
    }

    .release-flow {
      align-items: stretch;
      flex-direction: column;
    }

    .connector {
      align-self: center;
    }

    .connector::after {
      content: '↓';
    }
    .chart-columns {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .access-grid {
      grid-template-columns: 1fr 1fr;
    }
    .metric-row {
      grid-template-columns: 1fr;
    }
    .metric-row > div {
      min-height: 86px;
    }
    .trust-flow {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .arrow {
      display: none;
    }
  }

  @media (max-width: 420px) {
    .access-grid,
    .trust-flow {
      grid-template-columns: 1fr;
    }
    .segments {
      min-width: 0;
    }
  }
</style>

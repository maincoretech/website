---
title: Muspector Inspector第一阶段汇报
date: 2026-08-29
author: maincore
description: 用非对齐 Clean 参考识别吉他效果家族，并为未知设备保留退路
priority: 2
category: tech
---

只听一段处理后的吉他录音，能不能反推出它经过了哪些效果器？

这个问题很容易被一句“训练一个分类器”带过。真正落到产品里，模型要面对不同吉他、拾音器、演奏者、声卡和录音电平；Drive 的延音可能长得像 Reverb，多个效果还会同时出现。即使分类正确，效果顺序、旋钮位置和 Clean 音色复原仍是另外几类问题。

Muspector 选择先把边界划清：当前 Inspector 负责识别 **Drive、Delay、Reverb 家族**，并在结果只有 Drive 时尝试给出七种具体踏板名。它不推断效果顺序和精确旋钮，也还没有实现 Clean 音色复原与 Remixer。

本文对应 2026-08-29 的代码基线 `01a7adf`。当前版本适合非商业研究与架构验证；下一道门槛是完全没有参与训练、阈值选择和路线选择的设备独立测试集。

## 先拆开四种不同能力

<figure class="musp-figure" aria-label="Muspector 当前产品边界">
  <figcaption>一段湿吉他录音，并不直接通向完整效果链复原</figcaption>
  <div class="boundary-grid">
    <section class="boundary-card boundary-card--active">
      <span>当前主路径</span>
      <strong>家族识别</strong>
      <small>Drive · Delay · Reverb</small>
    </section>
    <section class="boundary-card boundary-card--research">
      <span>条件分支</span>
      <strong>踏板识别</strong>
      <small>仅孤立 Drive · 七类目录</small>
    </section>
    <section class="boundary-card">
      <span>尚未实现</span>
      <strong>顺序与旋钮</strong>
      <small>现有置信度不能解释为参数</small>
    </section>
    <section class="boundary-card">
      <span>独立模型边界</span>
      <strong>Remixer</strong>
      <small>Clean reconstruction · inverse effects</small>
    </section>
  </div>
</figure>

这四格看起来像一条路线，训练目标却完全不同。家族识别是多标签判断；具体踏板名还需要开放集拒绝；顺序与旋钮涉及组合和连续参数；Remixer 最终要用音频质量指标验证重建结果。把它们塞进一个“效果器 AI”标签，只会让准确率和产品能力混在一起。

## 两层识别链

Muspector 的第一层以用户导入的 Clean 参考为条件，识别效果家族；第二层完全独立，仅处理第一层留下的孤立 Drive。

<figure class="musp-figure" aria-label="Muspector Inspector 两层运行时架构">
  <figcaption>运行时先认家族，再决定是否尝试具体踏板名</figcaption>
  <div class="runtime-flow">
    <div class="flow-node flow-node--source"><strong>待检测音频</strong><span>Symphonia 流式解码</span></div>
    <div class="flow-arrow">→</div>
    <div class="flow-node"><strong>44.1 kHz · 5 s</strong><span>50% 重叠 · 128-bin log-Mel</span></div>
    <div class="flow-arrow">→</div>
    <div class="family-branches">
      <section><strong>Drive / Delay</strong><span>ResNet18 encoder</span><span>Clean-relative pair head</span></section>
      <section><strong>Reverb</strong><span>独立 ResNet18 encoder</span><span>pair head + temporal verifier</span></section>
    </div>
    <div class="flow-arrow">→</div>
    <div class="flow-node flow-node--result"><strong>家族结果</strong><span>可编辑 Signal Chain</span></div>
  </div>
  <div class="identity-path">
    <span class="identity-condition">仅 Drive，且没有 Delay / Reverb</span>
    <span class="identity-arrow">→</span>
    <span><strong>48 kHz AFx-Rep</strong> · 七类 head · knownness verifier</span>
    <span class="identity-arrow">→</span>
    <span><strong>具体名称</strong> 或退回通用 Drive</span>
  </div>
</figure>

`src/analysis.rs` 在一次流式解码里完成响度、频谱、时间线和模型窗口采样。推理运行在后台分析任务中，完成后才把结果送进可编辑的 Signal Chain。长音频无需整段常驻内存，模型只保留有限数量的候选窗口。

## Clean 参考解决的是域偏移

同一块效果器接在不同吉他和拾音器后面，频谱与动态可能比换一块踏板的变化还大。Muspector 让用户提供一段同一录音域的 Clean 参考，用它描述“这套设备原本是什么样子”。参考音频可以来自另一段演奏，不要求与待检测内容逐采样对齐。

家族识别分成 Drive/Delay 与 Reverb 两条支路。两边使用相同的前端规格，encoder 和 pair head 各自训练：

| 项目 | Drive / Delay | Reverb |
|---|---:|---:|
| 采样率与窗口 | 44.1 kHz，5 秒，50% 重叠 | 同左 |
| log-Mel 前端 | FFT 2048，hop 1024，128 bins，216 帧 | 同左 |
| ResNet18 encoder | 700,659 参数 | 700,659 参数 |
| Clean-relative pair head | 348,931 参数 | 348,931 参数 |
| Clean 使用量 | 第一个 5 秒窗口 | 前三个重叠窗口，共覆盖 10 秒 |
| 输出 | Drive、Delay | Reverb 候选 |

每个 query 有 259 维：256 维 embedding 加 3 个 blind logits。导入 Clean 时，运行时只执行冻结模型的前向推理，再把 query 的统计量写成 profile。

<figure class="musp-figure" aria-label="musp-training 文件内容">
  <figcaption>导入 Clean 会生成 profile，不会在用户电脑上更新模型权重</figcaption>
  <div class="profile-layout">
    <section class="profile-block">
      <span>Drive / Delay profile</span>
      <strong>518 × float32</strong>
      <small>259 维 mean + 259 维 deviation</small>
    </section>
    <section class="profile-block">
      <span>Reverb profile</span>
      <strong>518 × float32</strong>
      <small>259 维 mean + 259 维 deviation</small>
    </section>
    <section class="threshold-block">
      <span>路由阈值</span>
      <strong>Drive · Delay · Reverb</strong>
    </section>
  </div>
  <div class="profile-excludes">
    <span>不含源音频</span><span>不含 ONNX 权重</span><span>不含湿音频标签</span><span>梯度更新：0</span>
  </div>
</figure>

当前 `.musp-training` schema 为 4，保存名称、两套各 518 个 float 的 profile 和三个阈值，共 1,036 个 profile float。这个文件很小，也能跨机器导入；它更接近设备侧的统计摘要，和“拿用户音频再训练一轮”是两条不同路径。

## Reverb 需要第二道门

Drive 尤其是高增益 Fuzz 会拉长尾音。只看整体频谱和包络，模型可能把这种 sustain 当成混响。Muspector 为 Reverb 增加了一个 20,153 参数的时序 Conv1d verifier，观察 8×216 的 Mel 时序带和三个 pair 概率。

<figure class="musp-figure" aria-label="Reverb 双门控决策">
  <figcaption>Reverb 最终判断采用 AND gate</figcaption>
  <div class="gate-flow">
    <section><span>门 1</span><strong>Clean-relative pair</strong><small>达到 profile 派生阈值</small></section>
    <div class="gate-operator">AND</div>
    <section><span>门 2</span><strong>Temporal verifier</strong><small>固定阈值 ≥ 0.342</small></section>
    <div class="gate-arrow">→</div>
    <section class="gate-result"><span>输出</span><strong>Reverb</strong><small>任一失败即不激活</small></section>
  </div>
</figure>

Verifier 只负责否决“看起来像 Reverb”的延音和包络，不能脱离 pair 模型单独工作。已有 15 条硬件开发 fixture 在完整 Rust 路径上达到 15/15 exact，之前的四个 Reverb 误报全部消失。不过这些录音参与了 verifier 拟合，这个结果证明接线与回归正确，还不能代表新用户也会得到 15/15。

## 具体踏板名是一条开放集分支

当家族层只检测到 Drive，Muspector 才会启动具体踏板识别：音频重采样到 48 kHz，从高能量区域选最多三个 5 秒窗口，再交给冻结的 ST-ITO AFx-Rep Cnn14。

<figure class="musp-figure" aria-label="具体踏板识别结构">
  <figcaption>分类概率必须同时乘上 knownness，未知设备应退回通用 Drive</figcaption>
  <div class="identity-model">
    <section><strong>AFx-Rep Cnn14</strong><span>冻结 encoder · 512 维 embedding</span></section>
    <div class="identity-heads">
      <span><strong>512 → 128 → 7</strong><small>catalog softmax</small></span>
      <span><strong>512 → 64 → 1</strong><small>knownness sigmoid</small></span>
    </div>
    <section class="identity-score"><strong>softmax × knownness</strong><span>平均最多 3 个窗口 · 接收阈值 0.291</span></section>
  </div>
</figure>

当前目录包含 Blues Driver、RAT、Tube Screamer、Big Muff、Metal Muff、Fuzzy Logic 和 Silly Fuzz。完整 ONNX 约 323.8 MB，通过 `embedded-identity` feature 编译进非商业研究 release。

公共 grouped test 共 444 项，closed-set accuracy 与 correct-accept rate 都是 100%，公共负类 FAR 为 0。只看这三个满分很容易高估成熟度：七个具体类别的测试支持极不均衡。

<figure class="musp-figure" aria-label="七种踏板 grouped test support">
  <figcaption>具体踏板目录的 grouped test support</figcaption>
  <HorizontalBarChart
    items={[
      { label: 'Blues Driver', value: 85, display: '85' },
      { label: 'RAT', value: 71, display: '71' },
      { label: 'Tube Screamer', value: 64, display: '64' },
      { label: 'Big Muff', value: 1, display: '1' },
      { label: 'Metal Muff', value: 3, display: '3' },
      { label: 'Fuzzy Logic', value: 3, display: '3' },
      { label: 'Silly Fuzz', value: 3, display: '3' }
    ]}
    max={85}
    height="232px"
    labelWidth={104}
    valueWidth={30}
    alternate={false}
    ariaLabel="七种具体踏板 grouped test support 对比"
  />
</figure>

Big Muff 只有一个样本，三种小样本 Fuzz 各有三个，满分没有足够统计意义。硬件开发集也暴露出更接近真实使用的风险：RAT 只识别 1/2，非目录设备误接收 1/11，Darkside high gain 曾被接受为 RAT。Knownness verifier 给系统留了退路，但它本身同样需要未见设备来验收。

## 高分和泛化之间还差一套 final set

现有证据已经能支持架构选择和回归开发：

| 数据角色 | Drive F1 | Delay F1 | Reverb F1 | 结论边界 |
|---|---:|---:|---:|---|
| 内部路由测试 | 99.62% | 92.26% | 99.76% | 参与模型开发 |
| 当前硬件开发录音，verifier 后 | 96.30% | 66.67% | 100% | 参与阈值与 verifier 选择 |
| 公共 replay test，verifier 后 | 99.92% | 95.13% | 99.54% | 大样本公共域，不替代真实硬件域 |
| 设备/演奏者独立 locked final | — | — | — | 尚未建立 |

最大的缺口不是某一行分数不够高，而是最后一行还不存在。把同一录音切成几十个重叠窗口也无法补上它，因为吉他、设备、演奏者和 capture session 仍然相同。

六条 Clean 留一录音测试得到 0/6 误报，同样只能作为弱证据。当观测到零次错误时，粗略的单侧 95% “rule of three”上界约为 `3 / n`：

<figure class="musp-figure" aria-label="零错误样本量与误差率上界">
  <figcaption>0 次错误不等于真实错误率为 0</figcaption>
  <HorizontalBarChart
    items={[
      { label: '0 / 6', value: 50, display: '约 50%' },
      { label: '0 / 20', value: 15, display: '约 15%' },
      { label: '0 / 60', value: 5, display: '约 5%' },
      { label: '0 / 100', value: 3, display: '约 3%' }
    ]}
    max={50}
    height="154px"
    valueWidth={58}
    alternate={false}
    ariaLabel="零错误时不同独立样本量对应的误差率上界"
  />
</figure>

这里的 `n` 必须是尽量独立的录音或设备域。来自同一文件的窗口共享大量条件，不能当作独立样本累计。

## 下一轮数据要按 rig 和 session 锁定

最小快速盲测需要 3 套全新 rig、共 75 条；正式目标是 5 套 rig、每套 50 条，共 250 条。每套设备建议覆盖下面五类：

<figure class="musp-figure" aria-label="每套新 rig 的五十条采集计划">
  <figcaption>推荐 P0 采集包：每个全新 rig 共 50 条</figcaption>
  <div class="capture-strip">
    <section><strong>10</strong><span>Clean</span></section>
    <section><strong>10</strong><span>Drive</span></section>
    <section><strong>10</strong><span>Delay</span></section>
    <section><strong>10</strong><span>Reverb</span></section>
    <section><strong>10</strong><span>混合链与困难负例</span></section>
  </div>
  <p class="figure-note">5 rig × 50 条 = 250 条；至少 3 位演奏者，整套设备与 session 只进入同一个 split</p>
</figure>

数据 manifest 至少要记录 `rig_id`、`player_id`、`session_id`、Clean reference、设备或算法、设置、采样率、声道、文件哈希和 `locked-final` 角色。冻结 manifest 与哈希以后，只要有人根据 final set 修改权重、阈值、类别或路线，这份集合就自动降级为 development，下一次验收必须换一套未见数据。

最终门禁也不能只报总体 accuracy。家族层至少要同时给出逐类 precision、recall、F1、support、macro F1、exact match、Clean FP、95% 置信区间和按 rig 分域结果；具体踏板还要单独报告 closed-set 与未知设备 FAR。

## 用户端零训练，是当前架构的一部分

“是否应该让用户本地微调”不是当前阻塞项。冻结 encoder 加 profile 的方案已经把个体录音链适配压缩成一次快速导入：没有 Python、没有梯度、没有用户标签，也不用重复演奏同一段内容。Rust 运行时使用 `tract-onnx` 执行模型，并能在缺少具体踏板模型或 knownness 不足时安全退回家族结果。

未来可以增加个性化训练，但它适合作为可选层。直接替换现有路径会失去快速导入、跨平台可控和明确回退这三项产品性质。

## 许可证决定了当前 release 的边界

Muspector 源代码使用 Apache-2.0，模型权重是单独的制品，不会自动继承源码许可证。Drive/Delay、Reverb 与具体踏板模型也有不同来源和发布条件。

具体踏板 identity 的 AFx-Rep encoder 为 Apache-2.0，后续 catalog 与 knownness heads 使用了 ToneTwisT CC BY-NC 4.0 和 RemFX `cc-nc` 数据。因此，嵌入该模型的当前 rolling release 只适合带归属说明的非商业研究，不能据此承诺商业 build。商业化需要重新建立允许商业训练和权重分发的数据链，再完成训练、校准与独立验收。

## 现在真正缺的是什么

Muspector 暂时不需要更换模型框架。双分支 Clean-relative 路由、Reverb 时序 verifier 和开放集踏板分支已经形成清楚的职责划分，Rust 运行时也保留了安全回退。

下一步应先冻结现有模型和阈值，用全新设备、演奏者与 session 做盲测。结果失败，再把失败数据的副本降级成 development，针对问题训练；随后另建第二套 final set 验证修复。这样得到的数字可能没有内部测试漂亮，却真正回答了产品最重要的问题：换一把琴、一个效果器和一位用户以后，Inspector 还能不能认对。

参考实现见 <a href="https://github.com/shiftz300/muspector" target="_blank" rel="noopener noreferrer">Muspector</a>；本文对应的家族识别与踏板识别代码分别固定在 <a href="https://github.com/shiftz300/muspector/blob/01a7adf/src/blind.rs" target="_blank" rel="noopener noreferrer">blind.rs</a> 和 <a href="https://github.com/shiftz300/muspector/blob/01a7adf/src/identity.rs" target="_blank" rel="noopener noreferrer">identity.rs</a>。

<style>
  .musp-figure {
    --mf-primary: #6090a0;
    --mf-accent: #a9617b;
    --mf-on-surface: #334755;
    --mf-on-muted: #506473;
    --mf-surface: rgba(215, 228, 235, 0.72);
    --mf-container: rgba(185, 210, 222, 0.52);
    --mf-container-high: rgba(200, 218, 228, 0.76);
    margin: 24px 0;
    padding: 18px;
    overflow: hidden;
    color: var(--mf-on-surface);
    background: var(--mf-surface);
    border-radius: 0;
  }

  .musp-figure figcaption {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    color: var(--mf-on-surface);
    font:
      600 1rem/1.35 'Roboto Condensed',
      'PingFang SC',
      'Hiragino Sans GB',
      sans-serif;
    letter-spacing: 0.015em;
  }

  .musp-figure figcaption::before {
    width: 4px;
    height: 22px;
    flex: 0 0 auto;
    content: '';
    background: var(--mf-primary);
  }

  .boundary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .boundary-card,
  .flow-node,
  .family-branches section,
  .profile-block,
  .threshold-block,
  .gate-flow section,
  .identity-model > section,
  .identity-heads span,
  .capture-strip section {
    background: var(--mf-container);
    border-radius: 6px;
  }

  .boundary-card {
    display: flex;
    min-height: 104px;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
    padding: 14px;
  }

  .boundary-card span,
  .profile-block span,
  .threshold-block span,
  .gate-flow section > span {
    color: var(--mf-primary);
    font: 600 0.68rem var(--f-m);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .boundary-card strong {
    font: 700 1.12rem var(--f-h);
  }

  .boundary-card small,
  .flow-node span,
  .family-branches span,
  .profile-block small,
  .gate-flow small,
  .identity-model span,
  .identity-heads small {
    color: var(--mf-on-muted);
    font-size: 0.74rem;
    line-height: 1.35;
  }

  .boundary-card--active {
    background: rgba(96, 144, 160, 0.2);
  }

  .boundary-card--research {
    background: rgba(169, 97, 123, 0.12);
  }

  .runtime-flow {
    display: grid;
    grid-template-columns:
      minmax(0, 0.9fr) 22px minmax(0, 0.9fr) 22px minmax(0, 1.55fr) 22px
      minmax(0, 0.9fr);
    align-items: stretch;
    gap: 8px;
  }

  .runtime-flow > * {
    min-width: 0;
  }

  .flow-node {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 12px;
    overflow-wrap: anywhere;
    text-align: center;
  }

  .flow-node--source,
  .flow-node--result {
    background: rgba(96, 144, 160, 0.2);
  }

  .flow-arrow,
  .gate-arrow,
  .identity-arrow {
    display: grid;
    place-items: center;
    color: var(--mf-primary);
    font-weight: 700;
  }

  .family-branches {
    display: grid;
    min-width: 0;
    gap: 8px;
  }

  .family-branches section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 8px;
    align-items: center;
    padding: 10px 12px;
  }

  .family-branches strong {
    grid-row: span 2;
    color: var(--mf-primary);
    font-family: var(--f-h);
  }

  .identity-path {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
    padding: 9px 12px;
    background: rgba(169, 97, 123, 0.1);
    border-radius: 6px;
    font-size: 0.75rem;
    text-align: center;
  }

  .identity-condition {
    color: var(--mf-accent);
    font-weight: 700;
  }

  .profile-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .profile-block,
  .threshold-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
  }

  .profile-block strong,
  .threshold-block strong {
    color: var(--mf-on-surface);
    font: 700 1rem var(--f-m);
  }

  .threshold-block {
    grid-column: 1 / -1;
    align-items: center;
    background: var(--mf-container-high);
  }

  .profile-excludes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 7px;
    margin-top: 10px;
  }

  .profile-excludes span {
    padding: 5px 8px;
    color: var(--mf-on-muted);
    background: rgba(96, 144, 160, 0.1);
    border-radius: 4px;
    font-size: 0.7rem;
  }

  .gate-flow {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 9px;
    align-items: stretch;
  }

  .gate-flow section {
    display: flex;
    min-height: 88px;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 12px;
    text-align: center;
  }

  .gate-operator {
    display: grid;
    place-items: center;
    color: var(--mf-accent);
    font: 700 0.8rem var(--f-m);
  }

  .gate-result {
    background: rgba(96, 144, 160, 0.2) !important;
  }

  .identity-model {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 10px;
    align-items: stretch;
  }

  .identity-model > section,
  .identity-heads span {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 12px;
    text-align: center;
  }

  .identity-heads {
    display: grid;
    gap: 8px;
  }

  .identity-heads strong,
  .identity-score strong {
    color: var(--mf-primary);
    font-family: var(--f-m);
  }

  .identity-score {
    background: rgba(169, 97, 123, 0.12) !important;
  }

  .capture-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .capture-strip section {
    display: flex;
    min-height: 82px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 10px 6px;
    text-align: center;
  }

  .capture-strip strong {
    color: var(--mf-primary);
    font: 700 1.4rem var(--f-h);
  }

  .capture-strip span {
    color: var(--mf-on-muted);
    font-size: 0.7rem;
    line-height: 1.25;
  }

  .figure-note {
    width: fit-content;
    margin: 12px auto 0;
    padding: 6px 10px;
    color: var(--mf-on-muted);
    background: var(--mf-container-high);
    border-radius: 6px;
    font-size: 0.74rem;
    text-align: center;
  }

  @media (max-width: 800px) {
    .boundary-grid {
      grid-template-columns: 1fr 1fr;
    }

    .runtime-flow {
      grid-template-columns: 1fr;
    }

    .flow-node {
      min-height: 84px;
    }

    .flow-arrow {
      transform: rotate(90deg);
    }

    .identity-path {
      align-items: stretch;
      flex-direction: column;
    }

    .identity-arrow {
      transform: rotate(90deg);
    }

    .identity-model {
      grid-template-columns: 1fr;
    }

    .capture-strip {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .musp-figure {
      padding: 14px;
    }

    .boundary-grid,
    .profile-layout,
    .family-branches,
    .capture-strip {
      grid-template-columns: 1fr;
    }

    .family-branches section {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .family-branches strong {
      grid-row: auto;
    }

    .gate-flow {
      grid-template-columns: 1fr;
    }

    .gate-operator,
    .gate-arrow {
      min-height: 20px;
    }

    .gate-arrow {
      transform: rotate(90deg);
    }

    .threshold-block {
      grid-column: auto;
    }
  }
</style>

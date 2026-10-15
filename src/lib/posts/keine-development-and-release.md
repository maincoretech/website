---
title: Kēne 开发与发布指南
date: 2026-10-08
author: maincore
description: 给后续维护者的上手指南：模块职责、开发验收、试玩导出、正式游戏打包与当前 CI 边界
priority: 3
category: tech
---

这篇文章面向接手 Kēne 的开发者，也解释游戏作者如何从工程得到可运行的发行包。语言本身的写法见 [Eiyashou v2.0 参考](/blog/eiyashou)。

本文对应 **Kēne 0.13.1、Eiyashou 2.0，截至 2026-10-08 的本地实现**。源码链接固定到已提交基线 `5ecdcc8c6ec5660784c76a212b9886befedd15b7`；尚未提交的 Android 工作单独标注为实验，不代表已发布。维护者要做的检查不等于系统已经自动完成，workflow 配置也不等于某次构建、上传或真机验收已经成功。

## 先选对流程

| 目的             | 入口                                                 | 结果                                 | 是否使用发行密钥   |
| ---------------- | ---------------------------------------------------- | ------------------------------------ | ------------------ |
| 写故事、调试演出 | Editor + Preview，或 `keine dev`                     | 本机开发运行                         | 否                 |
| 发给别人临时试玩 | Editor 的 Build → Export game…                       | 当前平台的独立试玩副本，保留可读剧本 | 否                 |
| 正式发行游戏     | `cargo bundle` / 游戏仓库的 Project release workflow | 专用 release Engine + 加密资源包     | 是，使用稳定身份   |
| 分发开发工具     | 构建 Editor / 开发 Engine，再组装平台包              | 创作用的 Editor 与 Engine            | 不需要游戏发行密钥 |

临时试玩导出复用当前安装的开发 Engine。安装的是 debug Engine，导出的也是它；Build view 不会自动编译 release。正式 `bundle` 则会重新编译专用 release Engine，不能用试玩目录代替。

实现入口：[Editor Build](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/crates/editor/src/workspace/build.rs)、[publisher](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/src/publisher.rs)。

## 接手时先看什么

先检查当前分支和未提交改动，再决定在哪里工作：

```sh
git branch --show-current
git worktree list
git status --short
git diff
```

不要覆盖作者未保存的工程，也不要通过 reset、clean 或重新迁移清掉当前修改。贡献通常使用独立分支；共享文件由集成维护者统一合入。涉及已有工作区时，先确认改动的所有者和范围。

阅读顺序是根目录 `AGENTS.md`，然后 `dev/docs/architecture.md`、`testing.md`，最后对应功能指南：剧本看 `language.md`，Editor 看 `editor.md`，打包看 `release.md`，兼容输入看 `compatibility.md`。

Kēne 的目标是独立、够用的视觉小说引擎。LetsGal 是迁移输入和创作能力的参考；不要求复制它的全部功能。WebGAL 适配已冻结，只维护安全与明确回归，不增加新语义。

## 模块应该改在哪里

```text
crates/core       类型、Program / State、表达式与确定性执行
crates/loader     内容挂载、脚本与资源适配、编译格式、诊断
crates/authoring  Editor–Engine 协议
crates/editor     GPUI 工作台、Text / Blocks / Inspector、项目操作
crates/media      有界 WebP 解码
src/runtime       宿主、输入、执行驱动、Preview、启动
src/scene         图片、立绘、音视频与演出状态
src/render        渲染管线
src/ui            内建游戏 UI
src/storage       存档与独立用户数据
src/migration     publisher 功能下的迁移与重映射
dev               当前文档与构建脚本
tests             回归工程、集成测试、bench、fuzz、视频验收
```

Loader 依赖 Core，Engine 依赖 Loader / Core；Core、Loader 和 authoring 协议保持 Bevy-free。Runtime 消费 typed Program / State，不再解析 Editor 的表现数据。Editor 的显示、选择和特殊控件留在 Editor。

新增语言能力通常先定义 Core 语义，再实现 Loader 解析、诊断，最后接入 Runtime 和 Editor。命令参数表由 Loader 提供，Inspector 与补全复用它，避免另写一套不一致的参数定义。

需要持续保持的合同：

- 1920×1080 设计空间与 viewport 转换只有一个 owner，场景、UI、对话的合成关系不能随意变化。
- 内容通过有序只读挂载读取，路径不能逃逸挂载根。
- Save v11 要求 Program fingerprint 匹配；profile、history、gallery、settings 不随 slot 回滚。
- 当前编译 Program envelope 为 v1、IR schema 为 v7，authoring 协议为 v9；旧 IR 必须重新编译，不能仅修改版本号。
- 正常窗口的尺寸、位置、DPI 与最大化状态独立保存在 `saves/window.bin`，启动时适配当前显示器，不参与 slot 回滚；全屏尺寸不能覆盖正常窗口记录。
- 正式游戏数据写入稳定 `project.id` 对应的平台用户目录，不能写进只读发行目录。
- 新 feature、编译 IR、协议或持久化格式变动必须核对对应版本与拒绝路径；引擎版本、EYS 版本和存档版本不必一起递增。

完整合同见 [架构指南](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/docs/architecture.md)。

## 本机开发：先启动一套匹配的 Editor 和 Engine

仓库固定 Rust **1.97.1**，Rust edition 为 2024，Bevy 为 **0.19.1**；rustup 会按 `rust-toolchain.toml` 选择工具链。默认工具链组件包含 rustfmt 与 Clippy。系统还需要对应平台的 C/C++ 编译工具和 SDK。

| 平台    | 当前需要注意的依赖                                                                         |
| ------- | ------------------------------------------------------------------------------------------ |
| macOS   | Xcode Command Line Tools / 系统 SDK；原生视频使用 AVFoundation                             |
| Linux   | ALSA、udev、Fontconfig、XKB 开发库与 pkg-config；Engine 当前使用 X11，可通过 XWayland 运行 |
| Windows | MSVC 工具链；启用 FFmpeg 视频时需要相应 SDK 和运行时 DLL，CI 使用 vcpkg                    |

Linux 与 Windows 的具体 CI 安装配置以 [setup-video action](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/actions/setup-video/action.yml) 为准。`video-ffmpeg` 需要 FFmpeg 开发库；Editor 导入音视频使用的 FFmpeg 可执行程序是另一项需求，不能互相替代。

Linux 编译 Vulkan 与原生 OpenGL/GLES，Windows 编译 DX12、Vulkan 与原生 OpenGL；可用性取决于驱动、features 与 limits，不保证所有旧显卡能运行。现有局部 Bevy vendor patch 保留上游许可，用于窗口循环和原生 display handle；不要在升级时无意覆盖。构建包含 backend、启动出现窗口与真实画面/输入验收是独立关卡。

下面命令都在 **Kēne 仓库根目录**执行。以 macOS 为例：

```sh
cargo build --locked -p keine --bin keine --features hot-reload,video-native
cargo build --locked -p keine-editor --bin editor
KEINE_ENGINE="$PWD/target/debug/keine" target/debug/editor tests/fixtures/native-smoke
```

Editor 只启动预构建 Engine，不在编辑交互里运行 Cargo。`KEINE_ENGINE` 指定要使用的二进制，可避免误用 PATH 或旧 app 中的版本。改了 Engine 后，要构建新二进制并重启 Preview；改了 Editor 后，要重新启动 Editor。不要把旧进程的现象当成新构建的结果。

macOS 不需要视频时可省略 `video-native`；Linux / Windows 需要视频时使用 `video-ffmpeg` 并准备 SDK。开发中的常见快捷入口是 `cargo editor <project>`、`cargo validate <project>` 和 `cargo dev <project>`。

其中 `cargo dev` alias 同时开启两个视频 feature，可能要求本机具备 FFmpeg SDK。macOS 只用原生视频时，可以显式运行：

```sh
cargo run --locked -p keine --bin keine --features hot-reload,video-native -- dev tests/fixtures/native-smoke
```

`tests/fixtures/native-smoke` 是最小回归工程，`tests/fixtures/native-benchmark` 提供真实负载；仓库也已包含 `projects/tday` 试玩作品及其 shiftz 素材版权说明。测试自有作品时，另行准备作者工程，并保持其原始来源只读。

## 作者工程、资源和迁移的实际模型

原生工程的核心文件是 `config.yaml`、`assets.yaml`、`characters.yaml`，以及 `scripts/**/*.shou`。`objects.yaml` 按工程需要使用。场景 ID 在整个工程内唯一，执行入口由 `script.entry` 指定；章节之间通过脚本控制流连接，不按文件名顺序播放。

Text、Blocks 与 Inspector 修改同一个源文档。保存会格式化，并检查外部冲突；中文等 IME 组合输入确认后，才发布相关分析结果。测试编辑功能时必须覆盖“输入 → 保存 → 关闭 → 重开”，仅看到一次屏幕变化不算持久化成功。

Characters 保存姓名、颜色与头像/表情预设，Assets 管理真实清单；预设不会隐式重写剧本或自动纳入发行白名单。Blocks 的插入与重排最终写回源文档，Inspector 修改也必须保留作者语义。关闭有修改的工程时应选择 Cancel、Save and Close 或 Discard；保存失败不能移除窗口或丢失修改。

`assets.yaml` 是资源 ID、类型、路径与 tags 的来源。导入时读取原文件，在选定目录生成规范格式文件，再登记清单；不在播放时临时转码。图片背景采用 Q80 WebP，立绘与粒子纹理使用无损 WebP；独立音频采用 Ogg Opus。存量素材需要显式执行 Assets 的 Convert all。格式状态由文件内容检查，不以扩展名冒充。

迁移使用：

```sh
cargo migrate /path/to/source-project /path/to/new-native-project
cargo validate /path/to/new-native-project
```

目标必须尚不存在、位于源目录外，并有已经存在的父目录。迁移只读源工程，在临时目录生成并验证后才安装目标；已打包工程和已经原生使用 Eiyashou 的工程会被拒绝。它不是就地 v1→v2 升级器，也不是覆盖当前作者工程的更新方式。资源复制不转码；解析和引用校验通过后，仍需实际检查章节接续、分支、镜头、文字、BGM / SE / 语音与自动播放。未知或无法完全还原的演出差异要明确报告，详细换算与新语法见 [Eiyashou 参考](/blog/eiyashou)。

资源估算卡显示的只是登记资源大小，不能当作最终包体：Engine、编译剧本、索引、封装和第三方运行库另有开销。未引用资源也可能仍在登记集合中；删除前检查引用和作者意图。

## 每次改动怎样验收

基础门禁：

```sh
cargo fmt --all -- --check
cargo check --locked --workspace
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
cargo validate tests/fixtures/native-smoke
```

涉及 publisher、迁移、资源或媒体时，再运行相关配置；下面是 macOS 常用的一组：

```sh
cargo check --locked --workspace --features publisher,video-native,hot-reload
cargo test --locked --workspace --features publisher
cargo test --locked -p keine --no-default-features --features video-native scene::video::
```

FFmpeg 路径改动需要 SDK，并检查 `video-ffmpeg`；不要只测试默认 feature。`cargo-deny --all-features` 检查依赖图，不能代替这些配置的编译与运行。

本地 macOS 沙箱可能阻断 Unix socket，报 `Operation not permitted` 或 `PermissionDenied`。此时在允许 IPC 的执行环境重跑同一测试，不能跳过测试，也不能直接归为代码回归。废纸篓与平台 API 测试同样需要对应系统权限。

| 改动类别        | 必须补看的真实行为                                                         |
| --------------- | -------------------------------------------------------------------------- |
| 编辑输入 / 文档 | 中文 IME 组合与提交、光标、撤销、保存、关闭重开、外部冲突                  |
| UI / 拖放       | 实际窗口尺寸、嵌套与多选、取消、失焦、菜单层级与点击区域                   |
| 运行语义        | 分支、调用与返回、章节接续、自动/手动继续、seek / 回滚                     |
| 音视频          | 真正播放、循环接缝、切换、暂停/恢复、EOF、损坏输入与加密包                 |
| 打包            | 从发行目录独立启动、动态库完整、用户数据位置、更新与许可文件               |
| 性能            | 同机器、同输入、同 release 配置的前后数据，记录 CPU / RSS / 帧时与异常操作 |

性能结论需要原始命令与日志。关注 p99、最大帧时和超出屏幕刷新预算的帧数，平均 FPS 不能证明不掉帧。窗口切换与真实负载停顿分别标记。使用现有 bench、`cargo perf` 与 benchmark 包，不为一次验收增加 GUI 截图接口或新的框架。

独立性能包已提供真实负载与采样入口，但跨平台硬件性能、多显示器和 Windows / Linux 原生 GUI 与完整剧情仍需独立验收。macOS 的已有目测不能外推到其他平台。运行、包装、正式签名/公证分别记录证据。

## 依赖与许可也是开发门禁

当前 CI 固定 cargo-deny **0.20.2**。需要本地工具时：

```sh
cargo install cargo-deny --version 0.20.2 --locked
cargo deny --locked --all-features check advisories licenses bans sources
```

未知许可、未知 registry / Git 来源和未固定 revision 的 Git 依赖会被拒绝；上游重复版本与现有路径依赖的通配声明保留警告。DL1 用 `license-file` 和明确文件哈希识别，不能因为正文相似就当成 Apache。

升级依赖要检查直接与传递依赖、Cargo.lock 的实际变化、原生库和资产许可，再验证受影响 feature。不要靠宽泛 ignore、忽略私有 crate 或扩大 allowlist 消掉问题。现有 Bevy 窗口补丁和 Hakutaku 都固定 Git revision；替换它们时要复核修复目的及回归。

Kēne 原创代码和文档采用 DL1，贡献默认使用相同条款；第三方代码、字体和游戏素材保留各自许可。具体使用条件以仓库 `LICENSE` 和 [Defold License 1.0 原文](https://defold.com/license/) 为准。

`NOTICE` 只是一份概览。正式发行时，维护者仍要补齐实际依赖的完整版权与许可文本，满足 MPL 的源码获取及修改源码义务，核对所分发 FFmpeg / codec 的实际许可。cargo-deny 检查声明，不证明整个安装包已经满足所有发行义务。字体来源和历史许可文本的验证边界见仓库 [发布指南](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/docs/release.md)。

## 临时试玩：Editor 的 Build view

在 Editor 侧栏打开 Build，点击 **Export game…**，选择工程外的父目录。它生成新的 `<工程名>-playtest` 文件夹；重名时追加数字，成功后可 Play 或 Open folder。

导出前保存并格式化文档，校验源工程；复制后再次校验导出副本。它包含登记资源、全部原生剧本和相应配置/清单，不带原格式副本、未登记素材、用户存档、缓存或私钥。macOS 生成 `Game.app`，Windows / Linux 生成本机 executable。

当前只支持原生 Eiyashou 工程、本地资源与当前平台。无需生成 publisher key，也不会做正式 Hakutaku 加密打包。试玩副本包含可读源码，适合内部测试；对外正式发行继续走下一节。

## 正式游戏发行：bundle 做了什么

先把正式副本中的独立图片与音频规范化为 WebP / Ogg Opus，再验证。开发阶段能播放 PNG、WAV 等格式，不代表发行打包接受它们；`bundle` 不替你转换所有存量资源。

```sh
cargo validate /path/to/game
cargo bundle /path/to/game --output target/bundle/my-game
```

打包器依次完成：

1. 建立临时工程副本，验证配置、稳定 `project.id`、媒体、引用与路径。
2. 编译 typed Program，形成只包含发行所需文件的 payload；原生源剧本不随正式包分发。
3. 在内容检查成功后，加载或首次生成 publisher identity。
4. 推导客户端所需公钥和密钥拆分材料，重新构建 `--release --locked --no-default-features` 的 hardened Engine。
5. 根据内容选择生产 feature：通常为 `ui-sounds`，需要视频时 macOS 加 `video-native`，其他平台加 `video-ffmpeg`；不带 publisher 和 hot-reload。
6. 生成 Hakutaku 快照与数据段，组装 executable、必要的运行库与许可文件，再发布输出目录。构建失败保留既有正式输出。

当前 release profile 开启 LTO、strip、单 codegen unit 与 panic abort。不同于普通 release 构建，`bundle` 的客户端还与本次游戏 identity 配套；不能拿普通 `cargo build --release` 生成的 Engine 随意替换它。

```text
my-game/
├── keine 或 keine.exe
├── game.haku
├── data/
│   └── *.taku
├── LICENSE
├── NOTICE
├── FONT-LICENSES.txt
└── 平台需要的运行库
```

仅需资源包时使用 `cargo pack <project>`；它不生成完整可运行游戏，也不能代替 `bundle`。publisher runner 与客户端构建目录分开，避免 Windows 在运行中的 executable 被子构建替换。

### 三种身份不要混淆

| 项                          | 用途                     | 谁保管 / 放在哪里                            |
| --------------------------- | ------------------------ | -------------------------------------------- |
| `project.id`                | 稳定定位游戏用户数据     | 作者设定，维护者保持更新时不变               |
| `.keine/publisher.key`      | 内容签名私钥与内容根密钥 | 作者 / 发行维护者私下备份，CI 用 secret 恢复 |
| Apple 证书与 notary profile | macOS 应用签名、公证     | 发行机器 Keychain，不放进工程或聊天          |

publisher key 首次有效打包时生成，后续自动复用；也可通过 `KEINE_HAKUTAKU_IDENTITY` 指定工程外的安全路径。**游戏更新继续使用同一个 key 和 project.id。** Base64 只是编码，不是加密，身份文件和编码结果都属于秘密材料。

客户端含验签公钥与解密所需的拆分材料，不含签名私钥；离线客户端必须能解密，因此不承诺防止逆向提取。每次构建拆分材料变化不等于换了一把发行密钥。

同一身份下，打包器可从既有输出复用不可变数据段；不要把这种包级复用当成已经实现网络更新器。轮换身份时，使用新输出目录完整构建，并分发配套 Engine 与资源。更新剧本会改变 fingerprint，旧 slot 不能保证继续加载；profile 等独立用户数据不随 slot 回滚。

### macOS 游戏 app

原生工程显式提供 app 名与 reverse-DNS bundle identifier：

```sh
bash dev/scripts/bundle-macos.sh /path/to/game "My Game" com.example.my-game
```

该脚本自行调用 `cargo bundle`，生成 `target/bundle/macos/My Game.app`。`game.haku`、`data/` 与许可文件在 `Contents/Resources`，executable 在 `Contents/MacOS`。无需先手工调用一次 bundle。

默认是 ad hoc 开发签名。正式分发时，先在本机 Keychain 准备带私钥的 Developer ID Application 证书，并用 `xcrun notarytool store-credentials <profile>` 保存公证凭据，然后配置：

```sh
export KEINE_CODESIGN_IDENTITY="Developer ID Application: <name> (<team>)"
export KEINE_NOTARY_PROFILE="<profile>"
bash dev/scripts/bundle-macos.sh /path/to/game "My Game" com.example.my-game
```

两项都设置时，脚本进行 hardened runtime 签名、提交公证、staple / validate ticket 和 Gatekeeper 检查；只有证书时只签名。ad hoc 验证通过不等于正式分发通过。脚本依据见 [sign-macos.sh](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/scripts/sign-macos.sh)，平台要求见 [Apple 公证文档](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)。

## 当前 CI 与 Release 自动化

| Workflow              | 触发方式                      | 结果                                                     |
| --------------------- | ----------------------------- | -------------------------------------------------------- |
| `ci.yml`              | push / pull_request           | 依赖门禁、Linux / macOS / Windows 构建与相应测试         |
| `release.yml`         | main 的 CI 成功后自动，或手动 | 自动更新 `benchmark-latest`；手动可选 benchmark 或 tday  |
| `editor-release.yml`  | main 的 CI 成功后自动，或手动 | 更新 `editor-latest`，提供同版本 Editor + Preview Engine |
| `project-release.yml` | 其他游戏仓库 workflow_call    | 从固定 Kēne SHA 构建 Linux x64 正式游戏包，上传 artifact |

三个滚动渠道是互不覆盖的预发布，不是普通版本标签发布：

- `benchmark-latest`：使用 profiling 优化与符号，默认 `native-benchmark` 真实负载，附报告与系统采样工具。
- `editor-latest`：release 优化的创作工具，不含游戏素材。macOS 当前是 arm64 的单个 `Kēne Editor.app`，内置 Engine；Linux / Windows 为 x64 的相邻 executable 与运行库，须完整解压。
- `tday-latest`：仅手动，在 Actions → Release → Run workflow 选择 `package=tday`；包含 shiftz 素材版权说明，不因普通推送或 CI 自动打包。

`release.yml` 现在只有 `package: benchmark / tday` 选择，默认 benchmark；测试游戏每个平台使用隔离临时 identity，不读取正式发行密钥。正式游戏更新仍走稳定 identity 的 CLI 或 Project CI，不给测试渠道填正式密钥。

自动流程只发布本仓库 main push 通过 CI 的准确 SHA，PR / fork / 失败结果不发布；发现更新的 main 时，旧自动构建只保留 artifact，不覆盖下载标签。三个平台全部成功并生成 ZIP 后才发布，标签或附件更新失败也算发布失败。Actions artifact 保留 14 天；上传 artifact、移动 tag 与更新 Release 附件须分别确认。macOS 开发包未做正式 Apple 公证，Intel Mac 不在当前自动包覆盖范围。

benchmark 是可运行的性能定位包，不是在 CI GPU 上完成性能验收。缺少必测时间轴会返回 INCOMPLETE 并保留报告；额外调用栈采样需要 Python 3 与平台工具，直接运行负载不需要 Python。CI 也不替你试听音频或检查 Editor 布局。配置依据：[CI](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/ci.yml)、[Release](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/release.yml)、[Editor Release](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/editor-release.yml)。

游戏 Cargo 缓存在保存前清理含密钥的 Engine / Loader 构建产物；清理失败阻止保存和发布。Editor 缓存单独放在 `target/authoring`，不启用 publisher / hardened，也不接收 identity。

### 独立游戏仓库的 CI

将游戏工程放在自己的仓库，不把私钥放进去。在仓库 Actions secrets 中保存稳定身份的 Base64，名称为 `HAKUTAKU_IDENTITY_BASE64`。下面示例固定到本文基线提交；升级 Engine 时换成实际审查过的完整 SHA：

```yaml
name: Game release
on:
  workflow_dispatch:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  release:
    uses: maincoretech/keine/.github/workflows/project-release.yml@5ecdcc8c6ec5660784c76a212b9886befedd15b7
    with:
      project-path: .
      artifact-name: my-game-linux-x64
      retention-days: 14
    secrets:
      HAKUTAKU_IDENTITY_BASE64: ${{ secrets.HAKUTAKU_IDENTITY_BASE64 }}
```

这里的 tag 触发器属于**游戏仓库自己写的 workflow**，不表示 Kēne 仓库有相同配置。调用位置是 job 的 `uses`，不是 step；GitHub 的基本语法见 [复用 workflow 文档](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)。Kēne 进一步要求 40 位 SHA，branch、tag 和短 SHA 会被拒绝；workflow 与 Engine checkout 使用同一提交。

该工作流目前只生成 Linux x64 包，不替代 macOS / Windows 发行。身份只在 runner 临时目录恢复，始终清理后再上传；缓存不包含游戏 checkout、成品发行包或身份。输出附 `KEINE-PROVENANCE.txt`，记录游戏 SHA、Engine SHA、工具链、features 与 workflow run，方便追溯。它上传的是 Actions artifact，不会自动给游戏创建 GitHub Release。

## 维护者怎样发布一个引擎版本

下面是维护者需要完成的操作，不能假定当前 workflow 已自动执行：

1. 确定发行提交与变更范围，更新 workspace 版本、Cargo.lock 中本地包版本以及 README 的当前版本。EYS、IR、协议和存档版本按各自实际格式变更处理。
2. 跑本机门禁与受影响 features，推送后核对该 SHA 的平台 CI；保留失败原因和未验收项，不能拿前一次绿色结果替代。
3. 从同一提交构建 Editor 与开发 Engine，组装创作工具；按目标平台检查独立安装、Engine discovery 和运行库。游戏 bundle 是另一条流程。
4. 做对应平台的原生验收与许可检查；macOS 正式分发时完成签名、公证和解压后启动。
5. 准备版本说明，明确支持、变更和剩余限制；核对自动滚动渠道的准确 SHA 与附件。正式版本标签与 Release 仍由维护者审查操作，不能把 `editor-latest` 等预发布当成稳定版本发行。
6. 记录发行 SHA、平台、features、artifact 来源、签名状态和验收结果；不要记录私钥或内容根密钥。网站文章说明功能与流程，具体状态继续保存在对应仓库指南里。

macOS 创作工具的现有组装命令：

```sh
cargo build --release --locked -p keine-editor --bin editor
cargo build --release --locked -p keine --bin keine --no-default-features --features audio-all,ui-sounds,hot-reload,video-native
bash dev/scripts/package-authoring-macos.sh target/release/editor target/release/keine /path/to/fresh-output
```

输出目录必须不存在。结果是单个 `Kēne Editor.app`，同版本 Engine 位于 `Contents/MacOS/keine`；签名方式复用前面的环境变量。自动跨平台包装使用 `dev/scripts/package-authoring.py`，检查安装后的运行库与 native-smoke 并记录 provenance。当前包不附带 FFmpeg 转换 executable，导入非规范音视频需要另装；附带的播放库不能代替转换工具。

Windows / Linux 已有完整解压使用的 Editor ZIP，但不是安装器；打包成功也不等于独立机器上的完整运行验收。

## Android：当前本地实验边界

本地工作区正在接入独立 ARM64 Engine，使用 Android NativeActivity、横屏与 Vulkan，目标 Android 8 / API 26 起；此部分尚未提交，不属于上述桌面下载承诺。当前不支持视频、Editor、publisher 或桌面文件选择器；Core、Loader 与 Save 格式继续共用。

实验构建入口为 `dev/scripts/build-android.sh`，依赖 SDK / NDK、JDK、Gradle 与 cargo-ndk，产出 debug 签名测试 APK，不是正式游戏安装包。APK 只含引擎，测试工程从 Activity 私有 `files/game/` 读取，独立用户数据放在 `files/userdata/<project.id>/`。Hakutaku 游戏打包、正式签名、安装/更新与手机触摸、输入法、音频和 GPU 真机验收均不可视为完成；具体步骤以本地 `dev/docs/android.md` 为准。

## 谁负责什么

| 角色       | 要做的事                                                                                        | 完成标准                                       |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 游戏作者   | 准备稳定 project.id、内容与资源授权；转换素材；完整剧情、分支与视听验收；私下备份 publisher key | 作者确认作品内容，正式工程校验通过，密钥可恢复 |
| 功能开发者 | 修改正确的 owner，补必要回归，验证相关 feature 与交互，解释接口/格式变化                        | 可审查的 diff、测试结果和明确的未测项          |
| 集成维护者 | 维护 shared 文件、依赖、文档、版本；核对提交与 CI，集成贡献                                     | 没有覆盖无关修改，结果对应准确 SHA             |
| 发行维护者 | 构建、完整第三方许可、平台库、签名/公证、安装与更新检查；分发配套 Engine 和资源                 | 真正安装运行通过、无私有身份、来源与限制可追溯 |

作者不需要每次手动拆分运行时密钥，也不用为正常游戏更新改变发行流程。开发者需要保证这些步骤持续有效，并在实现边界变化时更新文档。编译成功、单元测试通过、目测通过、正式发行通过，是四种不同证据。

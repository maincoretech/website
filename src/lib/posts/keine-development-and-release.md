---
title: Kēne 开发与发布指南
date: 2026-10-08
author: maincore
description: 从本机预览到发给别人试玩，再到签名打包和正式发行
priority: 3
category: tech
titleEn: "Kēne Development and Release Guide"
descriptionEn: "From local previews and playtest builds to signing, packaging, and releasing a game with Kēne."
---

在自己的电脑上能跑、发给朋友能玩、正式发一个可更新的版本，是三件不同的事。先想清楚你这次要交付哪一种，再选下面的流程。 [Eiyashou v2.0 参考](/blog/eiyashou)

这篇按 **2026-10-08 的 Kēne 0.13.1 / Eiyashou 2.0** 写，源码固定在 `5ecdcc8c6ec5660784c76a212b9886befedd15b7`。Android 部分是当时还在本地做的实验。文中整理的是那一版的操作流程，实际构建和设备验收要分别看结果。

## 先确定这次要交付什么

| 目的             | 入口                                                 | 结果                                 | 是否使用发行密钥   |
| ---------------- | ---------------------------------------------------- | ------------------------------------ | ------------------ |
| 写故事、调试演出 | Editor + Preview，或 `keine dev`                     | 本机开发运行                         | 否                 |
| 发给别人临时试玩 | Editor 的 Build → Export game…                       | 当前平台的独立试玩副本，保留可读剧本 | 否                 |
| 正式发行游戏     | `cargo bundle` / 游戏仓库的 Project release workflow | 专用 release Engine + 加密资源包     | 是，使用稳定身份   |
| 分发开发工具     | 构建 Editor / 开发 Engine，再组装平台包              | 创作用的 Editor 与 Engine            | 不需要游戏发行密钥 |

在 Editor 里点导出，用的是已经安装的开发 Engine。装的是 debug，导出的就是 debug，Build 页面不会临时替你编 release。决定正式发行时，再用 `bundle` 构建配套 Engine。

两条路径各有自己的代码入口。 [Editor 的 Build 实现](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/crates/editor/src/workspace/build.rs) · [正式打包实现](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/src/publisher.rs)

## 开始修改前

接手现有工作时，先看自己在哪个分支、还有哪些改动没提交，以及它们在哪个 worktree。

```sh
git branch --show-current
git worktree list
git status --short
git diff
```

搞清楚改动是谁的再编辑。保留作者工程和未提交改动，贡献放在独立分支，共享文件由维护者合入。

进仓库先读根目录的 `AGENTS.md`，再看 `dev/docs/architecture.md` 和 `testing.md`。要查具体功能，就看同一目录下的 `language.md`、`editor.md`、`release.md` 或 `compatibility.md`。

LetsGal 给 Kēne 提供了迁移入口和创作能力上的参考。Kēne 按自己的引擎语义发展，WebGAL 适配保留在冻结状态，只处理安全问题和明确的回归。

## 改一条命令该去哪里找代码

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

Loader 用 Core 的类型，Engine 再使用 Loader 和 Core。Core、Loader 和 authoring 协议可以脱离 Bevy 工作。Runtime 直接读带类型的 Program 和 State，Editor 处理自己的界面、选择和控件。

加一条语言命令时，通常先在 Core 定义它做什么，再让 Loader 能解析它、解释错误，最后接上 Runtime 和 Editor。参数定义放在 Loader 一处，补全和 Inspector 都从这里取。

有几件事改起来容易牵动其他模块，动手前值得先核对一遍。

- 场景以 1920×1080 布局，视口坐标只在一处转换。修改渲染时也要核对舞台、UI 和对白的合成顺序。
- 内容通过有序只读挂载读取，路径不能逃逸挂载根。
- Save v11 读档时要求 Program fingerprint 一致。profile、history、gallery 和 settings 各自保存。
- 这个版本的编译 Program envelope 为 v1，IR schema 为 v7，authoring 协议为 v9。旧 IR 要重新编译。
- 正常窗口的尺寸、位置、DPI 与最大化状态独立保存在 `saves/window.bin`，启动时适配当前显示器，不参与 slot 回滚；全屏尺寸不能覆盖正常窗口记录。
- 正式游戏数据写入稳定 `project.id` 对应的平台用户目录，不能写进只读发行目录。
- 新 feature、编译 IR、协议或持久化格式变动必须核对对应版本与拒绝路径；引擎版本、EYS 版本和存档版本不必一起递增。

完整约束见 [架构指南](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/docs/architecture.md)。

## 本机开发

这个提交固定了 Rust **1.97.1**，使用 2024 edition 和 Bevy **0.19.1**。rustup 根据 `rust-toolchain.toml` 选工具链并准备 rustfmt 和 Clippy。C/C++ 工具和系统 SDK 仍要按平台安装。

| 平台    | 当前需要注意的依赖                                                                         |
| ------- | ------------------------------------------------------------------------------------------ |
| macOS   | Xcode Command Line Tools / 系统 SDK；原生视频使用 AVFoundation                             |
| Linux   | ALSA、udev、Fontconfig、XKB 开发库与 pkg-config；Engine 当前使用 X11，可通过 XWayland 运行 |
| Windows | MSVC 工具链；启用 FFmpeg 视频时需要相应 SDK 和运行时 DLL，CI 使用 vcpkg                    |

CI 在 Linux 和 Windows 上怎样装依赖，可以直接看配置。`video-ffmpeg` 用的是 FFmpeg 开发库，Editor 导入音视频时调用的是 FFmpeg 可执行文件，两项要分别准备。 [setup-video action](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/actions/setup-video/action.yml)

Linux 构建 Vulkan 和原生 OpenGL/GLES，Windows 构建 DX12、Vulkan 和原生 OpenGL。哪条路径能跑，还要看驱动、features 和 limits，编完要实际开窗口试画面与输入。仓库里的 Bevy 补丁用于窗口循环和原生 display handle，仍带上游许可，升级时也要核对。

下面是 macOS 的本机开发例子，在 **Kēne 仓库根目录**运行。

```sh
cargo build --locked -p keine --bin keine --features hot-reload,video-native
cargo build --locked -p keine-editor --bin editor
KEINE_ENGINE="$PWD/target/debug/keine" target/debug/editor tests/fixtures/native-smoke
```

Editor 会启动已经编好的 Engine。这里用 `KEINE_ENGINE` 告诉它二进制在哪儿。改了 Engine 就重编并重启 Preview，改了 Editor 就重编并重开 Editor。

macOS 上用不到视频时可以省去 `video-native`。Linux 或 Windows 要测视频时，用 `video-ffmpeg` 并准备 SDK。平时常用的入口是 `cargo editor <project>`、`cargo validate <project>` 和 `cargo dev <project>`。

`cargo dev` 会同时开两个视频 feature，所以即使在 macOS 上也可能要装 FFmpeg SDK。只想跑原生视频路径时，把 feature 写清楚。

```sh
cargo run --locked -p keine --bin keine --features hot-reload,video-native -- dev tests/fixtures/native-smoke
```

先启动 `tests/fixtures/native-smoke` 检查基本行为，需要真实一些的负载时用 `tests/fixtures/native-benchmark`。用自己的作品测试时，留一份只读原工程，另准备测试副本。

## 工程与迁移

打开原生工程，先看 `config.yaml`、`assets.yaml`、`characters.yaml` 和 `scripts/**/*.shou`。需要对象映射时再加 `objects.yaml`。场景 ID 在项目内要唯一，入口由 `script.entry` 指定，章节按剧本里的跳转接起来。

Text、Blocks 和 Inspector 最终都写回一份文档。保存时会格式化并检查外部冲突，输入法确认文字后才更新分析。改这部分时，从输入一直试到保存、关工程再打开。

Characters 维护姓名、颜色和头像、表情预设，Assets 管实际清单。改预设不会主动重写剧本，也不会把未用资源自动加进发行白名单。插入、重排 Blocks 或改 Inspector 都要保住原有语义。关闭未保存工程时可以选 Cancel、Save and Close 或 Discard。保存失败就保留窗口和改动。

`assets.yaml` 记着资源 ID、类型、路径和 tags。Editor 导入时读取原文件，在选定目录生成规范格式，再记到清单里。背景用 Q80 WebP，立绘和粒子纹理用无损 WebP，独立音频用 Ogg Opus。存量素材要在 Assets 里执行 Convert all。格式按文件内容检查。

要把支持的旧工程迁进来，可以先生成新目录，再校验。

```sh
cargo migrate /path/to/source-project /path/to/new-native-project
cargo validate /path/to/new-native-project
```

目标目录要在源工程之外，目录本身还不存在，父目录已经建好。迁移器只读原工程，先在临时目录生成和校验，通过后才放到目标位置。已打包工程和原生 Eiyashou 工程会被拒绝，v1→v2 的源码升级也要另做。

资源复制后格式照旧。命令跑完再实际过一遍章节、分支、镜头、文字、BGM、SE、语音和自动播放。有无法还原的地方就记清楚。 [Eiyashou 的迁移说明](/blog/eiyashou)

资源估算卡只加总登记的文件。实际包体还要算上 Engine、编译剧本、索引、封装和第三方运行库。清单里也可能有暂时未引用的素材，删前先查引用、确认作者是否准备留用。

## 测试

改完先跑仓库的基础检查，再校验最小工程。

```sh
cargo fmt --all -- --check
cargo check --locked --workspace
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked --workspace
cargo validate tests/fixtures/native-smoke
```

涉及 publisher、迁移、资源或媒体时，把相关配置也跑一遍。macOS 常用下面这组。

```sh
cargo check --locked --workspace --features publisher,video-native,hot-reload
cargo test --locked --workspace --features publisher
cargo test --locked -p keine --no-default-features --features video-native scene::video::
```

动了 FFmpeg 路径，就准备 SDK 并跑带 `video-ffmpeg` 的配置。`cargo-deny --all-features` 看的是依赖图，相关配置还得实际编译和运行。

macOS 沙箱有时会挡住 Unix socket，报 `Operation not permitted` 或 `PermissionDenied`。这种情况在允许 IPC 的环境里重跑同一项。废纸篓等平台 API 测试也需要对应系统权限。

| 改动类别        | 必须补看的真实行为                                                         |
| --------------- | -------------------------------------------------------------------------- |
| 编辑输入 / 文档 | 中文 IME 组合与提交、光标、撤销、保存、关闭重开、外部冲突                  |
| UI / 拖放       | 实际窗口尺寸、嵌套与多选、取消、失焦、菜单层级与点击区域                   |
| 运行语义        | 分支、调用与返回、章节接续、自动/手动继续、seek / 回滚                     |
| 音视频          | 真正播放、循环接缝、切换、暂停/恢复、EOF、损坏输入与加密包                 |
| 打包            | 从发行目录独立启动、动态库完整、用户数据位置、更新与许可文件               |
| 性能            | 同机器、同输入、同 release 配置的前后数据，记录 CPU / RSS / 帧时与异常操作 |

测性能时留下命令和日志。用同样的机器、输入和 release 配置对比，记录 p99、最慢一帧和超出刷新预算的帧数，切窗口和负载本身的停顿分开看。可以用已有的 bench、`cargo perf` 或 benchmark 包。

性能包提供可重复跑的负载。各平台硬件、多显示器、GUI 和完整剧情仍要分别验收，运行、打包、签名、公证的结果也分别记下来。

## 依赖与许可

这个版本的 CI 用 cargo-deny **0.20.2**。本机需要同一套检查时可以这样装。

```sh
cargo install cargo-deny --version 0.20.2 --locked
cargo deny --locked --all-features check advisories licenses bans sources
```

门禁会拒绝未知许可、未知 registry 或 Git 来源，以及没固定 revision 的 Git 依赖。上游重复版本和已有路径依赖的通配声明仍会警告。DL1 按 `license-file` 和明确的文件哈希识别。

升级时看看直接和传递依赖、`Cargo.lock`、原生库和素材许可究竟改了什么，再跑受影响的 feature。门禁出错先查到具体依赖。Bevy 的窗口补丁和 Hakutaku 都固定了 Git revision，替换时要回头验证它们解决过的行为。

Kēne 原创代码和文档采用 DL1，贡献默认沿用相同条款。第三方代码、字体和游戏素材各有许可，具体以仓库 `LICENSE` 和许可原文为准。 [Defold License 1.0](https://defold.com/license/)

`NOTICE` 只是一份概览。准备发行包时还要补齐实际依赖的版权和许可文本，满足 MPL 对源码获取及修改源码的义务，再核对要分发的 FFmpeg 和 codec 许可。cargo-deny 帮忙核对依赖声明，成品还得按实际内容查。 [发布指南的许可说明](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/docs/release.md)

## 导出试玩

发给朋友试玩时，到 Editor 侧栏的 Build，点 **Export game…**，选工程外的父目录。导出生成 `<工程名>-playtest`，有同名目录就追加数字。完成后可以点 Play 试跑，或点 Open folder 找文件。

Editor 先保存、格式化文档并校验源工程，复制完再校验副本。包里有登记的资源、完整原生剧本和相应清单。原格式副本、未登记素材、用户存档、缓存和私钥留在外面。macOS 生成 `Game.app`，Windows 和 Linux 生成本机可执行文件。

试玩导出支持原生 Eiyashou 工程、本地资源和当前平台。它用开发 Engine，源码仍可读，整个过程用不到 publisher key。对外发行走下一节的 Hakutaku 打包流程。

## 正式打包

正式打包前，先把图片与独立音频整理成 WebP 和 Ogg Opus，再验证工程。开发时能播放的 PNG、WAV，到了这一步也要先转好。`bundle` 不会替工程批量转换素材。

```sh
cargo validate /path/to/game
cargo bundle /path/to/game --output target/bundle/my-game
```

从验证过的工程到能单独启动的发行目录，中间会走这几步。

1. 建立临时工程副本，验证配置、稳定 `project.id`、媒体、引用与路径。
2. 编译带类型的 Program，收集实际要发行的文件，源剧本留在原工程。
3. 在内容检查成功后，加载或首次生成 publisher identity。
4. 推导客户端所需公钥和密钥拆分材料，重新构建 `--release --locked --no-default-features` 的 hardened Engine。
5. 根据内容选择生产 feature：通常为 `ui-sounds`，需要视频时 macOS 加 `video-native`，其他平台加 `video-ffmpeg`；不带 publisher 和 hot-reload。
6. 生成 Hakutaku 快照和数据段，与可执行文件、运行库和许可文件一起组装。成功后才发布输出目录，失败就保留既有正式输出。

这个版本的 release profile 开了 LTO、strip、单 codegen unit 和 panic abort。`bundle` 还会构建一份与游戏身份配套的客户端。要换包内 Engine，就用这条发行流程重新生成。

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

只需要资源包时，用 `cargo pack <project>`。需要能启动的完整游戏，用 `bundle`。publisher runner 和客户端使用不同的构建目录，避免在 Windows 上覆盖运行中的可执行文件。

### 身份与密钥

| 项                          | 用途                     | 谁保管 / 放在哪里                            |
| --------------------------- | ------------------------ | -------------------------------------------- |
| `project.id`                | 稳定定位游戏用户数据     | 作者设定，维护者保持更新时不变               |
| `.keine/publisher.key`      | 内容签名私钥与内容根密钥 | 作者 / 发行维护者私下备份，CI 用 secret 恢复 |
| Apple 证书与 notary profile | macOS 应用签名、公证     | 发行机器 Keychain，不放进工程或聊天          |

第一次有效打包会生成 publisher key，以后自动复用。也可以用 `KEINE_HAKUTAKU_IDENTITY` 指向工程外的文件。**发更新时，继续用同一个 key 和 `project.id`。** 身份文件即使编码成 Base64 也仍是秘密材料。

离线客户端需要能读包和验签，所以包含公开验证密钥和解密所需的拆分材料。签名私钥留在发行端。重复构建时拆分材料可以不同，发行身份仍由同一把密钥决定。具备客户端分析能力的人依然有可能提取资源。

用同一份身份重新打包时，可以复用已有输出里的不可变数据段。网络更新组件要另行实现。需要换发行身份时，用新输出目录完整构建，把配套 Engine 和资源一起发。更新剧本会改变 fingerprint，旧存档槽可能读不回，profile 等独立数据继续单独保存。

### macOS 游戏 app

macOS 游戏包要给应用起个名字，再指定 reverse-DNS bundle identifier。

```sh
bash dev/scripts/bundle-macos.sh /path/to/game "My Game" com.example.my-game
```

脚本会调用 `cargo bundle`，得到 `target/bundle/macos/My Game.app`。打开包能看到 `Contents/Resources` 下的 `game.haku`、`data/` 和许可文件，`Contents/MacOS` 里是可执行文件。

默认做 ad hoc 开发签名。正式分发时，在本机 Keychain 准备带私钥的 Developer ID Application 证书，用 `xcrun notarytool store-credentials <profile>` 存公证凭据，再设置下面两项。

```sh
export KEINE_CODESIGN_IDENTITY="Developer ID Application: <name> (<team>)"
export KEINE_NOTARY_PROFILE="<profile>"
bash dev/scripts/bundle-macos.sh /path/to/game "My Game" com.example.my-game
```

证书和公证配置都给出时，脚本依次做 hardened runtime 签名、提交公证、附加与验证 ticket，以及 Gatekeeper 检查。只给证书就只签名。开发签名和正式分发的各项验收要分别看结果。 [签名脚本](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/dev/scripts/sign-macos.sh) · [Apple 公证文档](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)

## CI 与自动发布

| Workflow              | 触发方式                      | 结果                                                     |
| --------------------- | ----------------------------- | -------------------------------------------------------- |
| `ci.yml`              | push / pull_request           | 依赖门禁、Linux / macOS / Windows 构建与相应测试         |
| `release.yml`         | main 的 CI 成功后自动，或手动 | 自动更新 `benchmark-latest`                             |
| `editor-release.yml`  | main 的 CI 成功后自动，或手动 | 更新 `editor-latest`，提供同版本 Editor + Preview Engine |
| `project-release.yml` | 其他游戏仓库 workflow_call    | 从固定 Kēne SHA 构建 Linux x64 正式游戏包，上传 artifact |

常用的两个滚动预发布各有自己的标签。找附件时，先看自己需要的是哪一种。

- `benchmark-latest` 用 profiling 优化并保留符号，默认跑 `native-benchmark`，附报告和系统采样工具。
- `editor-latest` 是 release 优化的创作工具包，不含游戏素材。macOS 是内置 Engine 的 arm64 `Kēne Editor.app`，Linux 和 Windows 则把 x64 可执行文件和运行库放在同一个 ZIP 里。

这个版本的 `release.yml` 默认生成 benchmark 包。测试包在各平台使用单独的临时身份。正式游戏更新仍由 CLI 或 Project CI 使用稳定的发行身份。

自动发布只取本仓库 main push 里通过 CI 的那个 SHA。PR、fork 和失败的构建不发布。旧构建跑完时如果 main 已有更新，旧包留作 artifact，滚动标签继续等新提交。三个平台都生成 ZIP 后才能发布。artifact 保留 14 天，上传 artifact、更新标签和替换 Release 附件需要分别确认。这里的 macOS 开发包未经正式 Apple 公证，自动构建仅覆盖 Apple Silicon。

benchmark 包可以拿到自己的机器上跑。少了必测时间轴，报告会保留并标成 INCOMPLETE。直接跑负载用不到 Python，额外采集调用栈才需要 Python 3 和平台工具。GPU 性能、实际听感和 Editor 布局另做本机验收。 [CI](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/ci.yml) · [Release](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/release.yml) · [Editor Release](https://github.com/maincoretech/keine/blob/5ecdcc8c6ec5660784c76a212b9886befedd15b7/.github/workflows/editor-release.yml)

存游戏 Cargo 缓存前，先清掉含密钥的 Engine 和 Loader 产物。清理失败时停止缓存和发布。Editor 缓存单独放在 `target/authoring`，构建关闭 publisher 与 hardened，流程也不会接收游戏身份。

### 独立游戏仓库的 CI

游戏放在自己的仓库。把稳定发行身份的 Base64 存入该仓库的 Actions secret `HAKUTAKU_IDENTITY_BASE64`。示例固定在本文的提交，换 Engine 时填审查过的完整 SHA。

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

示例里的 tag 触发器由游戏仓库声明。复用 workflow 时把 `uses` 写在 job 上。Kēne 要求 40 位 SHA，workflow 和 Engine checkout 使用同一提交。 [GitHub 的复用 workflow 语法](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)

这条流程产出 Linux x64 游戏包，放进 Actions artifact。macOS、Windows 和 GitHub Release 要另做。身份只在 runner 临时目录恢复，上传前清理。缓存排除游戏 checkout、发行成品和身份。包里的 `KEINE-PROVENANCE.txt` 记录游戏和 Engine 的 SHA、工具链、features 和 workflow run，回查附件时用得上。

## 发布引擎版本

轮到发布 Kēne 自己的版本时，维护者可以从下面几项顺着查。

1. 确定发行提交与变更范围，更新 workspace 版本、Cargo.lock 中本地包版本以及 README 的当前版本。EYS、IR、协议和存档版本按各自实际格式变更处理。
2. 跑本机检查和受影响的 features。推送后看这个 SHA 的平台 CI，记下失败原因和还没验收的项目。
3. 从同一提交构建 Editor 与开发 Engine，组装创作工具；按目标平台检查独立安装、Engine discovery 和运行库。游戏 bundle 是另一条流程。
4. 做对应平台的原生验收与许可检查；macOS 正式分发时完成签名、公证和解压后启动。
5. 写版本说明，交代支持范围和已知限制，再核对滚动渠道的 SHA 和附件。稳定标签与 Release 由维护者单独审查并发布。
6. 记录发行 SHA、平台、features、artifact 来源、签名状态和验收结果；不要记录私钥或内容根密钥。网站文章说明功能与流程，具体状态继续保存在对应仓库指南里。

组装 macOS 创作工具可以用下面的命令。

```sh
cargo build --release --locked -p keine-editor --bin editor
cargo build --release --locked -p keine --bin keine --no-default-features --features audio-all,ui-sounds,hot-reload,video-native
bash dev/scripts/package-authoring-macos.sh target/release/editor target/release/keine /path/to/fresh-output
```

选一个不存在的输出目录。成品是单个 `Kēne Editor.app`，匹配的 Engine 在 `Contents/MacOS/keine`，签名沿用前面的环境变量。跨平台组装入口是 `dev/scripts/package-authoring.py`，会检查安装后的运行库、跑 native-smoke，并留下构建来源记录。需要导入非规范音视频时另装 FFmpeg 转换工具。

Windows 和 Linux 的 Editor ZIP 完整解压后即可试用。要确认干净机器能独立运行，仍得在目标机器上实测。

## Android 实验

这一版撰写时，本地还在试独立 ARM64 Engine。它走 Android NativeActivity、横屏和 Vulkan，目标从 Android 8 / API 26 起。实验当时尚未提交，共用 Core、Loader 和 Save 格式，视频、Editor、publisher 和桌面文件选择器都在实验范围之外。

本地实验用 `dev/scripts/build-android.sh`，需要 SDK、NDK、JDK、Gradle 和 cargo-ndk。产物是 debug 签名的测试 APK，里面只有引擎。测试工程从 Activity 私有的 `files/game/` 读取，用户数据另存在 `files/userdata/<project.id>/`。当时还要继续检查 Hakutaku 打包、正式签名、安装和更新，以及真机的触摸、输入法、音频和 GPU。具体实验步骤见当时本地的 `dev/docs/android.md`。

# 发布

给别人试玩可以直接从 Editor 导出；正式发行使用 `bundle` 打包。
图标、素材格式和发布密钥需要准备的内容见下方。仓库维护者可直接看 [CI 与发布操作](#ci-与发布操作)。

## 导出试玩

在 Editor 的 **Build** 页面点击 **Export game…**，选择输出位置即可。
导出使用已安装的 Engine，不需要 Cargo 或发布密钥；只生成当前操作系统的版本，
并包含可读的剧本源码。具体步骤见 [Editor Build](editor.md#build)。

图片导入不需要额外工具；转换音视频格式需要另装 FFmpeg 可执行程序。
Engine 随附的播放库不能代替转换工具。

## 打包正式游戏

1. 在 `config.yaml` 中确定 `project.id`，后续更新继续使用同一个 ID。
2. 将发行素材准备为 WebP 图片和 Ogg Opus 音频，先检查剧本与资源引用。
3. 安装[构建依赖](testing.md#开发环境)，在 Kēne 仓库执行：

   ```sh
   cargo validate /path/to/my-game
   cargo bundle /path/to/my-game --output target/bundle/my-game
   ```

4. 首次成功打包后，私下备份工程的 `.keine/publisher.key`。更新游戏时继续使用它，
   不要把它提交到仓库或放进下载包。
5. 在目标系统上启动成品，检查剧情、存读档和音视频，再分发完整输出目录。
   保留包中的 `NOTICE`，游戏自己的许可可放在工程根目录的 `LICENSE` 中。

`bundle` 会编译并打包 Engine，不能只分发可执行文件。
macOS `.app` 的打包、签名和公证见 [macOS](#macos)；使用 GitHub 构建 Linux 游戏见 [Project CI](#project-ci)。
正式发布前的证书和密钥准备见[发行前的用户准备](#发行前的用户准备)。

## 两个独立下载渠道

| 用途 | 下载标签 | 触发方式 | 内容 |
| --- | --- | --- | --- |
| 作者开发 | `editor-latest` | main 的 CI 桌面检查通过后自动；也可手动 | 三平台独立 Editor + 同版本 Preview Engine，无游戏素材 |
| tday 试玩 | `tday-latest` | **仅手动** | 三平台 ZIP + Android ARM64 APK，含 shiftz 素材版权说明 |

两个渠道都是预发布，互不覆盖。Editor 和 tday 使用 release 优化。
benchmark 的 CI 构建、发布和独立采集器门禁已取消；开发者仍可在本地用 `perf`
或 `bundle --benchmark` 排查具体问题，旧 `benchmark-latest` 不再更新。
当前 macOS 下载面向 Apple Silicon，Linux/Windows 面向 x64，暂不提供 Intel Mac 构建。
macOS Editor 下载是一个 `Kēne Editor.app`，内部带
Preview Engine；Windows/Linux 包含 Editor、Engine 和运行库，须完整解压。

## 应用图标

作者只需在工程内准备一张正方形 PNG/WebP，并在 `config.yaml` 指定：

```yaml
project:
  id: my-game
  icon: app-icon.webp
```

路径相对工程根目录，不能越出工程。建议 1024×1024，允许 32–4096 px、最多 64 MiB；
保留透明度。未配置时使用 Kēne 默认图标。`cargo bundle` 和 Project CI 自动派生 Windows
多尺寸 ICO、macOS ICNS、Linux PNG、Android 各密度与 adaptive icon，不需另交平台文件。
Android 将完整图标居中留在安全区域；没有自动生成 monochrome 主题图标。
格式依据 [Windows 图标](https://learn.microsoft.com/en-us/windows/win32/menurc/about-icons)
和 [Android adaptive icon](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)。

Editor Build 保留图标源文件，生成 macOS/Linux 应用图标并供窗口使用。
Windows 临时导出复用已安装 Engine，EXE 文件图标仍为 Engine；正式 `bundle` 会重新嵌入项目 ICO。
正式 Windows 游戏包使用 EXE 内嵌 ICO 和窗口 PNG，不再附带旁边的 `keine.png`；
macOS 使用 app 的 ICNS，同样不附带无用途的 PNG。
Linux 包中的 `python3 install-desktop.py --install` 可注册应用菜单与图标；应在最终存放目录运行，
移动包后重新运行。它需要包内 `keine.png`，窗口本身仍使用内嵌图标；
此步骤需要 Python 3，直接启动游戏不需要。

## CLI

```text
validate <project>          配置、脚本、引用校验
dev <project> [--sync]      开发运行；sync 跟随 LetsGal 工程
migrate <source> <target>
                           将源工程转换到新目录，保留原工程
bundle <project> --output <dir> [--benchmark]
                           编译游戏、校验资源并生成完整发行目录
pack <project>             高级 Hakutaku 资源打包
remap ...                  高级资源引用迁移
perf <project> [--startup]  开发测量
```

`bundle --benchmark` 使用与 release 相同优化的 `profiling` 构建，保留符号，并关闭
阻止系统 profiler 附加的反调试措施；普通发行仍使用 hardened release。
测试包使用临时 identity。包内 `BENCHMARK.txt` 写明运行和采样步骤。

## 发行前的用户准备

1. 确认发行平台、剧情/媒体验收结果与稳定 `project.id`，交给维护者打包。
2. 首次有效打包生成 `.keine/publisher.key` 后私下备份；更新时继续使用同一文件。
   使用游戏仓库 CI 发行时，把该文件的 base64 放入 `HAKUTAKU_IDENTITY_BASE64` secret。
   运行时材料由打包器生成，无需手动拆分密钥。
3. 正式发行 macOS 版时，在发行机器的 Keychain 安装带私钥的
   **Developer ID Application** 证书，使用 `xcrun notarytool store-credentials <profile-name>`
   按本机提示私下保存 Apple 公证凭据。交给维护者证书名称与 profile 名称；密码和私钥不发到聊天或仓库。

`publisher.key` 用于游戏内容签名/加密；Apple 证书与 profile 用于 macOS 应用签名/公证，
两者分别保管。维护者负责媒体规范化、执行下方打包命令、检查公证/安装/更新结果。
正式公证前只具备开发包证据；完整分工和完成标准见 [运行与发行验收](testing.md#运行与发行验收)。

## macOS

```sh
cargo build --release --locked -p keine-editor --bin editor
cargo build --release --locked -p keine --bin keine --no-default-features --features audio-all,ui-sounds,video-native
python3 dev/scripts/package-authoring.py target/release/editor target/release/keine /path/to/fresh-output
bash dev/scripts/bundle-macos.sh <project> <app-name> <reverse-dns-bundle-id>
```

第一条打包脚本使用预构建二进制，产出一个 `Kēne Editor.app`，同版本 Engine 内置于
`Contents/MacOS/keine`；目标必须是新目录。各平台与 CI 共用此入口，
记录 SHA/features，检查实际安装 runtime 并校验 native-smoke；不能混用不同提交的二进制。
Editor 导入图片无需外部工具；导入非规范音视频需要可执行的 FFmpeg（libopus/libx264），
可安装到 PATH 或放在 Editor executable 旁/Resources 内。当前打包脚本不附带 FFmpeg；
Engine 播放规范媒体不依赖这项导入工具。
两条 macOS 打包脚本默认使用 ad hoc 开发签名。正式发行可设置：

```sh
export KEINE_CODESIGN_IDENTITY="Developer ID Application: <name> (<team>)"
export KEINE_NOTARY_PROFILE="<notarytool Keychain profile>"
```

共用 `sign-macos.sh`：正式签名启用 hardened runtime 与 timestamp；有 profile 时提交
公证、staple/validate ticket 并执行 Gatekeeper assessment，全部成功后才安装新包。
profile 通过 `xcrun notarytool store-credentials` 私下存入 Keychain，不把密码/私钥写进工程。
仅设置签名证书时只签名；不设置两项时仍为开发包。实际正式公证需有效 Apple Developer
证书与凭据，本机尚未执行正式公证。依据 [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)。
验收包括 `codesign --verify --deep --strict`、ZIP 解压后启动、独立安装后的内置 Engine discovery。

## Project CI

先本机创建稳定的 Hakutaku identity，将其 base64 放进游戏仓库 Actions secret
`HAKUTAKU_IDENTITY_BASE64`。同一发布 lineage 始终复用同一身份。

```yaml
name: Release
on:
  workflow_dispatch:
  push:
    tags: ["v*"]
permissions:
  contents: read
jobs:
  release:
    uses: maincoretech/keine/.github/workflows/project-release.yml@<40-character-keine-commit>
    with:
      project-path: .
      artifact-name: my-game-linux-x64
      retention-days: 14
    secrets:
      HAKUTAKU_IDENTITY_BASE64: ${{ secrets.HAKUTAKU_IDENTITY_BASE64 }}
```

完整 SHA 同时确定 workflow 与 Engine；branch/tag/短 SHA 被拒绝。
身份只在 runner 临时私有路径恢复，上传前无条件清理。
缓存只有 Cargo downloads 与 Kēne build trees，不含游戏 checkout、完整发行包或身份。
产物包含 executable、`game.haku`、`data/`、非秘密 provenance。
mutable ref、路径逃逸、缺失身份、非生产媒体、构建失败或未解析动态库均 fail closed，不上传半成品。

当前复用工作流面向 Linux x64；macOS/Windows 本机运行态验收不由它代替。
入口：[`project-release.yml`](../../.github/workflows/project-release.yml)、
[`publisher`](../../src/publisher.rs)、[`构建脚本`](../scripts/)。

## 许可证与发行署名

Kēne 原创代码与文档采用 [Defold License 1.0](https://defold.com/license/)，
完整条款见根目录 `LICENSE`；允许商业发行游戏，限制将引擎/Editor 本身作为游戏引擎产品商业化。
游戏剧本和素材可使用作者自己的许可。第三方组件保持各自许可；提交贡献默认遵循 DL1，
不要求转让贡献者的著作权。Cargo 使用 `license-file` 声明这个非标准 SPDX 许可证。

用户仍按原流程导出/打包，保留输出中的单个 `NOTICE` 即可；macOS app 内放在
`Contents/Resources`，Android 放在 APK 的 `assets`。打包器按章节合并引擎完整许可、
原 NOTICE、字体声明、已收集的 native 许可和源码地址；工程提供根目录 `LICENSE` 时，
作为 `GAME-LICENSE` 章节保留。原文不缩写，不再另发 `TDAY-LICENSE` 等零散副本。
Editor 安装包的 SDK 版权声明也写入同一文件，Build 导出沿用对应 Engine 的声明并追加游戏版权。
本地直接编译的 Engine 没有相邻发行声明时，Build 使用内嵌引擎/字体声明；
正式发行的其余第三方义务仍按下方清单检查。
试玩导出不等于正式发行许可审查完成。

维护者每次升级或加入依赖时运行（CI 使用 cargo-deny 0.20.2）：

```sh
cargo deny --locked --all-features check advisories licenses bans sources
```

未知许可/来源与未固定 revision 的 Git 依赖会失败；上游重复版本和现有路径依赖的
通配声明仅警告。DL1 只在本工程六个 crate 上按原文哈希识别，不能误判为 Apache；
修改许可或允许列表必须核对完整上游条款，不能用宽泛 ignore 绕过。

正式发行前，维护者按实际目标平台与 features 补齐第三方依赖的完整版权/许可文本，
为 MPL 组件提供实际使用版本的源代码获取方式及必要的修改源码；源码根目录的 `NOTICE` 是概览，
发行版 `NOTICE` 收集已列出的完整文档，但不代表全部依赖的许可审查已完成。
外部 FFmpeg 的 LGPL/GPL 和 codec 义务由实际构建配置决定，
不能套用 Rust wrapper 的 WTFPL；macOS 使用系统 AVFoundation；Windows/Linux Editor 包附 FFmpeg 播放库及 SDK 版权说明，
不附带转换 executable。正式发行仍须核对实际 native SDK 的许可和来源。
`cargo-deny` 检查声明，不证明所有二进制与素材的发行义务已满足。

合成字体来源与完整 OFL/MIT 文本见 `src/assets/fonts/FONT-LICENSES.txt`。
Maven Pro 合成版内部名称已改为 Kene Text，字形与排版数据未变；CJK 来源由项目所有者确认
为 HanaMinAFDKO，作者仓库声明遵循 GlyphWiki 数据许可。已附 Mozilla 分发的 GlyphWiki 历史许可原文；
此前来源核查时上游页面返回 403，未验证其最新版本。原始合成/图标转换配方和确切源版本未保存，
不声称已重建来源链。

## 密钥与更新

默认身份文件为 `<project>/.keine/publisher.key`，首次有效打包时生成，后续自动复用；旧 `.hakutaku-key` 名自动迁移并保留相同身份。`KEINE_HAKUTAKU_IDENTITY` 可指定工程外的身份路径。

身份文件包含签名私钥和内容根密钥，须私下备份，不随游戏发行。打包器向 Engine 构建传入验签公钥及根密钥的两份随机拆分材料，不传签名私钥。Loader 构建脚本将拆分材料转换成逐字重建代码，每次 bundle 的顺序、掩码、旋转及表达式随随机拆分变化；不再把两份完整数组相邻嵌入。开发版不生成密钥，发行版不编入开发版缺钥诊断。

这是低成本静态混淆，不增加 AES 密钥位数，也不改变包格式或稳定内容根密钥。`black_box` 仅尽力阻止常量折叠，[Rust 不为它提供安全保证](https://doc.rust-lang.org/std/hint/fn.black_box.html)；更换编译器/目标后须重查实际二进制。客户端能完全离线解密，攻击者仍可仿真重建代码或截取运行时密钥；每次拆分变化不等于密钥轮换。生成代码及相关构建缓存同样含可恢复的解密材料，不应公开上传。

发行步骤仍为 `cargo bundle <project> --output target/bundle/<game>`，macOS 使用 [app 打包脚本](#macos)。更新继续使用同一身份与稳定 `project.id`；CI 继续将同一身份文件的 base64 放在 `HAKUTAKU_IDENTITY_BASE64` secret，无需用户手动处理每次生成的运行时材料。

显式轮换只在确有需要时进行：备份原身份，指定新身份并使用全新输出目录完整打包，分发配套新 Engine 和资源。当前客户端只信任一组密钥；新旧身份的程序/包不可任意混用。Kēne 当前使用 `OpenPolicy::TrustFirstRelease`，未保存客户端最高发行序号，因此允许同身份的合法包回退；发布端的 `KEINE_HAKUTAKU_RELEASE_FLOOR` 不改变这一点。slot 仍要求剧本 fingerprint 匹配。

## 维护与实现

以下内容说明 CI、运行库、依赖和内容保护的实现，供维护构建与发布流程时查阅。

### 平台运行库与验包

Linux 发行构建固定 `ubuntu-24.04` / GLIBC 2.39 基线；游戏与 Editor
均校验包内每个 ELF 的版本需求，不能用最新构建机启动成功替代旧系统兼容。
Engine 与 Editor 的最终 ZIP、正式 Project 的发布目录，在同一 Ubuntu
24.04 runner 上验证一次：保留解压执行权限、检查 ABI/动态库闭包，并从无关 cwd
加载 Engine 和 `game.haku`（Editor 用 native-smoke 工程目录）。FFmpeg 和已有 bundled
库必须从包内 `lib/` 解析，不能由 runner SDK 掩盖漏包。
复核已有 ZIP 可在 Ubuntu 24.04 运行
`python3 dev/scripts/verify-linux-package.py <zip> tests/fixtures/native-smoke`；无需重新编译。
发布流程已包含最终验包，不再为同一检查保留独立 workflow。
这些检查覆盖 loader/内容加载，不替代原生窗口、GPU、音频及硬件性能验收。
glibc 的 loader、libc/libm、libmvec/libresolv 等组件由宿主提供，不随应用复制。
Windows 的 FFmpeg DLL 使用 EXE 内嵌的 Win32 私有 assembly 声明，从 `lib/lib.manifest`
列出的 `lib/*.dll` 加载，无启动器、无全局 PATH 修改。开发构建不添加此发行依赖；
加载位置依据 [Win32 私有 assembly 搜索顺序](https://learn.microsoft.com/en-us/windows/win32/sbscs/assembly-searching-sequence)。
直接组装 Windows authoring 包时，先设置 `KEINE_WINDOWS_BUNDLE=1` 再编译对应 Engine。
benchmark 的 PDB/dSYM、采集脚本与启动标记也归入同一个 `lib/`，不新增 tools/symbols 目录。
GLIBC 版本基线依据 [Ubuntu 24.04 的 libc6](https://packages.ubuntu.com/noble/libc6)。

### 默认图标维护

维护者只维护 `src/assets/icons/keine.png`。Release Editor / CI 的 Android job 在构建前自动派生，
项目发行直接调用同一 Rust 生成器；现有 `image` PNG 与 `keine-media` WebP 解码器复用，无额外图片工具。
手动生成到新目录：`cargo run --features publisher -- icons path/to/icon.webp target/my-icons`。
提交默认图标变更时同步生成 `src/assets/icons` 与 Android `icon-res` 回退资源，并运行
`python3 dev/scripts/verify-icons.py`；CI 另检查派生文件和实际 APK。

### CI 与发布操作

CI / 发布使用官方稳定 Actions 并固定完整发布 SHA；JavaScript Actions 使用 Node 24。
Linux 发行和桌面 CI 固定 `ubuntu-24.04`；审计、发布控制和 Android 构建使用
`ubuntu-26.04`，其他桌面平台使用 `macos-26`（arm64）和 `windows-2025`（x64）；
Rust 原生构建缓存按 runner image / architecture 隔离，
避免系统迁移时恢复其他镜像的链接产物。artifact 下载沿用新版默认的哈希校验失败即报错。
版本与 runner 要求依据 [GitHub Node 20 退役公告](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)
及 [官方 runner images](https://github.com/actions/runner-images#available-images)。

维护者操作：

1. 推送 main 后查看 **CI**；桌面检查通过后，在同一次运行中调用 **Release Editor** 更新 Editor。
2. 发布 tday：Actions → **Build tday** → **Run workflow** → 选目标 ref；此 workflow 仅构建 tday。
   同一次触发并行构建桌面三平台和安卓 release APK，游戏资源已内置；普通推送和自动 CI 完成不会触发 tday 打包。此渠道只用隔离临时 identity，不读正式发行密钥。安卓使用测试应用签名，见 [Android](android.md)。
3. 手动补发 Editor：运行 **Release Editor**。只重跑检查用 **CI** 的 `checks` 选择
   `all`、`android`、`media` 或 `dependencies`；不会发布 Editor 或 tday。
4. 下载更新完成后核对标签对应的 SHA、三个桌面 ZIP、tday 的安卓 APK 和包内 provenance；代码推送、CI 成功、
   Release 附件更新分别确认。正式游戏发行继续使用 [Project CI](#project-ci) 或 [CLI](#cli)，并复用稳定的发布身份。

Editor 自动构建固定使用通过桌面检查的 main push SHA；PR、fork、失败的桌面检查、
定时审计和手动检查不发布，也不创建独立的全跳过 Release Editor 记录。新 main 已出现时，
尚未开始的旧自动构建在安装工具链/编译前跳过；编译期间出现新 main 的运行只保留
Actions artifact，不覆盖滚动下载。三个 ZIP 在原平台打好再上传，保留
Unix executable 权限；tday 须四个平台成功后才发布。标签/附件更新失败会让发布 job 失败。

### CI 成本与失败重试

- 格式、打包/Python 边界、workflow 语法与依赖先检查，再进入 Rust 矩阵；纯指南、
  README、AGENTS 和 Dependabot 配置提交不触发桌面/Android 全编译。
  仅修改 `crates/editor/**` 时跳过 Android；共享源码、根 Cargo 清单/锁文件变化仍检查。
- Publisher runner 只编译 `--bin keine`，不顺带构建两个视频测试工具；仅这个构建步骤
  使用 opt-level 1、关闭 LTO、16 codegen units。后续 Engine 保持原来的 release/profiling
  参数和功能集合，不改变游戏/benchmark 的优化质量。
- Rust cache 按 runner/架构/依赖清单与实际功能配置复用，不为每次源码提交存完整副本。
  CI dev/test 不保存调试信息，保留 assertions；只缓存所用编译树和小型图标工具。
  桌面三平台的优化等级统一沿用 Cargo.toml，不在 CI 中单独覆盖，缓存前缀保持 `rust-v2`。
  Clippy 仅在负责质量检查的 Linux 安装；macOS 使用系统 AVFoundation，跳过 FFmpeg SDK 准备。
  Windows vcpkg 按固定 manifest 与 runner image 复用，SDK 安装后立即保存缓存、
  检查真实私有 DLL assembly 的绑定，再开始 Rust 编译；cargo-ndk 单独缓存固定版本。
- Linux 完整工作区测试覆盖平台回归并生成视频验收工具，直接复用，不另编同一批测试。
  先完成视频验收，再运行可能覆盖同名工具的 publisher-only 测试。
  macOS/Windows 的平台回归、Editor instance 和 display 测试统一选择 Engine、Editor、
  `bevy_render` 与同一平台 features；视频工具连同 instance target 一起构建后直接运行。
  避免分开选择包、再用 `cargo run` 切换 dev-dependency 图而重复编译 Bevy。
  macOS job 上限为 90 分钟，包含冷编译和缓存上传；这不是预期运行时长。
- 发布 cache 用显式 restore/save。验证失败也能保留依赖，但先成功清除 `keine` 和
  `keine-loader` 的含密钥编译产物；清理失败、取消或没有 restore key 时不保存。
  Project 正式发行同样执行清理。成品 ZIP/APK 的 artifact 传输不做第二次压缩。
- fmt/Clippy、默认与 publisher 功能边界、各平台视频/renderer、Android 和媒体安全
  检查仍保留；这些保护不同入口，不为追求短时间删掉覆盖。WebP fuzz 独立依赖
  media/libwebp，不安装桌面 SDK；命中 cargo-fuzz 缓存后不重复 cargo install。

缓存的不可变条目及默认仓库容量仍可能导致驱逐；工具链/依赖/profile 首次变化会冷编译。
没有增加付费缓存容量，也不保证每次满命中。验包失败先用验包脚本复核已有包，
不为检查脚本反复启动四平台发布。
macOS 包是开发签名，未做 Apple 公证；完整跨平台运行验收与硬件性能测试仍是独立关卡。

默认 native-benchmark 三平台使用同一套真实负载，包含媒体。缺少必测时间轴时返回
INCOMPLETE 并保留报告，不能当作完整跑分。包内 `lib/profile-runtime.py` 的额外调用栈采集
需要 Python 3 和平台采样工具；直接跑 benchmark 无需 Python。Windows 附 PDB，macOS
有 dSYM 时附带。它不在 CI 主机上执行 GPU 性能验收，也不是正式游戏发行。

游戏打包保存 Cargo 缓存前清理 Engine/Loader 的 release/profiling 密钥产物，保留依赖
与不含密钥的 publisher runner；必要时补写 `target/CACHEDIR.TAG`，清理失败阻止缓存保存
和发布。Editor 使用独立 `target/authoring` 缓存，不启用 publisher/hardened，也不接收 identity。
发布复用依据见 [workflow_call](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
与 [Release 上传 action](https://github.com/softprops/action-gh-release)。

Cargo aliases 与 executable 使用同名动词；具体参数以 `--help` 为准。
正式内容先验证/编译，再加载或创建 publisher identity；失败保留已有可运行发布目录。
identity 与内嵌 key 不记录、不提交、不缓存，也不传给无需它的 child build。

### 依赖审计与升级

工具链以 [`rust-toolchain.toml`](../../rust-toolchain.toml) 为准，当前六个 Kēne crate
的 MSRV 为 Rust 1.99.0。依赖与 feature 以 Cargo manifest/lock 为准；不要把某次升级
清单当作当前依赖规范。升级工具链时同步 CI；升级 Kēne 版本时同步根目录和 `tests/fuzz/` 的
`Cargo.lock`，提交前分别运行 `cargo metadata --locked --format-version 1` 和
`cargo metadata --locked --manifest-path tests/fuzz/Cargo.toml --format-version 1`。随后执行
[质量检查与相关 feature 门禁](testing.md#质量检查)。

Bevy 的三个本地补丁、GPUI 原生平台行为和 Hakutaku 格式边界须随对应依赖单独复核。
Editor 的 `image` 仅请求 BMP/GIF/JPEG/PNG/TIFF/WebP，Media 图标仅请求 PNG；
不要为了方便恢复默认编码器集合。锁文件仍可包含上游可选依赖，实际依赖树须按目标与
features 查询，不能用锁文件包数推断运行时体积。
GPUI 的 macOS 依赖链仍含 `block 0.1.6` 的 `uninhabited_static` 未来兼容性警告；
当前 Rust 1.99 可构建，应随上游 Cocoa/Metal 绑定迁移处理，不新增本地 FFI 替代层。

- `CI` 每日 UTC 02:17（北京时间 10:17）仅审计依赖；每周一 UTC 03:17 另跑媒体安全。
  定时任务不编译桌面/Android 或发布 Editor，手动审计选择 `checks: dependencies`。
  GitHub 的定时任务可能延迟；长期无活动的公开仓库也可能停用 schedule，维护者须留意
  Actions 通知与任务状态。新的 RustSec 公告可让未改动的锁文件失败，旧绿灯不代表当前安全。
- `.github/dependabot.yml` 使用低噪模式：Cargo 关闭普通版本 PR，只提出分组安全修复；
  Actions 每月检查普通更新，合为一个分组 PR，普通更新同时最多 1 个，保持完整 SHA 固定。
  两个生态的安全修复各自分组，不受普通 PR 数量限制，也不等待每月检查。
  关闭自动 rebase 和自动合并，减少重复 CI；需要时手动更新分支并运行正常验收。
  仓库已启用 Dependabot 告警和安全更新；普通依赖升级由维护者按需要提出，仍须经过
  CI、许可审查与必要的运行验证。
- 桌面 CI、每日审计、手动 Build tday、Release Editor 与正式 Project 发布复用
  `check-dependencies` action；按实际发行的源提交执行完整的 locked/all-features 四项审计。
  审计失败先阻止后续编译/密钥恢复/上传；不放宽 deny.toml，也不重跑旧源码冒充修复。
- GLIBC 2.39 是发行合同，更新 runner、原生 SDK、Rust 或依赖时都不能静默抬高。
  宿主运行库保持安全更新；未来 24.04 runner 退役时，优先用受维护的 24.04 容器保留基线。
  提高最低系统要求需单独说明，并重新验收最终包。

### Hakutaku 0.2.0 / v2

资源包仅接受 Hakutaku v2。v1 没有兼容读取、旧密文复用或自动迁移；旧项目从原始
资源重新打包到全新输出目录，保留原 publisher identity，并同时分发新 Engine 与
新资源包。`KEINE_HAKUTAKU_RELEASE_FLOOR` 可设为上次发行序号加一；已有 v2
目录有变化时继续递增；无变化时可保留原序号，较低下限不会使其回退。该变量只影响资源发布，不改变 Save/IR。

wire layout 与块策略分别见锁定 Hakutaku 的 [FORMAT](https://github.com/maincoretech/hakutaku/blob/8d637d5629b84f99251fd445366892bdb3c7cf2b/docs/FORMAT.md)
和 [PERFORMANCE](https://github.com/maincoretech/hakutaku/blob/8d637d5629b84f99251fd445366892bdb3c7cf2b/docs/PERFORMANCE.md)。
Kēne 保留编译 Program、资源 allowlist、挂载根目录和 identity 注入的职责，不复制包格式规范。

Core/Pack 固定为 `=0.2.0`，Git revision 为
`8d637d5629b84f99251fd445366892bdb3c7cf2b`，Cargo.lock 同步固定来源；
检出项目即可构建，无需相邻的 Hakutaku 工作区。

### 离线保护的停止标准

比较范围是标准归档与已公开实现，不能将引擎名当作统一的加密等级：

| 对照 | 已核实机制 | 与当前 Kēne 的关系 |
| --- | --- | --- |
| Ren’Py 标准 RPA-3.0 | 资源原文写入；索引压缩，偏移/长度 XOR，恢复参数写在包头 | 单凭归档即可恢复；Kēne 还需从 Engine 恢复内容密钥，包另有 AEAD/发行签名保护 |
| krkr 标准 XP3、简单 XOR 扩展 | 原始/压缩段；额外保护由 extraction filter 提供，protected 标志本身不是加密 | Kēne 的密码与完整性保护高于无加密/简单 XOR 基线；XP3 不能代表所有商业保护 |
| krkr 定制保护，包括 CXDEC 变体 | 存在按种子生成运算、控制表和游戏专用参数的实现 | 没有匹配商业样本的对照实验，不能声称 Kēne 的逆向成本已超过这些方案 |

依据：Ren’Py [归档说明](https://www.renpy.org/doc/html/build.html#archives)与固定版本
[打包实现](https://github.com/renpy/renpy/blob/7585fc52d03a63528bf0085093921ea2c5b46da5/launcher/game/archiver.rpy)；
krkrz [XP3 读取实现](https://github.com/krkrz/krkrz/blob/fd5c4baa6a2ef5978db1bd043634351f48667daf/base/XP3Archive.cpp)；
GARbro 作者维护的 [简单算法](https://github.com/morkt/GARbro/blob/b09ee4570ccb1daf6ac56710ee8934dc0b8baeb0/ArcFormats/KiriKiri/CryptAlgorithms.cs)
与 [CXDEC 读取实现](https://github.com/morkt/GARbro/blob/b09ee4570ccb1daf6ac56710ee8934dc0b8baeb0/ArcFormats/KiriKiri/KiriKiriCx.cs)。
提取工具支持已知算法，不证明所有未知或新商业变体都可直接提取。

本地执行官方 Ren’Py `Archive` 类（仅替换 dict/list 兼容别名），生成自有的 3 文件、
32,801 字节样本，已仅凭 RPA 完整恢复；不是完整 Ren’Py GUI 或商业成品测试。
krkr 本次仅核查源码。证据在本地忽略目录 `target/offline-hardening/evidence/engine-comparison/`。
Kēne 两个本地发行样本仍被同一静态提取器恢复，见 [离线验证](testing.md#hakutaku-v2)。
不将不同样本的脚本耗时换算成强度倍数，也不把发行签名的防伪造能力算作防提取能力。

离线目标限定为超过标准归档/简单混淆、阻止直接通用解包；当前可在此停止追加混淆。
开源且完全离线的发行物包含完整解密能力，定向分析仍可恢复资源。
若目标改为达到特定商业保护的逆向成本，应先指定同平台样本和相同攻击条件再测量。

### 单机商业发行策略

默认采用现有离线资源加密与签名，通过商店销售；商业发行不以自建联网密钥服务为前提。
当前离线保护达到上节标准归档/简单混淆的目标后停止追加混淆，优先保证安装、更新、
存档兼容与正版使用体验。资源防提取和购买授权分别处理：整包复制运行不一定需要解包，
有效持有者也可能提取运行时明文，二者都不承诺绝对阻止。

Steam 版未来可按需要接入常规购买验证、成就和云存档，同时继续本地解密资源；
接 Steam 不代表必须启用下节的服务端发密钥方案。平台授权/DRM 也不自动提供资源保密，
其边界见 [Steam DRM 文档](https://partner.steamgames.com/doc/features/drm)。
面向无 DRM 渠道的发行须保持单机功能离线可用，参见 [GOG 发行要求](https://docs.gog.com/quality-assurance/)。

联网发密钥仅保留为可选的后续方向，待确有账号绑定、直接销售许可证或内容授权需求时，
再评估服务器维护、断网行为、售后与停服成本。0.16.3 不新增或修改 Rust 公共接口、CLI、
配置或网络协议，不添加 Steam SDK、授权占位实现或服务端；下节仅为待评估设计，
不构成已承诺兼容的接口合同，也不改变当前离线发行行为。

### 联网授权模式（保留方案，未实现）

保留现有 `offline` 发行路径；规划增加 `authorized`，区别在于最终发行物不含内容根密钥
或足以重建它的拆分材料。`authorized` 的身份凭据提供方先限定为 `steam_ticket` 和
`self_hosted`。两者使用同一内容授权合同，不新增包格式或通用插件框架。
以下名称是设计约定，尚无对应 CLI 参数、配置字段、SDK 或联网行为。

#### 信任边界与接入点

```text
可信启动配置 → Steam ticket / 自托管账号会话或许可证凭据
            → 授权服务核验身份与内容权益 → 内存中的内容密钥
            → HakutakuArchive::open_with_keys → open_hakutaku_archive
```

网络、凭据获取和等待/重试界面由宿主启动层负责；Core/Loader 不引入 Steam、HTTP 或 Bevy。
Loader 已有上述两个接入点，可以接收外部密钥并继续校验包、加载 Program。
`open_with_keys` 当前针对文件系统目录；Android 等平台的只读 source 路径还需对应的显式密钥入口，不能假定已覆盖。
实现阶段仍需新增宿主授权入口和发行模式分支；现有自动加载入口并不支持联网授权。

Engine 固定信任发行验签公钥。公开启动描述放在加密包外，包含协议版本、发行渠道标识、
Hakutaku project ID、release ID、内容 key ID、快照摘要、HTTPS 服务地址、提供方及可选 Steam AppID；
它必须内嵌或经过固定信任公钥验签，不能允许旁置文件任意改写凭据接收地址。
`config.yaml` 在加密包中，不能作为唯一授权启动配置。授权服务仅需内容密钥，不能持有发行签名私钥。

Steam 客户端取得 `GetAuthTicketForWebApi` 的异步结果，服务端通过
`ISteamUserAuth/AuthenticateUserTicket` 验证，再检查目标 AppID/内容的拥有权；
服务端依据验证结果确定 SteamID，不信任客户端填报的身份或本地 ownership 布尔值。
Publisher Web API key 仅留在服务端。自托管模式由同一服务验证账号会话或许可证凭据，
明确映射到内容权益；不把长期万能服务密钥放进游戏。
Steam 也需要开发者部署授权服务，ticket 本身不是内容密钥。
依据 [Steam 身份与拥有权](https://partner.steamgames.com/doc/features/auth)、
[票据核验](https://partner.steamgames.com/doc/webapi/ISteamUserAuth#AuthenticateUserTicket)及
[拥有权接口](https://partner.steamgames.com/doc/webapi/ISteamUser#CheckAppOwnership)。
[Steam DRM wrapper](https://partner.steamgames.com/doc/features/drm) 不能单独承担资源保密。

#### 内容授权接口草案

宿主调用语义为 `authorize(release, proof, nonce) -> ContentGrant | AuthorizationError`；
候选服务路由为 `POST /v1/content-grants`，仅通过验证证书的 HTTPS 传输，不跟随到任意主机的重定向。
实现前再固定序列化格式、大小上限与具体 Rust 类型，密钥类型不能实现普通日志输出。

| 合同 | 必需内容与语义 |
| --- | --- |
| 请求 | `protocol_version`、`release_id`、客户端随机 `nonce`、带提供方标签的 `proof`；Steam 为 ticket，自托管为会话/许可证证明 |
| 服务端映射 | 从受控发行记录解析 project/AppID/key/快照及权益要求；不能按客户端任意 key ID 发密钥；验证证明、绑定使用方并执行相应重放/限流策略 |
| 成功响应 | `grant_id`、`project_id`、`release_id`、`key_id`、`snapshot_digest`、原 `nonce`、`issued_at`、`expires_at`、32 字节内容 `root_key`；全部与可信发行记录一致 |
| 客户端校验 | 严格核对版本、长度、nonce、发行绑定和有效期，再以固定公钥开包；验证实际快照匹配，密钥不落普通磁盘缓存或日志，尽早清理临时副本 |
| 失败 | 区分取消、暂时不可用、未登录/凭据无效、无权益、发行不匹配/协议不支持；有界超时与重试，拒绝或失败不能自动退回内嵌密钥 |

建议首版每次启动授权、挂载成功后本次运行可断网，不做长期离线密钥缓存；该策略仍待实现前确认。
首次激活后永久离线意味着在本地保存可恢复解密材料，保护边界会重新接近离线模式。
`expires_at` 只限制正常客户端接受授权及服务端后续发放，不能使已提取的根密钥在密码学上过期。
当前 Hakutaku v2 从根密钥与 project ID 派生内容密钥；服务端按 release 限制发放，不等于根密钥
只能解密该 release。同根密钥/同 project 的其他可取得内容也受泄露影响。

离线与联网渠道不得共用内容根密钥；若相同资源另有离线发行，攻击者仍能从离线版取得资源。
不同 key epoch 需要实际轮换并重新加密，不能仅更改 key ID；按章节独立授权还需另评估包与密钥边界。
有效持有者运行时仍可截取密钥或明文，联网收益是让未获授权者仅凭安装包无法静态恢复全部解密材料。
服务器不可用时的发行生命周期/停服处理必须在上线前决定，不能以隐蔽离线后门解决。

实现验收需分别覆盖：最终发行物不含完整解密材料；有效/无效凭据与权益；跨项目、错版本、
过期/重放响应和断网行为；两种提供方的真实服务集成；最终包的内容与原生运行验收。
本节仅定义方案，尚未完成上述联网验收，也未改变当前离线发行行为。

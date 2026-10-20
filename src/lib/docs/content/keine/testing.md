# 开发与验收

本文维护当前检查入口、证据口径和已测性能，不作为开发日记。
职责与格式见[架构](architecture.md)，构建/签名见[发布](release.md)，设备操作见 [Android](android.md)。

## 开发环境

- 使用根目录 `rust-toolchain.toml` 的 Rust 1.99.0、Cargo.lock 和本地 Bevy 补丁。
- macOS 需要 Xcode Command Line Tools；`video-native` 使用系统 AVFoundation。
  `video-ffmpeg` 另需 FFmpeg 开发库和 pkg-config。`.cargo/config.toml` 的 `dev`/`perf` 同时启用两个视频 feature，macOS 优先 native；只测 native 时显式传 feature。
- Linux 需要 ALSA、Fontconfig、udev、Wayland、XKB 开发库；FFmpeg feature 另需
  avcodec/avformat/avutil/swscale/swresample。Windows 使用匹配架构的 FFmpeg vcpkg SDK。
  可复用的安装清单以 [`setup-video`](../../.github/actions/setup-video/action.yml) 为准。
- Android 的 SDK/NDK/JDK 与构建步骤由 [Android guide](android.md) 维护；不启用视频 feature。
- Editor Preview 启动已构建的 Engine，不自动执行 Cargo。开发时 `target/debug/editor`
  和 `target/debug/keine` 应来自同一源码；覆盖路径及发现规则见 [Editor](editor.md#engine)。

macOS 无需 FFmpeg SDK 的最小开发入口：

```sh
cargo build --locked -p keine --bin keine --features video-native
cargo editor projects/tday
cargo run --locked --bin keine --features hot-reload,video-native -- dev tests/fixtures/native-smoke
```

`projects/tday` 已封存；仅用于只读校验或副本实测，不再追加测试剧情。
固定回归使用 `tests/fixtures`，临时素材/报告放 `target/`，不提交密钥、存档或测量二进制。
跑分采集器及其测试放在 `tests/bench/runtime`；素材生成器随对应 fixture/视频测试维护。
`dev/scripts` 只保留构建、发行和 CI 使用的工具。

## 质量检查

修改先运行受影响 owner 的回归；合并前完成工作区及受影响 feature 检查。
下列全功能门禁需要对应平台的原生 SDK，不能将缺少 SDK 当作功能回归：

```sh
cargo fmt --all -- --check
cargo check --workspace --locked --all-targets --all-features
cargo clippy --workspace --locked --all-targets --all-features -- -D warnings
cargo test --workspace --locked --all-features
cargo test --workspace --locked --no-default-features --features publisher
```

按变更选择补充检查；不同配置保护不同入口，不因名称相似而删减：

| 变更 | 补充门禁 |
| --- | --- |
| Loader / 工程 / Publisher | native-smoke validate；项目输入变更时验证对应项目；pack/bundle 合同 |
| 序列化 / IPC / 存档 | 版本、长度、尾部字节、损坏输入、回滚与跨进程边界 |
| 视频 / 原生句柄 | 对应后端 feature、实际媒体验收；修改 GPU 导入时显式运行 Metal 回归 |
| Editor 源码 / 文件操作 | 投影、格式化、撤销、外部冲突、恢复、路径及 instance 集成测试 |
| 打包 / 图标 / 声明 | `tests/packaging`、`verify-icons.py`、实际目标产物验证 |
| 依赖 / feature / 本地补丁 | locked/all-features cargo-deny、受影响平台链接与运行；独立 fuzz 锁文件 |
| 纯文档 | 检查链接/锚点、源码路径、版本与命令；无须重跑性能套件 |

常用专项入口：

```sh
cargo run --locked --bin keine -- validate tests/fixtures/native-smoke
cargo run --locked --bin keine -- validate projects/tday
cargo check --locked -p keine --tests --no-default-features --features video-native
cargo check --locked -p keine --no-default-features --features ui-sounds,video-ffmpeg
python3 -m unittest discover -s tests/packaging -p 'test_*.py'
python3 dev/scripts/verify-icons.py
cargo deny --locked --all-features check advisories licenses bans sources
cargo metadata --locked --manifest-path tests/fuzz/Cargo.toml --no-deps --format-version 1 > /dev/null
```

macOS 的 IPC/系统 Trash 测试可能被本地沙箱拒绝（`Operation not permitted` /
`PermissionDenied`）。在允许本地 socket/系统文件服务的环境重跑受影响测试，不能跳过后报通过。
显式 `ignored` 的 GPU/性能测试也不能计作工作区测试已覆盖。
不以测试数量作为目标：同规则参数边界用表驱动；独立故障保留独立回归，失败信息包含案例名。

## 测试入口与 CI

| Owner | 入口 |
| --- | --- |
| Core / Loader / Runtime / Editor 单元回归 | 各 Rust 模块 `#[cfg(test)]` |
| 跨进程 Editor–Engine | [`tests/authoring/process.rs`](../../tests/authoring/process.rs) |
| 视频解码/回绕/损坏输入 | [`tests/video/acceptance.rs`](../../tests/video/acceptance.rs) |
| Python 包目录、图标、许可与 Engine discovery | [`tests/packaging`](../../tests/packaging/) |
| CPU 微基准与本地采集器 | [`tests/bench`](../../tests/bench/) |
| WebP 边界 fuzz | [`tests/fuzz`](../../tests/fuzz/)（独立 workspace） |
| 固定项目与媒体 | [`tests/fixtures`](../../tests/fixtures/) |

| Workflow | 责任与触发 |
| --- | --- |
| [CI](../../.github/workflows/ci.yml) | push/PR；依赖/打包合同先行；桌面三平台、Android 与相关媒体安全并行；每日依赖审计、每周媒体安全；手动可选择检查范围 |
| [Release Editor](../../.github/workflows/editor-release.yml) | main 的 CI 桌面检查通过后在同次运行内调用，或手动；同 SHA Editor 与 Preview |
| [Build tday](../../.github/workflows/release.yml) | 仅手动 tday 四平台打包，保持无额外参数 |
| [Release Project](../../.github/workflows/project-release.yml) | 游戏仓库按完整 Engine SHA 调用；当前 Linux x64 |

纯 README、`dev/docs`、AGENTS 与 Dependabot 配置变更跳过桌面/Android 全编译。
Android 另跳过仅修改 `crates/editor/**` 的提交；Core、Loader、Authoring、Engine、
共享资源、根依赖清单或锁文件变化仍触发检查，手动入口保留。
benchmark CI 已取消；现有本地基准与正确性测试保留。发布缓存、ABI、密钥与签名规则统一见[发布指南](release.md)。

CI 将格式、打包合同、工作流语法及依赖检查前置。Linux 跑完整工作区测试，
直接复用该调用生成的视频验收工具，不再另编一组平台测试。视频验收必须在
publisher-only 测试之前运行，避免同名工具被无视频后端的构建覆盖。
macOS/Windows 在同一 Cargo 调用中运行 Engine/Editor lib、Editor instance 及
`bevy_render` display 定向回归；视频工具按相同依赖组合预编译后直接运行。
publisher-only、无音频与规范发行 feature 检查仍独立保留。
桌面三平台的 dev/test 优化等级统一沿用 Cargo.toml，当前为 `opt-level=1`；
CI 只关闭调试符号，保留调试断言和溢出检查，不单独覆盖优化等级。

### 视频与 Metal 专项

已有视频 fixtures 可直接使用；只有重建夹具时才运行 `bash tests/video/generate-fixtures.sh`。
选择目标平台的后端，macOS `video-native`，Windows/Linux `video-ffmpeg`：

```sh
cargo run --locked --no-default-features --features publisher,ui-sounds,video-native --bin keine-video-acceptance -- tests/fixtures/video/playback.mp4
cargo run --locked --no-default-features --features publisher,ui-sounds,video-native --bin keine-video-acceptance -- --expect-error tests/fixtures/video/damaged-header.mp4
# macOS 实际设备；管线输出与 HAL 设备归属，不是整游戏视觉验收。
cargo test --locked --lib --features publisher,video-native,hot-reload on_gpu -- --ignored
cargo test --locked --lib --features publisher,video-native,hot-reload metal_cache_follows_replacement_device -- --ignored
```

不要把 `video-native` 的 no-audio 编译检查替换为默认音频构建；两者覆盖不同边界。
Fuzz/ASan 的工具链、时间预算和调用以 Media Safety workflow 为准，不纳入每次 UI/文档修改的常规循环。

## 运行与发行验收

### 脚本推进与恢复行为矩阵

以下使用现有 Core/Runtime 回归，不启动 GPU 或扩展性能套件：

| 行为 | 回归入口 |
| --- | --- |
| Flow 条件真/假、语法错误、缺失变量、除零 | Core `flow_conditions_distinguish_false_from_evaluation_failure` |
| 运行时错误定位在返回标题后保留 | Preview `checkpoint_and_failure_positions_survive_transient_presentation_and_title_cleanup`，由真实 Flow 错误生成诊断 |
| 18 类瞬态动作及 Flow/SpriteVisual 包装，前置检查点与 Save v11 往返重放 | Driver `transient_action_families_round_trip_the_pre_action_save_boundary` |
| 点击与自动到期同帧，只跨过一个等待点 | Tick `playback_manual_and_automatic_advance_cannot_cross_two_yields_in_one_frame` |
| 加载/菜单期间取消跳过并消费自动按键释放，解除遮挡不误推进 | Tick `playback_loading_and_menu_gates_do_not_swallow_auto_release` |
| 对白、选择、输入恢复与执行上限 | Driver `normal_yield_and_end_share_one_host_policy`、`every_resume_source_*` |
| 阻塞演出自然结束，后端完成发生在加载/菜单期间 | Tick `settled_presentation_clocks_resume_without_player_input`、`playback_backend_completion_resumes_after_the_loading_or_menu_gate` |
| 可跳过/不可跳过/循环视频 | Tick `playback_skip_video_respects_skippable_and_looping_flags` |
| 热重载成功、失败、过期候选、恢复时钟和检查点 | Reload `hot_reload_discards_invalid_and_superseded_candidates_without_touching_live_state`、`playback_hot_reload_resets_same_cursor_clocks_and_checkpoint` |
| 已接收文档 revision 与实际应用 revision 不同 | Authoring `live_reload_rejects_errors_tracks_applied_revision_and_keeps_noop_state` |

这些验证覆盖逻辑推进、持久化和诊断位置，不代替实际视频后端、跨平台输入或画面验收。
本轮在 `ddc9669` 基础工作区、macOS arm64 上完成 fmt、全功能工作区 check/Clippy/tests
（1131 passed、25 ignored），以及 `--no-default-features --features publisher` 的 Engine/tests check；
日志为 `target/architecture-audit-*.log`。本轮未重打应用包或进行设备画面验收。

### 原生与发行证据

静态检查、构建、单元/集成测试、包验证和真实交互是独立证据。每次验收记录：
源码 SHA、features/profile、产物摘要、平台/设备/后端、实际覆盖项和未测项。

- Editor：中文 IME、Text/Blocks/Inspector 同步、撤销/保存/恢复、资源导入、Preview 启停与错误定位。
- Engine：对白/分支、长演出与跳过、存读档/回退、菜单模糊/过渡、音视频和资源恢复；黑幕须区分作者演出与阻塞。
- 显示：正常/高 DPI、缩放/全屏、多屏与屏幕移除；Windows DX12/Vulkan/GL、Linux X11/Wayland 与实际可用 GPU 后端分别记录。
  不要求无 Vulkan 驱动的机器完成 Vulkan 测试；必须覆盖其可用回退路径。
- Android：安装版本和来源、前台/后台恢复、触摸/Backlog/滑块触感、系统关闭触感后的行为；详见设备指南。
- 发行包：完整解压、无关 cwd 启动、动态库闭包、只读资源/用户数据隔离、升级身份及对应平台签名验证。
  macOS ad hoc 包不是 Developer ID 公证通过。

原生视觉验收直接操作应用；不以截图 hook、构建成功或 headless tests 代替。
维护者负责可重复的构建/合同与错误定位；作者确认实际画面、交互、听感及触感。
当前 Windows/Linux 游戏运行态仍需对应设备证据，不用 macOS 结果推定。

### 项目设置与离线音频校准

`2ec8086` 基础工作区，macOS arm64 / dev all-features：工作区 check、Clippy、测试、
无音频 feature check 与 cargo-deny 通过。项目设置局部 YAML、增益边界、元数据保留、
挂载路径与发布配置往返、试听 IPC 拒绝非法增益有回归；实际 FFmpeg 正弦/静音分析
通过显式 `offline_measurement -- --ignored` 验证，原始文件字节不变。

原生 Editor 在 `target/creator-tools/project` 副本验证中央 Project 标签、标题/CG 拖动排序
应用与撤销、短预览面板滚动、音频分析、校准试听进入播放状态、增益应用/重置及保存。
Editor/Engine 配对 macOS 包签名与 native-smoke 验证通过；试听协议现为 v12，需配对更新。
日志位于 `target/creator-tools/`。未做 Windows/Linux 原生交互、Android 新包、主观听感
或多轨混音峰值验收；这些结果不作为播放性能增益结论。

0.16.5 本机配对更新使用同次 dev/all-features 构建，包含最终增益小数精度修正。
重新打包及安装后签名/native-smoke/版本检查通过；5 项 authoring-process 与 16 项
打包合同通过，已安装 Editor 的音频试听进入播放状态。安装摘要与日志在
`target/closeout-0165/`，旧应用包保留为本地备份。

Editor 表单与试听 UI 细化在 `89eb662` 基础工作区完成：fmt、工作区全功能 check/Clippy
及测试通过（1121 passed、25 ignored；系统 Trash 权限失败后在沙箱外复验），最终焦点修正
另跑 Editor `app::` 回归（94 passed、4 ignored）。同次构建的 macOS Editor/Engine 包通过
签名与 native-smoke。原生窗口验证背景选择/预览、工程内图标选择、字段错误、排序落点、
固定操作区、Apply 后留在表单并用 ⌘S 保存，以及音频 A/B 状态、建议增益应用/保存、
重复应用禁用和窄面板换行。记录与截图在 `target/editor-ux-refinement/`；测试窗口已关闭。
本次未安装替换系统应用，也未验证 Windows/Linux 原生界面或主观听感。
后续将常用操作改为图标按钮并保留悬停提示，背景/图标选择器移至输入框旁；
fmt、全功能 Clippy、Editor `app::` 回归和配对打包/native-smoke 通过。
该版最初原生点击受 Computer Use `noWindowsAvailable` 阻塞；后续同一工作区原生窗口已可操作。

左栏分组、表单上下文与列表交互细化：全功能工作区 check/Clippy、全量测试通过
（1123 passed、25 ignored；系统 Trash 用例沙箱外复验），最后的 UI 修正另跑 Editor
`app::`（96 passed、4 ignored）。新增回归覆盖首次/重复表单事务保留页签和焦点、
Unicode 选区映射；现有滚动回归补验表单修改后 Text 选区和滚动不变。
原生 macOS 验证底部菜单、左栏焦点高亮、项目 Apply/⌘S 留在表单、资源右键 Preview、
CG 拖动及应用后立即再次拖动。拖动测试发现事件回调误调用绘制阶段动画 API，修正后复验通过。
最终配对包位于 `target/editor-ux-refinement/framework-verified-package/`，签名/native-smoke 通过；
日志与截图 `framework-*` 保留在同目录上级，测试窗口已关闭。未替换系统应用；
长列表边缘滚动、拖动中 Esc、Windows/Linux 原生交互仍需单独人工验收。

Settings 收敛为 Project / Extra / Editor：fmt、工作区全功能 check/Clippy 及测试通过
（1125 passed、25 ignored）；最终 Editor 回归 256 passed、8 ignored。
新增偏好持久化/边界与写入失败回归，既有概览换行用例覆盖 10/13/18/24 px；bench 调用同步签名，未额外跑分。
原生 macOS 验证欢迎页齿轮与启动后 ⌘,、输入框/源码内 ⌘,、跨标签保留草稿、
重启恢复偏好、源码字号即时更新、概览隐藏/恢复、Restore layout；测试偏好恢复默认，窗口关闭。
测试包 `target/editor-ux-refinement/settings-final-package/` 签名/native-smoke 通过；
日志和实拍 `settings-*` 位于同目录上级。未替换本机安装、未测 Windows/Linux 原生交互。

Editor 三语界面：fmt、工作区全功能 check/Clippy 及测试通过（1127 passed、25 ignored）。
回归覆盖三语词表完整性、占位符一致性、插入内容原样保留，以及语言偏好往返和旧配置兼容。
原生 macOS 验证三语即时切换、设置/工作台/右键菜单布局、中文区块搜索、重新载入提示及重启记住语言；
原有源码和项目名称保留。测试草稿已丢弃，语言恢复原来的英文，窗口关闭。
`target/editor-i18n/package/` 配对测试包签名/native-smoke 通过；日志为 `target/editor-i18n-*.log`，
实拍为 `target/editor-i18n/settings-zh-CN.png`。未替换本机安装；Windows/Linux 原生布局未验收。

0.16.6 收尾：同次 dev/all-features 构建的 Editor/Engine 已配对更新到原本机应用位置，
签名、版本与 native-smoke 校验及 5 项 authoring-process 测试通过，安装后设置页原生启动正常。
安装摘要、旧包备份和日志位于 `target/closeout-0166/`；此本机验证不代表跨平台发行包验收。

### 错误反馈与大字号

在 `fc71d02` 基础工作区上，macOS / Metal / dev `video-native` 原生窗口验证：
最大字号的三行对白与五行中英混排段落完整显示，文本框向上扩展，末行与底部操作区分离；
长错误提示自动换行且确认按钮可见。临时工程目录取消写权限后，保存失败弹出提示，
恢复权限后同一槽位重试成功。测试只改 `target/ui-readability-acceptance/` 中的副本。

手机交互已由用户明确人工验收通过，不重复设备操作；本批新改动未重新构建 Android 包，
也未补做 Windows/Linux 实机、极长段落分页或全语言原生布局验收。
新增提示覆盖简中/繁中/日文/英文。设置与鉴赏的损坏/超限原件保留、无法保留时拒绝写入，
以及提示排队不覆盖确认框均有回归测试；格式版本不变。
fmt、工作区 all-targets/all-features check/Clippy、all-features 测试与
no-default-features + publisher 测试通过；首次沙箱内测试仅废纸篓权限失败，沙箱外全量复验通过。
本机命令和日志保留在 `target/ui-readability-acceptance/validation/`。

### 0.16.0 已有证据

在 `83b00c2` 源码上整理文档时，macOS arm64 / Rust 1.99.0 复跑通过 fmt、
workspace/all-targets/all-features check/Clippy 和工作区测试：**1096 passed / 24 ignored**。
先前的 1097 汇总重复计入一次 Editor instance 子进程输出，这里按外层测试入口修正。
系统 Trash 受沙箱阻止后，在沙箱外完整重跑通过。Native Smoke 为 1 scene / 1 action，
tday 为 13 scene / 2626 action，均 0 warning。日志在 `target/documentation-audit/`。

原 v2 接入另有 Loader 196 项、Publisher 29 项专项及完整 cargo-deny 记录；
AVFoundation 与 FFmpeg 验收入口覆盖文件系统/v2 包解码、回绕与损坏头拒绝。
这些专项未因文档修改重新执行，原始命令/日志在 `target/performance/quality-review/`，含 `v2-*`。

2026-10-14 核对该 SHA 的 Actions：
[CI Android](https://github.com/maincoretech/keine/actions/runs/38443828921) 和
[CI Media Safety](https://github.com/maincoretech/keine/actions/runs/38443828943) 成功；
[CI Desktop](https://github.com/maincoretech/keine/actions/runs/38443828831) 已取消，不能登记为通过。
其 macOS job 冷缓存下切换依赖组合，四次编译 Bevy，最后在发行 feature 检查时达到
60 分钟上限。工作流修复统一平台构建组合并将 macOS 上限调至 90 分钟；本机按新命令
验证 **59 passed / 1 ignored**、视频验收、no-audio/shipping check、14 项打包合同与
actionlint 通过。45 个 Bevy 库产物在后续测试中复用，仅额外编译必要的测试程序；
命令、原 CI 时序及 Cargo artifact 日志在 `target/ci-timeout/`。进一步去掉 Linux
重复平台构建前，复跑全量工作区仍为 **1096 passed / 24 ignored**，确认该调用已生成
可直接验收的视频工具，Android normal/build 依赖不含 Editor；记录在 `target/ci-simplify/`。
新工作流尚未远端复跑，本机耗时不能作为 hosted runner 的加速比例。

这些状态不证明新版游戏的三平台运行、Moto 操作或正式发行包已验收。

### Editor 源码反馈与替换验收

0.16.1 工作区的 Preview 协议 v11 与搜索替换，在 macOS arm64 上执行：

```sh
cargo fmt --all -- --check
cargo check --workspace --offline --locked --all-targets --all-features
cargo clippy --workspace --offline --locked --all-targets --all-features -- -D warnings
cargo test --workspace --offline --locked --all-features
cargo test --workspace --offline --locked --no-default-features --features publisher
cargo build --workspace --offline --locked --all-features --bins
target/debug/keine validate tests/fixtures/native-smoke
```

检查覆盖重载的保留/重建/拒绝、诊断位置与旧位置清除，以及 Unicode/CRLF、选择性替换、
空替换、整文档陈旧检查、打开文件后的再次核对、只读兼容输入、取消与结果/内存上限。
Trash/IPC 测试在沙箱外执行。原始日志为 `target/reload-review/editor-next-*.log`。

本机配对应用以 `target/editor-next/project` 的 Native Smoke 隔离副本完成原生操作：
Project/Current file 搜索、逐项排除、跨文件未保存替换、一次撤销/重做；Preview 启停、
注释保留状态、畸形表达式的错误提示与点击定位、修正后的入口重载，以及草稿通知不覆盖
Preview 状态。没有修改 tday。未将这些操作视为 Windows/Linux、完整游戏画面或长时内存验收。

随后仅将工作区升版至 0.16.2，重新通过 fmt、all-targets/all-features check 与 clippy、
all-features 工作区测试，以及主工作区和独立 fuzz 的 locked metadata 检查。
对应日志为 `target/reload-review/editor-0162-*.log`；下方微基准未因升版重跑。

0.16.2 的文档未保存提示、保存失败通知、替换计数、快速定位/位置历史与最近工程改进，
已通过 fmt、all-targets/all-features check、Clippy `-D warnings`、all-features 工作区测试
（1107 passed / 24 ignored），以及 native-smoke validate。新增边界覆盖 Unicode 场景过滤、
结果/历史上限、历史分支、最近工程标题回退和移除记录不删文件。回收站测试在沙箱外复跑通过；
命令与结果见 `target/reload-review/editor-ux-*.log`。macOS 原生验收发现并补齐工作台的
Dialog/Notification 渲染层，随后重跑 Editor Clippy、构建与本机配对打包。
在同一隔离副本确认：最近工程标题/短路径/失效标记与移除记录、工具栏和 ⌘P 定位、
`@` 场景过滤/回车/Escape、⌘[/⌘] 恢复文本选区/滚动与 Blocks 选中项、未保存标记、
保存冲突同时显示通知与 Output、替换计数和撤销。Preview 启动后，定位到另一源场景仍保持
原运行位置；临时长文档与保存冲突探针均已恢复。Windows/Linux 与输入法组合键尚未实测。

Inspector 层级与控件状态补齐后，同机通过 fmt、workspace all-targets/all-features
check/Clippy、all-features 工作区测试（1108 passed / 24 ignored）及 native-smoke validate。
最终文本高级区域合并后，另跑 Editor Clippy、lib 测试（247 passed / 7 ignored）、构建和
配对应用打包；系统 Trash 测试按上述要求在沙箱外通过。日志为
`target/reload-review/editor-p34-*.log`。macOS 原生操作确认文本高级项只有一个入口、
显式参数保持可见、镜头参数单位、效果禁用原因、键盘展开/收起，以及资源选择和 Block
插入面板取消后的焦点返回；发现并移除了 Inspector 内重复的资源弹层挂载，修复辅助功能
节点重复导致的退出。操作未写入源码，临时镜头测试脚本已恢复；本机配对应用保持 0.16.2。
这些结果不包含 Windows/Linux 原生交互、屏幕阅读器完整验收或性能增益结论。

有界测量复用已有微基准；Apple M5 Pro / 24 GiB / macOS 27.0.1，dev opt-level=1：

```sh
cargo test --workspace --offline --locked --all-features block_preparation -- --ignored --nocapture
cargo test --workspace --offline --locked --all-features text_rebuild -- --ignored --nocapture
cargo test --workspace --offline --locked --all-features browser_cache -- --ignored --nocapture
```

| 路径 | 本次结果 |
| --- | --- |
| 5,000 Block 准备 | 未缓存参考 0.331243 ms；现有缓存 0.000193 ms |
| 5,000 行 Text 概览 | 旧主线程参考 42.916 ms；现有后台生成 22.955 ms；改宽 23.082 ms |
| 5,000 资源浏览准备 | 现有缓存 0.000016 ms |

表中的参考由既有基准内部执行，不是本次 P1/P2 修改前后的对比；不包含整窗绘制、
输入到呈现延迟或长期 RSS。此次没有改动这些性能路径，也没有据此宣称新增提速。

## 性能测量方法

先定位实际瓶颈，再固定输入/版本/工具链/功能/构建配置、分辨率、后端和前后台状态做前后对照。
交替顺序复测；保留不利结果、超时、窗口切换和排除原因。输入构造、I/O、初始化、释放是否计时必须说明。
原始命令、源码/二进制与输入哈希、逐轮结果保存在对应 `target/` 目录；目录是本机证据，干净检出不会自带。

- CPU 100% 为一个逻辑核心；按真实采样间隔差分，不把 Mach tick 直接当 ns。
- RSS、physical footprint、Metal 资源分配、活跃堆字节分别报告，不相加，也不将 cache budget 当作进程上限。
- GPU 每帧执行时间、进程累计 GPU 时间占比、整机 GPU 利用率、呈现间隔和输入延迟是不同指标。
- Fifo/限帧下 FPS 相同不能证明 CPU/GPU 成本相同；不支持的计数留空，不写零。
- 微基准、dev GPU 短测和 release 游戏验收分别记录；不以关闭模糊、降低分辨率或更换素材宣称等画质优化。
- 跨引擎比较须对齐输入和实际绘制路径。原始包素材范围、SDK、符号不同，包体积不是等内容排名。

### 本地完整套件

只在需要平台全覆盖时运行 `bundle --benchmark`；普通优化优先定向复测。
[`native-benchmark`](../../tests/fixtures/native-benchmark/README.md) 为桌面共同输入，
包含 71 个作者场景和运行/分辨率对照，共 78 个必测负载。
预热/采样之外还有子进程初始化、首帧与退出开销。当前 supervisor 限制整套 30 分钟，
单次启动/render 60 秒、I/O 120 秒；超时保留部分报告并返回 INCOMPLETE，不把低帧率判作失败。
完整结果必须为 **78 completed / 0 missing / 0 failed**，正常模式还须有前台样本。
Android 为 73 个支持项、5 个明确视频跳过项，回传步骤见 [Android benchmark](android.md#完整-android-benchmark-与-adb-回传)。

```sh
cargo validate tests/fixtures/native-benchmark
# 使用隔离的测试 identity；不要复用正式游戏的签名身份。
cargo bundle tests/fixtures/native-benchmark --output target/native-bench --benchmark
# 运行实际生成的 benchmark 目录内的 executable，完整报告写到包旁。
python3 tests/bench/runtime/profile-runtime.py --report /path/to/keine-benchmark-report.txt --output target/native-bench-report
```

`--benchmark` 输出目录规则以命令报告为准；包中 collector、符号和标记位于 `lib/`。
无须 Python 即可跑整套；额外调用栈采集需要 Python 和平台 profiler。
短测示例（macOS native；其他桌面换为 `video-ffmpeg`）：

```sh
cargo run --locked --profile profiling --no-default-features --features ui-sounds,startup-metrics,video-native --bin keine -- perf tests/fixtures/native-benchmark --timeline bench_particle_layers_768 --window 1920x1080 --mode continuous --seconds 10 --raw
```

## 已测性能与复现记录

以下是对应版本/工作区的历史测量，不是当前版本的性能承诺。
完整旧记录（包括未采纳实验和历史验收）固定在
[83b00c2 的测试文档](https://github.com/maincoretech/keine/blob/83b00c2091bb447f40bf8d262cc94165b52346df/dev/docs/testing.md)；
当前指南只保留可用的测量方法、主要结果与限制，不继续累积阶段待办或历次测试数量。

### 引擎执行、加载与空帧

0.16.0 审查期间，同一 Apple M5 Pro / 24 GiB / macOS 27.0.1、Rust 1.99.0 和锁文件，构造输入在
计时外。列表 length/index 原先先复制整个 Array；现在借用变量或字面量，仅复制
索引选中的返回值，计算表达式、错误顺序与深度限制保留。场景加载使用 BTreeMap
Entry 直接移动 LoadedScene，覆盖时照常追加先前路径诊断。

```sh
cargo bench --locked --offline -p keine-core --bench script-runtime -- eiyashou_list_read --sample-size 30 --warm-up-time 0.3 --measurement-time 1 --nresamples 1000 --noplot --save-baseline project-before
cargo bench --locked --offline -p keine-loader --bench program-load -- program_load/parse_and_build --sample-size 20 --warm-up-time 0.3 --measurement-time 1 --nresamples 1000 --noplot --save-baseline project-before
# 各自只应用对应实现修改后，使用同一命令，将末尾换为 --baseline project-before。
```

Criterion mean 点估计：

| 输入 | 前 → 后 |
| --- | ---: |
| 65,536 项整数列表 length | 89.353 µs → 12.476 ns |
| 65,536 项整数列表 index | 89.765 µs → 20.132 ns |
| 十万条 WebGAL Comment 的加载、解析与 Program 构建 | 29.610 ms → 28.760 ms |

Loader 变化约 -2.87%，95% 区间为 -4.16% 至 -1.63%；列表结果只代表已有列表的
只读查询，不代表构造、修改数组或全部 VM 指令吞吐。Loader 使用已有历史基准，
计时包含热文件读取；没有借此扩大 WebGAL 语义。原始 Criterion 数据、日志、
改前源码及 `engine-results.json` 保留在 `target/performance/quality-review/`。

`idle_host_and_audio_sync_preserve_state_change_detection` 在真实 ECS 系统链中计数：
10 个无事件更新的 GameState 变更通知从 10 降为 0；随后实际 autoplay 事件仍只消费
一次。前后命令均为 `cargo test --locked -p keine --lib --all-features idle_host_and_audio_sync_preserve_state_change_detection -- --nocapture`，
日志为`target/performance/quality-review/` `idle-notifications-before.log` / `idle-notifications-after.log`。
这项是通知计数回归，以上均不是游戏 FPS、GPU 或整机功耗测量。

### 对白标记扫描边界

渲染端 `textbox` 也改为复用 Core 的 `rich_text_spans`，删除第二套逐字符扫描；
编译后留下的 `[wait]` 拼写继续按字面渲染，换行/ruby/style 合同保留。颜色复用
[Bevy Srgba::hex](https://docs.rs/bevy/0.19.1/bevy/color/struct.Srgba.html#method.hex)，
保留原有 6/8 位格式，拒绝 Unicode 非十六进制输入及 NaN/inf 字号/透明度。
定向测试先复现 Unicode 切片 panic 和 NaN，再验证修复；64 KiB 三种畸形输入的
单次 CPU 耗时从约 695/516/125 ms 降至约 0.097/0.017/0.860 ms。
这是测试配置下的边界探针，非统计基准或帧耗时；原始命令/结果为`target/performance/quality-review/`
`commands.txt`、`textbox-before.log`、`textbox-after.log`。

`runtime/text.rs` 的共享 tokenizer 原先对连续未闭合 `[`、未闭合样式参数和
标签尾部空白重复扫描后缀；Editor 的 wait 标记与运行时对白编译都调用它。
现在没有 `]` 时整段保留为文字，没有 `)` 后停止搜索样式尾部；无效嵌套标签
直接保留到最后一个仍可能开始 wait 的 `[`。不引入解析依赖，保留文字、样式、
Unicode 字符位置及 wait 字节范围；长无效输入和后续合法 wait 有回归覆盖。

基线为 `b5ac7eb` 加相同的 `script-runtime` bench；Apple M5 Pro / 24 GiB /
macOS 27.0.1，两侧都用 Rust 1.97.1、原锁文件中的 Core 依赖、Cargo bench 优化配置。
对照在工具链/依赖更新前完成，不把 Rust 1.99 的变化混入结果。测量公开的
`inline_waits(...).count()`，输入构造在计时外；20 样本，正常输入另复测 30 样本。

```sh
cargo +1.97.1 bench --locked --offline -p keine-core --bench script-runtime -- dialogue_markup --sample-size 20 --warm-up-time 0.2 --measurement-time 0.5 --nresamples 1000 --noplot --save-baseline quality-before
# 只修改 tokenizer 后，使用同一命令并将末尾换为 --baseline quality-before。
cargo +1.97.1 bench --locked --offline -p keine-core --bench script-runtime -- 'dialogue_markup/(plain|styled_waits)' --sample-size 30 --warm-up-time 0.3 --measurement-time 1 --nresamples 1000 --noplot --baseline quality-before
```

以下是 Criterion mean 点估计；三种输入规模均保留原始值：

| 输入 | 前 → 后 |
| --- | ---: |
| 65,536 个未闭合 `[` | 48.967 ms → 1.513 µs |
| 65,536 个 `[` 加未闭合参数，共约 128 KiB | 144.762 ms → 4.644 µs |
| 65,536 个 `[` 加同样数量的尾部空白与 `]` | 2,053.264 ms → 69.771 µs |
| 16,384 次 `[a](`，共 64 KiB | 11.896 ms → 145.174 µs |

正常富文本/wait 复测均值变化约 +0.3–2.1%，最大档 56.578 → 57.745 µs；
保留这一常见路径成本，不宣称普遍提速。纯文字没有测得退化。原始命令、日志、
两侧 tokenizer、bench 和统计位于 `target/performance/quality-review/`。
这是暖输入 CPU 扫描证据，不代表整个 Editor、完整对白编译、GPU/FPS 或其他平台。
上述旧工具链命令须在对应的升级前源码/manifest 上重现，当前 MSRV 已为 1.99.0。

### 热重载与阻塞查询

0.16.0 工作区，Apple M5 Pro / 24 GB / macOS 27.0.1，Rust 1.99.0、原 Cargo bench
优化配置。共享阻塞规则前后同一输入、30 个样本；不含 Inspector 字符串构造或渲染。

```sh
cargo bench --offline --locked -p keine-core --bench script-runtime -- presentation_blocked --sample-size 30 --warm-up-time 0.3 --measurement-time 1 --nresamples 1000 --noplot --save-baseline reload-before
# 修改后原命令将 --save-baseline reload-before 改为 --baseline reload-before。
```

| 查询 | 前 → 后（ns/次，Criterion 点估计） |
| --- | ---: |
| 无演出阻塞 | 3.7357 → 3.8545 |
| 定时等待 | 1.1256 → 1.1287 |
| 等待玩家推进 | 1.1260 → 1.1456 |

保留首轮小幅增加，不宣称提速；最大绝对差约 0.12 ns。规则仍短路且无堆分配，
未引入每帧诊断列表、轮询或额外重绘。前后日志在 `target/reload-review/{before,after}.log`。
没有整游戏 CPU/GPU、UI 或跨平台性能结论。

必要回归覆盖原生源码有效→错误→修复、入口/引用错误、已接受/实际应用 revision
分离、过期后台结果丢弃、含资源与场景引用的纯位置变更不改变 State/资源变更标记/
checkpoint/加载帧期限、原生 Preview 重建不重复叠加变量，以及阻塞与存档安全性的区别。
相同 Program 的存档 fingerprint 合同和既有持久化回归保持不变。
本机 fmt、workspace/all-targets/all-features check/Clippy、最小 video-native tests check
通过；全功能工作区 **1100 passed / 24 ignored**，publisher-only **1073 passed / 21 ignored**
（不重复计入 instance 子进程）。系统 Trash 被沙箱阻止后，在允许系统服务的环境重跑通过。
最终 8 项 reload 定向回归通过；Native Smoke 为 1 scene / 1 action / 0 warning。
日志位于 `target/reload-review/`；本轮未做原生 GUI、发行包或跨平台实机验收。

### 脚本解析与 Core 理论吞吐

复用 `program-load` / `script-runtime`，增加原生 EYS 文本与表达式负载。
可通过 `KEINE_NATIVE_SOURCE_DIR` 指定只读、平铺 `.shou` 语料目录；Cargo bench
会切换包目录，因此传绝对路径。Core `preinstalled` 用 Criterion `iter_batched_ref`
将 State / Program 安装与释放排除出计时，原含初始化的基准保留。

```sh
KEINE_NATIVE_SOURCE_DIR="$PWD/projects/tday/scripts" cargo bench --offline -p keine-core -p keine-loader --bench script-runtime --bench program-load -- 'native_|script_runtime' --sample-size 10 --warm-up-time 0.5 --measurement-time 1 --nresamples 1000 --noplot
```

历史环境：Apple M5 Pro / 24 GiB / macOS 27.0.1，0.14.3、`df922c6` 加当时未提交
改动，Cargo bench 优化配置（LTO、单 codegen unit）。10 个样本，输入已在内存中。
原始日志及源码哈希在 `target/performance/theoretical-0143/`，点估计如下：

| 负载 | 每批耗时 | 吞吐 |
| --- | ---: | ---: |
| EYS 十万条中文/Latin 文本解析 | 125.10 ms | 约 80 万 action/s、25.83 MiB/s |
| EYS 100001 条赋值/表达式/插值文本解析 | 134.02 ms | 约 75 万 action/s、26.69 MiB/s |
| 同一混合脚本解析并构建 Program | 140.86 ms | 约 71 万 action/s |
| tday 172394 字节 / 14 scene / 2665 action 解析 | 3.02 ms | 54.40 MiB/s |
| 同一 tday 语料 Editor 文档解析入口 | 2.87 ms | 57.30 MiB/s |
| Core 已安装 Program，十万条非阻塞 Comment | 0.925 ms | 约 1.08 亿 action/s |
| Core 已安装 Program，1000 轮赋值/条件/插值对白 | 4.45 ms | 约 22.46 万轮/s |

这是暖输入、单线程 CPU 样本，不是所有脚本的绝对硬件上限。Comment 只给轻负载
参考；混合负载每轮包含 3 条作者 action，并立即模拟点击推进。Editor 文档入口不含
完整工作台投影/布局。解析计时包含返回对象分配与释放；语料读取在计时外。
Editor / Preview 当时仍打开，桌面负载未隔离。没有测 GPU 峰值、冷启动、媒体、
Bevy 场景/UI 调度或多平台表现；限帧 FPS 不能代表最大渲染吞吐。
日志中的 Criterion change 百分比来自试跑，前一试跑的计时范围不同，不作为优化证据。

#### 解析器分配与小步优化

解析器前后对照使用同一份 14 scene / 2665 action 的语料（含临时 Extra 入口）。
临时测试入口移除后 tday 为 13 scene / 2626 action；不把删除测试入口的输入变化算作解析器优化。

基线为 `1bb2b33`；同一 M5 Pro / 24 GiB / macOS 27.0.1，使用同一
`program-load` 基准、优化配置和输入测前后值。`sample` 的符号采样显示稳定对白 ID
生成中的 `Debug` 格式化 / Unicode 可打印字符检查是主要热点之一；分配统计确认
文本缓冲增长、语义键复制和初始化分析临时容器也有成本。

保留稳定 ID 字节算法及出现次数、token/trivia 范围、诊断顺序/位置、表达式深度预算
和完整语义检查。只共享 Lexer/Parser 的行索引、移交语义键以省去 clone、直接构建
无转义/插值的单个文本 literal，以及用迭代器遍历初始化分析的后继节点。
新增 ID 黄金值案例并入原有文本/插值回归；API、语法、typed Action 和发行流程不变。

计时用未启用分配计数的 Criterion；分配 census 是单独一次解析加输出释放。
bench 专用 allocator 仅转发到 `System`，按
[GlobalAlloc 合同](https://doc.rust-lang.org/std/alloc/trait.GlobalAlloc.html)
使用不分配的线程本地计数；不进入产品二进制。先在未优化 Parser 上编译相同 bench
辅助代码并保存基线，再执行完全相同的命令。以下命令的两次测量间只修改 Parser：

```sh
KEINE_NATIVE_SOURCE_DIR="$PWD/projects/tday/scripts" cargo bench --offline -p keine-loader --bench program-load -- native_ --sample-size 10 --warm-up-time 0.5 --measurement-time 1 --nresamples 1000 --noplot --save-baseline allocation-before
# 修改后用同一命令，将末尾改为 --baseline allocation-before。
KEINE_PARSE_METRICS=text:1000000 cargo bench --offline -p keine-loader --bench program-load
KEINE_PARSE_METRICS=mixed:1000000 cargo bench --offline -p keine-loader --bench program-load
KEINE_NATIVE_SOURCE_DIR="$PWD/projects/tday/scripts" KEINE_PARSE_METRICS=corpus cargo bench --offline -p keine-loader --bench program-load
```

大小测试将 `1000000` 分别换成 `10000000` / `100000000`；按完整 scene 填充到
至少该字节数。单位 MB 为十进制；堆内存为 MiB。混合输入含对白、变量、表达式、
条件、其 lowering 生成的跳转/标签以及 scene call/goto。读取/生成输入不计时。
100 MB 直接调用裸解析器，属于压力测试：单源文件 32 MiB、Editor 单文档 1 MiB
入口限制保持原值，不声称该文件可作为正常工程源文件加载。

| Criterion 负载 | 前 → 后 | 耗时变化 |
| --- | ---: | ---: |
| 十万条文本 | 126.41 → 115.36 ms | −8.7% |
| 100001 条表达式/文本 | 135.82 → 132.22 ms | −2.6% |
| 同一混合解析 + Program | 142.80 → 141.77 ms | −0.7%，未检出显著变化 |
| tday 解析 | 3.011 → 2.852 ms | −5.3% |
| tday Editor 文档入口 | 2.880 → 2.716 ms | −5.7% |

大小测试下表的时间是预热后**单次解析、不含输出释放**，仅用于规模观察；与上面的
10 样本计时范围不同，不作为小幅提速的统计证据。分配数只计 alloc/alloc_zeroed，
realloc 次数另存原始记录。峰值/保留堆是请求的活跃字节，不含 allocator 元数据、
页面余量、输入和进程其他开销，不等于 RSS；释放后计数字节均为 0。

| 输入 | 时间前 → 后（ms） | 分配前 → 后（百万次） | 峰值堆前 → 后（MiB） | 保留堆前 → 后（MiB） |
| --- | ---: | ---: | ---: | ---: |
| 文本 ≥1 MB | 37.21 → 34.69 | 0.256 → 0.192 | 26.97 → 23.97 | 14.51 → 11.45 |
| 文本 ≥10 MB | 378.07 → 343.79 | 2.514 → 1.886 | 246.89 → 216.97 | 141.93 → 111.96 |
| 文本 ≥100 MB | 4021.34 → 3643.04 | 25.091 → 18.826 | 2715.01 → 2415.81 | 1426.77 → 1127.56 |
| 混合 ≥1 MB | 42.85 → 42.03 | 1.183 → 1.067 | 58.48 → 57.25 | 41.40 → 40.17 |
| 混合 ≥10 MB | 466.55 → 445.57 | 11.779 → 10.630 | 680.75 → 668.47 | 413.48 → 401.20 |
| 混合 ≥100 MB | 5667.26 → 5125.55 | 117.775 → 106.288 | 6335.97 → 6213.18 | 4148.15 → 4025.35 |

文本各规模分配数约降 25%，峰值堆约降 11–12%，保留堆约降 21%；混合分配数
约降 9.8%，峰值堆约降 2%，保留堆约降 3%。tday 分配数 33112 → 29480，
保留堆 1712485 → 1604629 字节。七组输入 action 数量与 Program fingerprint
均匹配基线。原始前后日志、采样栈、输入规模、哈希与百分比在
`target/performance/parser-0143/`；未测其他 CPU/平台、冷 I/O、完整 Editor 投影或热加载。

后续继续先 profile。[Oxc 的性能分析](https://oxc.rs/docs/learn/performance) 支持
减少分配/复制的方向，但其 arena、AST 生命周期和输入与本项目不同；本轮不引入
arena 或融合 Parser。现有 token 已借用源码范围，并非逐 token 创建 String；Editor
还依赖完整 trivia。当时的 Tyrano/Oxc/SWC 外部吞吐缺少同机同输入原始证据，simdjson
测量 JSON，均不作为本项目速度排名。80–150 MB/s 缺少同一输出合同下的实测依据，
撤下这一吞吐目标；保留已验证的小步优化与基准，解析器优化在此收尾。
仅当实际工程的启动、实时编辑或热加载出现可测量的解析延迟/内存问题时重新 profile。

#### 0.16.3 解析优化与四引擎脚本对照

Apple M5 Pro / 24 GiB / macOS 27.0.1 / 原生 ARM64；基线 `d636898`，
优化后为该提交加本节修改（收录于 0.16.4）。Rust 1.99.0，release 默认 opt-level=3、LTO、单 codegen
unit；不改变优化等级。`sample` 再次确认稳定 ID 格式化/分配与 ID 注册是热点之一。
保留完整检查及 ID 的 Debug 字节算法，只预留语义键容量，并用借用 `&str` 的 HashSet
代替复制 ID、保存未使用位置的 HashMap。API、语法与 Action 不变。

同一 `program-load`、同一语料，20 样本；下表统一使用 Criterion mean 点估计，
包含结果释放，五项变化均达到其显著性判定。没有并行跑分或编译；普通桌面应用仍打开。

| 负载 | 优化前 → 后（ms） | 耗时变化 |
| --- | ---: | ---: |
| 十万条文本 | 85.264 → 75.093 | −11.93% |
| 100001 条表达式/文本 | 120.427 → 112.868 | −6.28% |
| 同一混合解析 + Program | 125.473 → 121.187 | −3.42% |
| tday：169955 字节 / 13 scene / 2626 action | 2.271 → 2.133 | −6.08% |
| 同一 tday Editor 文档入口 | 2.154 → 2.044 | −5.09% |

```sh
KEINE_NATIVE_SOURCE_DIR="$PWD/projects/tday/scripts" cargo bench --locked --offline -p keine-loader --bench program-load -- native_ --sample-size 20 --warm-up-time 0.5 --measurement-time 2 --nresamples 1000 --noplot --save-baseline script-0163-before
# 仅应用 Parser 修改后，将最后一项换为 --baseline script-0163-before。
```

另用既有 allocation census 检查文本/混合各 1、10、100 MB 与 tday：七组 Program
指纹与 action 数一致，释放后计数归零。纯文本 alloc 次数降约 16.7%，峰值请求堆降
8.0–12.5%；混合 alloc 降约 2.4%，峰值降 2.6–3.6%。tday alloc 28940 → 27961，
realloc 7661 → 4119，峰值 3.732 → 3.639 MiB。返回结果的保留堆不变。
这是临时分配改善，不代表运行中常驻内存下降。census 的未改代码 profiling 二进制
与改后 bench 二进制只用于分配/指纹比较，不拿这两者的单次时间推导提速。

四方使用等价内容、各自合法语法：1 千/1 万条编号中英文文本，以及连续变量加一。
每项 3 个独立进程，每进程 5 次预热、10 次计时，轮换引擎顺序，取各轮中位数的
中位数。读取、生成、输出释放及初始化在计时外；GC 引擎在每次计时前收集，计时中
的自动 GC 不禁用。逐条验证文本、动作数量和执行后 counter，以下为 **1 万条**：

| 原生入口 | 文本解析（ms） | 赋值脚本解析（ms） | 执行一万次加一（ms） |
| --- | ---: | ---: | ---: |
| Kēne 0.16.3 + 本节优化 | 5.982 | 4.402 | 0.652 |
| TyranoScript `c8dbfd4` / Node 24.22.0、V8 13.6 | 2.496 | 7.013 | 0.771 |
| Suika3 tag `26.07.13` / `4d9d0f3`、Clang 21 `-O3 -flto` | 1.058 | 1.771 | 16.488 |
| Ren’Py 8.5.3.26051504 / SDK Python 3.12.8 | 81.648 | 63.231 | 3.737 |

Kēne 同一万条文本的解析 + Program 构建为 6.708 ms。此表不含输出释放，不能与
上方 Criterion 表直接相除。1 千条结果及每轮分布保留在原始数据中。

测量合同与限制：

- Kēne 用 `parse_native_scenes`，包含语义检查、稳定 ID 与 typed Action；执行用
  已安装 Program 的 Core `step`，保留动作步数预算。赋值源码额外带一条 `let`；
  声明解析计入，变量初始化放在执行计时外。
- [TyranoScript](https://github.com/ShikemokuMK/tyranoscript/tree/c8dbfd492afd3d79b0954fcf4477236f5c6c4830)
  原始 `parseScenario`；执行原始 `eval.start` → `evalScript`，使用预热后的 V8。
  未单独跟踪 JIT 优化状态或缓存命中率。
  宿主保存与下一帧回调只计次数，排除存储 I/O、DOM 和调度。
- [Suika3](https://github.com/awemorris/suika3/tree/4d9d0f3961710734fdc59139d8f159ea6ed0918f)
  原始 `parse_tag_document` + `parse_tag_callback`；固定 tag 表在计时外建立。
  原始 `set` handler/变量表执行，VM continue 标志用宿主适配器承接。
  `clear_tag_data` 提前清零数量，适配器在计时外释放输出以避免影响重复测量。
  **只测 tag 路径，不代表 NoctLang/JIT**；tag 单文件上限 32768，未用分块伪装十万条。
- [Ren’Py 官方 SDK](https://www.renpy.org/release/8.5.3) 已核对官方 SHA-256。
  原始 `parser.parse`，使用独立 Script 收集上下文；执行原始 Python AST 节点
  `execute` / `py_exec_bytecode`，字节码编译和 Store/Context 初始化在计时外。
  不含 Context 主循环、rollback、显示/预测；不修改原始解析/执行函数。
- 文本结果结构、语义检查和执行调度职责不同，因此这是具体路径对照，不能推导完整
  引擎、启动或帧率排名。Suika3 tag 解析主要复制标签/属性；其 `set` 执行还需逐属性
  展开变量、清空缓冲及字符串/数字转换。Ren’Py 发布时的 `.rpyc` 和 Kēne 编译
  Program 加载也不是本次源码解析路径。未测其他平台、复杂控制流或完整游戏播放。

原始样本、语料、适配器、工具链/源码/二进制哈希、命令、独立中位数复核与分配记录
在 `target/performance/script-0163/`：`summary.json`、`optimization.json`、`metrics.json`、
`manifest.json`、`commands.txt`、`build-and-bench-commands.txt`。测试资料不进入发行包。

### GPU 合成与模糊

0.15.4–0.15.5 工作区；Apple M5 Pro / 24 GiB / macOS 27.0.1 / Metal，
1920×1080 @1×，dev opt-level=1。每轮 10 秒，剔除启动前 5 秒区间；
Metal `On-GPU Walltime Stats` 按实际 GPU 帧数加权，取多轮均值的中位数。
它是 GPU 执行时间，不是核心利用率或输入响应延迟。

| 改动 / 隔离负载 | 前 → 后（ms/帧） | 证据范围 |
| --- | ---: | --- |
| 覆盖区域裁减与全屏快路径 / 普通对白 | 1.545 → 1.561 | 三轮，无改善主张 |
| 同上 / 设置页 | 3.427 → 3.337 | 三轮，−2.6% |
| 同上 / 强全屏区域模糊 | 4.067 → 3.868 | 三轮，−4.9% |
| 仅最后一个活动相机输出 / 双立绘往返 | 1.2585 → 1.0934 | 三轮，−13.1%；反序复测支持约 −12.2% |
| 带资源保护的背景双纹理淡化 | 1.4006 → 1.2463 | 五轮，−11.0%；首对变慢约 32%，保留原始波动 |
| 最后减少淡化重复几何更新 | 1.3950 → 1.1921 | 仅一组反序，−14.5%；CPU 28.40% → 30.22%，不能宣称 CPU 改善 |
| 静态背景对照 | 1.2299 → 1.2334 | 仅一组，基本持平 |

背景淡化五轮旧值为 2.3395 / 1.5848 / 1.3481 / 1.4006 / 1.3926，
新值为 3.0966 / 1.5222 / 1.2455 / 1.2445 / 1.2463。
各实验分别使用隔离 fixture 和匹配旧/新二进制，不将表内百分比连乘为累计收益。
全程受 60 Hz 呈现限制；没有 release、其他平台、完整剧情或输入延迟对照。

```sh
cargo build --offline --locked --bin keine --features publisher,video-native,hot-reload
# 各目录保存对应实验的 before/after binary、输入 hash 和逐轮命令；不能用新 binary 冒充旧基线。
python3 target/performance/package-gpu-0155/measure.py BINARY OUTPUT bench_idle --seconds 10
python3 target/performance/crossfade-0155/measure.py BINARY OUTPUT cross_fade --seconds 10
python3 target/performance/gpu-0154/measure.py target/performance/gpu-0154/binaries/before target/performance/gpu-0154/before-final opening settings blur_full
python3 target/performance/gpu-0154/measure.py target/performance/gpu-0154/binaries/final-candidate target/performance/gpu-0154/final-repeat blur_full settings opening
```

原始统计、CPU/Metal JSON、构建和失败尝试分别在 `target/performance/gpu-0154/`、
`package-gpu-0155/`、`crossfade-0155/`；后两个路径同样位于 `target/performance/`。
采样器调用系统 `metalperftrace listen --pid PID --json --output …`，
口径见 [Metal HUD metrics](https://developer.apple.com/documentation/xcode/understanding-the-metal-performance-hud-metrics)。

不保留的候选也有原始记录：

| 候选 | 结果 | 原始目录（`target/performance/` 下） |
| --- | --- | --- |
| 跳过 UI 空世界 pass | 1.1804 → 1.1809 ms，中位数无稳定收益，撤回 | `gpu-followup-0155/` |
| 裁小模糊中间纹理 | 1.2222 → 1.6868 ms，三对均慢，撤回 | `gpu-crop-0155/` |
| 按强度排序首命中返回 | 1.1795 → 1.6552 ms，无稳定收益，撤回 | `gpu-crop-0155/` |
| 暂停模糊的成本拆分 | 约 0.60 ms；正式实现恢复模糊，不属于等画质优化 | `gpu-followup-0155/` |

正确性回归保留弱模糊下溢、双管线就绪、纹理/采样器更换回退、旧视频帧重排与
Core Video device 归属。Metal 淡化测试覆盖十组透明/不透明 source-over，最大差异
1/255（少一次中间 8-bit 舍入）。上述专项曾显式执行；原生 macOS 检查过标题、
菜单/对白模糊和舞台，但未捕获完整反向淡化，不以截图证明没有任何单帧闪黑；
也未模拟真实 device-loss 后完整恢复。

Suika3 26.07.13 的该 fixture GPU 三轮均值为 0.5262 / 0.5393 / 0.5352 ms。
其 [Metal renderer](https://github.com/awemorris/suika3/blob/26.07.13/external/PlayfieldEngine/external/StratoHAL/src/GameRenderer.m)
与 [shader](https://github.com/awemorris/suika3/blob/26.07.13/external/PlayfieldEngine/external/StratoHAL/src/GameShaders.metal)
在单个 drawable pass 合成背景、立绘与栅格文字，没有此 Kēne fixture 的区域高斯模糊。
这支持额外模糊/合成是差距的重要来源，不能量化语言或抽象层各自贡献，也不是等画质排名。
Suika 每帧同步等待不应照搬。横向图的包体积包含不同素材/SDK范围，同样不能作为最小发行包排名。

### 内存、空闲与连续播放

均为 M5 Pro / 24 GiB / macOS 27.0.1 / Metal、dev opt-level=1 的历史记录；
窗口 1920×1080 @1×。physical footprint 与 RSS 分别采集，不能混称 RAM。

| 观察 / 改动 | 结果 | 原始目录（`target/performance/` 下） |
| --- | --- | --- |
| 0.15.0 前标题空闲约 5 分钟 | footprint 186.1 → 185.9 MiB；启动峰值 343.3 MiB | `idle-memory-0150/` |
| 正常操作约 12 分钟 | 混合平均 354.1 MiB；CG 引起采样峰值 655.1 MiB，不能泛化为游戏平均 | `normal-project-0150/` |
| CG 缩略图与资产退役 | 四页等权稳定均值 325.3 → 253.2 MiB；退出后标题 269.4 → 237.2 MiB；内核峰值 615.7 → 459.4 MiB | `gallery-memory-0150/` |
| 菜单开启 auto 时休眠 | CPU 24.05% → 0.39%（单核口径） | `lifecycle-0150/` |
| 常驻浮动文字停止无效更新 | CPU 19.57% → 0.38% | `lifecycle-0150/` |
| 镜头与文字同步反序复测 | CPU 26.35% → 23.16%；footprint 338.9 → 338.7 MiB，无基座内存改善主张 | `scene-sync-0151/` |

CG 输出 RGBA 245.2 → 69.8 MiB 是像素 payload，不是进程内存；顺序解码
211.7 → 225.1 ms（+6.4%，每图约 +0.43 ms），不能宣称 codec 更快。
页面仍并行加载，首开全屏原图改为按需加载；低端设备、冷包和 2× 设备延迟尚未验收。
三帧收尾使资源退役得以完成，不清空字体/模糊/allocator 缓存；缓存保留与泄漏不能凭单点占用区分。

```sh
# 使用各实验保存的输入、副本、before/after binary 和本地测试 app。
python3 target/performance/gallery-memory-0150/sample.py before
python3 target/performance/gallery-memory-0150/sample.py final
python3 target/performance/lifecycle-0150/before/sample.py
python3 target/performance/lifecycle-0150/after/sample.py
python3 target/performance/scene-sync-0151/sample.py target/performance/scene-sync-0151/keine-before target/performance/scene-sync-0151/before-counters
python3 target/performance/scene-sync-0151/sample.py target/debug/keine target/performance/scene-sync-0151/after-counters
python3 target/performance/continuous-tday-0150/sample.py
```

连续播放记录为 1799.97s / 8833 个 RAM/CPU 样本；仅 664.86s 可确认为持续推进，
其余启动、计数核对和显式玩家确认另行标记。推进段 footprint 均值 346.4 MiB、
P95 364.2 MiB，CPU 均值 22.3%；末三分钟内存中位数 355.2 / 355.3 / 355.3 MiB。
未观察到失控增长，但未完整播放 13 章、未循环章节、未取得同进程返回标题后的采样，不能证明无泄漏。
驱动累计 GPU 时间占比均值 5.7% 不等于整机 GPU 利用率（同期约 53.6%）。
CPU 先按 Mach timebase 换算；AGX 非公开驱动计数经本机 Activity Monitor 交叉核对，不能直接移植口径。
CSV、GPU 序列、标记、计数验证及图均保存在 `target/performance/continuous-tday-0150/`。
0.15.1 后续压力样本及黑幕修复记录见上述固定历史文档，不混入此组统计。

### Editor、粒子与预取

这些是旧版特定路径的结果，不代表升级 GPUI/工具链后的全窗口帧时。
完整环境、原始命令与限制见固定历史文档的同名章节。

| 路径 | 前 → 后 | 原始证据目录 |
| --- | --- | --- |
| GPUI Scene replay，19,200 笔画 | 67.795 → 0.339 ms，5×30 次组均值中位数 | `target/authoring/performance/scroll/` |
| 5,000 行 Text 概览 | 3.239 → 1.881 ms，11 次中位数，不含整窗绘制 | `target/authoring/performance/layout/` |
| 5,000 资源空搜索，缓存未命中 | 0.500 → 0.039 ms | `target/authoring/performance/resources/` |
| 1080p 有损 WebP 缩略图 | 34.026 → 11.750 ms；PNG/无损 WebP 无明显改善 | 同上 |
| 粒子每项动态上传 | 216 → 64 B；192 粒子 CPU 15.81% → 12.49%，压力项仅 22.12% → 21.86% | `target/particle-profile/` |
| 128 MiB 预取预算 | 按解码 payload 计费，当前画面/阻塞资源受保护；不是进程内存硬上限 | [`scene/assets.rs`](../../src/scene/assets.rs) |

```sh
cargo bench --locked -p keine-editor --bench browser
cargo test --locked -p keine-editor --release --lib benchmark:: -- --ignored --nocapture --test-threads=1
cargo test --locked -p keine-editor --release --lib index::benchmark:: -- --ignored --nocapture --test-threads=1
```

历史粒子对照使用旧 perf 的 60 Hz 唤醒策略；不能作为当前高刷新率 GPU 证据。
雨/雪视觉调整在 `target/performance/weather-behavior/` 有交替三轮数据，CPU 波动明显，未主张提速。
资源拖放热点仍含 GPUI 根视图 prepaint/布局/样式分配；曾撤回无进程级收益的字段缓存试验。
后续仅在实际工作流出现可测问题时再定位，不按历史待办重复启动全面跑分。

### Hakutaku v2

独立库的格式、完整配对命令和测试 owner 位于锁定版本的
[FORMAT](https://github.com/maincoretech/hakutaku/blob/8d637d5629b84f99251fd445366892bdb3c7cf2b/docs/FORMAT.md)、
[PERFORMANCE](https://github.com/maincoretech/hakutaku/blob/8d637d5629b84f99251fd445366892bdb3c7cf2b/docs/PERFORMANCE.md)。
Kēne 的接入证据在 `target/performance/quality-review/v2-*`；库的原始日志在相邻仓库 `target/v2-review/`。

同机三轮交替 v1/v2、过程内中位数再取中位数：

| 场景 | v1 → v2 |
| --- | ---: |
| 10 万资源快照 | 8,888,370 → 6,304,768 B |
| 10 万资源解码目录 | 10,044,939 → 7,928,907 B |
| 打开目录 | 10.484 → 9.355 ms |
| tday 随机音频读取 | 300.538 → 130.815 ms |
| tday 顺序读取 | 49.418 → 49.693 ms，无改善主张 |

真实输入含 35 Opus、35 WebP、13 shou，共 80,907,088 B；是暖宿主缓存下的合成 seek，
不是播放延迟。音频请求字节 −57.7%、调用数 +65.5%；真实素材快照反而
42,113 → 73,907 B。视频块与图片 CDC 未改，不外推为全部媒体加速。
50 万资源、1024 次小补丁和 8 路并发读取曾通过；发布夹具峰值 RSS 约 1.33 GB，不是运行时预算。
新 wire-format fuzz、其他平台 GUI/游戏运行仍须各自验证。

Kēne 发布端实测序列下限 42、无变化重打包 42、提高下限后 100；非法/零下限拒绝且
原序列 100 包仍有效。v1 必须从源素材重建 v2；升级流程与客户端回退策略见[发布指南](release.md#hakutaku-020--v2)。

离线密钥重建的回归入口为 `cargo test --locked -p keine-loader --test runtime_keys`：
优化/LTO 编译后检查不同拆分还原相同密钥，并验证缺失/短材料拒绝和输入文件重建跟踪。
无材料的开发版单独检查缺钥错误；带材料分支另用合成密钥运行 Loader all-targets/all-features Clippy。

macOS ARM64 对 tday 副本连续执行两次 `bundle`，使用相同临时发布身份，得到不同 Engine：

```sh
cargo build --locked --bin keine --no-default-features --features publisher
target/debug/keine bundle <project-copy> --output target/offline-hardening/bundle-a
target/debug/keine bundle <project-copy> --output target/offline-hardening/bundle-b
target/offline-hardening/bundle-a/keine validate target/offline-hardening/bundle-a/game.haku
target/offline-hardening/bundle-b/keine validate target/offline-hardening/bundle-b/game.haku
```

旧字符串定位脚本失效，两个新 Engine 均未发现开发版缺钥锚点或连续根密钥字节。
但按公开算法适配一次的 ARM64 静态仿真提取器无需修改即可提取两包：各 72 文件、
80,942,538 B、4 段、7 页、1193 块，签名/承诺/AEAD 全部校验，输出逐文件 SHA-256
与原 CI 包一致，发行输入未变。脚本耗时约 0.42 / 0.43 s，**不含人工分析与适配**；
实现者已知公开算法，不能称为独立盲测。这只证明一次性适配成本，未证明持续抗提取能力。

同机暖缓存 31 组交替的无窗口进程启动、解密及 tday 校验，中位数旧/新约 8.19 / 8.07 ms，
不作提速主张，也不代表图形首帧。独立密钥重建微基准每轮 2000 万次、7 轮交替，
Rust 1.99.0 `-O -C lto -C codegen-units=1 -C strip=symbols`，旧/新中位数约
2.17 / 7.18 ns/次。原始命令、数据、产物清单和校验结果位于本机
`target/offline-hardening/evidence/`；其他平台二进制及原生窗口/媒体验收未覆盖。

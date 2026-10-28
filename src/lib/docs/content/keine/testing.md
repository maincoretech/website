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
- FFmpeg 绑定的构建脚本在 16 MiB 栈的工作线程上运行，避免 Windows 主线程栈溢出；
  本地与显式 `--target` 构建共用此修复，见 [FFmpeg patch](../vendor/ffmpeg-sys-next/KEINE-PATCH.md)。
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

### 当前依赖迁移验收

Bevy 0.20 / wgpu 30 / GPUI Kit 0.8 已在 macOS arm64 完成上述 fmt、check、clippy、
两组工作区测试、native/FFmpeg feature 检查、native-smoke、打包合同和全 feature cargo-deny。
根工作区与独立 fuzz 工作区的 locked metadata 均通过。原始日志保留在本机
`target/ci-repair/`：`test-major.log`、`test-publisher-major.log`、`deny-major.log` 等。

显式执行的 GPU 回归为 6 项渲染测试和 1 项 Metal 设备替换测试：

```sh
cargo test --workspace --locked --all-features on_gpu -- --ignored --test-threads=1
cargo test --workspace --locked --all-features metal_cache_follows_replacement_device -- --ignored
```

临时配对 macOS 包已完成签名验证和原生界面检查：Engine 的逐字显现、文字阴影、设置页模糊、
按钮与窗口缩放；Editor 的中文源码、折叠、缩略图、文件选择弹层和未保存关闭提示。
这些检查不代表所有图形变体或视频场景均已人工验收；Windows、Linux、Android 的构建和设备验收仍待完成。
本轮未重跑性能基准，不据此宣称帧耗时或内存改善。

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
| 自动播放等待语音同步、加载、实际队列 EOF 后的阅读延时；暂停/静音和菜单不提前推进，同文件下一句重新等待 | Tick `playback_auto_waits_for_voice_eof_and_then_reading_delay`、`playback_auto_waits_for_pending_voice_and_releases_after_failed_player_cleanup`；使用无设备 Rodio 队列，恢复同一光标及真实失败清理 |
| 无语音阅读延时；手动/快进/作者显式续行仍可打断语音 | Tick `playback_auto_without_voice_keeps_the_configured_reading_delay`、`playback_manual_skip_and_authored_notend_can_interrupt_voice` |
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

### 静态菜单的重复重绘

`8319be9` 与本轮调度修复工作区；Apple M5 Pro / 24 GiB / macOS 27.0.1 / Metal，
dev opt-level=1，1280×720 @1×。临时项目复用 native-benchmark 的 day.webp，
在非阻塞镜头移动中执行 `ui.show(settings)`，得到暂停演出、背景静止的真实菜单。
正常打字与页签切换时仍执行场景合成和区域模糊；本轮未引入画面像素缓存。

| 原生窗口、60 秒采样中的稳定 10 秒区间（elapsed 50–60s） | 重绘提交数 | 最后观察到的状态 |
| --- | ---: | --- |
| 原版 | 1,135 | 前台 Active |
| 调度修复 | 0 | 前台 Idle；仅事件/采样期限唤醒 |

期间显示环境从 144 Hz 切换为 60 Hz，因此这组数据只证明静止菜单从持续提交变为休眠，
不比较单帧 GPU 耗时、输入延迟、CPU 百分比或显示 FPS。没有新帧不能写成 GPU 每帧耗时 0。
原版把已经被菜单暂停的打字、演出和眨眼计时仍算作动画；修复使生命周期与 Tick 的输入域一致。
UI 动画以及媒体、粒子和时变 shader 继续请求绘制，返回舞台后恢复原有播放。

```sh
cargo build --locked --bin keine --features hot-reload,video-native,video-ffmpeg
python3 target/performance/static-ui/measure.py before paused acceptance 60 runtime
python3 target/performance/static-ui/measure.py after paused acceptance 60 runtime
```

两个二进制采用相同 feature；命令、哈希、临时项目、Metal 数据及逐帧 trace 保存在
`target/performance/static-ui/`，汇总为 `final-results.json`。着色器编译失败、失焦和不同
尺寸的探索样本未混入上述区间；完整高斯核与少量系数预计算候选均撤回，未宣称稳定收益。

扩展现有生命周期回归，覆盖四种菜单输入域中的暂停对白/计时/眨眼、UI 与 shader 唤醒和返回舞台。
工作区 all-features check、Clippy、测试（1,140 passed / 28 ignored）、无默认 feature 的 publisher
check、native-smoke 校验及另行执行的五项真实 Metal 回归通过。macOS 原生窗口检查了打字、菜单
模糊、页签与返回舞台；滑块自动化未产生有效数值变化，未计为拖动验收。其他平台、长时压力和
新的发行包本轮未验收。

### 对白与音乐进度的重复 UI 写入

`b098232` 与本轮工作区；Apple M5 Pro / 24 GiB / macOS 27.0.1，test opt-level=1、
all-features。只测无窗口 Bevy `App.update` 中的动画/透明度或进度系统及变化计数器，
不含布局、渲染、音频和 GPU。预热 100 次，文本测 20,000 次，音乐测 100,000 次；
以下为三组交替前后测试的中位数，桌面未隔离。

| 场景 | 修改前 → 后（µs/update） | 每次更新的组件写入 |
| --- | ---: | --- |
| 80 字，仅一字淡入 | 1.935 → 1.956 | TextColor 80 → 1 |
| 320 字，仅一字淡入 | 3.313 → 3.291 | TextColor 320 → 1 |
| 1,000 字，仅一字淡入 | 7.110 → 6.966 | TextColor 1,000 → 1 |
| 音乐进度固定 | 1.576 → 1.532 | Text/Node/BackgroundColor (1,2,1) → (0,0,0) |

合成测试用很长的淡入时间保持一个活动字形，不代表正常播放速度。已稳定的对白在修改前后
都不写颜色。保留的改动减少无效变更通知；普通对白耗时没有稳定改善，未据此宣称 GPU 或
整帧性能提升。额外的活动字形标记方案已撤回，收益不足以抵消生命周期维护成本。

```sh
cargo test --locked --lib --all-features perf_ui_ --no-run
# 保存带相同临时测量模块的前后测试二进制后，各交替运行三次：
target/performance/ui-updates/probe-before perf_ui_ --ignored --nocapture --test-threads=1
target/performance/ui-updates/probe-final perf_ui_ --ignored --nocapture --test-threads=1
```

临时测量模块、原版源文件、命令、原始日志、二进制哈希与 `results.json` 保存在
`target/performance/ui-updates/`，不进入发行包。正式回归覆盖单字与全局淡入、
新文本的透明度、亚秒进度移动、拖动/悬停状态及同一秒内重建时间标签。
工作区 all-features check、Clippy、测试（1,142 passed / 28 ignored）、无默认 feature 的
publisher check 与原生构建通过。macOS 窗口确认了打字淡入、隐藏/恢复对白、菜单模糊、
音乐播放/暂停、点击跳转进度与恢复播放；拖动工具未产生有效位移，不计为拖动验收。
CG 空提示居中、单页隐藏分页及两页翻页已检查。其他平台未实测。

### 鉴赏动画结束后的重复写入

沿用上述机器和 test opt-level=1 / all-features 配置。前版包含上面的对白与进度改动；
同一无窗口系统测量方法，预热 100 次、测量 100,000 次，三组交替前后测试取中位数。
稳定状态下只在值变化时写入；动画曲线、模糊强度公式、轮询频率和输入处理不变。

| 单独测量的系统 | 修改前 → 后（µs/update） | 稳定帧的相关组件变更数 |
| --- | ---: | ---: |
| CG/音乐页切换（两面板、一网格） | 1.574 → 1.570 | 5 → 0 |
| 鉴赏页淡入（根节点、模糊层） | 1.605 → 1.590 | 4 → 0 |
| 全屏 CG 淡入 | 1.713 → 1.563 | 3 → 0 |
| 音乐不可用状态（无音源） | 2.987 → 2.975 | 3 → 0 |

计数范围为 Node、UiTransform、BlurStrength、BackgroundColor、LocalizedText、
ExtraBgmPlayer、ExtraMotion，未表示整个鉴赏页不再更新。耗时很小且存在波动；
保留这些简单比较以减少无效组件变更，不据此推导 GPU、帧率或交互延迟改善。
状态样本包含 AssetPlugin，但不播放音频；所有样本均不含布局与渲染。

```sh
cargo test --locked --lib --all-features perf_extra_ --no-run
# 用相同临时模块构建并保存前后测试二进制，各交替运行三次：
target/performance/extra-settled/probe-before perf_extra_ --ignored --nocapture --test-threads=1
target/performance/extra-settled/probe-after perf_extra_ --ignored --nocapture --test-threads=1
```

原版源文件、临时测量模块、命令、原始日志及二进制哈希位于
`target/performance/extra-settled/`，汇总为 `results.json`。正式回归覆盖双向页签切换、
动画结束后的新节点、模糊层关闭清理、全屏 CG 关闭，以及音乐失败/加载/停止状态与重建标签。
工作区 all-features check、Clippy、测试（1,144 passed / 28 ignored）和无默认 feature 的
publisher check 通过。macOS 原生窗口确认模糊、CG 翻页/打开/关闭、双向页签切换、
音乐播放/暂停/停止及点击跳转进度；之后翻页文字改为内嵌左右图标，再构建并验证两个方向的点击。
没有新增 GPU 耗时或跨平台实测结论。

### 标题、菜单与设置的稳定帧

继续审查标题、菜单、存读档、Backlog、输入路由及场景/音频同步。删除标题根节点每帧
重复的固定布局赋值；动画稳定后停止重复写入；按钮字重只在选择状态改变时写入，设置数值只在
设置变化或新标签加入时格式化。沿用现有状态与 Bevy 变化检测，没有增加缓存或调度层。
背景、立绘、音频与 Editor 文档索引已有更新门控，本轮未改动这些模块。

沿用上述环境与无窗口测量方式，100 次预热、100,000 次更新，三组交替测量取中位数。
前版为本轮标题/菜单调整前的工作区，已包含上述对白及鉴赏优化。

| 系统样本 | 前 → 后（µs/update） | 稳定帧相关变更数 |
| --- | ---: | ---: |
| 关闭的标题继续预览 | 1.555 → 1.515 | 3 → 0 |
| 菜单面板与模糊层 | 1.550 → 1.551 | 3 → 0 |
| 存读档单网格 | 1.487 → 1.487 | 1 → 0 |
| Backlog 静止滚动容器 | 1.545 → 1.540 | 2 → 0 |
| 16 个稳定设置按钮 | 1.710 → 1.743 | 16 → 0 |
| 7 个设置数值标签 | 1.880 → 1.538 | 0 → 0 |

计数针对各样本的 Node、TextColor、UiTransform、BackgroundColor，以及按钮的
SettingChoiceVisual 或滚动容器的 ScrollPosition。最后一项减少字符串格式化，原本就没有
无效 Text 写入。耗时接近系统调度开销，部分结果有回退或波动；收益主要是减少无效更新，
没有证据表明整帧或 GPU 耗时改善。

```sh
cargo test --locked --lib --all-features perf_audit_ --no-run
# 相同临时探针分别构建前后版本，再交替运行三次：
target/performance/ui-audit/probe-before-v2 perf_audit_ --ignored --nocapture --test-threads=1
target/performance/ui-audit/probe-after-v2 perf_audit_ --ignored --nocapture --test-threads=1
```

前后源码、临时探针、命令脚本、日志、二进制哈希与 `results.json` 保存在
`target/performance/ui-audit/`。v2 修正了初版 Backlog 样本默认阻塞输入的问题，并补充了
按钮状态计数；上表使用 v2。临时探针不保留在生产源码中。
正式回归覆盖按钮字重、重建设置标签、菜单关闭/重开及模糊恢复、继续预览悬停、翻页清理和
Backlog 动画计时停止。工作区 fmt/check/Clippy、测试（1,148 passed / 28 ignored）、
无默认 feature 的 publisher check 与原生构建通过。macOS 1920×1080 原生窗口确认设置选项、
滑块点击及数值、设置/读档双向切换、翻页、返回标题和 Backlog 开关/短列表滚动；模糊保留。
继续预览的完整生命周期由回归测试覆盖，本轮未做其原生悬停验收；其他平台未实测。测试窗口已关闭。


### 遮罩同步的重复写入

全模块复查包含 Core/Loader、运行时、场景/音视频、渲染、存储、Editor/Authoring、
Media、迁移/发布、开发脚本、CI 与本地依赖补丁的相关更新路径。新增修复仅在
`src/scene/masks.rs`：遮罩透明度变化时，相同 Transform 和 RenderLayers 不再重复写入。
材质仍随渐变更新，窗口尺寸和遮罩平面变化仍更新布局。没有增加缓存、状态或依赖。
其余路径保留现有变化检测、异步交接、校验和失败重试，没有为减少代码量合并不同生命周期。

```sh
cargo test --locked --lib -p keine --all-features overlay_fade_only_changes_material_and_keeps_layout_responsive
```

同一个回归在修改前捕获 `[1, 1]` 次位置/层级变更，修改后为 `[0, 0]`；同时验证渐变材质、
窗口缩放、切换渲染层和无关 stage revision。原始日志与修改前源码位于
`target/performance/global-audit/`，工作区检查命令及结果同目录保存。
fmt、全 feature check/Clippy、工作区测试（同职责用例合并后 1,144 passed / 28 ignored）通过；
此前 16 项打包脚本测试通过。测试合并的独立 diff、命令与日志在 `target/test-consolidation/`。
首次测试的系统废纸篓操作被 macOS 沙箱拒绝，沙箱外重跑完整工作区通过。
这是 ECS 变更计数验证，没有测量 GPU 帧耗时，也未新增跨平台或原生窗口视觉验收。

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

### 内嵌字体

内嵌 Kene Text 的标题/符号回归通过真实 `TextPipeline` 排版和栅格化，检查水仙章节标题及
`src/assets/fonts/KeneText-symbols.txt` 的常见符号均使用内嵌字体、glyph ID 非零，
避免系统字体 fallback 掩盖缺字：

```sh
cargo test --locked -p keine --all-features --lib embedded_font_renders_titles_and_common_symbols_without_fallback
```

252 个新增映射取自 HanaMinA 8.030；原有 21,740 个 glyph 的轮廓、水平度量和
21,703 个字符映射均已逐项核对，原有基线/行高、GSUB/GPOS 与名称表保留。
水仙剧本剩余一处未映射字符为源包自带的私用区 U+E5A2，含义未确认，未擅自替字。
本机禁用持久化的工程副本定位 `chapter_19:140`，Computer Use 已确认原生窗口中
日文/中文终章标题的 `■` 均显示为实心方块。

### 内存、空闲与连续播放

窗口缩放的字体缓存回归使用 Bevy 0.19.1 的真实 `TextPipeline` 和内嵌 CJK 字体，
同时跑未回收对照与生产回收策略。128 个不同缩放比例、相同文字，对照为
134,217,728 CPU 像素字节 / 128 个字号 key；回收后为 33,554,432 字节 / 32 个 key，
退役的 `Image` 资产也已移除。这是字体图集 payload 的 128 → 32 MiB，不是进程 RSS。
原因是上游按精确浮点字号缓存图集，未自动淘汰旧字号；每张最小 RGBA 图集为 1 MiB，
且同时保留 CPU 数据和 GPU 纹理。Runtime 在排版后按最近使用顺序回收闲置字号，
CPU 图集预算 32 MiB；所有现存布局（含隐藏文字）引用的整组图集受保护，
活跃工作集可超过预算。回收后保留三帧资产退役时间，再恢复空闲休眠。

```sh
cargo test --locked -p keine --all-features --lib ui::support::font_cache:: -- --nocapture
cargo build --locked --bin keine --all-features
# 本机真实工程副本；分别将保存的 keine-before / keine-after 复制到
# Narcissu Probe.app/Contents/MacOS/memory-probe 后运行，不修改工程素材或存档。
python3 target/performance/narcissu-memory/run.py before
python3 target/performance/narcissu-memory/run.py after
```

回归另覆盖隐藏布局保护、活跃工作集超预算、布局删除后回收与资源退役后停止唤醒。
本机 Narcissu 工程副本定位 `chapter_00:35`，原生三轮最大化/还原后文字正常；
还原 1920×1080 时 RSS 196,288 KiB，footprint 266,159,400 B。这次原生短测只有
两种最终尺寸，未触发 32 MiB 回收，不能据此主张进程 RSS 改善；高基数回收由上述排版回归覆盖。
原始日志、命令和 2,382 个工程媒体文件的前后 SHA-256 核对保存在
`target/performance/narcissu-memory/`；媒体无变化。该回归不代表 Windows/Linux
原生窗口、长时阅读或整进程 200–300 MiB 的验收。

图形缓冲回收补充覆盖“大尺寸菜单关闭、弹窗相机休眠、还原窗口”的路径。
休眠/失效相机现在同时移除 `ViewTarget` 和 `ViewDepthTexture`，释放其颜色、深度及
旧交换链视图引用；区域模糊中间纹理在没有匹配的活动使用者时退役，光学特效关闭后
释放绑定组持有的源视图。窗口像素尺寸或活动相机集合变化后额外渲染四帧，让
TextureCache 的三帧淘汰和提交收尾完成；后台剧情时钟仍暂停，收尾后恢复休眠。
输出分辨率、纹理格式、采样、shader 和工程媒体均未修改。

本机 M5 Pro / Metal、同一 Narcissu 工程副本从 `chapter_00:35` 启动，使用原生窗口
最大化（窗口外框 5120×2700）、关闭设置菜单，再还原到 1920×1080。下列为一次配对
采样的 physical footprint；RSS 同时留档，但受压缩/编译负载影响，不用于此组改善主张。

| 还原后的分类 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 进程 footprint | 509,248,832 B / 485.7 MiB | 321,602,904 B / 306.7 MiB |
| unmapped graphics | 215,564,288 B / 205.6 MiB | 103,366,656 B / 98.6 MiB |
| IOSurface | 80,576,512 B / 76.8 MiB | 25,460,736 B / 24.3 MiB |

修复前再空闲约三分钟仍为 509,265,192 B；大尺寸关闭菜单后的 footprint 则为
620,463,424 → 598,066,520 B。后者仍包含大尺寸输出所需资源，不能宣称全屏等于
1080p 窗口的占用。修复版另一个同进程的两轮菜单缩放后，graphics / IOSurface 分别
保持 103,366,656 / 25,460,736 B；总 footprint 344.7 → 352.8 MiB 的变化主要落在
Malloc Small，不能据此宣称整进程完全不增长。

```sh
# 使用保存的 keine-graphics-before / keine-graphics-after；窗口操作通过 Computer Use 完成。
python3 target/performance/narcissu-memory/launch-graphics.py before
python3 target/performance/narcissu-memory/launch-graphics.py after
probe_pid=$(cat target/performance/narcissu-memory/graphics-after-native.pid)
ps -p "$probe_pid" -o pid,rss,etime,command
footprint -p "$probe_pid" -f bytes
cargo test --locked -p keine --all-features --lib inactive_camera_releases_render_targets_on_gpu -- --ignored --nocapture
cargo test --locked -p keine --all-features --lib target_retirement_finishes_in_background -- --nocapture
cargo test --locked -p keine --all-features --lib on_gpu -- --ignored --nocapture
```

`graphics-gpu-before.log` 使用同一合法渲染目标回归，在未修相机提取逻辑上确认颜色/深度
附件仍存在；修复后释放并能按新尺寸唤醒。窗口大小、打开/关闭菜单及对白已在本机原生
检查，Gaussian 边界和 source-over Metal 回归通过。原始命令、二进制和分类采样位于
`target/performance/narcissu-memory/graphics-*`。未验证 Windows/Linux 原生缩放、
长时剧情或 device-loss；这次没有新的打包/发行验收。

区域模糊的绑定组现在按源纹理视图与 uniform buffer 的实际 ID 复用，保留范围仅为
仍运行该 pass 的活动相机和当前中间纹理。无可见处理区域、目标尺寸/缓冲更换及
相机休眠后清理旧绑定；光学特效的绑定缓存也在 render prepare 阶段回收，
不依赖相机继续执行才能释放。输出尺寸、格式、采样和 shader 均保持原样。

真实 Metal 回归中，60 个稳定帧的每帧丢弃绑定组对照（等价于原来两次创建）为
120 次分配，复用后新增 0 次。两种策略执行相同的两次模糊 pass；这只是分配计数，
不是整游戏 RSS、CPU 或 FPS 改善。另覆盖 uniform 扩容、2560×1440 / 64×64
切换、屏幕外区域、无 pass 标记的相机，以及光学相机停用、恢复和销毁。
素材预取仍按既有字节预算管理，字体预算保护活动布局，存档预览保留当前页，
视频继续使用有界队列；本轮没有调整素材解码规格或增加 1080p 缓存上限。

```sh
cargo test --locked -p keine --all-features --lib on_gpu -- --ignored --nocapture
cargo check --workspace --locked --all-targets --all-features
cargo clippy --workspace --locked --all-targets --all-features -- -D warnings
```

命令、分配计数和检查日志保存在 `target/performance/postprocess-cache/`。
本机 Narcissu 测试副本已检查正常窗口、最大化及还原后的背景/对白画面；
菜单点击被 Computer Use 的 `noWindowsAvailable` 阻断，未计为菜单人工验收通过。
工作区全功能 / publisher-only 测试及五项 Metal 回归通过，native-smoke 校验通过，
2,382 个工程媒体文件 SHA-256 均未变化；未做新的发行打包验收。
Windows/Linux 原生运行、长时压力与真实 device-loss 仍未验收。

下列为 M5 Pro / 24 GiB / macOS 27.0.1 / Metal、dev opt-level=1 的历史记录；
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
当时的三帧收尾使资源退役得以完成，不清空字体/模糊/allocator 缓存；缓存保留与泄漏不能凭单点占用区分。

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

#### 开发态真实图片读取与解码

2026-10-23，在 `4c04778`、Rust 1.99.0、macOS 27.0.1 arm64 / M5 Pro / 24 GiB 上，
测量 tday 全部 35 张 WebP（31 背景、4 立绘，8,664,922 B），以及本机 Narcissu
196 张背景中按压缩文件大小分层选出的 40 张（8,600,150 B）。源素材只读复制到临时
目录并打包，身份仅在内存中生成；不使用作者私钥或相邻 Hakutaku worktree 的修改。

实际路径是 `OverlayAssetReader → ContentMount → ContentFile → AssetCursor`（包）
或散文件，之后使用生产 `read_webp_input`、`target_size`、native WebP decoder 和
Bevy `Image::new`。当前读取已有几何扩容与持久 cursor，RGBA 所有权直接移动，没有
整图 clone；背景上限 1920×1080，立绘本次使用实际工程的 sprite height 1080。
计时拆分为打开/读完压缩输入、解码/构造 Image、场景取色，完整 RGBA 校验不计时。

保留的修改仅为 `[profile.dev.package.libwebp-sys] opt-level = 3`：原来原生 C codec
也继承 dev/test 的 opt-level=1，其 build.rs 通过 `cc` 使用 Cargo 的 `OPT_LEVEL`。
发行版本来就是 opt-level=3，**这不是 shipping 性能提升**。没有改变 codec 算法、
线程设置、输出格式、尺寸/像素限制、缓存或认证链，也没有新依赖。

六对独立进程，前三对 before/after，后三对 after/before；每进程每后端五遍，先取
进程内中位数，再取六轮中位数。每遍新开 package，宿主文件缓存为热；打包、打开
package 和构造挂载不计时，桌面负载未隔离。表中是整组解码耗时，不是单张或 P95。

| 后端 / 图片组 | 原实现 | codec opt-level=3 | 变化 |
| --- | ---: | ---: | ---: |
| Hakutaku / tday 31 背景 | 237.794 ms | 195.649 ms | −17.7% |
| Hakutaku / tday 4 立绘 | 92.100 ms | 88.872 ms | −3.5% |
| Hakutaku / Narcissu 40 背景 | 234.790 ms | 212.245 ms | −9.6% |
| 散文件 / tday 31 背景 | 232.366 ms | 200.474 ms | −13.7% |
| 散文件 / tday 4 立绘 | 93.594 ms | 89.058 ms | −4.8% |
| 散文件 / Narcissu 40 背景 | 242.402 ms | 213.264 ms | −12.0% |

Hakutaku 三组读取合计分别为 3.840 → 3.733、3.020 → 2.958、6.542 → 6.666 ms，
不是物理 SSD 时间，不能宣称读取加速。对应读取+解码+取色合计为
242.127 → 199.861、95.156 → 91.988、241.606 → 219.101 ms。
75 张图在所有后端/遍次/前后版本中输出尺寸、完整 RGBA hash 相同；231 个源 WebP
的 SHA-256 未变。另一个省掉 RGBA 初始化清零的候选在反序后收益不足且立绘略慢，
已撤回。未测冷存储、GPU 上传、AssetServer 调度、实际呈现延迟或其他平台；不把这组
CPU 结果解释为帧率、峰值内存或发行版加载性能变化。

```sh
KEINE_IMAGE_BENCH=/path/to/read-only/images \
  cargo test --locked -p keine --all-features --lib \
  scene::images::benchmark::mounted_image_reads -- --ignored --nocapture --test-threads=1
```

可复用入口位于 `tests/bench/runtime/images.rs`。原始 binary、逐图日志、候选 diff、
输入/二进制 SHA-256、命令和汇总器保存在本机 `target/performance/image-reads/`；
保留方案的六轮对照位于其 `codec-o3/` 子目录，当前命令测优化后的 dev/test 配置。
保留版本通过 fmt、workspace all-targets/all-features check/Clippy、全功能及
no-default-features + publisher 两组串行工作区测试；IPC 测试在允许本地 socket 的
环境运行。这不包含窗口视觉、GPU 或其他平台的验收。

#### Release 图片读取与解码

同日、同 checkout 和 75 张素材，用 `--release` 重新构建生产读取/解码路径：
opt-level=3、LTO、codegen-units=1，libwebp 原生代码也为 opt-level=3。
这是 release profile 的测试 harness，非正式游戏包启动；依据
[Cargo 测试合同](https://doc.rust-lang.org/cargo/reference/profiles.html#panic)，测试使用
unwind，而非 shipping 的 panic=abort。前述 dev-only codec override 不影响本组结果。
仍为热宿主文件缓存、每遍新开 package、每进程五遍、六对进程且后三对反序；
计时期间没有并行编译。初步单次运行发生过整机波动，原始日志保留但不混入配对统计。

| Hakutaku 路径 / 图片组 | 原实现读取 | 原实现解码 | 关闭 codec 内部线程后解码 | 解码变化 |
| --- | ---: | ---: | ---: | ---: |
| tday 31 张 1080p 有损背景 | 3.396 ms | 185.944 ms | 252.134 ms | +35.6% |
| tday 4 张无损立绘，1024×1536 → 720×1080 | 2.805 ms | 84.377 ms | 84.392 ms | +0.02% |
| Narcissu 40 张 1080p 无损背景 | 6.272 ms | 207.244 ms | 207.711 ms | +0.23% |

均为整组时间的中位数，不是单张 P95。原实现读取+解码+取色合计分别为
189.777 / 87.253 / 213.704 ms；读取仅占约 1.8% / 3.2% / 2.9%，不是物理 SSD 时间。
散文件的有损背景解码也从 185.549 增至 252.667 ms（+36.2%）；两组无损对照变化
均小于 0.4%。锁定 libwebp 的 `VP8GetThreadMethod` 只为满足宽度条件的有损 VP8
启用工作线程，无损 VP8L 不走该分支，观察与源码一致。

候选仅修改 `config.options.use_threads = 1` 为 `0`，已撤回；没有保留新的发行版
生产代码改动，也没有改变像素质量、尺寸、安全限制、缓存或认证链。
当前主要成本为原生解码，未发现值得增加复杂度的重复读取或整图复制；这不证明
没有任何优化空间，也不覆盖冷存储、GPU 上传、AssetServer 调度或其他硬件。
75 张图片所有版本/后端/遍次输出尺寸和完整 RGBA hash 相同，231 个源 WebP 的
SHA-256 未变。原始构建日志、两个 binary、24 份正式逐图日志、初测、候选 patch、
输入验证、二进制 SHA-256 和命令位于本机 `target/performance/image-release/`；
复用 `target/performance/image-reads/summarize.mjs` 汇总。
撤回后通过 fmt、workspace all-targets/all-features check/Clippy、两组串行工作区
测试（all-features / no-default-features + publisher），以及 release 下 12 项图片
回归和 7 项 media 回归；没有执行本轮窗口/GPU 或其他平台验收。

```sh
KEINE_IMAGE_BENCH=/path/to/read-only/images \
  cargo test --locked --release -p keine --all-features --lib \
  scene::images::benchmark::mounted_image_reads -- --ignored --nocapture --test-threads=1
```

#### 真实语音首读与连续解码

2026-10-23，在 `3187648`、Rust 1.99.0、macOS arm64 / M5 Pro / 24 GiB 上，
从本机 Narcissu 的 2,096 段 Opus 按文件大小分层抽取 96 段，共 3,521,091 B。
使用锁定的 Hakutaku revision，不包含相邻 Hakutaku worktree 的未提交修改。
实际路径为 `OpusSource → StreamingAudioFile → ContentFile → AssetCursor`；
每个播放流持有 cursor，不是反复使用一次性的 `Asset::read_at()`。
AssetLoader 当前初始化一次流以验证输入及取得时长，Decodable 播放时再独立打开。

专项以相同流程测量散文件和资源包，不创建音频设备或窗口。六对进程，前三对
before/after，后三对 after/before；每个进程五遍，先取进程内中位数再取六轮中位数。
每遍重新打开 package，宿主文件系统缓存保持热；dev/test opt-level=1，不是 shipping
LTO。打包、打开 package 与构造目录不计时；读取计数器有相同的计时开销，桌面负载
未隔离。下表均为 96 段合计，首段 PCM 为每段 20 ms，连续解码按最快速度消费剩余
sample，并计算校验和，不包含 Rodio mixer、设备缓冲、帧调度或实际听觉延迟。

| Hakutaku 路径 | 原实现 | 候选 | 结果 |
| --- | ---: | ---: | --- |
| 加载探测 + 初始化播放并产出首段 PCM | 18.214 ms | 18.516 ms | +1.7%，无稳定收益 |
| 剩余内容连续解码/消费 | 350.539 ms | 356.031 ms | +1.6%，无稳定收益 |
| 全流程 ContentFile 读取累计 | 6.099 ms | 6.329 ms | 非物理 SSD 计时 |

候选仅复用 codec registry、预分配 Ogg 最终的 128 KiB ring buffer、通过独占
`Mutex::get_mut()` 避免每次 Read/Seek 加锁。初轮看似改善，反序后不成立，已全部撤回；
没有改动生产读取策略、缓存预算、块大小或认证链。原实现平均首段准备约 0.190 ms/文件，
这是批量均值而非 P95。读取累计仅占完整解码流程约 1.7%，当前测量不足以支持
为了消除双重探测而保留预取 decoder、增加长期内存和生命周期状态。

两种后端、全部原版/候选遍次均产出 26,692,901 个 sample，相同 PCM bit checksum。
每遍逻辑 ContentFile 返回 14,548,830 B / 2,812 次 read（含 EOF），约为素材大小的
4.13 倍；这是 Ogg 首尾探测与重新打开产生的逻辑读取，**不是** Hakutaku segment
物理读取放大。散文件首段准备为 30.846 → 29.097 ms，受路径校验及宿主状态影响，
不能外推为存储后端排名。没有测冷缓存、低端设备、长时硬件播放或真实掉音。

```sh
KEINE_VOICE_BENCH=/path/to/read-only/voices \
  cargo test --locked -p keine --all-features --lib \
  runtime::audio::benchmark::mounted_voice_reads -- --ignored --nocapture --test-threads=1
```

可复用测量位于 `tests/bench/runtime/audio.rs`；临时打包只使用内存中生成的测试身份，
不修改源素材。原始 before/after binaries、12 份逐遍日志、输入 SHA-256、构建日志及
汇总器位于本机 `target/performance/voice-reads/`。候选已撤回，当前命令只复现原实现。
保留版本通过 fmt、workspace all-targets/all-features check/Clippy、串行工作区全功能
测试及显式语音基准；2,096 个源文件 SHA-256 未变。并行测试中一次 Editor 导出失败
单独重跑及串行套件均通过，沙箱 IPC 拒绝另在沙箱外重跑，不计作代码修复。

#### 格式与既有集成证据

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

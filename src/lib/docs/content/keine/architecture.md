# 架构与数据合同

本文描述当前源码的职责和运行合同；语言、操作步骤、验收结果分别由其他指南维护。
版本以 [`Cargo.toml`](../../Cargo.toml) 和各格式 owner 为准，历史测量不代表新版已重新验收。

## 模块与依赖

```text
keine/
├── crates/
│   ├── core/        Bevy-free：typed Action / Program / State、表达式、确定性执行
│   ├── loader/      Bevy-free：asset / editor / script / store adapters、内容与诊断
│   ├── authoring/   Bevy-free：Editor–Engine 二进制协议
│   ├── editor/      GPUI 工作台、源文档、文件与资源、Preview 客户端
│   └── media/       有界原生 WebP 解码
├── src/
│   ├── runtime/     启动、宿主、输入、脚本驱动、Preview 生命周期
│   ├── scene/       图片、立绘、音视频、特效
│   ├── render/      render-world 管线
│   ├── ui/          固定 MainCore UI、舞台、覆盖层
│   ├── storage/     存档、设置、profile、gallery、history、backup
│   ├── migration/   publisher-only 工程转换与资源重映射
│   └── assets/      内嵌字体、音效、shader、图标与品牌图片
├── tests/           集成回归、bench、fuzz、视频验收与 fixtures
├── dev/             文档与构建/发行脚本
└── projects/        tday 示例工程；其他本机作者工程忽略
```

下表为正常依赖；测试依赖不改变运行时分层。

| Owner | 直接依赖与职责边界 |
| --- | --- |
| `keine-core` | typed Action / Program / State、表达式和确定性执行；不依赖其他 Kēne crate 或 Bevy |
| `keine-loader` | 依赖 Core、Hakutaku Core；适配源工程/挂载内容，产生 typed Program 与诊断 |
| `keine-authoring` | 独立的版本化消息结构与有界分帧；不依赖 Core、Loader 或 UI |
| `keine-media` | 有界 WebP 解码；可选 `icons` 支持图标输入，不拥有场景或文件事务 |
| `keine` | Bevy 宿主，依赖 Core、Loader、Authoring、Media；`publisher` 才引入 Hakutaku Pack |
| `keine-editor` | GPUI 工作台，依赖 Core、Loader、Authoring、Media；Bevy 仅用于 dev-dependencies |

Runtime 只消费 typed `Program` / `State`，
不解析 Editor JSON、工程兼容字段或包格式细节。外部编辑器逻辑留在 editor adapter。
已有 Rust 模块/API 名保持兼容，文件按目录职责组织；不新增通用 backend、主题或插件框架。

`Flow.when` 保留兼容表达式的 truthy 判定；仅假条件跳过动作。求值失败返回
`RuntimeError(InvalidFlowCondition)`，沿用 `ScriptDiagnostic` 的 scene / cursor 和 Preview
源码映射，不继续执行后续动作。原始求值原因保留在日志；不将失败解释为 false。

```text
作者工程 → Loader adapters / 校验 → Program
Program + 输入/宿主 → Runtime 调度 / Core 执行 → State → Scene / UI → Render
Editor 源文档 → Authoring IPC → 独立 Engine Preview（临时持久化根）
作者工程 → publisher 编译/规范媒体检查 → Hakutaku Pack → 发行包
发行包 → Hakutaku Core / Loader → 编译 Program + 只读资源流
```

运行调度由 [`src/runtime.rs`](../../src/runtime.rs) 组装：PreUpdate 在 Bevy 输入之后收集事件；
Update 按 Input → Sync → Layout → Ui 的系统集合排序；Last 协调相机输出、窗口生命周期和后台音频。
Core 不拥有 OS/GPU/音频句柄；Scene/Render/UI 不另建剧本状态真源。
Bevy 的局部改动分别记录在 [render](../vendor/bevy_render/KEINE-PATCH.md)、
[winit](../vendor/bevy_winit/KEINE-PATCH.md)、[audio](../vendor/bevy_audio/KEINE-PATCH.md) 的补丁说明中。

Runtime 内部按以下职责定位代码，原有入口继续由对应模块导出：

| 文件 | 职责 |
| --- | --- |
| `runtime/bootstrap.rs` | CLI 分派、工程打开/校验、App 与相机组装 |
| `runtime/benchmark/workloads.rs` / `report.rs` | 共用测试负载与目标定位 / 有界子进程采样和报告 |
| `runtime/tick.rs` | 每帧播放调度、文字时钟、演出推进；统一维护执行顺序 |
| `runtime/script/reload.rs` | 后台脚本重建、完成后的状态安装、旧 Editor 光标轮询 |
| `runtime/preview/seek.rs` | Editor 源位置定位、确定性重放与 Program 替换后的状态重建 |

`reload` / `seek` 由 `tick` 装配为内部子模块，已有 `tick::*` 调用路径保持兼容。

## 源码热重载

文件监听 worker 与原生 Preview 共用 `runtime/script/reload.rs` 的候选构建与安装。
原生脚本的语法/语义、入口与入口控制流校验全部成功后才替换 Program、资源映射及
适配器提供的刷新配置；失败保留上一份有效现场。后台构建完成时若已有更新的文件
事件，丢弃该结果。兼容适配器原有诊断等级政策不变；本合同不扩展配置/资源清单的监听范围。

Authoring 已接受的文档 revision 与 Preview 实际应用的 revision 分离；执行位置和
Inspector 快照使用后者，未应用的新源码不允许定位到旧 Program。完整 Program 与
资源引用语义相同、且没有适配器配置刷新时，仅更新源位置，不重建现场、重置 checkpoint、
标记渲染/音频资源变化或追加加载帧。原生 Editor Preview 的语义修改从工程入口及
初始变量重建，避免把现场变量作为重放输入；不迁移跨 Program 的 checkpoint。
普通 dev 与兼容适配器保留场景头恢复政策及当前变量，不把此路径称为安全路线恢复。

Core 的 `visit_presentation_blocks` 提供类型化、无分配且可提前停止的演出阻塞遍历；
`presentation_blocked` 与 Inspector 复用同一规则。宿主/UI 等待仍由 Runtime 追加，
字符串只在已有 Inspector 查询中生成，Authoring wire 与 Save 格式不变。

## 版本合同

这些版本各自演进，不能用应用版本号推断 wire compatibility。

| 合同 | 当前值 | 实现 owner |
| --- | --- | --- |
| Eiyashou 配置 | `script.version: 2` | Loader Native adapter；[语言指南](language.md) |
| 编译 Program | envelope 1 / IR 7 | [`compiled.rs`](../../crates/loader/src/compiled.rs) |
| 存档 / 设置 / 窗口 | 11 / 4 / 1 | Loader Store adapter / Storage / Runtime window |
| Editor–Engine IPC | 12 | [`authoring`](../../crates/authoring/src/lib.rs)；两端成对更新 |
| Hakutaku | 库 0.2.0 / wire v2 | 固定 Git revision；[发行指南](release.md#hakutaku-020--v2) |

## 内容与资源

- 挂载为只读、有序的 `ContentMount` / `ContentFile`；后挂载覆盖先挂载。
- 路径必须受挂载根目录约束；绝对路径、`..` 逃逸、符号链接逃逸和发行 special files 被拒绝。
- 文件打开不能只依赖先前的 canonical 路径检查：Unix 逐级按目录句柄打开并拒绝新出现的符号链接；Windows 在读取前核对已打开句柄的实际路径。目录内合法链接仍可使用。
- 工程所有资源引用在 Loader 中解析；运行时不会依赖当前工作目录寻找工程资源。
- 当前画面资源优先加载；普通预取只保留前 8 个不同资源，最多 1 个投机加载。
- 非关键预取另有 128 MiB 保留预算，按图片解码数据/纹理 payload 估算和音频内存字节计费，流式 Opus 不计整文件；按 urgent/预测顺序淘汰，当前显示与作者显式 blocking 资源不淘汰。尺寸未确认时暂停追加加载，超限项在当前计划中延后。
- 视频独立流式播放；挂载中的 Opus 通过可重开的内容流解码。
- PNG/JPEG、WAV/MP3/Vorbis/FLAC 是开发兼容输入；正式打包拒绝非 WebP/Opus 独立媒体。

## 渲染与生命周期

内建动画预设的纯 transform 计算归 `crates/core/src/runtime/animation.rs`；
Action 入场初态与 Engine 每帧插值共用同一规则，计时、完成移除和渲染仍由各自生命周期负责。

1920×1080 是唯一设计空间。viewport/letterbox 转换只有一个 owner。
scene、normal UI、dialog camera 职责固定，特效不得改变合成顺序。
GPU instance 创建前传递 winit 的 owned display connection，连接保留到 instance
释放，并用于 GPU recovery；不能以离屏 EGL 配置呈现 Wayland/X11 窗口。
关闭窗口时，extraction 停止对应视图绘制，但保留 surface/native handle 到最后一帧
提交后的 render cleanup；等待已提交 GPU 工作后再释放，最多 10 秒，失败记录诊断。
不能依赖 Queue 析构时才等待，
那时 native GL 的 surface/context 可能已被拆除；这不是挂死驱动的恢复保证。
Bevy 0.20 的 Sprite 使用 Mesh2d/Material2d，绘制条目跨帧保留；合并淡入淡出
只临时禁用回退绘制，下帧先恢复，管线等待、素材更换和淡入取消时仍有原画面。
自定义材质使用 WESL；采样、滤镜参数、模糊与合成顺序保持原合同。
UI 绘制数据按变化保留；文字阴影跟随同一 dirty 集合更新，并使用带变换的裁剪区域。
固定 UI 暂沿用 Bevy 的兼容 Interaction 状态和自己的 Button 标记，触摸捕获与键盘
导航仍由现有 owner 处理，没有同时启用另一套 picking 按钮分派。

三层相机统一使用单采样目标（`Msaa::Off`）：后续相机不能再用 MSAA resolve
覆盖已经写入目标纹理的模糊和 UI；位图与文字沿用各自的采样与抗锯齿。
三层在同一个中间目标上合成，仅最后一个活动相机输出到窗口；前面的相机使用
`CameraOutputMode::Skip` 避免重复全屏复制。输出 owner 随弹窗相机休眠/唤醒及
benchmark 相机组合更新，场景与 UI 的渲染和区域模糊仍按原顺序运行。
普通背景 Fade/Crossfade 可合并为一次双纹理 source-over 绘制；有变换、滤镜、
遮罩、粒子、视频或交错图层时沿用原路径。原来的两层实体保留，render queue
完成后仅在合并管线与实际纹理/采样器绑定就绪时禁用当前帧的两层绘制；未就绪
则跳过合并绘制，下一帧重试，不能先隐藏旧背景再等待资源。
区域模糊须两条管线同时就绪才处理当前帧，裁剪后无像素则跳过；弱半径的高斯
权重下溢时停止采样，避免形成非有限 UV。原生视频等待纹理时只向空队列槽重排
旧帧，不能覆盖新帧；Core Video 纹理缓存随 RenderDevice 更换重建，保持 HAL
纹理导入的设备归属。
Editor 通过显式开始/停止控制独立原生 Engine；Block 与执行位置双向同步。
失去窗口焦点不会代替停止指令。

菜单、Backlog、鉴赏和弹窗暂停 Tick 时，未完成的打字、演出和眨眼等待不持续请求重绘。
UI 动画、输入、媒体/粒子及实时 shader 保留各自的唤醒条件；返回舞台后恢复原演出计时。

实验性 Android Engine 使用系统 NativeActivity 与现有 runtime，平台入口集中在
`runtime/android.rs`；游戏 APK 的加密内容通过有界 AssetManager 文件描述符只读挂载，
不复制整份资源。引擎测试包仍读取私有 files/game，存档按 `project.id` 隔离。
Android 当前无视频，启动先尝试 Vulkan、初始化错误时回退 OpenGL ES；游戏与错误页共用
平台渲染配置。构建与验收边界见 [Android guide](android.md)。

## 音频输出

自动播放在文字显示完且当前语音实际结束后，才开始设置中的阅读延时。
待加载、暂停或静音的语音不视为结束；加载失败经音频清理后解除等待。
Runtime 在音频同步前也检查新对白/恢复语音请求，避免零延时跳过尚未创建的播放器。
手动推进、快进及作者显式 `auto_advance` 保留各自的推进语义。

`bevy_audio` 同版局部补丁保留一个 48kHz/stereo 逻辑 mixer；播放器、解码器、暂停、
音量与采样位置独立于物理 stream。恢复 worker 只重建设备输出，Windows 每秒检查
默认 endpoint ID；CoreAudio 健康 DefaultOutput 沿用系统路由，Android AAudio 断流及
三秒无 callback 时触发重连。无设备时保留队列，失败从 250ms 退避到最多 5s。
错误 callback 只标记断流；close/open、日志与 winit 唤醒均在 worker 中执行。
淡化使用实际提交到健康输出的时钟；断流不消耗淡入淡出，也不为了等待设备持续重绘。
Asset audition 与同一 authoring Session 的 Preview 共用输出 owner。Linux ALSA default
路由取决于系统音频配置；输出格式变化可能丢失少量重采样预读及硬件缓冲，不承诺无缝切换。
上游差异、来源与许可证见 [audio patch](../vendor/bevy_audio/KEINE-PATCH.md)。

## UI 职责

Editor（GPUI）按功能拥有面板状态及视图，工作台只负责分派、Dock 与共享输入。
Engine（Bevy）的 Settings、Save/Load、Dialog、Extra 各自拆为 `state/view/actions/motion/sync`；
原有系统入口由 facade 重新导出，保持注册顺序、相机层和共享菜单路由。
Extra 的 `music.rs` 单独拥有曲目播放、拖动进度、列表滚动和音频状态；按钮反馈仍复用 Settings 的实现。
槽位截图采集属于 `ui/screens/save/capture`；预览编码与落盘属于 `storage/save/preview`，
继续使用容量为 2 的后台队列和存档代际校验，删除/替换后不写回过期缩略图。
这两套 UI 共用 authoring 协议与 typed 状态，不共享渲染框架。

## 持久化

Save v11 只恢复到 fingerprint 相同的 Program；不支持的二进制布局直接拒绝。
普通/快速存档在当前状态不可完整序列化时，立即保存最近的可恢复 action 边界；
Runtime 在创建瞬态演出前捕获边界，读档后重新进入该演出，不推进现场剧本或等待演出结束。
`script/driver.rs` 的动作分类使用穷尽匹配，新增 Action 必须明确是否需要前置检查点；
`State::persistence_safety()` 则判断当前实例能否精确保存，两者不互相替代。
新增状态字段时须同步审查序列化、恢复/Backlog、演出阻塞与 Editor 检视；
产生瞬态状态的动作应在现有表驱动回归中验证前置边界、Save v11 编解码和恢复重放。
普通可序列化动作不增加前置 State 克隆。State 保持唯一真源，tick 的帧内调度顺序保持不变。
回退存档不捕获较晚的现场画面；卡片显示检查点文本，无匹配截图时使用默认背景。
profile、read history、gallery、settings、window bounds 不随 slot rollback 回滚。
profile/已读延迟写入和鉴赏失败重试使用 Real clock；Storage 提供下一次写入期限，
runtime 复用休眠调度到期唤醒，Virtual clock 可以继续暂停。退出时补写三个独立域。
设置/鉴赏读取失败时使用默认值并提示；下一次写入前，先将不可读原件保留为同目录
`.recovery-N`，无法保留则拒绝覆盖。保护只在加载/实际写入时执行，不增加逐帧文件扫描；
保留使用硬链接，不支持硬链接的文件系统会保留原件并报告写入失败。
保存、读取、删除、导入/导出失败使用已有确认框；后台写入失败每会话提示一次，
不覆盖正在等待选择的确认框，原有重试策略保持不变。
窗口布局由 runtime/window.rs 管理，独立版本化 `saves/window.bin` 保存正常窗口
物理尺寸、位置、DPI 和最大化状态，不改变设置 v4 或 Save v11。启动时按当前 monitor
限制尺寸和位置，再显示窗口；benchmark 保留显式尺寸及隐藏窗口策略。
发行数据写入稳定 `project.id` 对应的平台 user-data 目录；不写到只读 bundle 旁。
Preview 使用子进程临时数据根，子进程退出后清理。

读写共用大小上限；读取先检查长度并使用 bounded read，写入先编码验证再原子替换。
Editor 文档/恢复草稿及 Loader 作者清单使用限量读取；Hakutaku 配置与目录配置共用 256 KiB 上限，编译文件先验证固定头中的 metadata/payload 长度，再分配、读取正文。
Save 与独立持久化数据均拒绝 postcard 尾部多余字节；设置中的非有限数回到默认值。
Backup 按实际读取字节限制总量；拒绝路径/设备名、重复及大小写冲突，并在未提交目录中独占创建文件，避免临时名与文件系统别名覆盖。
解码按 [postcard 剩余字节接口](https://docs.rs/postcard/1.1.3/postcard/fn.take_from_bytes.html) 检查完整消费；跨平台文件名约束依据 [Windows 命名规则](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)。
Backup import 同步待提交目录后切换正式目录；publisher 在安装失败时恢复旧目录，
提交后的旧副本清理失败报告 warning。源文档保存另检查外部修改；保存/刷新完成后的草稿清理失败只报告 warning。
Backup 有启动恢复；publisher 两次 rename 之间被强制终止时，旧发布可能仍在 `.名称.backup-PID`，需手动恢复。现有测试不保证真实断电下的全平台持久性。

## 编译与发行格式

```text
release/
├── keine[.exe]        hardened runtime
├── game.haku          完整、签名、加密的 Hakutaku v2 快照
├── NOTICE             完整许可、署名、字体/native 声明及游戏版权（分章节）
├── data/*.taku        不可变密文内容段
└── lib/               可选运行库；benchmark 的符号、采集器与启动标记
```

编译 Program envelope v1 / IR schema v7 保存 typed 内容；发行资源由 allowlist 重建。
包中不包含 `.shou`、WebGAL 脚本、LetsGal 作者工程或 publisher identity。
Hakutaku 的字节布局以[锁定依赖的格式规范](https://github.com/maincoretech/hakutaku/blob/8d637d5629b84f99251fd445366892bdb3c7cf2b/docs/FORMAT.md)为准；Kēne 不维护第二套 wire spec。
每个文件直接引用物理块；快照更新复用旧块并原子切换。随机读取不先解密整包到磁盘。
签名和 AEAD 保证身份与完整性；离线内嵌密钥不承诺抵抗能调试客户端的攻击者。
Loader 将 publisher 的随机密钥拆分转换成每次 bundle 变化的逐字重建代码，
只提高静态分析门槛；验签公钥可以公开，签名私钥不进入 Engine 构建。细节见[密钥与更新](release.md#密钥与更新)。
Kēne 当前以 `OpenPolicy::TrustFirstRelease` 打开包，没有持久化已接受的最高发行序号。
`KEINE_HAKUTAKU_RELEASE_FLOOR` 只控制发布端新序号，不构成客户端防回退；
未来若需要防回退，须由安装/更新 owner 持久化并传入 `RequireAtLeast`，不能只改打包变量。

## 必要限制

数值对应现有实现，改变上限须同时修改读写 owner 和边界回归。

| 内容 | 上限 |
|---|---:|
| 工程 `config.yaml` / Editor 单文档 | 256 KiB / 1 MiB |
| Loader 单源文件 | 32 MiB |
| WebP 压缩输入 / 源像素 / 输出像素 | 64 MiB / 67,108,864 / 16,777,216 |
| 视频 RGBA 队列 / 全局 surface-equivalent 预算 | 2 帧 / 256 MiB |
| 兼容音频 encoded input | 128 MiB |
| 编译 metadata / payload | 1 MiB / 512 MiB |
| 编译 scenes / actions | 1,000,000 / 100,000,000 |
| Save metadata / state | 64 KiB / 64 MiB |
| settings / gallery / profile / read history | 64 KiB / 16 MiB / 16 MiB / 64 MiB |
| Backup envelope / 文件数 / 单文件 | 128 MiB / 4,096 / 72 MiB |
| core 单次执行 / seek / blocking replay | 1,024 / 65,536 / 1,024 步 |
| 表达式解析嵌套 / typed 表达式树深度（含叶节点） | 64 / 64 |

Hakutaku 另有 catalog、page、block、数量和路径限制，由锁定依赖分配前验证。
运行时使用 `memory_constrained()`：block-map cache 512 KiB、plaintext cache 16 MiB、
prefetch cache 512 KiB、4 个 idle handles。缓存预算不等于整个进程的内存上限。
128 MiB 预取预算也不包含当前画面、codec/GPU 开销、其他 owner 的强引用或淘汰前的一项在途解码；释放 cache handle 不代表资源立即从整个进程消失。
视频 surface 预算也不包含后端 codec working set。

实现入口：[`core`](../../crates/core/src/lib.rs)、[`loader`](../../crates/loader/src/lib.rs)、
[`compiled`](../../crates/loader/src/compiled.rs)、[`media`](../../crates/media/src/lib.rs)、
[`storage`](../../src/storage.rs)、[`publisher`](../../src/publisher.rs)。

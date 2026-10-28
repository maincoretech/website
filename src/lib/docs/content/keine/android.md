# Android Engine

当前范围是独立游戏运行版的实验性 ARM64 构建：Android 8 / API 26 起、横屏、Vulkan / OpenGL ES。
**安卓暂不支持视频**；`video-native` / `video-ffmpeg` 在安卓目标上明确拒绝编译。
Editor、publisher、桌面文件选择器不进入安卓运行依赖。Core、Loader、剧本、存档格式与桌面共用。

## 构建与 CI

日常推荐使用 GitHub Actions：打开 **CI** → **Run workflow**，将 `checks` 选为 `android`；
结束后下载 `keine-android-arm64-engine` artifact 中的 APK。
GitHub 的 [Ubuntu runner](https://github.com/actions/runner-images) 已有 Android SDK；
workflow 安装固定 NDK/Gradle/Rust 工具，无需开发机常驻整套环境。
这是云端构建 VM，不是手机 GPU 验收环境。当前不维护额外 Docker 镜像。

需要本地构建时：

安装 Rust `aarch64-linux-android` 目标、cargo-ndk 4.1.2、JDK 17、Gradle 9.8.1 / AGP 9.4.1、CMake、Python 3；
Android SDK 安装 `platforms;android-35`、`build-tools;36.0.0`、NDK `28.2.13676358`。
设置 `ANDROID_HOME` 为 SDK 根，`ANDROID_NDK_HOME` 为该 NDK 目录：

```sh
rustup target add aarch64-linux-android
cargo install cargo-ndk --version 4.1.2 --locked
dev/scripts/build-android.sh
```

脚本将现有 `keine` library 编译成 release 优化的 `libkeine.so`，不改变桌面 library 类型；
最终链接显式设置 16 KB max/common page size，保证 LOAD 和 RELRO 边界不依赖偶然布局。
Gradle 使用 NativeActivity 封装为 **debug 签名的测试 APK**，没有 Java/Kotlin 应用依赖。
唯一 Java 子类 `EngineActivity` 将 API 33+ 已完成的系统返回回调和旧版返回送到 Rust，
唤醒现有事件循环；UI 取消/关闭逻辑只有一个 owner。它还通过系统文档选择器把用户
选中文件的描述符交给公共备份逻辑，不引入 AndroidX 或 Kotlin。
NativeActivity 销毁等待 Rust 线程保存/清理完成后结束独立引擎进程，避免退出后重开时
复用 winit/Bevy 的进程级单例；普通暂停/恢复不走销毁流程。
AGP 的模块级 `enableKotlin = false` 关闭无需使用的 Kotlin 编译与自动标准库依赖；
CI 拒绝 APK 中意外进入的 Kotlin 标准库资源，并要求 `debugRuntimeClasspath` 为空；
自有返回桥接和 AGP 生成的 R/API DEX 保留，见 [官方配置](https://developer.android.com/build/migrate-to-built-in-kotlin)。
APK 为 `dev/android/app/build/outputs/apk/debug/app-debug.apk`，原生库为
`target/android/jniLibs/arm64-v8a/libkeine.so`。正式应用签名尚未接入。

构建脚本在宿主机从单张默认 PNG 派生各密度 launcher 与 adaptive icon；正式游戏打包
读取 `project.icon`（PNG/WebP），通过同一生成器传给 Gradle，不改变原生运行依赖。
APK 校验沿 manifest 资源 ID 检查编译资源表、各密度 PNG 和 adaptive 前景/背景/bitmap 引用；
不要求源码文件名与 APK ZIP 路径相同。release 可由 [AAPT2 optimize](https://developer.android.com/tools/aapt2#optimize)
缩短资源路径，Android CI 同时校验 debug/release。配置及桌面派生见 [发布](release.md#应用图标)。

**CI** 中的 Android job 在相关 push/PR 或手动选择 `android` 时检查依赖隔离、Android Clippy 与 Java lint，构建原生库与 APK，验证 NativeActivity
启动符号、ELF 16 KB 对齐、APK 对齐及签名，确认 Vulkan/GLES feature closure，
复核 APK 的 GLES/Vulkan 硬件声明，上传 `keine-android-arm64-engine` artifact。
纯文档或仅修改 `crates/editor/**` 时跳过自动构建；混合修改共享源码/根 Cargo 清单/锁文件仍运行，手动入口不受路径过滤影响。
此引擎 CI 不读取 publisher identity，也不打包 tday；原生构建缓存与桌面分开。
Android 与桌面/媒体 job 在前置检查通过后并行，不等待桌面编译完成。

工具和平台入口依据 [Bevy 0.20.0 Android 示例](https://github.com/bevyengine/bevy/blob/v0.20.0/examples/README.md#android)、
[AGP 9.4 构建要求](https://developer.android.com/build/releases/agp-9-4-0-release-notes)、
[Android 16 KB 对齐要求](https://developer.android.com/guide/practices/page-sizes)。

`Build tday` → `Run workflow`（仅 tday） 同时生成三平台 ZIP 和
`tday-android-arm64-test.apk`，四个平台全部通过后更新 `tday-latest`。
安卓 job 使用隔离临时内容 identity，构建 `hardened,ui-sounds` release 原生库，
校验 release APK 的内容、入口、签名和 16 KB 对齐；含密钥的编译输出不会进入缓存。
Gradle release 目前使用测试签名、关闭 debuggable；不同云端运行的测试签名不保证相同，
覆盖安装可能需要先导出存档，再卸载旧试玩包。正式应用更新需要稳定签名另行配置。

本地复用同一打包入口（publisher 在桌面运行）：

```sh
KEINE_BUILD_TARGET=aarch64-linux-android cargo bundle projects/tday --output target/tday-android
```

有效无视频工程通过校验后才创建/加载内容 identity；按需设置
`KEINE_HAKUTAKU_IDENTITY` 使用工程外的测试身份。产物是输出目录的 `game.apk`。
应用 ID 优先使用合法的 `project.bundle_identifier`，否则从稳定 `project.id` 派生，
与引擎测试包独立安装。共享 Java Activity 的 namespace 保持不变。

## 渲染与后端测试

默认先初始化 Vulkan；surface、adapter 或 device 初始化返回错误时释放该次资源，
再尝试独立的 GLES instance/surface。APK 要求 OpenGL ES 3.0，Vulkan 为可选硬件特性；
具体驱动仍须满足现有 Bevy/wgpu 的 shader features/limits。驱动崩溃或已经运行后的
shader/device 错误不在启动回退范围内。实现与上游边界见
[Bevy patch](../vendor/bevy_render/KEINE-PATCH.md)；硬件声明依据
[Android uses-feature](https://developer.android.com/guide/topics/manifest/uses-feature-element)。

实验测试包支持私有 `files/render-backend`，同一 APK 可分别测试 GLES/Vulkan：

```sh
printf gl | adb shell -T run-as moe.maincore.keine tee files/render-backend
adb shell am force-stop moe.maincore.keine
adb shell am start -n moe.maincore.keine/.EngineActivity
adb logcat -d | grep -E 'GPU.*(Vulkan|Gl)|AdapterInfo|Android Vulkan initialization|wgpu|panicked'
```

将 `gl` 改为 `vulkan` 可强制 Vulkan；删除 `files/render-backend`（或写 `auto`）恢复自动选择。
单独指定后端时不会偷偷改用另一后端。测试顺序为 auto、gl、vulkan，并分别核对
GPU 日志中的 `Vulkan` / `Gl`、画面、触摸、音频和后台恢复。
只有 Gl 运行成功还不能证明故障时自动回退成功，须同时观察到 Vulkan 初始化失败与 Gl adapter。

## 资源与数据

引擎测试 APK 仅包含引擎和许可声明；`assets/NOTICE` 按章节完整合并引擎许可、署名、
字体声明，以及从锁定 crate 实际源码读取的 WebP/Opus 许可、专利条款和源码获取地址。
游戏 APK 再追加作者的 `GAME-LICENSE` 章节；重建引擎测试包会移除旧游戏声明及缓存中的零散文件。
APK 校验核对原文内容及源码版本，不只检查文件名；正式发行的其余声明仍按 `release.md` 检查。
初次启动没有游戏资源时显示提示页。
实验入口从 Activity 的私有 files 目录下 `game/` 读取普通工程，沿用 Loader 的只读挂载及路径约束。
每个工程必须提供稳定 `project.id`，存档/设置使用私有 `files/userdata/<project.id>/`。
不会依赖 `HOME`、`XDG_DATA_HOME`，也不在游戏资源目录写入存档。
设置页提供导出/导入存档与选项，格式与桌面相同。通过系统创建/打开文档选取文件，
只访问用户选中的文档，不申请存储权限。取消不修改数据；无效或中断的导入保留已有存档，
沿用公共备份的大小/文件名限制和目录替换恢复。文档可能是不可 seek 的管道，按有界流读取。
Java `detachFd` 转移唯一描述符所有权给 Rust `File`，由 Rust 在完成或出错时关闭。
依据 [Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files)
及 [ParcelFileDescriptor.detachFd](https://developer.android.com/reference/android/os/ParcelFileDescriptor#detachFd())。
安卓不记忆桌面窗口位置。
安卓始终使用全屏，设置页不显示桌面全屏开关。
Activity 在创建、恢复与重新获得焦点时应用沉浸式系统栏设置：API 30+ 使用
`WindowInsetsController` 隐藏状态栏与导航栏，API 26–29 使用 `IMMERSIVE_STICKY`。
边缘滑动可临时呼出系统栏并由系统自动收起；不拦截返回/Home 手势，也不隐藏输入法。
方案依据 [Android 沉浸模式](https://developer.android.com/develop/ui/views/layout/immersive)。
Pixel 手势导航、三键导航以及文件选择器/前后台返回路径须分别实机验收。

入口使用 `singleTask`，从桌面图标返回时复用已有 Activity，避免第二个 NativeActivity
重建进程内的 winit/Bevy 单例。普通切后台/返回及文档选择器往返保留当前界面和剧情，
仅重建渲染 surface；主动退出或系统杀死进程后的冷启动仍使用现有存档/主菜单。
启动模式依据 [Android Activity launchMode](https://developer.android.com/guide/topics/manifest/activity-element#lmode)。

## 触摸与返回

触摸由共享 owner 在按下时捕获：按钮/滑块、滚动容器优先，移出控件不转为导航。
设置页 tab 仅点击切换，不识别左右划；Save/Load 也不提供左右划导航。剧情空白区上划打开 backlog；
backlog 正文拖动只滚动列表。普通按钮轻点松手后确认点击，拖动不触发起点按钮；
滑块按捕获位置实时更新。命中检查包含裁剪与层叠遮挡，遵守 Bevy 的 FocusPolicy：
Block 遮挡，Pass 容器空白处穿透；顶部透明整页容器不拦截下面的设置控件。
普通 Node 不作为滚动容器。按钮保持在原控件内且未拖动时，按住较久也可在松手时点击；
手势超时仅用于剧情导航。
剧情轻点松手后才推进，上划不同时推进。
系统返回沿用 Esc 的当前界面取消/关闭路径，标题页仍先弹出退出确认；不在划动过程中执行。
屏幕边缘 24 逻辑像素保留给系统；画布外、按钮/滑块/列表、多指、取消、失焦、窗口或路由变化、
动画中及选择/视频覆盖期间不识别导航。划动至少 56 逻辑像素、主轴为副轴 1.8 倍，
在 800 ms 内松手且轨迹不能明显折返；移动超过 10 像素不再视为轻点。
手势超时使用真实时间，不受剧情休眠暂停影响。恢复运行时清除休眠前的渲染时间戳并
重置真实时钟基点，避免新菜单动画吃进休眠时间；桌面和安卓保持同一套动画时长。
不提供剧情左右划跳读、列表下划关闭等容易误触的操作。

### 界面触感

Android 默认启用界面触感，遵循系统触感设置，不提供游戏内开关。桌面不注册触感系统。
有效按钮点击、tab/选项切换与确认使用短系统反馈；复用 `UiSoundStyle`，但不依赖
`ui-sounds` feature 或音量。Backlog 实际开关状态变化也覆盖上划/滚轮打开与非按钮关闭。
Backlog 和音乐列表在用户移动目标跨过 64 设计像素刻度时轻震，滑块和音乐进度条
跨过 5% 刻度时轻震；到达端点单次反馈。值不变、继续顶住同一端点、悬停/松开、
播放进度自动前进、平滑滚动/回弹及剧情推进不触发，不按帧持续震动。
按钮与 Backlog 状态变化在同一帧合并，所有反馈由 Java 主线程以 60ms 间隔去重，失焦时丢弃请求。
桥接沿用 NativeActivity/JNI；使用
[View.performHapticFeedback](https://developer.android.com/develop/ui/views/haptics/haptics-apis)，
不添加 VIBRATE 权限或强制绕过系统设置。没有 EYS 震动指令。
设置文件维持 v4，没有新增持久化偏好或存档字段。

## 部署测试工程

开发测试可先安装 APK，再通过 debug 包的 `run-as` 部署现有 fixture（不修改 fixture）：

```sh
adb install -r dev/android/app/build/outputs/apk/debug/app-debug.apk
adb shell run-as moe.maincore.keine mkdir -p files/game
tar -C tests/fixtures/native-smoke -cf - . | \
    adb shell -T run-as moe.maincore.keine tar -xf - -C files/game
adb shell am force-stop moe.maincore.keine
adb shell am start -n moe.maincore.keine/.EngineActivity
```

游戏 APK 自带 `assets/keine-game/game.haku` 与签名命名的加密 `.taku` 段，保留游戏版权声明。
这些条目不压缩，运行时通过 AssetManager 的有界文件描述符直接只读挂载，沿用 Loader
验签、解密和 compiled Program 校验，不复制整份资源到私有目录。依据
[NDK Asset API](https://developer.android.com/ndk/reference/group/asset)。
存档/设置仍写入稳定 project.id 的私有 userdata；上述 run-as 部署仅用于引擎 debug 测试包。

## 验收边界

交叉编译和 APK 校验不能代替手机运行。真机仍需验证启动/恢复、菜单触摸、滚动/滑块、
输入法、音频与 GPU 效果。每次候选版本记录设备、包 SHA、后端与实际结果；
旧版设备记录不能自动沿用到新版。统一证据边界见[运行与发行验收](testing.md#运行与发行验收)。

## 完整 Android benchmark 与 ADB 回传

Android benchmark 仅供本地按需打包，CI 不再生成或发布。产物内含优化的 `game.apk`、与 APK 相同的
`android-benchmark.json`、Python 运行器及分析工具。应用 ID 为
`moe.maincore.keine.benchmark`，不会覆盖 tday；profiling 与 release 使用相同优化，
电脑侧 `lib/libkeine.so` 保留匹配的符号（APK 仍正常 strip），仅此 benchmark APK 开启 debuggable，供 `adb run-as` 读取私有报告。
普通游戏仍为非 debuggable/hardened，不读取 benchmark 请求。需要 Python 3.9+ 和
[ADB](https://developer.android.com/tools/adb)，打开手机 USB 调试并授权电脑：

```sh
adb devices -l
python3 benchmark-android.py --apk game.apk --serial DEVICE_SERIAL --output moto-report
```

只有一个已授权设备时可省略 `--serial`；再次运行须换输出目录，避免覆盖原始报告。
USB 或已配对的无线 ADB 均可；无需 root、手动复制 logcat 或安装额外手机管理应用。
安装签名冲突会明确失败，不自动卸载任何应用或清除用户数据。

运行器校验已安装 APK 的计划与下载的计划相同，再逐项 force-stop / 启动新进程。
每个 render 样本沿用 3 秒热身 + 5 秒采样，基线、粒子及既有热点组合重复三次。
包括 7 次原生启动、opening 休眠/连续模式、三种相机拆分、真实负载、效果/粒子/UI/
音频、组合压力及直接读取 APK 密文挂载的四类 I/O。启动计时从 Rust 入口起算，
Activity 启动的 ADB 输出另存 `launch.txt`，不混为整机冷启动耗时；系统/GPU cache 不强制清除。

覆盖复用桌面清单：**73 个 Android 支持的必测 render 场景，另明确跳过 5 个平台不支持项**
（2 个视频场景、runtime 视频、720p/1080p 桌面窗口尺寸）。Android stress 用不同时间轴
`bench_stress_android`，明确移除视频，不能与桌面含视频压力直接比较。
始终记录实际手机 surface 分辨率，不自动调整显示尺寸、刷新率或亮度。
`--backend auto|gl|vulkan` 每次执行完整独立报告；默认 auto。指定后端不隐式切到另一后端。

测试期间保持解锁、应用在前台，避免操作手机。独立 benchmark 的 Activity 在前台保持亮屏，不改系统休眠设置；每个 render 样本必须包含前台焦点证据。运行器在样本之外采集电池/温度/
thermalservice 与显示配置，采样期间每两秒读取完成标记；ADB 开销存在，结果不是零干扰测量。
设备不暴露的传感器和 GPU timestamp 能力标为不可用；不可用不代表零开销。
失败或缺失场景保留原始日志并输出 INCOMPLETE，断连/中断保留已回传的部分报告。

电脑输出目录包含：

- `keine-benchmark-report.txt`：场景、构建/后端、pass、CPU/RSS、基线差值及覆盖情况。
- `keine-benchmark-frames.tsv`：共享 RAWFRAME 格式，带场景、源码、尺寸、焦点与排除原因。
- `device.json`、`samples/*/{before,after}.json`：真实设备信息及测试环境，回传时保留这些文件。
- `samples/*/sample.txt`、`results.json`：逐次原始日志、数据及失败原因。
- `hotspots.json`：超预算帧的源码位置归因；不是独占 CPU 调用栈或因果证明。
- `pass-hotspots.json`：相同 pass 路径相对基线的 CPU/GPU/wall 时间差值，不把嵌套 span 相加。

Android/winit 可能不暴露当前刷新率，此时原始预算保留 unknown，不能把超预算数为零当作通过。
可显式传 `--hz 60` 等参考预算用于源码帧归因；这不修改屏幕刷新率，也不冒充实测刷新率。
默认报告仍包含 pass/进程 CPU、RSS 与 interval 数据，用这些寻找被 VSync 帧率上限掩盖的开销。

原生调用栈采集仍是另一个验收层，不声称上述 interval 排名等同于 Android Simpleperf。
需要进一步归因时可给 [Simpleperf 官方脚本](https://android.googlesource.com/platform/system/extras/+/android16-release/simpleperf/doc/android_application_profiling.md)
传入 `-lib lib`；包验证要求 host 符号库与 APK 的 `.text` 一致，不混用其他构建。
性能结论需要同设备/后端/分辨率/温度条件的前后报告，不能只用满帧与否评判。

本地打包（工具链要求同上）：

```sh
python3 tests/bench/runtime/prepare-android-benchmark.py target/android-benchmark-fixture
KEINE_BUILD_TARGET=aarch64-linux-android cargo bundle target/android-benchmark-fixture --output target/android-test --benchmark
python3 target/android-test-benchmark/benchmark-android.py --apk target/android-test-benchmark/game.apk --output moto-report
```

派生 fixture 只调整 Android 不支持的内容与独立身份，不修改桌面 fixture 或作者工程。
Build tday 仅手动生成 tday 三平台 ZIP 与 Android APK；benchmark 不再由 Actions 构建或更新下载。
云端 APK 编译/验证仍不代表 Moto 或其他真机已经通过完整运行测试。

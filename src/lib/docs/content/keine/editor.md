# Editor

Editor 用来管理工程、编辑剧本和预览游戏。Text、Blocks 和 Inspector 修改的是同一份 `.shou` 文件，切换视图不需要转换格式。

## 打开工程

在欢迎页点击 **Open folder**，选择包含 `config.yaml` 的工程目录；也可以从最近项目中打开。
从源码运行时使用 `cargo editor <工程目录>`，开发环境见[构建说明](testing.md#开发环境)。
LetsGal 等兼容工程的 JSON 在编辑器中只读，需要修改剧本时先[迁移为原生工程](release.md#cli)。

## 编辑剧本

1. 在左侧 **Explorer** 打开 `scripts/` 下的剧本。
2. 用 **Text** 直接编写代码，或切换 **Blocks** 插入、编辑和拖动指令。
3. 选中指令后，在右侧 **Inspector** 调整资源、位置、时长等参数。
4. 保存文件。标签上的 `•` 表示还有未保存的修改。

`⌘/Ctrl+P` 查找文件和场景，输入 `@` 只查场景；`⌘/Ctrl+Shift+F` 搜索整个工程。
角色和素材分别在 **Characters**、**Assets** 中管理。语言、字号和布局在[设置](#设置)中调整。

## 预览游戏

点击右上角播放按钮，Engine 会打开独立预览窗口。下载的 Editor 已附带配套 Engine；
从源码运行时需要先[构建 Engine](testing.md#开发环境)。预览也会使用尚未保存的剧本修改。

启动失败时，点击错误图标打开 **Output** 查看原因；左栏也有 Output 入口。
剧本改错时预览会保留上一次有效画面，修正后继续同步。更多行为见 [Engine](#engine)。

## 导出试玩

在左栏打开 **Build**，点击 **Export game…** 并选择输出位置。
完成后可用 **Play** 启动副本，或用 **Open folder** 查看文件。

试玩导出不需要 Rust 工具链或发布密钥，但只面向当前操作系统，并包含可读的剧本源码。
正式打包见[发布指南](release.md)，导出细节见 [Build](#build)。

## 工作台

```text
工作台
├── 左栏
│   ├── Explorer：工程文件，记住展开状态；首次默认折叠
│   ├── Assets：映射资源 / Unmapped、搜索、类型/目录/标签过滤、List/Grid
│   ├── Characters
│   ├── Search：全文搜索与可撤销替换，⌘/Ctrl+Shift+F；其下为 Inspector
│   ├── 分隔线 → Settings / Build
│   └── 底部：Problems / Output / Performance；菜单提供打开工程、迁移；布局恢复归入 Settings
├── 中央文档
│   ├── Text：补全、语法着色、诊断、智能缩进/配对、右侧概览
│   └── Blocks：以指令块显示剧本，支持拖动、行内编辑和概览
├── 右栏：可关闭的 Asset Preview + Inspector
└── Output：操作、解析、Preview 状态、只读变量和可点击错误
```

左栏只高亮焦点所在工具，已打开但未聚焦的工具显示细标记。文件、资源和角色行
提供一致的悬停、选中与键盘焦点反馈，Enter/Space 使用同一点击动作；资源/角色右键先选中
目标，再提供 Preview / Edit YAML。现有行内操作继续可见，不依赖悬停才能发现。
Inspector 属性标签与控件对齐，窄面板换行；长资源路径截断并提供完整提示。
修改表单时保留当前页签、焦点和编辑位置；点击跳转操作才切换到对应源码。
Settings → Extra 的 CG/音乐排序在放下时生效，复用 Block 边缘滚动速度，Esc 或窗口失焦取消。

## 单一源码

Explorer 同目录的剧本默认按场景排列：入口场景所在文件优先，其余按 `scene` 名称自然排序（2 在 10 前）；多场景文件取最早场景。目录和其他文件的位置保持原样，显示顺序不改变剧情跳转。

Text、Blocks、Inspector 共用一份剧本。编辑 Block 只修改对应的源码片段，
保留周围的空白、注释和无法识别的语法；无法识别的部分仍会显示，但不能通过 Block 修改。
兼容 JSON 为只读，需要通过 `migrate` 转换。索引、搜索和预览优先使用未保存的修改；
保存时若发现文件已被外部修改，会提示处理冲突。
关闭确认中的 Save and Close 保存成功后退出，Cancel 保留窗口和修改；Close Without Saving
不写项目源文件并关闭，恢复草稿仍尝试保留，草稿写入失败记录错误但不取消关闭。
定位 Block 重建持久舞台、BGM 和循环音效；历史单次音效/语音不重播，只播放选中 Block 的音频。相同 BGM 保持播放，显式选择 BGM Block 才重新播放。
保存 `.shou` 时自动使用两空格缩进，长调用按 100 列拆分参数；字符串和注释原样保留。
保存保留 Text 选区和屏幕位置；格式化只映射源码位置，Blocks 复用已有行高与编辑框，不重新定位光标。
Text 行号旁悬浮箭头可折叠多行调用、数组与嵌套块；收起后保留首尾行，不修改源码。
搜索结果或从 Blocks 跳回隐藏行时自动展开对应范围。
输入法组词期间只显示原生候选文本，源码选择、Preview 定位和 Text 概览等提交后更新，不使用延迟判断。Blocks 的 Enter 在当前对白后插入 Text，Shift+Enter 在同一块内换行；草稿首次写回后仍保留焦点与相邻块范围。正常关闭项目保存每个文档的 Text/Blocks 模式和编辑位置，重开定位到原光标或 Block。
Text、Blocks 及关闭窗口时的保存共用此流程，格式化可撤销；未闭合或有词法错误的源码保持原样保存。
关闭最后一个源码页后，再开页优先复用存活文档组或 Output 所在组；无可用组才新建，避免落进 Explorer 窄栏。

文档标签以 `•` 标记未保存修改；保存失败同时显示通知和 Output 记录。Search 替换完成显示实际改变的匹配数与文件数，保留原有 Undo/Redo。

`⌘/Ctrl+P` 打开文件/场景快速定位，`@` 只筛选场景；复用当前工程文件与场景索引，在后台筛选，最多显示 80 项。↑↓ 选择、Enter 打开、Esc 关闭；中文组词确认不触发跳转。文档页签栏提供同一入口及前进/后退按钮。返回快捷键在 macOS 为 `⌘[` / `⌘]`，其他桌面为 `Alt+←` / `Alt+→`。显式源码跳转记录最多 64 个位置，恢复 Text/Blocks 模式、选区和滚动；源码改变后只恢复有效光标位置，不使用旧块范围。定位不重新播放 Preview；Text 缩进使用 `Tab` / `Shift+Tab`。

欢迎页的最近项目在后台读取工程标题，显示短路径并以悬浮提示提供完整路径；失效路径标记为不可用。移除按钮只删除最近记录，不删除工程或恢复草稿。

## 交互

Inspector 优先显示资源、位置、缩放、透明度、时长及播放常用项；未填写的次要参数收进 Advanced，源码中已有的参数保持可见。字段的 Set / Default 提示区分显式参数与未写入参数；Default 可来自命令默认值或当前状态，不在展开或选中时写回源码。数值控件保留 ms、px、%、° 等原生单位，表达式继续使用源码输入。对白的 Stable ID 与收尾选项也收进 Advanced。

共享工具按钮、模式切换、资源操作及参数选项补齐按下和键盘焦点样式，使用 GPUI 原有 Enter / Space 激活。禁用效果参数同时阻止输入、快捷选项和提交，并提示先启用效果；前进/后退不可用时说明原因。资源选择和 Block 插入弹层取消后恢复打开前焦点，选择资源后同样返回原控件，点击弹层外部保留新点击的目标。


展开/收起共用 160 ms 可反向过渡：箭头旋转、内容淡入及高度变化使用同一进度；
资源统计卡和筛选分组使用 GPUI 已有的 `Collapsible` / `MotionReveal` 测量真实内容高度，
窄栏换行不依赖猜测高度。文件树与搜索保留按可见范围挂载，使用动画行高的前缀位置计算滚动。

| 交互范围 | 处理 |
|---|---|
| 资源统计卡、筛选分组、Explorer、搜索分组 | 共用展开/收起过渡，快速反向点击连续；搜索键盘跳过折叠结果 |
| Block 右键菜单 | 120 ms 淡入 / 90 ms 淡出；关闭期间不重复执行，旧关闭任务不移除新菜单 |
| 文件/场景右键菜单、资源选择、Block 插入 | 保留原开关过渡，统一遵循减少动态效果 |
| Build 进度 | 旋转图标加状态文字；减少动态效果使用静态图标 |
| Dock、Block 章节折叠/拖放 | 沿用现有过渡 |
| 引擎菜单、存读档切换/翻页、Backlog、确认框 | 已有动画；确认操作及关闭结果即时执行 |
| 源码输入、Inspector 写回、搜索查询、资源筛选结果 | 即时更新数据与选择位置，避免输入过程中反复淡入或移动焦点 |

系统减少动态效果由 GPUI 的 transition 统一处理；稳态不追加循环重绘任务。
代码与布局回归不代表 macOS/Windows/Linux 原生动效已经目测验收。

- Block 插入弹窗默认打开 Favorites，分类顺序为 Favorites → Text/Scene/Media/Flow/Data → All；普通分类仍可自定义排序。默认收藏按常用编剧操作排列，已有收藏保留，收藏内部可跨分类调整顺序。旧空收藏首次升级补入默认条目，之后主动清空会保持为空。
- 插入弹窗自定义模式用左侧拖动柄排序，沿用 Block 的预览卡、200 ms 位移和占位让位；边缘自动滚动。Favorites 可跨分类排序，普通分类只在分类内排序；搜索期间不提供拖动柄。松手一次保存 Editor 偏好，拖到外面、关闭或切换分类取消，点击条目不插入剧本。减少动态效果时直接到达目标位置。
- Block 插入弹窗打开时轻微上移并淡入，X、Esc、Tab 或选中条目后淡出；关闭期间不重复插入，快速重开不被旧关闭任务移除。系统减少动态效果时立即开关。
- 卡片背景与圆角由外框绘制，标签滚动层保持透明；Dock 内容与 drop overlay 共用定位容器。
- Preview 控件参与最右上方标题栏的排版，单标签页、多标签页与视图缩放共用，不覆盖文档工具按钮。
- 外侧 Dock 的保存宽度受当前工作区宽度约束；Editor 与 Preview 并排时，文档工具和 Preview 控件保持在窗口内，标签过多时滚动标签栏。
- 淡色行内补全用右方向键/Tab 接受；回车保留缩进，智能处理引号/括号。
- 不按输入法语言分支：组合文字确认后触发补全和语法检查，无固定等待；语法检查在后台执行，新修改取消旧任务，结果写回前复核源码和组合状态。
- 空 Text Block 用 Delete/Backspace 删除；关键帧使用紧凑单行，嵌套结构保持层级。
- Text Block 输入/退格只替换源码中的变化范围，保留输入实体、焦点、选中位置和行高；源码与恢复草稿持续同步，离开输入框、Enter 或保存时更新诊断、项目索引和 Preview，不逐字执行 Preview 或引入输入延迟。
- 行内 `[wait=1000]` 在原位置显示 Wait 标签，选中直接编辑毫秒，不切回整行原始语法。
- Block 类型标识着色；卡片不增加轮廓、左侧树形线或多余上下移动按钮。
- Block 右键菜单取得面板焦点，点击外部、Esc 或执行菜单项关闭；滚动不关闭菜单，菜单内鼠标与滚动不穿透到下方卡片。
- 序号在卡片中线垂直居中；Engine 当前执行卡片的蓝色底只从左边缘延伸至序号区域，内外圆角与卡片一致，序号用暗色粗体，停止后清除，普通选中不显示执行底色。
- 拖动预览与占位冻结实际卡片尺寸，关键帧保留紧凑宽度；结构及多选包含子行高度，拖出区域取消不改源码。
- 占位只显示在源码允许的同层、同作用域落点；前后槽独立收起，槽内预览不参与行高计算，概览与主布局使用同一动画高度。
- Block 拖放由单一生命周期管理：空闲 → 拖动 → 写回 → 收尾。开始时固定文档/版本、选择、卡片尺寸和布局；落点按固定几何判断，200 ms 位移预览不增大行距，结构携带子项。松手最终复核位置并只写回一次；Esc、面板外松手、失焦、模式/源码变化均结束拖动。边缘自动滚动，滚动后重新判断落点；减少动态效果时立即完成，源码重排仍是一次可撤销修改。
- 每句旁白/对白右侧有结束开关：灰色保留文本框，蓝色在本句结束后隐藏；关联的 text.box 指令收进该开关，独立命令仍单独显示。
- 同命令 Block 多选可批量编辑共同的普通字段；不同命令/资源身份不混改，非法值整组拒绝。
- Text/Blocks 概览显示语法/类型颜色、视口与选中位置，支持点击、拖动和独立滚动。
- Inspector 分开 Position 锚点偏移、Transform 变换偏移和 Layout 分组；组内字段与批量修改保留未改参数。镜头补间选择 ◆ 随时长变化 / ◇ 立即应用。
- 点击 Block 字段编辑只更新选中态与 Inspector，不触发 Preview 执行；显式 Replay 仍可执行选中指令。
- Block 资源下拉框按内容宽度靠左，最长 320 px；参数紧跟资源，Inspector 保持字段宽度。
- 极窄窗口由用户拖动分隔线或关闭一列 View 腾出文档空间；不为三列同时保留的极限布局裁剪类型标识或增加特殊适配。
- 下拉框使用统一无描边触发器与淡入淡出 popup，支持搜索和键盘选择；减少动态效果时立即切换。
- Search 按文件显示高亮结果，Up/Down 选择、Enter/点击跳到准确源码或 Block。
  后台搜索有取消、120 ms 输入合并、2,000 条结果上限；会提示截断与跳过文件。
- Search 可选择 Project 或当前显示的文档标签（点击时固定搜索范围，再次点击可更新）；Replace 显示原文和替换预览，
  可逐项排除、选择全部已显示结果，然后 Replace selected。大小写选项复用搜索，按字面量替换，
  空替换表示删除；不解释正则表达式、不自动修改字符串转义或脚本语义。
  兼容 JSON 和其他只读文件不进入替换结果，并显示排除数量。
  使用未保存文档优先的源快照，应用前核对整份文档；变化时拒绝旧结果，重新搜索后再应用。
  所有选中修改共用一次项目撤销/重做，沿用现有保存与外部冲突检查，不自动落盘。
  面板提供 Undo/Redo；输入框内的普通撤销仍归输入框。最多 128 个文件/次，替换预览源快照
  上限 8 MiB，替换前后合计须处于现有 16 MiB 撤销预算内，每文件仍受 1 MiB 限制。
  截断结果明确标为 partial，按钮只替换已显示且选中的项目；替换文本变化只更新可见预览，不重新扫描工程。

## Build

侧栏 Package 图标打开 Build view；点击 `Export game…` 选择父目录，生成新的
`<工程名>-playtest` 文件夹（重名追加数字），完成后提供 `Play` / `Open folder`。
导出前复用现有保存、格式化和冲突保护；复制在后台运行，导出期间禁止其他文件操作。
当前支持原生 Eiyashou 工程的本机试玩：复用已安装的开发 Engine，无需编译或 publisher key；
复制登记资源、全部 `.shou` 和配置/清单，不复制原格式副本、未登记素材、存档、缓存或私钥。
源工程和导出副本分别校验，失败清理本次新目录；工程的 scene ID、引用和布局保持不变。
macOS 输出 `Game.app`，Windows/Linux 输出 `keine.exe` / `keine`；均可直接启动。
`project.icon` 可指定工程内 PNG/WebP；导出时校验并保留图标，macOS/Linux 自动生成对应应用图标。
Windows 临时导出复用 Engine 的 EXE 文件图标，窗口使用项目图标；正式发行通过 `bundle` 嵌入，见 [发布](release.md#应用图标)。
试玩副本包含可读源码，只针对当前操作系统；正式 Hakutaku 发行仍使用 [bundle](release.md)。

## 资源

`assets.yaml` 是资源 ID、类型、路径与 tags 的唯一来源；派生缩略图与使用次数不写回清单。
```text
Assets
├── 图片：默认完整构图缩略图网格；音频/视频：默认紧凑列表，音频行内播放/暂停
├── 搜索：ID / 文件名 / 路径 / Tags，空格分词 AND 与模糊匹配
├── 筛选菜单：Type / Folder / Tags / Used、Unused、Missing / 大小 / 修改时间 / Sort
├── View：Auto / List / Grid；缩略图 Compact / Large 两档，随面板宽度排列
├── 卡片：文件名、ID、引用数、Resource / 实际格式、大小与 Missing；音频有时长，不能确定时显示 —
├── Unmapped：只识别 .unmapped 保留文件，与未引用不同
├── Inspector：ID / Type / Tags；多选 Tags 增量增删，引用按文件聚合，可浏览全部位置
├── 改名：确认引用影响，默认物理文件随 ID 改名；Type 同时移到对应资源目录
├── 删除：Keep files 移除映射并加 .unmapped；Trash 使用系统废纸篓；引用留给诊断
│   └── Remap 恢复文件名/映射，严格检查冲突；文件与源码共用撤销/重做
├── 单击：右上 Preview + 右下 Inspector；保留多选、范围选择与 Asset → Block 拖放，图标与 ID/数量随鼠标显示
│   └── 插入复用 Block 的占位撑开、平滑重排及取消回位；兼容命令中央替换资源，Voice 附加到对白
└── 只挂载可见行及邻近行；后台生成小尺寸缩略图，64 项内存缓存，滚动占位保留完整内容高度
```

一个映射资源对应一个物理文件；资源重命名/移动与引用变更必须一起验证。
拖入资源目录时立即转换并登记，成品保留原文件主名，只改扩展名；已有合规文件直接复制。
PNG/JPEG/BMP/TIFF/静态 GIF：背景转为 Q80 WebP，立绘/粒子保留无损 WebP；
保留原分辨率、透明度和 ICC 色彩配置，应用图片方向；已有合规 WebP 直接复制，不反复有损编码。
WAV/MP3/FLAC/Vorbis/AAC 转为 48 kHz、192 kb/s VBR Opus；视频转为 H.264 MP4。
动态 GIF/APNG 明确拒绝，不静默丢帧。音视频转换需要带 libopus/libx264 的 FFmpeg，
从 Editor 旁、Resources、PATH 或 macOS Homebrew 目录查找；缺少工具时显示错误。
原文件只读，成品放在选中的工程资源目录；工程内原地导入则生成同目录的新格式文件。
重名不覆盖；转换、校验和清单提交失败清理半成品。文件与映射共用一次撤销/重做，原文件保留。
清单修改通过同一文档 owner，避免并行导入丢条目；不在播放时转换，存量素材仅在显式点击 Convert all 后转换。
Assets 顶部可展开图标统计卡显示登记文件体积、规范格式/待转换、未引用、缺失文件、未定义引用及 Unmapped 数量；点击状态可筛选。
Assets 搜索下显示结果数/总数及多选数；工具栏提供导入、选择全部结果、清除选择和删除确认。
类型/目录/标签/状态/体积/修改时间/Unmapped 筛选以可移除标签呈现；清除筛选保留排序、List/Grid 和缩略图大小。
空工程与无匹配结果分别提示；窄面板的工具栏和标签换行，不覆盖列表。
统计状态切换清除其他筛选；Undefined 打开 Problems，Unmapped 显示未登记文件。
导入使用当前目录筛选，或请求工程内的资源分类目录，沿用既有转换、进度、清单更新和文件撤销流程；
不会把工程外目录作为目标，批量任务进行中禁用重复导入/删除。跨筛选的已选资源仍保留，可显式清除。

Convert all 在后台逐个转换待转换资源，在同目录写新文件，原文件只读保留；保留 ID/标签并同步所有同文件别名，碰到同名输出自动加短后缀、不覆盖。按完成文件数显示进度条（收起统计卡仍可见），使用已有错误反馈和撤销；清单有未保存修改时要求先保存。
原生发布仅在临时副本排除未登记的兼容格式原稿及 `.unmapped`；登记的 PNG/WAV 等仍按现有发行规则拒绝。
规范格式通过有界文件头检查 WebP、Ogg Opus、H.264 MP4，不以扩展名或登记记录冒充转换历史。
预计打包资源大小按当前登记文件去重求和，包含未引用资源；未转换文件按当前体积计，转换后更新。缺失/无法读取文件使估算不完整；不含引擎、脚本、索引和封装开销。
资源卡用 GPUI 状态图标标明规范格式/待转换及未引用，格式/体积保持短文本；悬浮提示解释状态，Explorer 用 `U` 标记未引用，不作为错误。
未定义或缺失的资源引用在章节 Text 内用波浪线和诊断提示标出，Blocks 内显示错误图标；Explorer 文件和父目录显示红色错误数。确认输入后更新，IME 组合期间不扫描。
Assets 按索引与筛选/布局参数缓存排序结果、目录和行布局；修改时间筛选仍实时计算。列表压紧文字行距、增加卡片内边距，保持原行高。
缩略图解码最多同时两项、以 GPUI 低优先级运行；静态 WebP 复用 media 的有界缩放解码，保留透明度和 EXIF 方向，PNG 等仍走原解码路径，不生成磁盘缓存。
脚本索引更新只复制未替换的贡献；新编辑/关闭工程取消旧计算，文件之间与发布前检查取消状态。公共索引模型不变。
Asset Preview 的 X 关闭面板并记住布局，下一次实际选择资源可重新打开。音频在同一预览区域提供播放、暂停/继续与从头重播；暂停保留播放位置，换音频只保留一个试听源。
文件/目录右键使用平台无关的“在文件管理器打开”。

## Engine

每个工程对应一个工作台和一个独立的 Engine 进程，游戏画面显示在 Engine 窗口中。
两端通过通信协议同步源码版本、执行位置和退出状态；版本或功能不匹配时会提示错误。
Engine 发现支持 sibling app、同目录、Resources、PATH 与 `KEINE_ENGINE`。
Editor 只启动预构建 Engine，不在作者交互中运行 Cargo。开发时须同时构建 `keine` 和 `keine-editor`，保持 `target/debug/keine` 与 `editor` 同目录。Preview 错误图标可直接打开 Output；左侧 Output 入口可恢复已关闭的日志面板。

源码暂时有错误时，Preview 保持上一份有效现场，Output 报告首个错误位置；
此时新文档的位置不会被用于执行旧程序，修正后可继续同步。只改注释/空白且执行内容
与资源引用未变时保留现场，仅刷新源位置。原生脚本的有效语义修改会在 Output 说明
从工程入口和初始变量重建；需要查看后续位置时仍使用现有 Block Replay，不声称恢复了玩家路线。
预览控件沿用状态图标和 Output 入口，区分运行、已同步且保留现场、从入口重建、错误源码保留旧画面；
Inspector/Output 的 Preview 区域保留当前状态，不被恢复草稿等普通通知覆盖。
语法/语义错误保留可点击的脚本位置。重载结果随已有源码确认回复返回，无新增轮询或每帧解析。
源码更新不隐式 Replay；Replay 的提示说明从工程入口重建到选中 Block，无法从入口到达时
使用该场景入口，并不恢复玩家分支选择。

## 演出调试

后续开发面向 MainCore 正式项目的制作工具与运行时。tday 已封存，不再推进其创作
或新增内容；新增功能以正式项目的实际需求和跨项目复用价值评估。

Inspector 的 Preview 摘要显示场景/已执行动作（0 起）、等待原因和可恢复存档点；
Output 同时显示只读局部/全局变量与源码诊断。当前动作、存档点、错误均可跳回 Text/Blocks；
定位沿用文档导航，不隐式 Replay。定时等待与存档精确性分别显示，活跃演出使用上一个可达 checkpoint。
结束后没有可保存的继续点。停止、失败和源码 revision 更新清除旧快照。
协议 v12 在 v11 源码重载结果基础上增加试听固定增益；保留 RuntimeInspection 能力要求，Editor/Engine 必须一起更新。
状态只在已有原生帧上按变化推送，不发送定时轮询请求，不传帧，也不新增后台重绘。
变量按名称排序，最多 128 项；名称/字符串分别限制 128/512 UTF-8 字节，数组显示长度，超出明确提示。
运行错误和前进步数超限的诊断保留失败时的源码位置；slot 数据不包含这些瞬态诊断。

## 角色显示预置

Characters 已提供每个角色的一组固定显示预置：左/中/右锚点、X/Y 像素偏移、
自然尺寸或视口高度百分比、内建入场/淡出与时长。保存角色后写入 `characters.yaml`
的 `display`；Reset 只重置表单，保存后新插入的 Show 显式清除旧转场规则。Show 插入显式位置/尺寸及转场规则，
Hide 插入退场规则和隐藏；Change/Blink/Talk 保留现场几何，Avatar 不使用显示预置。
Apply saved preset and preview 显式处理一个选中的本角色 `sprite` / `sprite.update` Block，
Text 光标在多行指令内部也可定位。使用已保存角色值；无 `display` 时使用默认居中/自然尺寸/无转场。
站位/尺寸完整替换，图像、层级、滤镜及其他属性保留；Show 的旧单次 `transition` 清除，
同一容器中紧邻的本角色转场更新，其他情况在当前 Block 前插入显式转场，不跨分支覆盖。
重复应用不追加规则；一次文档事务支持撤销/重做，源码仍须保存。复用 Inspector Preview，
修改投影同步后启动/定位当前 Block；多选、其他角色、禁用/只读 Block 拒绝。
其余剧本不自动改写，Runtime 不以角色清单覆盖已有指令。

时间轴和 Preview 拖拽构图仍不在当前功能范围；后续须由作者参与设计。

## 设置

左栏齿轮统一打开 Settings，同一页面分为 Project / Extra / Editor 三个标签。
Project 编辑标题、标题背景（资源 ID / 路径）和应用图标；Extra 编辑鉴赏开关及 CG / 音乐排序。
两个项目标签共用表单草稿和 Apply / Reset，不因切换标签丢失未应用修改；字段错误会返回 Project。
Editor 提供界面语言（简体中文 / 繁體中文 / English）、源码字号（10–24 px，默认 13）和 Text / Blocks 概览开关（默认开启），
以及当前工作区的 Restore layout。偏好自动保存到 Editor 用户目录，不写入项目；字号与概览换行映射同步更新。
`⌘/Ctrl+,` 直接进入 Editor 标签；未打开项目时，欢迎页齿轮/同一快捷键打开相同控件。
资源、角色及 Inspector 仍按编辑对象分开；Build 独立处理导出，Problems / Output / Performance 保持可并排调试。

语言切换立即生效并保存在 `editor.json`；旧偏好缺少语言字段时继续使用英文。
工作台、设置、区块菜单、资源/角色操作和常用提示使用同一静态三语词表；区块搜索兼容本地化名称及原有英文名称。
脚本语法、资源 ID、角色名、文件名和引擎原始诊断保持原文。语言仅属于 Editor 偏好，不改变游戏语言或项目配置。

项目设置中的图标使用工程内的正方形 PNG / WebP；平台图标仍由原有打包流程生成。
Project / Extra 标签沿用现有控件；背景可从资源选择器选择，图标通过文件选择器选择，
两者显示小预览；输入框旁用文件夹图标打开选择器。排序行用顶部插入线指示落点，列表末尾可放到最后。
操作区固定在底部，以勾选、回退、文件图标对应 Apply / Reset form / Edit YAML，并提供悬停提示；无修改时 Apply / Reset form 禁用，状态区分未应用、已应用未保存、已保存；
标题和图标错误显示在对应字段旁。排序不解锁内容。Apply 写入当前 `config.yaml` 文档，保留设置页和键盘焦点，沿用 Undo/Redo 和保存流程；
局部 YAML 编辑保留未修改字段和注释。Reset form 放弃表单草稿，Edit YAML 打开源码。
配置在其他位置改动时，未修改的表单自动刷新；已有草稿不覆盖外部改动。
保存后重启 Preview 生效。

## 音频素材校准

Assets 选择已登记音频 → Asset Preview → Analyze loudness。复用导入流程的 FFmpeg，
离线读取整段感知响度与真峰值；原文件不变。单声道按双声道播放计量（`dual_mono`），
与现有 mono → stereo 播放转换一致；计量依据 [FFmpeg loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm)。单次分析最多 120 秒，结果只保留在当前面板，
使用建议值或试听前核对文件大小和修改时间，变化后需重新分析。

- 建议目标为 −18 LUFS，真峰值上限 −1 dBTP，固定增益限制 −60…+12 dB，建议值向下取到 0.1 dB；这是起始建议，
  不是发行标准或自动混音。静音报无可测音频；无整段响度读数时不自动提升，仅必要时降低峰值。
- 音频预览使用播放/暂停、重播图标；分析、重新分析、应用和重置也使用图标与悬停提示，A/B 保留 Original / Adjusted 标签。建议值突出显示，目标和峰值说明收在提示中。
- Original / Adjusted 从头试听原声 / 建议值，高亮与 Engine 的试听路径、增益和暂停状态同步；
  已应用相同建议值时禁用 Apply gain。Apply gain 写入音频条目的
  `gain_db`，Reset gain 恢复 0 dB。正常试听读取当前文档中的增益，保存后重启 Preview 使用。
- 增益与现有素材/总线/淡入淡出音量相乘，剧情 BGM、语音、音效和 Extra 音乐一致；
  加载/创建播放器时处理映射与 dB 换算，不增加逐帧分析。打包保存解析后的逻辑路径增益。
- 改名、音频类型调整和标签编辑保留增益；改成非音频类型前先重置增益。
- 不做实时归一化、动态压缩、限幅、相位修复或自动反相。单素材峰值限制不保证多轨混音不超载。

后续按实际项目需要再评估角色/批次校准、单声道试听与相位检查、对白压低音乐。
不扩展 DAW、插件宿主或独立资源银行。

## Performance

```text
Performance（singleton；打开/关闭/移动只影响自身）
├── Engine：Off / Starting / Running / Failed，30 秒生命周期带
├── CPU：仅 Preview child；100% = 1 logical core，允许超过 100%
├── Memory：当前 RSS、该次子进程的 observed peak
└── CPU / RSS：30 秒小折线；缺测留空，不作故障判断
```

现有 Preview worker 约 500 ms 采样，CPU 用累计 CPU 时间差 / 实际 elapsed。
历史归属工程的 PreviewController：最多 61 个样本、64 个状态转换，按 30 秒过期，
生命周期保留窗口前的一个状态锚点。关闭 View 仍采样；重启保留历史但清空 peak、
CPU baseline 并分开折线。历史只在内存，工程/Editor session 结束后丢弃。

macOS 复用锁定的 `libc`，通过 `proc_pid_rusage(RUSAGE_INFO_V2)` 查询 owned child；
`ri_user_time + ri_system_time` 由 Mach timebase 转换为 CPU 时间，`ri_resident_size` 为 RSS。
Linux 从有界 `/proc/<pid>/stat` 读取 user/system ticks 与 RSS 页数，按 sysconf 单位换算；
Windows 用 query-only 句柄读取 GetProcessTimes 与 working set，查询后关闭句柄。
退出/查询失败显示 Unavailable；Peak 仅为采样到的最高常驻内存。
平台单位依据 [Linux proc stat](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html)
和 [Windows process times](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes)。
数据口径以 [Apple libproc](https://github.com/apple-oss-distributions/xnu/blob/main/libsyscall/wrappers/libproc/libproc.h)
与 [XNU task/rusage](https://github.com/apple-oss-distributions/xnu/blob/main/osfmk/kern/bsd_kern.c) 为准。
独立 Engine 不提供帧传输：不保留 Publish rate、overwrite、Paused 或 profiler/Capture 功能。

系统废纸篓支持 macOS、Linux 和 Windows；不回退永久删除。Linux 使用 freedesktop
files/info 恢复记录与同卷私人 Trash（外部卷 `.Trash-uid`），无法安全创建时拒绝移动；
Windows 使用 Shell 回收站 namespace 项恢复。撤销不覆盖同名新文件，重做重新入篓。
格式/API 依据 [freedesktop Trash](https://specifications.freedesktop.org/trash/latest/)
和 [Shell PostDeleteItem](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifileoperationprogresssink-postdeleteitem)。
媒体时长只读取有界 Ogg Opus/WAV 头尾；其他格式显示未知。
IME、多显示器、1× DPI、主观音频和实际 Preview FPS 见 [验收](testing.md)。

资源阻塞加载时，Engine 右下角显示 24 px 圆环，每三秒旋转一周；加载完成隐藏，不再显示 Loading 文案。

## 实现说明

以下内容供维护编辑器代码时查阅。使用方法见前面的操作说明。

```text
crates/editor/src/
├── app.rs                  启动、主题、共享控件
├── app/
│   ├── documents.rs        共享文档状态、派生索引、选择与面板登记
│   ├── panel.rs            面板标识、载荷与 Dock 生命周期
│   ├── panel/construction.rs 构造与输入事件订阅
│   ├── render.rs           面板分派、焦点与共享弹层
│   ├── document/           文档视图状态、Text/Blocks/Scenes 组合
│   ├── files/              Explorer 状态与文件树视图
│   ├── window.rs           工程窗口、保存/关闭保护、Engine 生命周期
│   ├── edits.rs            源码事务与撤销/重做
│   ├── navigation.rs       文件/场景快速定位与有界位置历史
│   ├── controls.rs         共享控件与滚动容器
│   ├── blocks.rs           Block 交互与源码范围编辑
│   ├── blocks/             drag：剧本拖放；motion：重排映射；view：布局；picker：插入及偏好拖放
│   ├── reorder.rs          Block/列表共用的位移插值与边缘滚动
│   ├── inspector.rs        字段编辑与源码同步
│   ├── inspector/          state：面板状态；controls：字段控件；view：组合；spatial：位置与时间轴
│   ├── resource.rs         资源清单事务、筛选弹层与预览
│   ├── resource/state.rs   搜索、筛选、选择锚点与缩略图缓存
│   ├── resource/toolbar.rs 查询、筛选标签、多选操作与原生导入
│   ├── resource/browse.rs  响应式网格/列表、可见资源窗口
│   ├── resource/picker.rs  资源选择弹层
│   ├── minimap.rs          共用视口/拖动/平移计算与 Block 概览
│   └── text/minimap.rs     Text 换行映射、语法缩略图与滚动适配
├── authoring.rs            公共入口与标识符规则
└── authoring/
    ├── commands.rs        命令目录、分类、插入与补全模板
    ├── fields.rs          Loader 参数清单的消费、标签、候选值、数值与资源规则
    ├── index.rs           工程资源、引用、场景与对白索引
    ├── edit.rs            场景、角色、对白等纯源码修改
    ├── projection.rs      结构模型、字段范围与只读查询
    └── projection/
        ├── parse.rs       基于 Loader token 的结构识别
        └── edit.rs        Block 的有界源码修改
```

面板持有交互状态，源文档仍由 `EditorDocuments` 统一管理；投影与索引均可从源码重建。
补全、Block、Inspector 共用 `commands` / `fields`，字段规则不依赖 GPUI 控件。
原生命令及舞台事件的合法字段由 Loader 的各命令族 signature/字段表定义，
通过 `native_command_argument_names` 供 Inspector 与补全使用；新增参数只改对应命令族。
音效统一使用 `se(asset, id: ..., loop: true, volume: ..., fade: ...)`；Inspector/补全提供 Loop、Fade 和 Fade out 字段；旧 `se.loop` 不再解析，现有剧本须改为统一写法。
显示顺序保留，标签、候选值、分组提示与特殊控件仍归 Editor。
`style` 及对白尾部选项也复用 Loader 的字段表。`frame` 等子行通过
`native_child_command_argument_names(parent, child)` 按父命令查询；Inspector 与补全
共用序列 fps/逐帧时长的提示过滤，不混用序列帧和关键帧字段。
文本的 speaker/voice/stable ID 查询共用投影元数据；语音和尾部选项范围共用基于 Loader token
的查询，由元数据、字段编辑及写回共同消费。多选摘要读取完整源码范围，
Voice 修改保留尾部注释和选项；return/break 仍按 Loader 规则作为控制语句。
插入模板覆盖全部 70 个入口的解析与可编辑 Block 回归；sprite.update 模板只换图，不隐式重设位置或缩放。
立绘、移动、隐藏及聚焦规则模板优先共用已有角色 ID，使聚焦能够自动跟随对白。
源码层只返回修改结果；应用修改、冲突保护与撤销仍由 `app/edits.rs` 负责。
中文等 Unicode 标识符沿用 Loader 的字母/数字规则，编辑器不另设 ASCII 限制。
Text/Blocks 共用概览导航状态和边界计算；各自仅提供原生行布局与滚动位置。
概览缓存、选中态、配色与源码更新路径保持独立，拖动概览不修改源码或选中 Block。
Blocks 的源码、行索引、顺序和静态几何按版本缓存；普通滚动二分查找可见行，源码、折叠或实测行高改变时重建。拖放/折叠动画仍使用原有冻结几何路径。
Text 概览直接读取原生 DisplayMap 的折行和折叠映射；配色与笔画在后台生成。改宽复用配色，新任务取消旧任务，发布前复核版本，无固定输入延迟。布局、正文和折叠未变时不重建，不重复排版。

面板专属状态由 `document/files/inspector/resource/characters/blocks/picker` 各模块拥有；
共享文档、源码事务、文件事务及派生索引仍使用原有 owner，渲染只准备视图与控件。
文件/场景名称的 Enter 在输入订阅里延迟提交，不在 render 中执行文件或源码修改。
共享运动、测量展开、边缘滚动与弹层关闭规则仍归 `controls/reorder`，不建立跨 GPUI/Bevy 的 UI 框架。

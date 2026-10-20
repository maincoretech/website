# 兼容输入

Kēne 使用 Eiyashou 编写原生剧本，也能读取下面列出的 LetsGal 和 WebGAL 内容。
导入会转换为 Kēne 的引擎指令，不会运行原引擎或它的插件。
兼容 JSON 在 Editor 中只读；要继续编辑，请用 `migrate` 转换为原生工程。

## LetsGal

支持常用的剧本、角色和舞台功能，但不是所有 LetsGal 工程都能直接转换。

### 已支持

支持结构化比较条件、`and/or`、空目标选项继续执行、选项内按顺序赋值，以及 fragment 返回。
条件只在选择分支前求值一次，分支内改变量不会再触发另一分支。
差分/条件换图会登记所有候选素材；常用 JSON 富文本样式、非循环 BGM、静态头像对白
和 stage 全舞台幕布会保留对应行为。未静音的未知时间轴轨道或事件会报错。
原生粒子控制和 blink/talk 帧序列见 [语言](language.md#常用动态效果)。

- 识别 Studio 工程，读取 chapters、scenes、characters、资源清单与默认界面配置。
- 支持舞台轨道、关键帧和事件，以及镜头、场景层、分层立绘、皮肤/视口高度、对焦、音频和退格。
- 镜头、角色、场景层和已支持舞台属性的时间轴共用一个时钟。
- 支持跨 fragment/章节调用、waitForInput、repeat/muted/playbackRate 与已映射默认壳行为。

### 迁移后的工程

`migrate` 输出原生清单和脚本；转换失败时不生成最终目标工程。

- 迁移按源文件分组输出 `.shou`，保留文件名与子目录；同源文件的多个 fragment 仍放在一起。LetsGal `project.json` 生成的入口/调度放在小型 `main.shou`，重名路径加数字后缀。跨文件 `goto` / `call` 仍按全项目 scene ID 连接，初始变量放在入口文件。
- 默认线性主 fragment 结束时补下一章 `goto`，最后一章补 `story.end()`；辅助 fragment 和章节预处理仍返回，高级调度沿用调度图。见 [LetsGal 执行规则](https://docs.avg-engine.com/reference/script-json)。
- 对象 ID 重命名后通过 `objects.yaml` 恢复引擎分组；粒子纹理进资源清单。
- 场景背景按源资源分类进入 `backgrounds`；分层绘制仍使用 `sprite`，不因此改成立绘资源。同一分类下的源文件只复制一次。
- 资源文件保留源文件名与分类内子目录，引用 ID 独立编号；大小写重名加短数字后缀，不覆盖。后续格式转换仅改变扩展名。
- 重置镜头迁移为一条 `camera.reset(all)`，保留动画时长、缓动与等待；不展开默认特效字段。
- 保留补间字段、等待时序和已支持的随机参数；一条镜头动作仍对应一个 Block。

### 需要手动修改或暂不支持

扩展函数条件、`contains` 等未支持操作、角色名称变体、复合头像、
高级粒子随机/空间参数及独立语音 loop/fade 无法直接转换，迁移时会提示手动改写。
原生 `talk` 跟随文字逐字显示，不支持音频驱动口型，也不共享上游差分部件的状态。
未知或缺失的宿主扩展会报错，不加载 Studio/Electron 插件。

实现见 [`letsgal adapter`](../../crates/loader/src/adapter/editor/letsgal.rs)，时间轴测试位于 `tests/fixtures/`。
完整官方示例只保留在本机，不把其中的商业资源提交到仓库。

## WebGAL（冻结）

保持现有兼容行为，只修安全、崩溃、数据丢失和 Kēne 引入的明确回归。
不再添加新的 WebGAL 功能，也不跟进后续版本的新语法。

```text
已支持
├── say / changeBg / changeFigure / choose / setVar / callScene / changeScene
├── 已实现的音视频、转场、动画和变换命令
├── -when：安全表达式子集；-next：不等待当前演出结束便继续执行
└── 未知命令：沿用按对白处理的规则；保留字可能提示不支持
```

### 暂不支持与已知差异

不执行任意 JavaScript 或对象表达式；不完整支持 `-continue`、CSS/React 模板、
自定义 WebGAL animation table、所有 easing/filter、Steam 桥接和上游输入验证参数。
`showVars`、`applyStyle`、`callSteam` 不会被当作已成功执行。
`-when` 的有效表达式继续使用原有 truthy 语义；无效表达式、缺失变量或除零等求值失败
会停止脚本并给出可定位的运行时诊断，不再仅记录日志后跳过动作。
图片和音视频由 Kēne 加载与播放；转换完成后仍需检查实际画面和声音。

保留已知差异：重复参数本地以后项覆盖；标签取最后定义；gallery 不保存完整 series 元数据。
`setFilter` 属于已有 Kēne 行为，不表示与 WebGAL 完全一致，也不自动支持上游新增别名。
实现与测试入口：[`webgal`](../../crates/loader/src/adapter/script/webgal.rs)、
[`coverage`](../../tests/coverage.rs)、[`fixtures`](../../tests/fixtures/webgal-showcase/)。

---
title: Eiyashou v2.0 语法与用例参考
date: 2026-10-05
author: maincore
description: 按 Kēne 当前实现整理的 Eiyashou v2.0 完整语法、命令、参数与演出用例
priority: 2
category: tech
---

Eiyashou 是 Kēne 的原生视觉小说脚本。故事、分支、资源调度和镜头演出都写在 UTF-8 的 `.shou` 文件里。本文先按制作顺序写出一幕，再列出当前解析器接受的语法、命令、字段和对应用例，方便照着写与回查。

本文对应 **Kēne 0.13.0 / Eiyashou v2.0（核对提交 `2baff735c21f8d5581b6d174ca937c884d9ecf64`）**，包含原生动态序列与粒子参数；不是旧版本引擎的兼容说明。工程写 `script.version: 2`，省略时也默认 2，显式旧版本会被拒绝。已合并的旧命令没有别名。示例中的 `room`、`rin_smile` 等都是资源 ID，不是文件路径；把它们用于自己的工程前，请先在资源清单中登记对应文件。

阅读顺序：先看工程、基础语法和独立用例，再按“完整命令参考”查询参数。后文另列旧写法到 v2 的转换及当前实现边界。

## 五分钟写出第一幕

建立下面的文件。路径以工程目录为起点；脚本必须是 UTF-8。

```text
my-story/
├── config.yaml
├── assets.yaml
├── characters.yaml
└── scripts/
    └── start.shou
```

`config.yaml`：

```yaml
title: My Story
project:
  id: my-story
adapter:
  script: keine
script:
  version: 2
  entry: start
  assets: assets.yaml
  characters: characters.yaml
```

`assets.yaml` 写 `{}`，`characters.yaml` 写 `characters: {}`。然后在 `scripts/start.shou` 写：

```shou
scene start {
  "雨停了。",
  "从这里开始写你的故事。",
  story.end()
}
```

在 Kēne 仓库根目录执行 `cargo validate /path/to/my-story` 可检查工程。启动预览时，将同一个工程目录传给 `cargo dev /path/to/my-story`。`scene start` 的名字须与 `script.entry` 一致；同一场景里的语句用逗号分开。

## 给故事加入素材和人物

需要画面或声音时，把相应文件放进工程，再扩展 `assets.yaml`。生产素材采用 WebP 图像与 Ogg Opus 音频；清单键是脚本中使用的裸 ID。

```yaml
backgrounds:
  room: assets/room.webp
  roof: { path: assets/roof.webp, tags: [outdoor] }
figures:
  rin_smile: assets/rin_smile.webp
  rin_sad: assets/rin_sad.webp
  rin_neutral: assets/rin_neutral.webp
voices:
  rin_hello: assets/rin_hello.opus
bgm:
  theme: assets/theme.opus
se:
  bell: assets/bell.opus
  rain: assets/rain.opus
videos:
  opening: assets/opening.webm
particles:
  snow_texture: assets/snow.webp
```

`characters.yaml` 登记说话者：

```yaml
characters:
  rin:
    name: 凛
    color: '#BAEBFF'
```

资源清单里的 `particles` 是纹理资源；`particle.show` 的第一个参数是实例 ID，第二个是预设 ID。下文各段是**独立用例**：放入自己的 `scene ... { ... }`，并按需调整资源和变量。例子中展示 `rin_*` 的地方是立绘槽位 ID 前缀，不是文件名通配符。

## 语法从句子到表达式

一个源文件可以写多个 `scene id { ... }`。Loader 递归读取 `scripts/**/*.shou`，`scene` ID 在项目内唯一；不需要 `import`，也不按文件名顺序执行。`script.entry` 指向入口 scene，入口文件不必叫 `main.shou`。语句用逗号分隔，可以换行，也可以把数条语句写在同一行。最后一条语句后不需要逗号。`//` 是行注释，`/* ... */` 是块注释。命令参数中，位置参数写在前面，命名参数写成 `name: value`；未知或重复参数会报错。

| 写法                                          | 含义                                            |
| --------------------------------------------- | ----------------------------------------------- |
| `"旁白"`、`rin: "对白"`                       | 显示文字；人物 ID 必须在 `characters.yaml` 登记 |
| `rin: { "第一句", "第二句" }`                 | 同一说话者连续多句，每句单独等待推进            |
| `rin: "对白", voice_id`                       | 在对白后关联一条 `voices` 资源                  |
| `"文字", concat: true, inherit_speaker: true` | 拼接上一句并沿用上一句角色                      |
| `@arrival rin: "对白"`                        | 给对白、旁白或选择项稳定源 ID；全项目不得重复   |
| `"等一下[wait=500]继续"`                      | 打字中暂停 500 毫秒；相邻标记累加，不占文字位置 |
| `"数量 ${count}"`                             | 仅在对白、旁白、选择项文本中插入纯表达式        |
| `"字面量 /${count}"`                          | 用 `/${` 显示原样的 `${`，不做插值              |

变量用 `let` 声明，项目内每个名字只声明一次；再次经过该语句时，仅在尚未初始化时初始化。类型为 `bool`、`int`、`float`、`string`，以及同一种元素类型的列表。空列表必须写 `list(bool)`、`list(int)`、`list(float)` 或 `list(string)`，不能写 `[]`。表达式里的字符串只使用双引号；可转义 `\"`、`\\`、`\n`、`\r`、`\t`。插值不能放在变量值或命令的普通字符串参数中。

```shou
let names = ["凛", "澪"],
let empty_names = list(string),
let count = names.length,
let first = names[0],
let found = "凛" in names,
let average = count / 2,
if ((count > 0) and (not false)) {
  "第一位是 ${first}，一共 ${count} 位。"
} else if (found) {
  "找到凛了。"
} else {
  "名单为空。"
}
```

| 表达式类别 | 可用写法                                                             | 边界                                            |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| 数字与算术 | 整数、浮点数、`+`、`-`、`*`、`/`、`%`、一元 `-`                      | `/` 得到实数；`%` 只接受整数；除零和溢出报错    |
| 比较       | `==`、`!=`、`<`、`<=`、`>`、`>=`                                     | 混用比较与逻辑运算时显式加括号                  |
| 布尔       | `and`、`or`、`not`                                                   | 条件必须是 `bool`，没有 truthy                  |
| 列表       | `[a, b]`、`list(type)`、`items[i]`、`items.length`、`value in items` | 同类型元素；索引越界报错；空列表用 `list(type)` |
| 字符串     | `"文本"`、`"${纯表达式}"`                                            | 插值仅供显示文字使用，列表不能直接插值          |

控制流只有 `if / else if / else`、`loop / break`、`choice`、`goto / call / return`，没有 `while`、`for`、`continue`。`break` 离开最近一层循环。赋值有 `=`、`+=`、`-=`、`*=`、`/=`、`%=`，没有 `++`、`--`。列表修改是语句，不是表达式：`append`、`remove`、`clear`、`insert`、`pop`；`pop` 必须写 `into: 已声明变量`。

```shou
let items = list(string),
let removed = "",
items.append("钥匙"),
items.insert(0, "票根"),
pop(items, into: removed),
items.remove("钥匙"),
items.clear(),
choice("下一步") {
  @search "继续调查" when (removed == "票根"): goto(search_room),
  @leave "先离开": { wait(200ms), call(hallway) }
}
```

`choice` 的提示文字可省略，写成 `choice { "选项": goto(next_scene) }`；`when` 为 false 的选项不显示，所有选项都隐藏则是运行时错误。`call` 与 `return` 成对用于子场景；`goto` 替换当前场景。无等待、无退出路径的循环会报错。

## 对白、旁白、文字演出

人物 ID 后接冒号表示对白。没有人物 ID 的字符串是旁白。可在对白后加一个语音资源 ID，再写尾部选项；`return` 和 `break` 始终是控制语句，不会被当成语音 ID。`[wait=500]` 会在打字到该位置时停 500 毫秒。`${...}` 只接受 Eiyashou 表达式。

```shou
let trust = 2,
background(room),
sprite(rin_stage, rin_smile, position: right),
@arrival rin: "你来了。[wait=500]正好有事要说。", rin_hello, volume: 0.8,
"当前信任：${trust}",
rin: { "先看这里。", "然后再决定。" }
```

每条字符串的尾部选项是 `volume`（语音音量 0–1，默认 1）、`concat`（拼接前句）、`auto`（该句自动推进）、`inherit_speaker`（沿用前句角色）；三个布尔值默认都为 `false`。每句 `auto` 与全局 `playback.auto` 不同。

```shou
rin: "我想说……", auto: true,
"其实很高兴见到你。", concat: true, inherit_speaker: true
```

要切换文字呈现方式、显示状态或段落动画，可以这样写：

```shou
text.box(visible: true, auto: false),
text.style(cinematic),
text.presentation(paragraph),
text.paragraph.style("opening", typewriter_speed: 0.03, reveal_duration: 300ms, reveal_effect: smooth_rise, reveal_distance: 12),
"这段以段落样式出现。",
text.presentation(dialogue),
text.box(visible: false, auto: false)
```

`@arrival` 为对白指定稳定的源 ID；旁白和选择项也可标注，ID 在工程中须唯一。`text.retract` 让已显示的对白退回到指定前缀；`keep` 必须是执行时原文的前缀。空 `source` 表示当前对白，空 `keep` 表示退掉整句。退字完成后仍会等待下一次推进。

```shou
rin: "我完全不在乎。",
text.retract(source: "我完全不在乎。", keep: "我"),
rin: "我……其实很在乎。",
wait.advance()
```

开场字幕、画面浮字也有各自的命令：

```shou
text.intro(hold: true) {
  page("第一天"),
  page("雨后的城市")
},
text.float("三小时后", x: 960, y: 540, font_size: 64, hold: 1s, blocking: false),
text.float.configure(id: chapter_title, infinite: true),
wait(1s),
text.float.hide(chapter_title)
```

`text.float.hide()` 不填 ID 时隐藏当前浮字；持续浮字需要自行隐藏。`wait(300ms)` 是定时等待，`wait.advance()` 等待玩家操作。

### 字符串内的富文本与停顿

下面是文字渲染器接受的行内形式，不是 HTML、CSS 或可执行表达式。`[文字](参数)` 包裹的文字参与逐字显示，样式参数不占字数；不支持嵌套标签。

```shou
rin: "[桜](さくら) 与 [重点](color=#ffb7c5,bold)。",
"[警告](bg=#315735,color=#ffffff,size=72px,italic,opacity=0.9)",
"[划去](strike) [注音](ruby=ちゅうおん,color=#ffffff)",
"先显示[wait=250][wait=250]再显示。[wait]点击后继续。"
```

| 参数或标记                     | 当前含义与边界                                                          |
| ------------------------------ | ----------------------------------------------------------------------- |
| `[文字](读音)` / `ruby=读音`   | 注音；同时有样式时用显式 ruby                                           |
| `color=#RRGGBB` / `#RRGGBBAA`  | 文字颜色，支持六或八位十六进制，不支持三位缩写                          |
| `background` / `bg`            | 背景色，值同颜色格式                                                    |
| `size` / `fontSize`            | 字号；可带 px，大于 4 时除以 60 得缩放，否则按缩放值；最终限制为 0.5–2  |
| `bold` / `weight=bold`         | 粗体                                                                    |
| `italic` / `style=italic`      | 斜体                                                                    |
| `strike` / `del`               | 删除线                                                                  |
| `opacity` / `alpha`            | 文字透明度，最终限制为 0–1                                              |
| `[wait=N]` / `[wait time="N"]` | 同句暂停 N 毫秒；相邻等待累加，负数按 0；非有限或无法解析的值保留为文字 |
| `[wait]`                       | 同句等待推进输入；与独立 `wait.advance()` 的位置不同                    |

样式参数可用逗号或分号分隔；包含样式的混合写法应带 `key=value`（例如 `color=#ffffff,bold,italic`）。没有样式键的普通参数文本会被视为读音。未知样式键目前被渲染器忽略，不应把它当作新 DSL 能力。`[wait time="250"]` 放进脚本字符串时，内部引号需要转义。

## 变量、分支和场景流转

变量是严格类型：`bool`、整数、浮点数、字符串及同类型列表。条件必须求得布尔值，不存在 JavaScript 式 truthy。`/` 是实数除法，`%` 只用于整数。字符串可以插入纯表达式，列表不能直接插值。

```shou
scene start {
  let trust = 2,
  let visits = 0,
  if ((trust >= 2) and (visits == 0)) {
    "她似乎在等你。"
  } else {
    "天台上空无一人。"
  },
  choice("现在去哪里？") {
    "去天台" when (trust >= 2): goto(rooftop),
    "留在教室": { visits += 1, call(classroom) }
  },
  "回到主线。",
  story.end()
}

scene rooftop {
  "风很大。",
  story.end()
}

scene classroom {
  "你又看了一眼教室。",
  return
}
```

`goto` 替换当前场景，不压入返回栈；`call` 调用场景，`return` 回到调用后的语句。被调用场景走到末尾也会返回，普通入口走到末尾不会自动进入另一个文件；章节尾部应写 `goto(下一章)`，结局显式写 `story.end()`。例如上面的三个 scene 可以分别放进三个 `.shou` 文件，执行顺序仍由控制流决定。`choice` 的 `when` 为 false 时隐藏该项，所有选项都隐藏会在运行时报错；空选项块 `{}` 会继续执行选择后的语句。

循环和列表适合维护背包、线索等状态：

```shou
let clues = ["票根", "照片"],
let taken = "",
clues.append("钥匙"),
clues.insert(1, "纸条"),
clues.remove("照片"),
pop(clues, 0, into: taken),
clues.clear(),
let count = 0,
loop {
  count += 1,
  if (count >= 3) { break },
  wait(100ms)
}
```

`pop` 也可省略索引；空列表或索引越界时不会改写目标变量。循环必须有能推进或结束的路径；无等待、无出口的无限循环会报错。

## 背景、立绘和焦点

`background` 显示或清除背景，`sprite` 创建/替换一个立绘槽，`sprite.update` 修改已有立绘。坐标使用 1920×1080 设计空间；时间可写 `ms` 或 `s`。省略的稀疏更新字段保持现值。

```shou
background(room, transition: fade(300ms), scale: 1.05),
sprite(rin_stage, rin_smile, position: right, blend: alpha, transition: fade(300ms)),
move(rin_stage, center, duration: 400ms, easing: ease_in_out),
sprite.update(rin_stage, rin_sad),
sprite.transform(rin_stage, x: -24, duration: 250ms),
sprite.transform(rin_stage, alpha: 0.8, scale_x: 1.1),
sprite.transform(rin_stage, brightness: 0.7, saturation: 0.5),
background.transform(scale_x: 1.1, duration: 500ms),
hide(rin_stage, transition: fade(300ms)),
background(none)
```

位置可写 `position: right(x: 500, y: -20)`；组内 `x/y` 是锚点偏移，命令顶层 `x/y` 是变换偏移。布局采用 `layout: viewport(height: 0.85)` 或 `layout: scene(...)` 等分组值，完整形式见后面的布局表。`sprite.update(id, asset)` 只换图，保留省略的位置、布局与缩放，目标不存在时跳过；显式 `position: center, layout: natural, scale: 1` 才重设这些状态。`hide(rin_*)` 隐藏所有以 `rin_` 开头的立绘槽；`hide(*)` 隐藏全部。`blocking: false` 允许过渡开始后继续执行后续语句。

动作、逐帧和按状态切图：

```shou
sprite(rin_stage, rin_smile),
sprite.animate(rin_stage, shake, duration: 300ms),
sprite.transition(rin_stage, enter: enter, duration: 300ms),
sprite.keyframes(rin_stage, repeat: 2, blocking: true) {
  frame(x: -20, duration: 300ms),
  frame(x: 20, duration: 300ms)
},
sprite.sequence(rin_stage, fps: 12, loop: true) {
  frame(rin_smile),
  frame(rin_sad)
},
sprite.sequence(rin_stage, loop: false) {
  frame(rin_smile, duration: 120ms),
  frame(rin_sad, duration: 200ms)
}
```

```shou
let mood = "happy",
sprite.select(rin_stage, mood, default: rin_neutral) {
  case("happy", rin_smile),
  case("sad", rin_sad)
},
sprite.select.when(rin_stage, default: rin_neutral) {
  case(mood == "happy", rin_smile),
  case(mood == "sad", rin_sad)
}
```

固定帧率序列默认 12 FPS、`loop: false`。也可省略 `fps`，让所有 `frame` 都写 `duration`；不能两种计时混用。

说话时突出当前人物可用焦点规则；`characters` 列的是舞台立绘/角色 ID。下面让立绘 ID 与 `characters.yaml` 中的角色键 `rin` 相同，配置一次后自动跟随对白，旁白使用 `narration`：

```shou
sprite(rin, rin_smile),
sprite.focus.configure(characters: [rin], speaking: style(scale: 1.1), others: style(brightness: 0.7), narration: style(), duration: 300ms),
rin: "看着我。",
"她望向窗外。",
sprite.focus(none),
avatar.show(rin_smile),
avatar.hide(),
scene.parallax(amplitude_percent: 5, scale: 1.1),
scene.parallax.stop()
```

`inherit_speaker` 或没有角色的 `concat` 会延续上一句焦点；显式 `sprite.focus(...)` 可覆盖紧接着的一句。`objects.yaml` 中的运行时别名由 Loader 解析。

### 眨眼与说话部件

眼睛、嘴使用普通 sprite，因此沿用位置、布局、层级与变换，不需要另一套对象模型：

```shou
sprite(eyes, rin_smile),
sprite.sequence(eyes, mode: blink, interval: 3s, fps: 10) {
  frame(rin_smile), frame(rin_sad), frame(rin_smile)
},
sprite(mouth, rin_neutral),
sprite.sequence(mouth, mode: talk, speaker: "凛", fps: 12) {
  frame(rin_neutral), frame(rin_smile)
},
rin: "说话时播放嘴部帧。"
```

实际制作时将示例整张立绘换成登记好的透明眼睛/嘴部素材。动态模式至少两帧，第一帧是静止帧；`blink` 间隔默认 3s，必须为正，不能写 `speaker`；`talk` 必须写角色**显示姓名字符串**，不能写 `interval`。说话序列跟随逐字显示而非音频口型识别，文字完成后回到第一帧。两种动态模式都不能写 `loop`，也可用统一的逐帧 `duration` 替代 `fps`；换图或隐藏会清理序列。

### 立绘环境光照

`sprite` 默认 `light: true`；`sprite(rin, rin_smile, light: false)` 关闭该立绘的环境染色，`sprite.transform(rin, light: true)` 重新开启，稀疏更新省略时保留。配置 `layout.environment_light` 的默认强度为 1，范围 0–1，0 全局关闭；只对原生 keine 项目生效。

```yaml
layout:
  environment_light: 0.8
```

这是背景原图色调对普通 alpha 立绘的温和适配，不是方向光、阴影或法线重照明；不染色头像、文字、UI 或非 alpha 混合层。无可取色场景时回退中性白，聚焦与手工滤镜仍生效。

## 镜头、后期和遮罩

`camera.move` 可以一次调整画面变换和后期；目标为 `scene`、`characters`、`all` 或 `none`。`tween` 列表指定需要插值的数值字段；省略列表则按整条命令的默认补间，`[]` 使字段立即生效。

```shou
camera.move(scene, x: 120, scale_x: 1.05, blur_amount: 2, tween: [x, blur_amount], duration: 1s),
camera.shake(all, amplitude: 8, frequency: 12, amplitude_randomness: 0.3, frequency_randomness: 0.2, duration: 300ms),
camera.effect(scene, bloom_intensity: 0.4, lut_preset: "warm", duration: 300ms),
camera.effect(scene, focal_distance: none, tween: [], duration: 300ms),
camera.bind(rin_stage, distance: 1.5),
camera.unbind(rin_stage, distance: 1.5)
```

`camera.effect` 与 `camera.move` 共用稀疏特效字段，包括镜面破碎和速度线：未写字段保留当前值；`focal_distance`、`lut_preset` 可用 `none` 清除。一次命令仍是一个原子 Action，不因效果种类拆分。

```shou
camera.effect(all, speed_lines_intensity: 0.6, speed_lines_radial: true),
camera.effect(all, mirror_shatter_intensity: 0.2, mirror_shatter_seed: 1),
camera.move(all, x: 20, shake: shake(amplitude: 4, frequency: 2),
  tween: [x, shake_amplitude, shake_frequency], duration: 1s),
camera.reset(all, duration: 300ms, easing: ease_out, blocking: true)
```

嵌套 `shake` 的时长省略时沿用外层 `duration`；振幅、频率与时长必须齐全。`tween` 的 `shake_amplitude` / `shake_frequency` 从当前震动值补间，没有震动时从 0 开始；频率变化连续积累相位。`camera.reset` 同步恢复目标镜头变换与全部特效，并立即停止震动；不修改视差或镜头绑定。省略时长为立即恢复，阻塞只在整组末尾等待一次。

遮罩可限制到某个立绘，或覆盖整个舞台。这里的 `targets` 是 ID 列表：

```shou
stage.mask.show(iris, mode: clip, plane: topmost, scope: selected, targets: [rin_stage], shape: ellipse, center_x: 50, center_y: 45, opacity: 0.7, color: rgba(1, 0, 0, 0.8), duration: 300ms),
stage.mask.hide(iris, duration: 200ms, blocking: false)
```

## 用时间轴合成一段演出

`stage.animate` 把属性关键帧和按时间触发的事件写在同一段里。`track` 指定目标与属性，`key` 指定时间和值；事件可切场景、控制镜头、粒子和声音。下面的 `room`、`roof`、`rin_smile`、`snow_texture`、`theme` 等 ID 需先登记在资源清单。

```shou
stage.animate(opening, duration: 2s, repeat: 1, playback_rate: 1, blocking: true) {
  track(camera, x) {
    key(time: 0ms, value: 0),
    key(time: 1s, value: 20)
  },
  track(character(rin_stage), alpha, image: rin_smile) {
    key(time: 0ms, value: 1)
  },
  event.camera.shake(time: 500ms, amplitude: 8, frequency: 12, duration: 300ms),
  event.camera.patch(time: 500ms, targets: scene, bloom_intensity: 0.4),
  event.particle(snow, snow, texture: snow_texture, time: 400ms, duration: 1s),
  event.scene(rooftop_view, time: 1s, fit: cover) {
    layer(foreground, roof, distance: 1, x: 0, y: 0)
  },
  event.audio(theme_cue, bgm, theme, time: 100ms, volume: 0.8, loop: true)
}
```

时间轴中的 `event.scene` 定义舞台场景层，不等同于脚本的 `scene rooftop_view { ... }` 流程跳转。`repeat`、`infinite`、`playback_rate` 与 `blocking` 控制整段播放；关键帧的 `easing` 可逐点指定。

## 音效、视频、粒子

一次性音效用 `se`，持续环境音用有实例 ID 的 `se.loop`。背景音乐用 `bgm`；`none` 停止相应播放。视频的 `mixed` 模式可与场景混合，`fullscreen` 是默认模式。

```shou
bgm(theme, volume: 0.7, fade: 500ms, loop: true),
se(bell, id: bell_once, volume: 0.8, fade: 100ms),
se.loop(rain_loop, rain, volume: 0.4, fade: 200ms),
se.stop(bell_once, fade: 100ms),
se.stop(rain_loop, fade: 300ms),
vocal.play(rin_hello, volume: 0.8),
vocal.stop(),
video.play(op, opening, loop: false, muted: false, alpha: 1, skippable: true, wait: true, mode: fullscreen),
video.stop(op, fade: 300ms),
bgm(none, fade: 500ms)
```

`video(opening)` 保留为全屏、非循环、阻塞的简写。`se` 有 `id` 也仍然只播放一次；`se.stop(id)` 可停止该 ID 的单次或循环音效。`se.stop(*)` 立即停止所有**单次**音效，不停止循环且不接受非零 `fade`，循环必须按 ID 关闭；`video.stop(*)` 停止全部视频。粒子可以按实例关闭，也可清空图层：

```shou
particle.show(snow, LIGHT_SNOW, texture: snow_texture, count: 120, wind: -4,
  fade_in: 200ms, size: 12, speed: 100, alpha: 0.7, spin: 20, drift: 10,
  drag: 0.2, color: rgba(1, 0.95, 0.9, 1)),
particle.hide(snow, duration: 300ms),
particle.layers.clear()
```

## 输入、界面和加载

玩家输入、弹窗结果先准备变量；输入类型可选 `string`、`number`、`bool`。下例是三种常见输入：

```shou
let player_name = "",
let player_age = 0,
let agreed = false,
input.request(player_name, title: "你的名字", confirm_text: "确定"),
input.request(player_age, type: number, title: "年龄", min_value: 0, max_value: 120, step: 1),
input.request(agreed, type: bool, title: "同意吗？", true_text: "同意", false_text: "再想想")
```

系统 UI 的槽位包括 `title`、`save`、`load`、`settings`、`history`、`gallery`、`input`。确认弹窗可把结果写入已声明变量：

```shou
let confirmed = false,
ui.show(save),
ui.hide(save),
ui.message(confirm, title: "继续？", message: "离开这里吗？", confirm_text: "离开", cancel_text: "留下", result: confirmed),
playback.auto(false),
screen.film(true),
screen.curtain.show(color: rgba(0, 0, 0, 1), duration: 300ms),
screen.curtain.hide(color: rgba(0, 0, 0, 0), duration: 300ms),
gallery.unlock(cg, room, name: "雨后的房间")
```

`ui.message` 也可用 `alert` 模式。画廊解锁的类型是 `cg` 或 `bgm`。资源加载策略可以明确预告即将使用的资源：

```shou
assets.loading(mode: manual, lookahead: 5, blocking: true) {
  resource(room, kind: background),
  resource(rin_smile, kind: figure)
}
```

## 完整命令参考：流程与文字

以下表格以当前 v2.0 解析器为准。第一列给出可写的最小形式或常见形式；第三列列出其余合法的**命名参数**。位置参数按示例顺序书写，命名参数可省略，除非文字特别注明必填。结构化命令还要求 `{ ... }` 内至少有一行相应子项。

| 写法                                                   | 用例                                | 其他命名参数                                                                                                                |
| ------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `goto(rooftop)`                                        | 替换当前脚本场景                    | 无                                                                                                                          |
| `call(classroom)`                                      | 进入子场景，稍后 `return`           | 无                                                                                                                          |
| `return`                                               | 返回调用处；不加括号                | 无                                                                                                                          |
| `wait(300ms)`                                          | 等待指定时长                        | 无                                                                                                                          |
| `wait.advance()`                                       | 等玩家推进                          | 无                                                                                                                          |
| `story.end()`                                          | 结束剧情                            | 无                                                                                                                          |
| `text.box(visible: true, auto: false)`                 | 显示/隐藏对白框，设置自动状态       | `visible`、`auto` **均必填**                                                                                                |
| `text.style(cinematic)`                                | 选择对白样式                        | 无；自定义样式 ID 可加引号                                                                                                  |
| `text.paragraph.style("opening")`                      | 调整段落打字与揭示动画              | `typewriter_speed`、`reveal_duration`、`reveal_effect`、`reveal_distance`、`reveal_scale`、`reveal_rotation`、`reveal_blur` |
| `text.presentation(paragraph)`                         | 在 `paragraph` 与 `dialogue` 间切换 | 无                                                                                                                          |
| `text.retract(source: "原句", keep: "前缀")`           | 让文字退回某个前缀                  | `source`、`keep` **均必填**                                                                                                 |
| `text.intro(hold: true) { page("第一页") }`            | 连续开场字幕页                      | `hold`；子项 `page("文本")`                                                                                                 |
| `text.float("三小时后")`                               | 在画面上显示浮字                    | `x`、`y`、`font_size`、`color`、`fade_in`、`hold`、`fade_out`、`blocking`                                                   |
| `text.float.configure(infinite: true)`                 | 将当前浮字改为持续显示              | `infinite` **必填**；可加 `id` 为其命名                                                                                     |
| `text.float.hide()` / `text.float.hide(chapter_title)` | 隐藏当前浮字或指定 ID               | 无                                                                                                                          |

`text.style` 的内建 ID 是 `default`、`cinematic`、`"cinematic-centered"`、`literary`、`sharp`、`handwritten`；带连字符的 ID 加引号。其他 ID 保留为自定义样式身份，不代表运行宿主一定提供对应样式。

`text.paragraph.style` 的 `reveal_effect` 可写 `instant`、`smooth_rise`、`classic`、`smooth_drop`、`slide_left`、`slide_right`、`pop`、`flip`、`swing`、`blur`；只有出现任一 `reveal_*` 字段才创建揭示动画配置。`typewriter_speed` 不得为负。`text.float` 默认在设计空间中心 `(960, 540)`，默认字号 48；字号必须为正。持续浮字的典型组合是 `blocking: false`，紧接着 `text.float.configure(infinite: true)`，最后显式 `text.float.hide()`。

### 流程与列表的完整形式

```text
scene id { 语句, 语句, ... }
let name = 表达式
name = 表达式                 // 或 +=、-=、*=、/=、%=
if (bool) { ... } else if (bool) { ... } else { ... }
loop { ... break ... }
choice("可选提示") { @id "选项" when (bool): 语句或 { ... }, ... }
items.append(value) / items.remove(value) / items.clear()
items.insert(index, value)
pop(items, into: target) / pop(items, index, into: target)
```

`pop` 的目标变量须先声明；弹出空列表或越界索引时目标保持不变。`choice` 选项块结束后回到选择后续语句。选择项可以没有 `when`，也可以没有前置 `@id`。

## 完整命令参考：背景与人物

| 写法                                                                                                      | 用例                           | 其他命名参数                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `background(room)` / `background(none)`                                                                   | 显示或清空背景                 | `transition`、`blocking`、下文初始变换字段                                                                                  |
| `background.transform(x: 20)`                                                                             | 对当前背景做稀疏变换与滤镜修改 | 初始变换字段、`brightness`、`contrast`、`saturation`、`duration`、`easing`                                                  |
| `sprite(rin_stage, rin_smile)`                                                                            | 创建或替换立绘槽               | `position`、`layout`、`blocking`、`transition`、`z`、`blend`、初始变换字段、`brightness`、`contrast`、`saturation`、`light` |
| `sprite.update(rin_stage, rin_sad)`                                                                       | 已有对象换图，保留省略状态     | `position`、`layout`、`scale`、`duration`、`easing`、`blocking`                                                             |
| `sprite.transform(rin_stage, alpha: 0.5)`                                                                 | 稀疏更新变换、滤镜与光照       | 初始变换字段、`brightness`、`contrast`、`saturation`、`light`、`duration`、`easing`                                         |
| `sprite.animate(rin_stage, shake, duration: 300ms)`                                                       | 播放一个内建或自定义预设       | `duration` **必填**                                                                                                         |
| `sprite.transition(rin_stage, enter: enter, duration: 300ms)`                                             | 设置进/出场预设                | `duration` **必填**；`enter`、`exit` 可选                                                                                   |
| `sprite.keyframes(rin_stage) { frame(x: 20, duration: 300ms) }`                                           | 按段播放变换关键帧             | `repeat`、`blocking`；子项 `frame` 见下文                                                                                   |
| `sprite.sequence(rin_stage) { frame(rin_smile) }`                                                         | 固定帧率或逐帧计时切图         | `fps`、`loop`、`mode`、`interval`、`speaker`；子项 `frame(asset, duration: ...)` 的时长可选，规则见下文                     |
| `sprite.select(rin_stage, mood, default: rin_neutral) { case("happy", rin_smile) }`                       | 按字符串变量切图               | `default` **必填**；子项 `case("值", asset)`                                                                                |
| `sprite.select.when(rin_stage, default: rin_neutral) { case(mood == "happy", rin_smile) }`                | 按严格布尔表达式切图           | `default` **必填**；子项 `case(bool, asset)`                                                                                |
| `sprite.focus.configure(characters: [rin_stage], speaking: style(), others: style(), narration: style())` | 配置说话/旁观/旁白焦点         | 四个所示字段**必填**；另有 `enabled`、`duration`、`easing`                                                                  |
| `sprite.focus(rin_stage)` / `sprite.focus(none)`                                                          | 指定当前讲话者或清除焦点       | 无                                                                                                                          |
| `hide(rin_stage)` / `hide(rin_*)` / `hide(*)`                                                             | 隐藏单个、前缀分组或全部立绘   | `transition`、`blocking`                                                                                                    |
| `move(rin_stage, left(x: -20, y: 10))`                                                                    | 把立绘移到左/中/右锚点         | `duration`、`easing`、`blocking`；位置组仅 `x`、`y`                                                                         |
| `avatar.show(rin_smile)` / `avatar.hide()`                                                                | 显示/隐藏小头像                | 无                                                                                                                          |
| `scene.parallax(amplitude_percent: 5)` / `scene.parallax.stop()`                                          | 开启/关闭鼠标视差              | `edge_ease_percent`、`return_to_center_on_leave`、`scale`                                                                   |

初始变换字段全集是 `x`、`y`、`alpha`、`scale`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height`，与后续 transform 使用相同名称。`scale` 同时设置两轴，不能与 `scale_x` / `scale_y` 混写；`scale` 必须大于 0。`background` 创建不接受颜色或 `light`，`background.transform` 接受颜色但不接受 `light`；镜头和关键帧也没有统一 `scale` 简写。

`background`、`sprite`、`hide` 的 `blocking` 默认 `true`，过渡默认 `instant`。`background(none)` 不可再给初始变换。`sprite(...)` 默认 `position: center`、`z: 0`、`blend: alpha`、`light: true`；`blend` 可用 `alpha`、`add`、`multiply`、`screen`，`z` 必须为 32 位整数。`move` 的位置只能是 `left`、`center`、`right` 或对应的 `left(...)` / `center(...)` / `right(...)`，省略时长为瞬移。

`sprite.transform` / `background.transform` 至少给一个变换或滤镜字段。`duration` / `easing` 只控制变换；`brightness`、`contrast`、`saturation`、`light` 即时应用，纯颜色/光照更新不接受非零 `duration`。这里的 `x/y` 是设置变换偏移值，不是每次累加位移。

`transition` 可写 `instant`、`fade(300ms)`、`slide_from_left(300ms)`、`slide_from_right(300ms)`、`crossfade(300ms)`、`wipe(300ms)`、`dissolve(300ms)`。`easing` 可写 `linear`、`ease_in`、`ease_out`、`ease_in_out`、`in_out_quad`、`out_cubic`、`in_out_cubic`、`out_back`、`out_bounce`。

`sprite.animate` / `sprite.transition` 的内建预设有 `enter`、`exit`、`shake`、`enter_from_bottom`、`enter_from_left`、`enter_from_right`、`move_front_and_back`、`blur`、`old_film`、`dot_film`、`reflection_film`、`glitch_film`、`rgb_film`、`godray_film`、`remove_film`、`shockwave_in`、`shockwave_out`；自定义预设用带引号的 ID，`sprite.transition` 的 `enter: none` / `exit: none` 可清除对应预设。`sprite.keyframes` 的 `frame` 必须有 `duration`，另接受 `easing` 与九字段 `x`、`y`、`alpha`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height`；空变换帧会在该段时长内保持先前状态。`sprite.focus.configure` 的三组 `style(...)` 分别可写 `scale`、`brightness`、`saturation`、`contrast`、`blur`、`alpha`。

| 序列模式      | 参数和计时                                                      | 用例                     |
| ------------- | --------------------------------------------------------------- | ------------------------ |
| 普通序列      | 不写 `mode`；`fps` 默认 12 且必须为正，`loop` 默认 false        | 循环雨滴、一次切图动画   |
| 逐帧时长      | 不写 `fps`，每帧都写 `duration`，不可只给部分帧                 | 不规则节奏、停顿帧       |
| `mode: blink` | 至少两帧；`interval` 默认 3s 且必须为正；拒绝 `loop`、`speaker` | 周期眨眼                 |
| `mode: talk`  | 至少两帧；必填 `speaker: "显示姓名"`；拒绝 `loop`、`interval`   | 随角色逐字显示切换嘴部帧 |

动态模式仍可二选一使用 FPS 或每帧时长。没有 `mode` 时，`interval` / `speaker` 不合法。

### 四种立绘布局

`sprite` 与 `sprite.update` 共用分组布局规则；创建省略为 `natural`，更新省略则保留现值。位置组与布局组不能混写旧的扁平字段。

```shou
sprite(rin_natural, rin_smile, layout: natural),
sprite(rin_tall, rin_smile, position: right(x: 500, y: -20), layout: viewport(height: 0.8), x: 12, y: 24),
sprite(rin_scene, rin_smile, layout: scene(fit: cover, x: 40, y: 10, anchor: point(x: 0.5, y: 1), width: 700, height: 900)),
sprite(rin_composite, rin_smile, layout: composite(canvas: size(width: 1920, height: 1080), rect: rect(x: 100, y: 0, width: 500, height: 900), height: 0.9)),
move(rin_tall, center(x: -50, y: 10), duration: 300ms),
sprite.update(rin_tall, rin_sad),
sprite.update(rin_tall, rin_smile, position: center, layout: natural, scale: 1)
```

| 分组值                                     | 完整字段                                     | 默认值与约束                                            |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------- |
| `left(...)` / `center(...)` / `right(...)` | `x`、`y`                                     | 锚点偏移默认 0；也可只写裸锚点名                        |
| `natural`                                  | 无                                           | 按资源原始尺寸                                          |
| `viewport(...)`                            | `height`                                     | 必填，正数视口高度比例                                  |
| `scene(...)`                               | `fit`、`x`、`y`、`anchor`、`width`、`height` | `fit` 默认 by_height，x/y 默认 0；width/height 必须成对 |
| `point(...)`                               | `x`、`y`                                     | scene 的 anchor；默认各 0.5                             |
| `composite(...)`                           | `canvas`、`rect`、`height`                   | canvas 必填；rect 可省略；height 为可选视口高度比例     |
| `size(...)`                                | `width`、`height`                            | canvas 宽高均必填                                       |
| `rect(...)`                                | `x`、`y`、`width`、`height`                  | 四项全写                                                |

`scene` 的 `fit` 接受 `by_height`、`by_width`、`cover`、`contain`、`stretch`、`center`。`sprite.update` 只接受整体 `scale`，不接受 `scale_x/y` 或顶层变换 `x/y`；它与 `sprite.transform` 的职责不同。鼠标视差 `scene.parallax` 的 `scale` 也必须大于 0。

## 完整命令参考：镜头与舞台

| 写法                                                                                | 用例                             | 命名参数                                                                                                                          |
| ----------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `camera.move(scene, x: 120)`                                                        | 同一步设置镜头变换、后期与震动   | 变换九字段、后期字段、`shake`、`duration`、`easing`、`blocking`、`tween`                                                          |
| `camera.reset(all)`                                                                 | 同步恢复变换与全部特效，停止震动 | `duration`、`easing`、`blocking`；默认 0ms、linear、true                                                                          |
| `camera.shake(all, amplitude: 8, frequency: 12, duration: 300ms)`                   | 震动场景、人物或全部画面         | `amplitude`、`frequency`、`duration` **必填**；`amplitude_randomness`、`frequency_randomness`、`axis`、`falloff`、`blocking` 可选 |
| `camera.bind(rin_stage, distance: 1.5)` / `camera.unbind(rin_stage, distance: 1.5)` | 绑定或解绑镜头对象               | `distance` **必填**                                                                                                               |
| `camera.effect(scene, bloom_intensity: 0.4)`                                        | 稀疏更新后期                     | 至少一个下述后期字段；另可用 `duration`、`easing`、`blocking`、`tween`                                                            |
| `stage.mask.show(iris, shape: ellipse)`                                             | 显示或更新舞台遮罩               | 下述遮罩字段，以及 `duration`、`blocking`                                                                                         |
| `stage.mask.hide(iris)`                                                             | 关闭指定遮罩                     | `duration`、`blocking`                                                                                                            |
| `stage.animate(opening, duration: 2s) { track(...) { key(...) } }`                  | 关键帧与定时事件的组合           | `duration` **必填**；`repeat`、`infinite`、`playback_rate`、`blocking` 可选                                                       |

镜头目标只能是 `scene`、`characters`、`all`、`none`。九个变换字段是 `x`、`y`、`alpha`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height`；`camera.move` 至少需要一个变换、后期或 `shake` 字段。镜面破碎与速度线也都是稀疏字段，不再要求完整状态。

`tween: [x, blur_amount]` 只补间已传入的指定数值通道；省略时按整条命令补间，`tween: []` 则立即生效且不额外阻塞。未知字段、重复字段或离散字段补间会报错。通道名称对应数值变换/后期字段，镜头嵌套震动另有 `shake_amplitude`、`shake_frequency`；非数值的 `lut_preset`、`color_tone`、布尔字段不可补间。

`shake: shake(...)` 的完整字段是 `amplitude`、`frequency`、`duration`、`axis`、`falloff`、`amplitude_randomness`、`frequency_randomness`，不能在组内写 `blocking`，由外层镜头命令控制。

`camera.shake` 的 `axis` 为 `x`、`y`、`both`，`falloff` 为 `linear`、`exponential`；两个 `*_randomness` 值都在 0–1。`amplitude` 不得为负。时间轴里的 `event.camera.shake` 使用相同轴、衰减与随机量，但 `frequency` 必须大于 0。

### `camera.effect` 的完整字段

下列字段可用于 `camera.effect`，也可与九个变换字段一起用于 `camera.move`。除了 `focal_distance`、`lut_preset`、`color_tone` 的特殊类型，以及 `godray_parallel`、`speed_lines_radial`、`speed_lines_region_ellipse` 三个布尔字段，其余均为数值。只写需要变动的字段；`focal_distance: none` 或 `lut_preset: none` 清除对应状态。`color_tone` 接受 `none`、`grayscale`、`sepia`；布尔字段使用 `true` 或 `false`。本表不包含公共控制字段 `duration`、`easing`、`blocking`、`tween`。

| 效果组         | 完整字段名                                                                                                                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 焦点与基础     | `focal_distance`、`blur_strength`、`distortion_strength`、`vignette_intensity`、`vignette_size`、`blur_amount`                                                                                                                                                                                                                      |
| 色调           | `color_tone`、`color_tone_intensity`、`color_exposure`、`color_brightness`、`color_contrast`、`color_saturation`、`color_temperature`                                                                                                                                                                                               |
| 胶片与冲击     | `old_film_intensity`、`shock_intensity`                                                                                                                                                                                                                                                                                             |
| 光束           | `godray_intensity`、`godray_angle`、`godray_gain`、`godray_lacunarity`、`godray_speed`、`godray_parallel`、`godray_center_x`、`godray_center_y`                                                                                                                                                                                     |
| LUT 与基本后期 | `lut_preset`、`lut_intensity`、`bloom_intensity`、`chromatic_aberration`、`pixelate_size`、`glitch_intensity`、`crt_intensity`、`sharpen_strength`                                                                                                                                                                                  |
| 模糊           | `radial_blur_strength`、`radial_blur_center_x`、`radial_blur_center_y`、`motion_blur_strength`、`motion_blur_angle`、`zoom_blur_strength`、`zoom_blur_center_x`、`zoom_blur_center_y`                                                                                                                                               |
| 光漏与镜头光斑 | `light_leak_intensity`、`light_leak_angle`、`lens_flare_intensity`、`lens_flare_center_x`、`lens_flare_center_y`                                                                                                                                                                                                                    |
| 颗粒与热浪     | `film_grain_intensity`、`film_grain_size`、`heat_haze_intensity`、`heat_haze_speed`、`heat_haze_scale`                                                                                                                                                                                                                              |
| 水波与雾       | `water_ripple_intensity`、`water_ripple_frequency`、`water_ripple_speed`、`water_ripple_center_x`、`water_ripple_center_y`、`fog_intensity`、`fog_speed`、`fog_scale`                                                                                                                                                               |
| 模拟屏幕       | `vhs_intensity`、`vhs_jitter`、`vhs_noise`、`halftone_intensity`、`halftone_scale`、`halftone_angle`、`dither_intensity`、`dither_levels`                                                                                                                                                                                           |
| 描边与眼睑     | `outline_intensity`、`outline_thickness`、`eyelid_openness`、`eyelid_width`、`eyelid_curvature`、`eyelid_softness`、`eyelid_center_x`、`eyelid_center_y`                                                                                                                                                                            |
| 镜面破碎       | `mirror_shatter_intensity`、`mirror_shatter_center_x`、`mirror_shatter_center_y`、`mirror_shatter_spread`、`mirror_shatter_seed`                                                                                                                                                                                                    |
| 速度线         | `speed_lines_intensity`、`speed_lines_radial`、`speed_lines_density`、`speed_lines_angle`、`speed_lines_speed`、`speed_lines_center_x`、`speed_lines_center_y`、`speed_lines_region_ellipse`、`speed_lines_region_x`、`speed_lines_region_y`、`speed_lines_region_width`、`speed_lines_region_height`、`speed_lines_region_feather` |

特效中的 `center_x/y` 等字段按各效果自己的坐标语义使用，不要把示例里的 0.5 当作立绘设计空间的 0.5 像素。时间轴属性表与后期字段表也不等同：当前 `track` 不接受镜面破碎/速度线通道，但 `event.camera.patch` 可即时设置这些字段。

### 舞台遮罩的模式与字段

遮罩只通过 `stage.mask.show(id, ...)` 创建或更新，通过 `stage.mask.hide(id, ...)` 关闭。`mode` 可为 `overlay`、`clip`；`plane` 可为 `behind_scene`、`bottom`、`top`、`topmost`；`scope` 可为 `scene`、`characters`、`all`、`selected`。`scope: selected` 时用 `targets: [id, ...]` 指定舞台对象。

| 类别         | 合法字段与值                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 形状与图像   | `shape: rectangle / rounded_rectangle / ellipse / image`；`image`、`image_channel: alpha / luminance`、`image_fit: stretch / cover / contain` |
| 几何与可见性 | `center_x`、`center_y`、`size_x`、`size_y`、`rotation`、`radius`、`visibility: inside / outside`、`feather`、`opacity`                        |
| 填充         | `fill_mode: solid / gradient / texture`、`color`、`gradient_start`、`gradient_end`、`gradient_direction`                                      |
| 纹理         | `texture`、`texture_fit: stretch / cover / contain`、`texture_blend: normal / multiply / screen / add`、`texture_scale`、`texture_opacity`    |
| 后处理       | `blur`、`vignette_amount`、`vignette_size`、`noise_amount`、`noise_size`、`hue`、`saturation`、`brightness`                                   |
| 播放         | `duration`、`blocking`                                                                                                                        |

颜色写为 `rgba(r, g, b, a)`。使用图片形状或纹理填充时，`image` / `texture` 应引用已登记的图像资源；`none` 可清除对应图片字段。

```shou
stage.mask.show(vignette, mode: overlay, plane: top, scope: all, shape: rectangle, fill_mode: gradient, gradient_start: rgba(0, 0, 0, 0), gradient_end: rgba(0, 0, 0, 1), gradient_direction: 90),
stage.mask.show(portrait_cutout, mode: clip, plane: topmost, scope: selected, targets: [rin_stage], shape: image, image: rin_smile, image_channel: alpha, image_fit: contain, visibility: inside, feather: 10),
stage.mask.show(paper, fill_mode: texture, texture: rin_sad, texture_fit: cover, texture_blend: multiply, texture_scale: 1.2, texture_opacity: 0.6),
stage.mask.hide(vignette, duration: 300ms)
```

### 时间轴的所有子项

`stage.animate` 必须有 `duration`，且至少有一个 `track` 或 `event.*` 子项。`duration` 与 `playback_rate` 必须大于 0；`repeat` 是非负整数。`track(camera | character(id) | scene_layer(id), property, image: ..., muted: ...)` 必须有至少一个 `key(time: ..., value: ..., easing: ...)`。`time` 和数值 `value` 必填；`image` 只用于 `character(id)` 目标。

| 子项                                                   | 必填与可选参数                                                                                                                                        | 用例                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `track(...) { key(...) }`                              | 目标、属性；可选 `image`、`muted`。每个 `key` 必填 `time`、`value`，可选 `easing`                                                                     | 让镜头、立绘或场景层按关键帧变化 |
| `event.camera.shake(...)`                              | 必填 `time`、`amplitude`、`frequency`、`duration`；可选 `amplitude_randomness`、`frequency_randomness`、`axis`、`falloff`                             | 在指定时间震动镜头               |
| `event.camera.patch(...)`                              | 必填 `time` 与至少一个 `camera.effect` 后期字段；可选 `targets`                                                                                       | 在指定时间稀疏修改后期           |
| `event.particle(id, preset, ...)`                      | 必填 `time`、`duration`；可选 `texture`、`count`、`wind`、`gravity`、`fade_in`、`fade_out`                                                            | 定时启动并结束粒子               |
| `event.scene(scene_id, ...) { layer(id, asset, ...) }` | 必填 `time`；可选 `transition`、`reset_camera`、`fit`、`x`、`y`、`anchor_x`、`anchor_y`、成对的 `width` / `height`；`layer` 可用 `distance`、`x`、`y` | 替换舞台场景与层，不改变脚本流程 |
| `event.audio(id, bgm / effect / vocal, asset, ...)`    | 必填 `time`；可选 `volume`、`loop`、`duration`、`fade_in`、`fade_out`                                                                                 | 定时播放音乐、音效或语音         |

`event.scene` 的 `fit` 同样接受 `by_height`、`by_width`、`cover`、`contain`、`stretch`、`center`。`event.camera.patch` 使用上表的稀疏后期字段，不接受镜头命令的 `duration`、`easing`、`blocking`、`tween`。时间轴中 `event.scene` 可以包含多个 `layer`；其他事件不能带子项。

```shou
stage.animate(detail, duration: 1s, repeat: 1, infinite: false, playback_rate: 1, blocking: true) {
  track(scene_layer(foreground), x, muted: false) {
    key(time: 0ms, value: 0),
    key(time: 1s, value: 24, easing: ease_out)
  },
  event.audio(bell_cue, effect, bell, time: 200ms, volume: 1, duration: 100ms),
  event.audio(voice_cue, vocal, rin_hello, time: 400ms, volume: 0.8)
}
```

时间轴 `track` 接受的**全部属性名**如下。实际可用目标仍由具体属性的引擎语义决定；这些名称是当前解析器的语法清单。

| 属性组       | 属性名                                                                                                                                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 几何与透明度 | `x`、`y`、`zoom`、`scale_x`、`scale_y`、`alpha`、`rotation`、`width`、`height`                                                                                                                                                                                                                          |
| 基础镜头     | `focal_distance`、`blur_strength`、`distortion_strength`、`vignette_intensity`、`vignette_size`、`blur_amount`                                                                                                                                                                                          |
| 色彩与胶片   | `color_tone_intensity`、`color_exposure`、`color_brightness`、`color_contrast`、`color_saturation`、`color_temperature`、`old_film_intensity`、`shock_intensity`                                                                                                                                        |
| 光束与 LUT   | `godray_intensity`、`godray_angle`、`godray_gain`、`godray_lacunarity`、`godray_speed`、`godray_center_x`、`godray_center_y`、`lut_intensity`                                                                                                                                                           |
| 光学与锐化   | `bloom_intensity`、`chromatic_aberration`、`pixelate_size`、`glitch_intensity`、`crt_intensity`、`sharpen_strength`                                                                                                                                                                                     |
| 模糊与光斑   | `radial_blur_strength`、`radial_blur_center_x`、`radial_blur_center_y`、`motion_blur_strength`、`motion_blur_angle`、`zoom_blur_strength`、`zoom_blur_center_x`、`zoom_blur_center_y`、`light_leak_intensity`、`light_leak_angle`、`lens_flare_intensity`、`lens_flare_center_x`、`lens_flare_center_y` |
| 环境         | `film_grain_intensity`、`film_grain_size`、`heat_haze_intensity`、`heat_haze_speed`、`heat_haze_scale`、`water_ripple_intensity`、`water_ripple_frequency`、`water_ripple_speed`、`water_ripple_center_x`、`water_ripple_center_y`、`fog_intensity`、`fog_speed`、`fog_scale`                           |
| 屏幕与轮廓   | `vhs_intensity`、`vhs_jitter`、`vhs_noise`、`halftone_intensity`、`halftone_scale`、`halftone_angle`、`dither_intensity`、`dither_levels`、`outline_intensity`、`outline_thickness`                                                                                                                     |
| 眼睑         | `eyelid_openness`、`eyelid_width`、`eyelid_curvature`、`eyelid_softness`、`eyelid_center_x`、`eyelid_center_y`                                                                                                                                                                                          |

## 完整命令参考：音视频与粒子

| 写法                                       | 用例                               | 命名参数与约束                                                                                               |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bgm(theme)` / `bgm(none)`                 | 播放、换曲或停止 BGM               | `volume`、`fade`、`loop`；默认音量 1、淡变 0ms、循环 true                                                    |
| `se(bell)` / `se(none)`                    | 播放一次性音效或停止单次音效       | `volume`、`id`、`fade`；默认音量 1、淡变 0ms                                                                 |
| `se.loop(rain_loop, rain)`                 | 开始带实例 ID 的循环音效           | `volume`、`fade`                                                                                             |
| `se.stop(rain_loop)` / `se.stop(*)`        | 按 ID 停止音效 / 停止全部单次音效  | `fade`；`*` 不停止循环且不接受非零 fade                                                                      |
| `vocal.play(rin_hello)` / `vocal.stop()`   | 播放或停止语音                     | `volume` 仅用于 `vocal.play`                                                                                 |
| `video(opening)`                           | 全屏非循环视频，等待播放结束或跳过 | `skippable`；不接受 `loop`、`wait`                                                                           |
| `video.play(op, opening)`                  | 控制视频实例                       | `loop`、`muted`、`alpha`、`skippable`、`wait`、`mode`                                                        |
| `video.stop(op)` / `video.stop(*)`         | 停止单个或全部视频                 | `fade`                                                                                                       |
| `particle.show(snow, LIGHT_SNOW)`          | 显示粒子实例与预设                 | `texture`、`count`、`wind`、`gravity`、`fade_in`、`size`、`speed`、`alpha`、`spin`、`drift`、`drag`、`color` |
| `particle.hide(snow)` / `particle.hide(*)` | 隐藏单个或全部粒子                 | `duration`                                                                                                   |
| `particle.layers.clear()`                  | 清空粒子图层                       | 无                                                                                                           |

所有音量值在 0–1。`video.play` 的 `alpha` 在 0–1；`mode` 为 `fullscreen` 或 `mixed`，默认全屏；默认 `loop: false`、`muted: false`、`alpha: 1`、`skippable: true`、`wait: true`。`wait: true` 等待视频结束；`skippable` 控制是否允许跳过。

`particle.show` 的 `count` 在语法层接受 0–65535 的整数；0 使用预设密度，渲染时每个发射器最多 256 个粒子。`texture` 引用 `assets.yaml` 中 `particles` 命名空间的资源 ID。内建明确命名的预设包括 `LIGHT_SNOW`、`MODERATE_SNOW`、`HEAVY_SNOW`、`LIGHT_RAIN`、`MODERATE_RAIN`、`HEAVY_RAIN`、`FIREFLY`、`FALLEN_LEAVES`；预设 ID 不是纹理 ID。其他名称按当前渲染器的雪/雨/萤火/叶片关键词匹配，未匹配则回退环境粒子，不是额外的严格枚举。

| 粒子字段          | 单位或约束             |
| ----------------- | ---------------------- |
| `size`            | 设计像素，必须大于 0   |
| `speed`           | 像素/秒，不得为负      |
| `alpha`           | 0–1                    |
| `spin`            | 度/秒                  |
| `drift`           | 横向摆动幅度，不得为负 |
| `drag`            | 阻力，不得为负         |
| `color`           | `rgba(r, g, b, a)`     |
| `wind`、`gravity` | 数值风力与重力覆盖     |

省略参数沿用预设，大小和速度仍保留预设的透视层差异。这些新参数只在 `particle.show` 中提供；当前 `event.particle` 仍只有时间轴表里列出的原字段，不接受 `size` 等新选项。

```shou
se.stop(*),
video.play(op_overlay, opening, loop: true, muted: true, alpha: 0.5, skippable: false, wait: false, mode: mixed),
video.stop(*, fade: 200ms),
particle.show(snow_front, snow, texture: snow_texture, count: 80, wind: -4, gravity: 2, fade_in: 200ms),
particle.hide(*, duration: 300ms)
```

## 完整命令参考：输入、界面与资源

| 写法                                                                                               | 用例                           | 命名参数                                                                           |
| -------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `input.request(player_name)` / `input.request(player_age, type: number)`                           | 默认字符串输入或按类型请求输入 | 下文列出的输入字段                                                                 |
| `ui.show(save)` / `ui.hide(save)`                                                                  | 显示或隐藏一个系统 UI 槽位     | 无                                                                                 |
| `ui.message(alert, title: "提示", message: "已保存", confirm_text: "知道了", cancel_text: "取消")` | 提示或确认弹窗                 | 四个文本字段**均必填**；可选 `result`                                              |
| `playback.auto(true)`                                                                              | 开启或关闭自动播放             | 无                                                                                 |
| `screen.film(true)`                                                                                | 开启或关闭胶片模式             | 无                                                                                 |
| `screen.curtain.show()` / `screen.curtain.hide()`                                                  | 遮帘显隐                       | `color`、`duration`                                                                |
| `gallery.unlock(cg, room, name: "雨后的房间")`                                                     | 解锁 CG 或 BGM                 | `name` **必填**；第一个参数只能是 `cg` 或 `bgm`                                    |
| `assets.loading() { resource(room, kind: background) }`                                            | 配置资源预加载策略             | `mode`、`lookahead`、`blocking`；子项 `resource(asset, kind: background / figure)` |

`input.request` 的可选字段全集是 `type`、`title`、`description`、`placeholder`、`confirm_text`、`required_text`、`required`、`min_length`、`max_length`、`min_value`、`max_value`、`step`、`true_text`、`false_text`。可只给变量名，默认 `type: string`，其他项沿用引擎默认值。`type` 可为 `string`、`number`、`bool`；长度和值边界按输入类型使用，`step` 必须大于 0，下界不得超过上界。结果变量应先 `let` 声明。`ui.message` 的第一参数可为 `alert` 或 `confirm`，`result` 指向已声明的结果变量。

`ui.show` / `ui.hide` 的槽位全集是 `title`、`save`、`load`、`settings`、`history`、`gallery`、`input`。`assets.loading` 的 `mode` 可为 `auto` 或 `manual`，`lookahead` 是 0–65535 的整数；`resource` 的 `kind` 目前仅接受 `background` 和 `figure`。`screen.curtain` 的颜色是 `rgba(r, g, b, a)`；时长与其他命令一样写 `ms` 或 `s`。

```shou
let nickname = "",
input.request(nickname, type: string, title: "怎么称呼？", description: "请输入昵称", placeholder: "名字", confirm_text: "继续", required_text: "请输入昵称", required: true, min_length: 1, max_length: 20),
ui.show(history),
ui.hide(history),
playback.auto(false),
screen.film(false),
gallery.unlock(bgm, theme, name: "主题曲"),
assets.loading(mode: auto, lookahead: 8, blocking: false) {
  resource(roof, kind: background),
  resource(rin_sad, kind: figure)
}
```

## 工程清单与迁移映射

`assets.yaml` 的全部命名空间是 `backgrounds`、`figures`、`voices`、`bgm`、`se`、`videos`、`particles`。每项可写工程相对路径，也可写 `{ path: ..., tags: [...] }`。`characters.yaml` 的每个人物需要 `name`，可选 `color`。脚本中的人物、素材、对象 ID 分属不同命名空间；引用图片时写清单键，不能直接在命令里嵌入文件路径。

原生新工程通常不需要 `objects.yaml`。如果迁移旧工程时必须把作者 ID 映射回原引擎对象 ID，在 `config.yaml` 的 `script` 下增加 `objects: objects.yaml`，并写：

```yaml
objects:
  rin_stage: original_character
prefixes:
  rin_: 'character-layer:'
```

`objects` 映射单个对象 ID，`prefixes` 处理 `hide(rin_*)` 这类前缀分组。映射只在加载时解析一次，不递归替换；未映射 ID 保持原样。资源 ID、变量名、场景名与对白文本不参与对象映射。映射键须为裸 ID，目标不能为空，同一表内目标不能重复。

## 从旧写法更新到 v2

这些是需要修改源码的转换，不是兼容别名。不能只把旧工程的版本号改成 2 而保留旧命令。

| 旧写法                                                        | v2 写法                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `transform_x: 20`、`transform_scale_x: 1.1`                   | 创建时直接写 `x: 20`、`scale_x: 1.1`                                 |
| `sprite.offset(id, x: 20, duration: 300ms)`                   | `sprite.transform(id, x: 20, duration: 300ms)`                       |
| `sprite.filter(id, brightness: 0.7)`                          | `sprite.transform(id, brightness: 0.7)`                              |
| `sprite.sequence.timed(id) { frame(asset, duration: 100ms) }` | `sprite.sequence(id) { frame(asset, duration: 100ms) }`              |
| `camera.effect.v2(all, ...)`                                  | `camera.effect(all, ...)`；只写要修改的字段                          |
| `input.simple(name, title: "名字", button: "确定")`           | `input.request(name, title: "名字", confirm_text: "确定")`           |
| `position: right, anchor_offset: 500, y: 20`                  | `position: right(x: 500, y: 20)`；顶层 y 现在是变换偏移              |
| `layout: viewport_height, layout_height: 0.85`                | `layout: viewport(height: 0.85)`                                     |
| `layout: scene, layout_fit: cover, ...`                       | `layout: scene(fit: cover, ...)`                                     |
| `layout: composite, layout_canvas_width: ..., ...`            | `layout: composite(canvas: size(...), rect: rect(...), height: ...)` |

### migrate 是旧引擎工程转换，不是原生版本升级器

从 Kēne 仓库根目录执行；第一个参数是原工程，第二个是新工程目录：

```sh
cargo migrate /path/to/old-project /path/to/new-project
cargo validate /path/to/new-project
cargo dev /path/to/new-project
```

`cargo migrate` 使用仓库提供的 publisher-feature alias，将当前适配器可无损表达的非原生作者工程转为 Eiyashou v2。原工程只读，目标必须不存在、位于源工程外，且父目录已经存在；已打包工程和已使用 Eiyashou 的原生工程会被拒绝。它不提供就地 v1→v2 升级。

生成 `config.yaml`、`assets.yaml`、`characters.yaml`、`objects.yaml`、`scripts/` 与引用资源副本，按实际源文件分组，保留控制流；适配器生成的入口/调度可放在入口脚本。资源复制不转码，先在临时目录生成并验证，成功才安装到目标。不能无损表达的命令会明确失败，不承诺全部上游扩展兼容。旧格式资源后续仍需按正式发行要求转换成 WebP/Opus，并用实际媒体复验。

### 常见诊断怎样改

| 错误写法                                                         | 应改为                                             | 原因                           |
| ---------------------------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| `return()`                                                       | `return`                                           | 返回是控制语句，不是带括号命令 |
| `let items = []`                                                 | `let items = list(string)`                         | 空列表必须说明元素类型         |
| `if (score > 0 and ready)`                                       | `if ((score > 0) and ready)`                       | 比较和逻辑运算混用时显式分组   |
| `background(none, x: 10)`                                        | `background(none)`                                 | 清背景不能再设置初始变换       |
| `video(opening, loop: true)`                                     | `video.play(op, opening, loop: true)`              | 简写视频固定非循环             |
| `camera.effect.v2(scene, speed_lines_intensity: 1)`              | `camera.effect(scene, speed_lines_intensity: 1)`   | 旧命令已删除，新命令是稀疏更新 |
| `sprite(id, asset, layout: viewport_height)`                     | `sprite(id, asset, layout: viewport(height: 0.8))` | 布局采用分组值                 |
| `sprite(id, asset, scale: 1.2, scale_x: 1)`                      | 只选整体 scale 或独立两轴                          | 两种缩放写法不能混用           |
| `sprite.transform(id, brightness: 0.7, duration: 300ms)`         | 去掉 duration，或同时提供要补间的变换              | 纯颜色/光照更新即时应用        |
| `sprite.sequence(id, fps: 12) { frame(asset, duration: 100ms) }` | 去掉 fps，所有帧写 duration                        | 序列计时不能混用               |
| `sprite.sequence(id, mode: talk, loop: true)`                    | 删除 loop，提供 speaker 和至少两帧                 | 动态模式自行控制播放           |
| `se.stop(*, fade: 300ms)`                                        | `se.stop(effect_id, fade: 300ms)`                  | 淡出停止需要具体 ID            |

## 当前实现边界与校验

本文覆盖当前原生作者语法、完整命令家族、共享字段与对应独立用例，不包含任意 JavaScript、CSS、未知宿主扩展或新的 WebGAL wrapper。时间轴的属性/事件字段与普通命令各有独立清单，不能因为一个字段存在于 `camera.effect` 或 `particle.show` 就将它写进所有结构化命令。

素材驱动的片段需要把示例 ID 换成工程实际资源；含 `goto` / `call` 的片段需要补齐目标 scene。解析成功只能确认作者语法和静态类型，不证明媒体存在、视觉/听觉效果或完整剧情正确。先 `cargo validate` 检查全项目引用与入口控制流，再在 Preview 验收分支、动画、音视频及存档回退。

脚本版本 2 与存档版本不是同一个概念：当前仍是 Save v11，要求 Program fingerprint 匹配；修改脚本后不能假定旧存档继续加载。旧编译内容需按当前 IR schema v6 重新编译。以当前 Kēne 解析器、typed model 和 `dev/docs/language.md` 为最终依据；更新引擎后重新检查这份参考与工程。

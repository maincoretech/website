---
title: Eiyashou v2.0 语法与用例参考
date: 2026-10-08
author: maincore
description: 从第一句对白到分支和演出，附 Eiyashou 2.0 命令参考
priority: 2
category: tech
titleEn: "Eiyashou v2.0 Syntax and Examples"
descriptionEn: "Write your first line of dialogue, add choices and stage directions, and look up Eiyashou 2.0 commands."
---

要让 Kēne 跑一段故事，先从一行对白开始。能跑起来以后，再加人物、分支、镜头和声音。这篇前半段按做一幕戏的顺序给例子，后半段留作命令和参数参考。Eiyashou 剧本是 UTF-8 的 `.shou` 文件。

下面的例子用的是 **2026-10-08 的 Kēne 0.13.1 / Eiyashou 2.0**。工程可写 `script.version: 2`，省略时也按 2 处理。显式填旧版本会报错，已经合并的旧命令也没有别名。看到 `room` 或 `rin_smile` 时，先去资源清单登记自己的素材，再把例子里的 ID 换成你的。

## 第一个工程

先建一个最小工程。下面的路径都从工程目录算起，剧本文件保存为 UTF-8。

```text
my-story/
├── config.yaml
├── assets.yaml
├── characters.yaml
└── scripts/
    └── start.shou
```

入口场景先叫 `start`，在 `config.yaml` 里指定它。

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

暂时只跑对白，`assets.yaml` 写 `{}`，`characters.yaml` 写 `characters: {}`。最后新建 `scripts/start.shou`，放进这段。

```shou
scene start {
  "雨停了。",
  "从这里开始写你的故事。",
  story.end()
}
```

在 Kēne 仓库根目录运行 `cargo validate /path/to/my-story`，再用 `cargo dev /path/to/my-story` 看它能不能跑。这里 `scene start` 的名字要和 `script.entry` 对上。同一个场景里的语句用逗号分开。

## 资源与人物

要让场景有画面和声音，先把文件放进工程，再在 `assets.yaml` 里给它们起 ID。下面清单左边的键就是剧本里写的名字。正式素材用 WebP 图像和 Ogg Opus 音频。

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
luts:
  warm: assets/warm-lut.webp
```

人物的显示姓名和颜色放在 `characters.yaml` 里。这里先登记一个说话者。

```yaml
characters:
  rin:
    name: 凛
    color: '#BAEBFF'
    avatar: rin_smile
    expressions:
      smile: [rin_smile]
      blink: [rin_smile, rin_sad, rin_smile]
```

运行时显示对白时会读 `name` 和 `color`。`avatar` 和 `expressions` 引用 `figures` 里的 ID，给 Editor 当人物素材预设。想让头像或表情真的出现在游戏里，还要在剧本里写对应命令。多帧表情按清单的顺序排列，播放时用后面的 `sprite.sequence`。

`particles` 清单里登记的是纹理。使用 `particle.show` 时，第一个参数给实例起名，第二个选粒子预设。下面各段可以独立放进自己的 `scene ... { ... }` 试，记得补齐需要的资源和变量。`rin_*` 匹配的是立绘槽位的 ID 前缀。

## 基础语法

一个 `.shou` 里可以有多个 `scene id { ... }`，Loader 会递归读取 `scripts/**/*.shou`。每个 scene 在工程内用唯一的 ID。剧本从 `script.entry` 指定的 scene 开始，所以文件想怎么分、入口文件叫什么都可以，也不用写 `import`。

一行可以写一句，也可以写几句，语句之间用逗号，最后一个逗号可省。`//` 写行注释，`/* ... */` 写块注释。调用命令时位置参数在前，后面才是 `name: value` 形式的命名参数。写错字段名或重复传参会报错。

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

变量用 `let` 起名，每个名字在工程里只声明一次。重走那句 `let` 时，已经初始化的值会继续保留。变量可用 `bool`、`int`、`float`、`string`，也可以是同一种元素的列表。要从空列表开始，用 `list(bool)`、`list(int)`、`list(float)` 或 `list(string)`。

普通字符串用双引号，支持 `\"`、`\\`、`\n`、`\r`、`\t` 这些转义。插值留给对白等支持的文字位置，普通命令参数和变量值里的字符串不解析插值。

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

控制流用 `if / else if / else`、`loop / break`、`choice` 和 `goto / call / return`。语言没有 `while`、`for`、`continue`，也没有 `++` 或 `--`。`break` 只离开最近一层循环。赋值可以用 `=`、`+=`、`-=`、`*=`、`/=` 和 `%=`。想改列表就单写一条 `append`、`remove`、`clear`、`insert` 或 `pop`，其中 `pop` 要把结果写入已经声明的变量，用 `into` 指定。

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

`choice` 可以省去提示，直接写 `choice { "选项": goto(next_scene) }`。`when` 为 false 的选项会藏起来，因此运行到选择时至少得剩一个可见项。想去子场景做点事再回来，用 `call` 和 `return`。只想直接换场景，用 `goto`。循环里要有等待或可以退出的路径。

## 对白与文字

对白前面写人物 ID 加冒号。直接写字符串就是旁白。对白后可以跟语音资源 ID，再写尾部选项。`return` 和 `break` 碰到这里也照样按控制语句执行。在句子里写 `[wait=500]`，打字打到这里就停半秒。`${...}` 里可以放 Eiyashou 表达式。

```shou
let trust = 2,
background(room),
sprite(rin_stage, rin_smile, position: right),
@arrival rin: "你来了。[wait=500]正好有事要说。", rin_hello, volume: 0.8,
"当前信任：${trust}",
rin: { "先看这里。", "然后再决定。" }
```

一句话的尾部有四个选项。`volume` 调语音音量，范围 0–1，默认 1。`concat` 拼到前一句，`auto` 让这一句自动继续，`inherit_speaker` 沿用前一句的说话人，三项默认都关闭。全局自动播放另外用 `playback.auto`。

```shou
rin: "我想说……", auto: true,
"其实很高兴见到你。", concat: true, inherit_speaker: true
```

要换文字的呈现方式、显示状态或段落动画，可以从这几条试起。

```shou
text.box(visible: true, auto: false),
text.style(cinematic),
text.presentation(paragraph),
text.paragraph.style("opening", typewriter_speed: 0.03, reveal_duration: 300ms, reveal_effect: smooth_rise, reveal_distance: 12),
"这段以段落样式出现。",
text.presentation(dialogue),
text.box(visible: false, auto: false)
```

想给一句对白标个名字，可以在前面加 `@arrival`。对白、旁白和选择项都能标 ID，工程内不能重名。要让文字退回一部分，用 `text.retract`。`keep` 必须是执行时那句原文的前缀。`source` 留空就用当前对白，`keep` 留空就退掉整句，退完还会等玩家继续。

```shou
rin: "我完全不在乎。",
text.retract(source: "我完全不在乎。", keep: "我"),
rin: "我……其实很在乎。",
wait.advance()
```

如果想把开场字幕放进舞台，或把一行字单独浮在画面上，用下面的命令。

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

`text.float.hide()` 省略 ID 就隐藏当前浮字，持续显示的浮字需要自己关。`wait(300ms)` 等一段固定时间，`wait.advance()` 要等玩家操作。

### 字符串内的富文本与停顿

富文本直接写在字符串里。`[文字](参数)` 中的文字照常一个字一个字出现，参数本身不占字数。这里的标记不支持嵌套，写法按下表来。

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

样式参数用逗号或分号分开。混合样式里要有 `key=value`，如 `color=#ffffff,bold,italic`。没有样式键的参数文本会按读音处理，未知样式键会被渲染器忽略。把 `[wait time="250"]` 写进脚本字符串时，记得转义里面那对引号。

## 变量、分支和场景流转

拿到某个道具以后才给玩家看新选项，可以先用布尔变量记状态，再用 `if` 或 `when` 读取它。条件要算出布尔值。`/` 是实数除法，`%` 只接整数。支持插值的文字可以放纯表达式，列表需要先转换成合适的值。

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

例如从教室进走廊，这一章就交给了走廊场景，可以用 `goto`。如果只是进一个子场景处理完再回来，用 `call`，等遇到 `return` 或子场景走完就回到调用处。普通入口走到末尾不会自动跑下一个文件，章节尾自己写 `goto(下一章)`，到结局时写 `story.end()`。把这些 scene 拆到不同文件里也一样。

`choice` 里 `when` 为 false 的选项会隐藏。都被隐藏时会报运行时错误。选项块 `{}` 留空，选完会接着跑后面的语句。

想记背包、线索或玩家选过的东西时，可以用列表和循环。

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

`pop` 省略索引也能用。列表空了或索引越界，目标变量原来的值还在。写循环时要留能等待或退出的路径，否则会报错。

## 背景、立绘和焦点

一幕戏通常先用 `background` 放好背景，再用 `sprite` 给人物放一个立绘槽。槽已经存在、只是想换图或改布局时，用 `sprite.update`。所有坐标按 1920×1080 的设计空间来写，时间单位可用 `ms` 或 `s`。更新时省略的字段继续用原值。

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

`position: right(x: 500, y: -20)` 括号里的 `x/y` 是锚点偏移，写在最外层的 `x/y` 是变换偏移。布局也用 `layout: viewport(height: 0.85)` 或 `layout: scene(...)` 这类分组写法，后面有完整表格。

只传 `sprite.update(id, asset)` 就只换图，位置、布局和缩放会留下来，找不到这个槽时跳过。需要重设时明确写 `position: center, layout: natural, scale: 1`。`hide(rin_*)` 按槽位前缀隐藏，`hide(*)` 全部隐藏。希望过渡开始后剧本立刻往下走，写 `blocking: false`。

需要让人物动起来时，可以挑预设、自己写关键帧，也可以按状态切换图片。几种写法放在一起看。

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

定帧率的序列默认 12 FPS，默认只播一遍。想单独控制每帧时长，就省略 `fps`，给每个 `frame` 都写 `duration`。同一序列选一种计时方式。

多人对话时，可以把当前说话的人提亮或放大。`characters` 列出舞台立绘或角色的 ID。例子里立绘 ID 和人物清单的键都叫 `rin`，设好以后就能自动跟着对白走，旁白则用 `narration` 的规则。

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

`inherit_speaker` 或没有角色的 `concat` 会沿用上一句的焦点。只想临时改下一句的焦点，可以先写 `sprite.focus(...)`。`objects.yaml` 里的运行时别名由 Loader 处理。

### 眨眼与说话部件

眼睛和嘴都是普通 sprite，位置、布局、层级和变换照常写。

```shou
sprite(eyes, rin_smile),
sprite.sequence(eyes, mode: blink, interval: 3s, fps: 10) {
  frame(rin_smile), frame(rin_sad), frame(rin_smile)
},
sprite(mouth, rin_neutral),
sprite.sequence(mouth, mode: talk, speaker: "rin", fps: 12) {
  frame(rin_neutral), frame(rin_smile)
},
rin: "说话时播放嘴部帧。"
```

做正式素材时，把示例里的整张图换成清单里登记好的透明眼睛和嘴部图。两种动态模式都至少两帧，第一帧用来停着时显示。眨眼的 `interval` 默认 3s，必须大于 0，`blink` 不接 `speaker`。说话的 `speaker` 写字符串，角色 ID `"rin"` 或显示姓名 `"凛"` 都行，`talk` 不接 `interval`。

Loader 会把已登记的角色 ID 换成显示姓名，运行时拿它匹配对白。口部序列跟着文字揭示，文字出完就回第一帧。动态模式都不能写 `loop`，可以用统一的逐帧 `duration` 代替 `fps`。换图或隐藏时会清掉原序列。

### 立绘环境光照

立绘默认会跟一点背景色调。单张图想关掉，就写 `sprite(rin, rin_smile, light: false)`，再开用 `sprite.transform(rin, light: true)`。更新时省略 `light` 会沿用原值。原生 keine 工程的 `layout.environment_light` 可设 0–1，默认 1，写 0 就全局关闭。

```yaml
layout:
  environment_light: 0.8
```

这个效果从背景原图取色，只轻轻染到普通 alpha 立绘。头像、文字、UI 和非 alpha 混合层保持原样。背景取不到色时用中性白，人物聚焦和手工滤镜照常生效。

## 镜头、后期和遮罩

想在镜头推近的同时把画面调暗，可以在一条 `camera.move` 里写变换和后期。目标可选 `scene`、`characters`、`all` 或 `none`。如果只想让某些数值随时间变化，就把字段名放进 `tween`。省略 `tween` 使用整条命令的默认补间，写 `[]` 则立即应用。

```shou
camera.move(scene, x: 120, scale_x: 1.05, blur_amount: 2, tween: [x, blur_amount], duration: 1s),
camera.shake(all, amplitude: 8, frequency: 12, amplitude_randomness: 0.3, frequency_randomness: 0.2, duration: 300ms),
camera.effect(scene, bloom_intensity: 0.4, lut_preset: "warm", lut_intensity: 0.8, duration: 300ms),
camera.effect(scene, focal_distance: none, tween: [], duration: 300ms),
camera.bind(rin_stage, distance: 1.5),
camera.unbind(rin_stage, distance: 1.5)
```

镜面破碎和速度线也能用 `camera.effect` 写。它与 `camera.move` 共用后期字段，只提交要改的值即可。`focal_distance`、`lut_preset` 可用 `none` 清掉。同时改几个效果仍算一次 Action。

```shou
camera.effect(all, speed_lines_intensity: 0.6, speed_lines_radial: true),
camera.effect(all, mirror_shatter_intensity: 0.2, mirror_shatter_seed: 1),
camera.move(all, x: 20, shake: shake(amplitude: 4, frequency: 2),
  tween: [x, shake_amplitude, shake_frequency], duration: 1s),
camera.reset(all, duration: 300ms, easing: ease_out, blocking: true)
```

在命令里嵌套 `shake` 时，省略震动时长就沿用外层 `duration`。振幅、频率和时长都要能确定。如果已经在震动，`shake_amplitude` / `shake_frequency` 会从当前值补间，频率变化也会连续累计相位。第一次震动会直接用指定的振幅和频率，时长表示要震多久。

`camera.reset` 会恢复目标镜头和全部特效，立刻停止震动，视差和镜头绑定则继续保留。省略时长就立即恢复，阻塞只在整组末尾等一次。

### 时长、阻塞与关闭效果

给 `camera.move` 或 `camera.effect` 写 `duration`，意思是用多长时间走到目标。到达后仍会保留那个值。省略时长或写 `0ms` 就立刻生效。

用 `blocking: false` 可以让剧本继续，下一条同一镜头的命令也可能把还在跑的补间换掉。需要先淡入再淡出，可以等第一条完成、插一条 `wait`，或把两段都写进时间轴。

```shou
camera.effect(scene, bloom_intensity: 0.6, duration: 500ms, blocking: true),
wait(1s),
camera.effect(scene, bloom_intensity: 0, duration: 500ms, blocking: true)
```

`tween` 只对传进来并且列出的数值做补间，其他字段立即应用。LUT、色调预设和布尔开关都是离散值。渐渐关闭连续效果时，把强度补间到 0 就行。

`lut_preset: "warm"` 用的是 `assets.yaml` 里的 `luts.warm`，还得给非零 `lut_intensity`。着色器读取 256×16 的 16³ LUT 横向图集。R 沿格内横轴，G 沿纵轴，B 按从左到右的 16 个切片排。

遮罩可以只盖某些立绘，也可以盖整个舞台。只指定部分对象时，`targets` 写的是 ID 列表。

```shou
stage.mask.show(iris, mode: clip, plane: topmost, scope: selected, targets: [rin_stage], shape: ellipse, center_x: 50, center_y: 45, opacity: 0.7, color: rgba(1, 0, 0, 0.8), duration: 300ms),
stage.mask.hide(iris, duration: 200ms, blocking: false)
```

## 时间轴

如果角色移动到一半才要让镜头推近、声音响起，可以把它们写进同一个 `stage.animate`。`track` 选目标和属性，`key` 填一个时间和值，切场景、声音和粒子等用事件触发。先把例子里的 `room`、`roof`、`rin_smile`、`snow_texture`、`theme` 登记到资源清单。

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

时间轴内的 `event.scene` 设置的是舞台上的场景层。脚本跳转还是走 `scene rooftop_view { ... }` 那套流程。整段怎么播由 `repeat`、`infinite`、`playback_rate` 和 `blocking` 控制，每个关键帧还可以给自己的 `easing`。

## 音效、视频、粒子

一声门响、持续的雨声都用 `se`。雨声需要写 `loop: true` 并给实例一个 `id`，旧的 `se.loop` 已合并。音乐用 `bgm`，要停止对应播放可写 `none`。视频默认全屏，想混在场景里播时用 `mixed`。

```shou
bgm(theme, volume: 0.7, fade: 500ms, loop: true),
se(bell, id: bell_once, volume: 0.8, fade: 100ms, fade_out: 200ms),
se(rain, id: rain_loop, loop: true, volume: 0.4, fade: 200ms),
se.stop(bell_once, fade: 100ms),
se.stop(rain_loop, fade: 300ms),
vocal.play(rin_hello, volume: 0.8),
vocal.stop(),
video.play(op, opening, loop: false, muted: false, alpha: 1, skippable: true, wait: true, mode: fullscreen),
video.stop(op, fade: 300ms),
bgm(none, fade: 500ms)
```

`video(opening)` 是全屏、播一遍、等结束的简写。`se` 默认只播一次，就算给了 `id` 也是如此。用 `se.stop(id)` 停一项声音。`se.stop(*, fade: 300ms)` 和 `se(none, fade: 300ms)` 淡出所有音效，写 `se(none, id: rain_loop, fade: 300ms)` 则只停那场雨。省略 `fade` 或写 `0ms` 会立即停。`video.stop(*)` 停全部视频，粒子可以按实例关，也可以清空图层。

```shou
video(opening, skippable: true),
se(none, id: rain_loop, fade: 300ms),
se(none, fade: 300ms)
```

```shou
particle.show(snow, LIGHT_SNOW, texture: snow_texture, count: 120, wind: -4,
  fade_in: 200ms, size: 12, speed: 100, alpha: 0.7, spin: 20, drift: 10,
  drag: 0.2, color: rgba(1, 0.95, 0.9, 1)),
particle.hide(snow, duration: 300ms),
particle.layers.clear()
```

### 音效包络与替换

声音开始命令里的 `fade` 是淡入，停止命令里的是淡出。等素材加载和暂停的时间都不算进淡入。单次音效的 `fade_out` 从自然末尾往前算，声音还是播到结尾。淡出比声音还长时会覆盖全段。正式 Opus 有可用的时长元数据，开发用的兼容解码如果拿不到时长，会提示并沿用原播放。

`fade_out` 用在会自然结束的单次 `se`，循环声要在停止时淡出。用同一个 ID 换一段循环音效时，先等新的声音能播，再按新命令的 `fade` 交叉淡变。暂停期间换音效会先留着旧声，显式停止则把还在等的实例一起清掉。同一帧内先停再播时，仍照剧本里写的顺序执行。

```shou
se(rain, id: ambience, loop: true, volume: 0.3, fade: 1s),
wait(2s),
se(rain, id: ambience, loop: true, volume: 0.6, fade: 500ms),
wait(1s),
se.stop(*, fade: 1s),
se(bell, fade_out: 200ms)
```

## 输入、界面和加载

想请玩家输入名字或数字，先声明一个变量来接结果。输入类型是 `string`、`number` 或 `bool`，下面各写一个例子。

```shou
let player_name = "",
let player_age = 0,
let agreed = false,
input.request(player_name, title: "你的名字", confirm_text: "确定"),
input.request(player_age, type: number, title: "年龄", min_value: 0, max_value: 120, step: 1),
input.request(agreed, type: bool, title: "同意吗？", true_text: "同意", false_text: "再想想")
```

要调出游戏自己的界面，可以选 `title`、`save`、`load`、`settings`、`history`、`gallery` 或 `input` 槽位。要让确认框的结果进入分支，先声明一个变量再传给它。

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

只需通知玩家时，`ui.message` 也可用 `alert`。图和音乐的画廊解锁分别写 `cg` 和 `bgm`。知道下一幕要用到某个资源，也可以提前告诉加载器。

```shou
assets.loading(mode: manual, lookahead: 5, blocking: true) {
  resource(room, kind: background),
  resource(rin_smile, kind: figure)
}
```

## 命令参考：流程与文字

查表时，第一列是最小写法或常见用法，第三列补充其余命名参数。这些表以本文版本的 v2.0 解析器为准。位置参数按示例顺序写，命名参数通常可省，必填项会注明。带 `{ ... }` 的命令至少写一个相应子项。

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

`text.style` 自带 `default`、`cinematic`、`"cinematic-centered"`、`literary`、`sharp` 和 `handwritten`。带连字符时记得加引号。其他 ID 可以留给自定义样式，实际有没有这个样式得看使用的运行宿主。

段落的 `reveal_effect` 可选 `instant`、`smooth_rise`、`classic`、`smooth_drop`、`slide_left`、`slide_right`、`pop`、`flip`、`swing`、`blur`。至少填一个 `reveal_*` 字段，才会创建揭示动画配置。`typewriter_speed` 最小为 0。

`text.float` 默认放在设计空间中心 `(960, 540)`，默认字号是 48，字号必须为正。想让它常驻，可以在显示时写 `blocking: false`，然后写 `text.float.configure(infinite: true)`，等不需要时再用 `text.float.hide()`。

### 流程与列表

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

`pop` 要先声明接收结果的变量。列表为空或索引越界时，保留变量原值。`choice` 的选项块跑完后接着执行后面的语句，`when` 和前置的 `@id` 都可省。

## 命令参考：背景与人物

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

创建时可用 `x`、`y`、`alpha`、`scale`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height` 设初始变换，与后面的 transform 同名。`scale` 大于 0，会同时设两条轴，所以要和 `scale_x` / `scale_y` 二选一。

创建 `background` 时可以给变换，颜色要通过 `background.transform` 改。两者都不接 `light`。镜头和关键帧使用各轴字段。

`background`、`sprite` 和 `hide` 默认 `blocking: true`，过渡默认 `instant`。`background(none)` 清掉背景时省去初始变换。新建 `sprite` 时，默认值为 `position: center`、`z: 0`、`blend: alpha`、`light: true`。混合方式可用 `alpha`、`add`、`multiply` 或 `screen`，层级 `z` 为 32 位整数。`move` 接受 `left`、`center`、`right`，也接受它们带括号的形式。省略时长时立刻移动。

`sprite.transform` 和 `background.transform` 至少写一个变换或滤镜字段。`duration`、`easing` 作用于变换。`brightness`、`contrast`、`saturation`、`light` 立即应用，只设颜色或光照时不能给非零 `duration`。这里的 `x` 和 `y` 会直接设定偏移。

`transition` 可以直接用 `instant`，也可以从这些带时长的过渡里选 `fade(300ms)`、`slide_from_left(300ms)`、`slide_from_right(300ms)`、`crossfade(300ms)`、`wipe(300ms)`、`dissolve(300ms)`。`easing` 可用 `linear`、`ease_in`、`ease_out`、`ease_in_out`、`in_out_quad`、`out_cubic`、`in_out_cubic`、`out_back`、`out_bounce`。

`sprite.animate` 和 `sprite.transition` 的内建预设包括 `enter`、`exit`、`shake`、`enter_from_bottom`、`enter_from_left`、`enter_from_right`、`move_front_and_back`、`blur`、`old_film`、`dot_film`、`reflection_film`、`glitch_film`、`rgb_film`、`godray_film`、`remove_film`、`shockwave_in`、`shockwave_out`。自定义 ID 用引号包起来。`sprite.transition` 要清掉进出预设时，给 `enter` 或 `exit` 填 `none`。

`frame` 必须给 `duration`，可以再填 `easing` 以及 `x`、`y`、`alpha`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height`。一帧里只填时间，就会在这段时间里保持原状态。`sprite.focus.configure` 的三组 `style(...)` 各自可设 `scale`、`brightness`、`saturation`、`contrast`、`blur`、`alpha`。

| 序列模式      | 参数和计时                                                            | 用例                     |
| ------------- | --------------------------------------------------------------------- | ------------------------ |
| 普通序列      | 不写 `mode`；`fps` 默认 12 且必须为正，`loop` 默认 false              | 循环雨滴、一次切图动画   |
| 逐帧时长      | 不写 `fps`，每帧都写 `duration`，不可只给部分帧                       | 不规则节奏、停顿帧       |
| `mode: blink` | 至少两帧；`interval` 默认 3s 且必须为正；拒绝 `loop`、`speaker`       | 周期眨眼                 |
| `mode: talk`  | 至少两帧；必填 `speaker: "角色ID或显示姓名"`；拒绝 `loop`、`interval` | 随角色逐字显示切换嘴部帧 |

动态序列用 FPS 或逐帧时长计时，选一种就行。先指定 `mode`，才能写这个模式对应的 `interval` 或 `speaker`。

### 四种立绘布局

`sprite` 和 `sprite.update` 用同一套分组布局。新建立绘时省略布局会用 `natural`，更新时省略就保留原布局。位置和布局写成组，旧的扁平字段需要先改写。

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

`scene` 的 `fit` 支持 `by_height`、`by_width`、`cover`、`contain`、`stretch`、`center`。`sprite.update` 的缩放只写整体 `scale`。要单独改一条轴或顶层 `x/y`，用 `sprite.transform`。`scene.parallax` 的 `scale` 也须大于 0。

## 命令参考：镜头与舞台

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

镜头目标从 `scene`、`characters`、`all`、`none` 中选。可用的九个变换字段是 `x`、`y`、`alpha`、`scale_x`、`scale_y`、`rotation`、`blur`、`width`、`height`。`camera.move` 至少带一个变换、后期或 `shake` 字段。镜面破碎和速度线可以只提交要改的字段。

`tween: [x, blur_amount]` 会对传入的这两个数值做补间。省略列表时按整条命令补间，`tween: []` 立即应用且不额外阻塞。未知或重复的通道、离散字段都会报错。通道名与数值变换或后期字段对应。嵌套震动用 `shake_amplitude`、`shake_frequency`。`lut_preset`、`color_tone` 和布尔开关直接应用。

`shake: shake(...)` 可给 `amplitude`、`frequency`、`duration`、`axis`、`falloff`、`amplitude_randomness` 和 `frequency_randomness`。阻塞选项写在外层镜头命令。

`axis` 可用 `x`、`y` 或 `both`，`falloff` 可用 `linear` 或 `exponential`。两个 `*_randomness` 在 0–1 之间，`amplitude` 最小为 0。时间轴事件 `event.camera.shake` 也用这些轴、衰减和随机量，`frequency` 要大于 0。

### `camera.effect` 字段

这张表里的后期字段可以写进 `camera.effect`，也能与变换一起写进 `camera.move`。只填要改的值。除了 `focal_distance`、`lut_preset`、`color_tone` 以及三个布尔字段 `godray_parallel`、`speed_lines_radial`、`speed_lines_region_ellipse`，其余都填数值。`focal_distance` 和 `lut_preset` 可以用 `none` 清除，色调选 `none`、`grayscale` 或 `sepia`，布尔值写 `true` 或 `false`。`duration`、`easing`、`blocking` 和 `tween` 见上文的公共控制字段。

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

看到 `center_x/y` 时，要按该特效自己的坐标用法理解。示例的 0.5 和立绘设计空间里的 0.5 像素不是一回事。镜面破碎和速度线可用 `event.camera.patch` 立即设置，时间轴的 `track` 不接受这些通道。

### 舞台遮罩的模式与字段

创建或更新遮罩用 `stage.mask.show(id, ...)`，关闭用 `stage.mask.hide(id, ...)`。`mode` 可选 `overlay` 或 `clip`，`plane` 可选 `behind_scene`、`bottom`、`top` 或 `topmost`。`scope` 可选 `scene`、`characters`、`all` 或 `selected`。选 `selected` 时，把要覆盖的对象写进 `targets: [id, ...]`。

| 类别         | 合法字段与值                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 形状与图像   | `shape: rectangle / rounded_rectangle / ellipse / image`；`image`、`image_channel: alpha / luminance`、`image_fit: stretch / cover / contain` |
| 几何与可见性 | `center_x`、`center_y`、`size_x`、`size_y`、`rotation`、`radius`、`visibility: inside / outside`、`feather`、`opacity`                        |
| 填充         | `fill_mode: solid / gradient / texture`、`color`、`gradient_start`、`gradient_end`、`gradient_direction`                                      |
| 纹理         | `texture`、`texture_fit: stretch / cover / contain`、`texture_blend: normal / multiply / screen / add`、`texture_scale`、`texture_opacity`    |
| 后处理       | `blur`、`vignette_amount`、`vignette_size`、`noise_amount`、`noise_size`、`hue`、`saturation`、`brightness`                                   |
| 播放         | `duration`、`blocking`                                                                                                                        |

颜色用 `rgba(r, g, b, a)`。拿图片做遮罩形状或填充纹理时，`image` 和 `texture` 都引用已经登记的图像 ID，写 `none` 可以清掉对应项。

```shou
stage.mask.show(vignette, mode: overlay, plane: top, scope: all, shape: rectangle, fill_mode: gradient, gradient_start: rgba(0, 0, 0, 0), gradient_end: rgba(0, 0, 0, 1), gradient_direction: 90),
stage.mask.show(portrait_cutout, mode: clip, plane: topmost, scope: selected, targets: [rin_stage], shape: image, image: rin_smile, image_channel: alpha, image_fit: contain, visibility: inside, feather: 10),
stage.mask.show(paper, fill_mode: texture, texture: rin_sad, texture_fit: cover, texture_blend: multiply, texture_scale: 1.2, texture_opacity: 0.6),
stage.mask.hide(vignette, duration: 300ms)
```

### 时间轴子项

写 `stage.animate` 时，要给 `duration`，再加至少一个 `track` 或 `event.*`。`duration` 和 `playback_rate` 必须大于 0，`repeat` 填非负整数。`track(camera | character(id) | scene_layer(id), property, image: ..., muted: ...)` 至少放一个 `key(time: ..., value: ..., easing: ...)`。每个关键帧的 `time` 和数值 `value` 必填。`image` 只用于 `character(id)`。

| 子项                                                   | 必填与可选参数                                                                                                                                        | 用例                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `track(...) { key(...) }`                              | 目标、属性；可选 `image`、`muted`。每个 `key` 必填 `time`、`value`，可选 `easing`                                                                     | 让镜头、立绘或场景层按关键帧变化 |
| `event.camera.shake(...)`                              | 必填 `time`、`amplitude`、`frequency`、`duration`；可选 `amplitude_randomness`、`frequency_randomness`、`axis`、`falloff`                             | 在指定时间震动镜头               |
| `event.camera.patch(...)`                              | 必填 `time` 与至少一个 `camera.effect` 后期字段；可选 `targets`                                                                                       | 在指定时间稀疏修改后期           |
| `event.particle(id, preset, ...)`                      | 必填 `time`、`duration`；可选 `texture`、`count`、`wind`、`gravity`、`fade_in`、`fade_out`                                                            | 定时启动并结束粒子               |
| `event.scene(scene_id, ...) { layer(id, asset, ...) }` | 必填 `time`；可选 `transition`、`reset_camera`、`fit`、`x`、`y`、`anchor_x`、`anchor_y`、成对的 `width` / `height`；`layer` 可用 `distance`、`x`、`y` | 替换舞台场景与层，不改变脚本流程 |
| `event.audio(id, bgm / effect / vocal, asset, ...)`    | 必填 `time`；可选 `volume`、`loop`、`duration`、`fade_in`、`fade_out`                                                                                 | 定时播放音乐、音效或语音         |

`event.scene` 的 `fit` 支持 `by_height`、`by_width`、`cover`、`contain`、`stretch` 和 `center`，可以放多个 `layer`。别的事件不带子项。`event.camera.patch` 可直接用上表的后期字段，时长、缓动、阻塞与补间不在事件里写。

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

给 `track` 选属性时看下表。某些属性只对对应的目标有意义。

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

## 命令参考：音视频与粒子

| 写法                                       | 用例                                | 命名参数与约束                                                                                               |
| ------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bgm(theme)` / `bgm(none)`                 | 播放、换曲或停止 BGM                | `volume`、`fade`、`loop`；默认音量 1、淡变 0ms、循环 true                                                    |
| `se(bell)` / `se(none)`                    | 播放单次音效 / 停止音效             | `volume`、`id`、`loop`、`fade`、`fade_out`；默认音量 1、非循环、淡变 0ms；`none` 可按 ID 或全局停止          |
| `se(rain, id: rain_loop, loop: true)`      | 开始带实例 ID 的循环音效            | `volume`、`fade`；必须有 `id`，不能用 `none`，不能提供 `fade_out`                                            |
| `se.stop(rain_loop)` / `se.stop(*)`        | 按 ID 停止 / 停止全部单次与循环音效 | `fade`；全局停止也接受淡出                                                                                   |
| `vocal.play(rin_hello)` / `vocal.stop()`   | 播放或停止语音                      | `volume` 仅用于 `vocal.play`                                                                                 |
| `video(opening)`                           | 全屏非循环视频，等待播放结束或跳过  | `skippable`；不接受 `loop`、`wait`                                                                           |
| `video.play(op, opening)`                  | 控制视频实例                        | `loop`、`muted`、`alpha`、`skippable`、`wait`、`mode`                                                        |
| `video.stop(op)` / `video.stop(*)`         | 停止单个或全部视频                  | `fade`                                                                                                       |
| `particle.show(snow, LIGHT_SNOW)`          | 显示粒子实例与预设                  | `texture`、`count`、`wind`、`gravity`、`fade_in`、`size`、`speed`、`alpha`、`spin`、`drift`、`drag`、`color` |
| `particle.hide(snow)` / `particle.hide(*)` | 隐藏单个或全部粒子                  | `duration`                                                                                                   |
| `particle.layers.clear()`                  | 清空粒子图层                        | 无                                                                                                           |

音量和 `video.play` 的 `alpha` 都在 0–1 之间。视频默认 `fullscreen`，也可选 `mixed`。默认值是 `loop: false`、`muted: false`、`alpha: 1`、`skippable: true`、`wait: true`。`wait` 决定要不要等视频播完，`skippable` 决定玩家能不能跳过。

`particle.show` 的 `count` 能填 0–65535 的整数。写 0 用预设密度，实际渲染时每个发射器最多 256 个粒子。`texture` 从 `assets.yaml` 的 `particles` 里选。明确命名的内建预设有 `LIGHT_SNOW`、`MODERATE_SNOW`、`HEAVY_SNOW`、`LIGHT_RAIN`、`MODERATE_RAIN`、`HEAVY_RAIN`、`FIREFLY` 和 `FALLEN_LEAVES`。预设名称和纹理 ID 分别传。其他名字按雪、雨、萤火或叶片等关键词匹配，没匹配上就用环境粒子。

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

省略字段时沿用预设，大小和速度也会保留远近层的差异。雨雪默认有低频阵风。指定 `wind` 后改用固定横向速度，关掉阵风和风速散布。只想垂直落下就写 `wind: 0`。雪用 `drift` 调摆动，配合旋转和翻面区分远近。雨丝方向跟随实际速度。雨雪预设把重力和阻力设为 0，想让它加速或减速，再写 `gravity` 或 `drag`。这些字段用在 `particle.show`，时间轴里的 `event.particle` 仍按自己的表填。

```shou
se.stop(*, fade: 300ms),
video.play(op_overlay, opening, loop: true, muted: true, alpha: 0.5, skippable: false, wait: false, mode: mixed),
video.stop(*, fade: 200ms),
particle.show(snow_front, snow, texture: snow_texture, count: 80, wind: -4, gravity: 2, fade_in: 200ms),
particle.hide(*, duration: 300ms)
```

## 命令参考：输入、界面与资源

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

`input.request` 最简单的写法只传变量名，类型默认 `string`，其他值用引擎默认值。可选项有 `type`、`title`、`description`、`placeholder`、`confirm_text`、`required_text`、`required`、`min_length`、`max_length`、`min_value`、`max_value`、`step`、`true_text`、`false_text`。根据 `string`、`number` 或 `bool` 选择对应边界，`step` 要大于 0，下界不能大于上界。先用 `let` 声明接收结果的变量。`ui.message` 的第一参数为 `alert` 或 `confirm`，`result` 也指向已声明变量。

`ui.show` 和 `ui.hide` 能操作 `title`、`save`、`load`、`settings`、`history`、`gallery`、`input`。`assets.loading` 的 `mode` 可用 `auto` 或 `manual`，`lookahead` 填 0–65535 的整数。`resource` 的 `kind` 只接 `background` 或 `figure`。`screen.curtain` 颜色写 `rgba(r, g, b, a)`，时长照常用 `ms` 或 `s`。

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

`assets.yaml` 按用途分组，组名是 `backgrounds`、`figures`、`voices`、`bgm`、`se`、`videos`、`particles`、`luts`。每项可以直接写工程相对路径，也可以写 `{ path: ..., tags: [...] }`。`characters.yaml` 里每人必填 `name`，还可写 `color`（`#RRGGBB`）、`avatar` 和 `expressions`。人物、素材和对象各有自己的 ID，剧本中要引用图片时写清单的键。

### Editor 中的人物与源码

在 Editor 的 Characters 里，可以从资源选择或批量导入头像和表情，再给人物维护固定 ID、显示姓名和颜色。选好插入位置，Show 会写入 `sprite`。Change、Blink、Talk 要操作已经放上舞台的实例，先 Show，再用同一舞台 ID。Insert avatar 则显式插入头像命令。按钮生成的动态序列默认 10 fps、Blink 间隔默认 3s，解析器处理手写脚本时的默认帧率仍为 12 fps。

换预设时，已经写过的剧本保持原样。图只留在预设里、从没在剧本用过，也不会自动进入发行白名单。人物编辑可以撤销，用 Ctrl+S 保存。界面定位不到的非标准 YAML 可以直接在源文件里改。

Text、Blocks 和 Inspector 都编辑同一份源文件。弹出补全菜单后，用方向键选、Enter 接受、Esc 关。也可按 Ctrl+Space 或 Alt+/ 手动打开，macOS 为 Option+/。灰色行内补全用 Right 接受，IME 先确认文字才会查补全结果。编辑完可以按保存、校验、Preview、关掉重开走一遍，核对刚才的改动确实写进去了。

新原生工程通常用不到 `objects.yaml`。从别的引擎迁移，确实需要把作者 ID 映射回旧对象 ID 时，再在 `config.yaml` 的 `script` 下加 `objects: objects.yaml`，然后填写映射。

```yaml
objects:
  rin_stage: original_character
prefixes:
  rin_: 'character-layer:'
```

`objects` 改的是单个对象 ID，`prefixes` 处理 `hide(rin_*)` 一类前缀。加载时解析一次，未登记的 ID 照旧。映射键用裸 ID，目标必填且在同一张表里不能重复。资源 ID、变量名、场景名和对白文本都按原值读。

## 从旧写法更新到 v2

从 v1 升上来时，这张表需要逐项改剧本源码。单改版本号，旧写法依然会报错。

| 旧写法                                                        | v2 写法                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `transform_x: 20`、`transform_scale_x: 1.1`                   | 创建时直接写 `x: 20`、`scale_x: 1.1`                                 |
| `sprite.offset(id, x: 20, duration: 300ms)`                   | `sprite.transform(id, x: 20, duration: 300ms)`                       |
| `sprite.filter(id, brightness: 0.7)`                          | `sprite.transform(id, brightness: 0.7)`                              |
| `sprite.sequence.timed(id) { frame(asset, duration: 100ms) }` | `sprite.sequence(id) { frame(asset, duration: 100ms) }`              |
| `se.loop(rain_loop, rain, fade: 200ms)`                       | `se(rain, id: rain_loop, loop: true, fade: 200ms)`                   |
| `camera.effect.v2(all, ...)`                                  | `camera.effect(all, ...)`；只写要修改的字段                          |
| `input.simple(name, title: "名字", button: "确定")`           | `input.request(name, title: "名字", confirm_text: "确定")`           |
| `position: right, anchor_offset: 500, y: 20`                  | `position: right(x: 500, y: 20)`；顶层 y 现在是变换偏移              |
| `layout: viewport_height, layout_height: 0.85`                | `layout: viewport(height: 0.85)`                                     |
| `layout: scene, layout_fit: cover, ...`                       | `layout: scene(fit: cover, ...)`                                     |
| `layout: composite, layout_canvas_width: ..., ...`            | `layout: composite(canvas: size(...), rect: rect(...), height: ...)` |

### 迁移旧引擎工程

在 Kēne 仓库根目录调用下面的命令。先给原工程路径，再给新的目标目录。

```sh
cargo migrate /path/to/old-project /path/to/new-project
cargo validate /path/to/new-project
cargo dev /path/to/new-project
```

`cargo migrate` 是仓库提供的 publisher-feature alias。它把适配器能够无损表达的非原生作者工程转成 Eiyashou v2。源工程只读，目标要在源目录外、尚未创建，并且父目录已经存在。打过包的工程、原生 Eiyashou 工程和就地 v1→v2 升级都不走这条路径。

迁移会生成 `config.yaml`、`assets.yaml`、`characters.yaml`、`objects.yaml`、`scripts/` 和引用资源副本。剧本按源文件分组并保留控制流，适配器生成的入口或调度可以放在入口脚本。先在临时目录生成并校验，成功后才放到目标。遇到无法无损表达的命令会报错。资源复制后保持原格式，正式发行前再转 WebP 和 Opus，并验证实际媒体。

LetsGal v2 的 `characters.json` 用画布百分比记中心锚点的 `left` 和 `top`。迁移时，水平位置换成 `center(x: ...)`，垂直方向换成 Kēne 自下而上的偏移，再按表情、角色、全局高度的优先级扣掉半高。显示、更新和序列走同一换算，distance 缩放保留中心。v2 非中心锚点会报错。无版本的旧基线继续走旧规则，场景层则按自己的布局换算。

### 常见错误

| 错误写法                                                         | 应改为                                                | 原因                           |
| ---------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------ |
| `return()`                                                       | `return`                                              | 返回是控制语句，不是带括号命令 |
| `let items = []`                                                 | `let items = list(string)`                            | 空列表必须说明元素类型         |
| `if (score > 0 and ready)`                                       | `if ((score > 0) and ready)`                          | 比较和逻辑运算混用时显式分组   |
| `background(none, x: 10)`                                        | `background(none)`                                    | 清背景不能再设置初始变换       |
| `video(opening, loop: true)`                                     | `video.play(op, opening, loop: true)`                 | 简写视频固定非循环             |
| `camera.effect.v2(scene, speed_lines_intensity: 1)`              | `camera.effect(scene, speed_lines_intensity: 1)`      | 旧命令已删除，新命令是稀疏更新 |
| `sprite(id, asset, layout: viewport_height)`                     | `sprite(id, asset, layout: viewport(height: 0.8))`    | 布局采用分组值                 |
| `sprite(id, asset, scale: 1.2, scale_x: 1)`                      | 只选整体 scale 或独立两轴                             | 两种缩放写法不能混用           |
| `sprite.transform(id, brightness: 0.7, duration: 300ms)`         | 去掉 duration，或同时提供要补间的变换                 | 纯颜色/光照更新即时应用        |
| `sprite.sequence(id, fps: 12) { frame(asset, duration: 100ms) }` | 去掉 fps，所有帧写 duration                           | 序列计时不能混用               |
| `sprite.sequence(id, mode: talk, loop: true)`                    | 删除 loop，提供 speaker 和至少两帧                    | 动态模式自行控制播放           |
| `se.loop(effect_id, rain)`                                       | `se(rain, id: effect_id, loop: true)`                 | 旧循环命令已删除               |
| `se(rain, loop: true)`                                           | `se(rain, id: ambience, loop: true)`                  | 循环音效必须有实例 ID          |
| `se(rain, id: ambience, loop: true, fade_out: 1s)`               | 播放时删除 fade_out；用 `se.stop(ambience, fade: 1s)` | 自然尾部包络仅用于单次音效     |
| `se(bell, fade: 200)`                                            | `se(bell, fade: 200ms)`                               | 时长必须有单位且不得为负       |

## 限制与校验

剧本能调用这篇列出的语言能力，任意 JavaScript、CSS、未知宿主扩展和新的 WebGAL wrapper 都在范围外。普通命令和时间轴事件各有自己的参数表，移植 `camera.effect` 或 `particle.show` 的写法时先查对应事件。

复制例子以后，先换成自己的资源 ID，再补齐 `goto`、`call` 指向的场景。用 `cargo validate` 查入口和引用，再到 Preview 试分支、动画、音视频与读档。解析通过之后，实际演出仍值得看一遍。

本文这版使用 Save v11、IR schema v7 和 authoring 协议 v9。存档读取要求 Program fingerprint 一致，改完剧本后旧存档可能打不开，旧 IR 要重新编译。升级引擎时，随所用版本一起查解析器、typed model 和 `dev/docs/language.md`。 [开发与发布指南](/blog/keine-development-and-release)

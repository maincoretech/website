# maincore 官网交互与动效

## 设计依据

- **Google Material 3 Expressive** 将位置、尺寸变化与透明度、颜色等视觉效果分别处理。本站把即时的按压反馈与页面过渡分开，保留小图标、圆形点击区、选中底色和清晰的键盘焦点。[Material 3 Motion](https://m3.material.io/styles/motion/overview/how-it-works)
- **Apple Human Interface Guidelines** 建议动效简短、有目的，并让返回方向与进入方式一致。本站的主栏目是平级页面，导航留在原位，背景标题短暂淡变。旧版阅读外壳内切换文档层级时，缩放围绕同一中心。[Apple Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- **触控与无障碍**参考 Android 的 48 dp 触控目标以及 Apple 对尺寸、间距和减少动态效果的建议。本站的主要图标入口提供 48 CSS px 的操作区域，并保留名称、当前页状态和键盘焦点。启用系统的减少动态效果后，页面直接切换，按压仍有静态状态反馈。[Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps) · [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## 页面衔接

- 桌面窗口达到 840 × 320 CSS px 时，导航切换为左侧 80 px 栏。首页内容最多 960 px，文章阅读区最多 800 px，页脚铺满侧栏右侧。窄窗口使用顶部图标栏，页脚铺满页面。两种布局复用同一组图标链接。选中底色沿导航方向移动并短暂回弹，键盘焦点用浅蓝填色表示。[Material 3 桌面组件](https://m3.material.io/foundations/desktop/components) · [Apple Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- 窗口达到 1080 × 450 CSS px 后，搜索与目录共用独立的右侧栏，文章正文保留自己的阅读宽度。当前标题随滚动高亮。切换文章时搜索框位置固定，目录随文章更新。窄窗口的目录用按钮展开，链接列表浮在正文上方，避免展开时把正文推走。[Material 3 自适应布局](https://m3.material.io/foundations/layout/canonical-examples/overview) · [Material 3 列表](https://m3.material.io/components/lists/overview)
- 搜索复用博客和文档索引，输入后在搜索框下显示匹配结果。`⌘K` / `Ctrl+K` 聚焦搜索，上下键选择结果，`Enter` 打开，`Esc` 收起。[Material 3 搜索应用栏](https://m3.material.io/components/app-bars/)
- works、blog、about 共用居中的栏目布局，内容最多 1088 px。桌面标题在左上角旋转 90°，按边距与窗口高度缩放。窄窗口的横排标题位于搜索框左侧。页脚以 UTC 显示 Vite 构建时间。通用图标使用 Google 的 Material Symbols Outlined SVG，许可随站点发布。[Material Symbols 指南](https://developers.google.com/fonts/docs/material_symbols)

| 操作 | 表现 |
| --- | --- |
| 首页、works、blog、about 及文章之间切换 | 正文就绪即显示，可见区域用 340 ms 渐显。背景标题留在原位，以 160 ms 的透明度过渡衔接。 |
| 旧版外壳内切换文档层级 | 新正文就绪后，阅读面板围绕中心缩放 180 ms。进入从 97% 开始，退出从 103% 开始。 |
| 加载较慢或连续切换 | 等待时页面和导航仍可用。超过 120 ms 时顶部显示加载线。前进和后退由路由恢复滚动位置。 |
| 展开、收起与选项切换 | 位置和图标用 220 ms 的短回弹，透明度用 160 ms 的平滑过渡。展开高度和图表数值单向变化。连续点按时立刻更新状态，收起的浮层立即停止交互。 |
| 启用减少动态效果 | 标题和正文直接更新，加载线保持静止。 |

时长、位移和比例是本站的设计参数。动效在路由内容就绪后开始，按压反馈从按下时开始，链接无需等动画完成。

## 维护位置

- `src/routes/` 保存页面、标题和分享元数据。首页和 blog 首屏加载 `src/lib/posts/` 的 frontmatter，blog 在浏览器空闲时预取推荐文章。其余正文在打开时载入，滚动接近评论区时启动评论组件。
- `src/lib/studio/` 保存共享外壳、图标、文章列表、导航过渡和按压反馈。
- works 卡片和 about 时间轴的专用样式跟随各自路由，作品 SVG 放在 `static/works/`。原有产品详情、文档和下载继续使用现有地址。

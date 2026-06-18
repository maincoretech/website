/**
 * 产品目录
 * 添加新产品只需在对应分类的 items 中追加
 */
export const products = [
  {
    category: 'VN引擎',
    items: [
      {
        name: 'WebGAL_k',
        desc: '桌面端视觉小说引擎。基于 WebGAL + Tauri v2 + hexz',
        link: 'https://github.com/maincoretech/WebGAL_k'
      }
    ]
  },
  {
    category: '工具',
    items: [
      {
        name: 'hexz_k',
        desc: '游戏资源打包工具。CLI + GUI，将目录打包为 hexz 加密归档，支持完整的 hexz 格式规范',
        link: 'https://github.com/maincoretech/hexz_k'
      }
    ]
  }
];

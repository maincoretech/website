/**
 * 产品目录
 * 添加新产品只需在对应分类的 items 中追加
 */
export const products = [
  {
    category: 'VN引擎',
    items: [
      {
        name: 'Kēne',
        desc: '基于 Rust、Bevy 和 wgpu 的原生视觉小说引擎',
        link: 'https://github.com/maincoretech/keine'
      }
    ]
  },
  {
    category: '工具',
    items: [
      {
        name: 'Hakutaku',
        desc: '面向视觉小说的资源格式。支持签名快照、随机访问、流式读取与增量更新',
        link: 'https://github.com/maincoretech/hakutaku'
      }
    ]
  },
  {
    category: 'Archive',
    items: [
      {
        name: 'hexz_k',
        desc: '游戏资源打包工具。CLI + GUI，将目录打包为 hexz 加密归档，支持完整的 hexz 格式规范',
        link: 'https://github.com/maincoretech/hexz_k'
      },
      {
        name: 'WebGAL_k',
        desc: '桌面端视觉小说引擎。基于 WebGAL + Tauri v2 + hexz',
        link: 'https://github.com/maincoretech/WebGAL_k'
      },
      {
        name: 'MSMP',
        desc: 'Maplefall Survival MultiPlayer，曾经运营的公益 Mod 服务器项目',
        link: 'https://archive.kasetry.cn/'
      }
    ]
  }
];

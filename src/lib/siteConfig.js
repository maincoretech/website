/**
 * 站点全局配置文件
 * 修改此文件即可调整站点标题、导航、色调等
 */
export const siteConfig = {
  /** 标语 */
  subtitle: 'games & software',
  /** 域名水印 */
  domain: 'maincore.work',
  /** 页脚 */
  copyright: '© maincore',
  /** 主导航 */
  nav: [
    { label: 'news', href: '/news' },
    { label: 'product', href: '/product' },
    { label: 'blog', href: '/blog' },
    { label: 'about', href: '/about' }
  ],
  /** 侧边栏 */
  sidebarNav: {
    '/': [{ label: 'news', href: '/news' }],
    '/news': [{ label: 'home', href: '/' }],
    '/product': [{ label: 'all_products', href: '/product' }],
    '/blog': [
      { label: 'all_posts', href: '/blog' },
      { label: 'tech', href: '/blog' },
      { label: 'essay', href: '/blog' }
    ],
    '/about': [{ label: 'about_us', href: '/about' }]
  },
  /** 页脚说明 */
  footerNotice: [
    'Built with SvelteKit & MDsveX.',
    'Design inspired by gyan.dev'
  ],
  /** 页面文案 */
  pages: {
    news: { subtitle: '开发进度 & 最新动态', section: 'Latest', intro: '这里是 maincore 的官方站点，我们会在这里发布最新的开发进度和各种稀奇古怪的文章。' },
    blog: { subtitle: '阳台' },
    product: { subtitle: '产品' },
    about: { subtitle: '关于 maincore' }
  }
};

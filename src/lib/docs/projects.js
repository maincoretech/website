// Source paths are relative to the corresponding project repository.
export const projects = [
  { id: 'keine', name: 'Kēne', language: 'zh-Hans', license: 'Defold License 1.0',
    licenseUrl: 'https://github.com/maincoretech/keine/blob/main/LICENSE',
    pages: [
      ['editor', '编辑与预览', 'dev/docs/editor.md'],
      ['language', 'Eiyashou 脚本', 'dev/docs/language.md'],
      ['release', '打包与发行', 'dev/docs/release.md'],
      ['compatibility', '工程迁移', 'dev/docs/compatibility.md'],
      ['android', 'Android', 'dev/docs/android.md'],
      ['architecture', '引擎架构', 'dev/docs/architecture.md'],
      ['testing', '开发与验收', 'dev/docs/testing.md']
    ] },
  { id: 'hakutaku', name: 'Hakutaku', language: 'en', license: 'MIT / Apache-2.0',
    licenseUrl: 'https://github.com/maincoretech/hakutaku#license',
    pages: [
      ['start', '入门与接入', 'README.md'],
      ['format', 'v2 格式', 'docs/FORMAT.md'],
      ['security', '密钥与发行安全', 'docs/SECURITY.md'],
      ['performance', '读取策略与性能', 'docs/PERFORMANCE.md']
    ] }
];
export const docs = projects.flatMap(project => project.pages.map(([slug, title, source], index) => ({
  project: project.id, slug, title, source,
  href: '/docs/' + project.id + (index ? '/' + slug : '')
})));

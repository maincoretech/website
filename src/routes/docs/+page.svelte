<script>
  import { projects, docs } from '$lib/docs/projects.js';
  import { msg } from '$lib/i18n/index.js';
</script>
<svelte:head><title>{$msg('文档')} · maincore</title><meta name="description" content="Kēne 与 Hakutaku 的使用文档、格式说明和开发指南。" /></svelte:head>
<h1 class="site-page-title">{$msg('文档')}</h1>
<div class="entry-list">
  {#each projects as project}
    <a class="entry-link" href={docs.find(d => d.project === project.id).href}>
      <span class="entry-title">{project.name} →</span>
      <p>{$msg(project.id === 'keine' ? '编辑剧本、预览游戏与打包发行。' : '资源打包、引擎接入与 v2 格式。')}</p>
    </a>
  {/each}
</div>

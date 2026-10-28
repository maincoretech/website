<script>
  import { docs, projects } from '$lib/docs/projects.js';
  import { msg } from '$lib/i18n/index.js';
  import TableOfContents from '$lib/site/TableOfContents.svelte';
  import PageMeta from '$lib/site/PageMeta.svelte';
  import sources from '$lib/docs/sources.json';
  let { data } = $props();
  let body = $state();
  const source = $derived(sources[data.doc.project + "/" + data.doc.slug]);
  const chapter = $derived(docs.filter(d => d.project === data.project.id));
  const index = $derived(chapter.findIndex(d => d.slug === data.doc.slug));
</script>
<PageMeta title={data.project.name + ' · ' + $msg(data.doc.title) + ' · maincore'} description={data.project.name + ' — ' + $msg(data.doc.title)} />
<nav class="docs-projects" aria-label={$msg('项目文档')}>
  <a href="/docs">{$msg('文档')}</a>
  {#each projects as project}<a href={`/docs/${project.id}`} aria-current={project.id === data.project.id ? 'true' : undefined}>{project.name}</a>{/each}
</nav>
<div class="docs-layout">
  <aside>
    <nav class="docs-chapters" aria-label={$msg('章节')}>
      {#each chapter as doc}<a href={doc.href} aria-current={doc.slug === data.doc.slug ? 'page' : undefined}>{$msg(doc.title)}</a>{/each}
    </nav>
  </aside>
  <article>
    <div class="docs-meta">
      <span>{data.project.name} {source.version} · {data.project.language === 'en' ? 'English' : '简体中文'}</span>
      <span>{$msg("更新于")} <time datetime={source.updated}>{source.updated}</time></span>
      <a href={`https://github.com/maincoretech/${data.doc.project}/blob/${source.revision}/${data.doc.source}`}>{$msg('查看源文档')} ↗</a>
    </div>
    <TableOfContents {body} routeKey={data.doc.href} />
    <div class="article-prose docs-prose" lang={data.project.language} bind:this={body}><data.Content /></div>
    <footer class="docs-license">{$msg('文档许可')} · <a href={data.project.licenseUrl} rel="license">{data.project.license}</a></footer>
    <nav class="docs-pagination" aria-label={$msg('章节')}>
      {#if index > 0}<a href={chapter[index - 1].href}>← {$msg(chapter[index - 1].title)}</a>{:else}<span></span>{/if}
      {#if index + 1 < chapter.length}<a href={chapter[index + 1].href}>{$msg(chapter[index + 1].title)} →</a>{/if}
    </nav>
  </article>
</div>
<style>
  .docs-projects { display: flex; flex-wrap: wrap; gap: 12px 24px; padding: 8px 0 20px; border-bottom: 1px solid #304650; }
  .docs-projects a, .docs-chapters a { padding: 8px; }
  [aria-current] { color: #e0eff6; background: rgb(140 166 180 / 10%); }
  .docs-layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 40px; padding-block: 24px; }
  aside { align-self: start; position: sticky; top: 0; }
  .docs-chapters { display: grid; gap: 4px; font-size: .88rem; }
  article { min-width: 0; max-width: 88ch; }
  .docs-meta, .docs-license { display: flex; flex-wrap: wrap; gap: 8px 20px; color: #91aab8; font-size: .78rem; margin-bottom: 24px; }
  .docs-prose :global(h1) { font: 400 clamp(1.5rem, 3vw, 2.15rem)/1.5 var(--f-h); margin-bottom: 24px; color: #c2d7e2; }
  .docs-license { margin-top: 36px; }
  .docs-pagination { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; border-top: 1px solid #304650; padding-block: 20px; }
  .docs-pagination a { padding-block: 10px; }
  @media (max-width: 900px) { .docs-layout { grid-template-columns: minmax(0, 1fr); gap: 24px; } aside { position: static; } .docs-chapters { display: flex; flex-wrap: wrap; } }
</style>

<script>
  import { page } from '$app/stores';
  import { error } from '@sveltejs/kit';
  import { t } from '$lib/i18n/index.js';
  import Article from '$lib/site/Article.svelte';

  const modules = import.meta.glob('$lib/news/*.md', { eager: true });

  let contentState = $derived.by(() => {
    const slug = $page.params.slug;
    const match = Object.entries(modules).find(([p]) => p.endsWith(`/${slug}.md`));
    if (!match) error(404, $t('error.news_not_found') + ` "${slug}"`);
    const [, mod] = match;
    return { Content: mod.default, meta: mod.metadata ?? {} };
  });

</script>
<Article meta={contentState.meta} articleKey={$page.params.slug}>
  <contentState.Content />
</Article>

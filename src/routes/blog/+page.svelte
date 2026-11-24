<script>
  import { preloadData } from '$app/navigation';
  import { navigating } from '$app/state';
  import { onMount } from 'svelte';
  import PageMeta from '$lib/site/PageMeta.svelte';
  import PostList from '$lib/studio/PostList.svelte';
  import Icon from '$lib/studio/Icon.svelte';
  import { msg, t } from '$lib/i18n/index.js';
  import { featuredPost, postGroups } from '$lib/studio/posts.js';
  import { pressFeedback } from '$lib/studio/press-feedback.js';

  onMount(() => {
    if (!featuredPost || !window.requestIdleCallback || navigator.connection?.saveData) return;
    const idle = window.requestIdleCallback(() => {
      if (document.visibilityState === 'visible' && !navigating.to) {
        preloadData(featuredPost.href).catch(() => {});
      }
    });
    return () => window.cancelIdleCallback(idle);
  });
</script>

<PageMeta title="blog · maincore" description="Development notes, software architecture, and benchmarks from maincore." />
<div class="studio-page">
  <h1 class="visually-hidden" lang="en">blog</h1>

  {#if featuredPost}
    <a href={featuredPost.href} class="studio-feature studio-press" use:pressFeedback
      data-sveltekit-preload-code="viewport" data-sveltekit-preload-data="hover">
      <span class="studio-feature-meta">
        {#if featuredPost.date}<time datetime={featuredPost.date}>{featuredPost.date.replaceAll('-', '.')}</time>{/if}
        {#if featuredPost.author}<span>{featuredPost.author}</span>{/if}
      </span>
      <strong>{featuredPost.title}</strong>
      {#if featuredPost.description}<span class="studio-feature-excerpt">{featuredPost.description}</span>{/if}
      <span class="studio-feature-arrow"><Icon name="arrow" /></span>
    </a>
  {:else}
    <p>{$t('pages.blog.empty')}</p>
  {/if}

  {#each postGroups as [year, posts] (year)}
    <section class="studio-blog-year">
      <h2>{year || $msg('其他')}</h2>
      <PostList {posts} compactDate={Boolean(year)} />
    </section>
  {/each}
</div>

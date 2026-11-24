<script>
  import Icon from './Icon.svelte';
  import { pressFeedback } from './press-feedback.js';

  let { posts, compactDate = false } = $props();
</script>

<ul class="studio-posts" role="list">
  {#each posts as post (post.slug)}
    <li>
      <a href={post.href} class="studio-post studio-press" use:pressFeedback
        data-sveltekit-preload-code="viewport" data-sveltekit-preload-data="tap">
        <span class="studio-post-meta">
          {#if post.date}
            <time datetime={post.date}>{(compactDate ? post.date.slice(5) : post.date).replaceAll('-', '.')}</time>
          {/if}
          {#if post.author}<span>{post.author}</span>{/if}
        </span>
        <span class="studio-post-copy">
          <strong>{post.title}</strong>
          {#if post.description}<span>{post.description}</span>{/if}
        </span>
        <span class="studio-post-arrow"><Icon name="arrow" size={16} /></span>
      </a>
    </li>
  {/each}
</ul>

<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import PostList from '$lib/studio/PostList.svelte';
  import Icon from '$lib/studio/Icon.svelte';
  import { latestPosts } from '$lib/studio/posts.js';
  import { pressFeedback } from '$lib/studio/press-feedback.js';
</script>

<PageMeta title="maincore" description="Games, creative tools, and development notes from maincore." />

<h1 class="visually-hidden" lang="en">maincore</h1>
<section class="studio-page" aria-labelledby="home-blog-title">
  <div class="studio-section-heading">
    <h2 id="home-blog-title" lang="en">blog</h2>
    <a href="/blog" class="studio-icon-button studio-action studio-press" aria-label="all posts" title="all posts"
      lang="en" use:pressFeedback><Icon name="arrow" /></a>
  </div>
  <PostList posts={latestPosts} />
</section>

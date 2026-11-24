<script>
  import Article from '$lib/site/Article.svelte';
  import Icon from '$lib/studio/Icon.svelte';
  import { pressFeedback } from '$lib/studio/press-feedback.js';

  let { data } = $props();
</script>
<div class="studio-article" lang="zh-Hans">
  <a href="/blog" class="studio-icon-button studio-action studio-press" lang="en" aria-label="back to blog"
    title="back to blog" use:pressFeedback><Icon name="back" /></a>
  <Article meta={data.meta} articleKey={data.slug} supportingToc>
    <data.Content />
  </Article>
</div>

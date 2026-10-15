<script>
  import { t } from '$lib/i18n/index.js';
  import Content from '$lib/about.md';
</script>
<svelte:head>
  <title>{$t('nav.about')} · maincore</title>
  <meta name="description" content={$t('pages.about.subtitle')} />
</svelte:head>
<h1 class="site-page-title">{$t('pages.about.subtitle')}</h1>
<div class="article-prose about-content"><Content /></div>

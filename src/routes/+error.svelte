<script>
  import { page } from '$app/stores';
  import { t } from '$lib/i18n/index.js';
</script>
<svelte:head><title>{$page.status} · maincore</title><meta name="robots" content="noindex" /></svelte:head>
<h1 class="site-page-title">{$page.status}</h1>
<p class="site-intro">{$page.error?.message}</p>
<a href="/">← {$t('back.home')}</a>

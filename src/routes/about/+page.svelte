<script>
  import { msg } from '$lib/i18n/index.js';
  import { t } from '$lib/i18n/index.js';
</script>
<svelte:head>
  <title>maincore</title>
  <meta name="description" content={$t('pages.about.subtitle')} />
</svelte:head>
<h1 class="site-page-title">{$t('pages.about.subtitle')}</h1>
<div class="article-prose about-content"><p>{$msg("maincore 是一个独立游戏与软件开发组织")}</p><h3>{$msg("联系我们")}</h3><ul><li><a href="mailto:contact@maincore.work">maincore_team</a></li></ul></div>

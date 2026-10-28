<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import { msg } from '$lib/i18n/index.js';
  import { t } from '$lib/i18n/index.js';
</script>
<PageMeta title={$msg('关于我们') + ' · maincore'} description={$msg("maincore 是一个独立游戏与软件开发组织")} />
<h1 class="site-page-title">{$t('pages.about.subtitle')}</h1>
<div class="article-prose about-content"><p>{$msg("maincore 是一个独立游戏与软件开发组织")}</p><h3>{$msg("联系我们")}</h3><ul><li><a href="mailto:contact@maincore.work">maincore_team</a></li></ul></div>

<script>
  import { siteConfig } from '$lib/siteConfig.js';
  import { t } from '$lib/i18n/index.js';

  const buildTime = new Date(__BUILD_TIME__);
  const buildTimeText = buildTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
</script>

<footer id="site-footer">
  <p>{$t('footer.built_with')}</p>
  <p>{$t('footer.design_inspired')}</p>
  <p class="build-time">Build: <time datetime={buildTime.toISOString()}>{buildTimeText}</time></p>
  <p class="copyright">{siteConfig.copyright}.</p>
</footer>

<style>
  .build-time { opacity: .75; }
</style>

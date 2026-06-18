<script>
  import { siteConfig } from '$lib/siteConfig.js';
  import { t } from '$lib/i18n/index.js';
</script>

<footer id="site-footer">
  <p>{$t('footer.built_with')}</p>
  <p>{$t('footer.design_inspired')}</p>
  <p class="copyright">{siteConfig.copyright}.</p>
</footer>
